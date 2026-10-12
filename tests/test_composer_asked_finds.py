"""Question-shaped finds ("do i have anything on taxes") and a trailing
"in my notes" scope are read as note finds about the topic alone."""

from datetime import datetime

import pytest

from tessellate.ai import commands

NOW = datetime(2026, 10, 12, 10)


@pytest.mark.parametrize(
    ("ask", "about"),
    [
        ("do i have anything on taxes", "taxes"),
        ("any notes about budget?", "budget"),
        ("show me everything i wrote about the trip", "trip"),
        ("what notes mention sam", "sam"),
        ("what notes do i have about cats", "cats"),
        ("look up sandwich in my notes", "sandwich"),
        ("find invoice in my notes", "invoice"),
    ],
)
def test_asked_find_names_only_the_topic(ask, about):
    parsed = commands.parse(ask, NOW)
    assert parsed is not None and parsed.args["intent"] == "find"
    assert parsed.args["about"] == about


@pytest.mark.parametrize(("ask", "content"), [("new note called ideas", "Ideas"), ("make a note titled pack list", "Pack list")])
def test_a_named_new_note_takes_the_name_as_its_content(ask, content):
    parsed = commands.parse(ask, NOW)
    assert parsed is not None and parsed.args["intent"] == "new_note"
    assert parsed.args["content"] == content


@pytest.mark.parametrize("ask", ["whats in my work category", "what's in the health folder?", "pull up notes tagged work"])
def test_a_filing_asked_by_name_lists_that_filing(ask):
    parsed = commands.parse(ask, NOW)
    assert parsed is not None and parsed.args["intent"] == "find"
    assert parsed.args["filed"] == parsed.args["about"]
