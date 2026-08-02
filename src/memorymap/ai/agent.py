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
import logging
import re
from collections.abc import Iterator

from sqlalchemy.orm import Session

from memorymap.ai import context, librarian, tools
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
#
# **A ceiling now, not the budget.** As the only rule it was the single worst
# offender in the overflow this app was reported to hit: 24,000 characters is
# ~6,000 tokens, half again more than a 4,096-token window holds *on its own*,
# before the system prompt, the tools, the notes or the question. The real
# allowance is `context.plan(...).tool_result_chars`, a share of the window
# actually available; this caps that share from above, because a 128k model
# would otherwise be handed tens of thousands of tokens of tool output and pay
# to re-read all of it on every later round.
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

# The system prompt is resent in full on every round of every turn, alongside
# the tool schemas — see PROMPT_BUDGET_CHARS below for why that matters more
# than it looks. Everything here earned its place by fixing an observed
# failure, so it is not padding; but anything that is *also* said by a tool
# schema or by a tool result is padding, and has been cut.
TOOLS_GUIDE = (
    "You can use tools to act on the notebook — create, edit, tag, pin, "
    "link, or delete notes, and manage reminders. Only make changes the "
    "user actually asked for; when they just ask a question, answer it "
    "without tools. "
    "The notes quoted below are only what search found for this question — "
    "they are NOT the whole notebook. To see more: count_notes to answer "
    "'how many', list_categories / list_tags to see what exists, list_notes "
    "to walk through notes, get_note to read one in full. Never state a "
    "total from a page of results — count_notes is the only thing that knows "
    "the real number. "
    "Private notes are not available to you at all; if one is asked about, "
    "say you can't see private notes. "
    "You can also reach the user's long-form documents (list_documents / "
    "get_document — never searched automatically, so go and look when a "
    "question is about something they wrote up), their earlier conversations "
    "with you (search_chat_history, for when they refer to something 'we "
    "talked about' that isn't in this thread — say when you're relying on "
    "it), and their saved skills (list_skills, save_skill). "
    # Kept, not trimmed: the schema says due_at is an ISO date-time, but not
    # that it must be computed from the clock given below. Without that, a
    # model resolves "in 10 minutes" against whatever it imagines the time is,
    # which is how a reminder set for five minutes' time read as ten hours
    # overdue the moment it was saved.
    "For \"remind me… in 10 minutes / tomorrow at 9 / tonight\", call "
    "set_reminder with due_at computed from the current time given below, as "
    "an ISO 8601 datetime. "
    "After acting, tell the user briefly what you did. NEVER claim you "
    "created, added, saved, edited, deleted, or tagged a note unless you "
    "actually called the tool to do it — describing a note in text does "
    "NOT save it. To save a note you MUST call create_note. "
    # Asked for directly: "I need agents to use tools more and better if they
    # are required." The loop already allows several rounds; nothing told the
    # model that using them was expected rather than a failure to answer
    # promptly, so it tended to answer from the first page of search results.
    "Taking several turns is normal and expected: look something up, read "
    "what you found, look up anything still missing, then answer. Do not "
    "rush to an answer while something you were asked about is still "
    "unchecked. "
    # It under-used read_url badly: a result snippet is a sentence, and the
    # model treated it as the page.
    "A web search result is a title and one clipped sentence — enough to "
    "choose a page, never enough to answer from. Call read_url on a result "
    "that matters before relying on it, and name the sites you actually read. "
    # It re-narrated the step timeline the user was already watching.
    "The user can already see which tools you ran, in order. Do not narrate "
    "your process back to them ('let me search…', 'I will now check…') — just "
    "do it, then give the answer. "
    "If a tool fails, its result carries a 'what_to_do' field. Follow it. "
    "Never repeat a call that has just failed in exactly the same way."
)

# What the model is handed before a single word of the question, the notes or
# the history — the system prompt plus every tool schema — resent on each of
# up to MAX_ROUNDS rounds.
#
# This is the number that decides whether the agent is usable on the 3B-class
# models people actually run here (granite4.1:3b, llama3.2:3b, qwen3.5:2b).
# Ollama defaults to a 4096-token window unless a model says otherwise, so at
# ~4 chars per token this overhead alone can be most of it, and everything
# past the limit is silently dropped from the *front* — which is the system
# prompt, so a model that overflows stops knowing it has tools at all.
#
# It is asserted rather than noted because it drifts upward invisibly: every
# tool added and every sentence added to the guide costs the same budget, and
# nothing else in the codebase would notice. When this needs raising, raise it
# deliberately and say why here.
#
# 13,000 → 13,800, for the four category tools (§14). The guard did its job:
# adding them took the all-tools overhead straight past the old figure, and
# the first version of those schemas — with a per-parameter description on
# each, matching the older tools — went past the *window* too. They were
# rewritten terse (no "old: the current name" when the field is called `old`)
# and now cost 1,112 characters between them.
#
# **This is now a backstop, not the mechanism.** It was briefly the binding
# constraint on §14's tool list — "room for about one more tool, then none" —
# which was the wrong shape of answer, because the ceiling it described was
# never a fact about the app. 4096 is what Ollama falls back to when a model
# declares nothing; most current models declare 8k, 32k or far more.
#
# `tools.within_budget` now fits the schemas to the window the model actually
# reports (`ollama_client.usable_context`), dropping the least relevant tools
# when they do not fit and logging what it held back. So a 32k model gets the
# whole registry, a genuine 3B at 4096 gets a prioritised subset, and adding a
# tool is no longer a question of whether it fits inside a constant.
#
# What this number still does is catch the *prose* growing — the system prompt
# and TOOLS_GUIDE are sent whatever the window, and no per-turn trimming
# applies to them. If it trips, look at what was added to the guide before
# reaching for the number.
#
# 13,800 → 14,400, for `ask_user` (§33). The guard did its job again, and the
# useful part was *how* it tripped: the registry was sitting at 13,743 of
# 13,800, so it would have fired on whoever added the next tool, whatever it
# was. The first version of the schema was 784 characters of prose explaining
# when to ask; it was cut to 507 by keeping only the two rules that stop it
# being misused (stop after asking, don't ask what you could look up) and
# deleting the rest. `ask_user` is in CORE_TOOLS, so unlike most tools it is
# paid for on every single turn — which is exactly why it had to be terse.
PROMPT_BUDGET_CHARS = 14_400

# What to do about a failed tool call.
#
# A failure used to be handed to the model as a bare `{"error": "..."}` and
# nothing else. Small models do one of two things with that: give up and
# apologise, or call the identical thing again — and again, until MAX_ROUNDS
# runs out and the user gets "I stopped after using several tools in a row"
# having been told nothing. Neither is a reasonable response to, say, a
# mistyped note id.
#
# The error now travels with a recovery instruction. The wording is
# deliberately concrete about the *next call to make*, because "try something
# else" is exactly the advice a small model cannot act on.
_RECOVERY_HINTS = {
    "unknown_tool": (
        "That tool does not exist. Do not call it again. Use one of the tools "
        "you were given, or answer without tools."
    ),
    "disabled": (
        "The user has turned this tool off in Settings. Do not call it again. "
        "Tell them it is off and what turning it on would let you do."
    ),
    "not_found": (
        "Nothing exists with that id. Do not guess another id. Call "
        "search_notes (or list_notes) to find the real one, then retry with "
        "the id that search returned."
    ),
    "arguments": (
        "The arguments were wrong. Read the tool's schema again and retry "
        "once with corrected arguments. If you cannot work out what it wants, "
        "stop calling it and tell the user what you were trying to do."
    ),
    "web_off": (
        "Web access is off in Settings. Do not retry. Answer from the "
        "notebook, and say that a web lookup would need turning on."
    ),
    "generic": (
        "That call failed. Do not repeat it unchanged. Either retry once with "
        "different arguments, try a different tool, or tell the user plainly "
        "what failed and answer with what you already have."
    ),
    "not_in_skill": (
        "This skill does not include that tool. Use only the tools listed for "
        "the run, or finish and tell the user what the skill could not do."
    ),
}


def _recovery_hint(name: str, message: str) -> str:
    """Pick the advice that fits this failure."""
    lowered = message.lower()
    if "not part of this skill" in lowered:
        return _RECOVERY_HINTS["not_in_skill"]
    if lowered.startswith("unknown tool"):
        return _RECOVERY_HINTS["unknown_tool"]
    if "turned off in settings" in lowered:
        return _RECOVERY_HINTS["disabled"]
    if "web search is disabled" in lowered:
        return _RECOVERY_HINTS["web_off"]
    if "not found" in lowered or "no note" in lowered or "no such" in lowered:
        return _RECOVERY_HINTS["not_found"]
    # ValueError/KeyError/TypeError from a handler are argument problems, and
    # execute_tool prefixes those with the tool's own name.
    if lowered.startswith(f"{name}:"):
        return _RECOVERY_HINTS["arguments"]
    return _RECOVERY_HINTS["generic"]


REPEATED_CALL_NOTE = (
    "You have already made this exact call and it failed the same way. "
    "Calling it a third time will not help. Change the arguments, use a "
    "different tool, or stop and tell the user what you could not do."
)


# Write tools whose absence makes a "I saved it" claim a lie (safety net).
# Defined in the registry, so the settings screen and the skill list can mark
# "this one changes things" from the same list rather than a second copy.
_WRITE_TOOLS = tools.WRITE_TOOLS

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
    budget: "context.ContextBudget | None" = None,
    mode: str | None = None,
) -> list[dict]:
    """Like librarian.build_messages, but the system prompt allows
    acting, and each note shows its id so tools can target it.

    `budget` trims the notes and the history to what the model can actually
    hold. Optional so every existing caller keeps working untrimmed — the
    agent loop passes one, having measured the window first.
    """
    style_hint = librarian.STYLE_HINTS.get(style, librarian.STYLE_HINTS["friendly"])
    profile_hint = f" About the user: {profile.strip()}" if profile.strip() else ""
    persona = (persona_prompt or librarian.DEFAULT_PERSONA).strip()
    # The model needs "now" to turn "in 10 minutes" into a real time.
    from memorymap.core import deps
    from memorymap.core.config import user_now

    # The user's wall clock. This line is what "remind me in 10 minutes"
    # is computed from, so resolving it against the server's zone instead
    # puts every relative time out by the offset between them.
    local = user_now(deps.get_config())
    # To the minute, not the microsecond. This string sits near the top of a
    # prompt that is resent on every round of every turn, and Ollama's prefix
    # cache keeps only the tokens *before* the first difference — so a clock
    # that ticked every microsecond invalidated the history and the notes
    # below it every single time, and each round re-read the whole prompt from
    # scratch. A tool loop runs its rounds seconds apart, so a minute-precision
    # clock is identical across all of them, and no answer this app gives
    # needs the seconds: "remind me in 10 minutes" is not resolved to one.
    now_hint = (
        f" The current date and time is {local.replace(second=0, microsecond=0).isoformat()}"
        f" ({local.tzname() or 'local time'})."
    )
    messages = [
        {
            "role": "system",
            "content": f"{persona} {AGENT_GROUNDING} {TOOLS_GUIDE}{now_hint} "
            f"{style_hint}{profile_hint}{librarian.length_hint(mode)}",
        }
    ]
    past = librarian.history_messages(history)
    if budget is not None:
        past = context.fit_history(past, budget.history_chars)
    messages.extend(past)

    dropped_notes = 0
    if budget is not None:
        notes, dropped_notes = context.fit_notes(
            notes, budget.notes_chars, librarian.note_for_prompt
        )

    numbered = "\n".join(
        f"{i}. (note id {note.get('id', '?')}) [{note['category']}] "
        f"{librarian.note_for_prompt(note)}"
        for i, note in enumerate(notes, start=1)
    )
    body = f"My notes:\n{numbered}\n\n" if notes else "My notebook looks empty.\n\n"
    if dropped_notes:
        # Said rather than silently done. A model that knows its notes were
        # cut short can search for the rest; one that doesn't will answer as
        # though it saw the whole notebook, which is the confident-and-wrong
        # failure this app exists to avoid.
        body = (
            f"{body[:-2]}\n({dropped_notes} more matching note"
            f"{'' if dropped_notes == 1 else 's'} did not fit — use search_notes "
            f"or get_note if you need them.)\n\n"
        )
    messages.append({"role": "user", "content": f"{body}My request: {question}"})
    return messages


# Handed back when an `ask_user` call is malformed, so the model can recover
# in the same turn instead of the question silently failing.
_ASK_RECOVERY = (
    "Fix the question and call ask_user again with 2-6 short options — or, if "
    "you can work it out yourself, just answer without asking."
)

# What the model is told when a destructive call is parked for approval.
AWAITING_CONFIRMATION = {
    "status": "awaiting_user_confirmation",
    "note": (
        "The app is showing the user a confirm button for this action. "
        "It has NOT run yet — tell the user it's waiting for their approval."
    ),
}


def _focus(question: str) -> list[str] | None:
    """Which tools this turn is offered, unless the user asked for all of them.

    Settings → Tools has the switch, because the honest failure mode of a
    keyword rule is a request phrased in words it doesn't know, and the fix
    for that has to be reachable without editing code.
    """
    from memorymap.core import deps

    if str(deps.get_config().get_preference("tool_focus", "auto")) == "all":
        return None
    return tools.focus_for(question)


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
    allowed_tools: list[str] | None = None,
    max_rounds: int = MAX_ROUNDS,
    exhausted_note: str | None = None,
    mode: str | None = None,
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
    # Size the whole turn against the window before building any of it.
    #
    # Every part used to carry its own constant, each reasonable alone and
    # never added up: the worst case came to ~11,300 tokens against a 4,096
    # window, and the tool-result cap alone exceeded that window by half.
    # Overflow is dropped from the FRONT, so the failure is not an error — it
    # is the model quietly losing its system prompt and answering from nothing.
    report = getattr(ollama, "usable_context", None)
    window = report(model_manager.chat_model()) if callable(report) else None
    system_chars = len(
        f"{(persona_prompt or librarian.DEFAULT_PERSONA).strip()} "
        f"{AGENT_GROUNDING} {TOOLS_GUIDE}{librarian.length_hint(mode)}"
    )
    budget = context.plan(
        window or OllamaClient.DEFAULT_CONTEXT_TOKENS, system_chars
    )
    logging.getLogger("memorymap.agent").info(budget.as_log_line())

    messages = build_agent_messages(
        question,
        notes,
        style=style,
        profile=profile,
        history=history,
        persona_prompt=persona_prompt,
        budget=budget,
        mode=mode,
    )
    # A skill's declared tools are the only ones offered for its run: fewer
    # schemas on the wire (roadmap §11a) and a narrower thing to go wrong.
    # An ordinary turn declares nothing, so the question is read for what it
    # plausibly needs — see tools.focus_for. Note the asymmetry: the skill's
    # list is also *enforced* below, while the focus is only an economy. A
    # tool left out because a cue didn't fire must still run if the model
    # somehow calls it.
    offered = tools.ollama_tools(
        allowed_tools if allowed_tools is not None else _focus(question)
    )
    # Then fit what is left to the window the model actually has, rather than
    # to a constant. See tools.within_budget: 4096 is Ollama's fallback, not a
    # fact, and a model declaring 32k was being rationed as if it were a 3B.
    # A skill's declared list is exempt — it asked for exactly those tools, and
    # silently dropping one would break the run rather than trim it.
    if allowed_tools is None:
        offered, dropped = tools.within_budget(offered, budget.tool_schema_chars)
        if dropped:
            # Visible in Settings → Logs, because "the AI didn't use the tool I
            # expected" is otherwise indistinguishable from the model choosing
            # not to.
            logging.getLogger("memorymap.agent").info(
                "tool budget: %d-token window fits %d tools; held back %s",
                budget.window_tokens,
                len(offered),
                ", ".join(dropped[:8]) + ("…" if len(dropped) > 8 else ""),
            )
    # Roadmap §11a's prescribed first step: measure before cutting. One line
    # per turn saying what the prompt is made of, so "which half dominates a
    # real chat — the notes or the history?" is answered from the log rather
    # than argued about. Chars, not tokens: the ratio is what matters, and
    # the true token counts already arrive in each round's stats event.
    logging.getLogger("memorymap.agent").info(
        "prompt composition: system=%d history=%d notes+question=%d "
        "tool_schemas=%d chars (%d tools offered)",
        len(messages[0]["content"]),
        sum(len(m["content"]) for m in messages[1:-1]),
        len(messages[-1]["content"]),
        len(json.dumps(offered)),
        len(offered),
    )
    permitted = set(allowed_tools) if allowed_tools else None
    model = model_manager.chat_model()
    did_write = False  # did any real write tool run this turn?
    spent = 0  # characters of tool output added to the conversation so far
    # (tool, arguments) pairs that have already failed, so a model looping on
    # the same broken call can be told so rather than burning every round.
    failed_calls: set[tuple[str, str]] = set()

    for round_number in range(max(1, max_rounds)):
        # Streamed: the model's prose reaches the user as it's written. The
        # non-streamed call this used to make is why an agent answer landed in
        # one lump after a visible pause (user-reported) — every other chat
        # path streamed, and the default path (tools on) didn't.
        reply: dict = {}
        streamed_any = False
        try:
            for piece in ollama.chat_tools_stream(model, messages, offered, mode=mode):
                if "thinking_delta" in piece:
                    yield {"type": "thinking", "delta": piece["thinking_delta"]}
                elif "content_delta" in piece:
                    streamed_any = True
                    yield {"type": "answer", "delta": piece["content_delta"]}
                elif "final" in piece:
                    reply = piece["final"]
        except ToolsUnsupportedError:
            yield {"type": "unsupported"}
            return
        except OllamaError:
            # Mid-answer death: say so, but don't wipe what already streamed.
            prefix = "\n\n" if streamed_any else ""
            yield {"type": "answer", "delta": f"{prefix}{librarian.OFFLINE_MESSAGE}"}
            return

        # Report what this round cost. Agent turns used to emit nothing here,
        # so switching tools on — the default — silently stripped the token
        # counts out of the message metadata line.
        if reply.get("stats"):
            yield {"type": "stats", **reply["stats"], "round": round_number + 1}

        calls = reply.get("tool_calls") or []
        if not calls:
            # No tools wanted → this text IS the final answer. It has usually
            # already streamed; send it only if the tool-call gate held it back.
            answer = reply.get("content", "").strip()
            if not reply.get("streamed") and answer:
                yield {"type": "answer", "delta": answer}
            # Safety net: if the model claims it saved/created something but no
            # write tool actually ran, it hallucinated — say so instead of
            # letting the user believe a note exists that doesn't (Wave O).
            if not did_write and _CLAIM_PATTERN.search(answer):
                yield {
                    "type": "answer",
                    "delta": (
                        "\n\n⚠️ Heads up: I described that, but it looks like I "
                        "didn't actually save it (my model didn't run the tool). "
                        "Nothing was changed — try again, or paste the text into "
                        "a new note yourself."
                    ),
                }
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
            if permitted is not None and name not in permitted:
                # The allowlist is a safety property, not only a prompt: a
                # model that calls a tool it was never offered does not get to
                # run it just because the registry has one by that name.
                result = {"error": f"{name} is not part of this skill's tools"}
                signature = (name, json.dumps(arguments, sort_keys=True))
                result["what_to_do"] = (
                    REPEATED_CALL_NOTE
                    if signature in failed_calls
                    else _RECOVERY_HINTS["not_in_skill"]
                )
                failed_calls.add(signature)
                yield {
                    "type": "tool",
                    "label": f"⚠️ {name} isn't part of this skill",
                    "ok": False,
                    "error": result["error"],
                }
            elif spec is not None and spec.ends_turn:
                # `ask_user`. The turn stops here, and that is the feature
                # rather than a limitation: the model asked because it does not
                # know what to do next, so letting it carry on would mean
                # carrying on with the guess the question exists to avoid.
                #
                # No state is parked on the server. The user's choice is sent
                # as their next message, which means the answer arrives through
                # the ordinary history the model already reads — nothing to
                # expire, nothing to lose on a reload, and the exchange is
                # visible in the saved conversation like any other.
                try:
                    question, options = tools.validate_ask(arguments)
                except tools.ToolError as exc:
                    # A malformed question is a recoverable mistake, not a dead
                    # turn: hand the model the reason and let it try again or
                    # answer directly.
                    signature = (name, json.dumps(arguments, sort_keys=True))
                    failed_calls.add(signature)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_name": name,
                            "content": json.dumps(
                                {"error": str(exc), "what_to_do": _ASK_RECOVERY}
                            ),
                        }
                    )
                    yield {
                        "type": "tool",
                        "label": "⚠️ couldn't ask that question",
                        "ok": False,
                        "error": str(exc),
                    }
                    continue
                yield {"type": "ask", "question": question, "options": options}
                return
            elif spec is not None and spec.destructive:
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
                # What changed, and the call that would put it back. Popped
                # rather than read: `undo` is for the user, and every field
                # left in the result is resent to the model on every later
                # round of the turn.
                undo = result.pop("undo", None)
                change = None
                if "error" not in result and name in _WRITE_TOOLS:
                    did_write = True
                    change = {
                        "tool": name,
                        "label": result.get("label") or name,
                        "note_id": result.get("id"),
                        "undo": undo,
                    }
                if "error" in result:
                    # Hand back advice with the error, not just the error.
                    signature = (name, json.dumps(arguments, sort_keys=True))
                    repeated = signature in failed_calls
                    failed_calls.add(signature)
                    result = {
                        **result,
                        "what_to_do": (
                            REPEATED_CALL_NOTE
                            if repeated
                            else _recovery_hint(name, str(result["error"]))
                        ),
                    }
                event = {
                    "type": "tool",
                    "label": result.get("label") or name,
                    "ok": "error" not in result,
                    "error": result.get("error"),
                }
                if change:
                    event["change"] = change
                yield event
            payload = json.dumps(result)
            # The window's share, but never more than the absolute ceiling —
            # a 128k model would otherwise be allowed tens of thousands of
            # tokens of tool output, which is prefill time on every subsequent
            # round for material the model has usually finished with.
            result_cap = min(budget.tool_result_chars, TOOL_RESULT_BUDGET_CHARS)
            if spent + len(payload) > result_cap:
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
        "delta": exhausted_note
        or (
            "I stopped after using several tools in a row — here's where "
            "things stand. Ask me to continue if there's more to do."
        ),
    }
