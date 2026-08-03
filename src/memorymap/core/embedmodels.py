"""The embedding models on this machine, and getting rid of the ones you don't want.

Asked for directly, alongside a question worth answering here because the
answer is the reason this file is small:

> *"the embedding model doesn't redownload every time I load up the app
> right?"*

**No.** `sentence_transformers.SentenceTransformer("BAAI/bge-small-en-v1.5")`
resolves through the HuggingFace hub cache, which is a directory on disk. On
every start it makes a handful of *metadata* requests — the `HEAD .../config.json`
and `GET .../api/models/...` lines that show up in Settings → Logs and look
alarming — and then loads the weights it already has. The weights are fetched
once. With no network it falls back to `local_files_only=True`, which is the
same cache with the metadata check skipped.

What there was no way to do was *see* that, or undo it. A model is the largest
thing this app ever puts on a disk and it arrived invisibly, with no size, no
list and no way to remove it short of knowing where HuggingFace keeps its
cache. Hence: a list, a size, and install / reinstall / remove.

**The security property is `extras.py`'s, and for the same reason.** A repo id
from an HTTP request is a path fetched and written to disk, so the request
names an entry in the allowlist below and the repo id is never anything the
client sent. Removal deletes a directory — which is *why* the id may not be
client text, because a path from a request is a path traversal waiting to
happen. Every deletion is checked to be inside the cache root as well.
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path


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


#: The allowlist. Three, not thirty: this is a personal notebook, and a list
#: long enough to need its own search is a list nobody can choose from. Each
#: entry is here because it answers a different question — "the sane default",
#: "I have very little disk", "I want the best matches and have the RAM".
EMBED_MODELS: tuple[EmbedModel, ...] = (
    EmbedModel(
        id="bge-small",
        repo="BAAI/bge-small-en-v1.5",
        label="BGE Small (English)",
        about="The default. Fast enough to embed a note as you save it, and "
        "good enough that searching by meaning beats searching by keyword.",
        size="~130 MB",
        default=True,
    ),
    EmbedModel(
        id="minilm",
        repo="sentence-transformers/all-MiniLM-L6-v2",
        label="MiniLM L6 (English)",
        about="Smaller and quicker, and a little blunter about what counts as "
        "similar. The one to keep on a machine that is short of disk.",
        size="~90 MB",
    ),
    EmbedModel(
        id="bge-base",
        repo="BAAI/bge-base-en-v1.5",
        label="BGE Base (English)",
        about="Noticeably better matches on long notes, at roughly three times "
        "the size and about twice the time to embed one.",
        size="~440 MB",
    ),
)

EMBED_MODELS_BY_ID = {model.id: model for model in EMBED_MODELS}


@dataclass
class DownloadState:
    """What one download is doing, for `/tasks` and the panel."""

    running: bool = False
    model_id: str = ""
    step: str = ""
    log: list[str] = field(default_factory=list)
    started: float = 0.0
    outcome: str = ""  # "" while running, then completed | failed


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
    — HuggingFace's own scheme, and the reason this is a function rather than
    a string in the dataclass: it is their layout, not ours, and if it ever
    changes there is one place to say so."""
    return cache_root() / ("models--" + model.repo.replace("/", "--"))


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
    that never installed the semantic-search extra the answer is no — and
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
                "installed": installed,
                "on_disk": _human_size(_dir_size(path)) if installed else "",
                "downloading": _state.running and _state.model_id == model.id,
            }
        )
    return rows


def current() -> DownloadState:
    return _state


def _log(line: str) -> None:
    _state.log.append(line)
    del _state.log[:-MAX_LOG_LINES]
    _state.step = line[:120]


def _run_download(model: EmbedModel) -> None:
    try:
        from huggingface_hub import snapshot_download

        _log(f"Fetching {model.repo}…")
        snapshot_download(repo_id=model.repo)
        _state.outcome = "completed"
        _state.step = (
            f"{model.label} is on this machine. Searching by meaning uses it "
            "from here on — no restart needed."
        )
    except Exception as exc:  # noqa: BLE001 — any failure is the same report
        _state.outcome = "failed"
        _state.step = f"Couldn't download {model.label}: {exc}"
    finally:
        _state.running = False


def start(model_id: str) -> tuple[bool, str]:
    """Begin a download. Returns (started, message). Never raises on a bad id."""
    model = EMBED_MODELS_BY_ID.get(model_id)
    if model is None:
        return False, "No such embedding model."
    if not can_download():
        return False, (
            "Downloading a model needs the huggingface_hub library, which "
            "arrives with “Search by meaning” in Optional extras. Install "
            "that first."
        )
    with _lock:
        if _state.running:
            return False, "Another model is already downloading."
        _state.running = True
        _state.model_id = model.id
        _state.outcome = ""
        _state.step = "starting…"
        _state.log = []
        _state.started = time.time()
    threading.Thread(target=_run_download, args=(model,), daemon=True).start()
    return True, f"Downloading {model.label}."


def remove(model_id: str) -> tuple[bool, str]:
    """Delete one model from the cache.

    No undo and none implied — it is a re-download, which is why the wording
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
    path = _model_dir(model)
    root = cache_root()
    try:
        resolved = path.resolve()
        if not resolved.is_relative_to(root.resolve()):
            return False, "Refusing to delete outside the model cache."
    except OSError as exc:
        return False, f"Couldn't check that path: {exc}"
    if not path.is_dir():
        return False, f"{model.label} isn't on this machine."
    try:
        shutil.rmtree(path)
    except OSError as exc:
        return False, f"Couldn't remove {model.label}: {exc}"
    return True, f"{model.label} removed. Downloading it again is one click."


def reset_for_tests() -> None:
    """Process-global state, like the extras installer — tests have to clear it
    or one test's download leaks into the next one's assertions."""
    global _state
    _state = DownloadState()
