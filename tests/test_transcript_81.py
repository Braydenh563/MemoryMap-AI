"""A timestamped transcript (WORLD_CLASS 28.5 row 7, Brief 81): the
add-on's segments kept with their times on the recording, read back as
lines, and written out as SRT and WebVTT, byte for byte against fixtures
written by hand (`fixtures/meetings/launch_sync.{srt,vtt}`).
"""

from __future__ import annotations

import json
from pathlib import Path

from memorymap.ai import voice
from memorymap.core import transcript

HERE = Path(__file__).parent / "fixtures" / "meetings"
SEGMENTS = json.loads((HERE / "launch_sync.segments.json").read_text())
WEBM_HEAD = b"\x1a\x45\xdf\xa3" + b"\x00" * 60


def test_srt_is_the_fixture_byte_for_byte() -> None:
    assert transcript.to_srt(SEGMENTS).encode() == (HERE / "launch_sync.srt").read_bytes()


def test_vtt_is_the_fixture_byte_for_byte() -> None:
    assert transcript.to_vtt(SEGMENTS).encode() == (HERE / "launch_sync.vtt").read_bytes()


def test_vtt_escapes_markup_and_tags_a_speaker() -> None:
    out = transcript.to_vtt([{"start": 0, "end": 900, "text": "a <b> & c", "speaker": "Sam"}])
    assert out == "WEBVTT\n\n00:00:00.000 --> 00:00:00.900\n<v Sam>a &lt;b&gt; &amp; c\n"
    srt = transcript.to_srt([{"start": 0, "end": 900, "text": "hi", "speaker": "Sam"}])
    assert srt == "1\n00:00:00,000 --> 00:00:00,900\nSam: hi\n"


def test_clean_orders_rounds_and_drops_empties() -> None:
    kept = transcript.clean(
        [{"start": 5.6, "end": 2, "text": " b "}, {"start": 1, "end": 2, "text": "  "}, {"start": 0, "end": 1, "text": "a"}, "x"]
    )
    assert kept == [
        {"start": 0, "end": 1, "text": "a", "speaker": None},
        {"start": 6, "end": 6, "text": "b", "speaker": None},
    ]
    assert transcript.loads("not json") == []


def _recording(client) -> int:
    rid = client.post("/recordings", json={"title": "Launch sync", "mime": "audio/webm"}).json()["id"]
    client.post(f"/recordings/{rid}/chunk", files={"file": ("c.webm", WEBM_HEAD, "audio/webm")}, data={"duration_ms": "4000"})
    client.post(f"/recordings/{rid}/finish", json={"duration_ms": 3_663_000})
    return rid


def test_transcribe_keeps_the_segments_and_the_routes_write_them_out(client, monkeypatch) -> None:
    monkeypatch.setattr(voice, "whisper_available", lambda: True)
    monkeypatch.setattr(voice, "transcribe_segments", lambda path, model_size="base": SEGMENTS)
    rid = _recording(client)
    assert client.get(f"/recordings/{rid}/transcript").status_code == 404
    assert client.get(f"/recordings/{rid}/transcript.srt").status_code == 404
    assert client.get("/recordings").json()["recordings"][0]["transcribed"] is False

    body = client.post(f"/recordings/{rid}/transcribe").json()
    assert body["text"].startswith("Okay, let's start") and len(body["segments"]) == 5
    assert client.get("/recordings").json()["recordings"][0]["transcribed"] is True

    lines = client.get(f"/recordings/{rid}/transcript").json()
    assert [s["start"] for s in lines["segments"]] == [0, 2400, 8200, 11000, 3661250]
    assert lines["speakers"] is False

    srt = client.get(f"/recordings/{rid}/transcript.srt")
    assert srt.content == (HERE / "launch_sync.srt").read_bytes()
    assert srt.headers["content-type"].startswith("application/x-subrip")
    assert srt.headers["content-disposition"] == 'attachment; filename="Launch sync.srt"'
    vtt = client.get(f"/recordings/{rid}/transcript.vtt")
    assert vtt.content == (HERE / "launch_sync.vtt").read_bytes()
    assert vtt.headers["content-type"].startswith("text/vtt")


def test_transcribe_joins_the_segments_for_the_old_callers(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(voice, "transcribe_segments", lambda path, model_size="base", options=None: SEGMENTS[:2])
    assert voice.transcribe(tmp_path / "x.webm") == (
        "Okay, let's start with the launch date. After some back and forth we decided to move the public launch to November."
    )
