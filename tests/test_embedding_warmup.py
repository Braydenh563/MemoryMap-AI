"""The embedding warm-up thread, and the two things it must not do.

It must not start the model load before the first page has loaded, and it must
not load a model for a notebook with nothing in it. Both came from the same
CI failure (run 34734999382): with sentence-transformers installed, the torch
import the warm-up triggered stalled the event loop past the shell's 8s
`/auth/status` probe on a fresh data dir, and the lock screen never appeared.
"""

from __future__ import annotations

import threading

import pytest

from memorymap.ai import embeddings


class _Service:
    def __init__(self):
        self.calls = 0
        self.done = threading.Event()

    def embed_text(self, _text):
        self.calls += 1
        self.done.set()


@pytest.fixture
def fresh_warmup(monkeypatch):
    """Each test starts from a process that has not warmed yet, with no pause."""
    monkeypatch.setattr(embeddings, "_warmup", {"running": False, "started": False, "error": False})
    monkeypatch.setattr(embeddings, "WARMUP_DELAY_SECONDS", 0)
    # Nothing to backfill and no matrix to warm: not what is under test.
    monkeypatch.setattr(embeddings, "backfill_missing", lambda *_a, **_k: None)


def test_an_empty_notebook_loads_no_model(fresh_warmup, monkeypatch):
    monkeypatch.setattr(embeddings, "_notebook_has_notes", lambda _f: False)
    service = _Service()
    embeddings.start_warmup(service, session_factory=lambda: None)
    assert not service.done.wait(0.5)
    assert service.calls == 0


def test_a_notebook_with_notes_warms_the_model(fresh_warmup, monkeypatch):
    monkeypatch.setattr(embeddings, "_notebook_has_notes", lambda _f: True)
    service = _Service()
    embeddings.start_warmup(service, session_factory=lambda: None)
    assert service.done.wait(2)
    assert service.calls == 1


def test_no_session_factory_still_warms(fresh_warmup):
    """Callers that pass no factory (older wiring, tests) keep the old
    behaviour: there is no notebook to ask, so the model loads."""
    service = _Service()
    embeddings.start_warmup(service)
    assert service.done.wait(2)


def test_the_pause_comes_before_the_load(fresh_warmup, monkeypatch):
    """The delay is what lets the first page load through; it has to sit in
    front of the model load, not after it."""
    order = []
    monkeypatch.setattr(embeddings, "_notebook_has_notes", lambda _f: True)
    monkeypatch.setattr(embeddings.time, "sleep", lambda _s: order.append("pause"))

    class Recording(_Service):
        def embed_text(self, text):
            order.append("load")
            super().embed_text(text)

    service = Recording()
    embeddings.start_warmup(service, session_factory=lambda: None)
    assert service.done.wait(2)
    assert order == ["pause", "load"]


def test_an_unreadable_database_does_not_stop_the_warm_up():
    """A wrong True costs one model load; a wrong False costs a cold first
    search. The helper errs on the side of warming."""

    def broken_factory():
        raise RuntimeError("no database")

    assert embeddings._notebook_has_notes(broken_factory) is True


def test_the_helper_reads_the_real_table(tmp_path):
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(f"sqlite:///{tmp_path / 'n.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE entries (id INTEGER PRIMARY KEY)"))
    factory = sessionmaker(bind=engine)
    assert embeddings._notebook_has_notes(factory) is False
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO entries (id) VALUES (1)"))
    assert embeddings._notebook_has_notes(factory) is True
