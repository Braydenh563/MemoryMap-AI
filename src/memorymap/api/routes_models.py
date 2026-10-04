"""Model Manager endpoints (plan §6.5).

Everything is written so the app degrades gracefully: Ollama being
absent turns into flags in /models/status, never an error.
"""

from __future__ import annotations

import logging
import threading
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from memorymap.ai import embeddings as embeddings_module
from memorymap.ai import model_cards, sampling
from memorymap.ai import model_manager as jobs
from memorymap.ai.model_manager import (
    FOLLOW_CHAT_MODEL,
    FOLLOW_SENTINELS,
    FOLLOW_UTILITY_MODEL,
    SUGGESTED_MODELS,
)
from memorymap.ai.ollama_client import OllamaError
from memorymap.core import deps, hardware, ocr, security
from memorymap.core.deps import get_session
from memorymap.core.logbuffer import safe_value
from memorymap.entry.manager import log_action
from memorymap.search import search_manager

router = APIRouter(prefix="/models", tags=["models"])


class ChatModelBody(BaseModel):
    name: str


class EmbeddingBackendBody(BaseModel):
    backend: Literal["sentence-transformers", "ollama"]
    model: str | None = None  # required when backend == "ollama"


class PullBody(BaseModel):
    name: str


class UtilityModelBody(BaseModel):
    # "" means "use the chat model".
    name: str = ""


class FeatureModelBody(BaseModel):
    """One surface, and the model it should run on.

    `feature` is a key from `model_manager.FEATURES`; anything else is a 400
    rather than a saved preference nothing reads. `name` empty means
    "inherited": the feature goes back to the role it falls back to.
    """

    feature: str = Field(min_length=1, max_length=40)
    name: str = ""


class VisionModelBody(BaseModel):
    # "" means "auto-detect", the first installed model that declares the
    # "vision" capability. See ModelManager.resolve_vision_model.
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


class _CachedCapabilities:
    """`ollama`, answering `supports()` from what it already knows.

    /models/status is polled (every second while a job runs, every thirty
    idle) with an 8s budget in the browser, and it resolved the vision and
    OCR models by asking each installed model its capabilities, one
    `/api/show` round trip each at up to 5s apiece, in turn. The answers are
    cached per process, so this only bit on the first polls after a start,
    and it bit reliably: reported as `GET /models/status: signal timed out`
    twice in the first minute, while the embedding model was loading.

    So the poll never asks: an unknown model reads as "unknown" (None, which
    every caller already treats as "not this one" for auto-detection), and a
    background thread asks for the rest, so the next poll has the answer.
    """

    def __init__(self, client) -> None:
        self._client = client
        self._shown = getattr(client, "_shown", None)

    def __getattr__(self, name):
        return getattr(self._client, name)

    def supports(self, model: str, capability: str):
        if self._shown is None:
            return self._client.supports(model, capability)
        if model not in self._shown:
            _warm_capabilities(self._client, model)
            return None
        return self._client.supports(model, capability)


_warming: set[str] = set()
_warming_lock = threading.Lock()


def _warm_capabilities(client, model: str) -> None:
    """Ask `client` about `model` once, off the request thread."""
    with _warming_lock:
        if model in _warming:
            return
        _warming.add(model)

    def run() -> None:
        try:
            client.show(model)
        finally:
            with _warming_lock:
                _warming.discard(model)

    threading.Thread(target=run, name=f"capabilities-{model}", daemon=True).start()



def _builtin_embedding_install_state() -> dict:
    from memorymap.core import extras

    try:
        extra = extras.EXTRAS_BY_ID["semantic"]
        state = extras.current()
        return {
            "builtin_embedding_installed": bool(extras.is_installed(extra)),
            "builtin_embedding_installing": bool(state.running and state.extra_id == "semantic"),
        }
    except Exception:  # noqa: BLE001 - a status field must never fail the status
        logging.getLogger(__name__).warning(
            "couldn't read the built-in search model's install state", exc_info=True
        )
        return {"builtin_embedding_installed": True, "builtin_embedding_installing": False}


@router.post("/warm-filing")
def warm_filing() -> dict:
    """Load the filing model and re-ask for notes left as stand-ins when the
    app last closed. Asked for by the page once it is unlocked, not at app
    construction, where it ran for every test app. Both are pool jobs: the
    warm-up on the cpu lane so a note saved meanwhile is not queued behind
    it, the retry on the model lane with the filing it belongs to."""
    from memorymap.ai import janitor
    from memorymap.api import routes_entries
    from memorymap.core import jobs

    jobs.enqueue(
        "warm-filing",
        janitor.warm_filing_model,
        deps.get_model_manager(),
        deps.get_ollama(),
        dedupe_key="warm-filing",
    )
    jobs.enqueue("file-entry", routes_entries.retry_stand_ins, dedupe_key="retry-stand-ins")
    return {"status": "ok"}

def _embedding_coverage(session: Session) -> dict:
    """How many live notes search by meaning can find, out of how many there
    are: the "how well" half of INBOX 431 (3). Two counts on the poll that
    already runs; the space filter applies as it does to every query."""
    from sqlalchemy import func, select

    from memorymap.core.database import EmbeddingRecord, Entry

    live = (Entry.is_deleted == False) & (Entry.is_draft == False)  # noqa: E712
    total = session.scalar(select(func.count(Entry.id)).where(live)) or 0
    indexed = session.scalar(
        select(func.count(EmbeddingRecord.id)).join(Entry, Entry.id == EmbeddingRecord.entry_id).where(live)
    ) or 0
    return {"indexed": int(indexed), "total": int(total)}


@router.get("/status")
def status(session: Session = Depends(get_session)) -> dict:
    """One call that tells the UI everything: is Ollama up, what's
    installed, what's active, and whether any job is running."""
    ollama = _CachedCapabilities(deps.get_ollama())
    manager = deps.get_model_manager()
    embeddings = deps.get_embeddings()

    # is_running() and list_models() both hit Ollama's own /api/tags: 
    # calling both in sequence (as this used to) can take up to 7s (2s + 5s)
    # for one poll, which used to be longer than the frontend's
    # AbortSignal.timeout on this exact call (app.js refreshModelStatus): 
    # since raised from 5s to 8s, but still worth beating rather than
    # trusting that margin. That mismatch read as "AI unavailable" on a
    # backend that is genuinely up but momentarily slow to answer, one
    # round-trip now serves both purposes.
    try:
        installed = [
            {"name": m.get("name", ""), "size": m.get("size", 0)}
            for m in ollama.list_models()
        ]
        running = True
    except OllamaError:
        installed = []
        running = False
    chat_model = manager.chat_model()
    utility_resolved, utility_reason = manager.utility_resolution()
    # Resolved once. It walks the installed models asking each whether it can
    # see, which is an HTTP call per model on a cold cache.
    resolved_vision = manager.resolve_vision_model(ollama, installed) if running else None

    config = deps.get_config()
    provider = str(config.get_preference("llm_provider", "ollama") or "ollama")
    # Judged on every status poll, not only when the address is changed. A
    # warning that appears once and vanishes on the next reload is a warning
    # about a condition that has not gone away, and this one is about notes
    # leaving the machine, which is the app's central promise.
    local_only = bool(config.get_preference("local_only_ai", True))
    _, privacy_note, is_local = security.check_backend_url(ollama.base_url)

    return {
        # Named for Ollama because the whole UI is, and it means "the chat
        # backend is answering", which is the question the pill asks whoever
        # is answering it.
        "ollama_running": running,
        # Which dialect is actually in use (§6), so the UI can say so rather
        # than claiming Ollama when the answers came from LM Studio.
        "provider": provider,
        "base_url": ollama.base_url,
        "provider_default_base_urls": deps.DEFAULT_BASE_URLS,
        # False means notes leave this machine to be answered. Reported on
        # every poll so the warning persists rather than showing once.
        "is_local": is_local,
        "privacy_note": privacy_note,
        "local_only_ai": local_only,
        # Only Ollama can download a model on request; the others are handed
        # one that is already on disk. The download panel hides itself rather
        # than offering a button that cannot work.
        "supports_pull": ollama.supports_pull(),
        "installed_models": installed,
        "chat_model": chat_model,
        # None = unknown because Ollama is off (don't warn about nothing)
        "chat_model_installed": _name_matches(chat_model, installed) if running else None,
        # **The model that actually answers** (owner, packaged app: "it said in
        # the chat header that I had llama3.2 set when it was a completely
        # different model and I didnt even have llama3.2 installed"). An
        # OpenAI-dialect server (llama.cpp, LM Studio, Jan) answers with the
        # model it has loaded whatever name is asked for, so when the
        # configured name is not one it serves, the loaded one is what runs.
        # Ollama has no such fallback: there the configured name stands, and
        # `chat_model_installed` says it will fail.
        "chat_model_effective": (
            installed[0]["name"]
            if running and provider != "ollama" and installed
            and not _name_matches(chat_model, installed)
            else chat_model
        ),
        # "" means "same as chat model" (utility model).
        "utility_model": manager._config.get_preference("utility_model", ""),
        # What background jobs actually run on, and why (INBOX 277): the
        # stored name above is what the picker shows, and on its own it
        # misreports a notebook with smart model routing off. Also what the
        # "Same as utility model" feature-per-model option (INBOX 430) names
        # as what it currently follows, so the frontend never has to
        # re-derive `ModelManager.utility_model()`'s own logic.
        "utility_model_resolved": utility_resolved,
        "utility_model_reason": utility_reason,
        # "" means "auto-detect" (vision model). The resolved field is what
        # an image-carrying turn would actually use right now, None if
        # nothing installed declares vision and no explicit choice is set, 
        # so Settings can show "auto: currently: llama3.2-vision" rather
        # than making the user guess what auto-detect will do.
        "vision_model": manager.vision_model(),
        "vision_model_resolved": resolved_vision,
        "ocr_model": manager.ocr_model(),
        # Derived from the vision answer rather than resolved again, see
        # `resolve_ocr_model`. Doing both independently walked every installed
        # model twice and pushed this poll past the frontend's 5s abort.
        "ocr_model_resolved": (
            manager.resolve_ocr_model(ollama, installed, vision_fallback=resolved_vision or "")
            if running
            else None
        ),
        # One row per feature that may run on a model of its own, resolved:
        # the name in use and whether that is this feature's own choice or the
        # role's. Carried on the poll that already runs rather than in a
        # second endpoint, so Settings' list and the inline pickers cannot
        # disagree about what is set.
        "feature_models": manager.feature_rows(),
        #: What the mass reset would clear. The button says the number and
        #: does nothing when it is zero.
        "feature_models_overridden": sum(
            1 for row in manager.feature_rows() if row["overridden"]
        ),
        #: The two sentinel values a feature's select can send back through
        #: `/feature-model` for "Same as chat model" / "Same as utility
        #: model" (INBOX 430), so the frontend never hardcodes a string that
        #: only means something because it happens to match this module's
        #: own constant.
        "feature_model_follow": {"chat": FOLLOW_CHAT_MODEL, "utility": FOLLOW_UTILITY_MODEL},
        "embedding_backend": manager.embedding_backend(),
        # The Ollama model *setting*, only meaningful on that backend.
        "embedding_model": manager.embedding_model(),
        # What is actually embedding right now, whichever backend that is.
        # The UI used to hard-code the built-in name and was two model
        # changes out of date.
        "active_embedding_model": embeddings.active_model(),
        # The built-in option's own name, whichever backend is active: the
        # built-in radio used to be labelled with `active_embedding_model`,
        # so with Ollama in use it named the Ollama model (owner's
        # screenshot, 0.3.31: "Built-in (recommended): mxbai-embed-large").
        "builtin_embedding_model": embeddings_module.DEFAULT_ST_MODEL,
        # Whether the built-in model's package is here, and whether the
        # one-time install of it is running: the app installs
        # sentence-transformers by itself the first time the built-in model
        # is needed, and said so only in the log.
        **_builtin_embedding_install_state(),
        "embedding_ready": embeddings.is_ready(),
        # Lets the UI tell "still loading" from "failed" (pill fix).
        "embedding_warming": embeddings_module.warmup_running(),
        "embedding_warming_failed": embeddings_module.warmup_failed(),
        "embedding_error": embeddings.last_error,
        "reindex": jobs.reindex_status(),
        "embedding_coverage": _embedding_coverage(session),
        #: How the last search found its notes (`search_manager.last_search`).
        "last_search": search_manager.last_search(),
        #: How many notes have arrived or gone in bulk since the index was
        #: last rebuilt: asked for as "suggest rebuilding the search index
        #: upon large changes". The status poll already runs; a second
        #: endpoint for one integer would be a second thing to keep in step.
        "index_stale_notes": deps.index_stale_notes(),
        "index_stale_suggest_at": deps.INDEX_STALE_SUGGEST_AT,
        "pulls": jobs.pull_statuses(),
        # Reported directly: the local-OCR button ("Read text offline") was
        # always shown enabled, so pressing it without the `tesseract` system
        # binary installed (never automatable the way the pip half is, see
        # core/ocr.py's own module docstring) just silently produced nothing,
        # with no way to tell "it ran and found no text" from "it never ran
        # at all". A `shutil.which` check, cheap enough for every poll.
        "tesseract_available": ocr.tesseract_available(),
    }


@router.get("/spec")
def model_spec(name: str = "") -> dict:
    """What the backend says about one model, size, quantisation, window,
    and what it can actually do.

    The app read a context length and nothing else, so Settings → Models could
    not tell you how big a model was, how it was quantised, or whether it
    supports tool calls: which is the first thing worth knowing when "agent
    mode does nothing", and until now was only discoverable by trying it and
    reading the failure.

    `supports_tools` and `supports_thinking` are deliberately tri-state: True,
    False, or null for "this backend doesn't say". Null is not False, an older
    Ollama reports no capability list at all, and rendering its silence as
    "can't use tools" would be a confident lie about a model that works fine.
    """
    client = deps.get_ollama()
    model = name.strip() or deps.get_model_manager().chat_model()
    try:
        return client.model_spec(model)
    except OllamaError as exc:
        logging.getLogger(__name__).warning("model details for %s failed", safe_value(model, 80), exc_info=True)
        raise HTTPException(
            status_code=502,
            detail="Couldn't read that model's details. Check that the AI is running and the model is installed.",
        ) from exc


class SamplingBody(BaseModel):
    """Only the fields the user actually changed.

    Sparse on purpose: see `ai/sampling.py`. Storing a full set the moment the
    panel opens would pin one model's recommendations onto every other model
    the user ever runs, which is the exact failure the auto-detection exists to
    avoid.
    """

    overrides: dict[str, float] = Field(default_factory=dict)


@router.get("/sampling")
def sampling_settings(name: str = "") -> dict:
    """The advanced response settings, and where each value comes from.

    Asked for directly: expose top-k, top-p, repeat penalty and the rest,
    "because different models require different parameters to get the same
    result", and detect the right ones per model if that is possible.

    It is, and without guessing. A GGUF carries its author's recommended
    sampling parameters, Ollama reports them in `/api/show`, and this app was
    already fetching and caching that payload for the context window and the
    capability list while dropping that one field. So `model` below is what the
    model itself asks for, not a table someone maintained by hand.

    `sources` is why this returns more than numbers: "0.6 because this model
    recommends it" and "0.6 because you set it" need different controls beside
    them, and only the second has anything to revert to.
    """
    client = deps.get_ollama()
    model = name.strip() or deps.get_model_manager().chat_model()
    try:
        shown = client.show(model) if hasattr(client, "show") else {}
    except Exception:  # noqa: BLE001  # an unreachable backend is not an error here
        shown = {}
    model_defaults = sampling.parse_model_parameters(shown)
    # Read from settings here rather than through the provider. The provider
    # has its own accessor because every generation path goes through
    # `runtime_options` and threading a settings dict through all of them would
    # mean each one could forget, but this route is *about* the setting, and
    # asking the backend for it would couple a settings screen to whichever
    # client happens to be configured.
    overrides = deps.get_config().get_preference("sampling_overrides", {})
    if not isinstance(overrides, dict):
        overrides = {}
    return {
        "model": model,
        "knobs": sampling.as_dicts(),
        "model_defaults": model_defaults,
        "overrides": overrides,
        "effective": sampling.resolve(model_defaults, None, overrides),
        "sources": sampling.explain(model_defaults, None, overrides),
        # The OpenAI dialect has no endpoint reporting a model's own
        # parameters, and accepts only two of these knobs. Said plainly rather
        # than leaving the panel to imply otherwise.
        "reports_model_defaults": bool(shown),
    }


@router.put("/sampling")
def save_sampling_settings(body: SamplingBody) -> dict:
    """Replace the overrides. An empty dict is how "use the model's own
    recommendations again" is expressed: there is no separate reset route,
    because reset *is* having no override."""
    clean = {
        key: value
        for key, value in body.overrides.items()
        if key in sampling.KNOBS_BY_NAME
    }
    deps.get_config().set_preference("sampling_overrides", clean)
    return {"overrides": clean}


@router.get("/suggested")
def suggested() -> dict:
    """The shortlist, with the real download size wherever we know it.

    Reported: "the approximate sizes for the suggested models are not
    correct" (§35J). They are hand-written: §33 defends the hand-written
    *list* against odysseus's Cookbook, and that argument still holds, but a
    hand-written *number* is a different thing: it goes stale every time a
    publisher re-quantises a tag, and a wrong number is worse than none, since
    it is the figure someone checks their free disk against.

    Two halves, and only one of them is guessable. For a model that is
    installed, the backend knows exactly how many bytes it took, so that
    number replaces the guess and is marked `measured`. For one that is not,
    there is no local source of truth, so the shipped figure is passed
    through and marked `approximate` rather than quietly presented as fact.
    The alternative, asking a registry over the network, is a call this app
    should not make just to draw a settings list.
    """
    installed: dict[str, int] = {}
    try:
        for model in deps.get_ollama().list_models():
            size = model.get("size")
            if size:
                installed[str(model.get("name", ""))] = int(size)
    except Exception:  # noqa: BLE001  # the backend being off is not an error here
        installed = {}

    #: The card's numbers (INBOX 444): the memory a model asks for, what it is
    #: good at, the group's starting pick, and whether it fits this computer.
    total_gb = hardware.total_memory_gb()

    def described(kind: str, entry: dict) -> dict:
        entry = model_cards.decorate(kind, entry, total_gb)
        real = installed.get(entry["name"])
        if real:
            return {**entry, "size": _human_bytes(real), "size_source": "measured"}
        return {**entry, "size_source": "approximate"}

    return {kind: [described(kind, m) for m in models] for kind, models in SUGGESTED_MODELS.items()}


@router.get("/hardware")
def hardware_memory() -> dict:
    """This computer's memory, for the cards' fit badges. None when unknown."""
    return {"ram_gb": hardware.total_memory_gb()}


class InspectBody(BaseModel):
    name: str = Field(max_length=2000)


def _installed_names() -> set[str]:
    try:
        return {str(m.get("name", "")) for m in deps.get_ollama().list_models()}
    except Exception:  # noqa: BLE001  # the backend being off is not an error here
        return set()


@router.post("/inspect")
def inspect_model(body: InspectBody) -> dict:
    """Say what a typed model name is before anything is downloaded.

    "Download another model" (Settings, Models): the person types a tag or
    pastes a Hugging Face link and is told what it is, where it comes from and
    whether it is already here. Pure validation, no registry lookup: the app
    draws its settings offline, and a well-formed name that does not exist is
    answered by Ollama itself when the download starts.
    """
    info = model_cards.inspect_model_name(body.name)
    if not info["valid"]:
        return info
    name = info["name"]
    names = _installed_names()
    info["installed"] = name in names or (":" not in name and f"{name}:latest" in names)
    known = next((m for models in SUGGESTED_MODELS.values() for m in models if m["name"] == name), None)
    info["suggested"] = {"size": known["size"], "purpose": known["purpose"]} if known else None
    return info


def _human_bytes(count: int) -> str:
    """Bytes as the size a download dialog would show."""
    if count >= 1_000_000_000:
        return f"{count / 1_000_000_000:.1f} GB"
    return f"{round(count / 1_000_000)} MB"


@router.post("/chat-model")
def set_chat_model(body: ChatModelBody, session: Session = Depends(get_session)) -> dict:
    """Switching the chat model applies immediately, no re-index (§6.5)."""
    ollama = deps.get_ollama()
    if not ollama.is_running():
        raise HTTPException(
            status_code=409, detail=f"{_backend_label()} isn't running. Start it and try again."
        )
    if not _name_matches(body.name, _installed_models(True)):
        raise HTTPException(
            status_code=400,
            detail=f"'{body.name}' isn't available on {_backend_label()}.",
        )
    deps.get_model_manager().set_chat_model(body.name)
    log_action(session, "edited", "preferences", detail=f"chat_model={body.name}")
    session.commit()
    return {"chat_model": body.name}


@router.post("/utility-model")
def set_utility_model(body: UtilityModelBody, session: Session = Depends(get_session)) -> dict:
    """Point background jobs (filing, digest, writing fixes) at a small
    fast model, separate from the chat model. Empty name = use
    the chat model."""
    name = body.name.strip()
    if name and deps.get_ollama().is_running():
        if not _name_matches(name, _installed_models(True)):
            raise HTTPException(
                status_code=400,
                detail=f"'{name}' isn't available on {_backend_label()}.",
            )
    deps.get_model_manager().set_utility_model(name)
    log_action(session, "edited", "preferences", detail=f"utility_model={name or '(chat)'}")
    session.commit()
    return {"utility_model": name}


@router.post("/vision-model")
def set_vision_model(body: VisionModelBody, session: Session = Depends(get_session)) -> dict:
    """Which model an image-carrying chat turn uses. Empty name = auto-detect
    (the first installed model that declares the "vision" capability)."""
    name = body.name.strip()
    if name and deps.get_ollama().is_running():
        if not _name_matches(name, _installed_models(True)):
            raise HTTPException(
                status_code=400,
                detail=f"'{name}' isn't available on {_backend_label()}.",
            )
    deps.get_model_manager().set_vision_model(name)
    log_action(session, "edited", "preferences", detail=f"vision_model={name or '(auto)'}")
    session.commit()
    return {"vision_model": name}


@router.post("/ocr-model")
def set_ocr_model(body: VisionModelBody, session: Session = Depends(get_session)) -> dict:
    """Which model reads text off an image or a rasterised PDF page.

    Empty name falls back to the vision model, and then to auto-detect, see
    `ModelManager.ocr_model` for why reading a page and describing a picture
    deserve separate settings even though both take an image.
    """
    name = body.name.strip()
    if name and deps.get_ollama().is_running():
        if not _name_matches(name, _installed_models(True)):
            raise HTTPException(
                status_code=400,
                detail=f"'{name}' isn't available on {_backend_label()}.",
            )
    deps.get_model_manager().set_ocr_model(name)
    log_action(session, "edited", "preferences", detail=f"ocr_model={name or '(vision)'}")
    session.commit()
    return {"ocr_model": name}


@router.post("/feature-model")
def set_feature_model(
    body: FeatureModelBody, session: Session = Depends(get_session)
) -> dict:
    """Point one feature at its own model, or hand it back to its role.

    Asked for directly: *"allow the user to alter the model they use for that
    specific feature ... allow these to be easily individually altered and
    reset."* One route for every feature, because the features are a table
    (`model_manager.FEATURES`) rather than a list of settings: the next one is
    a row there and needs nothing here.

    The name is checked against what is installed on the same terms
    `/utility-model` uses, and for the same reason: an empty name always
    applies (clearing can never be refused), and a name is only checked when
    the backend is up to be asked.
    """
    name = body.name.strip()
    #: The two `FOLLOW_*` sentinels are not model names (INBOX 430: "Same as
    #: chat model" / "Same as utility model"): checking one against what is
    #: installed would refuse the very setting that means "don't pin this to
    #: an installed name at all, track the other setting instead".
    if name and name not in FOLLOW_SENTINELS and deps.get_ollama().is_running():
        if not _name_matches(name, _installed_models(True)):
            raise HTTPException(
                status_code=400,
                detail=f"'{name}' isn't available on {_backend_label()}.",
            )
    try:
        deps.get_model_manager().set_feature_model(body.feature, name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    _log_names = {
        FOLLOW_CHAT_MODEL: "(same as chat model)",
        FOLLOW_UTILITY_MODEL: "(same as utility model)",
    }
    log_action(
        session,
        "edited",
        "preferences",
        detail=f"feature_model_{body.feature}={_log_names.get(name, name or '(inherited)')}",
    )
    session.commit()
    return {
        "feature": body.feature,
        "name": name,
        "feature_models": deps.get_model_manager().feature_rows(),
    }


@router.post("/feature-models/reset")
def reset_feature_models(session: Session = Depends(get_session)) -> dict:
    """Hand every feature back to its role, and say how many that was.

    The count is what makes this honest: Settings shows it on the button
    before it is pressed and reports it after, so a reset over nothing reads
    as nothing rather than as a success.
    """
    cleared = deps.get_model_manager().reset_feature_models()
    if cleared:
        log_action(
            session, "edited", "preferences", detail=f"feature models reset ({cleared})"
        )
        session.commit()
    return {"cleared": cleared, "feature_models": deps.get_model_manager().feature_rows()}


@router.post("/provider")
def set_provider(body: ProviderBody, session: Session = Depends(get_session)) -> dict:
    """Point the app at a different chat backend (§6).

    Applies immediately rather than at the next restart, switching backend is
    exactly the moment someone wants to see whether it worked, and "restart the
    app to find out" turns one question into three.

    The probe result is reported, not enforced. A server that is down right now
    is a perfectly reasonable thing to configure, you set the URL, then you
    start LM Studio: so this saves the setting either way and tells the UI
    what it found, rather than refusing a setting that will be correct in
    thirty seconds.
    """
    config = deps.get_config()
    base_url = body.base_url.strip()

    # A backend address is a new outbound surface: the server posts the user's
    # notes to whatever it names, on every turn. Private and loopback
    # addresses are the *normal* case here and are allowed, that is the whole
    # product: but the narrow set nobody serves a model from is refused, and
    # a backend that would take notes off this machine is reported rather than
    # blocked. See core.security.check_backend_url.
    effective = base_url or deps.DEFAULT_BASE_URLS.get(body.provider, "")
    allowed, reason, is_local = security.check_backend_url(
        effective, local_only=bool(config.get_preference("local_only_ai", True))
    )
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
    """Quit a stuck or slow background job from Settings → Tasks.
    kind is 'reindex' or 'pull' (with the model name for a pull)."""
    if kind == "reindex":
        stopped = jobs.cancel_reindex()
    elif kind == "pull":
        stopped = jobs.cancel_pull(name)
    else:
        raise HTTPException(status_code=400, detail=f"'{kind}' is not a job that can be cancelled.")
    if not stopped:
        raise HTTPException(status_code=404, detail="That job is not running.")
    return {"cancelling": True, "kind": kind, "name": name}


@router.post("/embedding-backend")
def set_embedding_backend(
    body: EmbeddingBackendBody, session: Session = Depends(get_session)
) -> dict:
    """Switch how notes are embedded, then re-index everything, vectors
    from different models must never be compared (§6.5)."""
    if body.backend == "ollama" and not body.model:
        raise HTTPException(status_code=400, detail="Pick an Ollama embedding model.")
    current = jobs.reindex_status()
    if current is not None and current["status"] == "running":
        raise HTTPException(status_code=409, detail="A re-index is already running.")

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
    deps.clear_index_stale()
    return {"reindex_started": True}


@router.post("/reindex")
def rebuild_search_index() -> dict:  # noqa: D401  # see the long docstring below
    """Re-embed every note with the current backend, on demand.

    **Until now the only way to rebuild the index was to switch embedding
    backend and switch back.** `set_embedding_backend` above starts a
    re-index because it must, vectors from two models cannot be compared , 
    and that side effect was the *whole* mechanism: nothing else in the app
    could ask for one.

    That matters because a stale index is not always the user's doing. What a
    note's vector is built from is `embedding_text`, and this app has changed
    it: a note's category, tags and attachment text are part of it now, so
    every vector written before that change encodes less than the same note
    would encode today. Reported directly, and it is exactly the shape that
    produces: *"I have a whole category called hobbies but basically none
    came up in the semantic search."* The fix for that shipped; without a way
    to rebuild, it reaches nobody's existing notes.

    Deliberately cheap to offer and safe to run: re-embedding is idempotent,
    the job is the same one `set_embedding_backend` starts, and while it runs
    semantic search falls back to keywords rather than comparing mismatched
    vectors (§6.5). A 409 rather than a second job if one is already going.
    """
    current = jobs.reindex_status()
    if current is not None and current["status"] == "running":
        raise HTTPException(status_code=409, detail="A re-index is already running.")
    embeddings = deps.get_embeddings()
    # Same reset as the backend switch: a cached failure from an earlier run
    # would otherwise make a deliberate rebuild sit behind the retry cooldown
    # and look like it did nothing.
    embeddings.reset_failure_state()
    started = jobs.start_reindex(deps.get_db(), embeddings)
    #: Only on a rebuild that actually started: clearing the backlog for a
    #: request that was refused would hide the very thing it counts.
    if started:
        deps.clear_index_stale()
    return {"reindex_started": bool(started)}


@router.post("/delete")
def delete_model(body: PullBody, session: Session = Depends(get_session)) -> dict:
    """Uninstall a model from Ollama to reclaim disk. Refuses to remove a
    model that's currently in use (chat, utility, or Ollama embeddings), so
    the app can't be left pointing at a model that no longer exists."""
    ollama = deps.get_ollama()
    if not ollama.is_running():
        raise HTTPException(
            status_code=409, detail=f"{_backend_label()} isn't running. Start it and try again."
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
            detail=f"'{body.name}' is in use: switch to another model first, then remove it.",
        )
    try:
        ollama.delete(body.name)
    except OllamaError as exc:
        logging.getLogger(__name__).warning("removing model %s failed", safe_value(body.name, 80), exc_info=True)
        raise HTTPException(
            status_code=502, detail="Couldn't remove that model. Check that the AI is running, then try again."
        ) from exc
    log_action(session, "deleted", "model", detail=body.name)
    session.commit()
    return {"deleted": True, "name": body.name}


@router.post("/pull")
def pull_model(body: PullBody, session: Session = Depends(get_session)) -> dict:
    #: A pasted Hugging Face link becomes ``hf.co/owner/repo:QUANT``, and a name
    #: Ollama could not pull is refused here with the reason, not by a failed
    #: download (`model_cards.inspect_model_name`).
    info = model_cards.inspect_model_name(body.name)
    if not info["valid"]:
        raise HTTPException(status_code=422, detail=info["error"])
    body.name = info["name"]
    if not deps.get_ollama().is_running():
        raise HTTPException(
            status_code=409, detail=f"{_backend_label()} isn't running. Start it and try again."
        )
    if not jobs.start_pull(deps.get_ollama(), body.name):
        raise HTTPException(status_code=409, detail=f"{body.name} is already downloading.")
    log_action(session, "downloaded", "model", detail=body.name)
    session.commit()
    return {"pull_started": True, "name": body.name, "source": info["source"]}
