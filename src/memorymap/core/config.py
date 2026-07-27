"""Paths + user preferences for the whole app.

Why a single class: every part of the app must agree on where the
database lives and what the user has chosen (build plan §4). `deps.py`
creates exactly ONE instance of this at startup; nothing else should
construct it.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Any

from dotenv import load_dotenv

# Defaults for every user-changeable preference. Stored as data in one
# place so the future Preferences screen (Phase 4) has one list to show.
DEFAULT_PREFERENCES: dict[str, Any] = {
    "chat_model": "llama3.2",  # any installed Ollama model (Phase 2+)
    "embedding_backend": "sentence-transformers",  # or "ollama" (Phase 3.5)
    "embedding_model": "nomic-embed-text",  # only used when backend == "ollama"
    "recycle_bin_days": 30,
    # The user's IANA timezone, e.g. "Australia/Brisbane". Reported by the
    # browser on startup, because the browser is the only thing that knows
    # where the person actually is — the server may well be running in UTC
    # (a container, a NAS), and "remind me in ten minutes" resolved against
    # the wrong clock lands hours out. Empty means "fall back to the server's
    # own zone", which is correct for the ordinary case of both on one laptop.
    "timezone": "",
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


def user_now(config: "ConfigManager") -> datetime:
    """Right now, on the user's own clock.

    Everything is *stored* in UTC — that part is not negotiable, since a
    notebook has to survive its owner changing timezone. But anything the AI
    reasons about ("in ten minutes", "tomorrow at 9", "what did I save today")
    has to be resolved against the wall clock the user is actually reading, or
    it silently lands hours out.

    Falls back to the server's local zone when no timezone has been reported,
    which is right for the ordinary case of app and browser on one machine.
    """
    name = str(config.get_preference("timezone", "") or "").strip()
    if name:
        try:
            return datetime.now(ZoneInfo(name))
        except (ZoneInfoNotFoundError, ValueError):
            # A stale or hand-edited zone name must never break the app.
            logging.getLogger("memorymap.config").warning(
                "unknown timezone %r in preferences; using the server's", name
            )
    return datetime.now(timezone.utc).astimezone()
