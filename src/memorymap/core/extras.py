"""Optional extras, installed from inside the app.

Asked for directly: *"I want a way to install optional extra dependencies like
faster whisper and other things like maybe markitdown, llama.cpp or smth in the
settings."*

Every one of these is a feature the app already has a button for and cannot
run: the 🎙 dictation buttons need `faster-whisper`, `python -m memorymap
--desktop` needs `pywebview`, semantic search falls back to keywords without
`sentence-transformers`. Until now the only way to turn one on was a terminal
and a README, which for a local-first app aimed at somebody who is not a
developer is the same as not having the feature.

Three properties this deliberately has:

- **An allowlist, never a free-text package name.** The name arrives from an
  HTTP request. `pip install <whatever the body said>` is arbitrary code
  execution by design, and no amount of validating the string afterwards makes
  that safe — so the request selects an *entry from this file* and the package
  spec is never anything the client sent.
- **It reports the truth about a restart.** A package installed into a running
  interpreter is not importable by it in any way worth relying on, so every
  entry says so rather than pretending the feature is now on.
- **It runs as a background job like everything else**, which means the status
  bar and Settings → Background tasks show it without either of them learning
  anything new — see `routes_tasks.py`.
"""

from __future__ import annotations

import importlib.util
import subprocess  # noqa: S404 — fixed args, no shell; see _install below
import sys
import threading
import time
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Extra:
    """One optional dependency, and the honest description of what it buys."""

    #: Stable id used by the API. Never a package name from the client.
    id: str
    label: str
    #: What turns on when it is installed, in the user's terms.
    enables: str
    #: Exactly what goes to pip. A tuple because some extras are several
    #: packages that are useless apart.
    packages: tuple[str, ...]
    #: The module to import to find out whether it is already there. Import
    #: rather than `pip show`: what matters is whether *this* interpreter can
    #: use it, which is a different question from whether pip put it somewhere.
    module: str
    #: Rough download size, so nobody starts a 2 GB install by accident.
    size: str
    #: Said on the card, before the button is pressed.
    caveat: str = ""
    #: Why this cannot be installed *yet*, or "" when it can be.
    #:
    #: Two of these extras install a library the app does not call anywhere:
    #: markitdown has no import button behind it and llama-cpp-python is not
    #: wired into the chat backend. Both said so in their caveat and both still
    #: offered a working Install — which spends the user's disk and their time
    #: on a feature that does not exist, and then asks them to restart for it.
    #: A caveat under an enabled button is a warning people click past; a
    #: disabled button with the reason beside it is the same sentence made
    #: true.
    #:
    #: It is enforced in `start()` as well as drawn in the interface. The
    #: greyed-out button is a courtesy, the refusal is the rule — this file is
    #: the allowlist, so "installable" belongs here and not in `app.js`.
    #: Removal is deliberately *not* blocked: an extra installed before it was
    #: marked unavailable, or installed by hand, still needs its way out.
    unavailable: str = ""


#: The allowlist. Adding an entry here is the only way to make something
#: installable, which is the point.
EXTRAS: tuple[Extra, ...] = (
    Extra(
        id="voice",
        label="Voice notes (faster-whisper)",
        enables="The 🎙 buttons: speak a note or a question and have it typed "
        "out, transcribed on this machine.",
        packages=("faster-whisper",),
        module="faster_whisper",
        size="~50 MB, plus a model on first use",
    ),
    Extra(
        id="desktop",
        label="Desktop window (pywebview)",
        enables="Runs MemoryMap in its own app window instead of a browser tab "
        "— `python -m memorymap --desktop`.",
        packages=("pywebview",),
        module="webview",
        size="~5 MB",
    ),
    Extra(
        id="semantic",
        label="Search by meaning (sentence-transformers)",
        enables="Searching for what you meant rather than the words you used. "
        "Without it, search falls back to keywords and everything else works.",
        packages=("sentence-transformers",),
        module="sentence_transformers",
        size="~2 GB — it pulls in PyTorch",
        caveat="The big one. On Windows this needs the CPU build of torch; see "
        "the README's troubleshooting section if the install fails with "
        "a DLL error.",
    ),
    Extra(
        id="documents",
        label="Import documents (markitdown)",
        enables="Turns PDFs, Word files and slides into notes — the "
        "'Import a document' button in Settings → Import & export.",
        packages=("markitdown",),
        module="markitdown",
        size="~20 MB",
    ),
    Extra(
        id="localllm",
        label="Built-in model runner (llama-cpp-python)",
        enables="Runs a GGUF model in this process, for machines where "
        "installing Ollama is not an option.",
        packages=("llama-cpp-python",),
        module="llama_cpp",
        size="~30 MB, and it compiles on some platforms",
        unavailable="Not wired into the chat backend yet — Ollama and any "
        "OpenAI-compatible server are the supported paths today, so this "
        "would install a library nothing asks for. It compiles on some "
        "platforms, which makes it an expensive thing to install for nothing.",
    ),
)

EXTRAS_BY_ID = {extra.id: extra for extra in EXTRAS}


@dataclass
class InstallState:
    """What one install is doing, for `/tasks` and the panel."""

    running: bool = False
    extra_id: str = ""
    step: str = ""
    log: list[str] = field(default_factory=list)
    started: float = 0.0
    outcome: str = ""  # "" while running, then completed | failed


#: One at a time, process-wide. Two pips against one environment is a way to
#: corrupt it, and there is no reason to want it.
_state = InstallState()
_lock = threading.Lock()

#: Bounded, like the SearXNG installer's log: this is a progress indicator, not
#: a build record, and pip on a large wheel prints a great deal.
MAX_LOG_LINES = 200


def is_installed(extra: Extra) -> bool:
    """Can this interpreter import it *right now*?

    `find_spec` rather than a real import: importing torch to answer a status
    question would cost seconds and a great deal of memory on a screen the user
    is only looking at.
    """
    try:
        return importlib.util.find_spec(extra.module) is not None
    except (ImportError, ValueError):
        # A half-installed package can raise here rather than returning None.
        # "Not usable" is the honest answer either way.
        return False


def status() -> list[dict]:
    """Every extra, with whether it is installed and whether it is installing."""
    return [
        {
            "id": extra.id,
            "label": extra.label,
            "enables": extra.enables,
            "size": extra.size,
            "caveat": extra.caveat,
            "unavailable": extra.unavailable,
            "packages": list(extra.packages),
            "installed": is_installed(extra),
            "installing": _state.running and _state.extra_id == extra.id,
        }
        for extra in EXTRAS
    ]


def current() -> InstallState:
    return _state


def _run_uninstall(extra: Extra) -> None:
    """pip uninstall, with the same bookkeeping the install has.

    Only the packages this entry named, never their dependencies: removing
    `sentence-transformers` leaves torch behind, which is right — it is 2 GB
    that something else may be using, and a button labelled "uninstall one
    thing" must not quietly take five.
    """
    try:
        command = [
            sys.executable,
            "-m",
            "pip",
            "uninstall",
            "-y",
            "--disable-pip-version-check",
            *extra.packages,
        ]
        _state.step = f"pip uninstall {' '.join(extra.packages)}"
        process = subprocess.Popen(  # noqa: S603 — fixed args from the allowlist, no shell
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        for line in process.stdout or []:
            line = line.rstrip()
            if not line:
                continue
            _state.log.append(line)
            del _state.log[:-MAX_LOG_LINES]
            _state.step = line[:120]
        code = process.wait()
        _state.outcome = "completed" if code == 0 else "failed"
        _state.step = (
            f"{extra.label} removed — restart MemoryMap to free it."
            if code == 0
            else f"pip exited with code {code}. The log above says why."
        )
    except (OSError, subprocess.SubprocessError) as exc:
        _state.outcome = "failed"
        _state.step = f"Couldn't run pip: {exc}"
    finally:
        _state.running = False


def _run_install(extra: Extra, reinstall: bool = False) -> None:
    """pip, in a worker thread, with its output kept for the panel."""
    try:
        # `sys.executable -m pip` and never a bare `pip`: the app may well be
        # running inside a venv whose pip is not the one on PATH, and installing
        # into the wrong environment looks exactly like an install that did
        # nothing.
        command = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            # A reinstall is for the case the button exists to serve: it is
            # importable but broken — a half-finished download, a wheel built
            # for the wrong platform, the Windows torch DLL the README warns
            # about. `--upgrade` would look at the version, decide it already
            # has it and do nothing at all, which is the one outcome that
            # helps nobody. `--no-cache-dir` for the same reason: a corrupt
            # cached wheel would otherwise be reinstalled faithfully.
            *(["--force-reinstall", "--no-cache-dir"] if reinstall else []),
            *extra.packages,
        ]
        _state.step = f"pip install {' '.join(extra.packages)}"
        process = subprocess.Popen(  # noqa: S603 — fixed args from the allowlist, no shell
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        for line in process.stdout or []:
            line = line.rstrip()
            if not line:
                continue
            _state.log.append(line)
            del _state.log[:-MAX_LOG_LINES]
            _state.step = line[:120]
        code = process.wait()
        _state.outcome = "completed" if code == 0 else "failed"
        _state.step = (
            f"{extra.label} installed — restart MemoryMap to use it."
            if code == 0
            else f"pip exited with code {code}. The log above says why."
        )
    except (OSError, subprocess.SubprocessError) as exc:
        _state.outcome = "failed"
        _state.step = f"Couldn't run pip: {exc}"
    finally:
        _state.running = False


def start(extra_id: str, reinstall: bool = False) -> tuple[bool, str]:
    """Begin an install. Returns (started, message).

    Never raises on a bad id — the id comes from a request, and an unknown one
    is a thing to report rather than a stack trace.

    `reinstall` is the escape hatch for the state this cannot detect: the module
    imports, so the app reports it installed, and it does not actually work.
    Detection is `find_spec`, which answers "is it there", not "is it sound".
    """
    extra = EXTRAS_BY_ID.get(extra_id)
    if extra is None:
        return False, "No such extra."
    # Checked before the lock and before `reinstall` is considered: an extra
    # nothing calls is not made installable by asking twice.
    if extra.unavailable:
        return False, f"{extra.label} isn't ready to install yet. {extra.unavailable}"
    with _lock:
        if _state.running:
            return False, "Another install is already running."
        if is_installed(extra) and not reinstall:
            return False, f"{extra.label} is already installed."
        _state.running = True
        _state.extra_id = extra.id
        _state.outcome = ""
        _state.step = "starting pip…"
        _state.log = []
        _state.started = time.time()
    threading.Thread(target=_run_install, args=(extra, reinstall), daemon=True).start()
    return True, f"{'Reinstalling' if reinstall else 'Installing'} {extra.label}."


def remove(extra_id: str) -> tuple[bool, str]:
    """Uninstall one extra. Same allowlist, same one-at-a-time rule.

    Deliberately does *not* refuse when the module is missing: an extra can be
    half-installed — pip's metadata present and the module unimportable — and
    the button that would fix that is this one.
    """
    extra = EXTRAS_BY_ID.get(extra_id)
    if extra is None:
        return False, "No such extra."
    with _lock:
        if _state.running:
            return False, "Another install is already running."
        _state.running = True
        _state.extra_id = extra.id
        _state.outcome = ""
        _state.step = "starting pip…"
        _state.log = []
        _state.started = time.time()
    threading.Thread(target=_run_uninstall, args=(extra,), daemon=True).start()
    return True, f"Removing {extra.label}."


def reset_for_tests() -> None:
    """Process-global state, like the job registry — tests have to clear it or
    one test's install leaks into the next one's assertions."""
    global _state
    _state = InstallState()
