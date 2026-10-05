"""WORLD_CLASS_PLAN section 17 row 3: a filing style the person chooses.

The style (by topic, by project, by time) is a preference that reaches the
filing prompt the model reads, with three examples per style. The default is
by topic and leaves the prompt byte for byte what it was, so a notebook that
never touches the setting files exactly as before.
"""
import pytest

from memorymap.ai import janitor, librarian


def _prompt(session, style):
    from memorymap.core import deps

    if style is not None:
        deps.get_config().set_preference("filing_style", style)
    return librarian.filing_prompt(session, "Ran 5k in 24 minutes", ["Fitness"])


def test_the_default_prompt_is_unchanged(session):
    base = _prompt(session, None)
    assert "Filing style" not in base
    assert _prompt(session, "topic") == base


@pytest.mark.parametrize("style", ["project", "time"])
def test_a_chosen_style_reaches_the_prompt_with_three_examples(session, style):
    prompt = _prompt(session, style)
    assert "Filing style" in prompt
    section = prompt.split("Filing style", 1)[1].split("Note:", 1)[0]
    assert section.count("\n- ") == 3


def test_an_unknown_style_falls_back_to_topic(session):
    assert _prompt(session, "nonsense") == _prompt(session, "topic")


def test_the_system_prompt_stays_one_constant():
    assert "Prefer one of the existing" in janitor.SYSTEM_PROMPT


def test_the_preference_saves_and_rejects_nonsense(client):
    assert client.get("/preferences").json()["filing_style"] == "topic"
    assert client.put("/preferences", json={"filing_style": "project"}).status_code == 200
    assert client.get("/preferences").json()["filing_style"] == "project"
    assert client.put("/preferences", json={"filing_style": "mood"}).status_code == 422
