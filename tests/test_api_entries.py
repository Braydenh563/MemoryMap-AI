"""The basic entries API responds over HTTP: health check, create/read,
missing-entry 404, the frontend mount, and validation."""

from __future__ import annotations


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_post_then_get_entry(client):
    created = client.post(
        "/entries",
        json={"content": "Why did the scarecrow win an award?", "tags": ["joke"]},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["category"] == "Uncategorised"  # no AI in Phase 1
    assert body["tags"] == ["joke"]
    assert body["ai_confidence"] == 0

    listed = client.get("/entries")
    assert listed.status_code == 200
    assert [e["id"] for e in listed.json()] == [body["id"]]

    single = client.get(f"/entries/{body['id']}")
    assert single.status_code == 200
    assert single.json()["content"] == "Why did the scarecrow win an award?"


def test_missing_entry_is_404(client):
    assert client.get("/entries/9999").status_code == 404


def test_frontend_served_at_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "MemoryMap AI" in response.text
    assert client.get("/app.js").status_code == 200
    assert client.get("/style.css").status_code == 200


def test_empty_content_rejected(client):
    assert client.post("/entries", json={"content": ""}).status_code == 422
