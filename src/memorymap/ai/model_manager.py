"""Which models are currently active.

The janitor, librarian, and embedding service must never hardcode a
model name (plan §4) — they ask this class, which reads the user's
saved preferences and falls back to the defaults.

The suggested-models catalog and backend switching (with the mandatory
re-index) arrive in Phase 3.5.
"""

from __future__ import annotations

from memorymap.core.config import ConfigManager


class ModelManager:
    def __init__(self, config: ConfigManager) -> None:
        self._config = config

    def chat_model(self) -> str:
        return self._config.get_preference("chat_model", "llama3.2")

    def embedding_backend(self) -> str:
        """'sentence-transformers' (built-in default) or 'ollama'."""
        return self._config.get_preference("embedding_backend", "sentence-transformers")

    def embedding_model(self) -> str:
        """Only meaningful when the backend is 'ollama'."""
        return self._config.get_preference("embedding_model", "nomic-embed-text")
