"""Confirm and Not right on every insight line (CHAT_PLAN decision 60, Brief
67): a confirmed insight answers the matching question as a fact the person
vouched for in the next turn; a dismissed one, and its near-variants, stay
away over twenty runs, in chat and in the Patterns line."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select

from memorymap.ai import composer, insights
from memorymap.core.config import user_now
from memorymap.core.database import DerivedFact, Entry
from memorymap.core import deps
from memorymap.entry import manager
from tests.test_composer_route_688 import _ask
from tests.test_insights import GOLF, TODAY

RUNS = 20


def test_key_makes_near_variants_one_insight():
    four = insights.recurrence("golf", GOLF, TODAY)
    three = insights.recurrence("golf", GOLF[1:], TODAY + timedelta(days=1)) or four
    assert insights.key(four) == insights.key(three) == "recurrence:golf"


def test_a_confirmed_insight_is_said_as_the_persons_word_never_hedged():
    found = insights.recurrence("golf", GOLF, TODAY)
    line = insights.confirmed_line(insights._said(found), TODAY)
    known = insights.Memory(confirmed={insights.key(found): {"line": line}})
    for question in ("tell me about golf", "any patterns in my golf notes"):
        result = composer.compose(question, GOLF, today=TODAY, learned=known)
        assert result["parts"][0] == ("confirmed", line), question
        assert "may be" not in result["text"] and "keeps coming up" not in result["text"], question
    assert line == "Golf is a hobby of yours (confirmed by you, 6 October)."


def test_a_dismissed_insight_is_not_said_in_twenty_turns():
    found = insights.recurrence("golf", GOLF, TODAY)
    known = insights.Memory(dismissed=frozenset({insights.key(found)}))
    for turn in range(1, RUNS + 1):
        result = composer.compose("tell me about golf", GOLF, today=TODAY, learned=known, salt="d", turn=turn)
        assert not result["insights"] and "hobby forming" not in result["text"], turn
    shown = composer.compose("tell me about golf", GOLF, today=TODAY)
    assert shown["insights"] and shown["insights"][0]["key"] == "recurrence:golf"


def _golf_notebook(session) -> list[int]:
    """Four golf notes over four weeks, tagged, so the Patterns line fires."""
    now = user_now(deps.get_config()).replace(tzinfo=None)
    ids = []
    for weeks, content in enumerate(("# Golf\n\nGolf after work, a good round.", "# Golf two\n\nGolf range session after work.",
                                     "# Golf three\n\nGolf after work again.", "# Golf four\n\nGolf on Sunday.")):
        entry = manager.create_entry(session, content, tags=["golf"])
        entry.created_at = now - timedelta(days=7 * (3 - weeks) + 1)
        ids.append(entry.id)
    session.commit()
    return ids


def _golf(client) -> dict | None:
    return next((p for p in client.get("/insights/patterns").json()["patterns"] if p["key"] == "recurrence:golf"), None)


def test_confirm_on_the_route_answers_the_next_turn_as_a_fact(client, session):
    _golf_notebook(session)
    pattern = _golf(client)
    assert pattern and not pattern["confirmed"]
    done = client.post("/insights/confirm", json=pattern)
    assert done.status_code == 201
    line = done.json()["line"]
    assert line.startswith("Golf is a hobby of yours (confirmed by you, ")
    row = session.scalars(select(DerivedFact).where(DerivedFact.kind == "confirmed")).one()
    assert row.model == "you" and row.edited_by_user and row.original_text == pattern["text"]
    #: The Patterns line now says it as confirmed, with no buttons.
    again = _golf(client)
    assert again["confirmed"] and again["text"] == line
    #: The next chat turn answers the matching question with it, first.
    out = _ask(client, "tell me about golf", use_tools=False)
    assert out["text"].startswith(line), out["text"][:200]


def test_not_right_on_the_route_keeps_it_and_its_variants_away(client, session):
    ids = _golf_notebook(session)
    pattern = _golf(client)
    dismissed = client.post("/insights/dismiss", json=pattern)
    assert dismissed.status_code == 201
    #: A fifth golf note: the count and the dates change, the insight does not.
    manager.create_entry(session, "# Golf five\n\nGolf after work, best round yet.", tags=["golf"])
    session.commit()
    assert session.get(Entry, ids[0])
    for turn in range(RUNS):
        assert _golf(client) is None, turn
        out = _ask(client, "tell me about golf", use_tools=False)
        said = [i for e in out.get("grounding", []) for i in e.get("insights", [])]
        assert not said and "hobby forming" not in out["text"], turn


def test_a_verdict_with_nothing_to_vouch_for_is_refused(client):
    nothing = client.post("/insights/confirm", json={"rule": "recurrence", "text": "x", "note_ids": []})
    no_rule = client.post("/insights/dismiss", json={"rule": "", "text": "x"})
    assert nothing.status_code == no_rule.status_code == 422


def test_the_route_says_the_insight_and_sends_it_for_its_buttons(client, session):
    """The route's notes carry their day as `written`, not `created_at`: the
    pattern line fired in the evals and never in Chat until the composer
    handed the day over."""
    _golf_notebook(session)
    out = _ask(client, "tell me about golf", use_tools=False)
    said = [i for e in out.get("grounding", []) for i in e.get("insights", [])]
    assert [i["key"] for i in said] == ["recurrence:golf"]
    assert "hobby forming" in out["text"]
