"""Managing categories by hand: everything the agent can do, as routes.

INBOX 431 (e), the owner: "there needs to be a better, easier and more
accessible and learnable way to [manually] edit categories like with merging
them, splitting them, moving notes between them ... the user needs to be able
to easily do anything the ai can do". The agent's category tools
(`ai/tools/categories.py`) already create, rename, merge and delete; these
routes call the same functions rather than a second copy of the logic, and
add what a person managing by hand needs besides: moving chosen notes, a
split, a delete that says where the notes go, and enough in every answer
(`moved_ids`, `previous`) for the panel to undo it.
"""

from __future__ import annotations


def _note(client, text, category):
    entry = client.post("/entries", json={"content": text}).json()
    client.put(f"/entries/{entry['id']}", json={"category": category})
    return entry["id"]


def _cats(client):
    return {c["name"]: c for c in client.get("/categories").json()}


def test_create_is_the_agents_own_create(client):
    made = client.post("/categories", json={"name": "Garden", "description": "Plants"})
    assert made.status_code == 201 and made.json()["created"] is True
    assert "Garden" in _cats(client)
    again = client.post("/categories", json={"name": "garden"})
    assert again.status_code == 201 and again.json()["created"] is False
    assert client.post("/categories", json={"name": "  "}).status_code == 422


def test_merge_moves_every_note_and_says_which_for_undo(client):
    a = _note(client, "Tomatoes", "Veg")
    b = _note(client, "Beans", "Veg")
    _note(client, "Roses", "Flowers")
    cats = _cats(client)
    merged = client.post(f"/categories/{cats['Veg']['id']}/merge", json={"into": cats["Flowers"]["id"]}).json()
    assert merged["into"] == "Flowers" and merged["from"] == "Veg"
    assert sorted(merged["moved_ids"]) == sorted([a, b])
    cats = _cats(client)
    assert "Veg" not in cats and cats["Flowers"]["count"] == 3
    same = client.post(f"/categories/{cats['Flowers']['id']}/merge", json={"into": cats["Flowers"]["id"]})
    assert same.status_code == 400


def test_moving_chosen_notes_reports_where_each_came_from(client):
    a = _note(client, "One", "Inbox")
    b = _note(client, "Two", "Work")
    moved = client.post("/categories/move", json={"entry_ids": [a, b], "category": "Projects"}).json()
    assert moved["moved"] == 2 and moved["category"] == "Projects"
    assert {p["id"]: p["category"] for p in moved["previous"]} == {a: "Inbox", b: "Work"}
    assert client.get(f"/entries/{a}").json()["category"] == "Projects"
    # Undo is the same call with each note's previous category.
    for prev in moved["previous"]:
        client.post("/categories/move", json={"entry_ids": [prev["id"]], "category": prev["category"]})
    assert client.get(f"/entries/{b}").json()["category"] == "Work"
    assert client.post("/categories/move", json={"entry_ids": [], "category": "X"}).status_code == 422


def test_split_moves_the_chosen_notes_into_a_new_category(client):
    a = _note(client, "Tax return", "Admin")
    b = _note(client, "Passport", "Admin")
    c = _note(client, "Dentist", "Admin")
    cats = _cats(client)
    split = client.post(f"/categories/{cats['Admin']['id']}/split", json={"name": "Money", "entry_ids": [a, c, 99999]}).json()
    assert split["name"] == "Money" and sorted(split["moved_ids"]) == sorted([a, c])
    cats = _cats(client)
    assert cats["Admin"]["count"] == 1 and cats["Money"]["count"] == 2
    assert client.get(f"/entries/{b}").json()["category"] == "Admin"


def test_a_split_can_be_proposed_for_review_and_changes_nothing(client):
    for text, tags in [("Tax", ["money"]), ("Invoice", ["money"]), ("Passport", ["travel"]), ("Visa", ["travel"]), ("Misc", [])]:
        entry = client.post("/entries", json={"content": text}).json()
        client.put(f"/entries/{entry['id']}", json={"category": "Admin", "tags": tags})
    cats = _cats(client)
    proposal = client.post(f"/categories/{cats['Admin']['id']}/split/propose").json()
    groups = {g["name"]: len(g["entry_ids"]) for g in proposal["groups"]}
    assert groups.get("money") == 2 and groups.get("travel") == 2
    assert _cats(client)["Admin"]["count"] == 5


def test_delete_with_a_destination_keeps_every_note(client):
    a = _note(client, "Draft", "Old")
    _note(client, "Kept", "New")
    cats = _cats(client)
    gone = client.delete(f"/categories/{cats['Old']['id']}", params={"into": cats["New"]["id"]}).json()
    assert gone["moved_ids"] == [a] and gone["name"] == "Old" and gone["into"] == "New"
    assert client.get(f"/entries/{a}").json()["category"] == "New"
    # Without a destination the notes stay, Uncategorised, as before.
    b = _note(client, "Loose", "Temp")
    temp = _cats(client)["Temp"]["id"]
    plain = client.delete(f"/categories/{temp}").json()
    assert plain["moved_ids"] == [b]
    assert client.get(f"/entries/{b}").json()["category"] != "Temp"


def test_the_ai_can_propose_a_split_and_the_tags_are_the_fallback(client, fake_ollama):
    ids = []
    for text in ("Tax return", "Invoice", "Passport", "Visa", "Dentist"):
        entry = client.post("/entries", json={"content": text}).json()
        client.put(f"/entries/{entry['id']}", json={"category": "Admin"})
        ids.append(entry["id"])
    admin = _cats(client)["Admin"]["id"]
    fake_ollama.librarian_reply = (
        'Sure: {"groups": [{"name": "Money", "notes": [%d, %d, 99999]}, '
        '{"name": "Travel", "notes": [%d, %d]}, {"name": "Lonely", "notes": [%d]}]}'
        % (ids[0], ids[1], ids[2], ids[3], ids[4])
    )
    proposal = client.post(f"/categories/{admin}/split/propose", params={"ai": "true"}).json()
    assert proposal["basis"] == "ai"
    assert proposal["groups"] == [{"name": "Money", "entry_ids": ids[:2]}, {"name": "Travel", "entry_ids": ids[2:4]}]
    assert proposal["rest"] == 1
    assert fake_ollama.chat_models, "asked the model"
    # Nonsense from the model: the tags answer instead, and say so.
    fake_ollama.librarian_reply = "I cannot help with that."
    fallback = client.post(f"/categories/{admin}/split/propose", params={"ai": "true"}).json()
    assert fallback["basis"] == "tags" and fallback["ai_unavailable"] is True
    # Nothing moved either way.
    assert _cats(client)["Admin"]["count"] == 5
