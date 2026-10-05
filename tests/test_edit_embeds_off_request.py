"""An edit's new vector is made after the PUT returns (audit 2026-10-05, ARCH-02 step 5).

`PUT /entries/{id}` with new text called the embedder on the request: on a
real model that is 200 to 400 ms before the editor's autosave came back,
growing with the model rather than the note. The stale vector is still
dropped on the request (a search must not find the old meaning), and the
new one is made on the model lane, newest text last.
"""

from __future__ import annotations

import threading
import time

import pytest
from fastapi.testclient import TestClient

from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord
from tests.fakes import FakeEmbeddingService, FakeOllama


class GatedEmbeddings(FakeEmbeddingService):
    """Records each embed's text and thread, and can hold one."""

    def __init__(self) -> None:
        super().__init__(available=True)
        self.texts: list[str] = []
        self.threads: list[str] = []
        self.gate = threading.Event()
        self.gate.set()

    def embed_text(self, text):  # noqa: ANN001, ANN201
        self.texts.append(text)
        self.threads.append(threading.current_thread().name)
        self.gate.wait(10)
        return super().embed_text(text)


@pytest.fixture()
def gated(app_state):
    from memorymap.api.app import create_app

    fake = GatedEmbeddings()
    deps.override_ai(ollama=FakeOllama(running=False), embeddings=fake)
    return TestClient(create_app()), fake


def _vector_count(entry_id: int) -> int:
    with deps.get_db().session() as session:
        return session.query(EmbeddingRecord).filter(EmbeddingRecord.entry_id == entry_id).count()


def _wait(predicate, timeout: float = 10.0) -> bool:  # noqa: ANN001
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return False


def _note(client) -> dict:
    note = client.post("/entries", json={"content": "the garden plan", "category": "Home"}).json()
    assert _wait(lambda: _vector_count(note["id"]) == 1)
    return note


def test_an_edit_returns_before_its_text_is_embedded(gated):
    client, fake = gated
    note = _note(client)
    fake.gate.clear()  # the next embed waits until released
    fake.texts.clear()
    fake.threads.clear()
    started = time.monotonic()
    response = client.put(f"/entries/{note['id']}", json={"content": "the work budget for spring"})
    assert response.status_code == 200
    assert time.monotonic() - started < 5, "the PUT waited for the embedder"
    # The old meaning is gone at once; the new one arrives from the job.
    assert _vector_count(note["id"]) == 0
    fake.gate.set()
    assert _wait(lambda: _vector_count(note["id"]) == 1)
    assert any("work budget" in text for text in fake.texts)
    assert fake.threads and all(name.startswith("mm-job-") for name in fake.threads)


def test_an_unchanged_text_is_not_embedded_again(gated):
    client, fake = gated
    note = _note(client)
    fake.texts.clear()
    client.put(f"/entries/{note['id']}", json={"content": "the garden plan", "tags": ["x"]})
    time.sleep(0.2)
    assert fake.texts == []
    assert _vector_count(note["id"]) == 1


def test_an_edit_made_while_the_job_embeds_is_the_text_left_embedded(gated):
    client, fake = gated
    note = _note(client)
    fake.gate.clear()
    fake.texts.clear()
    client.put(f"/entries/{note['id']}", json={"content": "first edit about work"})
    assert _wait(lambda: len(fake.texts) >= 1)  # the job is holding the first text
    client.put(f"/entries/{note['id']}", json={"content": "second edit about health"})
    fake.gate.set()
    assert _wait(lambda: any("second edit" in text for text in fake.texts))
    assert _wait(lambda: _vector_count(note["id"]) == 1)
