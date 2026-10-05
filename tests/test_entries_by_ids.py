"""`GET /entries?ids=` re-reads only the notes a change touched (audit
2026-10-05, FE-05).

Every save, delete, undo, link and filing completion called `loadEntries()`,
which re-reads the whole notebook: at 5,010 notes that was 27 sequential
requests, 5.3 MB of JSON and up to 1.1 s of long tasks, per save. The client
now asks for the notes it changed (`refreshEntries` in notes-list.js) and
patches them into its list. These hold the server half:

- only the asked-for ids, in the list's own order, in the list's own view (a
  binned, archived or board id is simply absent, which is how the client
  learns to drop it);
- `X-Total-Count` is the whole list's size, not the answer's, so the client
  can check its patched list against the server's and re-read everything
  when the two disagree;
- no side effect: unlike `GET /entries/{id}`, reading a note this way does
  not count as opening it.
"""

from __future__ import annotations


def _note(client, text, **extra):
    response = client.post("/entries", json={"content": text, "category": "Ideas", **extra})
    assert response.status_code in (200, 201), response.text
    return response.json()


def test_only_the_asked_for_notes_in_list_order_with_the_whole_total(client):
    a = _note(client, "first note")
    b = _note(client, "second note")
    c = _note(client, "third note")
    response = client.get(f"/entries?ids={a['id']},{c['id']}")
    assert response.status_code == 200
    assert [e["id"] for e in response.json()] == [c["id"], a["id"]]  # newest first
    full = client.get("/entries")
    assert response.headers["X-Total-Count"] == full.headers["X-Total-Count"]
    assert int(response.headers["X-Total-Count"]) == len(full.json())
    assert b["id"] not in {e["id"] for e in response.json()}


def test_a_binned_or_archived_note_is_absent(client):
    a = _note(client, "to bin")
    b = _note(client, "to archive")
    keep = _note(client, "to keep")
    assert client.delete(f"/entries/{a['id']}").status_code in (200, 204)
    archived = client.post(f"/entries/{b['id']}/archive")
    assert archived.status_code in (200, 204), archived.text
    response = client.get(f"/entries?ids={a['id']},{b['id']},{keep['id']}")
    assert [e["id"] for e in response.json()] == [keep["id"]]


def test_reading_this_way_is_not_opening(client):
    a = _note(client, "quiet read")
    before = client.get(f"/entries?ids={a['id']}").json()[0]["access_count"]
    client.get(f"/entries?ids={a['id']}")
    after = client.get(f"/entries?ids={a['id']}").json()[0]["access_count"]
    assert after == before


def test_bad_ids_are_refused_and_too_many_are_refused(client):
    assert client.get("/entries?ids=1,abc").status_code == 422
    many = ",".join(str(i) for i in range(1, 300))
    assert client.get(f"/entries?ids={many}").status_code == 422
