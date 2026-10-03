"""The editors' half of two windows, one note (WORLD_CLASS_PLAN 22.1 item 5).

The backend half, and why the check is on the text, is tests/test_edit_conflicts.py.
"""

from __future__ import annotations

from tests._app_js import app_js_text


def test_the_editors_send_the_hash_they_started_from_and_ask_on_a_conflict():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "frontend"
    docs = (root / "js" / "documents.js").read_text(encoding="utf-8")
    notes = (root / "js" / "notes-list.js").read_text(encoding="utf-8")
    app = app_js_text()  # the whole boot code, not app.js alone (CLAUDE.md)
    assert "base_hash: currentDoc.content_hash" in docs
    assert "let base = entry.content_hash;" in notes and "base_hash: base" in notes
    # api() keeps the status and the structured detail on the error it throws.
    assert "error.status = response.status" in app and "error.detail = detail.detail" in app
    # One prompt, on the dialog recipe, for both editors.
    assert "function editConflictPrompt(" in app
    assert docs.count("editConflictPrompt(") >= 1 and notes.count("editConflictPrompt(") >= 1
