"""Wave D: reminders, insights, dashboard layout, embedding retry cache."""

from __future__ import annotations

import json
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


def test_reminder_priority_and_recurring(client):
    due = (utcnow() + timedelta(hours=2)).isoformat()

    # Defaults when omitted.
    created = client.post("/reminders", json={"text": "water plants", "due_at": due}).json()
    assert created["priority"] == "normal"
    assert created["recurring"] == "none"

    # Explicit values round-trip.
    made = client.post(
        "/reminders",
        json={"text": "pay rent", "due_at": due, "priority": "high", "recurring": "monthly"},
    ).json()
    assert made["priority"] == "high"
    assert made["recurring"] == "monthly"

    # Updatable.
    updated = client.put(
        f"/reminders/{created['id']}", json={"priority": "low", "recurring": "weekly"}
    ).json()
    assert updated["priority"] == "low"
    assert updated["recurring"] == "weekly"

    # Invalid values are rejected by the schema.
    bad = client.post(
        "/reminders", json={"text": "x", "due_at": due, "priority": "urgent"}
    )
    assert bad.status_code == 422


def test_magic_add_parses_and_creates(ai_client, fake_ollama):
    fake_ollama.librarian_reply = (
        '{"text": "call mum", "due_at": "2030-01-02T18:00", "priority": "high"}'
    )
    created = ai_client.post("/reminders/parse", json={"text": "call mum tomorrow evening"}).json()
    assert created["text"] == "call mum"
    assert created["priority"] == "high"
    assert created["due_at"].startswith("2030-01-02T18:00")
    assert len(ai_client.get("/reminders").json()) == 1


def test_magic_add_falls_back_on_unparseable_reply(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "sorry, I can't help with that"
    created = ai_client.post("/reminders/parse", json={"text": "buy milk"}).json()
    # Falls back to the raw text + a default future due time, still created.
    assert created["text"] == "buy milk"
    assert created["priority"] == "normal"


def test_magic_add_needs_ai_running(ai_client, fake_ollama):
    fake_ollama.running = False
    assert ai_client.post("/reminders/parse", json={"text": "x"}).status_code == 503


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


def test_digest_empty_week_is_cacheable(client):
    # An empty week is a stable fact → safe to cache (Wave J follow-up).
    assert client.post("/insights/digest").json()["cacheable"] is True


def test_digest_real_answer_is_cacheable(ai_client):
    _save(ai_client, "a funny scarecrow joke")
    assert ai_client.post("/insights/digest").json()["cacheable"] is True


def test_digest_offline_is_not_cacheable(client):
    # `client` has Ollama unavailable — the digest is the offline notice,
    # which must NOT be frozen for the day.
    _save(client, "a note from this week")
    assert client.post("/insights/digest").json()["cacheable"] is False


# --- dashboard layout preference ----------------------------------------------------


def test_greeting_uses_ai_when_available(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Rise and shine"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["greeting"] == "Rise and shine"
    assert body["source"] == "ai"
    assert body["punctuation"] == "."


def test_greeting_keeps_its_terminal_mark_separate(ai_client, fake_ollama):
    """The mark is returned apart from the phrase so a name can slot in
    before it — "Rise and shine, Sam!" rather than "Rise and shine!, Sam"."""
    fake_ollama.librarian_reply = "Rise and shine!"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["greeting"] == "Rise and shine"
    assert body["punctuation"] == "!"


def test_greeting_is_sentence_cased(ai_client, fake_ollama):
    """Local models often answer in lowercase; the banner is a sentence."""
    fake_ollama.librarian_reply = "good morning"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["greeting"] == "Good morning"


def test_greeting_keeps_interior_capitals(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "welcome back to Brisbane"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["greeting"] == "Welcome back to Brisbane"


def test_greeting_weaves_in_the_saved_name(ai_client, fake_ollama):
    """With a display name set, the model is asked to use it — and when it
    does, the response says so, so the frontend won't append it again."""
    ai_client.put("/preferences", json={"display_name": "Brayden"})
    fake_ollama.librarian_reply = "Morning, Brayden!"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["greeting"] == "Morning, Brayden"
    assert body["punctuation"] == "!"
    assert body["includes_name"] is True
    # The name reached the prompt from preferences, not from the client.
    assert "Brayden" in fake_ollama.chat_calls[-1][0]["content"]


def test_greeting_normalises_the_name_casing(ai_client, fake_ollama):
    ai_client.put("/preferences", json={"display_name": "Brayden"})
    fake_ollama.librarian_reply = "welcome back, brayden"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["greeting"] == "Welcome back, Brayden"  # saved spelling wins
    assert body["includes_name"] is True


def test_greeting_flags_when_the_model_ignores_the_name(ai_client, fake_ollama):
    """The model dropping the name must not lose it — includes_name stays
    false so the frontend appends it as before."""
    ai_client.put("/preferences", json={"display_name": "Brayden"})
    fake_ollama.librarian_reply = "Good morning"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["includes_name"] is False
    assert body["greeting"] == "Good morning"


def test_greeting_without_a_name_is_unchanged(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Good morning"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert body["includes_name"] is False


def test_greeting_uses_the_active_persona(ai_client, fake_ollama):
    ai_client.put(
        "/preferences",
        json={
            "personas": [{"name": "Pirate", "prompt": "You are a pirate captain."}],
            "active_persona": "Pirate",
        },
    )
    fake_ollama.librarian_reply = "Ahoy there"
    ai_client.get("/insights/greeting?block=morning")
    system = fake_ollama.chat_calls[-1][0]["content"]
    assert "pirate captain" in system.lower()


def test_greeting_falls_back_when_ai_is_down(ai_client, fake_ollama):
    fake_ollama.running = False
    body = ai_client.get("/insights/greeting?block=evening").json()
    assert body["source"] == "fallback"
    assert body["greeting"] in [
        "Good evening",
        "Evening",
        "Winding down",
    ]


def test_greeting_rejects_a_rambling_model_reply(ai_client, fake_ollama):
    # Too long / multi-sentence → the handwritten fallback wins.
    fake_ollama.librarian_reply = (
        "Certainly! Here is a lovely greeting for you to use today: "
        "Good morning and welcome back to your wonderful notebook."
    )
    body = ai_client.get("/insights/greeting?block=night").json()
    assert body["source"] == "fallback"
    assert body["greeting"] in ["Still up", "Working late", "Burning the midnight oil"]


def test_greeting_strips_quotes_and_trailing_punctuation(ai_client, fake_ollama):
    fake_ollama.librarian_reply = '"Welcome back!"'
    body = ai_client.get("/insights/greeting?block=morning").json()
    # Quotes gone, phrase clean, and the "!" preserved for the sentence end.
    assert body == {
        "greeting": "Welcome back",
        "punctuation": "!",
        "includes_name": False,
        "source": "ai",
    }


def test_greeting_never_contains_a_name(ai_client, fake_ollama):
    # The endpoint returns a phrase only — the frontend adds the display name,
    # so a stored name must not leak into the API response.
    ai_client.put("/preferences", json={"display_name": "Brayden"})
    fake_ollama.librarian_reply = "Good morning"
    body = ai_client.get("/insights/greeting?block=morning").json()
    assert "Brayden" not in body["greeting"]


def _ndjson(response):
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def test_digest_streams_in_chunks(ai_client, fake_ollama):
    _save(ai_client, "bought milk")
    fake_ollama.librarian_reply = "You saved a shopping note."
    response = ai_client.post("/insights/digest/stream")
    assert response.status_code == 200
    events = _ndjson(response)
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert answer == "You saved a shopping note."
    # Streamed, not delivered in one lump.
    assert len([e for e in events if e["type"] == "answer"]) > 1
    assert events[-1] == {"type": "done", "cacheable": True}


def test_digest_stream_handles_an_empty_week(ai_client):
    events = _ndjson(ai_client.post("/insights/digest/stream"))
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert "Nothing was saved" in answer
    assert events[-1]["cacheable"] is True


def test_digest_stream_degrades_when_ai_is_down(ai_client, fake_ollama):
    _save(ai_client, "bought milk")
    fake_ollama.running = False
    events = _ndjson(ai_client.post("/insights/digest/stream"))
    # An offline notice must never be cached as if it were a real digest.
    assert events[-1]["cacheable"] is False


def test_heatmap_counts_recent_notes(client):
    _save(client, "first note")
    _save(client, "second note")
    body = client.get("/insights/heatmap").json()
    assert body["days"] == len(body["counts"]) == 371
    assert body["total"] == 2
    # Today is the last bucket.
    assert body["counts"][-1] == 2
    assert body["busiest"] == 2


def test_tag_cloud_weights_by_frequency(client):
    _save(client, "note one", tags=["work", "ideas"])
    _save(client, "note two", tags=["work"])
    cloud = client.get("/insights/tag-cloud").json()
    assert cloud[0] == {"tag": "work", "count": 2}
    assert {"tag": "ideas", "count": 1} in cloud


def test_dashboard_layout_roundtrip(client):
    layout = {"order": ["stats", "pinned"], "hidden": ["digest"]}
    updated = client.put("/preferences", json={"dashboard_layout": layout}).json()
    saved = updated["dashboard_layout"]
    assert saved["order"] == layout["order"]
    assert saved["hidden"] == layout["hidden"]
    assert saved["wide"] == []  # new field defaults to empty


def test_dashboard_layout_wide_widgets_persist(client):
    layout = {"order": ["stats"], "hidden": [], "wide": ["digest", "art"]}
    updated = client.put("/preferences", json={"dashboard_layout": layout}).json()
    assert updated["dashboard_layout"]["wide"] == ["digest", "art"]
