"""A deferred note always settles, even when the app closed mid-filing.

Owner, 0.3.31: "even if the filing already happened it still looks like it is
endlessly filing". The filing job lives in this process's queue, so a note
saved just before the app closed came back "pending" with nothing behind it.
`GET /entries/{id}/filing` now re-queues such a note, and a job for a note
that has already settled does nothing.
"""

import time

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
    try:
        janitor._chat_within_deadline(_Slow(), "m", [], deadline=0.3)
        raised = False
    except TimeoutError:
        raised = True
    assert raised and time.time() - started < 2


def test_filing_asks_the_model_in_quick_mode():
    from memorymap.ai import janitor

    seen = {}

    class _Fake:
        def chat(self, model, messages, mode=None):
            seen["mode"] = mode
            return {"content": "{}"}

    janitor._chat_within_deadline(_Fake(), "m", [])
    assert seen["mode"] == "quick"
