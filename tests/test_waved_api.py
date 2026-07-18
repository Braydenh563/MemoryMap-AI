"""Wave D: reminders, insights, dashboard layout, embedding retry cache."""

from __future__ import annotations

from datetime import timedelta

from memorymap.core import deps
from memorymap.core.database import Entry, utcnow


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- reminders --------------------------------------------------------------------


def test_reminder_lifecycle(client):
    entry = _save(client, "buy a birthday present")
    due = (utcnow() + timedelta(days=1)).isoformat()

    created = client.post(
        "/reminders",
        json={"text": "wrap the present", "due_at": due, "entry_id": entry["id"]},
    ).json()
    assert created["entry_preview"].startswith("buy a birthday")
    assert created["done"] is False

    client.post("/reminders", json={"text": "standalone", "due_at": due})
    listed = client.get("/reminders").json()
    assert len(listed) == 2

    done = client.put(f"/reminders/{created['id']}", json={"done": True}).json()
    assert done["done"] is True

    client.delete(f"/reminders/{created['id']}")
    assert len(client.get("/reminders").json()) == 1


def test_reminder_for_missing_entry_404s(client):
    due = (utcnow() + timedelta(hours=1)).isoformat()
    response = client.post("/reminders", json={"text": "x", "due_at": due, "entry_id": 99})
    assert response.status_code == 404


# --- insights ----------------------------------------------------------------------


def test_stats_counts_and_activity(client):
    _save(client, "one", category="Alpha")
    _save(client, "two", category="Alpha")
    _save(client, "three", category="Beta")

    body = client.get("/insights/stats").json()
    assert body["total_entries"] == 3
    assert body["categories"][0] == {"name": "Alpha", "count": 2}
    assert len(body["per_day"]) == body["days"]
    assert body["per_day"][-1] == 3  # all created today


def test_on_this_day_resurfaces_old_notes(client):
    _save(client, "fresh note")  # today → excluded (too recent)
    session = deps.get_db().session()
    try:
        old = Entry(content="a year ago today", tags="[]")
        old.created_at = utcnow() - timedelta(days=365)
        session.add(old)
        session.commit()
    finally:
        session.close()

    matches = client.get("/insights/on-this-day").json()
    assert [m["content"] for m in matches] == ["a year ago today"]


def test_digest_empty_week(client):
    assert "Nothing was saved" in client.post("/insights/digest").json()["digest"]


def test_digest_uses_recent_notes(ai_client, fake_ollama):
    _save(ai_client, "a funny scarecrow joke")
    body = ai_client.post("/insights/digest").json()
    assert body["digest"] == fake_ollama.librarian_reply
    prompt = fake_ollama.chat_calls[-1][-1]["content"]
    assert "scarecrow" in prompt  # the digest reads this week's notes


# --- dashboard layout preference ----------------------------------------------------


def test_dashboard_layout_roundtrip(client):
    layout = {"order": ["stats", "pinned"], "hidden": ["digest"]}
    updated = client.put("/preferences", json={"dashboard_layout": layout}).json()
    assert updated["dashboard_layout"] == layout
