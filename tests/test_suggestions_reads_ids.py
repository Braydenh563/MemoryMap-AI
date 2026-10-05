"""`GET /suggestions` does not load the notebook (audit 2026-10-05, ARCH-11).

Measured before: 1,234 ms p50 at 5,000 notes returning an empty list, 27% of
it one comprehension that loaded every note as a whole ORM object to test
whether an id was visible. It now reads ids, and loads only the notes a
link-type suggestion shows.
"""

from __future__ import annotations

from sqlalchemy import event

from memorymap.core.database import Entry


def test_suggestions_loads_only_the_notes_it_shows(client):
    ids = [client.post("/entries", json={"content": f"note number {i}"}).json()["id"] for i in range(25)]
    client.post(f"/entries/{ids[0]}/links", json={"target_id": ids[1]})
    loaded: list[int] = []

    def on_load(target, _context):  # noqa: ANN001
        loaded.append(target.id)

    event.listen(Entry, "load", on_load)
    try:
        reply = client.get("/suggestions")
    finally:
        event.remove(Entry, "load", on_load)
    assert reply.status_code == 200
    assert len(set(loaded)) <= 2, f"/suggestions loaded {len(set(loaded))} notes to show at most two"
