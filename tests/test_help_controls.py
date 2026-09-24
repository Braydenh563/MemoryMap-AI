"""The Guide can answer "what are all the keys and hidden features of X".

INBOX 410, the owner: "what if the user asks the guide for all the hidden
features, keybinds, controls, utility and more for features like the
whiteboard, mindmap and documents editor etc. can it answer those??" Before
this it could not: the whiteboard entry was two sentences with no key in it,
the documents entry named three, and the shortcuts entry still taught the "g"
chord the app had replaced with "m". Each surface now has a controls entry
written from its own handlers and shortcut tables, and a question that asks
for keys, controls or hidden features about a named surface is routed to that
surface's controls entry rather than to its one-paragraph description.
"""

from __future__ import annotations

import re

import pytest

from memorymap.ai import help_chat


def _first(question: str) -> str | None:
    ranked = help_chat._matching_topics(question)
    return ranked[0]["id"] if ranked else None


CONTROLS = {
    "whiteboard-controls",
    "mind-map-controls",
    "documents-controls",
    "graph-controls",
    "chat-controls",
    "notes-controls",
    "library-controls",
    "timeline-controls",
    "reminders-controls",
    "dashboard-controls",
    "hidden-features",
}


def test_every_surface_has_a_controls_entry():
    ids = {topic["id"] for topic in help_chat.HELP_TOPICS}
    assert CONTROLS <= ids, sorted(CONTROLS - ids)


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("what are all the whiteboard shortcuts", "whiteboard-controls"),
        ("keyboard shortcuts for the whiteboard", "whiteboard-controls"),
        ("mind map keybinds", "mind-map-controls"),
        ("what are the document editor shortcuts", "documents-controls"),
        ("graph controls", "graph-controls"),
        ("hidden features", "hidden-features"),
        ("does the doc editor have emmet", "code-files"),
    ],
)
def test_a_controls_question_reaches_the_surface_controls_entry(question, expected):
    assert _first(question) == expected, help_chat._matching_topics(question)


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("what is the whiteboard", "whiteboard"),
        ("how do I make a mind map", "mind-maps"),
        ("what does the graph show", "graph"),
        ("how do i set a reminder", "reminders"),
    ],
)
def test_a_plain_question_still_gets_the_description(question, expected):
    """The controls entries are long on purpose; a question that asks what a
    thing is, with no word about keys or controls, is still answered by the
    one-paragraph entry."""
    assert _first(question) == expected, help_chat._matching_topics(question)


def test_a_question_naming_a_chord_finds_the_entry_that_documents_it():
    assert _first("what does F12 do") == "code-files"
    assert _first("what does ctrl shift f do in a document") in {"documents-controls", "code-files"}
    #: A chord an entry claims in its own keywords stays that entry's: Ctrl+P
    #: is Find anything's, however many controls entries mention it.
    assert _first("what does ctrl+p do") == "search"
    assert _first("what does cmd k do") == "command-palette"


def test_the_shortcuts_entry_teaches_the_m_chord_not_the_old_g_one():
    """The chord is "m" then a letter (app.js, `TAB_JUMP_KEYS`); the entry
    said "g" for as long as the guide has existed."""
    body = next(t["body"] for t in help_chat.HELP_TOPICS if t["id"] == "shortcuts")
    assert "m then a letter" in body
    assert "g then a letter" not in body


def test_controls_entries_follow_the_copy_rules():
    for topic in help_chat.HELP_TOPICS:
        if topic["id"] not in CONTROLS | {"shortcuts", "code-files"}:
            continue
        body = topic["body"]
        assert chr(0x2014) not in body, topic["id"]
        #: A "!" only as a key to type (Emmet's own "!"), never ending a sentence.
        assert not re.search(r"\w!", body), topic["id"]
        assert body[0].isupper(), topic["id"]
