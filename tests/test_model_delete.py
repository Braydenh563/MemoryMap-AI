"""Uninstalling an Ollama model, and the guard against removing one in use."""

from __future__ import annotations

from memorymap.core import deps


def test_delete_unused_model(ai_client, fake_ollama):
    fake_ollama.installed.append({"name": "spare-model:latest", "size": 500})
    response = ai_client.post("/models/delete", json={"name": "spare-model:latest"})
    assert response.status_code == 200
    assert response.json()["deleted"] is True
    assert all(m["name"] != "spare-model:latest" for m in fake_ollama.installed)


def test_cannot_delete_the_active_chat_model(ai_client, fake_ollama):
    # The default chat model is llama3.2, installed as llama3.2:latest.
    deps.get_model_manager().set_chat_model("llama3.2")
    response = ai_client.post("/models/delete", json={"name": "llama3.2:latest"})
    assert response.status_code == 409
    assert "in use" in response.json()["detail"]


def test_delete_requires_ollama_running(client):
    # The default `client` fixture has Ollama off.
    assert client.post("/models/delete", json={"name": "whatever"}).status_code == 409
