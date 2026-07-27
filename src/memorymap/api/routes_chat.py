"""Ask a question, get back BOTH a conversational answer and the raw
matching entries — the two-result design from the original idea doc.

Two flavours:
- POST /chat        — one blocking JSON response (simple, used by tests/API)
- POST /chat/stream — NDJSON: metadata + raw results first, then the
  model's thinking and answer as live token deltas (what the UI uses)

Plain `def` so the blocking LLM call runs in FastAPI's threadpool.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from itertools import chain

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import agent, intent, librarian, tools
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

router = APIRouter(prefix="/chat", tags=["chat"])


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


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    # Prior turns for follow-up context (Round 1); the server clips this.
    history: list[ChatTurn] = Field(default_factory=list)
    # Persona name (Wave C); None → the active persona preference.
    persona: str | None = None
    # Agent mode (Wave G): may the model call tools to change things?
    # None → the saved "tools_enabled" preference (default on).
    use_tools: bool | None = None
    # Notes the user attached by hand. These are always given to the model,
    # ahead of anything retrieval finds — "this note, specifically" is a
    # stronger signal than any similarity score.
    note_ids: list[int] = Field(default_factory=list, max_length=20)


def _resolve_persona(name: str | None) -> str | None:
    """Persona name → its system prompt (shared with greetings and titles)."""
    return librarian.resolve_persona_prompt(name, deps.get_config())


class ChatResponse(BaseModel):
    ai_response: str
    # A thinking model's reasoning, when it produced any.
    ai_thinking: str | None = None
    raw_results: list[EntryOut]
    # 'semantic', 'keyword', or 'recent' — how the notes were found.
    search_mode: str
    # Which chat model wrote the answer, or None when it didn't answer.
    answered_by: str | None = None
    # Whether Ollama is reachable — lets the UI distinguish "offline"
    # from "nothing to answer" honestly.
    ollama_running: bool = False


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
    if intent.needs_retrieval(detected):
        entries, mode = search_manager.retrieve(
            session, question, deps.get_embeddings(), limit=5
        )
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
    if conversational:
        ai_response, ai_thinking = librarian.converse(
            body.question,
            prepared["intent"],
            deps.get_model_manager(),
            deps.get_ollama(),
            **shared,
        )
    else:
        ai_response, ai_thinking = librarian.answer(
            body.question,
            prepared["notes"],
            deps.get_model_manager(),
            deps.get_ollama(),
            **shared,
        )
    return ChatResponse(
        ai_response=ai_response,
        ai_thinking=ai_thinking,
        raw_results=prepared["raw_results"],
        search_mode=prepared["search_mode"],
        answered_by=deps.get_model_manager().chat_model() if answered else None,
        ollama_running=ollama_running,
    )


@router.post("/stream")
def chat_stream(body: ChatRequest, session: Session = Depends(get_session)):
    """NDJSON stream. Line types, in order:
    {"type":"status", "stage": "searching"}   (sent immediately, so the
        browser gets a first byte at once instead of waiting on the — often
        cold-start — semantic search; this is what keeps the UI's typing
        indicator alive instead of appearing frozen)
    {"type":"meta", raw_results, search_mode, answered_by}
    {"type":"thinking", "delta": "..."}   (zero or more)
    {"type":"answer", "delta": "..."}     (one or more)
    {"type":"done"}
    """
    ollama = deps.get_ollama()
    model_manager = deps.get_model_manager()
    history = [turn.model_dump() for turn in body.history]
    persona_prompt = _resolve_persona(body.persona)
    use_tools = (
        body.use_tools
        if body.use_tools is not None
        else bool(deps.get_config().get_preference("tools_enabled", True))
    )

    def plain_events(prepared: dict, ollama_running: bool) -> Iterator[dict]:
        """The pre-Wave-G behaviour: stream a grounded answer, no tools."""
        conversational = not intent.needs_retrieval(prepared["intent"])
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
                body.question,
                prepared["intent"],
                style=prepared["style"],
                profile=prepared["profile"],
                history=history,
                persona_prompt=persona_prompt,
            )
        elif not prepared["notes"]:
            yield {"type": "answer", "delta": librarian.NO_RESULTS_MESSAGE}
            return
        elif not ollama_running:
            yield {"type": "answer", "delta": librarian.OFFLINE_MESSAGE}
            return
        else:
            messages = librarian.build_messages(
                body.question,
                prepared["notes"],
                style=prepared["style"],
                profile=prepared["profile"],
                history=history,
                persona_prompt=persona_prompt,
            )
        try:
            for piece in ollama.chat_stream(model_manager.chat_model(), messages):
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

    def lines() -> Iterator[str]:
        def event(payload: dict) -> str:
            return json.dumps(payload) + "\n"

        # Flush a first byte immediately. The semantic search below can be a
        # slow cold start (loading the embedding model, warming the index);
        # emitting this now means the browser's stream opens right away and
        # its "typing…" indicator keeps animating instead of looking frozen
        # while the whole request blocks (user-reported lag).
        yield event({"type": "status", "stage": "searching"})

        # Retrieval happens INSIDE the stream now, not before it — that's the
        # whole latency win. Nothing before this line touches the model.
        prepared = _prepare(session, body.question, body.note_ids)
        ollama_running = ollama.is_running()
        # In agent mode the model can act even when nothing matched — "save a
        # note about X" must work on an empty notebook.
        will_answer = ollama_running and (
            bool(prepared["notes"])
            or use_tools
            or not intent.needs_retrieval(prepared["intent"])
        )

        yield event(
            {
                "type": "meta",
                "raw_results": [r.model_dump(mode="json") for r in prepared["raw_results"]],
                "search_mode": prepared["search_mode"],
                "answered_by": model_manager.chat_model() if will_answer else None,
                "ollama_running": ollama_running,
            }
        )

        events: Iterator[dict] = plain_events(prepared, ollama_running)
        # Small talk never goes near the agent: "hey" is not a request to do
        # anything, and handing it a toolbox invites it to invent an errand.
        if ollama_running and use_tools and intent.needs_retrieval(prepared["intent"]):
            agent_events = agent.run_agent(
                session,
                body.question,
                prepared["notes"],
                model_manager,
                ollama,
                style=prepared["style"],
                profile=prepared["profile"],
                history=history,
                persona_prompt=persona_prompt,
            )
            first = next(agent_events, None)
            if first is None or first.get("type") == "unsupported":
                # The active model can't do tool calls — plain Q&A, never
                # a hard dependency (Wave G gate).
                pass
            else:
                events = chain([first], agent_events)
        for payload in events:
            yield event(payload)
        yield event({"type": "done"})

    # X-Accel-Buffering: no tells reverse proxies (nginx) not to buffer the
    # stream, so tokens reach the browser as they're produced.
    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


@router.get("/tools")
def list_tools() -> list[dict]:
    """The agent-tool catalog for Settings → Tools toggles (Wave O)."""
    return tools.tool_catalog()


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
