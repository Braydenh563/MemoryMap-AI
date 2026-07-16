"""Thin wrapper over the local Ollama REST API (plan §6.5).

Every AI module talks to Ollama through this class, so "is Ollama even
running?" is answered in exactly one place and tests only have to fake
one object.
"""

from __future__ import annotations

import json
from collections.abc import Iterator

import requests


class OllamaError(RuntimeError):
    """Ollama unreachable, or it returned something unusable."""


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

    def chat(self, model: str, messages: list[dict]) -> str:
        """One non-streamed chat turn; returns the reply text only."""
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={"model": model, "messages": messages, "stream": False},
                timeout=self.timeout,
            )
            response.raise_for_status()
            return response.json()["message"]["content"]
        except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
            raise OllamaError(f"Chat with '{model}' failed: {exc}") from exc

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
        except (
            requests.RequestException,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
        ) as exc:
            raise OllamaError(f"Embedding with '{model}' failed: {exc}") from exc
