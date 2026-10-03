"""The note flow as a person drives it (INBOX 432).

Each test pins one defect measured in Chromium on 2026-10-03:

* Ctrl+Enter in the capture box saved nothing once the editor view was
  mounted over the textarea (the textarea's own listener stopped hearing
  keys), and the edit form had no chord at all.
* After a save the focus stayed on the Save button, so "keep writing" typed
  into nothing.
* A note nothing could file said "Filed under Uncategorised (0% sure)", read
  twice (the composer's line and a toast), with no way to pick a category.
* A single note's category could only be changed by dragging its chip or
  opening the whole edit form; the card's menu had no Move.
"""

import re
import time
from pathlib import Path

from memorymap.api import routes_entries

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def _read(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def _function(source: str, name: str) -> str:
    start = re.search(rf"^(?:async )?function {name}\(", source, re.M)
    assert start, f"{name} not found"
    rest = source[start.end():]
    end = re.search(r"^}", rest, re.M)
    return rest[: end.start()]


def _wait_settled(client, entry_id, timeout=10.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = client.get(f"/entries/{entry_id}/filing").json()
        if status["filing_state"] != "pending":
            return status
        time.sleep(0.05)
    return status


def test_a_note_nothing_could_file_says_so(client, monkeypatch):
    monkeypatch.setattr(routes_entries, "_file_entry_now", lambda *a, **k: ("Uncategorised", 0, "none"))
    created = client.post("/entries", json={"content": "buy milk", "defer_filing": True}).json()
    status = _wait_settled(client, created["id"])
    assert status["filed_by"] == "none"
    assert status["category"] == "Uncategorised"


def test_a_note_the_model_filed_says_ai(client, monkeypatch):
    monkeypatch.setattr(routes_entries, "_file_entry_now", lambda *a, **k: ("Groceries", 82, "llm"))
    created = client.post("/entries", json={"content": "buy milk", "defer_filing": True}).json()
    status = _wait_settled(client, created["id"])
    assert status["filed_by"] == "ai"
    assert status["category"] == "Groceries"


def test_a_note_filed_by_the_person_says_user(client):
    created = client.post("/entries", json={"content": "buy milk", "category": "Errands"}).json()
    assert client.get(f"/entries/{created['id']}/filing").json()["filed_by"] == "user"


def test_ctrl_enter_reaches_the_box_under_the_editor():
    keymap = _function(_read("documents.js"), "noteSurfaceKeymap")
    assert '"Mod-Enter"' in keymap
    assert "host.dispatchEvent" in keymap and "defaultPrevented" in keymap
    # The capture listener claims the chord (or the editor inserts a line too)
    # and answers Cmd on a Mac.
    wiring = _read("settings-wiring.js")
    capture = wiring[wiring.index('$("entry-content").addEventListener("keydown"'):][:300]
    assert "preventDefault" in capture and "metaKey" in capture
    # The edit form has the same chord.
    form = _function(_read("notes-list.js"), "renderEditForm")
    assert 'event.key === "Enter"' in form and "saveButton.click()" in form


def test_saving_puts_the_caret_back_in_the_box():
    capture = _read("capture-ask.js")
    for name in ("saveEntry", "saveEntryAsDraft"):
        body = _function(capture, name)
        reset = body.index("resetCaptureForm(")
        assert "focusCaptureBox()" in body[reset:], name


def test_the_filing_outcome_is_said_once_and_never_as_zero_percent():
    capture = _read("capture-ask.js")
    watch = _function(capture, "watchFiling")
    assert "settleCaptureStatus(status)" in watch and "!shown" in watch
    outcome = _function(capture, "filingOutcomeText")
    assert 'filed_by === "none"' in outcome
    # A confidence is quoted only when something decided.
    assert "status.ai_confidence\n    ?" in outcome
    # Unfiled offers a category, not a jump.
    assert "chooseNoteCategory" in watch and "chooseNoteCategory" in _function(capture, "settleCaptureStatus")
    # The line knows which note it is about.
    assert "status.dataset.entryId" in _function(capture, "saveEntry")


def test_one_note_moves_from_its_chip_and_its_menu():
    # In the lazy categories piece, reached from boot code through app.js's
    # LAZY_ENTRY_POINTS.
    assert "function chooseNoteCategory(" in _read("categories-panel.js")
    assert '"chooseNoteCategory"' in _read("app.js")
    cards = _read("note-cards.js")
    chip_block = cards[cards.index('const categoryEl = chip(entry.category, "category")'):][:2600]
    assert "chooseNoteCategory([entry.id], entry.category)" in chip_block
    assert 'setAttribute("role", "button")' in chip_block
    assert "Move to category" in _read("menus.js")


def test_the_batch_move_lists_empty_categories():
    batch = _function(_read("skills.js"), "fillBatchCategories")
    assert "categoryMeta.keys()" in batch
