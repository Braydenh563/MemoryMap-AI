"""How to use a feature, asked with a feature word that is also a note word
("how do I tag a note", "how do I make a mind map"): the Guide's, never a
notes search (bug sweep 2026-10-12: all answered "nothing comes up for tag")."""

from __future__ import annotations

import pytest

from memorymap.ai import intent


@pytest.mark.parametrize(
    "question",
    [
        "how do I tag a note", "how can i add a tag", "how do I make a mind map", "how do i create a mindmap",
        "how do I use the whiteboard", "how would I set a reminder", "how do I delete a tag",
        "how do i rename a tag", "how do I draw on the whiteboard", "how do I pin a note", "how can I rename a note",
        "how can I unlink two notes", "how do i delete a note",
    ],
)
def test_how_to_use_a_feature_is_the_guides(question):
    assert intent.classify(question) == intent.ABOUT_APP, question


@pytest.mark.parametrize(
    "question",
    [
        "how do I make sourdough", "what did I tag as work", "how did I set up the reminder for the dentist",
        "what tags do I use", "which reminder did I set for Friday", "how do i find the note about pasta", "how did I rename the note about pasta", "how do I delete a note about pasta",
    ],
)
def test_a_question_about_the_notes_still_searches_them(question):
    assert intent.classify(question) != intent.ABOUT_APP, question
