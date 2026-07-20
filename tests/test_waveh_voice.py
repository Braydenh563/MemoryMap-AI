"""Wave H: voice endpoints — graceful without Whisper, working with it."""

from __future__ import annotations

from memorymap.ai import voice


def test_status_reports_unavailable_with_hint(client, monkeypatch):
    monkeypatch.setattr(voice, "whisper_available", lambda: False)
    body = client.get("/voice/status").json()
    assert body["available"] is False
    assert "faster-whisper" in body["hint"]


def test_transcribe_without_whisper_is_503_with_hint(client, monkeypatch):
    monkeypatch.setattr(voice, "whisper_available", lambda: False)
    response = client.post(
        "/voice/transcribe", files={"file": ("clip.webm", b"fake-audio", "audio/webm")}
    )
    assert response.status_code == 503
    assert "faster-whisper" in response.json()["detail"]


def test_transcribe_with_fake_whisper(client, monkeypatch):
    monkeypatch.setattr(voice, "whisper_available", lambda: True)
    monkeypatch.setattr(
        voice, "transcribe", lambda path, model_size="base": "buy milk tomorrow"
    )
    response = client.post(
        "/voice/transcribe", files={"file": ("clip.webm", b"fake-audio", "audio/webm")}
    )
    assert response.status_code == 200
    assert response.json() == {"text": "buy milk tomorrow"}
    # It landed in the audit log too.
    audit = client.get("/audit?limit=10").json()
    assert any(row["action"] == "transcribed" for row in audit)


def test_transcribe_rejects_empty_recording(client, monkeypatch):
    monkeypatch.setattr(voice, "whisper_available", lambda: True)
    response = client.post(
        "/voice/transcribe", files={"file": ("clip.webm", b"", "audio/webm")}
    )
    assert response.status_code == 400


def test_status_available_with_fake_whisper(client, monkeypatch):
    monkeypatch.setattr(voice, "whisper_available", lambda: True)
    body = client.get("/voice/status").json()
    assert body["available"] is True
    assert body["hint"] is None
    assert body["model"] == "base"
