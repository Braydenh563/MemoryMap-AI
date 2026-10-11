"""Recordings (WORLD_CLASS_PLAN 28.5 rows 1, 5 and 6): audio kept as an
object of its own (decision 2), named by the container the browser made
(decision 3), and transcribed only when the optional add-on is there
(decision 4).

**Record never refuses.** With no Whisper add-on the audio is still kept:
the recorder makes a row here before the first chunk, appends a chunk every
10 seconds, and finishes it on Stop. A tab killed mid-meeting leaves every
chunk it sent; `recordings.recover_stale` finishes such a row the next time
the list is read, marked recovered so the app says so once.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import voice
from memorymap.api import paging
from memorymap.core import activity, deps, recordings
from memorymap.core.database import Recording, utcnow
from memorymap.core.deps import get_session
from memorymap.entry import bin as other_bin
from memorymap.entry.manager import log_action

router = APIRouter(tags=["recordings"])
#: `<audio src>` sends the media cookie, never the X-Auth-Token header, so
#: the audio is served under `/media/`, the cookie's own path, on the media
#: gate (`routes_auth.MEDIA_COOKIE_PATHS`).
media_router = APIRouter(tags=["recordings"])

logger = logging.getLogger("memorymap.recordings")


class RecordingCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    mime: str = Field(default="audio/webm", max_length=120)
    entry_id: int | None = None
    #: A trim's original (row 6): the new object says where it came from.
    source_id: int | None = None


class RecordingFinish(BaseModel):
    duration_ms: int = Field(default=0, ge=0, le=24 * 3600 * 1000)
    peaks: list[float] = Field(default_factory=list, max_length=recordings.PEAKS_MAX)
    markers: list[float] = Field(default_factory=list, max_length=recordings.MARKERS_MAX)


class RecordingPatch(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    markers: list[float] | None = Field(default=None, max_length=recordings.MARKERS_MAX)
    entry_id: int | None = None


def _get(session: Session, recording_id: int, binned: bool = False) -> Recording:
    if binned:
        with other_bin.including_binned(session):
            row = session.get(Recording, recording_id)
    else:
        row = session.get(Recording, recording_id)
        if row is not None and row.deleted_at is not None:
            row = None
    if row is None:
        raise HTTPException(status_code=404, detail="That recording isn't there any more.")
    return row


#: A page of the library; the screen asks for the largest and filters it itself.
RECORDINGS_PAGE_SIZE = 100
RECORDINGS_PAGE_SIZE_MAX = 500


@router.get("/recordings")
def list_recordings(
    response: Response,
    limit: int = Query(default=RECORDINGS_PAGE_SIZE, ge=1, le=RECORDINGS_PAGE_SIZE_MAX),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> dict:
    """Newest first, a page at a time (`X-Total-Count` is the whole library),
    after finishing any a closed tab left open (row 5): `recovered` lists
    those, once."""
    recovered = recordings.recover_stale(session)
    query = session.query(Recording).filter(Recording.state == "saved")
    total = query.count()
    rows = query.order_by(Recording.created_at.desc()).offset(offset).limit(limit).all()
    response.headers["X-Total-Count"] = str(total)
    paging.finish(response, offset, limit, total)
    announced = [recordings.as_dict(row) for row in recovered]
    return {"recordings": [recordings.as_dict(row) for row in rows], "recovered": announced}


@router.post("/recordings/recover")
def recover_recordings(session: Session = Depends(get_session)) -> list[dict]:
    """Run at each start: the recordings a closed tab left half-made, each
    finished with every chunk it sent (row 5), listed once. A bare list: the
    call is in app.js, whose boot bytes are ratcheted."""
    return [recordings.as_dict(row) for row in recordings.recover_stale(session)]


@router.post("/recordings", status_code=201)
def create_recording(body: RecordingCreate, session: Session = Depends(get_session)) -> dict:
    mime = recordings.container(body.mime)
    if mime is None:
        raise HTTPException(
            status_code=415,
            detail="This browser records in a format the app can't keep (webm, ogg, mp4 or wav).",
        )
    row = Recording(
        title=body.title.strip()[:200],
        mime=mime,
        filename=recordings.new_filename(mime),
        entry_id=body.entry_id,
        source_id=body.source_id,
        state="recording",
    )
    session.add(row)
    session.flush()
    log_action(session, "created", "recording", row.id, detail=mime)
    session.commit()
    return recordings.as_dict(row)


@router.post("/recordings/{recording_id}/chunk")
def append_chunk(
    recording_id: int,
    file: UploadFile,
    duration_ms: int = Form(0),
    session: Session = Depends(get_session),
) -> dict:
    """One slice of a recording in progress, appended to its file. The first
    must open with the container's own header (the type check)."""
    row = _get(session, recording_id)
    if row.state != "recording":
        raise HTTPException(status_code=409, detail="That recording is already finished.")
    room = recordings.MAX_RECORDING_BYTES - row.size_bytes
    data = file.file.read(room + 1)
    if len(data) > room:
        raise HTTPException(status_code=413, detail="That recording is larger than 300 MB.")
    if not row.size_bytes and data and not recordings.matches(row.mime, data[:16]):
        raise HTTPException(status_code=415, detail="That audio isn't the type it says it is.")
    if data:
        with recordings.path_of(row).open("ab") as out:
            out.write(data)
        row.size_bytes += len(data)
    row.duration_ms = max(row.duration_ms, min(int(duration_ms), 24 * 3600 * 1000))
    row.updated_at = utcnow()
    session.commit()
    return {"id": row.id, "size_bytes": row.size_bytes, "duration_ms": row.duration_ms}


@router.post("/recordings/{recording_id}/finish")
def finish_recording(
    recording_id: int, body: RecordingFinish, session: Session = Depends(get_session)
) -> dict:
    row = _get(session, recording_id)
    if not row.size_bytes:
        recordings.purge(session, row)
        session.commit()
        raise HTTPException(status_code=400, detail="The recording is empty.")
    row.state = "saved"
    row.duration_ms = max(row.duration_ms, body.duration_ms)
    row.peaks = recordings.clean_peaks(body.peaks)
    row.markers = recordings.clean_markers(body.markers, row.duration_ms or None)
    row.updated_at = utcnow()
    session.commit()
    return recordings.as_dict(row)


@router.get("/recordings/{recording_id}")
def read_recording(recording_id: int, session: Session = Depends(get_session)) -> dict:
    return recordings.as_dict(_get(session, recording_id))


@router.patch("/recordings/{recording_id}")
def update_recording(
    recording_id: int, body: RecordingPatch, session: Session = Depends(get_session)
) -> dict:
    row = _get(session, recording_id)
    if body.title is not None:
        row.title = body.title.strip()[:200]
    if body.markers is not None:
        row.markers = recordings.clean_markers(body.markers, row.duration_ms or None)
    if "entry_id" in body.model_fields_set:
        row.entry_id = body.entry_id
    session.commit()
    return recordings.as_dict(row)


@router.delete("/recordings/{recording_id}")
def bin_recording(recording_id: int, session: Session = Depends(get_session)) -> dict:
    """Into the bin, audio and all; Restore brings it back as it was."""
    row = _get(session, recording_id)
    row.deleted_at = utcnow()
    log_action(session, "binned", "recording", row.id)
    session.commit()
    return {"id": row.id, "binned": True}


@router.post("/recordings/{recording_id}/restore")
def restore_recording(recording_id: int, session: Session = Depends(get_session)) -> dict:
    row = _get(session, recording_id, binned=True)
    row.deleted_at = None
    log_action(session, "restored", "recording", row.id)
    session.commit()
    return recordings.as_dict(row)


@router.post("/recordings/{recording_id}/purge")
def purge_recording(recording_id: int, session: Session = Depends(get_session)) -> dict:
    with other_bin.including_binned(session):
        row = _get(session, recording_id, binned=True)
        if row.deleted_at is None:
            raise HTTPException(status_code=409, detail="Only a recording in the bin can be deleted for good.")
        recordings.purge(session, row)
        session.commit()
    return {"id": recording_id, "purged": True}


@router.post("/recordings/{recording_id}/transcribe")
def transcribe_recording(recording_id: int, session: Session = Depends(get_session)) -> dict:
    """The kept audio, transcribed by the optional add-on (decision 4). With
    no add-on: 503 and the hint, and the recording is unaffected."""
    row = _get(session, recording_id)
    if not voice.whisper_available():
        raise HTTPException(status_code=503, detail=voice.INSTALL_HINT)
    path = recordings.path_of(row)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That recording's audio is missing.")
    try:
        with activity.track("transcription", "Transcribing a recording", stoppable=False):
            text = voice.transcribe(
                Path(path), model_size=deps.get_config().get_preference("voice_model", "base")
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # a bad clip must not 500 mysteriously
        logger.warning("transcription failed", exc_info=True)
        raise HTTPException(
            status_code=422, detail="Couldn't transcribe that recording. Try recording it again."
        ) from exc
    log_action(session, "transcribed", "recording", row.id)
    session.commit()
    return {"text": text}


@media_router.get("/media/recordings/{recording_id}")
def recording_audio(recording_id: int, session: Session = Depends(get_session)) -> FileResponse:
    row = _get(session, recording_id)
    path = recordings.path_of(row)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That recording's audio is missing.")
    headers = {
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Cache-Control": "no-store",
    }
    return FileResponse(path, media_type=row.mime, headers=headers)

