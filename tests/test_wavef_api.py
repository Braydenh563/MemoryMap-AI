"""Wave F: markdown export/import, backups + restore, opt-in web search."""

from __future__ import annotations

import io
import zipfile

from memorymap.ai import tools
from memorymap.core import backup, deps
from memorymap.search import websearch


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


# --- markdown export ---------------------------------------------------------------


def test_markdown_export_zip_layout(client):
    _save(client, "buy milk", category="Shopping", tags=["errand"])
    binned = _save(client, "old thought")
    client.delete(f"/entries/{binned['id']}")

    response = client.get("/export/markdown")
    assert response.status_code == 200
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    assert any(name.startswith("Shopping/") for name in names)
    assert any(name.startswith("_recycle-bin/") for name in names)  # never dropped

    shopping = archive.read([n for n in names if n.startswith("Shopping/")][0]).decode()
    assert "category: Shopping" in shopping
    assert "tags: [errand]" in shopping
    assert shopping.rstrip().endswith("buy milk")


# --- markdown import ---------------------------------------------------------------


def _upload(client, files):
    return client.post(
        "/import/markdown",
        files=[("files", (name, body.encode(), "text/markdown")) for name, body in files],
    )


def test_markdown_import_with_frontmatter(client):
    body = "---\ncategory: Recipes\ntags: [dinner, easy]\n---\n\nPasta: boil, sauce, eat."
    response = _upload(client, [("pasta.md", body)])
    assert response.status_code == 201
    assert response.json() == {"imported": 1, "skipped": []}

    entry = client.get("/entries").json()[0]
    assert entry["content"] == "Pasta: boil, sauce, eat."
    assert entry["category"] == "Recipes"
    assert entry["tags"] == ["dinner", "easy"]
    assert entry["user_filed"] is True  # the file chose its home


def test_markdown_import_plain_file_and_skips(client):
    response = _upload(client, [("idea.md", "just a plain thought"), ("empty.md", "   ")])
    body = response.json()
    assert body["imported"] == 1
    assert body["skipped"] == ["empty.md: empty"]
    assert client.get("/entries").json()[0]["category"] == "Uncategorised"


def test_markdown_roundtrip(client):
    _save(client, "roundtrip me", category="Ideas", tags=["keep"])
    exported = client.get("/export/markdown").content
    archive = zipfile.ZipFile(io.BytesIO(exported))
    name = archive.namelist()[0]

    response = _upload(client, [(name.split("/")[-1], archive.read(name).decode())])
    assert response.json()["imported"] == 1
    contents = [e["content"] for e in client.get("/entries").json()]
    assert contents.count("roundtrip me") == 2  # original + reimport


# --- backups -----------------------------------------------------------------------


def test_backup_create_list_delete(client):
    # create_app() already took a startup backup — work relative to it.
    baseline = {b["name"] for b in client.get("/backups").json()}
    _save(client, "worth keeping")
    created = client.post("/backups")
    assert created.status_code == 201
    name = created.json()["name"]

    listed = client.get("/backups").json()
    assert {b["name"] for b in listed} == baseline | {name}
    assert all(b["size"] > 0 for b in listed)

    assert client.delete(f"/backups/{name}").json() == {"deleted": name}
    assert {b["name"] for b in client.get("/backups").json()} == baseline
    assert client.delete("/backups/nope.db").status_code == 404


def test_backup_restore_rolls_the_database_back(client):
    keep = _save(client, "note before the backup")
    before_count = len(client.get("/backups").json())
    name = client.post("/backups").json()["name"]
    _save(client, "note after the backup")

    response = client.post("/backups/restore", json={"name": name})
    assert response.status_code == 200

    entries = client.get("/entries").json()
    assert [e["content"] for e in entries] == ["note before the backup"]
    assert keep["id"] in [e["id"] for e in entries]
    # The named backup + a pre-restore safety snapshot both exist.
    assert len(client.get("/backups").json()) == before_count + 2


def test_backup_if_due_skips_recent(app_state):
    config = deps.get_config()
    config.db_path.touch()
    first = backup.backup_if_due(config.db_path, config.data_dir)
    assert first is not None
    assert backup.backup_if_due(config.db_path, config.data_dir) is None  # too soon


# --- web search --------------------------------------------------------------------

FAKE_DDG_PAGE = """
<div class="result">
  <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fbrisbane&amp;rut=abc">Brisbane &amp; weather</a>
  <a class="result__snippet" href="#">It is <b>sunny</b> today.</a>
</div>
"""


def test_websearch_disabled_by_default(client):
    response = client.get("/websearch?q=anything")
    assert response.status_code == 403
    assert "Settings" in response.json()["detail"]


def test_websearch_enabled_returns_parsed_results(client, monkeypatch):
    client.put("/preferences", json={"web_search_enabled": True})
    monkeypatch.setattr(
        websearch,
        "search_web",
        lambda q, limit=5, searxng_url=None: websearch._parse_results(FAKE_DDG_PAGE, limit),
    )
    body = client.get("/websearch?q=brisbane weather").json()
    assert body["results"] == [
        {
            "title": "Brisbane & weather",
            "url": "https://example.com/brisbane",
            "snippet": "It is sunny today.",
            "domain": "example.com",
            "engine": "duckduckgo",
        }
    ]
    assert body["provider"] == "duckduckgo"


def test_ddg_parser_has_a_backup_pattern():
    """If the primary result markup disappears, the looser pattern still works."""
    websearch.clear_cache()
    changed_markup = """
    <div class="results">
      <a href="/l/?uddg=https%3A%2F%2Fexample.org%2Fdocs" class="result-link">Docs</a>
      <td class="result-snippet">Some helpful text.</td>
    </div>
    """
    parsed = websearch._parse_results(changed_markup, 5)
    assert parsed[0]["url"] == "https://example.org/docs"
    assert parsed[0]["snippet"] == "Some helpful text."


def test_searxng_is_used_when_configured(client, monkeypatch):
    websearch.clear_cache()
    client.put(
        "/preferences",
        json={"web_search_enabled": True, "searxng_url": "http://localhost:8888"},
    )

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {
                "results": [
                    {
                        "title": "Self-hosted result",
                        "url": "https://example.net/page",
                        "content": "From my own instance.",
                    }
                ]
            }

    captured = {}

    def fake_get(url, params=None, headers=None, timeout=None):
        captured["url"] = url
        captured["params"] = params
        return FakeResponse()

    monkeypatch.setattr(websearch.requests, "get", fake_get)
    body = client.get("/websearch?q=hello").json()
    assert captured["url"] == "http://localhost:8888/search"
    assert captured["params"]["format"] == "json"
    assert body["provider"] == "searxng"
    assert body["results"][0]["domain"] == "example.net"
    assert body["results"][0]["engine"] == "searxng"


def test_searxng_failure_falls_back_to_duckduckgo(client, monkeypatch):
    websearch.clear_cache()
    client.put(
        "/preferences",
        json={"web_search_enabled": True, "searxng_url": "http://localhost:8888"},
    )

    def boom(*args, **kwargs):
        raise websearch.requests.RequestException("instance is down")

    monkeypatch.setattr(websearch.requests, "get", boom)
    monkeypatch.setattr(
        websearch, "_search_duckduckgo", lambda q, limit: websearch._parse_results(FAKE_DDG_PAGE, limit)
    )
    body = client.get("/websearch?q=anything").json()
    # SearXNG failing must not break search — DuckDuckGo answers instead.
    assert body["results"][0]["engine"] == "duckduckgo"


def test_websearch_results_are_cached_briefly(monkeypatch):
    websearch.clear_cache()
    calls = []

    def counted(query, limit):
        calls.append(query)
        return websearch._parse_results(FAKE_DDG_PAGE, limit)

    monkeypatch.setattr(websearch, "_search_duckduckgo", counted)
    websearch.search_web("same query")
    websearch.search_web("same query")
    assert len(calls) == 1  # second one served from cache
    websearch.clear_cache()


def test_reader_strips_scripts_and_markup():
    page = """
    <html><head><title>A Page</title></head>
    <body><script>alert('x')</script><style>p{color:red}</style>
    <h1>Heading</h1><p>First para.</p><p>Second para.</p></body></html>
    """
    text = websearch._readable_text(page)
    assert "alert" not in text and "color:red" not in text
    assert "Heading" in text and "First para." in text
    assert websearch._page_title(page) == "A Page"


def test_reader_endpoint_requires_opt_in_and_http(client, monkeypatch):
    assert client.get("/websearch/read?url=https://example.com").status_code == 403
    client.put("/preferences", json={"web_search_enabled": True})
    assert client.get("/websearch/read?url=file:///etc/passwd").status_code == 502


def test_websearch_tool_hidden_until_opted_in(client):
    names = [t["function"]["name"] for t in tools.ollama_tools()]
    assert "web_search" not in names

    client.put("/preferences", json={"web_search_enabled": True})
    names = [t["function"]["name"] for t in tools.ollama_tools()]
    assert "web_search" in names


def test_websearch_tool_refuses_when_disabled(client, session):
    # web_search is gated off until the online opt-in (Wave O routes this
    # through the shared tool_enabled check → "turned off" message).
    result = tools.execute_tool(session, "web_search", {"query": "x"})
    assert "error" in result and "turned off" in result["error"]
