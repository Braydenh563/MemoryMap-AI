"""New document makes a new document, and that is the one left open (found
by the e2e suite, tests-e2e/specs/documents.spec.js, 2026-10-05).

Library, Create, New document on a session that had not opened Documents
yet opened the last document instead: the row switched tabs and pressed
`#doc-new` 160 ms later, before documents.js (fetched on the tab's first
visit) had bound that button, so nothing was made, and the tab's own loader
opened `docs[0]`. A person then typed a title and text into an existing
document believing it was new: measured in the browser, the seeded
"Sourdough method" was renamed and appended to, and no document was made.

Two fixes, each pinned here:

* the row waits for the tab (and so its code) and then makes the document
  itself, no timer;
* `openDocument` answers only its newest call: the tab's loader opening the
  last document and the new one opening race, and whichever fetch landed last
  used to win.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
JS = ROOT / "frontend" / "js"


def _function(source: str, head: str) -> str:
    start = source.index(head)
    end = source.index("\n}\n", start) + 3
    return source[start:end]


def test_the_library_row_waits_for_the_tab_instead_of_a_timer():
    source = (JS / "library.js").read_text(encoding="utf-8")
    start = source.index('label: "ph:plus New document"')
    row = source[start : source.index("\n  },", start)]
    assert "setTimeout" not in row, row
    assert re.search(r"await switchTab\(\"documents\"\);\s*await createDocument\(\)", row), row


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def _run(scenario: str) -> dict:
    """Run documents.js's `loadDocumentsNow` and `openDocument` in node.

    Everything they call besides the two fetches is a no-op stand-in: a
    `with` over a proxy answers any free name with a function that returns
    itself, so the scenario reads only which document ends up open. A
    document's fetch takes `delays[id]` ms; the list takes 30 ms."""
    source = (JS / "documents.js").read_text(encoding="utf-8")
    declarations = "\n".join(
        line for line in source.splitlines() if line.startswith("let docOpenSeq")
    )
    opener = _function(source, "async function openDocument(id) {").replace(
        "async function openDocument(id) {", "globalThis.openDocument = async function (id) {", 1
    )
    loader = _function(source, "async function loadDocumentsNow(selectId) {").replace(
        "async function loadDocumentsNow(selectId) {",
        "globalThis.loadDocumentsNow = async function (selectId) {",
        1,
    )
    own = "currentDoc docDirty docs apiJson apiPagedList docOpenSeq stub delays fetched".split()
    script = (
        """
let currentDoc = null, docDirty = false, docs = [];
const stub = new Proxy(function () {}, { get: (t, k) => (k === "then" ? undefined : k === Symbol.toPrimitive ? () => "" : stub), apply: () => stub, set: () => true });
const delays = { 2: 5, 3: 50, 9: 5 };
const fetched = [];
function apiJson(path) {
  const id = Number(path.split("/").pop());
  return new Promise((resolve) => setTimeout(() => { fetched.push(id); resolve({ id, title: "d" + id, content: "" }); }, delays[id]));
}
function apiPagedList() {
  return new Promise((resolve) => setTimeout(() => resolve([{ id: 3 }, { id: 2 }, { id: 1 }]), 30));
}
"""
        + declarations
        + f"\nconst own = {json.dumps(own)};\n"
        + "const scope = new Proxy({}, { has: (t, k) => !(k in globalThis) && !own.includes(k), get: (t, k) => (k === Symbol.unscopables ? undefined : stub) });\n"
        + "with (scope) {\n"
        + opener
        + "\n"
        + loader
        + "\n}\n(async () => {\n"
        + scenario
        + "\nconsole.log(JSON.stringify({ open: currentDoc && currentDoc.id, fetched }));\n})();\n"
    )
    result = subprocess.run(["node", "-e", script], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_the_newest_open_wins_when_an_older_one_lands_last():
    out = _run(
        """
const older = openDocument(3); // the tab's loader: the last document
const newer = openDocument(9); // New document, made a moment later
await Promise.all([older, newer]);
"""
    )
    assert out["fetched"] == [9, 3], out  # the older fetch did land last
    assert out["open"] == 9, f"the older open won: {out}"


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_the_loader_does_not_open_the_last_document_over_one_asked_for():
    """`#/docs/2` on a fresh load: the route opens document 2 while the tab's
    loader is still fetching the list, and the loader then opened the newest
    document (3) over it. Measured in the browser before the fix: the address
    said `#/docs/2` and the editor held document 3."""
    out = _run(
        """
const loading = loadDocumentsNow(null); // the tab's own first load
delays[2] = 60; // the editor engine loads first, so this open is slow
const routed = openDocument(2);         // the address names document 2
await Promise.all([loading, routed]);
"""
    )
    assert out["open"] == 2, f"the loader opened the last document instead: {out}"


@pytest.mark.parametrize("kind, button", [("board", "wb-boards-new"), ("mindmap", "wb-boards-new-map")])
def test_new_board_and_new_mind_map_wait_for_the_boards_code(kind, button):
    """The same shape for boards (found by tests-e2e/specs/boards.spec.js):
    Create, New board pressed `#wb-boards-new` straight after opening the
    Boards sub-tab, whose code (whiteboard.js) is fetched on that first
    visit, so the button had no listener yet and nothing happened: no
    gallery, no board. Measured: the click reached the button, and
    `createNewBoard` was never called."""
    source = (JS / "library.js").read_text(encoding="utf-8")
    start = source.index(f"  {kind}: {{\n")
    row = source[start : source.index("\n  },", start)]
    wait = row.find('await ensureModule("library")')
    press = row.find(f'$("{button}")')
    assert 0 <= wait < press, row
