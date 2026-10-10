"""The recordings library (WORLD_CLASS_PLAN 28.5 row 6): a Library sub-tab
from the recipes, play at 0.5 to 2x, the saved waveform, markers while
recording (M and a button), trim into a new object, delete into the bin.
Driven by `scratchpad/ui-sweeps/audio80.js` ACT=library at 1440 and 390."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / "frontend/js/meetings.js").read_text(encoding="utf-8")
HTML = (ROOT / "frontend/index.html").read_text(encoding="utf-8")


def test_a_library_section_on_the_dock_recipe():
    assert 'data-target="library-view-recordings">Recordings</button>' in HTML
    section = HTML.split('id="library-view-recordings"')[1].split("</section>")[0]
    for part in ('class="dock"', "dock-identity", "dock-find", "dock-actions", 'data-help-for="recordings-help"'):
        assert part in section


def test_speeds_half_to_double():
    assert "const RECORDING_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];" in JS


def test_markers_while_recording_by_button_and_key():
    assert 'id="meeting-marker"' in HTML
    assert "meetingTake.markers.push(at)" in JS


def test_trim_writes_a_new_wav_object_pointing_at_its_original():
    block = JS.split("async function trimRecording(")[1].split("\n}\n")[0]
    assert 'mime: "audio/wav", source_id: rec.id' in block
    assert "mp3" not in JS.lower()


def test_a_recording_is_seekable_before_its_first_seek():
    assert "audio.currentTime = 1e101;" in JS


def test_the_bin_restores_a_recording():
    lib = (ROOT / "frontend/js/library.js").read_text(encoding="utf-8")
    assert 'restore: `/recordings/${item.id}/restore`' in lib
