#!/usr/bin/env python3
"""Write the WAV Chromium plays as its microphone for the captions sweep.

  python3 scratchpad/captions_audio.py out.wav

Eight tone-burst "words" (indexes 0 to 7, which the fake helper turns into
"hello world this is a live caption test"), 400 ms each with 300 ms between,
after 1.5 s of silence so the capture has started before the first word. Then
silence, so the file ending looks like a speaker stopping. The word onsets are
printed, in milliseconds from the start of the file, for the sweep to read.
"""

from __future__ import annotations

import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fake_captions_server as fake  # noqa: E402

LEAD_MS, WORD_MS, GAP_MS, TAIL_MS = 1500, 400, 300, 4000


def main(out: str) -> None:
    pcm = fake.tone_words(list(range(8)), WORD_MS, GAP_MS, LEAD_MS) + b"\x00\x00" * (16000 * TAIL_MS // 1000)
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(pcm)
    onsets = [LEAD_MS + i * (WORD_MS + GAP_MS) for i in range(8)]
    print(" ".join(map(str, onsets)))


if __name__ == "__main__":
    main(sys.argv[1])
