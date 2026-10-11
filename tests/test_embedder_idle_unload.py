"""The search model is let go after an idle hour (WORLD_CLASS_PLAN decision
62, Brief 63): "The embedder loads on first use and unloads after an idle
hour (a setting, default on)".

Timing free: the clock is passed in. What is pinned is that an idle model
goes, a used one stays, the setting keeps it, search still counts as ready
(the next embed loads it again), and a request only queues the unload, so
the event loop never pays for it.
"""

from __future__ import annotations

import types

import numpy as np

from memorymap.ai import embeddings as emb
from memorymap.core import deps
from tests._app_js import app_js_text


class _Model:
    def __init__(self) -> None:
        self.encoded = 0

    def encode(self, text, show_progress_bar=True):  # noqa: ANN001
        self.encoded += 1
        if isinstance(text, list):
            return np.ones((len(text), 4), dtype="float32")
        return np.ones(4, dtype="float32")


def _service(monkeypatch, backend="sentence-transformers"):  # noqa: ANN001
    service = deps.get_embeddings()
    config = deps.get_config()
    monkeypatch.setattr(
        service,
        "_models",
        types.SimpleNamespace(embedding_backend=lambda: backend, _config=config, embedding_st_model=lambda: emb.DEFAULT_ST_MODEL),
    )
    loads = []

    def load():  # noqa: ANN202
        loads.append(1)
        return _Model()

    monkeypatch.setattr(service, "_load_st_model", load)
    monkeypatch.setattr(emb, "_limit_torch_threads", lambda: None)
    return service, loads


def test_the_setting_is_on_by_default(client):
    from memorymap.core import config as config_module

    assert config_module.DEFAULT_PREFERENCES["embedding_idle_unload"] is True
    assert client.get("/preferences").json()["embedding_idle_unload"] is True
    assert client.put("/preferences", json={"embedding_idle_unload": False}).status_code == 200
    assert client.get("/preferences").json()["embedding_idle_unload"] is False


def test_an_idle_hour_lets_the_model_go_and_the_next_embed_loads_it_again(app_state, monkeypatch):
    service, loads = _service(monkeypatch)
    assert service.embed_text("first") is not None
    assert loads == [1]
    used = service._last_used

    assert service.unload_if_idle(now=used + emb.IDLE_UNLOAD_SECONDS - 1) is False
    assert service._st_model is not None
    assert service.unload_if_idle(now=used + emb.IDLE_UNLOAD_SECONDS) is True
    assert service._st_model is None
    # Still ready: a search goes on to embed, which loads it, rather than
    # dropping to keywords because the model is resting.
    assert service.is_ready() is True
    assert service.is_loaded() is False

    assert service.embed_text("second") is not None
    assert loads == [1, 1]
    assert service.is_loaded() is True


def test_a_model_in_use_stays(app_state, monkeypatch):
    service, _loads = _service(monkeypatch)
    service.embed_text("one")
    later = service._last_used + emb.IDLE_UNLOAD_SECONDS - 5
    service.embed_many(["two", "three"])
    assert service._last_used >= later - emb.IDLE_UNLOAD_SECONDS + 5
    assert service.unload_if_idle(now=service._last_used + 10) is False
    assert service.is_loaded() is True


def test_the_setting_off_keeps_the_model(app_state, monkeypatch):
    service, _loads = _service(monkeypatch)
    deps.get_config().set_preference("embedding_idle_unload", False)
    service.embed_text("one")
    assert service.unload_if_idle(now=service._last_used + 10 * emb.IDLE_UNLOAD_SECONDS) is False
    assert service.is_loaded() is True


def test_nothing_loaded_is_nothing_to_unload(app_state, monkeypatch):
    service, _loads = _service(monkeypatch)
    assert service.unload_if_idle(now=10 * emb.IDLE_UNLOAD_SECONDS) is False
    assert service.is_ready() is False


def test_a_failed_reload_reports_not_ready(app_state, monkeypatch):
    service, _loads = _service(monkeypatch)
    service.embed_text("one")
    service.unload_if_idle(now=service._last_used + emb.IDLE_UNLOAD_SECONDS)

    def broken():  # noqa: ANN202
        raise OSError("disk gone")

    monkeypatch.setattr(service, "_load_st_model", broken)
    assert service.embed_text("two") is None
    assert service.is_ready() is False


def test_a_request_queues_the_unload_once_a_minute_at_most(app_state, monkeypatch):
    from memorymap.core import jobs

    service, _loads = _service(monkeypatch)
    service.embed_text("one")
    queued = []
    monkeypatch.setattr(jobs, "enqueue", lambda kind, func, *a, **k: queued.append((kind, k.get("dedupe_key"))))
    monkeypatch.setattr(emb, "_idle_check", {"at": 0.0})
    now = service._last_used + emb.IDLE_UNLOAD_SECONDS + 1
    monkeypatch.setattr(emb.time, "monotonic", lambda: now)

    emb.note_request()
    emb.note_request()  # inside the minute: no second look
    assert queued == [("warm", ("embed-unload", id(service)))]
    assert service.is_loaded() is True, "the request only queues; the pool unloads"


def test_a_recent_embed_queues_nothing(app_state, monkeypatch):
    from memorymap.core import jobs

    service, _loads = _service(monkeypatch)
    service.embed_text("one")
    queued = []
    monkeypatch.setattr(jobs, "enqueue", lambda *a, **k: queued.append(a))
    monkeypatch.setattr(emb, "_idle_check", {"at": 0.0})
    now = service._last_used + 60
    monkeypatch.setattr(emb.time, "monotonic", lambda: now)
    emb.note_request()
    assert queued == []


def test_the_ask_box_warms_a_rested_model(app_state, monkeypatch):
    """`search_manager.warm` used to read `is_ready`, which stays True for a rested
    model, so focus in Ask would not start the load it exists to start."""
    from memorymap.search import search_manager

    service, _loads = _service(monkeypatch)
    service.embed_text("one")
    service.unload_if_idle(now=service._last_used + emb.IDLE_UNLOAD_SECONDS)
    from memorymap.core import jobs

    queued = []
    monkeypatch.setattr(jobs, "enqueue", lambda kind, func, *a, **k: queued.append(kind))
    session = deps.get_db().session()
    try:
        search_manager.warm(session, "sourdough starter", service)
    finally:
        session.close()
    assert queued == ["warm"]


def test_settings_has_the_switch_and_help_names_it():
    js = app_js_text()
    assert '"embedding_idle_unload"' in js
    assert "prefsCache.embedding_idle_unload" in js
    html = open("frontend/index.html", encoding="utf-8").read()
    assert 'id="pref-embedding-idle-unload"' in html
    from memorymap.ai import help_topics_more

    text = open(help_topics_more.__file__, encoding="utf-8").read()
    assert "Let the search model go after an idle hour" in text
