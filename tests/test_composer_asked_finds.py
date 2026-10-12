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


@pytest.mark.parametrize(
    ("ask", "about"),
    [
        ("can you find stuff ive mentioned abt gym??", "gym"),
        ("find anything i wrote about taxes", "taxes"),
        ("search for stuff about the trip", "trip"),
        ("find dentist", "dentist"),
    ],
)
def test_a_find_with_filler_searches_for_the_topic_and_is_not_a_capability_question(ask, about):
    from tessellate.ai import intent

    parsed = commands.parse(ask, NOW)
    assert parsed is not None and parsed.args["about"] == about
    assert intent.classify(ask) == intent.ACT


def test_a_find_sends_its_step_before_its_answer(client, session):
    """The step group is above the answer in the bubble: the step event is
    streamed first, so the answer folds it up as it starts."""
    import json

    from tessellate.entry import manager

    manager.create_entry(session, "# Gym plan\n\nLegs on Monday.")
    session.commit()
    kinds = []
    with client.stream("POST", "/chat/stream", json={"question": "find notes about gym", "use_tools": False}) as response:
        kinds = [json.loads(line)["type"] for line in response.iter_lines() if line.strip()]
    assert "tool" in kinds and "answer" in kinds
    assert kinds.index("tool") < kinds.index("answer")


@pytest.mark.parametrize(
    "ask",
    [
        "cna u search the web for sandwiches",
        "can u pls serch teh web for sandwiches",
        "cna u serach the wbe for sandwiches",
        "u can saerch teh web 4 sandwiches?",
    ],
)
def test_a_web_ask_survives_typos_and_slang(ask):
    from tessellate.ai import intent, utilities

    assert utilities.kind_of(ask) == "web"
    assert intent.classify(ask) == intent.UTILITY
