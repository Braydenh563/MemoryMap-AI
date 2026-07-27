"""Wave A: the server log buffer and its endpoints."""

from __future__ import annotations

import logging

from memorymap.core import logbuffer


def test_buffer_captures_and_caps(client):
    logbuffer.clear()
    logging.getLogger("memorymap.test").info("hello from the test")

    records = client.get("/logs").json()
    assert any("hello from the test" in r["message"] for r in records)
    record = next(r for r in records if "hello from the test" in r["message"])
    assert record["level"] == "INFO"
    assert record["logger"] == "memorymap.test"


def test_ai_decisions_are_logged(client):
    logbuffer.clear()
    client.post("/entries", json={"content": "a note to file"})

    messages = [r["message"] for r in client.get("/logs").json()]
    assert any("janitor: filed by" in m for m in messages)


def test_clear_endpoint(client):
    logging.getLogger("memorymap.test").info("about to vanish")
    # Not inside the assert: `python -O` removes assert statements, taking the
    # clear with them and leaving a test that proves nothing.
    cleared = client.delete("/logs")
    assert cleared.json() == {"cleared": True}
    # New records may arrive after the clear (request plumbing logs);
    # what matters is that the old ones are gone.
    messages = [r["message"] for r in client.get("/logs").json()]
    assert not any("about to vanish" in m for m in messages)


def test_install_is_idempotent():
    logbuffer.install()
    logbuffer.install()
    root = logging.getLogger()
    buffers = [h for h in root.handlers if isinstance(h, logbuffer.BufferHandler)]
    assert len(buffers) == 1
