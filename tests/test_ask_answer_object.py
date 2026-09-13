"""Ask is Chat in single-turn mode (CHAT_PLAN.md Phase 3, decisions 8 and 11).

Three claims, none of which the DOM-blind suite could make before:

1. A follow-up asked from the Ask tab carries the answer above it. The chips
   under an answer call `askQuestion`, which sends `conversation` as history,
   so this is a claim about `/chat/stream`: the previous turn has to reach the
   model as its own messages, not be summarised into the system prompt or
   dropped. Asserted against the fake transport, which records every message
   list it was asked to answer.
2. The Ask tab renders the answer object rather than a second, thinner shape:
   `answerObject` is the one builder and its foot is drawn from the Chat tab's
   own three components.
3. When no model is connected every AI control stays visible and disabled with
   the same sentence on it, and Ask itself is never among them (decision 11:
   "Ask falls back to search results with passages; nothing is hidden").
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from memorymap.entry import manager

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
APP = (FRONTEND / "app.js").read_text(encoding="utf-8")
INDEX = (FRONTEND / "index.html").read_text(encoding="utf-8")
MARKUP = re.sub(r"<!--.*?-->", "", INDEX, flags=re.S)


def _ask(client, question, **body):
    with client.stream(
        "POST",
        "/chat/stream",
        #: Exactly what the Ask box sends: notes only, and no tools, which is
        #: what puts the turn on the plain streaming path rather than through
        #: the agent's tool loop.
        json={"question": question, "notes_only": True, "use_tools": False, **body},
    ) as response:
        for line in response.iter_lines():
            if line.strip():
                json.loads(line)


def test_a_followup_carries_the_answer_above_it(ai_client, fake_ollama, session):
    """The gate's own sentence: the second answer is written with the first in
    front of the model. Two turns over the same endpoint the chips use."""
    manager.create_entry(session, "The beans need netting next week")
    session.commit()

    fake_ollama.librarian_reply = "You wrote that the beans need netting next week."
    _ask(ai_client, "what did I write about beans")
    first = fake_ollama.librarian_reply

    _ask(
        ai_client,
        "when should I do that",
        history=[{"question": "what did I write about beans", "answer": first}],
    )
    sent = fake_ollama.chat_calls[-1]
    assert any(m["content"] == "what did I write about beans" for m in sent), sent
    assert any(m["content"] == first for m in sent), sent
    #: As their own turns, in order, not folded into the instructions: a
    #: history glued into the system prompt is a history the model weighs as
    #: rules rather than as what was just said.
    roles = [m["role"] for m in sent]
    assert roles[0] == "system"
    assert "user" in roles[1:] and "assistant" in roles[1:]


def test_the_followup_chips_reask_through_the_same_path_that_carries_history():
    """A chip that called its own fetch would be a second path to keep in step,
    and the context would live on exactly one of them."""
    start = APP.index("async function renderAskFollowups(")
    body = APP[start : APP.index("\n}\n", start)]
    assert "/chat/followups" in body
    assert "askQuestion(pick)" in body


def test_ask_builds_the_answer_object_and_draws_the_chat_tabs_components():
    """One shape (decision 3) and one set of components (decision 8)."""
    start = APP.index("function answerObject(")
    builder = APP[start : APP.index("\n}\n", start)]
    for field in ("sentences", "sources", "related", "next", "stats", "verification"):
        assert f"{field}:" in builder, field
    #: The sources list is the Chat tab's, so the two surfaces cannot number
    #: the same answer's sources differently.
    assert "chatSourcesFrom(" in builder

    start = APP.index("function renderAskAnswerFoot(")
    foot = APP[start : APP.index("\n}\n", start)]
    assert "renderRelatedElsewhere(" in foot
    assert "chatSourcesPanel(" in foot

    for element in ("ask-answer-foot", "ask-answer-related", "ask-answer-sources", "ask-followups"):
        assert f'id="{element}"' in MARKUP, element


def test_related_items_are_not_written_into_the_box_that_clears_them():
    """The bug the restructuring found: `renderAnswerGrounding` opens with
    `replaceChildren()`, and the grounding event always arrives after the
    related one, so "Elsewhere in your notebook" was drawn and deleted."""
    start = APP.index("async function askQuestion(")
    body = APP[start : APP.index("\nfunction retryAnswer(", start)]
    assert 'renderRelatedElsewhere($("ai-answer-grounding")' not in body
    assert "relatedItems = event.items" in body


def test_ask_is_never_disabled_when_the_model_is_off():
    """Decision 11. Ask answers from search alone, so greying it out would hide
    the one thing that still works."""
    start = APP.index("const AI_ONLY_CONTROLS = [")
    table = APP[start : APP.index("\n];", start)]
    for never in ('"ask-btn"', '"question"', '"stop-btn"'):
        assert never not in table, never


# --- the popup agent (CHAT_PLAN.md decision 9) --------------------------------


def _starter_table() -> str:
    start = APP.index("const AGENT_STARTERS = [")
    return APP[start : APP.index("\n];", start)]


def test_the_popup_agent_offers_twelve_starters_grouped_by_verb():
    """Four was the count, and the report was that the useful things were not
    among them. Twelve, in five groups, in the plan's own order."""
    table = _starter_table()
    assert table.count("{ group:") == 12, table.count("{ group:")
    groups = re.findall(r'group: "(\w+)"', table)
    assert list(dict.fromkeys(groups)) == ["Capture", "Find", "Summarise", "Remind", "Do"]


def test_a_starter_is_a_stem_or_a_whole_instruction_and_never_both():
    """The trailing space is the contract the click handler reads: a stem waits
    with the caret after it, anything else runs on the press. A starter ending
    in a space *and* a full stop would run half a sentence."""
    for text in re.findall(r'text: "([^"]+)"', _starter_table()):
        if text.endswith(" "):
            assert not text.rstrip().endswith((".", "?")), text
        else:
            assert text.rstrip().endswith((".", "?")), text


def test_a_complete_starter_runs_and_a_stem_does_not():
    """It used to test for a question mark, so the seven starters that are
    instructions ("Tag my untagged notes.") sat in the box doing nothing."""
    start = APP.index('$("command-palette-intro")?.addEventListener')
    handler = APP[start : APP.index("\n});", start)]
    assert "rememberAgentStarter(starter)" in handler
    assert "endsWith(\"?\")" not in handler
    assert "cmdPaletteAsk(starter.trim())" in handler


def test_the_open_note_toggle_scopes_the_run_to_what_is_open():
    start = APP.index("function agentScopeForRun(")
    body = APP[start : APP.index("\n}\n", start)]
    #: A document and a note reach the server through different fields; sent as
    #: one, a document arrives as its title and nothing else.
    assert "documentIds" in body and "noteIds" in body
    assert 'id="command-palette-use-note"' in MARKUP

    #: Resolved when the message is sent, not when the box was ticked: the
    #: palette stays open while you move around the app.
    start = APP.index("async function cmdPaletteAsk(")
    ask = APP[start : APP.index("\n}\n", start)]
    assert "...agentScopeForRun()" in ask


def test_the_toggle_never_offers_to_use_nothing():
    start = APP.index("function syncAgentOpenNoteToggle(")
    body = APP[start : APP.index("\n}\n", start)]
    assert "box.disabled = !subject" in body
    #: The words are written onto a span, not onto the label: a label's own
    #: `textContent` includes the checkbox inside it.
    assert "command-palette-use-note-text" in body
