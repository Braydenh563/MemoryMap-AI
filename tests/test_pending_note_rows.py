"""Notes held in the offline outbox are drawn in the notes list (lo12 item 1).

Measured in a browser (8812, POST /entries aborted): two held notes drew two
`li.pending-note` rows above the saved notes, each with a "Waiting to save"
`.chip.item-label`, and a flush removed them. The suite cannot see the DOM, so
these hold the wiring that makes it happen."""

from __future__ import annotations

from pathlib import Path

from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"


def test_the_row_builder_lives_in_the_lazy_quick_note_script():
    quick = (JS / "quick-note.js").read_text(encoding="utf-8")
    assert "function renderPendingNoteRows()" in quick
    assert 'chip("ph:cloud-slash Waiting to save", "item-label")' in quick
    # No server-only action on a held note: no menu, no buttons.
    body = quick.split("function renderPendingNoteRows()")[1].split("// --- Quick note")[0]
    assert "kebabMenu" not in body and "createElement(\"button\")" not in body


def test_every_write_to_the_outbox_redraws_the_rows():
    quick = (JS / "quick-note.js").read_text(encoding="utf-8")
    write = quick.split("function writeNoteOutbox(list)")[1].split("function newNoteClientKey")[0]
    assert "renderPendingNoteRows();" in write


def test_the_list_render_asks_for_the_rows_only_when_something_is_held():
    code = app_js_text()
    assert '"renderPendingNoteRows"]' in code  # a lazy entry point
    notes = (JS / "notes-list.js").read_text(encoding="utf-8")
    render = notes.split("function renderEntries()")[1].split("const visible = libraryVisibleRows()")[0]
    assert 'localStorage.getItem("noteOutbox")' in render
    assert "renderPendingNoteRows();" in render
