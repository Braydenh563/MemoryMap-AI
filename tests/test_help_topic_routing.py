"""The guide finds the right topic for the questions people actually ask.

The owner, INBOX 304: "the help bot is useless, or the suggested questions are
bad or both". One cause was found then and fixed (`\\breminder\\b` not matching
the plural he typed, so a question about reminders was answered from the notes
and memory entries). This file is the other half: a standing set of plainly
phrased questions and the topic each must reach, so the next hole shows up here
rather than in a screenshot.

Measured on the branch head 2026-09-21, before the keywords below were widened:
**three of eighteen questions matched no topic at all** ("Can I use this
offline?", "How do I add a tag?", "Can I import from Obsidian?") and the guide
answered them from whatever the current tab happened to be. A question about
the promise the whole app is built on reached nothing.

The list is deliberately unclever. Every entry is a sentence somebody would
actually type, not a keyword dressed as one, because a routing test written
from the keyword table only ever proves the table matches itself.
"""

from __future__ import annotations

import pytest

from memorymap.ai import help_chat
from tests._app_js import app_js_text

#: (question, the id that must be in the top three). One id, not a set: if two
#: topics would both be right the question is too vague to be a fair test, and
#: belongs in ALWAYS_SOMETHING below instead.
#: Three rows moved on 2026-09-24, each to a topic that did not exist when
#: the row was written: locking has its own "security" topic, tags and
#: categories theirs, and mind maps theirs (the graph topic no longer claims
#: "mind map"). The question still has to land on the entry that answers it.
ROUTES = [
    ("Can Atlas write for me?", "write-with-atlas"),
    ("Where do reminders live?", "reminders"),
    ("How do I make a new note?", "capture"),
    ("Can I change the theme?", "appearance"),
    ("How do backups work?", "storage"),
    ("Can I import from Obsidian?", "storage"),
    ("How do I export everything?", "storage"),
    ("What are spaces for?", "spaces"),
    ("Where are my documents saved?", "documents"),
    ("Can I use this offline?", "privacy"),
    ("Is anything sent to the cloud?", "privacy"),
    ("How do I lock the app?", "security"),
    ("How do I add a tag?", "tags-categories"),
    ("What is a whiteboard?", "whiteboard"),
    ("How do mind maps work?", "mind-maps"),
    ("What does the graph show?", "graph"),
    ("Whats a skill?", "skills"),
    ("How do I record a meeting?", "voice"),
    ("Where are my images?", "files-images"),
    ("What keyboard shortcuts are there?", "shortcuts"),
    ("What is the status bar?", "statusbar"),
    ("How do I undo something?", "undo-bin"),
    #: The two that broke when "search" was added to the Library's keywords,
    #: and the reason `_matching_topics` weights a keyword by its word count.
    ("Can it search the web?", "websearch"),
    ("How do I turn on web search?", "websearch"),
]

#: Questions with more than one fair answer. They must reach *something*,
#: which is the failure the owner actually hit: no topic, so the guide answered
#: from the current tab's own entries.
ALWAYS_SOMETHING = [
    "How do I search my notes?",
    "How do I find an old note?",
    "Can Atlas write for me?",
]


@pytest.mark.parametrize("question,topic_id", ROUTES)
def test_a_plain_question_reaches_its_topic(question: str, topic_id: str) -> None:
    found = [topic["id"] for topic in help_chat.topics_for(question)]
    assert topic_id in found[:3], (
        f"{question!r} reached {found[:3]} and not {topic_id!r}. A question that "
        "reaches the wrong entries is answered from the wrong part of the guide, "
        "which is what the owner saw"
    )


@pytest.mark.parametrize("question", ALWAYS_SOMETHING)
def test_an_ordinary_question_reaches_something(question: str) -> None:
    assert help_chat.topics_for(question), (
        f"{question!r} matched no topic at all, so the guide falls back to the "
        "current tab's entries and answers a different question"
    )


def test_a_phrase_outranks_a_single_common_word() -> None:
    """The rule behind the two web-search rows, stated on its own.

    Scoring one per matching keyword makes "search" and "web search" equally
    strong evidence, and the generic one always belongs to whichever topic sits
    earlier in the table. Weighting by word count is what makes the specific
    match win on its merits.
    """
    web = help_chat.topics_for("how do I turn on web search")
    assert web and web[0]["id"] == "websearch", (
        f"'web search' should reach the web search entry first, not {[t['id'] for t in web][:2]}"
    )


def test_the_routing_set_names_real_topics() -> None:
    """A guard on the test rather than on the code: a renamed topic must break
    this loudly here rather than quietly stop being reachable."""
    known = {topic["id"] for topic in help_chat.HELP_TOPICS}
    named = {topic_id for _, topic_id in ROUTES}
    assert named <= known, f"these routes name topics that no longer exist: {sorted(named - known)}"


def test_every_suggested_question_is_one_the_guide_can_answer() -> None:
    """The other half of "the suggested questions are bad".

    The panel offers three questions before you have typed anything, tailored
    to the tab you are on (`ATLAS_STARTERS` and `ATLAS_TAB_STARTERS`, app.js).
    A starter the guide cannot route is the worst question on the screen: the
    app put it there, so pressing it and getting a vague answer teaches that
    the whole feature is vague. Read from app.js rather than duplicated here,
    so a starter added tomorrow is checked tomorrow.
    """
    import re

    source = app_js_text()
    generic = re.search(r"const ATLAS_STARTERS = \[(.*?)\];", source, re.S)
    per_tab = re.search(r"const ATLAS_TAB_STARTERS = \{(.*?)\n\};", source, re.S)
    assert generic and per_tab, "the starter tables have moved; this test cannot find them"
    questions = re.findall(r'"([^"]+\?)"', generic.group(1)) + re.findall(
        r'"([^"]+\?)"', per_tab.group(1)
    )
    assert len(questions) > 10, f"only {len(questions)} starters found; has the shape changed?"
    unanswerable = [q for q in questions if not help_chat.topics_for(q)]
    assert not unanswerable, (
        "the app offers these questions and the guide routes none of them:\n"
        + "\n".join(unanswerable)
    )
