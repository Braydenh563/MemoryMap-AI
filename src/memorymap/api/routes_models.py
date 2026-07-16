"""Model Manager endpoints (plan §6.5 / Phase 3.5).

Everything is written so the app degrades gracefully: Ollama being
absent turns into flags in /models/status, never an error.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from memorymap.ai import model_manager as jobs
from memorymap.ai.model_manager import SUGGESTED_MODELS
from memorymap.ai.ollama_client import OllamaError
from memorymap.core import deps
from memorymap.core.deps import get_session
from memorymap.entry.manager import log_action

router = APIRouter(prefix="/models", tags=["models"])


class ChatModelBody(BaseModel):
    name: str


class EmbeddingBackendBody(BaseModel):
    backend: Literal["sentence-transformers", "ollama"]
    model: str | None = None  # required when backend == "ollama"


class PullBody(BaseModel):
    name: str


def _installed_models(running: bool) -> list[dict]:
    if not running:
        return []
    try:
        return [
            {"name": m.get("name", ""), "size": m.get("size", 0)}
            for m in deps.get_ollama().list_models()
        ]
    except OllamaError:
        return []


def _name_matches(wanted: str, installed: list[dict]) -> bool:
    """'llama3.2' should match an installed 'llama3.2:latest'."""
    names = {m["name"] for m in installed}
    names |= {name.split(":")[0] for name in names}
    return wanted in names


@router.get("/status")
def status() -> dict:
    """One call that tells the UI everything: is Ollama up, what's
    installed, what's active, and whether any job is running."""
    ollama = deps.get_ollama()
    manager = deps.get_model_manager()
    embeddings = deps.get_embeddings()

    running = ollama.is_running()
    installed = _installed_models(running)
    chat_model = manager.chat_model()

    return {
        "ollama_running": running,
        "installed_models": installed,
        "chat_model": chat_model,
        # None = unknown because Ollama is off (don't warn about nothing)
        "chat_model_installed": _name_matches(chat_model, installed) if running else None,
        "embedding_backend": manager.embedding_backend(),
        "embedding_model": manager.embedding_model(),
        "embedding_ready": embeddings.is_ready(),
        "reindex": jobs.reindex_status(),
        "pulls": jobs.pull_statuses(),
    }


@router.get("/suggested")
def suggested() -> dict:
    return SUGGESTED_MODELS


@router.post("/chat-model")
def set_chat_model(body: ChatModelBody, session: Session = Depends(get_session)) -> dict:
    """Switching the chat model applies immediately — no re-index (§6.5)."""
    ollama = deps.get_ollama()
    if not ollama.is_running():
        raise HTTPException(status_code=409, detail="Ollama isn't running")
    if not _name_matches(body.name, _installed_models(True)):
        raise HTTPException(
            status_code=400,
            detail=f"'{body.name}' isn't installed in Ollama — download it first",
        )
    deps.get_model_manager().set_chat_model(body.name)
    log_action(session, "edited", "preferences", detail=f"chat_model={body.name}")
    session.commit()
    return {"chat_model": body.name}


@router.post("/embedding-backend")
def set_embedding_backend(
    body: EmbeddingBackendBody, session: Session = Depends(get_session)
) -> dict:
    """Switch how notes are embedded, then re-index everything — vectors
    from different models must never be compared (§6.5)."""
    if body.backend == "ollama" and not body.model:
        raise HTTPException(status_code=400, detail="Pick an Ollama embedding model")
    current = jobs.reindex_status()
    if current is not None and current["status"] == "running":
        raise HTTPException(status_code=409, detail="A re-index is already running")

    deps.get_model_manager().set_embedding_backend(body.backend, body.model)
    log_action(
        session,
        "edited",
        "preferences",
        detail=f"embedding_backend={body.backend} model={body.model or '-'}",
    )
    session.commit()

    jobs.start_reindex(deps.get_db(), deps.get_embeddings())
    return {"reindex_started": True}


@router.post("/pull")
def pull_model(body: PullBody, session: Session = Depends(get_session)) -> dict:
    if not deps.get_ollama().is_running():
        raise HTTPException(status_code=409, detail="Ollama isn't running")
    if not jobs.start_pull(deps.get_ollama(), body.name):
        raise HTTPException(status_code=409, detail=f"Already downloading {body.name}")
    log_action(session, "downloaded", "model", detail=body.name)
    session.commit()
    return {"pull_started": True, "name": body.name}
