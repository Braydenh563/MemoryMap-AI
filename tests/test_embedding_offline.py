"""The embedding model goes online only for its first download (INBOX 439).

The owner's privacy panel showed huggingface.co contacted by the embedding
model with the model already on the machine: a failed cache load fell
through to an online load, logged at debug. A stand-in for the library here
records every load and whether it was allowed online.
"""

from __future__ import annotations

import sys
import types

import pytest

from memorymap.ai import embeddings
from memorymap.core import embedmodels


class _FakeST:
    calls: list[bool] = []
    local_works = True

    def __init__(self, name, local_files_only=False):  # noqa: ANN001
        type(self).calls.append(bool(local_files_only))
        if local_files_only and not type(self).local_works:
            raise OSError("cache incomplete")


@pytest.fixture
def fake_st(monkeypatch):
    module = types.ModuleType("sentence_transformers")
    module.SentenceTransformer = _FakeST
    monkeypatch.setitem(sys.modules, "sentence_transformers", module)
    _FakeST.calls = []
    _FakeST.local_works = True
    return _FakeST


def _service():
    return embeddings.EmbeddingService.__new__(embeddings.EmbeddingService)


def test_a_cached_model_loads_without_going_online(fake_st):
    _service()._load_st_model()
    assert fake_st.calls == [True]


def test_a_model_on_disk_that_will_not_load_is_fetched_again_once(fake_st, monkeypatch):
    """The owner, 2026-10-07: "things should be auto fixed for the user"."""
    fake_st.local_works = False
    monkeypatch.setattr(embedmodels, "is_downloaded", lambda repo: True)
    service = _service()
    service._load_st_model()
    assert fake_st.calls == [True, False]  # one repair fetch


def test_with_automatic_installs_off_a_broken_model_stays_offline(fake_st, monkeypatch):
    fake_st.local_works = False
    monkeypatch.setattr(embedmodels, "is_downloaded", lambda repo: True)
    service = _service()
    service._models = types.SimpleNamespace(_config=types.SimpleNamespace(get_preference=lambda key, default=None: False))
    with pytest.raises(embeddings.EmbeddingCacheBroken, match="Reinstall it from Settings"):
        service._load_st_model()
    assert fake_st.calls == [True]  # no online attempt


def test_a_model_never_downloaded_downloads_once(fake_st, monkeypatch):
    fake_st.local_works = False
    monkeypatch.setattr(embedmodels, "is_downloaded", lambda repo: False)
    _service()._load_st_model()
    assert fake_st.calls == [True, False]


def test_downloaded_means_weights_in_a_snapshot(tmp_path, monkeypatch):
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    repo_dir = tmp_path / "models--BAAI--bge-small-en-v1.5"
    (repo_dir / "snapshots" / "abc").mkdir(parents=True)
    assert not embedmodels.is_downloaded("BAAI/bge-small-en-v1.5")
    (repo_dir / "snapshots" / "abc" / "model.safetensors").write_bytes(b"x")
    assert embedmodels.is_downloaded("BAAI/bge-small-en-v1.5")
