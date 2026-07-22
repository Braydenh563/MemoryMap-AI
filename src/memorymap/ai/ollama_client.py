"""Thin wrapper over the local Ollama REST API (plan §6.5).

Every AI module talks to Ollama through this class, so "is Ollama even
running?" is answered in exactly one place and tests only have to fake
one object.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator

import requests


class OllamaError(RuntimeError):
    """Ollama unreachable, or it returned something unusable."""


class ToolsUnsupportedError(OllamaError):
    """The active model can't do tool calls — the caller should fall
    back to plain Q&A, never fail the whole chat (Wave G)."""


class _ThinkTagSplitter:
    """Routes streamed content into thinking vs answer pieces when a
    model reasons inline with <think>…</think> — the tags themselves can
    arrive split across chunks, so a little state is unavoidable."""

    OPEN, CLOSE = "<think>", "</think>"

    def __init__(self) -> None:
        self._buffer = ""
        self._mode = "start"  # start → thinking? → answer

    def feed(self, chunk: str) -> list[dict]:
        self._buffer += chunk
        pieces: list[dict] = []

        if self._mode == "start":
            candidate = self._buffer.lstrip()
            if candidate.startswith(self.OPEN):
                self._mode = "thinking"
                self._buffer = candidate[len(self.OPEN) :]
            elif self.OPEN.startswith(candidate):
                return pieces  # could still become "<think>" — wait
            else:
                self._mode = "answer"

        if self._mode == "thinking":
            end = self._buffer.find(self.CLOSE)
            if end != -1:
                pieces.append({"thinking_delta": self._buffer[:end]})
                self._buffer = self._buffer[end + len(self.CLOSE) :]
                self._mode = "answer"
            else:
                # Keep enough back that a half-arrived "</think>" isn't
                # emitted as thinking text.
                safe = len(self._buffer) - (len(self.CLOSE) - 1)
                if safe > 0:
                    pieces.append({"thinking_delta": self._buffer[:safe]})
                    self._buffer = self._buffer[safe:]
                return pieces

        if self._mode == "answer" and self._buffer:
            pieces.append({"content_delta": self._buffer})
            self._buffer = ""
        return pieces

    def flush(self) -> list[dict]:
        """The stream ended — emit whatever is left."""
        leftover, self._buffer = self._buffer, ""
        if not leftover:
            return []
        key = "thinking_delta" if self._mode == "thinking" else "content_delta"
        return [{key: leftover}]


def extract_text_tool_calls(
    content: str, tool_names: set[str]
) -> tuple[list[dict], str]:
    """Recover tool calls that a model wrote as TEXT instead of using the
    structured tool_calls field (Wave O bug: small models narrate/emit
    calls in prose, so notes the AI 'creates' never actually get made).

    Handles both an explicit ``<tool_call>{...}</tool_call>`` wrapper and a
    bare JSON object that names a known tool. Returns (calls, cleaned_text)
    where cleaned_text has the recovered JSON removed so it isn't shown to
    the user."""
    calls: list[dict] = []
    cleaned = content

    def _consume(blob: str, whole: str) -> None:
        try:
            data = json.loads(blob)
        except ValueError:
            return
        candidates = data if isinstance(data, list) else [data]
        for item in candidates:
            if not isinstance(item, dict):
                continue
            # Accept {"name","arguments"} and OpenAI-ish {"function":{...}}.
            fn = item.get("function") if isinstance(item.get("function"), dict) else item
            name = fn.get("name") if isinstance(fn, dict) else None
            if name in tool_names:
                args = fn.get("arguments") or fn.get("parameters") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except ValueError:
                        args = {}
                calls.append({"name": name, "arguments": args if isinstance(args, dict) else {}})
                nonlocal cleaned
                cleaned = cleaned.replace(whole, "")

    # 1) explicit <tool_call>…</tool_call> blocks (Qwen/Hermes style).
    for match in re.finditer(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", content, re.S):
        _consume(match.group(1), match.group(0))
    # 2) a bare top-level JSON object naming a known tool.
    if not calls:
        for match in re.finditer(r"\{[^{}]*\"name\"[^{}]*\}", content, re.S):
            _consume(match.group(0), match.group(0))

    return calls, cleaned.strip()


def split_thinking(text: str) -> tuple[str, str | None]:
    """Separate a thinking model's <think>…</think> block from its answer.

    Models like DeepSeek-R1 or Qwen3 reason out loud inside think-tags;
    shown raw it looks like garbage, hidden entirely it wastes useful
    insight — so we return both parts and let the UI decide."""
    start = text.find("<think>")
    end = text.find("</think>")
    if start == -1 or end == -1 or end < start:
        return text.strip(), None
    thinking = text[start + len("<think>") : end].strip()
    clean = (text[:start] + text[end + len("</think>") :]).strip()
    return clean, thinking or None


class OllamaClient:
    def __init__(
        self, base_url: str = "http://localhost:11434", timeout: float = 120.0
    ) -> None:
        self.base_url = base_url.rstrip("/")
        # Generous default: small local models on modest hardware are slow.
        self.timeout = timeout

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

    def chat(self, model: str, messages: list[dict]) -> dict:
        """One non-streamed chat turn.

        Returns {"content": str, "thinking": str | None} — thinking is
        filled from Ollama's native field (newer thinking models) or by
        splitting inline <think> tags out of the content."""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={"model": model, "messages": messages, "stream": False},
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

    def chat_stream(self, model: str, messages: list[dict]) -> Iterator[dict]:
        """Streamed chat turn: yields {"thinking_delta": str} and
        {"content_delta": str} pieces as the model produces them.
        Inline <think> tags are routed to thinking_delta too, even when
        a tag is split across two chunks."""
        splitter = _ThinkTagSplitter()
        try:
            with requests.post(
                f"{self.base_url}/api/chat",
                json={"model": model, "messages": messages, "stream": True},
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
        except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
            raise OllamaError(f"Chat with '{model}' failed: {exc}") from exc

    def chat_tools(self, model: str, messages: list[dict], tools: list[dict]) -> dict:
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
                },
                timeout=self.timeout,
            )
            # Ollama answers 400 with a "...does not support tools" body
            # for models without tool support — that's a capability gap,
            # not an outage, so signal it distinctly.
            if response.status_code == 400 and "tool" in response.text.lower():
                raise ToolsUnsupportedError(f"'{model}' can't use tools")
            response.raise_for_status()
            message = response.json()["message"]
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
