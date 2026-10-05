"""Footnotes render in Read, Print/PDF and the HTML export, not only in Live.

Audit FEAT-03 (2026-10-05): `renderMarkdown` had no footnote handling, so
`Text[^1].` and `[^1]: A footnote.` came out as literal text everywhere but
the Live editor, and every comment an export carries "as a footnote"
(`docCommentFootnotes`) printed as `[^c1]: remark`.

The pure half of the fix (`mdFootnotePrepare`, between the `MD-FOOTNOTE`
markers in markdown.js) runs here in node; the DOM half
(`mdFootnotesFinish`) is driven by `scratchpad/ui-sweeps/mmdoc1005-footnotes.js`
against the running app.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN_JS = ROOT / "frontend" / "js" / "markdown.js"
NAVIGATION_JS = ROOT / "frontend" / "js" / "navigation.js"

BEGIN = "// MD-FOOTNOTE-BEGIN"
END = "// MD-FOOTNOTE-END"


def _source() -> str:
    text = MARKDOWN_JS.read_text(encoding="utf-8")
    start, end = text.find(BEGIN), text.find(END)
    assert start != -1 and end > start, "MD-FOOTNOTE markers missing from markdown.js"
    return text[start + len(BEGIN) : end]


def _prepare(text: str) -> dict:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    script = (
        _source()
        + "\nconst r = mdFootnotePrepare(" + json.dumps(text) + '.split("\\n"));\n'
        + "process.stdout.write(JSON.stringify(r));\n"
    )
    done = subprocess.run([node, "-e", script], capture_output=True, text=True, timeout=30)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


OPEN, CLOSE = "\ue000", "\ue001"


def test_a_reference_and_its_definition_become_a_numbered_note():
    out = _prepare("Text[^1].\n\n[^1]: A footnote.")
    assert out["notes"] == [{"id": "1", "n": 1, "text": "A footnote."}]
    assert out["lines"][0] == f"Text{OPEN}1{CLOSE}."
    # The definition line is blanked, not removed, so data-src-line holds.
    assert out["lines"] == [f"Text{OPEN}1{CLOSE}.", "", ""]


def test_notes_are_numbered_in_the_order_they_are_cited():
    out = _prepare("B[^b] then A[^a] and B again[^b].\n\n[^a]: first defined\n[^b]: second defined")
    assert [(n["id"], n["n"]) for n in out["notes"]] == [("b", 1), ("a", 2)]


def test_comment_footnotes_from_an_export_render():
    """The shape `docCommentFootnotes` writes for a print or an export."""
    out = _prepare("A claim[^1] and this phrase[^c1] here.\n\n[^1]: The footnote text.\n[^c1]: check the source\n")
    assert [n["text"] for n in out["notes"]] == ["The footnote text.", "check the source"]
    assert not any("[^" in line for line in out["lines"])


def test_an_undefined_reference_stays_as_typed():
    out = _prepare("No note here[^x].")
    assert out["notes"] == []
    assert out["lines"] == ["No note here[^x]."]


def test_fenced_code_is_left_alone():
    out = _prepare("```\n[^1]: not a note\nsee[^1]\n```\nProse[^1].\n\n[^1]: Real.")
    assert out["lines"][1] == "[^1]: not a note"
    assert out["lines"][2] == "see[^1]"
    assert out["notes"] == [{"id": "1", "n": 1, "text": "Real."}]


def test_an_indented_continuation_belongs_to_its_note():
    out = _prepare("X[^1]\n\n[^1]: First line\n    and the second.")
    assert out["notes"][0]["text"] == "First line and the second."


def test_render_markdown_runs_the_footnote_passes():
    """The DOM half is wired: `renderMarkdown` prepares and finishes."""
    nav = NAVIGATION_JS.read_text(encoding="utf-8")
    assert "mdFootnotePrepare(" in nav
    assert "mdFootnotesFinish(container" in nav
