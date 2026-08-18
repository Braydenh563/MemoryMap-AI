"""The basic entries API responds over HTTP: health check, create/read,
missing-entry 404, the frontend mount, and validation."""

from __future__ import annotations

from tests._css_paths import CSS_FILES


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


# --- pagination (BACKLOG.md §20: GET /entries used to be genuinely
# unbounded, returning the whole notebook in one response every time) -------


def test_entries_page_and_report_the_real_total(client):
    for i in range(5):
        client.post("/entries", json={"content": f"note {i}"})

    first = client.get("/entries", params={"limit": 2, "offset": 0})
    assert first.status_code == 200
    assert len(first.json()) == 2
    assert first.headers["X-Total-Count"] == "5"

    second = client.get("/entries", params={"limit": 2, "offset": 2})
    assert len(second.json()) == 2
    assert second.headers["X-Total-Count"] == "5"

    last = client.get("/entries", params={"limit": 2, "offset": 4})
    assert len(last.json()) == 1
    assert last.headers["X-Total-Count"] == "5"

    # No page overlaps or gaps: paging through with these params reconstructs
    # exactly the same set the old unpaginated response would have returned.
    paged_ids = {e["id"] for e in first.json() + second.json() + last.json()}
    whole = client.get("/entries", params={"limit": 100})
    assert paged_ids == {e["id"] for e in whole.json()}


def test_entries_default_page_size_is_bounded_but_generous(client):
    """No params at all still has to work exactly as before for any
    notebook under the default page size — the common case — and still
    report the true total either way."""
    for i in range(3):
        client.post("/entries", json={"content": f"note {i}"})
    response = client.get("/entries")
    assert response.status_code == 200
    assert len(response.json()) == 3
    assert response.headers["X-Total-Count"] == "3"


def test_entries_limit_is_validated(client):
    assert client.get("/entries", params={"limit": 0}).status_code == 422
    assert client.get("/entries", params={"limit": -1}).status_code == 422
    assert client.get("/entries", params={"offset": -1}).status_code == 422
    # Past the hard ceiling — a client can't force one giant page either.
    assert client.get("/entries", params={"limit": 999999}).status_code == 422


def test_frontend_served_at_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "MemoryMap AI" in response.text
    assert client.get("/app.js").status_code == 200
    # Whiteboard subsystem split out of app.js into its own file (ROADMAP.md
    # Priority 0 item 2), loaded by a second <script> tag in index.html.
    assert client.get("/whiteboard.js").status_code == 200
    # Graph view split out of app.js into its own file (frontend refactor
    # path, the step after whiteboard), loaded by a third <script> tag —
    # before app.js, not after, see index.html/graph.js for why.
    assert client.get("/graph.js").status_code == 200
    # style.css split into multiple linked files (ROADMAP.md Priority 0 item
    # 2) — every one of them has to actually be reachable at the path
    # index.html's <link> tags use, not just the directory that holds them.
    for name in CSS_FILES:
        assert client.get(f"/css/{name.name}").status_code == 200


def test_empty_content_rejected(client):
    assert client.post("/entries", json={"content": ""}).status_code == 422
