"""Live captions (WORLD_CLASS_PLAN 28.5 row 9) against the fake helper.

`scratchpad/fake_captions_server.py` stands in for whisper.cpp's
`whisper-server` (CLAUDE.md section 4: the suite never reaches for a real
one). The real thing is `tests/test_captions_live.py`, skipped without
`MEMORYMAP_CAPTIONS_URL`.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from memorymap.ai import captions
from memorymap.core import activity

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("fake_captions_server", ROOT / "scratchpad" / "fake_captions_server.py")
fake = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fake)

CHUNK = 250 * captions.BYTES_PER_MS  # what the page sends


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    monkeypatch.delenv("MEMORYMAP_CAPTIONS_URL", raising=False)
    monkeypatch.delenv("MEMORYMAP_CAPTIONS_MODEL", raising=False)
    captions._probe.update(at=0.0, url="", ok=False)
    captions._sessions.clear()
    activity.clear()
    yield
    captions._sessions.clear()
    activity.clear()


@pytest.fixture()
def helper(monkeypatch):
    server = fake.serve()
    monkeypatch.setenv("MEMORYMAP_CAPTIONS_URL", f"http://127.0.0.1:{server.server_address[1]}")
    yield server
    server.shutdown()


def _post_all(client, sid, pcm):
    """The page's loop: 250 ms chunks, one at a time. Returns every reply."""
    replies = []
    for i in range(0, len(pcm), CHUNK):
        r = client.post(f"/voice/captions/{sid}/audio", content=pcm[i : i + CHUNK])
        assert r.status_code == 200, r.text
        replies.append(r.json())
    return replies


def test_status_without_a_helper_says_so(client):
    body = client.get("/voice/status").json()["captions"]
    assert body["available"] is False
    assert "Live captions" in body["hint"] and "Settings, Packages" in body["hint"]


def test_status_with_a_helper_names_the_model(client, helper, monkeypatch):
    monkeypatch.setenv("MEMORYMAP_CAPTIONS_MODEL", "base.en")
    assert client.get("/voice/status").json()["captions"] == {"available": True, "model": "base.en", "hint": None}


def test_a_helper_on_another_host_is_refused(client, monkeypatch):
    # Audio leaving the machine would break the offline rule.
    monkeypatch.setenv("MEMORYMAP_CAPTIONS_URL", "http://example.com:8178")
    body = client.get("/voice/status").json()["captions"]
    assert body["available"] is False and "on this computer" in body["hint"]
    reply = client.post("/voice/captions/start")
    assert reply.status_code == 503


def test_a_helper_that_is_not_answering_is_unavailable(client, monkeypatch):
    monkeypatch.setenv("MEMORYMAP_CAPTIONS_URL", "http://127.0.0.1:9")
    body = client.get("/voice/status").json()["captions"]
    assert body["available"] is False and "isn't answering" in body["hint"]


def test_start_without_a_helper_is_503_with_the_hint(client):
    r = client.post("/voice/captions/start")
    assert r.status_code == 503 and "Settings, Packages" in r.json()["detail"]


def test_words_appear_while_speaking_and_stop_saves_a_note(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    replies = _post_all(client, sid, fake.tone_words([2, 3, 4, 5]) + b"\x00\x00" * 16000)
    seen = " ".join([r["running"] for r in replies] + [x for r in replies for x in r["lines"]])
    for word in ("this", "is", "a", "live"):
        assert word in seen
    done = client.post(f"/voice/captions/{sid}/stop").json()
    assert done["text"].split() == ["this", "is", "a", "live"]
    note = client.get(f"/entries/{done['entry_id']}").json()
    assert note["content"].startswith("Live captions, ") and "this is a live" in note["content"]
    assert "captions" in note["tags"]


def test_a_pause_commits_the_line_and_the_next_starts_fresh(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    speech = fake.tone_words([0, 1]) + b"\x00\x00" * 16000 + fake.tone_words([6, 7])
    replies = _post_all(client, sid, speech + b"\x00\x00" * 16000)
    assert replies[-1]["lines"] == ["hello world", "caption test"]
    assert replies[-1]["running"] == ""


def test_only_the_last_three_lines_are_sent_but_all_are_saved(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    gap = b"\x00\x00" * 16000
    speech = b"".join(fake.tone_words([i]) + gap for i in range(5))
    replies = _post_all(client, sid, speech)
    assert len(replies[-1]["lines"]) == 3 and replies[-1]["count"] == 5
    reply = client.post(f"/voice/captions/{sid}/stop")
    assert reply.json()["text"].split() == ["hello", "world", "this", "is", "a"]


def test_a_long_run_with_no_pause_still_commits(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    run = fake.tone_words(list(range(12)), word_ms=400, gap_ms=150)  # 6.6 s, no 800 ms gap
    replies = _post_all(client, sid, run + b"\x00\x00" * 16000)
    assert replies[-1]["lines"], "the window filled, so a line was committed"
    text = client.post(f"/voice/captions/{sid}/stop").json()["text"].split()
    assert text[0] == "hello" and len(text) >= 9  # a word cut by the boundary may be lost, not the run


def test_silence_never_reaches_the_helper_and_saves_nothing(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    _post_all(client, sid, b"\x00\x00" * 16000 * 5)
    assert helper.RequestHandlerClass.count == 0
    reply = client.post(f"/voice/captions/{sid}/stop")
    assert reply.json() == {"entry_id": None, "text": ""}


def test_the_window_is_cut_to_the_encoder_context(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    _post_all(client, sid, fake.tone_words([1, 2]))
    assert int(helper.RequestHandlerClass.last["audio_ctx"]) < 400  # not the full 30 s (1500)
    assert helper.RequestHandlerClass.last["response_format"] == "json"


def test_a_failing_helper_shows_an_error_then_ends_the_run_keeping_the_text(client, monkeypatch):
    server = fake.serve(fail_every=1)
    monkeypatch.setenv("MEMORYMAP_CAPTIONS_URL", f"http://127.0.0.1:{server.server_address[1]}")
    try:
        sid = client.post("/voice/captions/start").json()["id"]
        pcm = fake.tone_words(list(range(10)))
        codes, errors = [], []
        for i in range(0, len(pcm), CHUNK):
            r = client.post(f"/voice/captions/{sid}/audio", content=pcm[i : i + CHUNK])
            codes.append(r.status_code)
            if r.status_code == 200 and r.json().get("error"):
                errors.append(r.json()["error"])
            if r.status_code == 503:
                break
        assert errors and "didn't answer" in errors[0]
        assert codes[-1] == 503 and captions.get(sid) is None
    finally:
        server.shutdown()


def test_one_run_at_a_time_and_unknown_ids(client, helper):
    first = client.post("/voice/captions/start").json()["id"]
    again = client.post("/voice/captions/start")
    assert again.status_code == 503 and "already running" in again.json()["detail"]
    reply = client.post("/voice/captions/nope/audio", content=b"\x00\x00")
    assert reply.status_code == 404
    reply = client.post("/voice/captions/nope/stop")
    assert reply.status_code == 404
    reply = client.post(f"/voice/captions/{first}/audio", content=b"\x00" * (captions.MAX_CHUNK_BYTES + 2))
    assert reply.status_code == 413


def test_it_is_listed_in_activity_and_stop_there_reaches_the_page(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    assert [j["label"] for j in activity.snapshot() if j["kind"] == "captions"] == ["Live captions"]
    session = captions.get(sid)
    assert session.job.stoppable
    session.job.request_stop()
    reply = client.post(f"/voice/captions/{sid}/audio", content=b"\x00\x00" * 100)
    assert reply.json()["stopped"] is True
    client.post(f"/voice/captions/{sid}/stop")
    assert not [j for j in activity.snapshot() if j["kind"] == "captions"]


def test_an_abandoned_run_is_saved_when_the_next_one_starts(client, helper):
    sid = client.post("/voice/captions/start").json()["id"]
    _post_all(client, sid, fake.tone_words([0, 1]) + b"\x00\x00" * 16000)
    captions.get(sid).seen -= captions.IDLE_SECONDS + 1
    reply = client.post("/voice/captions/start")
    assert reply.status_code == 200
    notes = client.get("/entries?limit=5").json()
    assert any("hello world" in n["content"] for n in (notes if isinstance(notes, list) else notes.get("items", [])))
