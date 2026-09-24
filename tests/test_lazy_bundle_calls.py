"""A boot-loaded file may not quietly depend on a file that loads later.

`index.html` loads six scripts: app.js, editor.js, dashboard.js, timeline.js,
settings.js and tour.js. Everything else, graph.js and graph-canvas.js, documents.js
(with documents-code.js and documents-prose.js, split out of it), whiteboard.js
(with whiteboard-map.js) and library.js, is in a lazy bundle (`LAZY_MODULES`, app.js) and
arrives only when a tab asks for it. So a boot file that calls a function
defined only in a lazy file is calling something that is not there yet, and
what happens then depends entirely on how the call is written:

* a bare call throws `ReferenceError`, which is loud and gets fixed;
* a call through a `LAZY_ENTRY_POINTS` stand-in fetches the bundle and works;
* **a call behind `typeof x === "function"` does nothing at all, silently.**

The third is the one this file exists for, and it has already cost a feature.
`editor.js`'s `editorSurfaceFor` read

    if (typeof asSurface !== "function") return null;

with a comment saying the case "cannot happen in the browser (the script order
is fixed)". The script order stopped being fixed when documents.js joined the
Library's bundle, and nothing said so. The result, measured on the branch head
2026-09-21: typing "/" in the note capture box opened 0 menu rows, and the same
in the note edit box, the chat composer and the skill steps box. Four of the
five surfaces the "/" menu exists for did nothing, on every fresh load, until
the person happened to open Library or Documents. It is CLAUDE.md section 6's
fourth shape, a policy silently refusing the work, wearing a comment that says
it cannot.

So every such call is listed here, once, with what makes it safe. Adding a name
to a boot file that only a lazy file defines fails this test until somebody
says which of the three it is.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

#: Read off index.html rather than repeated here, so a script added to the page
#: is a script this test knows is loaded.
def _boot_scripts() -> list[str]:
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    names = []
    for src in re.findall(r'<script src="/([A-Za-z0-9._-]+\.js)', html):
        if (FRONTEND / src).exists():
            names.append(src)
    return names


def _lazy_files() -> dict[str, list[str]]:
    """`LAZY_MODULES` as written in app.js: bundle name to its files."""
    source = (FRONTEND / "app.js").read_text(encoding="utf-8")
    block = re.search(r"const LAZY_MODULES = \{(.*?)\n\};", source, re.S)
    assert block, "LAZY_MODULES not found in app.js; has the loader moved?"
    out: dict[str, list[str]] = {}
    for name, files in re.findall(r"^\s*(\w+):\s*\[(.*?)\],", block.group(1), re.M | re.S):
        out[name] = re.findall(r'"/([A-Za-z0-9._-]+\.js)"', files)
    return out


def _entry_points() -> dict[str, set[str]]:
    source = (FRONTEND / "app.js").read_text(encoding="utf-8")
    block = re.search(r"const LAZY_ENTRY_POINTS = \{(.*?)\n\};", source, re.S)
    assert block, "LAZY_ENTRY_POINTS not found in app.js"
    out: dict[str, set[str]] = {}
    #: `\],?` rather than `\],\n`: the last bundle in the object has no
    #: newline after its closing bracket inside the captured block, and the
    #: first draft of this parser silently returned an empty set for it,
    #: which made the whole test fire on names that were listed all along.
    for name, names in re.findall(r"^\s*(\w+):\s*\[(.*?)\]", block.group(1), re.M | re.S):
        out[name] = set(re.findall(r'"(\w+)"', names))
    return out


def _top_level_functions(path: Path) -> set[str]:
    """Only functions declared at column zero: a nested helper is not a global."""
    source = path.read_text(encoding="utf-8")
    return set(re.findall(r"^(?:async )?function ([A-Za-z_$][\w$]*)", source, re.M))


def _declared_anywhere(path: Path) -> set[str]:
    """Every function declaration in the file, nested ones included.

    A boot file's own nested helper shadows a lazy file's global of the same
    name inside the scope that declares it, so a call there is not a
    cross-bundle call at all. `app.js` has a `bookmarkRow` inside the
    Connections builder and `library.js` has a different one at top level;
    reading only column zero made the first look like a call to the second.
    """
    source = path.read_text(encoding="utf-8")
    return set(re.findall(r"(?:^|\s)(?:async )?function ([A-Za-z_$][\w$]*)\s*\(", source))


#: Names whose call sites are reached only after the bundle they belong to has
#: been loaded, with the reason each one is safe. A name here is a promise that
#: somebody checked the path, not a way to quiet the test.
REACHED_AFTER_LOAD = {
    "docFileType": "library, read by the selection bar only when the surface is `doc-content`, which exists only once the documents bundle has drawn it",
    #: The tab dispatch itself: `switchTab` awaits `ensureModule(TAB_MODULES[tab])`
    #: before it runs any of these, so by the time they are called the bundle is
    #: in the page. They are the bundle's own render entry points.
    "renderLibrary": "library, called from the Library tab's own dispatch",
    "renderLibraryFilters": "library, called from the Library tab's own dispatch",
    "loadLibrary": "library, called from the Library tab's own dispatch",
    "graphLayout": "graph, called from the Graph tab's own dispatch",
    "fitGraphToView": "graph, called from the Graph tab's own dispatch",
    "setGraphPhysicsEnabled": "graph, called from the Graph tab's own dispatch",
    "applyGraphHighlight": "graph, called from the Graph tab's own controls",
    "graphNodeById": "graph, called by showNoteInGraph after `await switchTab(\"graph\")`",
    "focusGraphNode": "graph, called by showNoteInGraph after `await switchTab(\"graph\")`",
    "wbOwnsChord": "library, asked by the global shortcut handler; with the bundle absent no board is open, so no chord can be the board's and the guard's false is the right answer",
    "openLibraryItem": "library, called from a row the Library itself drew",
    "renderDocPreview": "library, called from the document editor's own update path",
    "mountNoteSurface": "library, called once the note engine setting has loaded it",
    "docSurfaceById": "library, called from the document editor's own handlers",
    "docPaletteCommands": "library, the palette asks only once documents.js is in",
    "docEventFromCm": "library, only ever true when CodeMirror is mounted",
    "gcRequestDraw": "graph, the canvas renderer's own frame loop",
    "gcStop": "graph, the canvas renderer's own teardown",
    "renderDocShortcutSheet": "library, the document editor's own sheet",
    "wireMdFormatShortcuts": "library, wired when the document editor mounts",
    "hideDocComplete": "library, the document editor's word list; with the bundle absent there is no list on screen to hide, so the guard's no-op is the right answer",
    "docMathRender": "library; `mdMathElement` (app.js) shows the formula's source when it is absent and calls `ensureModule(\"library\")` to redraw the block once the bundle lands, so the guard is a first frame, not a silent no-op",
    #: The catalogue reveals (app.js, REVEAL_TARGETS): each is called only
    #: after `revealBoard` or the target itself has awaited the bundle.
    "wbIsMap": "library, asked by revealBoard after `await ensureModule(\"library\")`",
    "wbExportBoard": "library, called by the board-export reveal once revealBoard has opened a board",
    "openGraphPopup": "graph, called by the graph-edit reveal after `await ensureModule(\"graph\")`",
    "setDocView": "library, called by the doc-find reveal once revealDocument has opened a document",
    "docToolbarCollapsed": "library, asked by revealStrip after `await ensureModule(\"library\")`",
    "setDocToolbarCollapsed": "library, called by revealStrip after `await ensureModule(\"library\")`",
    #: Generic names that a lazy file happens to declare too. The call in the
    #: boot file is to its own local of the same name, not across the bundle.
    "build": "a local name in more than one file, not a cross-bundle call",
    "place": "a local name in more than one file, not a cross-bundle call",
    "sync": "a local name in more than one file, not a cross-bundle call",
    #: Fetched on focus and replayed, rather than stood in for: a stand-in is
    #: async and this has to answer synchronously. See `editorEnsureSurfaceModule`
    #: in editor.js, which is the fix for the fault this whole file records.
    "asSurface": "editor.js warms the bundle on focus and replays the keystroke",
}

GUARD = re.compile(r'typeof\s+(\w+)\s*===?\s*["\']function["\']')


def test_no_boot_file_silently_depends_on_a_lazy_bundle():
    lazy = _lazy_files()
    entries = _entry_points()
    boot = _boot_scripts()
    assert "app.js" in boot and "editor.js" in boot, f"boot scripts look wrong: {boot}"

    boot_defined: set[str] = set()
    for name in boot:
        boot_defined |= _declared_anywhere(FRONTEND / name)

    lazy_defined: dict[str, str] = {}
    for bundle, files in lazy.items():
        for file_name in files:
            for symbol in _top_level_functions(FRONTEND / file_name):
                lazy_defined.setdefault(symbol, bundle)

    candidates = {s: b for s, b in lazy_defined.items() if s not in boot_defined}
    assert candidates, "no cross-bundle names at all; has the scan broken?"
    call = re.compile(r"(?<![\w$.])(" + "|".join(sorted(map(re.escape, candidates))) + r")\s*\(")

    unaccounted: list[str] = []
    for name in boot:
        lines = (FRONTEND / name).read_text(encoding="utf-8").split("\n")
        for number, line in enumerate(lines, 1):
            if line.lstrip().startswith(("//", "*", "/*")):
                continue
            for match in call.finditer(line):
                symbol = match.group(1)
                bundle = candidates[symbol]
                if symbol in entries.get(bundle, set()):
                    continue
                if symbol in REACHED_AFTER_LOAD:
                    continue
                #: A `typeof` guard in the four lines above is exactly the shape
                #: that fails silently, so it does NOT make a call safe here. It
                #: only tells us the author knew, which is why the message says
                #: so rather than passing.
                context = "\n".join(lines[max(0, number - 5):number])
                guarded = symbol in GUARD.findall(context)
                unaccounted.append(
                    f"{name}:{number}: {symbol}() is defined only in the '{bundle}' bundle"
                    + (
                        "; it is behind a typeof guard, which means the call does"
                        " nothing when the bundle has not loaded, silently"
                        if guarded
                        else "; a bare call throws before the bundle loads"
                    )
                    + ". Add it to LAZY_ENTRY_POINTS (app.js) so the call loads the"
                    " bundle, or to REACHED_AFTER_LOAD here with the reason its"
                    " call site cannot run first."
                )

    assert not unaccounted, "\n".join(unaccounted)
