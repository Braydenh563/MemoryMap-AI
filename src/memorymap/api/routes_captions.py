"""Live captions (28.5 row 9): the page posts microphone chunks, the app keeps
the window and asks the local helper (`ai/captions.py` says how), and Stop
saves what was said as a note.

Chunked POSTs rather than a WebSocket: the app has no socket route and auth
for one, and a chunk whose reply carries the caption is one round trip per
step through the same lock and CSP as every other call.
"""

from __future__ import annotations

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session as DbSession

from memorymap.ai import captions
from memorymap.api import routes_entries
from memorymap.api.schemas import EntryCreate
from memorymap.core.deps import get_session
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/voice/captions", tags=["voice"])
log = logging.getLogger("memorymap.captions")

TAG = "captions"


def _save(session: captions.Session, db: DbSession) -> dict:
    """The transcript as a note (Brief 80's recording object is the better
    home once it exists: the same call then attaches the audio). Nothing said,
    nothing saved."""
    text = session.transcript().strip()
    if not text:
        return {"entry_id": None, "text": ""}
    now = datetime.now()
    stamp = f"{now.day} {now:%b %Y, %H:%M}"
    entry = routes_entries.create_entry(
        EntryCreate(content=f"Live captions, {stamp}\n\n{text}", tags=[TAG], defer_filing=True), db
    )
    log_action(db, "captioned", "voice", detail=f"{len(text)} characters")
    db.commit()
    return {"entry_id": entry.id, "text": text}


@router.post("/start")
def start(db: DbSession = Depends(get_session)) -> dict:
    for stale in captions.expired():  # an abandoned run is saved, not lost
        _save(stale, db)
    try:
        session = captions.begin()
    except captions.CaptionsError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "id": session.id,
        "model": captions.model_label(),
        "step_ms": captions.STEP_MS,
        "sample_rate": captions.SAMPLE_RATE,
    }


@router.post("/{session_id}/audio")
async def audio(session_id: str, request: Request, db: DbSession = Depends(get_session)) -> dict:
    session = captions.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Live captions already ended.")
    if int(request.headers.get("content-length") or 0) > captions.MAX_CHUNK_BYTES:
        raise HTTPException(status_code=413, detail="That audio chunk is too large.")
    chunk = await request.body()
    if len(chunk) > captions.MAX_CHUNK_BYTES:
        raise HTTPException(status_code=413, detail="That audio chunk is too large.")
    try:
        return await run_in_threadpool(session.feed, chunk[: len(chunk) // 2 * 2])
    except captions.CaptionsError as exc:
        # The helper failed several times running: end the run, keep the text.
        captions.end(session_id)
        _save(session, db)
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/{session_id}/stop")
def stop(session_id: str, db: DbSession = Depends(get_session)) -> dict:
    session = captions.end(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Live captions already ended.")
    return _save(session, db)
