"""needle, a small tool-calling model run in this process (INBOX 302).

The owner, 2026-09-24: "Yes, as an extra" (opt-in, telemetry forced off).
The repository read (ANALYSIS.md, "Twenty-four repositories read", needle)
named the one thing it would buy: the agent works on a machine with no
Ollama and no model server at all. needle is a 121M-parameter model from
Cactus Compute (Apache-2.0, code and weights) that does three things, tool
calls, extraction and embeddings, with a decode grammar that makes an
unparseable call impossible. It writes no prose, and this provider does not
pretend it does.

**How it runs.** The `needle` extra (`core/extras.py`) downloads the prebuilt
engine for this platform, `libneedle3`, and the `needle3.cact` weights into
the data dir. This module loads the library with `ctypes`, hands it the
weights once, and speaks the five-function C API its header declares
(`needle_load`, `needle_init`, `needle_complete`, `needle_reset`,
`needle_last_error`). The engine is one process-global model and not
thread-safe, so every call holds `_lock`. The `cactus-needle` Python package
is not used: it would fetch from Hugging Face at first use and carries its
own telemetry client.

**Telemetry is off before the library loads.** needle's README: "By default,
telemetry is turned on in the binary. To turn it off, set environment
variables NEEDLE_TELEMETRY=0 and DO_NOT_TRACK=1." Both are written into this
process's environment (which `getenv` in the library reads) before
`ctypes.CDLL` runs, every time, whatever the user's shell had. Measured
2026-09-24 on the pinned linux-x86_64 engine: `nm -D libneedle3.so` imports
no `getenv`, `socket`, `connect` or `send`, and `strings` finds no URL and
no telemetry name, so that library has no way to phone home; the README's
sentence is presumably about needle's command-line binary and its Python
package, neither of which is used here. The variables are set anyway,
because the other platforms' engines were not read and the promise is cheap
to keep. Not verified: a packet capture of a real run.

**Only imported when installed.** `ai/tool_fallback.py` asks the extra's
folder first and imports this module only when it is there, so an app
without the extra never loads it (`tests/test_needle_provider.py` starts a
fresh interpreter to hold that).

**What the agent gets.** `chat_tools` takes the newest user message and the
offered tools (the app's own OpenAI-shaped schemas, unwrapped), and returns
needle's calls in the agent's shape. Not the app's system prompt: needle's
context is small and its grammar does the job the prompt's rules do for a
chat model. Once the tools have run, there is no model to write the reply,
so the turn ends with what the tools themselves said. A request no tool
fits says so in one line. Measured on the pinned engine in this sandbox's
CPU: 9 to 11 s per call (4 to 8 tokens a second), 102 MB resident; a real
desktop will differ.
"""

from __future__ import annotations

import ctypes
import json
import os
import sys
import threading
import time
from collections.abc import Iterator
from pathlib import Path

from memorymap.ai.provider import Provider, ProviderError, normalise_tool_calls

#: Written into the environment before the engine loads (see the docstring).
TELEMETRY_OFF = {"NEEDLE_TELEMETRY": "0", "DO_NOT_TRACK": "1"}

#: The name the agent's stats and Settings show.
MODEL_NAME = "needle3"

#: needle's calls are short; this bounds a runaway decode.
MAX_NEW_TOKENS = 256

#: The reply for a request no offered tool fits: needle returns no calls
#: rather than a guess, and there is no model here to write anything else.
NO_TOOL_FITS = (
    "None of my tools fits that, and a written answer needs a model server "
    "such as Ollama (Settings, Models)."
)

_lock = threading.Lock()
_engine: _Engine | None = None


def library_name() -> str:
    """The engine's file name on this platform, as the extra unpacks it."""
    if sys.platform == "darwin":
        return "libneedle3.dylib"
    if sys.platform == "win32":
        return "libneedle3.dll"
    return "libneedle3.so"


def _folder() -> Path | None:
    from memorymap.core import extra_downloads

    return extra_downloads.ready("needle")


def _load_library(path: str):
    """`ctypes.CDLL`, as a seam the tests replace with a fake engine."""
    return ctypes.CDLL(path)


class _Engine:
    """The loaded library and the weights in it. One per process."""

    def __init__(self, folder: Path) -> None:
        # Before the library is loaded, and before anything in it can read
        # them: the whole point of the owner's "telemetry forced off".
        os.environ.update(TELEMETRY_OFF)
        lib = _load_library(str(folder / library_name()))
        lib.needle_init.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p]
        lib.needle_init.restype = ctypes.c_int
        lib.needle_complete.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
        lib.needle_complete.restype = ctypes.c_int
        lib.needle_load.argtypes = [ctypes.c_char_p, ctypes.c_uint64]
        lib.needle_load.restype = ctypes.c_int
        lib.needle_reset.argtypes = []
        lib.needle_reset.restype = None
        lib.needle_last_error.argtypes = []
        lib.needle_last_error.restype = ctypes.c_char_p
        weights = (folder / "needle3.cact").read_bytes()
        if lib.needle_load(weights, len(weights)) < 0:
            raise ProviderError(f"needle could not load its weights: {self._error(lib)}")
        self.lib = lib
        self._bound: tuple[bytes, bytes] | None = None
        self._buffer = ctypes.create_string_buffer(65536)

    @staticmethod
    def _error(lib) -> str:
        try:
            raw = lib.needle_last_error()
        except Exception:  # noqa: BLE001  # the reason is a courtesy
            return "no reason given"
        if isinstance(raw, bytes):
            return raw.decode("utf-8", "replace") or "no reason given"
        return str(raw or "no reason given")

    def complete(self, system: str, tools_json: str, text: str) -> dict:
        """One tool-calling turn. Holds the process-wide lock throughout."""
        key = (system.encode("utf-8"), tools_json.encode("utf-8"))
        with _lock:
            if key != self._bound:
                if self.lib.needle_init(key[0], key[1], None) < 0:
                    self._bound = None
                    raise ProviderError(f"needle could not take these tools: {self._error(self.lib)}")
                self._bound = key
            # Every turn stands alone: the agent sends the whole request each
            # time, and needle's own history would only repeat it.
            self.lib.needle_reset()
            code = self.lib.needle_complete(
                text.encode("utf-8"), MAX_NEW_TOKENS, self._buffer, len(self._buffer)
            )
            if code < 0:
                raise ProviderError(f"needle failed: {self._error(self.lib)}")
            raw = self._buffer.value.decode("utf-8", "replace")
        try:
            answer = json.loads(raw)
        except ValueError as exc:
            raise ProviderError("needle answered with something that is not JSON.") from exc
        return answer if isinstance(answer, dict) else {}


def _get_engine() -> _Engine:
    global _engine
    with _lock:
        if _engine is None:
            folder = _folder()
            if folder is None:
                raise ProviderError("The needle extra is not installed.")
            _engine = _Engine(folder)
        return _engine


def loaded() -> bool:
    """Is the engine mapped into this process? `core/extras.py` asks before
    removing the extra: Windows cannot delete a loaded DLL."""
    return _engine is not None


def reset_for_tests() -> None:
    global _engine
    _engine = None


def _text(content) -> str:
    """A message's words, whether a string or a list of parts."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            str(part.get("text") or "") for part in content if isinstance(part, dict)
        ).strip()
    return ""


def _date_fact() -> str:
    """What needle's own package adds so "tomorrow" means something."""
    return time.strftime("Today is %A, %Y-%m-%d.")


class NeedleProvider(Provider):
    """A `Provider` that can only call tools. See the module docstring."""

    name = "needle"

    def _engine(self) -> _Engine:
        return _get_engine()

    # --- what a backend reports ---------------------------------------------------

    def context_length(self, model: str) -> int | None:
        return None

    def is_running(self) -> bool:
        return _folder() is not None

    def list_models(self) -> list[dict]:
        return [{"name": MODEL_NAME, "size": 0, "modified_at": ""}]

    def supports(self, model: str, capability: str) -> bool | None:
        return capability == "tools"

    # --- generation ---------------------------------------------------------------

    def chat(self, model: str, messages: list[dict], mode: str | None = None) -> dict:
        raise ProviderError(
            "needle picks tools and writes no replies. A written answer needs a "
            "model server such as Ollama (Settings, Models)."
        )

    def chat_stream(self, model: str, messages: list[dict], mode: str | None = None):
        raise ProviderError(
            "needle picks tools and writes no replies. A written answer needs a "
            "model server such as Ollama (Settings, Models)."
        )

    def embed(self, model: str, text: str) -> list[float]:
        raise ProviderError("needle is not used for search here.")

    def chat_tools(
        self,
        model: str,
        messages: list[dict],
        tools: list[dict],
        mode: str | None = None,
    ) -> dict:
        started = time.monotonic()
        last = messages[-1] if messages else {}
        if last.get("role") == "tool":
            # The tools have run. There is no model to write the reply, so the
            # reply is what they said, in order, since the last request.
            said = []
            for message in reversed(messages):
                if message.get("role") != "tool":
                    break
                said.append(_text(message.get("content")).strip()[:600])
            return self._reply("\n".join(reversed([s for s in said if s])) or "Done.", [], started)

        text = next(
            (_text(m.get("content")) for m in reversed(messages) if m.get("role") == "user"), ""
        )
        schemas = [t["function"] for t in tools or [] if isinstance(t, dict) and t.get("function")]
        answer = self._engine().complete(_date_fact(), json.dumps(schemas), text)
        raw_calls = [
            {"function": {"name": c.get("name", ""), "arguments": c.get("arguments") or {}}}
            for c in answer.get("function_calls") or []
            if isinstance(c, dict)
        ]
        return self._reply("" if raw_calls else NO_TOOL_FITS, raw_calls, started, answer)

    def chat_tools_stream(
        self,
        model: str,
        messages: list[dict],
        tools: list[dict],
        mode: str | None = None,
    ) -> Iterator[dict]:
        """One final piece: needle answers whole, and has no prose to stream."""
        yield {"final": {**self.chat_tools(model, messages, tools, mode), "streamed": False}}

    @staticmethod
    def _reply(content: str, raw_calls: list[dict], started: float, answer: dict | None = None) -> dict:
        return {
            "content": content,
            "thinking": (answer or {}).get("reasoning") or None,
            "tool_calls": normalise_tool_calls(raw_calls),
            "raw_tool_calls": raw_calls,
            #: The same keys the other providers report. needle counts no
            #: tokens, so the counts are None rather than a guess.
            "stats": {
                "model": MODEL_NAME,
                "prompt_tokens": None,
                "output_tokens": None,
                "total_ms": round((time.monotonic() - started) * 1000),
                "eval_ms": None,
                "context_tokens": None,
                "usage_source": "estimated",
            },
        }
