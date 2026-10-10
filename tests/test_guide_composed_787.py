"""The Guide with no model (INBOX 787, the owner: "the atlas guide repeted
twice?? and it ist customised with the composer yet either. I feel like if
the user is set to view the deterministic response, they should have the
option to see either the base help text or a slightly more customised
version with the composer").

A greeting is answered as a greeting, never with the open tab's topic; a
topic answer says each sentence once; the default answer is composed for the
question (its lead sentence, where the feature lives, the steps), and the
help text word for word is the other side of the answer's toggle.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from memorymap.ai import help_chat, reading

#: Importing `reading` wires the Guide's reader and the composer's help line.
READER_LOADED = reading.__name__
JS = Path(__file__).resolve().parents[1] / "frontend" / "js"


def _sentences(text: str) -> list[str]:
    flat = re.sub(r"[#*]", "", text)
    return [s.strip() for s in re.split(r"(?<=[.?])\s+|\n+", flat) if len(s.split()) >= 4]


@pytest.mark.parametrize("hello", ["hey", "Hi", "hello there", "hey atlas", "good morning"])
def test_a_greeting_is_answered_as_one_not_with_the_tabs_topic(hello):
    reply = help_chat.offline_answer(hello, tab="dashboard")
    assert reply.get("greeting") is True
    assert help_chat.GUIDE_NAME in reply["content"]
    assert "Dashboard" not in reply["content"] and not reply["badges"] and not reply["sources"]
    assert help_chat.topics_for(hello, "dashboard") == []


def test_thanks_gets_a_short_reply():
    reply = help_chat.offline_answer("thanks", tab="graph")
    assert reply["content"] == help_chat.THANKS_REPLY and not reply["badges"]


@pytest.mark.parametrize(
    "question",
    ["how do I set a reminder?", "where is backup", "how do I export my notes", "what does the dashboard show",
     "how do I change the theme", "how do I scan a document"],
)
def test_a_topic_answer_says_each_sentence_once(question):
    content = help_chat.offline_answer(question)["content"]
    said = _sentences(content)
    assert len(said) == len(set(said)), content


def test_the_provenance_line_reads_naturally():
    assert "word for word: no model" not in help_chat.OFFLINE_LEAD
    assert help_chat.OFFLINE_LEAD == "From the app's help, with no model running."


def test_the_default_answer_is_composed_and_the_help_text_is_the_other_view():
    question = "how do I set a reminder?"
    reply = help_chat.offline_answer(question)
    topic = help_chat.topics_for(question)[0]
    #: The help text word for word is the toggle's other side.
    assert topic["body"] in reply["system"]["content"]
    assert reply["system"]["content"] not in reply["content"]
    #: The composed side is shorter than the whole topic and names where it is.
    assert len(reply["content"]) < len(reply["system"]["content"])
    assert "Reminders tab" in reply["content"]
    assert reply["content"].rstrip().endswith(help_chat.OFFLINE_LEAD)


def test_a_topic_with_steps_gives_its_steps():
    reply = help_chat.offline_answer("how do I capture a note")
    assert "1. Open the Notes tab" in reply["content"]


def test_a_where_question_leads_with_the_place():
    reply = help_chat.offline_answer("where do I find the logs")
    assert reply["content"].startswith("It's in Settings, Logs.")


def test_a_how_to_lead_answers_the_verb_asked():
    """"How do I make a reminder" led with how the tab is laid out (Overdue,
    Today, Upcoming, Done); the sentence that says how to make one leads."""
    content = help_chat.offline_answer("how do I make a reminder")["content"]
    first = content.split("\n", 1)[0]
    assert "Overdue / Today" not in first, first


def test_the_route_sends_both_views(client):
    body = client.post("/help/ask", json={"question": "how do I set a reminder?"}).json()
    assert body["system"]["content"] and body["system"]["content"] not in body["content"]
    hey = client.post("/help/ask", json={"question": "hey", "tab": "dashboard"}).json()
    assert hey["greeting"] is True and not hey["badges"]


def test_the_client_draws_the_starters_under_a_greeting():
    js = (JS / "help-chat.js").read_text(encoding="utf-8")
    assert "result?.greeting" in js
    assert "atlasStartersFor(" in js[js.index("function renderHelpChatGreeting") :]


def test_the_guide_topic_says_what_the_two_views_are():
    guide = next(t for t in help_chat.HELP_TOPICS if t["id"] == "guide")
    assert "From the help" in guide["body"]
