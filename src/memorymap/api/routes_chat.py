"""Ask a question, get back BOTH a conversational answer and the raw
matching entries — the two-result design from the original idea doc.

Two flavours:
- POST /chat        — one blocking JSON response (simple, used by tests/API)
- POST /chat/stream — NDJSON: metadata + raw results first, then the
  model's thinking and answer as live token deltas (what the UI uses)

Plain `def` so the blocking LLM call runs in FastAPI's threadpool.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Iterator
from itertools import chain

import threading
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import agent, intent, librarian, presets, skill_runner, skills, tools
from memorymap.ai.ollama_client import OllamaError
from memorymap.api.schemas import EntryOut
from memorymap.core import deps
from memorymap.core.database import AuditLog, Category, Entry
from memorymap.core.deps import get_session
from memorymap.core.logbuffer import safe_value
from memorymap.entry import manager
from memorymap.entry.manager import UNCATEGORISED
from memorymap.search import search_manager
from sqlalchemy import func

from memorymap.api.routes_auth import _get_user, _token_valid
from fastapi import status

router = APIRouter(prefix="/chat", tags=["chat"])
ws_router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/recent", response_model=list[str])
def recent_questions(session: Session = Depends(get_session)) -> list[str]:
    """The last 5 distinct questions, newest first (Phase 5 quick access).
    Read straight from the audit log — no extra bookkeeping."""
    rows = session.scalars(
        select(AuditLog)
        .where(AuditLog.action == "queried", AuditLog.entity_type == "chat")
        .order_by(AuditLog.id.desc())
        .limit(50)
    )
    questions: list[str] = []
    for row in rows:
        if row.detail and row.detail not in questions:
            questions.append(row.detail)
        if len(questions) == 5:
            break
    return questions


# Shown when the chat is empty, to teach the feature (Round 1).
STARTER_SUGGESTIONS = [
    "What have I saved so far?",
    "Summarise my notes.",
    "What are my most common topics?",
]


@router.get("/suggestions", response_model=list[str])
def suggestions(session: Session = Depends(get_session)) -> list[str]:
    """Recommended questions: content-aware ones built from the user's own
    categories, falling back to generic starters for an empty notebook."""
    rows = session.execute(
        select(Category.name, func.count(Entry.id))
        .join(Entry, Entry.category_id == Category.id)
        .where(Entry.is_deleted == False)  # noqa: E712
        .group_by(Category.name)
        .order_by(func.count(Entry.id).desc())
    ).all()
    categories = [name for name, _count in rows if name != UNCATEGORISED]

    if not categories:
        return STARTER_SUGGESTIONS

    picks: list[str] = []
    for name in categories[:2]:
        picks.append(f"What have I saved about {name.lower()}?")
    picks.append(f"Summarise my {categories[0].lower()}.")
    picks.append("What have I saved recently?")
    # De-dupe while preserving order, cap at 5.
    seen: set[str] = set()
    return [p for p in picks if not (p in seen or seen.add(p))][:5]


class ChatTurn(BaseModel):
    question: str
    answer: str


class PlanRun(BaseModel):
    """A plan the model made for one request, sent back to be worked through.

    Bounded here as well as in `tools.validate_make_plan`, because this arrives
    over HTTP: the client is echoing back what the server just produced, but
    nothing makes that true of a hand-made request, and the run it starts
    writes to the notebook.
    """

    goal: str = Field(min_length=1, max_length=skills.MAX_GOAL)
    steps: list[str] = Field(min_length=1, max_length=skills.MAX_STEPS)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    # Prior turns for follow-up context (Round 1); the server clips this.
    history: list[ChatTurn] = Field(default_factory=list)
    # Persona name (Wave C); None → the active persona preference.
    persona: str | None = None
    # Agent mode (Wave G): may the model call tools to change things?
    # None → the saved "tools_enabled" preference (default on).
    use_tools: bool | None = None
    # How much effort this turn is worth (§11): "quick", "normal" or
    # "detailed". None → the saved "response_mode" preference. Carries the
    # reply cap, the temperature, the thinking toggle and a length hint, so
    # one picker moves all four together rather than four settings that have
    # to be kept consistent by hand.
    mode: str | None = None
    # Notes the user attached by hand. These are always given to the model,
    # ahead of anything retrieval finds — "this note, specifically" is a
    # stronger signal than any similarity score.
    note_ids: list[int] = Field(default_factory=list, max_length=20)
    # Running a saved skill (§21). The name of one — built-in or the user's
    # own — plus values for whatever inputs it declares. The server builds the
    # instruction, so what a skill *is* lives in one place rather than being
    # assembled in `app.js` and hoped for here.
    skill: str | None = Field(default=None, max_length=skills.MAX_NAME)
    skill_inputs: dict[str, str] | None = None
    # Resuming a run that stopped part-way (reported: *"it cuts out half way
    # through and has to restart"*). Steps before this index are marked as done
    # in an earlier run and are not repeated — which matters because most of
    # them write to the notebook, so "restart" meant tagging and linking the
    # same notes a second time.
    skill_from_step: int = Field(default=0, ge=0, le=skills.MAX_STEPS)
    # A plan the model drew for this request and handed back to be worked
    # through (§35K). Same shape as a skill run and the same runner — the
    # difference is only that nobody saved it. Sent by the client rather than
    # parked on the server, exactly as `ask_user` and `run_skill` are: nothing
    # to expire, nothing lost on a reload, and the plan is visible in the saved
    # conversation like any other message.
    plan: PlanRun | None = None
    # Notes-only: this turn is an interrogation of the notebook and nothing
    # else (§35A). Set by the Notes tab's Ask box, never by the Chat tab.
    #
    # Reported directly: *"the ask tab should be for reviewing, revisiting, and
    # searching up/asking about your notes, the chatbot can be for the chat
    # tab"*. Saying "hey" there was answered like a chatbot, because both
    # surfaces share this endpoint and `intent.classify` correctly routes
    # small talk away from retrieval.
    #
    # The fix is deliberately NOT a better classifier. The classifier is right;
    # what was missing is that one of the two callers does not *want* the
    # conversational path to exist. A flag on the request cannot misfire, costs
    # no model round, and leaves the Chat tab exactly as it was.
    notes_only: bool = False


def _resolve_mode(requested: str | None) -> str:
    """The response preset for this turn (§11).

    A request may name one; otherwise the saved preference decides, and an
    unrecognised name in either place falls through to `normal` rather than
    raising — `presets.resolve` does that last part, so a hand-edited
    preferences file costs the setting and not the chat.
    """
    if requested:
        return requested
    return str(
        deps.get_config().get_preference("response_mode", presets.DEFAULT_MODE)
        or presets.DEFAULT_MODE
    )


def _resolve_persona(name: str | None) -> str | None:
    """Persona name → its system prompt (shared with greetings and titles)."""
    return librarian.resolve_persona_prompt(name, deps.get_config())


def _resolve_skill(body: ChatRequest) -> dict | None:
    """Turn "run this skill" into the request the model actually receives.

    404 for a skill that isn't there and 422 for one missing a required input:
    a skill that quietly ran with a blank `{{topic}}` would search the whole
    notebook for nothing and read as the model ignoring the user.
    """
    if not body.skill:
        return None
    found = skills.find(deps.get_config(), body.skill, set(tools.TOOLS))
    if found is None:
        raise HTTPException(status_code=404, detail=f"No skill called “{body.skill}”")
    missing = skills.missing_inputs(found, body.skill_inputs or {})
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"“{found['name']}” needs {', '.join(missing)} before it can run",
        )
    return {
        "skill": found,
        "question": skills.run_instruction(found, body.skill_inputs or {}),
        "tools": found["tools"] or None,
        "acts": skills.is_action(found),
    }


def _resolve_plan(body: ChatRequest) -> dict | None:
    """Turn "work through this plan" into a run, in the same shape as a skill.

    Re-validated through `tools.validate_make_plan` rather than trusted, so a
    plan that arrives with one step, twenty steps or its own numbering is
    refused (or tidied) by the same rules that produced it. 422 rather than a
    silent trim: a plan that quietly loses its last two steps is exactly the
    "did the first part and stopped" failure this whole mechanism exists to
    prevent, arriving from the other end.
    """
    if body.plan is None:
        return None
    try:
        checked = tools.validate_make_plan(
            {"goal": body.plan.goal, "steps": body.plan.steps}
        )
    except tools.ToolError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    plan = skills.ad_hoc_plan(checked["goal"], checked["steps"])
    return {
        "skill": plan,
        "question": skills.run_instruction(plan, {}),
        # No allowlist: see `skills.ad_hoc_plan`. Each step is focused on its
        # own text instead of on a guess made from one sentence.
        "tools": None,
        "acts": True,
    }


class ChatResponse(BaseModel):
    ai_response: str
    # A thinking model's reasoning, when it produced any.
    ai_thinking: str | None = None
    raw_results: list[EntryOut]
    # 'hybrid', 'semantic', 'keyword', 'dated' or 'recent' — how they were found.
    search_mode: str
    # Which of raw_results are here by connection rather than by matching.
    connected_ids: list[int] = []
    # Which chat model wrote the answer, or None when it didn't answer.
    answered_by: str | None = None
    # Whether Ollama is reachable — lets the UI distinguish "offline"
    # from "nothing to answer" honestly.
    ollama_running: bool = False
    # The time phrase the search narrowed on ("last week", "recently"), or "".
    # An empty dated result has two facts to report and only saying the first
    # — "no matching records" — is what makes a working narrow search look
    # like a broken one. The client needs the phrase to say the second.
    when_phrase: str = ""


def _attached_notes(session: Session, note_ids: list[int]) -> list[dict]:
    """The notes the user picked, in the order they picked them.

    Binned notes are skipped: attaching one would quietly resurrect content the
    user has already thrown away.
    """
    found = []
    for note_id in dict.fromkeys(note_ids):  # de-duplicate, keep order
        entry = session.get(Entry, note_id)
        if entry is None or entry.is_deleted:
            continue
        found.append(entry)
    return found


def _prepare(session: Session, question: str, note_ids: list[int] | None = None) -> dict:
    """The shared first half of both chat endpoints: retrieve entries,
    bump their usage counters, log the question, gather AI settings.

    A message that isn't about the notebook skips retrieval entirely — there's
    nothing to search for, and searching anyway is what made "hey" come back
    with a list of notes.
    """
    from memorymap.api.routes_entries import _to_out  # avoids a route-module cycle

    detected = intent.classify(question)
    # Attaching a note is itself a statement that this is about the notebook,
    # so it overrides the classifier — "what do you think?" with three notes
    # clipped to it is a question about those notes.
    attached = _attached_notes(session, note_ids or [])
    if attached:
        detected = intent.NOTES
    connected_ids: set[int] = set()
    when_phrase = ""
    if intent.needs_retrieval(detected):
        found = search_manager.retrieve_detailed(
            session, question, deps.get_embeddings(), limit=5
        )
        entries, mode = found.entries, found.mode
        # Which of these are here because they are *connected* to a match
        # rather than because they matched. The user asked about one thing and
        # is being shown notes about another; without saying why, the panel
        # looks like the search misfired — and the model, told nothing, would
        # report them as results.
        connected_ids = found.connected_ids
        when_phrase = found.when_phrase
    else:
        entries, mode = [], "none"

    # Attached notes come first and are never dropped by the retrieval limit.
    # Anything retrieval also found is de-duplicated against them.
    attached_ids = {entry.id for entry in attached}
    entries = attached + [e for e in entries if e.id not in attached_ids]
    if attached:
        mode = "attached" if mode == "none" else f"attached + {mode}"

    def as_note(entry) -> dict:
        return {
            # id lets agent-mode tool calls target these notes (Wave G);
            # the plain librarian prompt simply ignores it.
            "id": entry.id,
            "content": entry.content,
            "category": manager.category_name_for(session, entry),
            # Marked so the prompt can say which notes the user chose.
            "attached": entry.id in attached_ids,
            # …and which arrived by the graph rather than by the search. The
            # prompt renders this as a caveat, so an answer can say "you linked
            # this to the note about X" instead of implying it was a hit.
            "connected": entry.id in connected_ids,
        }

    notes = [as_note(entry) for entry in entries]
    config = deps.get_config()
    profile = (
        config.get_preference("user_profile", "")
        if config.get_preference("profile_enabled", False)
        else ""
    )

    # Every entry this question surfaced counts as "used" (Phase 5).
    for entry in entries:
        entry.access_count += 1
    manager.log_action(session, "queried", "chat", detail=question)
    session.commit()
    logging.getLogger("memorymap.chat").info(
        "chat: %d note(s) via %s search for %r",
        len(entries),
        mode,
        # The question is the user's own text, and it reaches the terminal as
        # well as the in-app viewer — a bare %r of it can forge a log line.
        safe_value(question, 80),
    )

    return {
        "notes": notes,
        "intent": detected,
        "raw_results": [_to_out(session, entry) for entry in entries],
        "search_mode": mode,
        # Ids that came along because they are *connected* to a match, so the
        # results panel can label them rather than presenting a note about
        # something else as though the search had found it. Sent beside the
        # results rather than as a field on EntryOut: it is a fact about this
        # search, not about the note, and every other route that returns an
        # entry would otherwise carry a field that is always false.
        "connected_ids": sorted(connected_ids),
        "when_phrase": when_phrase,
        "style": config.get_preference("communication_style", "friendly"),
        "profile": profile,
    }


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest, session: Session = Depends(get_session)) -> ChatResponse:
    prepared = _prepare(session, body.question, body.note_ids)
    ollama_running = deps.get_ollama().is_running()
    conversational = not intent.needs_retrieval(prepared["intent"])
    answered = (conversational or bool(prepared["notes"])) and ollama_running
    shared = {
        "style": prepared["style"],
        "profile": prepared["profile"],
        "history": [turn.model_dump() for turn in body.history],
        "persona_prompt": _resolve_persona(body.persona),
    }
    mode = _resolve_mode(body.mode)
    if conversational and body.notes_only:
        # Same rule as the streaming route: this box interrogates the
        # notebook and does not chat (§35A).
        ai_response, ai_thinking = librarian.ASK_IS_FOR_NOTES, None
    elif conversational:
        ai_response, ai_thinking = librarian.converse(
            body.question,
            prepared["intent"],
            deps.get_model_manager(),
            deps.get_ollama(),
            mode=mode,
            **shared,
        )
    else:
        ai_response, ai_thinking = librarian.answer(
            body.question,
            prepared["notes"],
            deps.get_model_manager(),
            deps.get_ollama(),
            mode=mode,
            **shared,
        )
    return ChatResponse(
        ai_response=ai_response,
        ai_thinking=ai_thinking,
        raw_results=prepared["raw_results"],
        search_mode=prepared["search_mode"],
        connected_ids=prepared["connected_ids"],
        when_phrase=prepared["when_phrase"],
        answered_by=deps.get_model_manager().chat_model() if answered else None,
        ollama_running=ollama_running,
    )


@ws_router.websocket("/stream")
async def chat_stream(websocket: WebSocket, session: Session = Depends(get_session)):
    """WebSocket stream. JSON events, in order:
    {"type":"status", "stage": "searching"}   (sent immediately)
    {"type":"meta", raw_results, search_mode, answered_by}
    {"type":"thinking", "delta": "..."}   (zero or more)
    {"type":"answer", "delta": "..."}     (one or more)
    {"type":"done"}
    """
    await websocket.accept()
    
    try:
        data = await websocket.receive_json()
        
        # Manually check auth to avoid global dependencies blocking the WS upgrade
        if _get_user(session) is not None:
            token = data.get("token")
            if not _token_valid(token):
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
                
        body = ChatRequest(**data)
    except Exception:
        await websocket.close()
        return
    ollama = deps.get_ollama()
    model_manager = deps.get_model_manager()
    history = [turn.model_dump() for turn in body.history]
    persona_prompt = _resolve_persona(body.persona)
    mode = _resolve_mode(body.mode)
    use_tools = (
        body.use_tools
        if body.use_tools is not None
        else bool(deps.get_config().get_preference("tools_enabled", True))
    )
    # A skill run replaces the question with the skill's own instruction —
    # steps, values and declared tools included — and narrows the toolbox to
    # what it declared. Retrieval runs on that instruction too, so a skill
    # gets the notes its own words find rather than the ones the chip's label
    # happens to match.
    # A plan run goes down exactly the same path as a skill run — the runner
    # cannot tell them apart, which is what gives a plan the ticked steps, the
    # change list and the Undo on each without a second implementation.
    skill = _resolve_skill(body) or _resolve_plan(body)
    question = skill["question"] if skill else body.question
    allowed_tools = skill["tools"] if skill else None
    if skill and skill["acts"]:
        # An action skill without tools is just a paragraph. This is what the
        # frontend used to do by ticking the agent-mode box on the user's
        # behalf, which left the box ticked afterwards.
        use_tools = True

    def plain_events(prepared: dict, ollama_running: bool) -> Iterator[dict]:
        """The pre-Wave-G behaviour: stream a grounded answer, no tools."""
        conversational = not intent.needs_retrieval(prepared["intent"])
        if conversational and body.notes_only:
            # The Notes tab's Ask box has one job (§35A). A greeting is the one
            # input it has nothing to do with, so it says what it is for rather
            # than spending a model round chatting back.
            #
            # Its own event type, not an "answer". Reported after the first
            # version shipped: a paragraph of instructions sitting where the
            # answer goes, beside a results panel reading "No matching
            # records", reads as the app having failed. As a hint the client
            # can render it as what it is — a prompt with questions you can
            # click — and can leave the empty results panel out, since nothing
            # was searched for.
            yield {
                "type": "hint",
                "text": librarian.ASK_IS_FOR_NOTES,
                "examples": librarian.ASK_EXAMPLES,
            }
            return
        if conversational:
            # Small talk: no notes, no grounding, no "I couldn't find any
            # notes matching that" in reply to "hey".
            if not ollama_running:
                offline = (
                    librarian.OFFLINE_ABOUT_APP
                    if prepared["intent"] == "about_app"
                    else librarian.OFFLINE_SMALLTALK
                )
                yield {"type": "answer", "delta": offline}
                return
            messages = librarian.build_conversational_messages(
                question,
                prepared["intent"],
                style=prepared["style"],
                profile=prepared["profile"],
                history=history,
                persona_prompt=persona_prompt,
                mode=mode,
            )
        elif not prepared["notes"]:
            yield {"type": "answer", "delta": librarian.NO_RESULTS_MESSAGE}
            return
        elif not ollama_running:
            yield {"type": "answer", "delta": librarian.OFFLINE_MESSAGE}
            return
        else:
            messages = librarian.build_messages(
                question,
                prepared["notes"],
                style=prepared["style"],
                profile=prepared["profile"],
                history=history,
                persona_prompt=persona_prompt,
                mode=mode,
            )
        try:
            for piece in ollama.chat_stream(model_manager.chat_model(), messages, mode):
                if "thinking_delta" in piece:
                    yield {"type": "thinking", "delta": piece["thinking_delta"]}
                elif "stats" in piece:
                    # Token counts + timings for the message metadata line.
                    yield {"type": "stats", **piece["stats"]}
                else:
                    yield {"type": "answer", "delta": piece["content_delta"]}
        except OllamaError:
            # The model died mid-answer — tell the user, keep the results.
            yield {"type": "answer", "delta": f"\n\n{librarian.OFFLINE_MESSAGE}"}

    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def producer():
        def emit(payload: dict):
            loop.call_soon_threadsafe(queue.put_nowait, payload)

        try:
            # Flush a first byte immediately. The semantic search below can be a
            # slow cold start (loading the embedding model, warming the index);
            # emitting this now means the browser's stream opens right away and
            # its "typing…" indicator keeps animating instead of looking frozen
            # while the whole request blocks (user-reported lag).
            emit({"type": "status", "stage": "searching"})

            # Retrieval happens INSIDE the stream now, not before it — that's the
            # whole latency win. Nothing before this line touches the model.
            prepared = _prepare(session, question, body.note_ids)
            ollama_running = ollama.is_running()
            # In agent mode the model can act even when nothing matched — "save a
            # note about X" must work on an empty notebook.
            will_answer = ollama_running and (
                bool(prepared["notes"])
                or use_tools
                or not intent.needs_retrieval(prepared["intent"])
            )

            emit(
                {
                    "type": "meta",
                    "raw_results": [r.model_dump(mode="json") for r in prepared["raw_results"]],
                    "search_mode": prepared["search_mode"],
                    "connected_ids": prepared["connected_ids"],
                    "when_phrase": prepared["when_phrase"],
                    "answered_by": model_manager.chat_model() if will_answer else None,
                    "ollama_running": ollama_running,
                }
            )

            events: Iterator[dict] = plain_events(prepared, ollama_running)
            # Small talk never goes near the agent: "hey" is not a request to do
            # anything, and handing it a toolbox invites it to invent an errand.
            if ollama_running and use_tools and intent.needs_retrieval(prepared["intent"]):
                shared = {
                    "style": prepared["style"],
                    "profile": prepared["profile"],
                    "history": history,
                    "persona_prompt": persona_prompt,
                }
                if skill:
                    # A skill runs step by step — the runner emits the plan, ticks
                    # each step, and ends with what changed. Its first event has
                    # the same meaning as the agent's, so the fallback below is
                    # unchanged.
                    agent_events = skill_runner.run_skill(
                        session,
                        skill["skill"],
                        body.skill_inputs or {},
                        prepared["notes"],
                        model_manager,
                        ollama,
                        start_at=body.skill_from_step,
                        **shared,
                    )
                else:
                    agent_events = agent.run_agent(
                        session,
                        question,
                        prepared["notes"],
                        model_manager,
                        ollama,
                        mode=mode,
                        allowed_tools=allowed_tools,
                        **shared,
                    )
                first = next(agent_events, None)
                if first is None or first.get("type") == "unsupported":
                    # The active model can't do tool calls — plain Q&A, never
                    # a hard dependency (Wave G gate).
                    pass
                else:
                    events = chain([first], agent_events)
            
            for payload in events:
                emit(payload)
            emit({"type": "done"})
        except Exception as e:
            import traceback
            traceback.print_exc()
            emit({"type": "error", "message": f"Connection lost or model timed out: {str(e)}"})
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None) # sentinel
            session.close()

    thread = threading.Thread(target=producer)
    thread.start()

    async def consumer():
        try:
            while True:
                await websocket.receive_text()
        except Exception:
            pass
            
    consumer_task = asyncio.create_task(consumer())

    try:
        while True:
            payload = await queue.get()
            if payload is None:
                break
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        consumer_task.cancel()
        try:
            await asyncio.sleep(0.1)
            await websocket.close()
        except Exception:
            pass


@router.get("/modes")
def list_modes() -> dict:
    """The response presets, and which one is currently the default (§11).

    Served rather than hard-coded in `app.js` so the picker cannot drift from
    what the server actually does — adding a fourth preset is then a change to
    `ai/presets.py` alone.
    """
    return {
        "modes": [
            {
                "id": preset.id,
                "label": preset.label,
                "description": preset.description,
            }
            for preset in presets.MODES.values()
        ],
        "active": _resolve_mode(None),
    }


@router.get("/tools")
def list_tools() -> list[dict]:
    """The agent-tool catalog for Settings → Tools toggles (Wave O)."""
    return tools.tool_catalog()


# --- compressing a long conversation (§35I) -----------------------------------
#
# Asked for directly: *"there should be a tool as well as a manual command or
# something to be able to compress chat context on longer chats so the AI can
# better continue."*
#
# What happens today without it is worth stating plainly, because it is not
# "the request gets big" — the client sends at most the last four turns and
# `context.fit_history` drops whole pairs from the *oldest* end until the rest
# fits. So a long conversation does not overflow; it silently forgets its own
# beginning, and the model starts re-asking things it was told an hour ago.
#
# A summary is strictly better than a drop: the same few hundred characters
# carry the gist of ten turns instead of the whole of one. And it is the
# **manual** half that shipped first, exactly as §35I argued — a button the
# user presses, whose output they can read before it is used, cannot misfire.
#
# §37I: the tool that lets the agent do it unprompted (`compress_chat` in
# ai/tools.py) shares this endpoint's summarising logic via
# `tools.summarise_turns`, and keeps the same human-review step — the model's
# turn ends and `showCompressReview` renders exactly the panel this endpoint
# already feeds, so a summary the agent asked for is never applied unread any
# more than one this button produced would be.

#: Turns to summarise in one call. Beyond this the summary itself gets long
#: enough to be worth summarising, which is the wrong direction. Re-exported
#: from ai/tools.py, the one place the ceiling is defined, so this route and
#: the agent's own compress_chat tool can't drift to different limits.
MAX_COMPRESS_TURNS = tools.MAX_COMPRESS_TURNS


class CompressBody(BaseModel):
    """The turns to summarise, oldest first."""

    history: list[ChatTurn] = Field(min_length=1, max_length=MAX_COMPRESS_TURNS)


@router.post("/compress")
def compress_history(body: CompressBody) -> dict:
    """A summary of these turns, for sending in place of them.

    Returns the text and nothing else — the client decides whether to use it,
    and keeps the original turns either way. Nothing is stored here, and the
    conversation on screen is not touched: this is a *lossless* operation as
    far as the transcript is concerned, and only the model's view narrows.
    """
    try:
        return tools.summarise_turns([(t.question, t.answer) for t in body.history])
    except OllamaError as exc:
        # Offline, or the call itself failed — either way there is no summary
        # to show, distinct from the model answering with nothing (below).
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except tools.ToolError as exc:
        # An empty reply. Better to say nothing happened than to hand back an
        # empty summary the client would send in place of ten real turns.
        raise HTTPException(status_code=502, detail=str(exc)) from exc


class ToolExecuteBody(BaseModel):
    """A tool call the user approved in the UI (Wave G confirm step)."""

    name: str
    arguments: dict = Field(default_factory=dict)


@router.post("/tools/execute")
def execute_confirmed_tool(
    body: ToolExecuteBody, session: Session = Depends(get_session)
) -> dict:
    """Run one registry tool — how the UI executes a destructive call
    after the user clicks Confirm. Only registry tools can run, and the
    result carries the same human label shown in chat."""
    if body.name not in tools.TOOLS:
        raise HTTPException(status_code=404, detail=f"Unknown tool '{body.name}'")
    result = tools.execute_tool(session, body.name, body.arguments)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
