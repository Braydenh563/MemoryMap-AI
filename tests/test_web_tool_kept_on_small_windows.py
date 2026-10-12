"""A turn that asks for the web keeps the web tools when the window is small
(owner, 2026-10-12): `web_search` was appended last and so dropped first, and a
model told about web search but not handed the tool said it could not look."""

from tessellate.ai import tools
from tessellate.core import deps


def _names(specs):
    return [s["function"]["name"] for s in specs]


def test_a_web_ask_keeps_web_search_when_the_budget_is_tight(session):
    deps.get_config().set_preference("web_search_enabled", True)
    offered = tools.ollama_tools(None)
    assert "web_search" in _names(offered)
    budget = tools.schema_chars(offered) // 4
    plain, dropped = tools.within_budget(offered, budget)
    assert "web_search" in dropped
    keep = tools.keep_first_for("can you search the web for the origin of sandwiches and who invented them?")
    kept, _ = tools.within_budget(offered, budget, keep)
    assert "web_search" in _names(kept)


def test_an_ordinary_question_changes_nothing(session):
    deps.get_config().set_preference("web_search_enabled", True)
    assert tools.keep_first_for("what did I write about the gym?") is None


def test_with_web_off_nothing_is_kept_for_it(session):
    deps.get_config().set_preference("web_search_enabled", False)
    assert tools.keep_first_for("search the web for sandwiches") is None
