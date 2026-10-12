"""Every tool's result reaches the chat as words or panels, never raw data:
each registered tool has a sayer in tool_say, and an error or an empty result
says a sentence rather than dumping the dict."""

import re

import pytest

from tessellate.ai import tool_say, tools


def test_every_tool_has_a_sayer():
    assert sorted(set(tools.TOOLS) - set(tool_say.SAYERS)) == []


@pytest.mark.parametrize("name", sorted(tools.TOOLS))
@pytest.mark.parametrize("result", [{}, {"error": "it failed"}])
def test_empty_and_failed_results_are_a_sentence(name, result):
    said = tool_say.say(name, result, {})["text"]
    assert said.strip()
    assert not said.lstrip().startswith("{")
    assert not re.match(r"\[(?!.*\]\()", said.lstrip())
    assert "Traceback" not in said
