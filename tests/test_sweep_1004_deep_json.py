"""A small model's runaway "[[[[[[" is a bad argument, not a crashed turn
(sweep 1004). `json.loads` raises RecursionError, which is not a ValueError,
past a few thousand levels, and every reader of a model's JSON caught only the
second."""

from __future__ import annotations

import pytest

from memorymap.ai import provider, tools

RUNAWAY = ("[" * 20_000, '{"a":' * 5_000 + "1" + "}" * 5_000)


@pytest.mark.parametrize("text", RUNAWAY, ids=["brackets", "objects"])
def test_loads_lenient_refuses_it_as_not_json(text):
    with pytest.raises(ValueError):
        provider.loads_lenient(text)


@pytest.mark.parametrize("text", RUNAWAY, ids=["brackets", "objects"])
def test_a_tool_call_carrying_it_is_marked_invalid_not_raised(text):
    calls = provider.normalise_tool_calls([{"function": {"name": "tag_note", "arguments": text}}])
    assert calls[0]["arguments"] == {} and calls[0]["invalid_arguments"]


@pytest.mark.parametrize("text", RUNAWAY, ids=["brackets", "objects"])
def test_an_argument_that_is_it_comes_back_as_an_error_not_an_exception(session, text):
    result = tools.execute_tool(session, "tag_note", {"note_id": 1, "add": text})
    assert "error" in result
