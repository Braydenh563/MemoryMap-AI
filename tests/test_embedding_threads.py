"""One short note is embedded on one thread, never on torch's whole pool
(INBOX 434, background filing took 1.2 to 4 seconds).

Measured on the 4-core sandbox, one 70-character note, `encode()` median:
4 intra-op threads idle 39 ms; 4 threads with the machine busy 2,192 ms;
1 thread busy 79 ms. A sentence this short is a handful of tiny matrix
products, so the pool's barrier waits cost far more than the arithmetic does
the moment another process wants a core (the browser, the desktop window, an
indexer), and the owner's machine always has one. These tests are timing
free: they pin that the limit is set in the thread that encodes, before it
encodes, that the model is loaded once, and that a missing torch is not a
failure.
"""

from __future__ import annotations

import sys
import threading
import types

import numpy as np

from memorymap.ai import embeddings as emb
from memorymap.core import deps


class _Recorder:
    """A stand-in `torch` that records the thread count each encode runs at."""

    def __init__(self) -> None:
        self.threads = 4
        self.set_calls: list[tuple[int, str]] = []
        self.module = types.ModuleType("torch")
        self.module.get_num_threads = lambda: self.threads
        self.module.set_num_threads = self._set

    def _set(self, n: int) -> None:
        self.threads = n
        self.set_calls.append((n, threading.current_thread().name))


class _Model:
    def __init__(self, torch: _Recorder | None) -> None:
        self.torch = torch
        self.seen: list[tuple[int | None, bool]] = []

    def encode(self, text, show_progress_bar=True):  # noqa: ANN001
        self.seen.append((self.torch.threads if self.torch else None, show_progress_bar))
        return np.ones(4, dtype="float32")


def _service(app_state, model, monkeypatch):  # noqa: ANN001
    service = deps.get_embeddings()
    monkeypatch.setattr(service, "_models", types.SimpleNamespace(embedding_backend=lambda: "sentence-transformers"))
    service._st_model = model
    return service


def test_the_encode_runs_on_the_limited_pool_in_its_own_thread(app_state, monkeypatch):
    torch = _Recorder()
    monkeypatch.setitem(sys.modules, "torch", torch.module)
    monkeypatch.delenv("MEMORYMAP_EMBED_THREADS", raising=False)
    model = _Model(torch)
    service = _service(app_state, model, monkeypatch)

    done = []
    worker = threading.Thread(target=lambda: done.append(service.embed_text("a short note")), name="pool-worker")
    worker.start()
    worker.join()

    assert done and done[0] is not None
    # Set in the thread that encoded (an OpenMP build keeps it per thread), and
    # in force at the moment of the call, not merely set somewhere earlier.
    assert torch.set_calls == [(emb.EMBED_THREADS, "pool-worker")]
    assert model.seen == [(emb.EMBED_THREADS, False)]


def test_the_limit_is_set_once_per_thread_not_on_every_note(app_state, monkeypatch):
    torch = _Recorder()
    monkeypatch.setitem(sys.modules, "torch", torch.module)
    model = _Model(torch)
    service = _service(app_state, model, monkeypatch)

    for text in ("one", "two", "three"):
        service.embed_text(text)

    assert len(torch.set_calls) == 1
    assert [seen[0] for seen in model.seen] == [emb.EMBED_THREADS] * 3


def test_the_environment_can_raise_it(app_state, monkeypatch):
    torch = _Recorder()
    monkeypatch.setitem(sys.modules, "torch", torch.module)
    monkeypatch.setenv("MEMORYMAP_EMBED_THREADS", "3")
    model = _Model(torch)
    service = _service(app_state, model, monkeypatch)

    service.embed_text("a note")

    assert model.seen[0][0] == 3
    monkeypatch.setenv("MEMORYMAP_EMBED_THREADS", "not a number")
    assert emb.embed_threads() == emb.EMBED_THREADS


def test_a_torch_that_cannot_be_imported_is_not_a_failed_embed(app_state, monkeypatch):
    monkeypatch.setitem(sys.modules, "torch", None)  # `import torch` raises ImportError
    model = _Model(None)
    service = _service(app_state, model, monkeypatch)

    vector = service.embed_text("a note with no torch")

    assert vector is not None
    assert model.seen == [(None, False)]


def test_the_model_is_loaded_once_across_many_embeds(app_state, monkeypatch):
    service = deps.get_embeddings()
    monkeypatch.setattr(service, "_models", types.SimpleNamespace(embedding_backend=lambda: "sentence-transformers"))
    monkeypatch.setitem(sys.modules, "torch", None)
    loads = []
    model = _Model(None)
    monkeypatch.setattr(service, "_load_st_model", lambda: (loads.append(1), model)[1])
    service._st_model = None

    for text in ("first note", "second note", "third note"):
        service.embed_text(text)

    assert len(loads) == 1
    assert len(model.seen) == 3
