"""Local speech-to-text: optional, like everything AI here.

Uses faster-whisper (Whisper running on CPU via CTranslate2) when the
user has installed it:  pip install faster-whisper
Nothing else in the app depends on it: without the package the voice
endpoints report "not available" with that hint, and the mic button in
the UI explains instead of breaking. Audio never leaves the machine.
"""

from __future__ import annotations

import importlib.util
import logging
import threading
from pathlib import Path

from memorymap.core.logbuffer import safe_value

#: Names the add-on as Settings, Packages lists it ("Voice notes"), not the
#: command that installs it: the person reads this in a toast.
INSTALL_HINT = (
    "Voice notes need an add-on that isn't installed yet. Install “Voice "
    "notes” in Settings, Packages, then restart the app."
)

logger = logging.getLogger(__name__)

# One loaded model per process; Whisper models are too heavy to reload
# per request. Guarded by a lock because two requests can race the load.
#
# The size and the model are one cache entry, not two globals: kept apart, the
# pair can be written half-way, the old model still loaded under the new
# size's name: and every later call then hands back the wrong model believing
# it is the right one. A single tuple cannot get out of step with itself.
_loaded: tuple[str, object] | None = None
_lock = threading.Lock()


def whisper_available() -> bool:
    return importlib.util.find_spec("faster_whisper") is not None


def _get_model(size: str):  # noqa: ANN202  # faster_whisper types are optional
    global _loaded
    with _lock:
        if _loaded is None or _loaded[0] != size:
            from faster_whisper import WhisperModel  # imported only when present

            # int8 keeps memory modest on ordinary laptops.
            _loaded = (size, WhisperModel(size, device="cpu", compute_type="int8"))
        return _loaded[1]


def transcribe(audio_path: Path, model_size: str = "base") -> str:
    """Turn one recorded clip into text. Raises RuntimeError with the
    install hint when Whisper isn't available, and RuntimeError with a
    distinct message when the model itself can't be loaded.

    That second case is not hypothetical: the first transcription on a
    machine downloads the model from Hugging Face, and a broken or
    offline connection makes that download raise deep inside
    faster-whisper/huggingface_hub: an exception that has nothing to do
    with the recording. Left uncaught, it surfaced as "Couldn't
    transcribe that recording: <httpx error>" (the route's catch-all for
    a bad clip), which reads exactly like "transcription is broken" and
    sends the user looking at their microphone instead of their network.
    """
    if not whisper_available():
        raise RuntimeError(INSTALL_HINT)
    try:
        model = _get_model(model_size)
    except Exception as exc:
        # The library's own error (a network failure deep in a download, a
        # corrupt cache) is for the log; the person gets the one thing they
        # can act on, which is nearly always the connection.
        logger.warning("Couldn't load the Whisper %s model", safe_value(model_size, 40), exc_info=True)
        raise RuntimeError(
            "Couldn't load the speech model. The first use downloads it, so "
            "check your internet connection and try again."
        ) from exc
    segments, _info = model.transcribe(str(audio_path))
    return " ".join(segment.text.strip() for segment in segments).strip()
