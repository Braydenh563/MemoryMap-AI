"""What a tool call touched, for the chat's live action line.

Asked for: *"is it also possible to have live action lines show on the chat ui,
to show and visually show as the ai accesses specific notes, files and
stuff??"*

Read from the tool's own **result**, never from the arguments it was called
with: arguments are what the model asked for, which may be a search string
rather than an id, may be wrong, and may name a note the call then refused. The
result is what happened.
"""

from __future__ import annotations

from memorymap.ai.agent import TOUCHED_LIMIT, _touched_notes


def test_a_single_note_result_is_itself_the_note():
    """`get_note`, `edit_note` and `pin_note` return the note at the top level."""
    touched = _touched_notes({"id": 43, "content": "League of Legends champions", "tags": []})
    assert touched == [{"id": 43, "label": "League of Legends champions"}]


def test_a_list_result_names_every_note():
    touched = _touched_notes(
        {"notes": [{"id": 1, "content": "one"}, {"id": 2, "content": "two"}]}
    )
    assert [t["id"] for t in touched] == [1, 2]


def test_the_same_note_is_named_once():
    touched = _touched_notes(
        {"id": 7, "content": "seven", "notes": [{"id": 7, "content": "seven"}]}
    )
    assert [t["id"] for t in touched] == [7]


def test_a_row_without_content_is_not_a_note():
    """Plenty of results carry an `id` that is not a note's — a link id, a
    reminder's, a category's. `content` is what every note-shaped result has."""
    assert _touched_notes({"id": 5, "name": "Games", "total": 3}) == []


def test_a_tool_that_touched_nothing_contributes_nothing():
    """The UI omits the row entirely rather than drawing an empty one."""
    assert _touched_notes({"total": 27, "by_category": {"Games": 3}}) == []


def test_the_label_is_one_line_and_bounded():
    long = "a very long note " * 20
    label = _touched_notes({"id": 1, "content": f"first line\n\n{long}"})[0]["label"]
    assert "\n" not in label
    assert len(label) <= 60


def test_a_huge_result_is_capped():
    """A `list_notes` over a big notebook would otherwise bury the answer under
    its own evidence."""
    rows = [{"id": i, "content": f"note {i}"} for i in range(50)]
    assert len(_touched_notes({"notes": rows})) == TOUCHED_LIMIT


def test_a_note_with_no_text_still_gets_a_label():
    assert _touched_notes({"id": 9, "content": ""})[0]["label"] == "note #9"


def test_a_non_dict_result_is_survivable():
    assert _touched_notes(None) == []
    assert _touched_notes("boom") == []
