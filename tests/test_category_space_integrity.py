"""Filing never crosses spaces, whichever view the request was made from.

Measured by driving the real app (2026-10-03): from "All spaces" (header
`X-Workspace-ID: all`, the default view) a note of space "uni" moved into
"Kids", a category of space "default", then read as "Uncategorised" in uni's
own view, because the category it pointed at was one uni cannot list. The
same happened through `PUT /entries/{id}` and through renaming uni's
"Lectures" onto a name another space used (a merge across spaces). Every test
here sets up two spaces holding the same or clashing names and acts from the
"all" view, which is where the lookup by bare name went wrong.
"""

from __future__ import annotations

ALL = {"X-Workspace-ID": "all"}
UNI = {"X-Workspace-ID": "uni"}
DEFAULT = {"X-Workspace-ID": "default"}


def _space(client, name: str) -> str:
    return client.post("/spaces", json={"name": name}).json()["id"]


def _note(client, content: str, category: str, headers: dict) -> int:
    resp = client.post("/entries", json={"content": content, "category": category}, headers=headers)
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def _category_in(client, entry_id: int, headers: dict) -> str:
    return client.get(f"/entries/{entry_id}", headers=headers).json()["category"]


def _names(client, headers: dict) -> set[str]:
    return {c["name"] for c in client.get("/categories", headers=headers).json()}


def test_move_from_all_view_files_into_the_notes_own_space(client):
    assert _space(client, "Uni") == "uni"
    _note(client, "kids note", "Kids", DEFAULT)
    note = _note(client, "lecture one", "Lectures", UNI)

    resp = client.post("/categories/move", json={"entry_ids": [note], "category": "Kids"}, headers=ALL)
    assert resp.status_code == 200

    assert _category_in(client, note, UNI) == "Kids"
    assert "Kids" in _names(client, UNI)


def test_put_entry_category_from_all_view_stays_in_space(client):
    _space(client, "Uni")
    _note(client, "a song", "Music", DEFAULT)
    note = _note(client, "lecture one", "Lectures", UNI)

    resp = client.put(f"/entries/{note}", json={"category": "Music"}, headers=ALL)
    assert resp.status_code == 200
    assert resp.json()["category"] == "Music"
    assert _category_in(client, note, UNI) == "Music"
    assert "Music" in _names(client, UNI)


def test_rename_from_all_view_does_not_merge_across_spaces(client):
    _space(client, "Uni")
    _note(client, "dig the beds", "Garden", DEFAULT)
    a = _note(client, "lecture one", "Lectures", UNI)
    b = _note(client, "lecture two", "Lectures", UNI)
    lectures = next(c for c in client.get("/categories", headers=UNI).json() if c["name"] == "Lectures")

    resp = client.put(f"/categories/{lectures['id']}", json={"name": "Garden"}, headers=ALL)
    assert resp.status_code == 200
    assert resp.json()["merged"] is False

    assert _category_in(client, a, UNI) == "Garden"
    assert _category_in(client, b, UNI) == "Garden"
    # The default space's own Garden is untouched and still holds its note.
    default_garden = [c for c in client.get("/categories", headers=DEFAULT).json() if c["name"] == "Garden"]
    assert default_garden and default_garden[0]["count"] == 1


def test_rename_within_one_space_still_merges(client):
    _space(client, "Uni")
    _note(client, "maths", "Maths", UNI)
    note = _note(client, "lecture one", "Lectures", UNI)
    lectures = next(c for c in client.get("/categories", headers=UNI).json() if c["name"] == "Lectures")

    resp = client.put(f"/categories/{lectures['id']}", json={"name": "Maths"}, headers=ALL)
    assert resp.json() == {"renamed": True, "merged": True, "moved": 1}
    assert _category_in(client, note, UNI) == "Maths"


def test_split_from_all_view_stays_in_space(client):
    _space(client, "Uni")
    _note(client, "kids note", "Kids", DEFAULT)
    note = _note(client, "lecture one", "Lectures", UNI)
    lectures = next(c for c in client.get("/categories", headers=UNI).json() if c["name"] == "Lectures")

    resp = client.post(f"/categories/{lectures['id']}/split", json={"name": "Kids", "entry_ids": [note]}, headers=ALL)
    assert resp.status_code == 200
    assert _category_in(client, note, UNI) == "Kids"


def test_delete_from_all_view_leaves_notes_uncategorised_in_their_space(client):
    _space(client, "Uni")
    _note(client, "loose", "Uncategorised", DEFAULT)
    note = _note(client, "lecture one", "Lectures", UNI)
    lectures = next(c for c in client.get("/categories", headers=UNI).json() if c["name"] == "Lectures")

    assert client.delete(f"/categories/{lectures['id']}", headers=ALL).status_code == 200
    assert _category_in(client, note, UNI) == "Uncategorised"
    assert "Uncategorised" in _names(client, UNI)


def test_merge_across_spaces_is_refused(client):
    _space(client, "Uni")
    _note(client, "kids note", "Kids", DEFAULT)
    _note(client, "lecture one", "Lectures", UNI)
    cats = client.get("/categories", headers=ALL).json()
    kids = next(c for c in cats if c["name"] == "Kids")
    lectures = next(c for c in cats if c["name"] == "Lectures")

    merge = client.post(f"/categories/{lectures['id']}/merge", json={"into": kids["id"]}, headers=ALL)
    assert merge.status_code == 400
    delete_into = client.delete(f"/categories/{lectures['id']}?into={kids['id']}", headers=ALL)
    assert delete_into.status_code == 400
    assert "Lectures" in _names(client, UNI)


def test_record_filing_uses_the_notes_space(session):
    """The background filer has no request, so no space on the session."""
    from memorymap.core.database import Category, Entry
    from memorymap.entry import manager

    manager.get_or_create_category(session, "Research", workspace_id="default")
    entry = Entry(content="a paper", category_id=manager.get_or_create_category(
        session, "Uncategorised", workspace_id="uni").id, tags="[]", workspace_id="uni")
    session.add(entry)
    session.commit()

    manager.record_filing(session, entry, "Research")
    filed = session.get(Category, entry.category_id)
    assert (filed.name, filed.workspace_id) == ("Research", "uni")
