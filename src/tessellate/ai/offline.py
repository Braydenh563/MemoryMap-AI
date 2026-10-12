"""What would make the AI work, said from what is actually true.

Asked for directly (INBOX 272, the owner): *"make sure all features and
alternatives are easily knoticable by and offered for the user... and same for
many other instances."*

Every message in this app that reports the model being unavailable says "start
Ollama". None of them says how, and none of them can tell the two situations
apart, because both look identical from inside: a probe to `/api/tags` that
did not answer. They are not the same situation at all. Somebody who has never
installed Ollama is told to start a program they do not have; somebody whose
Ollama is running on a different port is told to start one that is already
running.

`shutil.which` separates them for the cost of a path lookup, and the two get
different sentences: install it, or start it and check the address. Both name
somewhere to go.

**This is a hint, not a diagnosis.** A packaged Ollama that is not on `PATH`
reads as "not installed" here, so the wording never claims certainty ("does
not look like"), and the install sentence still points at Settings for the
person whose copy simply lives somewhere unusual.
"""
from __future__ import annotations

import shutil

#: Cached for the process: `shutil.which` walks `PATH` on every call, these
#: messages are produced on a path a person is already waiting on, and a
#: program does not get installed halfway through a chat turn.
#:
#: A sentinel rather than `None`, because `None` is a real answer here ("no
#: Ollama on PATH") and caching it as "not looked yet" would make the lookup
#: run on every call for exactly the people the cache is for.
_UNKNOWN = object()
_binary: str | None | object = _UNKNOWN


def ollama_binary() -> str | None:
    """Where Ollama is, or None. Looked up once per process."""
    global _binary
    if _binary is _UNKNOWN:
        _binary = shutil.which("ollama")
    return _binary  # type: ignore[return-value]


def forget_ollama_binary() -> None:
    """Drop the cached lookup, for tests and for anything that could plausibly
    have installed one since."""
    global _binary
    _binary = _UNKNOWN


def ollama_hint(base_url: str = "") -> str:
    """One sentence naming the way out, chosen from what is true.

    Ends without a full stop's worth of ceremony: callers join it onto their
    own first sentence, so it reads as the second half of one thought rather
    than as a second message bolted on.
    """
    where = f" on {base_url}" if base_url else ""
    if ollama_binary():
        return (
            f"It is installed but not answering{where}: run 'ollama serve', or "
            "check the address in Settings, Models."
        )
    return (
        "It does not look like Ollama is installed on this machine. It is a "
        "free download from ollama.com, and everything here that is not AI "
        "keeps working without it."
    )


def offline_message(lead: str, base_url: str = "") -> str:
    """`lead`, then the hint. One join, so every caller spaces it the same."""
    return f"{lead.rstrip()} {ollama_hint(base_url)}".strip()
