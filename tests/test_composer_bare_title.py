"""A note that is only a title ("Work") asked about by name is said to be
only a title, not "your notes don't seem to cover that" (bug sweep 2026-10-12)."""

from __future__ import annotations

import pytest

from memorymap.ai import composer

NOTE = {"id": 2, "content": "Work", "category": "Uncategorised", "tags": [], "created_at": "2026-10-11T23:23:47Z"}


@pytest.mark.parametrize("question", ["summarise my work notes", "what did I write about work", "work notes"])
def test_a_title_only_note_is_named_not_denied(question):
    text = composer.compose(question, [NOTE])["text"]
    assert "only a title" in text and "Work" in text, text


def test_an_unrelated_subject_still_finds_nothing():
    text = composer.compose("summarise my gym notes", [NOTE])["text"]
    assert "only a title" not in text
