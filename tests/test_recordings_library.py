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


def test_a_recording_is_a_card_with_a_playhead_and_the_time():
    """Brief 96 (INBOX 859): the head line, the player with a playhead and
    "1:12 / 4:30", a press or a drag seeks."""
    row = JS.split("function recordingRow(rec) {")[1].split("\n}\n")[0]
    for part in ('"recording-head"', '"recording-player"', '"muted recording-time"', "recordingMarksFill(li)"):
        assert part in row
    wave = JS.split("function recordingWave(rec, audio, time) {")[1].split("\n}\n")[0]
    assert "setPointerCapture" in wave and '"pointermove"' in wave
    assert "${meetingClockText(now * 1000)} / ${meetingClockText(length * 1000)}" in wave
    assert '"aria-valuetext"' in wave
    paint = JS.split("function recordingPaint(canvas, rec, played) {")[1].split("\n}\n")[0]
    assert "paint.fillStyle = ink;" in paint


def test_marks_at_the_playhead_with_a_comment_link_into_the_transcript():
    add = JS.split("async function addRecordingMark(li) {")[1].split("\n}\n")[0]
    assert "audio.currentTime * 1000" in add and "promptDialog(" in add and "pushUndo(" in add
    save = JS.split("async function saveRecordingMarks(li, marks) {")[1].split("\n}\n")[0]
    assert "{ at: m.at, note: m.note }" in save
    assert "recordingShowLine(li, ms)" in JS
    assert 'event.key.toLowerCase() !== "m"' in JS.split("function recordingRow(rec) {")[1].split("\n}\n")[0]


def test_transcription_is_a_background_run_with_stop_and_a_notification():
    """V1 (INBOX 828): "if I close it, can I leave it in running in the
    background ... can I get a notification when it is done?? also can I
    stop it". The dialog and the ⋯ start a server run and watch it; the
    ending is a notification with Open; Stop is on the card and the dialog."""
    take = JS.split("async function meetingTranscribeTake(saved, length) {")[1].split("\n}\n")[0]
    assert "startRecordingTranscription(saved" in take and "/transcribe`" not in take
    row = JS.split("async function transcribeRecording(rec) {")[1].split("\n}\n")[0]
    assert "startRecordingTranscription(rec" in row
    assert "/transcribe/start" in JS and "/transcribe/stop" in JS
    ended = JS.split("async function recordingTranscriptionEnded(rec, run, hooks) {")[1].split("\n}\n")[0]
    assert 'action: { open: "recording", id: rec.id }' in ended and "recordNotification(" in ended
    status = (ROOT / "frontend/js/status.js").read_text(encoding="utf-8")
    assert "recording: [(id) => apiJson(`/recordings/${id}`" in status and "(id) => openRecordings(id)" in status
    assert 'id="meeting-stop-transcribe"' in HTML


def test_a_recording_outlives_its_dialog_in_the_dock():
    close = JS.split("function closeMeetingRecorder() {")[1].split("\n}\n")[0]
    assert "meetingRecorder.stop()" not in close and "syncRecordingDock()" in close
    dock = HTML.split('id="recording-dock"')[1].split("</div>\n  </div>")[0]
    for part in ('id="recording-dock-time"', 'id="recording-dock-pause"', 'id="recording-dock-stop"', 'id="recording-dock-open"'):
        assert part in dock
    assert 'id="meeting-discard-take"' in HTML and "function discardMeetingTake()" in JS


def test_the_microphone_is_chosen_cleaned_and_tested_in_one_set_of_controls():
    """V2 (INBOX 828): "noise supression, voice enhancement, audio input
    devices and ports etc need to be managable". Every recorder asks for
    the chosen device and the three cleanups; the controls are drawn once
    into the recorder's fold and into Settings."""
    media = (ROOT / "frontend/js/media.js").read_text(encoding="utf-8")
    assert "function micAudioConstraints()" in media
    for key in ("micNoise", "micEcho", "micGain", "deviceId: { ideal: device }"):
        assert key in media
    captions = (ROOT / "frontend/js/captions.js").read_text(encoding="utf-8")
    for text in (media, JS, captions):
        assert "getUserMedia({ audio: true })" not in text
        assert "getUserMedia({ audio: micAudioConstraints() })" in text
    assert "enumerateDevices" in JS and "const MIC_TEST_MS = 3000;" in JS
    assert 'id="mic-settings-controls"' in HTML and 'id="meeting-mic-controls"' in HTML
    settings = (ROOT / "frontend/js/settings-controls.js").read_text(encoding="utf-8")
    assert 'micControlsInto($("mic-settings-controls"))' in settings
