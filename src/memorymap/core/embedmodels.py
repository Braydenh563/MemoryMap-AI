"""The embedding models on this machine, and getting rid of the ones you don't want.

Asked for directly, alongside a question worth answering here because the
answer is the reason this file is small:

> *"the embedding model doesn't redownload every time I load up the app
> right?"*

**No.** `sentence_transformers.SentenceTransformer("BAAI/bge-small-en-v1.5")`
resolves through the HuggingFace hub cache, which is a directory on disk. On
every start it makes a handful of *metadata* requests, the `HEAD .../config.json`
and `GET .../api/models/...` lines that show up in Settings → Logs and look
alarming: and then loads the weights it already has. The weights are fetched
once. With no network it falls back to `local_files_only=True`, which is the
same cache with the metadata check skipped.

What there was no way to do was *see* that, or undo it. A model is the largest
thing this app ever puts on a disk and it arrived invisibly, with no size, no
list and no way to remove it short of knowing where HuggingFace keeps its
cache. Hence: a list, a size, and install / reinstall / remove.

**The security property is `extras.py`'s, and for the same reason.** A repo id
from an HTTP request is a path fetched and written to disk, so the request
names an entry in the allowlist below and the repo id is never anything the
client sent. Removal deletes a directory, which is *why* the id may not be
client text, because a path from a request is a path traversal waiting to
happen. Every deletion is checked to be inside the cache root as well.
"""

from __future__ import annotations

import importlib.util
import logging
import os
import re
import shutil
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger("memorymap.embedmodels")


@dataclass(frozen=True)
class EmbedModel:
    """One embedding model, and the honest description of the trade."""

    #: Stable id used by the API. Never a repo id from the client.
    id: str
    #: The HuggingFace repo. Only ever read from this file.
    repo: str
    label: str
    #: What choosing it buys, in the user's terms.
    about: str
    #: Rough download size, so nobody starts one by accident on a phone tether.
    size: str
    #: True for the one the app loads unless told otherwise.
    default: bool = False
    #: INBOX 700's facts, shown on the row: parameters, languages, how much
    #: text one vector reads, and the licence as its repository states it
    #: (each read from the Hub's own metadata, 2026-10-06).
    params: str = ""
    languages: str = "English"
    context: str = "512 tokens"
    licence: str = ""
    #: One line: who should pick it.
    best_for: str = ""
    #: Whether the app may fetch and switch to it in one press. Only for a
    #: licence that allows it (Apache-2.0, MIT) **and** a model that loads
    #: without running code from its repository; anything else links to
    #: `terms_url` and says why.
    one_press: bool = True
    terms_url: str = ""
    why_not: str = ""
    #: Put in front of every text this model embeds. The E5 family and
    #: nomic were trained with one; without it their matches are measurably
    #: worse. One prefix for notes and questions alike: the app embeds both
    #: through one call, and the symmetric form is the one E5's card names
    #: for similarity between texts of the same kind.
    prefix: str = ""


#: The allowlist, and the catalogue Settings, Models offers (INBOX 700, the
#: owner: "add more embedding model options ... research the best ones
#: available today"). Each entry answers a different question: the sane
#: default, very little disk, long notes, many languages, the best matches a
#: laptop can run. Ordered small to large so the list reads as a trade.
EMBED_MODELS: tuple[EmbedModel, ...] = (
    EmbedModel(
        id="minilm",
        repo="sentence-transformers/all-MiniLM-L6-v2",
        label="MiniLM L6 (English)",
        about="Smaller and quicker, and a little blunter about what counts as "
        "similar. The one to keep on a machine that is short of disk.",
        size="~90 MB",
        params="22M",
        context="256 tokens",
        licence="Apache-2.0",
        best_for="An old or small machine: the fastest here, a little less precise.",
    ),
    EmbedModel(
        id="bge-small",
        repo="BAAI/bge-small-en-v1.5",
        label="BGE Small (English)",
        about="The default. Fast enough to embed a note as you save it, and "
        "good enough that searching by meaning beats searching by keyword.",
        size="~130 MB",
        default=True,
        params="33M",
        licence="MIT",
        best_for="Most notebooks in English: quick on any laptop, good matches.",
    ),
    EmbedModel(
        id="me5-small",
        repo="intfloat/multilingual-e5-small",
        label="Multilingual E5 Small",
        about="About a hundred languages in a small model, so notes in "
        "several languages find each other.",
        size="~470 MB",
        params="118M",
        languages="About 100 languages",
        licence="MIT",
        best_for="Notes in more than one language on an ordinary laptop.",
        prefix="query: ",
    ),
    EmbedModel(
        id="bge-base",
        repo="BAAI/bge-base-en-v1.5",
        label="BGE Base (English)",
        about="Noticeably better matches on long notes, at roughly three times "
        "the size and about twice the time to embed one.",
        size="~440 MB",
        params="110M",
        licence="MIT",
        best_for="English notes when better matches are worth a slower save.",
    ),
    EmbedModel(
        id="nomic-v1.5",
        repo="nomic-ai/nomic-embed-text-v1.5",
        label="Nomic Embed Text v1.5 (English)",
        about="Reads up to 8,000 tokens at once, so a long note is one vector "
        "of the whole rather than of its start.",
        size="~550 MB",
        params="137M",
        context="8,192 tokens",
        licence="Apache-2.0",
        best_for="Long notes and documents in English.",
        one_press=False,
        terms_url="https://huggingface.co/nomic-ai/nomic-embed-text-v1.5",
        why_not="Built in, it runs Python code from its own repository, which "
        "MemoryMap never does. The same model is nomic-embed-text in Ollama.",
        prefix="search_query: ",
    ),
    EmbedModel(
        id="qwen3-0.6b",
        repo="Qwen/Qwen3-Embedding-0.6B",
        label="Qwen3 Embedding 0.6B",
        about="The best matches here on the public benchmarks, in over a "
        "hundred languages, at the cost of memory and a slower save.",
        size="~1.2 GB",
        params="596M",
        languages="Over 100 languages",
        context="32,768 tokens",
        licence="Apache-2.0",
        best_for="The best matches, with 8 GB of memory or more to spare.",
    ),
    EmbedModel(
        id="bge-m3",
        repo="BAAI/bge-m3",
        label="BGE M3 (multilingual)",
        about="A large multilingual model that reads long notes whole.",
        size="~2.3 GB",
        params="568M",
        languages="Over 100 languages",
        context="8,192 tokens",
        licence="MIT",
        best_for="Long notes in many languages on a well-equipped machine.",
    ),
    EmbedModel(
        id="embeddinggemma",
        repo="google/embeddinggemma-300m",
        label="EmbeddingGemma 300M",
        about="Google's small multilingual model, strong for its size.",
        size="~1.2 GB",
        params="303M",
        languages="Over 100 languages",
        context="2,048 tokens",
        licence="Gemma terms",
        best_for="Multilingual notes, once you have accepted Google's terms.",
        one_press=False,
        terms_url="https://ai.google.dev/gemma/terms",
        why_not="Under Google's Gemma terms rather than an open licence, and "
        "gated on the Hub: read and accept them first, then it is "
        "embeddinggemma in Ollama.",
    ),
)

EMBED_MODELS_BY_ID = {model.id: model for model in EMBED_MODELS}
EMBED_MODELS_BY_REPO = {model.repo: model for model in EMBED_MODELS}
DEFAULT_REPO = next(model.repo for model in EMBED_MODELS if model.default)


@dataclass(frozen=True)
class OllamaEmbedModel:
    """An embedding model Ollama serves, by its Ollama name."""

    name: str
    label: str
    size: str
    languages: str
    context: str
    licence: str
    best_for: str
    one_press: bool = True
    terms_url: str = ""
    why_not: str = ""


#: Through Ollama: the model lives in Ollama, so MemoryMap stays near 100 MB
#: of memory. Licences are the upstream repositories' (read on the Hub,
#: 2026-10-06); sizes are Ollama's library pages'.
OLLAMA_EMBED_MODELS: tuple[OllamaEmbedModel, ...] = (
    OllamaEmbedModel(
        "granite-embedding", "Granite Embedding 30M", "~63 MB", "English", "512 tokens",
        "Apache-2.0", "The smallest here: a quick English index with Ollama.",
    ),
    OllamaEmbedModel(
        "nomic-embed-text", "Nomic Embed Text", "~274 MB", "English", "8,192 tokens",
        "Apache-2.0", "Long English notes, and the usual Ollama choice.",
    ),
    OllamaEmbedModel(
        "qwen3-embedding:0.6b", "Qwen3 Embedding 0.6B", "~639 MB", "Over 100 languages",
        "32,768 tokens", "Apache-2.0", "The best matches through Ollama on a laptop.",
    ),
    OllamaEmbedModel(
        "mxbai-embed-large", "mxbai Embed Large", "~670 MB", "English", "512 tokens",
        "Apache-2.0", "Precise English matches on short notes.",
    ),
    OllamaEmbedModel(
        "bge-m3", "BGE M3", "~1.2 GB", "Over 100 languages", "8,192 tokens",
        "MIT", "Long notes in many languages.",
    ),
    OllamaEmbedModel(
        "snowflake-arctic-embed2", "Snowflake Arctic Embed 2", "~1.2 GB", "About 75 languages",
        "8,192 tokens", "Apache-2.0", "Multilingual search with long context.",
    ),
    OllamaEmbedModel(
        "embeddinggemma", "EmbeddingGemma", "~622 MB", "Over 100 languages", "2,048 tokens",
        "Gemma terms", "Multilingual notes, once you have accepted Google's terms.",
        one_press=False,
        terms_url="https://ai.google.dev/gemma/terms",
        why_not="Under Google's Gemma terms rather than an open licence: read "
        "them, then pull it in Ollama yourself and pick it below.",
    ),
)

OLLAMA_EMBED_MODELS_BY_NAME = {model.name: model for model in OLLAMA_EMBED_MODELS}


def prefix_for(repo: str) -> str:
    """The text a built-in model wants in front of everything it embeds."""
    model = EMBED_MODELS_BY_REPO.get(repo)
    return model.prefix if model else ""


def catalogue() -> list[dict]:
    """Every choice Settings, Models offers, built-in and Ollama, as rows.

    `id` is what `POST /embedding-models/use` takes: an allowlist id for a
    built-in model, `ollama:<name>` for an Ollama one; never a repo id."""
    rows = []
    for model in EMBED_MODELS:
        rows.append(
            {
                "id": model.id,
                "backend": "sentence-transformers",
                "model": model.repo,
                "label": model.label,
                "size": model.size,
                "params": model.params,
                "languages": model.languages,
                "context": model.context,
                "licence": model.licence,
                "best_for": model.best_for,
                "one_press": model.one_press,
                "terms_url": model.terms_url,
                "why_not": model.why_not,
                "default": model.default,
                "downloaded": is_downloaded(model.repo),
            }
        )
    for model in OLLAMA_EMBED_MODELS:
        rows.append(
            {
                "id": f"ollama:{model.name}",
                "backend": "ollama",
                "model": model.name,
                "label": model.label,
                "size": model.size,
                "params": "",
                "languages": model.languages,
                "context": model.context,
                "licence": model.licence,
                "best_for": model.best_for,
                "one_press": model.one_press,
                "terms_url": model.terms_url,
                "why_not": model.why_not,
                "default": False,
                "downloaded": False,
            }
        )
    return rows


def resolve_choice(choice_id: str) -> tuple[str, str] | None:
    """`(backend, model)` for a catalogue id, or None for anything else,
    including an entry whose licence or loading rules forbid one press."""
    if choice_id.startswith("ollama:"):
        entry = OLLAMA_EMBED_MODELS_BY_NAME.get(choice_id.removeprefix("ollama:"))
        return ("ollama", entry.name) if entry and entry.one_press else None
    model = EMBED_MODELS_BY_ID.get(choice_id)
    return ("sentence-transformers", model.repo) if model and model.one_press else None


@dataclass
class DownloadState:
    """What one download is doing, for `/tasks` and the panel."""

    running: bool = False
    model_id: str = ""
    step: str = ""
    log: list[str] = field(default_factory=list)
    started: float = 0.0
    #: The model's name for the Background tasks row: a catalogue label, or
    #: the repo a person typed into Pull a model by name (INBOX 700).
    label: str = ""
    outcome: str = ""  # "" while running, then completed | failed
    #: Someone pressed Quit. Checked between download attempts, see
    #: `cancel()` for why that is the only place it can be checked.
    cancel_requested: bool = False


_state = DownloadState()
_lock = threading.Lock()

MAX_LOG_LINES = 60


def cache_root() -> Path:
    """Where HuggingFace keeps downloaded models on this machine.

    Read from the environment exactly as `huggingface_hub` reads it, rather
    than imported from it: this has to answer "how much disk is this using"
    on an install where `sentence-transformers` was never installed, which is
    the install where the question matters most.
    """
    for name in ("HF_HUB_CACHE", "HUGGINGFACE_HUB_CACHE"):
        value = os.environ.get(name)
        if value:
            return Path(value)
    home = os.environ.get("HF_HOME")
    if home:
        return Path(home) / "hub"
    return Path.home() / ".cache" / "huggingface" / "hub"


def _model_dir(model: EmbedModel) -> Path:
    """The cache directory for one repo. `org/name` becomes `models--org--name`
    - HuggingFace's own scheme, and the reason this is a function rather than
    a string in the dataclass: it is their layout, not ours, and if it ever
    changes there is one place to say so."""
    return cache_root() / ("models--" + model.repo.replace("/", "--"))


def is_downloaded(repo: str) -> bool:
    """Whether `repo` has weights in the cache: a snapshot holding a model
    file, not merely the folder an interrupted first request left behind."""
    snapshots = cache_root() / ("models--" + repo.replace("/", "--")) / "snapshots"
    if not snapshots.is_dir():
        return False
    for path in snapshots.rglob("*"):
        if path.suffix in (".safetensors", ".bin") and path.name.startswith(("model", "pytorch_model")):
            return True
    return False


def _dir_size(path: Path) -> int:
    total = 0
    for entry in path.rglob("*"):
        try:
            # `is_file()` follows symlinks and the hub cache is *made* of them:
            # `snapshots/` holds links into `blobs/`. Counting the target twice
            # would report double the real size, so only real files count.
            if entry.is_symlink() or not entry.is_file():
                continue
            total += entry.stat().st_size
        except OSError:
            # A file removed underneath the walk costs its bytes, not the total.
            continue
    return total


def _human_size(size: int) -> str:
    if size < 1024 * 1024:
        return f"{size / 1024:.0f} KB"
    if size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.0f} MB"
    return f"{size / (1024 * 1024 * 1024):.1f} GB"


def can_download() -> bool:
    """Whether anything here can actually fetch a model.

    `huggingface_hub` arrives with `sentence-transformers`, so on a notebook
    that never installed the semantic-search extra the answer is no, and
    saying so is much better than a download that fails with an ImportError
    the user has no way to read.
    """
    return importlib.util.find_spec("huggingface_hub") is not None


def status() -> list[dict]:
    """Every model, with whether it is on disk and what it is costing."""
    rows = []
    for model in EMBED_MODELS:
        path = _model_dir(model)
        installed = path.is_dir()
        rows.append(
            {
                "id": model.id,
                "repo": model.repo,
                "label": model.label,
                "about": model.about,
                "size": model.size,
                "default": model.default,
                "one_press": model.one_press,
                "terms_url": model.terms_url,
                "why_not": model.why_not,
                "installed": installed,
                "on_disk": _human_size(_dir_size(path)) if installed else "",
                "downloading": _state.running and _state.model_id == model.id,
            }
        )
    return rows


def current() -> DownloadState:
    return _state


def cancel() -> tuple[bool, str]:
    """Ask the running download to stop. Returns (asked, message).

    **Between attempts, not mid-file, and the message says so.**
    `snapshot_download` is one blocking call inside huggingface_hub with no
    cancellation token and no way to interrupt it short of killing the
    process, so what this can honestly promise is: no further retry, and no
    "completed" for a download nobody wants any more. A part-downloaded model
    is not wasted: the cache is resumable, which is why the wording says the
    bytes are kept rather than implying they were thrown away.

    Claiming more than that would be the worse outcome: a Quit button that
    reports success while a 400 MB download carries on is how a user learns
    not to trust the panel.
    """
    if not _state.running:
        return False, "Nothing is downloading."
    _state.cancel_requested = True
    _state.step = "Stopping after the current file…"
    return True, "It will stop after the file it is on, what's downloaded is kept."


def _log(line: str) -> None:
    _state.log.append(line)
    del _state.log[:-MAX_LOG_LINES]
    _state.step = line[:120]


#: How many times a dropped connection is retried before giving up.
#:
#: Reported from a real download: *"[WinError 10054] An existing connection was
#: forcibly closed by the remote host."* That is not a broken install or a
#: wrong repo: it is one TCP connection dying part-way through several
#: hundred megabytes, which on a domestic line is ordinary. `snapshot_download`
#: resumes from what is already in the cache, so a retry costs the bytes since
#: the last completed file rather than starting again.
DOWNLOAD_ATTEMPTS = 3

#: What a dropped connection looks like, in the words the user will see. The
#: raw exception names a Windows error code and then tells them to "check your
#: internet connection and try again", which is advice, not an explanation,
#: and it is the *second* half of a two-part message whose first half was a
#: socket error. Worth replacing, because the two failures behind it need
#: opposite responses: a drop is worth retrying, and a genuinely offline
#: machine is not.
_CONNECTION_WORDS = (
    "connection",
    "connect",
    "timed out",
    "timeout",
    "temporarily",
    "network",
    "10054",
)


def _looks_like_a_dropped_connection(exc: Exception) -> bool:
    return any(word in str(exc).lower() for word in _CONNECTION_WORDS)


def _run_download(model: EmbedModel) -> None:
    try:
        from huggingface_hub import snapshot_download

        last: Exception | None = None
        for attempt in range(1, DOWNLOAD_ATTEMPTS + 1):
            if _state.cancel_requested:
                _state.outcome = "cancelled"
                _state.step = "Stopped before it finished. What downloaded is kept."
                return
            try:
                _log(
                    f"Fetching {model.repo}…"
                    if attempt == 1
                    else f"Connection dropped: resuming ({attempt} of {DOWNLOAD_ATTEMPTS})…"
                )
                snapshot_download(repo_id=model.repo)
                if _state.cancel_requested:
                    _state.outcome = "cancelled"
                    _state.step = "Stopped just as it finished, the files are on disk."
                    return
                #: Verified, not assumed (INBOX 700, "Reinstall re-downloads
                #: and verifies"): the weights must be in the snapshot.
                if not is_downloaded(model.repo):
                    _state.outcome = "failed"
                    _state.step = f"{model.label} arrived without its weights. Reinstall fetches it again."
                    return
                _state.outcome = "completed"
                _state.step = (
                    f"{model.label} is on this machine. Pick it under Embedding "
                    "models in Settings, Search and index to search with it."
                )
                return
            except Exception as exc:  # noqa: BLE001  # retry decides, not the type
                last = exc
                if not _looks_like_a_dropped_connection(exc):
                    raise
        _state.outcome = "failed"
        _state.step = (
            f"Couldn't finish downloading {model.label}: the connection kept "
            f"dropping after {DOWNLOAD_ATTEMPTS} attempts. What is already "
            "downloaded is kept, so pressing Download again resumes rather "
            f"than starting over. ({last})"
        )
    except Exception as exc:  # noqa: BLE001  # any other failure is one report
        _state.outcome = "failed"
        _state.step = f"Couldn't download {model.label}: {exc}"
    finally:
        _state.running = False
        # The other half of "for /tasks and the panel" (this dataclass's own
        # docstring): a job that fails must not just vanish from the running
        # list, the way a re-index dying halfway used to.
        from memorymap.core import taskhistory

        taskhistory.record(
            "embedding-model",
            f"Downloading {model.label}",
            _state.outcome,
            _state.step,
            name=model.id,
            duration_ms=(time.time() - _state.started) * 1000 if _state.started else None,
        )


def start(model_id: str) -> tuple[bool, str]:
    """Begin a download. Returns (started, message). Never raises on a bad id."""
    model = EMBED_MODELS_BY_ID.get(model_id)
    if model is None:
        return False, "No such embedding model."
    if not model.one_press:
        return False, model.why_not
    if not can_download():
        return False, (
            "Downloading a model needs the huggingface_hub library, which "
            "arrives with “Search by meaning” in Settings, Packages. Install "
            "that first."
        )
    return _begin_download(model)


def _begin_download(model: EmbedModel) -> tuple[bool, str]:
    with _lock:
        if _state.running:
            return False, "Another model is already downloading."
        _state.running = True
        _state.model_id = model.id
        _state.label = model.label
        _state.outcome = ""
        _state.step = "starting…"
        _state.log = []
        _state.started = time.time()
        _state.cancel_requested = False
    _spawn_download(model)
    return True, f"Downloading {model.label}."


def _spawn_download(model: EmbedModel) -> None:
    threading.Thread(target=_run_download, args=(model,), daemon=True).start()


# -- Pull a model by name (INBOX 700, the owner's second addendum) -------------

#: A Hugging Face repo id: owner/name, each part starting with a letter or
#: digit, so no `..` and no path can be spelled with it.
_HF_REPO = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}/[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$")

#: Licences a typed repo may have and still be fetched in one press: the
#: open ones, the rule the catalogue keeps (Apache-2.0, MIT and their kin).
OPEN_LICENCES = frozenset({"apache-2.0", "mit", "bsd-2-clause", "bsd-3-clause", "cc-by-4.0", "cc-by-sa-4.0", "cc0-1.0"})

_ST_FILES = ("modules.json", "config_sentence_transformers.json")


def parse_typed_name(text: str) -> tuple[str | None, str]:
    """("hf", repo), ("ollama", name) or (None, why) for a typed name.

    owner/name with no tag is a Hugging Face repo; anything with a tag, or
    no owner, is an Ollama name, checked by the same rules as Settings,
    Models' "Download another model" (`model_cards.inspect_model_name`)."""
    text = (text or "").strip()
    if not text or ".." in text or any(ch.isspace() for ch in text):
        return None, "Type a Hugging Face repo (owner/name) or an Ollama name (name:tag)."
    if ":" not in text and _HF_REPO.match(text):
        return "hf", text
    from memorymap.ai import model_cards

    info = model_cards.inspect_model_name(text)
    if not info.get("valid"):
        return None, info.get("error") or "That is not a model name."
    return "ollama", info["name"]


def hub_metadata(repo: str) -> dict | None:
    """The Hub's own record of `repo` (files, tags, licence), or None when
    there is no such model. Called only on a Pull click: the one network
    request on this screen besides a download, and said so beside the box.

    Asked through `huggingface_hub` (already required before a pull, see
    `can_download`), whose `model_info` takes the repo id as an id, not as a
    piece of a URL this code builds, and which always talks to the Hub's own
    endpoint. The id is still checked against `_HF_REPO` first."""
    if not _HF_REPO.match(repo or ""):
        return None
    from huggingface_hub import HfApi
    from huggingface_hub.utils import GatedRepoError, RepositoryNotFoundError

    try:
        info = HfApi().model_info(repo, timeout=15)
    except GatedRepoError:
        return {"siblings": [], "tags": [], "cardData": {}, "gated": True}
    except RepositoryNotFoundError:
        return None
    card = getattr(info, "card_data", None)
    licence = getattr(card, "license", None) if card is not None else None
    return {
        "siblings": [{"rfilename": sibling.rfilename} for sibling in (info.siblings or [])],
        "tags": list(info.tags or []),
        "cardData": {"license": licence} if licence else {},
        "gated": bool(info.gated),
    }


def hub_refusal(meta: dict) -> str:
    """Why the built-in engine cannot use this repo, or "" when it can."""
    names = {str(item.get("rfilename", "")) for item in meta.get("siblings") or []}
    tags = {str(tag) for tag in meta.get("tags") or []}
    if not any(name in names for name in _ST_FILES):
        if any(name.lower().endswith(".gguf") for name in names):
            return "It holds GGUF files, which the built-in engine can't load. Pull it in Ollama instead."
        return "It isn't in sentence-transformers' format, so the built-in engine can't load it."
    if not any(
        name.rsplit("/", 1)[-1].startswith(("model", "pytorch_model")) and name.endswith((".safetensors", ".bin"))
        for name in names
    ):
        return "It has no weights the built-in engine can read."
    if "custom_code" in tags:
        return "It needs Python code from its own repository to load, which MemoryMap never runs."
    if meta.get("gated"):
        return "It is gated behind terms on Hugging Face: read and accept them there first."
    licence = str((meta.get("cardData") or {}).get("license") or "")
    if not licence:
        licence = next((tag.split(":", 1)[1] for tag in tags if tag.startswith("license:")), "")
    if not licence:
        return "It states no licence, so it is not fetched in one press."
    if licence.lower() not in OPEN_LICENCES:
        return f"Its licence is {licence}, not an open one MemoryMap fetches in one press: read its terms on Hugging Face."
    return ""


def start_typed(repo: str) -> tuple[bool, str]:
    """Check `repo` on the Hub and, if the engine can use it, download it as
    a Background task. The repo id was matched by `_HF_REPO` and is then
    confirmed by the Hub itself before anything is written."""
    if not _HF_REPO.match(repo or ""):
        return False, "Type a Hugging Face repo as owner/name."
    if repo in EMBED_MODELS_BY_REPO:
        entry = EMBED_MODELS_BY_REPO[repo]
        return start(entry.id) if entry.one_press else (False, entry.why_not)
    if not can_download():
        return False, (
            "Downloading a model needs the huggingface_hub library, which "
            "arrives with “Search by meaning” in Settings, Packages. Install "
            "that first."
        )
    try:
        meta = hub_metadata(repo)
    except Exception:  # noqa: BLE001  # offline, refused or odd: one sentence
        logger.info("couldn't reach Hugging Face to check a typed model name", exc_info=True)
        return False, "Couldn't reach Hugging Face to check that name. Check the connection and try again."
    if meta is None:
        return False, f"No model called {repo} on Hugging Face."
    why = hub_refusal(meta)
    if why:
        return False, why
    return _begin_download(EmbedModel(id="typed", repo=repo, label=repo, about="", size=""))


def remove(model_id: str) -> tuple[bool, str]:
    """Delete one model from the cache.

    No undo and none implied, it is a re-download, which is why the wording
    says so rather than warning about loss. What it must never be is a way to
    delete something else: the id is an allowlist key, and the path is checked
    to be under the cache root before anything is removed. Both, because the
    first is the rule and the second is what catches the day somebody adds an
    entry with a repo id containing `..`.
    """
    model = EMBED_MODELS_BY_ID.get(model_id)
    if model is None:
        return False, "No such embedding model."
    if _state.running and _state.model_id == model.id:
        return False, "That model is downloading right now."
    #: Never the one search uses (INBOX 700): switch first, then remove.
    if _in_use(model.repo):
        return False, f"{model.label} is in use for search: switch to another model first, then remove it."
    path = _model_dir(model)
    root = cache_root()
    try:
        resolved = path.resolve()
        if not resolved.is_relative_to(root.resolve()):
            return False, "Refusing to delete outside the model cache."
    except OSError:
        # The exception text carries the full filesystem path (and on some
        # platforms more besides), and this string is returned straight to the
        # browser by `DELETE /embedding-models/{id}`. Flagged by CodeQL as
        # `py/stack-trace-exposure`. Logged in full where only the owner of the
        # machine can read it; the caller gets the fact, not the internals.
        logger.warning("couldn't resolve the cache path for %s", model.id, exc_info=True)
        return False, "Couldn't check where that model is stored."
    if not path.is_dir():
        return False, f"{model.label} isn't on this machine."
    try:
        shutil.rmtree(path)
    except OSError:
        logger.warning("couldn't remove %s from the cache", model.id, exc_info=True)
        return False, (
            f"Couldn't remove {model.label}: see Settings → Logs for why. "
            "It may be in use by a running model."
        )
    return True, f"{model.label} removed. Downloading it again is one click."


def _in_use(repo: str) -> bool:
    try:
        from memorymap.core import deps

        manager = deps.get_model_manager()
        return manager.embedding_backend() != "ollama" and manager.embedding_st_model() == repo
    except Exception:  # noqa: BLE001  # no app (a script): nothing is in use
        return False


def reset_for_tests() -> None:
    """Process-global state, like the extras installer, tests have to clear it
    or one test's download leaks into the next one's assertions."""
    global _state
    _state = DownloadState()
