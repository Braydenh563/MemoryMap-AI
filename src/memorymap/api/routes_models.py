"""Model Manager endpoints (plan §6.5 / Phase 3.5).

Everything is written so the app degrades gracefully: Ollama being
absent turns into flags in /models/status, never an error.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from memorymap.ai import embeddings as embeddings_module
from memorymap.ai import model_manager as jobs
from memorymap.ai.model_manager import SUGGESTED_MODELS
from memorymap.ai.ollama_client import OllamaError
from memorymap.core import deps, security
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


class UtilityModelBody(BaseModel):
    # "" means "use the chat model" (Wave N).
    name: str = ""


class ProviderBody(BaseModel):
    """Which backend serves the chat model, and where it lives (§6).

    `base_url` empty means "the default for that provider", which is the
    common case: Ollama on 11434, LM Studio on 1234. Anyone running llama.cpp
    or vLLM has chosen their own port and fills it in.
    """

    provider: Literal["ollama", "openai"]
    base_url: str = ""
    api_key: str | None = None  # None = leave whatever is stored alone


#: What to call the backend in a message the user reads. "Ollama isn't
#: running" is confusing advice when the app was pointed at LM Studio.
_BACKEND_LABELS = {"ollama": "Ollama", "openai": "the model server"}


def _backend_label() -> str:
    provider = str(
        deps.get_config().get_preference("llm_provider", "ollama") or "ollama"
    )
    return _BACKEND_LABELS.get(provider, "the model server")


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

    config = deps.get_config()
    provider = str(config.get_preference("llm_provider", "ollama") or "ollama")

    return {
        # Named for Ollama because the whole UI is, and it means "the chat
        # backend is answering" — which is the question the pill asks whoever
        # is answering it.
        "ollama_running": running,
        # Which dialect is actually in use (§6), so the UI can say so rather
        # than claiming Ollama when the answers came from LM Studio.
        "provider": provider,
        "base_url": ollama.base_url,
        "provider_default_base_urls": deps.DEFAULT_BASE_URLS,
        # Only Ollama can download a model on request; the others are handed
        # one that is already on disk. The download panel hides itself rather
        # than offering a button that cannot work.
        "supports_pull": ollama.supports_pull(),
        "installed_models": installed,
        "chat_model": chat_model,
        # None = unknown because Ollama is off (don't warn about nothing)
        "chat_model_installed": _name_matches(chat_model, installed) if running else None,
        # "" means "same as chat model" (Wave N utility model).
        "utility_model": manager._config.get_preference("utility_model", ""),
        "embedding_backend": manager.embedding_backend(),
        # The Ollama model *setting* — only meaningful on that backend.
        "embedding_model": manager.embedding_model(),
        # What is actually embedding right now, whichever backend that is.
        # The UI used to hard-code the built-in name and was two model
        # changes out of date.
        "active_embedding_model": embeddings.active_model(),
        "embedding_ready": embeddings.is_ready(),
        # Lets the UI tell "still loading" from "failed" (pill fix).
        "embedding_warming": embeddings_module.warmup_running(),
        "embedding_error": embeddings.last_error,
        "reindex": jobs.reindex_status(),
        "pulls": jobs.pull_statuses(),
    }


@router.get("/spec")
def model_spec(name: str = "") -> dict:
    """What the backend says about one model — size, quantisation, window,
    and what it can actually do.

    The app read a context length and nothing else, so Settings → Models could
    not tell you how big a model was, how it was quantised, or whether it
    supports tool calls — which is the first thing worth knowing when "agent
    mode does nothing", and until now was only discoverable by trying it and
    reading the failure.

    `supports_tools` and `supports_thinking` are deliberately tri-state: True,
    False, or null for "this backend doesn't say". Null is not False — an older
    Ollama reports no capability list at all, and rendering its silence as
    "can't use tools" would be a confident lie about a model that works fine.
    """
    client = deps.get_ollama()
    model = name.strip() or deps.get_model_manager().chat_model()
    try:
        return client.model_spec(model)
    except OllamaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/suggested")
def suggested() -> dict:
    return SUGGESTED_MODELS


@router.post("/chat-model")
def set_chat_model(body: ChatModelBody, session: Session = Depends(get_session)) -> dict:
    """Switching the chat model applies immediately — no re-index (§6.5)."""
    ollama = deps.get_ollama()
    if not ollama.is_running():
        raise HTTPException(
            status_code=409, detail=f"{_backend_label()} isn't running"
        )
    if not _name_matches(body.name, _installed_models(True)):
        raise HTTPException(
            status_code=400,
            detail=f"'{body.name}' isn't available on {_backend_label()}",
        )
    deps.get_model_manager().set_chat_model(body.name)
    log_action(session, "edited", "preferences", detail=f"chat_model={body.name}")
    session.commit()
    return {"chat_model": body.name}


@router.post("/utility-model")
def set_utility_model(body: UtilityModelBody, session: Session = Depends(get_session)) -> dict:
    """Point background jobs (filing, digest, writing fixes) at a small
    fast model, separate from the chat model (Wave N). Empty name = use
    the chat model."""
    name = body.name.strip()
    if name and deps.get_ollama().is_running():
        if not _name_matches(name, _installed_models(True)):
            raise HTTPException(
                status_code=400,
                detail=f"'{name}' isn't available on {_backend_label()}",
            )
    deps.get_model_manager().set_utility_model(name)
    log_action(session, "edited", "preferences", detail=f"utility_model={name or '(chat)'}")
    session.commit()
    return {"utility_model": name}


@router.post("/provider")
def set_provider(body: ProviderBody, session: Session = Depends(get_session)) -> dict:
    """Point the app at a different chat backend (§6).

    Applies immediately rather than at the next restart — switching backend is
    exactly the moment someone wants to see whether it worked, and "restart the
    app to find out" turns one question into three.

    The probe result is reported, not enforced. A server that is down right now
    is a perfectly reasonable thing to configure — you set the URL, then you
    start LM Studio — so this saves the setting either way and tells the UI
    what it found, rather than refusing a setting that will be correct in
    thirty seconds.
    """
    config = deps.get_config()
    base_url = body.base_url.strip()

    # A backend address is a new outbound surface: the server posts the user's
    # notes to whatever it names, on every turn. Private and loopback
    # addresses are the *normal* case here and are allowed — that is the whole
    # product — but the narrow set nobody serves a model from is refused, and
    # a backend that would take notes off this machine is reported rather than
    # blocked. See core.security.check_backend_url.
    effective = base_url or deps.DEFAULT_BASE_URLS.get(body.provider, "")
    allowed, reason, is_local = security.check_backend_url(effective)
    if not allowed:
        raise HTTPException(status_code=400, detail=reason)

    config.set_preference("llm_provider", body.provider)
    config.set_preference("llm_base_url", base_url)
    if body.api_key is not None:
        config.set_preference("llm_api_key", body.api_key.strip())
    deps.reload_llm_client()

    client = deps.get_ollama()
    running = client.is_running()
    models: list[dict] = []
    if running:
        try:
            models = client.list_models()
        except OllamaError:
            models = []

    log_action(
        session,
        "edited",
        "preferences",
        detail=f"llm_provider={body.provider} base_url={base_url or '(default)'}",
    )
    session.commit()
    return {
        "provider": body.provider,
        "base_url": client.base_url,
        "reachable": running,
        "supports_pull": client.supports_pull(),
        "installed_models": models,
        # False means the notes leave this machine to be answered. The app's
        # headline promise is that they don't, so this is said out loud rather
        # than decided on the user's behalf.
        "is_local": is_local,
        "privacy_note": reason,
    }


@router.post("/jobs/cancel")
def cancel_job(kind: str, name: str = "") -> dict:
    """Quit a stuck or slow background job from Settings → Tasks (Wave N).
    kind is 'reindex' or 'pull' (with the model name for a pull)."""
    if kind == "reindex":
        stopped = jobs.cancel_reindex()
    elif kind == "pull":
        stopped = jobs.cancel_pull(name)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown job kind '{kind}'")
    if not stopped:
        raise HTTPException(status_code=404, detail="No such job is running")
    return {"cancelling": True, "kind": kind, "name": name}


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

    # Switching backend is a fresh start: drop any cached failure so the
    # re-index retries right away and the stale error banner clears at once
    # instead of lingering for the retry-cooldown (bug: a fixed torch/Ollama
    # still showed the old "search engine problem" until the cooldown lapsed).
    embeddings = deps.get_embeddings()
    embeddings.reset_failure_state()
    jobs.start_reindex(deps.get_db(), embeddings)
    return {"reindex_started": True}


@router.post("/delete")
def delete_model(body: PullBody, session: Session = Depends(get_session)) -> dict:
    """Uninstall a model from Ollama to reclaim disk. Refuses to remove a
    model that's currently in use (chat, utility, or Ollama embeddings), so
    the app can't be left pointing at a model that no longer exists."""
    ollama = deps.get_ollama()
    if not ollama.is_running():
        raise HTTPException(
            status_code=409, detail=f"{_backend_label()} isn't running"
        )
    manager = deps.get_model_manager()
    in_use = {manager.chat_model()}
    if manager._config.get_preference("utility_model", ""):
        in_use.add(manager.utility_model())
    if manager.embedding_backend() == "ollama":
        in_use.add(manager.embedding_model())
    base = body.name.split(":")[0]
    if body.name in in_use or base in {m.split(":")[0] for m in in_use}:
        raise HTTPException(
            status_code=409,
            detail=f"'{body.name}' is in use — switch to another model first, then remove it.",
        )
    try:
        ollama.delete(body.name)
    except OllamaError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    log_action(session, "deleted", "model", detail=body.name)
    session.commit()
    return {"deleted": True, "name": body.name}


@router.post("/pull")
def pull_model(body: PullBody, session: Session = Depends(get_session)) -> dict:
    if not deps.get_ollama().is_running():
        raise HTTPException(
            status_code=409, detail=f"{_backend_label()} isn't running"
        )
    if not jobs.start_pull(deps.get_ollama(), body.name):
        raise HTTPException(status_code=409, detail=f"Already downloading {body.name}")
    log_action(session, "downloaded", "model", detail=body.name)
    session.commit()
    return {"pull_started": True, "name": body.name}
