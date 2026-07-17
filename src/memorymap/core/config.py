"""Paths + user preferences for the whole app.

Why a single class: every part of the app must agree on where the
database lives and what the user has chosen (build plan §4). `deps.py`
creates exactly ONE instance of this at startup; nothing else should
construct it.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Defaults for every user-changeable preference. Stored as data in one
# place so the future Preferences screen (Phase 4) has one list to show.
DEFAULT_PREFERENCES: dict[str, Any] = {
    "chat_model": "llama3.2",  # any installed Ollama model (Phase 2+)
    "embedding_backend": "sentence-transformers",  # or "ollama" (Phase 3.5)
    "embedding_model": "nomic-embed-text",  # only used when backend == "ollama"
    "recycle_bin_days": 30,
}


class ConfigManager:
    """Knows the app's folders, files, and saved preferences."""

    def __init__(self, data_dir: str | os.PathLike[str] | None = None) -> None:
        # .env lets a user relocate their data without touching code.
        load_dotenv()
        self.data_dir = Path(
            data_dir or os.getenv("MEMORYMAP_DATA_DIR", "data")
        ).resolve()
        self.data_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = self.data_dir / "memorymap.db"
        self.preferences_path = self.data_dir / "preferences.json"
        # Attached files live next to the data dir (Wave B), so wiping
        # one without the other can't happen by accident.
        self.uploads_dir = self.data_dir / "uploads"
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")

        self._preferences = self._load_preferences()

    def _load_preferences(self) -> dict[str, Any]:
        """Merge saved preferences over the defaults.

        A missing or corrupt preferences file must never stop the app
        from starting — we just fall back to defaults.
        """
        prefs = dict(DEFAULT_PREFERENCES)
        if self.preferences_path.exists():
            try:
                prefs.update(json.loads(self.preferences_path.read_text()))
            except (OSError, json.JSONDecodeError):
                pass
        return prefs

    def get_preference(self, key: str, default: Any = None) -> Any:
        return self._preferences.get(key, default)

    def set_preference(self, key: str, value: Any) -> None:
        """Change a preference and persist it to disk immediately,
        so a crash never loses a settings change."""
        self._preferences[key] = value
        self.preferences_path.write_text(json.dumps(self._preferences, indent=2))
