"""Voice capture endpoints (Wave H): the browser records, the server
transcribes with local Whisper — nothing is sent anywhere.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from memorymap.ai import voice
from memorymap.core import deps
from memorymap.core.deps import get_session
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/voice", tags=["voice"])

MAX_AUDIO_BYTES = 25 * 1024 * 1024  # a spoken note, not a podcast


@router.get("/status")
def status() -> dict:
    available = voice.whisper_available()
    return {
        "available": available,
        "model": deps.get_config().get_preference("voice_model", "base"),
        "hint": None if available else voice.INSTALL_HINT,
    }


@router.post("/transcribe")
def transcribe(file: UploadFile, session: Session = Depends(get_session)) -> dict:
    if not voice.whisper_available():
        raise HTTPException(status_code=503, detail=voice.INSTALL_HINT)

    data = file.file.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Recording is larger than 25 MB")
    if not data:
        raise HTTPException(status_code=400, detail="The recording is empty")

    suffix = Path(file.filename or "clip.webm").suffix[:8] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as clip:
        clip.write(data)
        clip.flush()
        try:
            text = voice.transcribe(
                Path(clip.name),
                model_size=deps.get_config().get_preference("voice_model", "base"),
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:  # a bad clip must not 500 mysteriously
            raise HTTPException(
                status_code=422, detail=f"Couldn't transcribe that recording: {exc}"
            ) from exc

    log_action(session, "transcribed", "voice", detail=f"{len(data)} bytes")
    session.commit()
    return {"text": text}
