"""Ollama's native `/api` dialect (plan §6.5, generalised in §6).

One of two backends MemoryMap speaks. The parts of this file that were never
about Ollama — the think-tag splitter, the tool-text gate and recovery, the
error classes, the context ceiling — now live in `ai/provider.py` and are
shared with `ai/openai_client.py`; they are re-exported below so the imports
that already point here keep working.

What stays is genuinely Ollama's own: `/api/chat` with a JSON-lines stream, an
`options` block carrying `num_ctx` and `num_predict`, `/api/show` for the
context window, and `/api/pull` — the one thing no OpenAI-compatible server
can do, because those are handed a model that is already on disk.
"""

from __future__ import annotations

import json
from collections.abc import Iterator

import requests

from memorymap.ai.provider import (
    Provider,
    ProviderError,
    ToolsUnsupportedError,
    _ThinkTagSplitter,
    _ToolTextGate,
    _ns_to_ms,
    extract_text_tool_calls,
    known_context,
    normalise_tool_calls,
    offered_tool_names,
    split_thinking,
)

# `OllamaError` is not a subclass of the neutral error — it *is* the neutral
# error. Every `except OllamaError` in the routes was written to mean "the AI
# backend failed", and aliasing keeps all of them catching a failing LM Studio
# too. A new parent class would have looked tidier and quietly stopped those
# handlers firing for the second provider.
OllamaError = ProviderError

__all__ = [
    "OllamaClient",
    "OllamaError",
    "ProviderError",
    "ToolsUnsupportedError",
    "extract_text_tool_calls",
    "split_thinking",
    "_ThinkTagSplitter",
    "_ToolTextGate",
]


class OllamaClient(Provider):
    name = "ollama"

    def __init__(
        self, base_url: str = "http://localhost:11434", timeout: float = 120.0
    ) -> None:
        self.base_url = base_url.rstrip("/")
        # Generous default: small local models on modest hardware are slow.
        self.timeout = timeout
        # model name -> context length in tokens. Asked once per model per
        # process: it cannot change without the model being re-pulled, and the
        # answer is needed on every agent round.
        self._context_lengths: dict[str, int | None] = {}

    def supports_pull(self) -> bool:
        """Ollama is the only backend that can fetch a model it doesn't have."""
        return True

    def context_length(self, model: str) -> int | None:
        """How many tokens this model can actually hold, or None if unknown.

        The app used to assume 4096 for everyone, which is Ollama's fallback
        rather than a fact about any particular model — most current ones
        declare 8k, 32k or far more. Rationing the tool schemas against 4096
        on a model with 128k means withholding tools for no reason; assuming
        128k on a 3B model means the system prompt falls off the front and it
        stops knowing it has tools at all. So: ask.

        Reported by `/api/show` under `model_info` as `<architecture>.
        context_length` — the prefix varies by model family, so the key is
        found by suffix rather than guessed.

        When Ollama says nothing — an old build, or a model whose manifest
        omits it — the shared known-model table is asked before giving up. That
        table is a guess and `/api/show` is a fact, so it is only ever the
        fallback, never the first answer.
        """
        if model in self._context_lengths:
            return self._context_lengths[model]
        length: int | None = None
        try:
            response = requests.post(
                f"{self.base_url}/api/show", json={"model": model}, timeout=5
            )
            response.raise_for_status()
            info = response.json().get("model_info") or {}
            for key, value in info.items():
                if key.endswith(".context_length") and isinstance(value, int):
                    length = value
                    break
        except (requests.RequestException, ValueError, AttributeError):
            length = None  # unknown is a fine answer; the caller has a default
        if length is None:
            length = known_context(model)
        self._context_lengths[model] = length
        return length

    def runtime_options(
        self,
        model: str,
        max_output_tokens: int | None = None,
        mode: str | None = None,
    ) -> dict:
        """The neutral budget, translated into Ollama's `options` block.

        Nothing was sent before this, which meant two things at once: the
        window was whatever Ollama felt like (not what the app had budgeted
        for), and the reply length was unbounded.
        """
        budget = self.generation_budget(model, max_output_tokens, mode)
        options = {
            "num_ctx": budget["context_tokens"],
            "num_predict": budget["max_output_tokens"],
        }
        if "temperature" in budget:
            options["temperature"] = budget["temperature"]
        return options

    def request_extras(self, mode: str | None = None) -> dict:
        """Ollama's thinking toggle, which is top-level rather than an option.

        Only ever sent to turn thinking *off*. Turning it off on a model with
        no thinking to turn off is a harmless no-op; turning it *on* where it
        isn't supported is the request that errors — so the unsupported
        direction is simply never sent, and "not sent" means "whatever the
        model does by default", which is what happened before presets existed.
        """
        from memorymap.ai import presets

        preset = presets.resolve(mode)
        return {"think": False} if preset.think is False else {}

    def is_running(self) -> bool:
        """Cheap reachability probe — short timeout so the UI never hangs
        just to discover Ollama is off (plan §6.5)."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=2)
            response.raise_for_status()
            return True
        except requests.RequestException:
            return False

    def list_models(self) -> list[dict]:
        """Installed models (name, size, modified date, ...)."""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            response.raise_for_status()
            return response.json().get("models", [])
        except (requests.RequestException, ValueError) as exc:
            raise OllamaError(f"Could not list Ollama models: {exc}") from exc

    def pull(self, name: str) -> Iterator[dict]:
        """Download a model. Ollama streams JSON lines with 'status' and
        'completed'/'total' bytes — yield each so a progress bar can be
        driven from them (used by the Model Manager, Phase 3.5)."""
        try:
            with requests.post(
                f"{self.base_url}/api/pull",
                json={"name": name},
                stream=True,
                timeout=None,  # a multi-GB download has no sane timeout
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        yield json.loads(line)
        except (requests.RequestException, ValueError) as exc:
            raise OllamaError(f"Downloading '{name}' failed: {exc}") from exc

    def delete(self, name: str) -> None:
        """Uninstall a model from Ollama (frees the disk it used). Raises
        OllamaError if it isn't installed or the call fails."""
        try:
            response = requests.delete(
                f"{self.base_url}/api/delete", json={"name": name}, timeout=30
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise OllamaError(f"Removing '{name}' failed: {exc}") from exc

    def chat(self, model: str, messages: list[dict], mode: str | None = None) -> dict:
        """One non-streamed chat turn.

        Returns {"content": str, "thinking": str | None} — thinking is
        filled from Ollama's native field (newer thinking models) or by
        splitting inline <think> tags out of the content."""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": self.runtime_options(model, mode=mode),
                    **self.request_extras(mode),
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            message = response.json()["message"]
            content, inline_thinking = split_thinking(message["content"])
            return {
                "content": content,
                "thinking": message.get("thinking") or inline_thinking,
            }
        except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
            raise OllamaError(f"Chat with '{model}' failed: {exc}") from exc

    def chat_stream(
        self, model: str, messages: list[dict], mode: str | None = None
    ) -> Iterator[dict]:
        """Streamed chat turn: yields {"thinking_delta": str} and
        {"content_delta": str} pieces as the model produces them.
        Inline <think> tags are routed to thinking_delta too, even when
        a tag is split across two chunks."""
        splitter = _ThinkTagSplitter()
        try:
            with requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "options": self.runtime_options(model, mode=mode),
                    **self.request_extras(mode),
                },
                stream=True,
                timeout=self.timeout,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    message = data.get("message", {})
                    if message.get("thinking"):  # native thinking models
                        yield {"thinking_delta": message["thinking"]}
                    if message.get("content"):
                        yield from splitter.feed(message["content"])
                    if data.get("done"):
                        yield from splitter.flush()
                        # Ollama's final chunk carries token counts and
                        # timings — worth surfacing, so the UI can show
                        # what the answer actually cost.
                        yield {"stats": self._stats_from(data, model)}
        except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
            raise OllamaError(f"Chat with '{model}' failed: {exc}") from exc

    # Both dialects normalise the same way — see `provider.normalise_tool_calls`.
    _normalise_tool_calls = staticmethod(normalise_tool_calls)

    def _stats_from(self, payload: dict, model: str) -> dict:
        """Token counts + timings, in the one shape the UI's metadata line wants.

        `context_tokens` is the window the turn was budgeted against, carried
        alongside the counts so the UI can say *how full* the window got rather
        than only how many tokens were spent. 3,900 tokens means nothing on its
        own; "3,900 of 8,192" is the number that tells you an answer is about
        to start losing the top of its own prompt.
        """
        return {
            "model": payload.get("model") or model,
            "prompt_tokens": payload.get("prompt_eval_count"),
            "output_tokens": payload.get("eval_count"),
            "total_ms": _ns_to_ms(payload.get("total_duration")),
            "eval_ms": _ns_to_ms(payload.get("eval_duration")),
            "context_tokens": self.usable_context(model),
            # Ollama counts tokens itself, so these are measured rather than
            # guessed. The OpenAI path cannot always say the same, and the UI
            # marks an estimate as one.
            "usage_source": "real",
        }

    _offered_names = staticmethod(offered_tool_names)

    def chat_tools_stream(
        self,
        model: str,
        messages: list[dict],
        tools: list[dict],
        mode: str | None = None,
    ) -> Iterator[dict]:
        """Streamed tool-calling turn — the agent loop's normal path.

        Same decisions as chat_tools, but the assistant's prose arrives as it's
        written instead of in one block at the end. That difference is the
        whole point: with tools switched on (the default) the answer used to
        appear all at once, which read as the model hanging and then dumping
        (user-reported).

        Yields, in order:
          {"thinking_delta": str}   zero or more
          {"content_delta": str}    zero or more
          {"final": {...}}          exactly one, same shape chat_tools returns
        """
        splitter = _ThinkTagSplitter()
        gate = _ToolTextGate()
        content = ""       # everything the model wrote, gated or not
        thinking = ""
        shown = False      # did any prose actually reach the caller?
        raw_calls: list[dict] = []
        stats: dict = {}
        try:
            with requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "tools": tools,
                    "options": self.runtime_options(model, mode=mode),
                    **self.request_extras(mode),
                },
                stream=True,
                timeout=self.timeout,
            ) as response:
                # Same capability probe as chat_tools: a model without tool
                # support is a gap to fall back from, not an outage.
                if response.status_code == 400 and "tool" in response.text.lower():
                    raise ToolsUnsupportedError(f"'{model}' can't use tools")
                response.raise_for_status()

                def emit(piece: dict) -> Iterator[dict]:
                    """Route one splitter piece, gating candidate tool-call text."""
                    nonlocal content, thinking, shown
                    if "thinking_delta" in piece:
                        thinking += piece["thinking_delta"]
                        yield piece
                        return
                    chunk = piece["content_delta"]
                    content += chunk
                    visible = gate.feed(chunk)
                    if visible:
                        shown = True
                        yield {"content_delta": visible}

                for line in response.iter_lines():
                    if not line:
                        continue
                    data = json.loads(line)
                    message = data.get("message", {})
                    if message.get("thinking"):  # native thinking models
                        thinking += message["thinking"]
                        yield {"thinking_delta": message["thinking"]}
                    if message.get("tool_calls"):
                        raw_calls.extend(message["tool_calls"])
                    if message.get("content"):
                        for piece in splitter.feed(message["content"]):
                            yield from emit(piece)
                    if data.get("done"):
                        for piece in splitter.flush():
                            yield from emit(piece)
                        stats = self._stats_from(data, model)
        except ToolsUnsupportedError:
            raise
        except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
            raise OllamaError(f"Tool chat with '{model}' failed: {exc}") from exc

        calls = self._normalise_tool_calls(raw_calls)
        clean = content
        if not calls:
            # Nothing structured — the text may itself be the call. Anything
            # still gated was never shown, so removing it costs the user
            # nothing; if the gate had already opened, recovery still strips
            # the JSON from what we hand back as the final answer.
            recovered, clean = extract_text_tool_calls(content, self._offered_names(tools))
            if recovered:
                calls = recovered
                raw_calls = [
                    {"function": {"name": c["name"], "arguments": c["arguments"]}}
                    for c in recovered
                ]
        held = gate.flush()
        if held and not calls:
            # Gated text that turned out to be ordinary prose (a short answer
            # that merely started with "{"). Show it rather than lose it.
            shown = True
            yield {"content_delta": held}

        yield {
            "final": {
                "content": clean.strip(),
                "thinking": thinking or None,
                "tool_calls": calls,
                "raw_tool_calls": raw_calls,
                "stats": stats,
                # True when prose already reached the caller, so it must not
                # send the final text again as a second copy.
                "streamed": shown,
            }
        }

    def chat_tools(
        self,
        model: str,
        messages: list[dict],
        tools: list[dict],
        mode: str | None = None,
    ) -> dict:
        """One non-streamed chat turn with tools offered (Wave G).

        Returns {"content", "thinking", "tool_calls", "raw_tool_calls"}.
        tool_calls is normalised to [{"name": str, "arguments": dict}];
        raw_tool_calls is Ollama's own shape, for replaying back into the
        conversation. Non-streamed on purpose: tool-call rounds are short
        and this works on every Ollama version that supports tools."""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "tools": tools,
                    "options": self.runtime_options(model, mode=mode),
                    **self.request_extras(mode),
                },
                timeout=self.timeout,
            )
            # Ollama answers 400 with a "...does not support tools" body
            # for models without tool support — that's a capability gap,
            # not an outage, so signal it distinctly.
            if response.status_code == 400 and "tool" in response.text.lower():
                raise ToolsUnsupportedError(f"'{model}' can't use tools")
            response.raise_for_status()
            payload = response.json()
            message = payload["message"]
            content, inline_thinking = split_thinking(message.get("content") or "")
            raw_calls = message.get("tool_calls") or []
            calls = []
            for item in raw_calls:
                function = item.get("function") or {}
                arguments = function.get("arguments") or {}
                if isinstance(arguments, str):  # some models emit JSON text
                    try:
                        arguments = json.loads(arguments)
                    except ValueError:
                        arguments = {}
                calls.append({"name": function.get("name", ""), "arguments": arguments})

            # Fallback: some models write the call as TEXT instead of using
            # the structured field, so the note they "create" never actually
            # gets made. Recover those and strip them from the shown text.
            if not calls:
                offered = {
                    t.get("function", {}).get("name")
                    for t in tools
                    if isinstance(t, dict)
                }
                recovered, content = extract_text_tool_calls(content, offered)
                if recovered:
                    calls = recovered
                    raw_calls = [
                        {"function": {"name": c["name"], "arguments": c["arguments"]}}
                        for c in recovered
                    ]

            return {
                "content": content,
                "thinking": message.get("thinking") or inline_thinking,
                "tool_calls": calls,
                "raw_tool_calls": raw_calls,
                # Same shape chat_stream reports, so the message metadata line
                # can be filled in from an agent turn too. Without this, using
                # tools (the default) silently dropped the token counts.
                "stats": self._stats_from(payload, model),
            }
        except ToolsUnsupportedError:
            raise
        except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
            raise OllamaError(f"Tool chat with '{model}' failed: {exc}") from exc

    def embed(self, model: str, text: str) -> list[float]:
        """Embed one text with an Ollama embedding model (only used when
        the user switches off the built-in default backend)."""
        try:
            response = requests.post(
                f"{self.base_url}/api/embed",
                json={"model": model, "input": text},
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()["embeddings"][0]
        except requests.HTTPError as exc:
            # A chat/generation model can't embed: Ollama answers /api/embed
            # with 501 Not Implemented (older builds: 400 "does not support
            # embeddings"). Surface a message the user can act on instead of a
            # raw HTTP error — this is the #1 way people misconfigure the
            # Ollama search engine (they pick their chat model by mistake).
            resp = exc.response
            body = (resp.text if resp is not None else "") or ""
            status = resp.status_code if resp is not None else None
            if status in (400, 501) or "does not support" in body.lower():
                raise OllamaError(
                    f"'{model}' can't create embeddings — it looks like a chat "
                    "model, not an embedding model. Download and select a "
                    "dedicated embedding model such as 'nomic-embed-text' as the "
                    "search engine."
                ) from exc
            raise OllamaError(f"Embedding with '{model}' failed: {exc}") from exc
        except (
            requests.RequestException,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
        ) as exc:
            raise OllamaError(f"Embedding with '{model}' failed: {exc}") from exc
