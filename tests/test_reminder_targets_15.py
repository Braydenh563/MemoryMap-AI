"""WORLD_CLASS_PLAN row 15 (section 1.3): Remind me on documents and boards.

A reminder carried only an `entry_id`, so a document could not have one. A board
is already a note (`Entry.is_board`), so it could: what it lacked was a row on
its menu and a reminder row that opens a board rather than a note. A document
gets `Reminder.document_id`. The Library's note card gets its twin's two rows,
Remind me and Link to another.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from tests._app_js import app_js_text

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
LIBRARY = (FRONTEND / "js" / "library.js").read_text(encoding="utf-8")
BOARDS = (FRONTEND / "js" / "whiteboard.js").read_text(encoding="utf-8")


def _due() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()


def _document(client, title="Proposal") -> int:
    return client.post("/documents", json={"title": title, "content": "text"}).json()["id"]


def test_a_reminder_can_point_at_a_document(client):
    doc = _document(client)
    made = client.post("/reminders", json={"text": "Review it", "due_at": _due(), "document_id": doc})
    assert made.status_code == 201
    body = made.json()
    assert body["document_id"] == doc and body["document_title"] == "Proposal"
    assert body["entry_id"] is None
    listed = client.get("/reminders", params={"document_id": doc}).json()
    assert [r["id"] for r in listed] == [body["id"]]
    assert client.get("/reminders", params={"document_id": doc + 99}).json() == []


def test_a_document_that_is_not_there_is_a_404_and_one_target_only(client):
    assert client.post("/reminders", json={"text": "x", "due_at": _due(), "document_id": 99999}).status_code == 404
    note = client.post("/entries", json={"content": "a note"}).json()["id"]
    both = client.post(
        "/reminders", json={"text": "x", "due_at": _due(), "document_id": _document(client), "entry_id": note}
    )
    assert both.status_code == 422


def test_deleting_the_document_keeps_the_reminder_unattached(client):
    doc = _document(client)
    made = client.post("/reminders", json={"text": "Review it", "due_at": _due(), "document_id": doc}).json()
    assert client.delete(f"/documents/{doc}").status_code == 200
    after = [r for r in client.get("/reminders").json() if r["id"] == made["id"]]
    assert after and after[0]["document_id"] is None and after[0]["document_title"] is None


def test_a_boards_reminder_says_it_is_a_board(client):
    board = client.post("/whiteboard/boards", json={"name": "Plan"}).json()["id"]
    made = client.post("/reminders", json={"text": "Look at the plan", "due_at": _due(), "entry_id": board}).json()
    assert made["entry_is_board"] is True
    note = client.post("/entries", json={"content": "plain"}).json()["id"]
    plain = client.post("/reminders", json={"text": "t", "due_at": _due(), "entry_id": note}).json()
    assert plain["entry_is_board"] is False


def test_the_restore_path_keeps_a_documents_reminder(client):
    """Undo of a delete re-posts the reminder, so the body must carry the target."""
    app = app_js_text()
    recreate = app.split("const recreate = async () => {", 1)[1].split("const redelete", 1)[0]
    assert "document_id: reminder.document_id" in recreate


def test_the_menus_offer_it():
    app = app_js_text()
    # The reminder row opens its document, and a board's reminder opens the board.
    assert "Open its document" in app and "Open its board" in app
    # Library: the document card, the note card (twin of the Notes card's rows) and the board card.
    document = LIBRARY.split('if (item.kind === "document") {', 1)[1].split('if (item.kind === "archived") {', 1)[0]
    assert "remindAboutThing(" in document
    note = LIBRARY.split('if (item.kind === "note") {', 1)[1].split('makeMenuItem("ph:archive Archive"', 1)[0]
    assert "remindAboutThing(" in note and "Link to another" in note
    assert "remindAboutThing(" in BOARDS
    assert LIBRARY.count("remindAboutThing(") >= 4  # the helper, three menus here
    assert "function remindAboutThing" in LIBRARY
