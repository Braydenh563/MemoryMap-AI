"""A deferred note always settles, even when the app closed mid-filing.

Owner, 0.3.31: "even if the filing already happened it still looks like it is
endlessly filing". The filing job lives in this process's queue, so a note
saved just before the app closed came back "pending" with nothing behind it.
`GET /entries/{id}/filing` now re-queues such a note, and a job for a note
that has already settled does nothing.
"""

import time

import pytest

from memorymap.api import routes_entries
from memorymap.core import jobs
from memorymap.core.database import Entry


def _wait_settled(client, entry_id, timeout=10.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        state = client.get(f"/entries/{entry_id}/filing").json()["filing_state"]
        if state != "pending":
            return state
        time.sleep(0.05)
    return "pending"


def test_a_deferred_note_settles(client):
    created = client.post("/entries", json={"content": "buy milk and eggs", "defer_filing": True}).json()
    assert created["filing_state"] == "pending"
    assert _wait_settled(client, created["id"]) != "pending"


def test_a_note_orphaned_by_a_closed_app_is_filed_when_asked(client, session, monkeypatch):
    # The first job is dropped, as a closed app drops it.
    monkeypatch.setattr(routes_entries, "_queue_filing", lambda entry: None)
    created = client.post("/entries", json={"content": "call the dentist", "defer_filing": True}).json()
    monkeypatch.undo()
    entry = session.get(Entry, created["id"])
    session.refresh(entry)
    assert entry.filing_state == "pending"
    assert _wait_settled(client, created["id"]) != "pending"


def test_a_settled_note_is_not_filed_again(client, session, monkeypatch):
    created = client.post("/entries", json={"content": "a settled note", "defer_filing": True}).json()
    assert _wait_settled(client, created["id"]) != "pending"
    calls = []
    monkeypatch.setattr(routes_entries, "_file_entry_now", lambda *a, **k: calls.append(a))
    routes_entries._file_entry_in_background(created["id"], "default")
    assert calls == []


def test_filing_jobs_are_deduplicated_per_note(monkeypatch):
    keys = []
    monkeypatch.setattr(jobs, "enqueue", lambda *a, **k: keys.append(k.get("dedupe_key")))

    class _E:
        id = 7
        workspace_id = "default"

    routes_entries._queue_filing(_E())
    assert keys == [("file-entry", 7)]


def test_a_slow_model_does_not_hold_filing_past_the_deadline(monkeypatch):
    from memorymap.ai import janitor

    class _Slow:
        def chat(self, model, messages, mode=None):
            time.sleep(5)
            return {"content": '{"category": "Late"}'}

    started = time.time()
    with pytest.raises(TimeoutError):
        janitor._chat_within_deadline(_Slow(), "m", [], deadline=0.3)
    assert time.time() - started < 2


def test_filing_asks_the_model_in_quick_mode():
    from memorymap.ai import janitor

    seen = {}

    class _Fake:
        def chat(self, model, messages, mode=None):
            seen["mode"] = mode
            return {"content": "{}"}

    janitor._chat_within_deadline(_Fake(), "m", [])
    assert seen["mode"] == "quick"


def _category_of(client, entry_id):
    return client.get(f"/entries/{entry_id}/filing").json()["category"]


def test_the_models_late_answer_replaces_the_stand_in(client):
    created = client.post("/entries", json={"content": "late one", "category": "Stand in"}).json()
    client.put(f"/entries/{created['id']}", json={"content": "late one"})
    late = routes_entries._LateFiling(created["id"], "default")
    # user_filed is set for a chosen category, so clear it: the stand-in is the AI's.
    from memorymap.core import deps

    with deps.get_db().session() as s:
        s.get(Entry, created["id"]).user_filed = False
        s.commit()
    assert late.stand_in("Stand in", 40, "semantic-match") == ("Stand in", 40, "semantic-match")
    late.arrived("Recipes", 90)
    assert _category_of(client, created["id"]) == "Recipes"


def test_a_note_moved_by_hand_keeps_its_place(client):
    created = client.post("/entries", json={"content": "moved one", "category": "Mine"}).json()
    from memorymap.core import deps

    with deps.get_db().session() as s:
        s.get(Entry, created["id"]).user_filed = False
        s.commit()
    late = routes_entries._LateFiling(created["id"], "default")
    late.stand_in("Something else", 40, "semantic-match")
    late.arrived("Recipes", 90)
    assert _category_of(client, created["id"]) == "Mine"


def test_an_answer_before_the_stand_in_is_used_instead():
    late = routes_entries._LateFiling(1, "default")
    late.arrived("Recipes", 90)
    assert late.stand_in("Stand in", 40, "semantic-match") == ("Recipes", 90, "llm")


def test_a_late_reply_reaches_the_callback():
    import threading

    from memorymap.ai import janitor

    got = threading.Event()

    class _Slow:
        def chat(self, model, messages, mode=None):
            time.sleep(0.5)
            return {"content": '{"category": "Late", "confidence": 70}'}

    seen = []
    with pytest.raises(TimeoutError):
        janitor._chat_within_deadline(
            _Slow(), "m", [], deadline=0.1,
            on_late=lambda reply: (seen.append(reply), got.set()),
        )
    assert got.wait(3) and "Late" in seen[0]["content"]


def test_the_wait_is_a_clamped_preference(monkeypatch):
    from memorymap.ai import janitor
    from memorymap.core import deps

    class _Cfg:
        def __init__(self, v):
            self.v = v

        def get_preference(self, key, default=None):
            return self.v if key == "filing_wait_seconds" else default

    for value, expected in ((None, 15.0), (30, 30.0), (1, 5.0), (500, 60.0)):
        monkeypatch.setattr(deps, "get_config", lambda v=value: _Cfg(v))
        assert janitor.filing_deadline() == expected


def _pending_note(client, monkeypatch, content):
    monkeypatch.setattr(routes_entries, "_queue_filing", lambda entry: None)
    created = client.post("/entries", json={"content": content, "defer_filing": True}).json()
    monkeypatch.undo()
    return created


def test_stopping_leaves_a_note_where_it_is_and_no_late_answer_moves_it(client, session, monkeypatch):
    # Queue nothing, so the note stays pending until it is stopped.
    monkeypatch.setattr(routes_entries, "_queue_filing", lambda entry: None)
    created = client.post("/entries", json={"content": "stop me", "defer_filing": True}).json()
    stopped = client.post(f"/entries/{created['id']}/filing/stop", json={"action": "keep"}).json()
    assert stopped["stopped"] is True
    status = client.get(f"/entries/{created['id']}/filing").json()
    assert status["filing_state"] == "done"
    late = routes_entries._LateFiling(created["id"], "default")
    late.stand_in(status["category"], 0, "none")
    late.arrived("Somewhere else", 90)
    assert _category_of(client, created["id"]) == status["category"]


def test_stop_rejects_an_unknown_action(client):
    created = client.post("/entries", json={"content": "x", "category": "A"}).json()
    assert client.post(f"/entries/{created['id']}/filing/stop", json={"action": "nope"}).status_code == 422


def test_the_background_tasks_stop_files_every_pending_note(client, monkeypatch):
    from memorymap.core import bgtasks

    monkeypatch.setattr(routes_entries, "_queue_filing", lambda entry: None)
    ids = [
        client.post("/entries", json={"content": f"note {i}", "defer_filing": True}).json()["id"]
        for i in range(2)
    ]
    answer = client.post("/tasks/cancel", json={"kind": "job-file-entry"}).json()
    assert answer["stopped"], answer
    assert "job-file-entry" not in bgtasks.CANCELLERS  # never stopped at shutdown
    for entry_id in ids:
        assert client.get(f"/entries/{entry_id}/filing").json()["filing_state"] == "done"
