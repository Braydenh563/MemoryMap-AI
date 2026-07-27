"""Local speech-to-text (Wave H) — optional, like everything AI here.

Uses faster-whisper (Whisper running on CPU via CTranslate2) when the
user has installed it:  pip install faster-whisper
Nothing else in the app depends on it: without the package the voice
endpoints report "not available" with that hint, and the mic button in
the UI explains instead of breaking. Audio never leaves the machine.
"""

from __future__ import annotations

import importlib.util
import threading
from pathlib import Path

INSTALL_HINT = (
    "Voice capture needs the optional faster-whisper package. In your "
    "MemoryMap folder run:  pip install faster-whisper  — then restart the app."
)

# One loaded model per process; Whisper models are too heavy to reload
# per request. Guarded by a lock because two requests can race the load.
#
# The size and the model are one cache entry, not two globals: kept apart, the
# pair can be written half-way — the old model still loaded under the new
# size's name — and every later call then hands back the wrong model believing
# it is the right one. A single tuple cannot get out of step with itself.
_loaded: tuple[str, object] | None = None
_lock = threading.Lock()


def whisper_available() -> bool:
    return importlib.util.find_spec("faster_whisper") is not None


def _get_model(size: str):  # noqa: ANN202 — faster_whisper types are optional
    global _loaded
    with _lock:
        if _loaded is None or _loaded[0] != size:
            from faster_whisper import WhisperModel  # imported only when present

            # int8 keeps memory modest on ordinary laptops.
            _loaded = (size, WhisperModel(size, device="cpu", compute_type="int8"))
        return _loaded[1]


def transcribe(audio_path: Path, model_size: str = "base") -> str:
    """Turn one recorded clip into text. Raises RuntimeError with the
    install hint when Whisper isn't available."""
    if not whisper_available():
        raise RuntimeError(INSTALL_HINT)
    model = _get_model(model_size)
    segments, _info = model.transcribe(str(audio_path))
    return " ".join(segment.text.strip() for segment in segments).strip()
