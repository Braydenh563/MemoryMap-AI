"""An empty or partial model cache is not "installed" (Brief 101c, the owner
2026-10-07): a `models--BAAI--bge-small-en-v1.5` folder with no files, or with
some, used to read as present and fail with `EmbeddingCacheBroken`. It is now
told apart by its required files and sizes, mended as a visible task, and the
rows say "Files missing" with Reinstall."""

from __future__ import annotations

import json
import sys
import types
from pathlib import Path

import pytest

from tessellate.ai import embeddings
from tessellate.core import embedmodels

BGE = "BAAI/bge-small-en-v1.5"
WEIGHT_BYTES = 120 * 1024 * 1024  # sparse on disk, so the test costs nothing


@pytest.fixture(autouse=True)
def _clean(tmp_path, monkeypatch):
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path / "hub"))
    embedmodels.reset_for_tests()
    yield
    embedmodels.reset_for_tests()


def _cache(tmp_path: Path, repo: str = BGE, *, weights: int | None = WEIGHT_BYTES, skip: tuple[str, ...] = ()) -> Path:
    """A snapshot laid out as the hub writes it: blobs behind symlinks."""
    root = tmp_path / "hub" / ("models--" + repo.replace("/", "--"))
    snap = root / "snapshots" / "abc123"
    blobs = root / "blobs"
    snap.mkdir(parents=True)
    blobs.mkdir(parents=True)
    files = {
        #: bge's real modules.json: a Transformer, a Pooling and a Normalize
        #: whose folder the hub does not hold (found on a real cache).
        "modules.json": json.dumps(
            [
                {"idx": 0, "name": "0", "path": "", "type": "sentence_transformers.models.Transformer"},
                {"idx": 1, "name": "1", "path": "1_Pooling", "type": "sentence_transformers.models.Pooling"},
                {"idx": 2, "name": "2", "path": "2_Normalize", "type": "sentence_transformers.models.Normalize"},
            ]
        ),
        "config.json": "{}",
        "tokenizer.json": "{}",
        "1_Pooling/config.json": "{}",
    }
    for name, text in files.items():
        if name in skip:
            continue
        blob = blobs / (name.replace("/", "_") + "-blob")
        blob.write_text(text)
        (snap / name).parent.mkdir(parents=True, exist_ok=True)
        (snap / name).symlink_to(blob)
    if weights is not None and "model.safetensors" not in skip:
        blob = blobs / "weights-blob"
        with blob.open("wb") as handle:
            handle.truncate(weights)
        (snap / "model.safetensors").symlink_to(blob)
    return root


def test_a_complete_cache_is_complete(tmp_path):
    _cache(tmp_path)
    health = embedmodels.cache_health(BGE)
    assert health["state"] == "complete" and health["missing"] == []


def test_no_folder_is_absent(tmp_path):
    assert embedmodels.cache_health(BGE)["state"] == "absent"


def test_an_empty_folder_is_not_installed(tmp_path):
    (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True)
    health = embedmodels.cache_health(BGE)
    assert health["state"] == "incomplete"
    assert "model weights" in health["missing"]
    row = next(m for m in embedmodels.status() if m["id"] == "bge-small")
    assert row["installed"] is False and row["files_missing"] is True


@pytest.mark.parametrize(
    "skipped, word",
    [
        ("modules.json", "modules.json"),
        ("config.json", "config.json"),
        ("tokenizer.json", "tokenizer"),
        ("1_Pooling/config.json", "1_Pooling/config.json"),
        ("model.safetensors", "model weights"),
    ],
)
def test_each_missing_required_file_is_named(tmp_path, skipped, word):
    _cache(tmp_path, skip=(skipped,))
    health = embedmodels.cache_health(BGE)
    assert health["state"] == "incomplete"
    assert any(word in item for item in health["missing"]), health


@pytest.mark.parametrize("size", [0, 4096])
def test_empty_or_truncated_weights_are_not_a_model(tmp_path, size):
    _cache(tmp_path, weights=size)
    health = embedmodels.cache_health(BGE)
    assert health["state"] == "incomplete" and any("weights" in item for item in health["missing"])


def test_an_unfinished_download_blob_is_incomplete(tmp_path):
    root = _cache(tmp_path)
    (root / "blobs" / "deadbeef.incomplete").write_bytes(b"x")
    assert embedmodels.cache_health(BGE)["state"] == "incomplete"


def test_a_broken_link_is_a_missing_file(tmp_path):
    root = _cache(tmp_path)
    (root / "blobs" / "config.json-blob").unlink()
    health = embedmodels.cache_health(BGE)
    assert health["state"] == "incomplete" and "config.json" in health["missing"]


def test_a_model_outside_the_catalogue_needs_only_non_empty_weights(tmp_path):
    repo = "someone/typed-model"
    _cache(tmp_path, repo, weights=2048)
    assert embedmodels.cache_health(repo)["state"] == "complete"


def test_the_choices_list_marks_a_partial_cache_not_downloaded(client, tmp_path):
    (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True)
    rows = client.get("/embedding-models/choices").json()["choices"]
    bge = next(r for r in rows if r["id"] == "bge-small")
    assert bge["downloaded"] is False and bge["files_missing"] is True


# -- loading --------------------------------------------------------------------


class _FakeST:
    calls: list[bool] = []

    def __init__(self, name, local_files_only=False):  # noqa: ANN001
        type(self).calls.append(bool(local_files_only))
        raise OSError("cache incomplete")


@pytest.fixture
def fake_st(monkeypatch):
    module = types.ModuleType("sentence_transformers")
    module.SentenceTransformer = _FakeST
    monkeypatch.setitem(sys.modules, "sentence_transformers", module)
    _FakeST.calls = []
    return _FakeST


def _service():
    return embeddings.EmbeddingService.__new__(embeddings.EmbeddingService)


def test_an_incomplete_cache_is_repaired_as_a_visible_task_not_inline(fake_st, tmp_path, monkeypatch):
    (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True)
    spawned = []
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: spawned.append(model.id))
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    with pytest.raises(embeddings.EmbeddingCacheBroken, match="repaired"):
        _service()._load_st_model()
    assert fake_st.calls == [True]  # no hidden online fetch
    assert spawned == ["bge-small"]
    state = embedmodels.current()
    assert state.running and state.repair is True


def test_the_repair_row_in_the_task_list_says_fixing_search_by_meaning(client, tmp_path, monkeypatch):
    (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True)
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: None)
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    started, _ = embedmodels.repair(BGE)
    assert started is True
    job = next(t for t in client.get("/tasks").json()["tasks"] if t["kind"] == "embedding-model")
    assert job["label"].startswith("Fixing search by meaning") and job["cancellable"] is True


def test_a_repair_may_clear_the_model_search_uses_because_it_is_broken(tmp_path, monkeypatch, app_state):
    root = _cache(tmp_path, weights=0)
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: None)
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    started, _ = embedmodels.repair(BGE)
    assert started is True
    assert not (root / "snapshots").exists()


def test_a_repair_never_touches_a_complete_cache(tmp_path, monkeypatch):
    root = _cache(tmp_path)
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: None)
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    started, _ = embedmodels.repair(BGE)
    assert started is False and (root / "snapshots").exists()


def test_with_automatic_installs_off_an_incomplete_cache_is_left_for_reinstall(fake_st, tmp_path, monkeypatch):
    (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True)
    spawned = []
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: spawned.append(model.id))
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    service = _service()
    service._models = types.SimpleNamespace(_config=types.SimpleNamespace(get_preference=lambda key, default=None: False))
    with pytest.raises(embeddings.EmbeddingCacheBroken, match="Reinstall"):
        service._load_st_model()
    assert spawned == []


def test_finishing_the_repair_lets_the_model_load_again(tmp_path, monkeypatch):
    """The download's end clears the service's back-off, so search by meaning
    returns without waiting out the retry interval or a restart."""
    called = []
    embedmodels.on_download_finished(lambda repo: called.append(repo))
    sys.modules["huggingface_hub"] = types.SimpleNamespace(snapshot_download=lambda repo_id: _cache(tmp_path))
    try:
        embedmodels._begin_download(embedmodels.EMBED_MODELS_BY_ID["bge-small"])
        import time

        for _ in range(100):
            if not embedmodels.current().running:
                break
            time.sleep(0.05)
    finally:
        sys.modules.pop("huggingface_hub", None)
        embedmodels._finished_hooks.clear()
    assert embedmodels.current().outcome == "completed"
    assert called == [BGE]


def test_the_rows_say_files_missing_with_reinstall():
    root = Path(__file__).resolve().parents[1] / "frontend" / "js"
    #: The embedding rows moved from the Packages pane into Search and index (INBOX 700).
    choices = (root / "embed-choices.js").read_text(encoding="utf-8")
    assert "Files missing" in choices and "Reinstall" in choices


def test_reinstall_clears_an_incomplete_model_even_when_search_uses_it(tmp_path, monkeypatch, app_state):
    """`remove` refuses the model in use; a broken one cannot be used, and
    fetching over the top of it resumes the same short files."""
    from tessellate.core import deps

    root = _cache(tmp_path, weights=0)
    assert deps.get_model_manager().embedding_st_model() == BGE
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: None)
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    started, _ = embedmodels.reinstall("bge-small")
    assert started is True
    assert not (root / "snapshots").exists()


def test_a_whole_model_in_use_is_not_deleted_by_reinstall(tmp_path, monkeypatch, app_state):
    root = _cache(tmp_path)
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: None)
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    embedmodels.reinstall("bge-small")
    assert (root / "snapshots").exists()


def test_a_process_fixes_an_incomplete_cache_twice_and_then_asks_the_person(fake_st, tmp_path, monkeypatch):
    """The owner: ask only after two failed fixes. Each failed fix leaves the
    folder incomplete; the third load says Reinstall and starts nothing."""
    (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True)
    spawned = []
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: spawned.append(model.id))
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    service = _service()
    for expected in ("repaired", "repaired", "Reinstall"):
        embedmodels.reset_for_tests()  # the previous fix has ended, unsuccessfully
        (tmp_path / "hub" / "models--BAAI--bge-small-en-v1.5").mkdir(parents=True, exist_ok=True)
        with pytest.raises(embeddings.EmbeddingCacheBroken, match=expected):
            service._load_st_model()
    assert spawned == ["bge-small", "bge-small"]
