"""Live captions against a real whisper.cpp `whisper-server`.

Skipped unless `MEMORYMAP_CAPTIONS_URL` names one (CLAUDE.md section 4; the
same shape as `MEMORYMAP_EVALS_URL` in test_skills_evals.py). Nothing in the
suite starts, builds or downloads it, and no mode of scripts/gate.sh reaches
for one. What a real model hears, and how fast, is a report, not an assertion.
"""

from __future__ import annotations

import math
import os
from array import array
from pathlib import Path

import pytest

from memorymap.ai import captions

URL = os.environ.get("MEMORYMAP_CAPTIONS_URL", "").strip()
ROOT = Path(__file__).resolve().parents[1]

needs_a_helper = pytest.mark.skipif(
    not URL, reason="no captions helper: export MEMORYMAP_CAPTIONS_URL (a whisper-server on this machine)"
)


@pytest.mark.captions
@needs_a_helper
def test_a_real_helper_answers_a_window_and_the_status_sees_it():
    assert captions.status()["available"] is True
    tone = array("h", (int(8000 * math.sin(2 * math.pi * 440 * n / 16000)) for n in range(16000 * 2)))
    text = captions.infer(tone.tobytes(), audio_ctx=200)
    assert isinstance(text, str)  # a tone is not speech; only that the round trip works


def test_the_captions_seam_is_the_only_thing_that_reaches_a_helper():
    assert "captions:" in (ROOT / "pytest.ini").read_text(encoding="utf-8")
    gate = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")
    assert "MEMORYMAP_CAPTIONS" not in gate and "whisper-server" not in gate
    for path in (ROOT / "tests").rglob("test_*.py"):
        if path.name == Path(__file__).name:
            continue
        body = path.read_text(encoding="utf-8")
        assert not ("subprocess" in body and "whisper-server" in body), f"{path.name} starts a helper binary"
