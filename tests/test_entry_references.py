"""What points at a note, from anywhere in the notebook.

INBOX 246, the owner's second sentence: "I want it to show in notes if they
are attached to or referenced in/by a document, note, whiteboard, or
mindmap." `GET /entries/{id}/references` is that answer.

The two halves are found two different ways and the tests are split the same
way, because the failure modes are different. A board or a map carries a note
as a real row, so that half is exact and its only interesting cases are the
ones about which *kind* of board it is and what happens to a note with no
name. A document or another note carries it as text, so that half can be
wrong in both directions: it can miss a reference that is there, and it can
claim one that is not.
"""

from __future__ import annotations


def _note(client, content: str) -> dict:
    return client.post("/entries", json={"content": content}).json()


def _board(client, name: str, board_type: str = "board") -> dict:
    return client.post("/whiteboard/boards", json={"name": name, "type": board_type}).json()


def _place(client, board_id: int, entry_id: int) -> dict:
    return client.post(
        "/whiteboard/nodes", json={"entry_id": entry_id, "board_id": board_id, "x": 10, "y": 20}
    ).json()


def _refs(client, entry_id: int) -> list[dict]:
    return client.get(f"/entries/{entry_id}/references").json()["items"]


def test_a_note_nothing_points_at_has_no_references(client):
    note = _note(client, "The roof quote, on its own with nothing pointing at it")
    assert _refs(client, note["id"]) == []


def test_a_board_that_carries_the_note_is_listed_as_a_board(client):
    note = _note(client, "The roof quote")
    board = _board(client, "House jobs")
    _place(client, board["id"], note["id"])

    rows = _refs(client, note["id"])
    assert [(r["kind"], r["how"]) for r in rows] == [("board", "on it")]
    assert rows[0]["id"] == board["id"]
    assert "House jobs" in rows[0]["label"]


def test_a_mind_map_says_map_rather_than_board(client):
    """The owner asked for both by name, so the row has to tell them apart."""
    note = _note(client, "The roof quote")
    board = _board(client, "The house", board_type="map")
    _place(client, board["id"], note["id"])

    rows = _refs(client, note["id"])
    assert [r["kind"] for r in rows] == ["map"]


def test_one_board_carrying_a_note_twice_is_one_row(client):
    """A note can be on a board more than once; it is still one board."""
    note = _note(client, "The roof quote")
    board = _board(client, "House jobs")
    _place(client, board["id"], note["id"])
    _place(client, board["id"], note["id"])

    assert len(_refs(client, note["id"])) == 1


def test_a_note_with_no_name_still_finds_its_boards(client):
    """The text half needs a label to match on; the board half does not.

    An image-only note, or one that opens with a bare heading marker, has no
    label. It is still on the board it was placed on, and a person looking at
    it should be told so.
    """
    note = _note(client, "#")
    board = _board(client, "House jobs")
    _place(client, board["id"], note["id"])

    rows = _refs(client, note["id"])
    assert [r["kind"] for r in rows] == ["board"]


def test_a_wiki_link_from_another_note_is_a_link_and_a_mention_is_not(client):
    note = _note(client, "The roof quote")
    linked = _note(client, "Chased the roofer, see [[The roof quote]] for the number")
    mentioned = _note(client, "Told mum about The roof quote over dinner")

    rows = {r["id"]: r for r in _refs(client, note["id"])}
    assert rows[linked["id"]]["how"] == "links to it"
    assert rows[mentioned["id"]]["how"] == "mentions it"
    assert rows[linked["id"]]["kind"] == "note"


def test_links_are_listed_before_mentions(client):
    """A link is a decision someone made; a mention is a coincidence until
    they make it, so the rows someone chose come first."""
    note = _note(client, "The roof quote")
    _note(client, "aaa mentions The roof quote")
    _note(client, "zzz links to [[The roof quote]]")

    hows = [r["how"] for r in _refs(client, note["id"])]
    assert hows == ["links to it", "mentions it"], hows


def test_a_document_that_mentions_the_note_is_listed(client):
    note = _note(client, "The roof quote")
    client.post(
        "/documents",
        json={"title": "House plan", "content": "Waiting on [[The roof quote]] before booking."},
    )

    rows = _refs(client, note["id"])
    assert [(r["kind"], r["how"]) for r in rows] == [("document", "links to it")]
    assert rows[0]["label"] == "House plan"


def test_the_note_does_not_reference_itself(client):
    """It contains its own label, so a scan that forgets to exclude it finds
    it every time."""
    note = _note(client, "The roof quote, and later in the note, The roof quote again")
    assert _refs(client, note["id"]) == []


def test_a_deleted_note_is_not_listed_as_a_reference(client):
    note = _note(client, "The roof quote")
    other = _note(client, "Links to [[The roof quote]]")
    client.delete(f"/entries/{other['id']}")

    assert _refs(client, note["id"]) == []


def test_a_missing_note_answers_404(client):
    assert client.get("/entries/999999/references").status_code == 404


def test_a_label_does_not_show_its_wiki_brackets(client):
    """`plain_label` strips markdown links and used to miss wiki ones.

    `[text](url)` needs the `(url)` to match, so `[[a wiki link]]` fell
    through and every chip for a note whose first line links to another note
    read `[[The roof quote]]`, brackets and all. Found here, where four of
    the five source labels are wiki links, but the label is used on every
    note chip in the app.
    """
    note = _note(client, "The roof quote")
    _note(client, "[[The roof quote]] is the first thing on this note")

    rows = _refs(client, note["id"])
    assert rows, "nothing referenced it, so this proves nothing"
    assert all("[[" not in row["label"] for row in rows), rows
    assert rows[0]["label"].startswith("The roof quote is the first thing"), rows[0]["label"]
