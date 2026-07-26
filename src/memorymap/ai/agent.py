"""The Wave G agent loop: the chat model can act on the notebook.

Flow: offer the tool registry to Ollama → run whatever it calls → feed
the results back → repeat (bounded) → its final text is the answer.
Yields NDJSON-ready event dicts; the chat route just serialises them.

Safety lives here and in tools.py: destructive calls are never executed
in this loop — a "confirm" event goes to the UI instead, and the model
is told the action is waiting on the user.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator

from sqlalchemy.orm import Session

from memorymap.ai import librarian, tools
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import (
    OllamaClient,
    OllamaError,
    ToolsUnsupportedError,
)

# A runaway model must not loop forever on a local machine.
MAX_ROUNDS = 6

# How much tool output one turn may add to the conversation, in characters.
# Local models run in small windows, and tool results accumulate: six rounds
# of paging through a large notebook will push the question itself out of
# context, and the model then answers something nobody asked. The per-call
# caps in tools.py bound one result; this bounds the whole turn.
#
# Characters, not tokens, on purpose — a real tokeniser would mean loading one
# per model just to count, and ~4 chars/token is close enough for a stop rule.
TOOL_RESULT_BUDGET_CHARS = 24_000

BUDGET_EXHAUSTED = {
    "error": "context_budget_reached",
    "note": (
        "You have read as much of the notebook as fits in this conversation. "
        "No more tool results will be added. Answer now using what you already "
        "have, and tell the user plainly that you looked at part of their "
        "notes rather than all of them."
    ),
}

TOOLS_GUIDE = (
    "You can use tools to act on the notebook — create, edit, tag, pin, "
    "link, or delete notes, and manage reminders. Only make changes the "
    "user actually asked for; when they just ask a question, answer it "
    "without tools. Notes are referenced by their id number — use "
    "search_notes first if you don't know the id. "
    "The notes quoted below are only what search found for this question — "
    "they are NOT the whole notebook. To see more, use the reading tools: "
    "count_notes to answer 'how many', list_categories / list_tags to see "
    "what exists, list_notes to walk through notes (paging with next_offset "
    "while has_more is true), and get_note to read one note in full. "
    "search_notes and list_notes return clipped previews, so read a note with "
    "get_note before quoting it. Never state a total from a page of results — "
    "count_notes is the only thing that knows the real number. "
    "Private notes are not available to you at all; if one is asked about, "
    "say you can't see private notes. "
    "Beyond notes you can also reach the user's long-form documents "
    "(list_documents / get_document — these are never searched automatically, "
    "so go and look when a question is about something they wrote up), their "
    "earlier conversations with you (search_chat_history, for when they refer "
    "to something 'we talked about' that isn't in this thread — say when "
    "you're relying on it), and their saved skills (list_skills, save_skill). "
    "When the user mentions "
    "needing to do something at a time (\"remind me to… in 10 minutes\", "
    "\"…tomorrow at 9\", \"…tonight\"), call set_reminder with the due_at "
    "computed from the current time given below, as an ISO 8601 datetime. "
    "After acting, tell the user briefly what you did. NEVER claim you "
    "created, added, saved, edited, deleted, or tagged a note unless you "
    "actually called the tool to do it — describing a note in text does "
    "NOT save it. To save a note you MUST call create_note."
)

# Write tools whose absence makes a "I saved it" claim a lie (safety net).
_WRITE_TOOLS = {
    "create_note",
    "edit_note",
    "tag_note",
    "pin_note",
    "link_notes",
    "delete_note",
    "restore_note",
    "set_reminder",
    "complete_reminder",
    "rename_tag",
    "delete_tag",
}

# Phrases that mean the model thinks it performed a write action.
_CLAIM_PATTERN = re.compile(
    r"\b(i\s+(?:have\s+|just\s+)?(?:created|added|saved|made|updated|edited|"
    r"deleted|tagged|pinned|linked)|new note titled|created a? ?note)\b",
    re.IGNORECASE,
)

# Agent-mode grounding: tool results are a legitimate second source.
AGENT_GROUNDING = (
    "Answer the user in plain English using ONLY the notes provided and "
    "your tool results. If neither answers the question, say so honestly."
)


def build_agent_messages(
    question: str,
    notes: list[dict],
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
) -> list[dict]:
    """Like librarian.build_messages, but the system prompt allows
    acting, and each note shows its id so tools can target it."""
    style_hint = librarian.STYLE_HINTS.get(style, librarian.STYLE_HINTS["friendly"])
    profile_hint = f" About the user: {profile.strip()}" if profile.strip() else ""
    persona = (persona_prompt or librarian.DEFAULT_PERSONA).strip()
    # The model needs "now" to turn "in 10 minutes" into a real time.
    from memorymap.core.database import utcnow

    now_hint = f" The current date and time is {utcnow().astimezone().isoformat()}."
    messages = [
        {
            "role": "system",
            "content": f"{persona} {AGENT_GROUNDING} {TOOLS_GUIDE}{now_hint} "
            f"{style_hint}{profile_hint}",
        }
    ]
    for turn in (history or [])[-librarian.MAX_HISTORY_TURNS:]:
        past_question = str(turn.get("question", "")).strip()
        past_answer = str(turn.get("answer", "")).strip()[
            : librarian.MAX_HISTORY_ANSWER_CHARS
        ]
        if past_question and past_answer:
            messages.append({"role": "user", "content": past_question})
            messages.append({"role": "assistant", "content": past_answer})

    numbered = "\n".join(
        f"{i}. (note id {note.get('id', '?')}) [{note['category']}] {note['content']}"
        for i, note in enumerate(notes, start=1)
    )
    body = f"My notes:\n{numbered}\n\n" if notes else "My notebook looks empty.\n\n"
    messages.append({"role": "user", "content": f"{body}My request: {question}"})
    return messages


# What the model is told when a destructive call is parked for approval.
AWAITING_CONFIRMATION = {
    "status": "awaiting_user_confirmation",
    "note": (
        "The app is showing the user a confirm button for this action. "
        "It has NOT run yet — tell the user it's waiting for their approval."
    ),
}


def run_agent(
    session: Session,
    question: str,
    notes: list[dict],
    model_manager: ModelManager,
    ollama: OllamaClient,
    style: str = "friendly",
    profile: str = "",
    history: list[dict] | None = None,
    persona_prompt: str | None = None,
) -> Iterator[dict]:
    """Yields event dicts:
    {"type": "unsupported"}                    — model can't do tools; caller
                                                 should fall back to plain Q&A
                                                 (always the first and only event)
    {"type": "thinking", "delta": str}
    {"type": "tool", "label": str, "ok": bool, "error": str|None}
    {"type": "confirm", "name", "arguments", "label"}
    {"type": "answer", "delta": str}           — the final text
    """
    messages = build_agent_messages(
        question,
        notes,
        style=style,
        profile=profile,
        history=history,
        persona_prompt=persona_prompt,
    )
    offered = tools.ollama_tools()
    model = model_manager.chat_model()
    did_write = False  # did any real write tool run this turn?
    spent = 0  # characters of tool output added to the conversation so far

    for _round in range(MAX_ROUNDS):
        try:
            reply = ollama.chat_tools(model, messages, offered)
        except ToolsUnsupportedError:
            yield {"type": "unsupported"}
            return
        except OllamaError:
            yield {"type": "answer", "delta": librarian.OFFLINE_MESSAGE}
            return

        if reply.get("thinking"):
            yield {"type": "thinking", "delta": reply["thinking"]}
        # Report what this round cost. Agent turns used to emit nothing here,
        # so switching tools on — the default — silently stripped the token
        # counts out of the message metadata line.
        if reply.get("stats"):
            yield {"type": "stats", **reply["stats"]}

        calls = reply.get("tool_calls") or []
        if not calls:
            # No tools wanted → this text IS the final answer. Safety net:
            # if the model claims it saved/created something but no write
            # tool actually ran, it hallucinated — say so instead of
            # letting the user believe a note exists that doesn't (Wave O).
            answer = reply.get("content", "").strip()
            if not did_write and _CLAIM_PATTERN.search(answer):
                answer += (
                    "\n\n⚠️ Heads up: I described that, but it looks like I "
                    "didn't actually save it (my model didn't run the tool). "
                    "Nothing was changed — try again, or paste the text into "
                    "a new note yourself."
                )
            yield {"type": "answer", "delta": answer}
            return

        # Replay the assistant turn (with its calls) so the model keeps
        # its own context, then answer each call.
        messages.append(
            {
                "role": "assistant",
                "content": reply.get("content") or "",
                "tool_calls": reply.get("raw_tool_calls") or [],
            }
        )
        for call in calls:
            name, arguments = call["name"], call.get("arguments") or {}
            spec = tools.TOOLS.get(name)
            if spec is not None and spec.destructive:
                # Park it for the user — never auto-run a destructive tool.
                # The confirm card is the honest signal, so count it as an
                # action (don't fire the "nothing happened" safety net).
                did_write = True
                yield {
                    "type": "confirm",
                    "name": name,
                    "arguments": arguments,
                    "label": tools.confirm_label(name, arguments),
                }
                result = AWAITING_CONFIRMATION
            else:
                result = tools.execute_tool(session, name, arguments)
                if "error" not in result and name in _WRITE_TOOLS:
                    did_write = True
                yield {
                    "type": "tool",
                    "label": result.get("label") or name,
                    "ok": "error" not in result,
                    "error": result.get("error"),
                }
            payload = json.dumps(result)
            if spent + len(payload) > TOOL_RESULT_BUDGET_CHARS:
                # Over budget. Hand back the notice instead of the result and
                # withdraw the tools, so the next round has to be an answer.
                # Dropping the result rather than truncating it is deliberate:
                # half a JSON object is worse than none — the model reads it
                # as data and answers from a note that got cut mid-sentence.
                payload = json.dumps(BUDGET_EXHAUSTED)
                offered = []
            spent += len(payload)
            messages.append(
                {"role": "tool", "tool_name": name, "content": payload}
            )

    yield {
        "type": "answer",
        "delta": (
            "I stopped after using several tools in a row — here's where "
            "things stand. Ask me to continue if there's more to do."
        ),
    }
