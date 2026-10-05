"""WORLD_CLASS_PLAN row 30 (section 5 items 4 and 9): a note's word count and
reading time, and `{{clipboard}}` and `{{cursor}}` in templates.

The Python suite cannot run the page, so the two small pure functions are
pulled out of the source and run in node.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
NOTES = (FRONTEND / "js" / "notes-list.js").read_text(encoding="utf-8")
APP = (FRONTEND / "js" / "app.js").read_text(encoding="utf-8")
DOCS = (FRONTEND / "js" / "documents.js").read_text(encoding="utf-8")


def _function(source: str, name: str) -> str:
    start = source.index(f"function {name}(")
    depth, i = 0, source.index("{", start)
    while True:
        depth += 1 if source[i] == "{" else -1 if source[i] == "}" else 0
        i += 1
        if depth == 0:
            return source[start:i]


def _node(code: str) -> object:
    node = shutil.which("node")
    if node is None:
        pytest.skip("node is not installed")
    out = subprocess.run([node, "-e", code], capture_output=True, text=True, timeout=30, check=True)
    return json.loads(out.stdout)


def test_a_notes_words_and_reading_time():
    fn = _function(NOTES, "noteReadingFacts")
    got = _node(f"{fn}\nconsole.log(JSON.stringify([noteReadingFacts(''), noteReadingFacts('one'), noteReadingFacts('word '.repeat(440)), noteReadingFacts('a b')]))")
    assert got == ["", "1 word · 1 min read", "440 words · 2 min read", "2 words · 1 min read"]


def test_the_edit_form_shows_it_live():
    form = NOTES.split("const meta = document.createElement(\"div\");", 1)[1].split("const foot = ", 1)[0]
    assert "note-edit-count" in form and "noteReadingFacts(textarea.value)" in form
    assert 'textarea.addEventListener("input"' in NOTES.split("note-edit-count", 1)[1][:600]


def test_template_variables_clipboard_and_cursor():
    consts = "\n".join(line for line in NOTES.splitlines() if line.startswith("const TEMPLATE_"))
    fn = _function(NOTES, "templateVariables")
    code = (
        consts
        + "\n"
        + fn
        + """
const a = templateVariables("Hi {{clipboard}} and {clipboard}{{cursor}}end", "PASTE");
const b = templateVariables("no variables", "x");
const c = templateVariables("{{cursor}}start", "");
const d = templateVariables("{cursor}{{clipboard}}", "{{cursor}} in a paste");
console.log(JSON.stringify([a, b, c, d]));
"""
    )
    a, b, c, d = _node(code)
    assert a == {"text": "Hi PASTE and PASTEend", "cursor": len("Hi PASTE and PASTE")}
    assert b == {"text": "no variables", "cursor": None}
    assert c == {"text": "start", "cursor": 0}
    # Pasted text that says {{cursor}} is only text: the marker is the template's.
    assert d == {"text": "{{cursor}} in a paste", "cursor": 0}


def test_both_template_makers_use_them():
    use = APP.split("async function useNoteTemplate()", 1)[1].split("function noteTemplateListKeys", 1)[0]
    assert "fillNoteBox($(\"entry-content\"), noteTemplateChoice)" in use
    fill = _function(NOTES, "fillNoteBox")
    assert "templateVariables(" in fill and "templateClipboard(" in fill
    assert "templateVariables(" in DOCS.split("async function createDocument(", 1)[1].split("//: **Choosing is not making**", 1)[0]
