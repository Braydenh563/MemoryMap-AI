"""INBOX 700, the owner's second addendum: "I feel like there should be the
options to modify, install, uninstall, reinstall embedded models etc. also
maybe a way to type a model name into a text box near the suggested model
section and then pull in a model that is typed in the box if it exists??
like from ollama or huggingface."

Pull a model by name: a Hugging Face repo (owner/name) is checked against the
Hub's metadata on the click, and only a sentence-transformers model with an
open licence and no code of its own is fetched; an Ollama name goes through
Ollama's own pull. The network is mocked throughout.
"""

from __future__ import annotations

import pytest

from memorymap.core import deps, embedmodels


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    embedmodels.reset_for_tests()
    started = []
    # No thread and no download: the start is what is under test.
    monkeypatch.setattr(embedmodels, "_spawn_download", lambda model: started.append(model))
    monkeypatch.setattr(embedmodels, "can_download", lambda: True)
    yield started
    embedmodels.reset_for_tests()


def _hub(monkeypatch, answer):
    calls = []

    def fake(repo):
        calls.append(repo)
        return answer

    monkeypatch.setattr(embedmodels, "hub_metadata", fake)
    return calls


_GOOD = {
    "id": "thenlper/gte-small",
    "siblings": [{"rfilename": "modules.json"}, {"rfilename": "model.safetensors"}, {"rfilename": "config.json"}],
    "tags": ["sentence-transformers", "license:mit"],
    "cardData": {"license": "mit"},
    "gated": False,
}


@pytest.mark.parametrize(
    ("typed", "kind"),
    [
        ("thenlper/gte-small", "hf"),
        ("nomic-embed-text", "ollama"),
        ("qwen3-embedding:0.6b", "ollama"),
        ("../etc/passwd", None),
        ("a b/c", None),
        ("", None),
    ],
)
def test_a_typed_name_is_read_as_a_hub_repo_or_an_ollama_name(typed, kind):
    assert embedmodels.parse_typed_name(typed)[0] == kind


def test_a_good_hub_model_is_fetched_as_a_background_download(ai_client, monkeypatch, _clean):
    calls = _hub(monkeypatch, _GOOD)
    body = ai_client.post("/embedding-models/pull", json={"name": "thenlper/gte-small"}).json()
    assert body["started"] is True, body
    assert calls == ["thenlper/gte-small"]
    assert [model.repo for model in _clean] == ["thenlper/gte-small"]
    row = next(t for t in ai_client.get("/tasks").json()["tasks"] if t["kind"] == "embedding-model")
    assert row["label"] == "Downloading thenlper/gte-small"


@pytest.mark.parametrize(
    ("answer", "words"),
    [
        (None, "No model called"),
        ({**_GOOD, "siblings": [{"rfilename": "model.gguf"}]}, "GGUF"),
        ({**_GOOD, "siblings": [{"rfilename": "model.safetensors"}, {"rfilename": "config.json"}]}, "sentence-transformers"),
        ({**_GOOD, "tags": ["custom_code", "license:mit"]}, "code"),
        ({**_GOOD, "gated": "manual"}, "terms"),
        ({**_GOOD, "cardData": {"license": "cc-by-nc-4.0"}, "tags": []}, "cc-by-nc-4.0"),
    ],
)
def test_a_hub_model_the_engine_cannot_use_is_refused_with_why(ai_client, monkeypatch, _clean, answer, words):
    _hub(monkeypatch, answer)
    body = ai_client.post("/embedding-models/pull", json={"name": "someone/some-model"}).json()
    assert body["started"] is False
    assert words in body["message"], body["message"]
    assert _clean == []


def test_an_unreachable_hub_says_so(ai_client, monkeypatch):
    def offline(repo):
        raise OSError("no network")

    monkeypatch.setattr(embedmodels, "hub_metadata", offline)
    body = ai_client.post("/embedding-models/pull", json={"name": "thenlper/gte-small"}).json()
    assert body["started"] is False and "reach" in body["message"]


def test_an_ollama_name_goes_through_ollamas_pull(ai_client, fake_ollama, monkeypatch):
    calls = _hub(monkeypatch, _GOOD)
    body = ai_client.post("/embedding-models/pull", json={"name": "all-minilm"}).json()
    assert body["started"] is True and body["source"] == "ollama"
    assert calls == []  # never the Hub for an Ollama name


def test_an_ollama_model_already_there_is_not_pulled_again(ai_client, fake_ollama):
    fake_ollama.installed.append({"name": "all-minilm:latest", "size": 45_000_000})
    body = ai_client.post("/embedding-models/pull", json={"name": "all-minilm"}).json()
    assert body["started"] is False and "already" in body["message"]


def test_listing_the_choices_never_touches_the_network(ai_client, monkeypatch):
    calls = _hub(monkeypatch, _GOOD)
    listed = ai_client.get("/embedding-models/choices")
    assert listed.status_code == 200
    assert calls == []


def test_the_model_in_use_cannot_be_uninstalled(app_state, tmp_path, monkeypatch):
    monkeypatch.setenv("HF_HUB_CACHE", str(tmp_path))
    (tmp_path / "models--BAAI--bge-small-en-v1.5").mkdir()
    assert deps.get_model_manager().embedding_st_model() == "BAAI/bge-small-en-v1.5"
    removed, message = embedmodels.remove("bge-small")
    assert removed is False and "in use" in message
    assert (tmp_path / "models--BAAI--bge-small-en-v1.5").is_dir()
