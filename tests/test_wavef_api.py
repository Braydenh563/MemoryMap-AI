"""Wave F: markdown export/import, backups + restore, opt-in web search."""

from __future__ import annotations

import io
import time
import zipfile

import pytest

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

    # The request goes on its own line, not inside the assert: `python -O`
    # strips assert statements wholesale, which would delete the deletion and
    # leave the test passing while exercising nothing.
    deleted = client.delete(f"/backups/{name}")
    assert deleted.json() == {"deleted": name}
    assert {b["name"] for b in client.get("/backups").json()} == baseline
    missing = client.delete("/backups/nope.db")
    assert missing.status_code == 404


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
        lambda q, limit=5, searxng_url=None, provider="auto": websearch._parse_results(
            FAKE_DDG_PAGE, limit
        ),
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

    # Searches now go through a throwaway private session (no cookie jar, no
    # identifying User-Agent) and use POST so the query stays out of the
    # request line, so the fake stands in for the session rather than for
    # requests.get.
    class FakeSession:
        def post(self, url, data=None, headers=None, timeout=None):
            captured["url"] = url
            captured["data"] = data
            captured["headers"] = headers or {}
            return FakeResponse()

        def close(self):
            captured["closed"] = True

    monkeypatch.setattr(websearch, "_private_session", FakeSession)
    body = client.get("/websearch?q=hello").json()
    # The request goes to the address the guard checked, not to the name —
    # re-resolving between the check and the connection is the rebinding hole
    # the reader path already closed. `localhost` can be 127.0.0.1 or ::1
    # depending on the machine, so assert the shape rather than one of them.
    import ipaddress
    from urllib.parse import urlparse

    pinned = urlparse(captured["url"])
    assert pinned.path == "/search"
    assert pinned.port == 8888
    assert ipaddress.ip_address(pinned.hostname).is_loopback
    # …and TLS/vhost routing still sees the name the user configured.
    assert captured["headers"]["Host"] == "localhost:8888"
    assert captured["data"]["format"] == "json"
    assert captured["closed"] is True  # the session must not be kept around
    assert body["provider"] == "searxng"
    assert body["results"][0]["domain"] == "example.net"
    assert body["results"][0]["engine"] == "searxng"


def test_searxng_failure_falls_back_to_duckduckgo(client, monkeypatch):
    websearch.clear_cache()
    client.put(
        "/preferences",
        json={"web_search_enabled": True, "searxng_url": "http://localhost:8888"},
    )

    class DeadSession:
        def post(self, *args, **kwargs):
            raise websearch.requests.RequestException("instance is down")

        def close(self):
            pass

    monkeypatch.setattr(websearch, "_private_session", DeadSession)
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


def test_reader_returns_structured_blocks():
    """Headings, paragraphs and list items come back separately so the reader
    can lay a page out instead of dumping one wall of text."""
    page = """
    <html><head><title>Doc</title></head><body>
      <nav>Home Login Subscribe</nav>
      <article>
        <h2>Getting started</h2>
        <p>First paragraph of the article.</p>
        <ul><li>Point one</li><li>Point two</li></ul>
        <p>Closing thoughts.</p>
      </article>
      <footer>Cookie notice</footer>
    </body></html>
    """
    blocks = websearch._readable_blocks(page)
    kinds = [b["type"] for b in blocks]
    texts = [b["text"] for b in blocks]
    assert "heading" in kinds and "li" in kinds
    assert "Getting started" in texts
    assert "Point one" in texts
    # Nav and footer furniture is dropped.
    assert not any("Login" in t or "Cookie" in t for t in texts)


def test_searxng_status_without_docker_falls_back_to_source(client, monkeypatch):
    """No Docker isn't a dead end — SearXNG also runs from a virtualenv."""
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: True)
    body = client.get("/websearch/searxng/status").json()
    assert body["docker"] is False
    assert body["source"] is True
    assert body["backend"] == "source"


def test_searxng_installs_without_docker_or_git(client, monkeypatch):
    """Neither Docker nor git is a dead end any more.

    This is what "I can't download searxng" meant: `source_available` required
    the git binary, so a machine with neither Docker nor git was offered an
    install button that could never work. pip fetches a source tarball over
    HTTPS on its own, so Python and a network connection are the only real
    requirements.
    """
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "docker_installed", lambda: False)
    body = client.get("/websearch/searxng/status").json()
    assert body["source"] is True
    assert body["backend"] == "source"


def test_searxng_status_with_no_backend_at_all(client, monkeypatch):
    """Only reachable if source installs are disabled outright."""
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "docker_installed", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: False)
    body = client.get("/websearch/searxng/status").json()
    assert body["backend"] is None
    assert "run yourself" in body["detail"]


def test_docker_installed_but_not_running_is_not_treated_as_available(client, monkeypatch):
    """The reported failure: Docker Desktop installed but never started.

    Only checking that the binary exists made the app choose the Docker
    backend, fail to reach the daemon, and never consider the from-source
    backend that would have worked.
    """
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_installed", lambda: True)
    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: True)

    body = client.get("/websearch/searxng/status").json()
    assert body["backend"] == "source"  # fell through instead of failing
    assert "not running" in body["detail"]


def test_docker_installed_but_stopped_and_no_git_says_which_problem(client, monkeypatch):
    """"Docker isn't installed" and "Docker isn't started" need different fixes."""
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_installed", lambda: True)
    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: False)

    detail = client.get("/websearch/searxng/status").json()["detail"]
    assert "daemon isn't running" in detail
    assert "Docker Desktop" in detail


def test_docker_availability_checks_the_daemon_not_just_the_binary(monkeypatch):
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager.shutil, "which", lambda name: "/usr/bin/docker")

    class Failed:
        returncode = 1

    monkeypatch.setattr(searxng_manager.subprocess, "run", lambda *a, **k: Failed())
    assert searxng_manager.docker_installed() is True
    assert searxng_manager.docker_available() is False


def test_searxng_start_without_any_backend_is_a_clear_503(client, monkeypatch):
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: False)
    response = client.post("/websearch/searxng/start")
    assert response.status_code == 503
    assert "run yourself" in response.json()["detail"]


def test_searxng_start_from_source_installs_first(client, monkeypatch):
    """The first Start kicks off the install and says so, rather than hanging."""
    from memorymap.search import searxng_manager

    calls = []
    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: True)
    monkeypatch.setattr(searxng_manager, "source_installed", lambda data_dir: False)
    monkeypatch.setattr(
        searxng_manager,
        "install_source",
        lambda data_dir, on_ready=None: calls.append(data_dir),
    )

    response = client.post("/websearch/searxng/start")
    assert response.status_code == 503
    assert "few minutes" in response.json()["detail"]
    assert len(calls) == 1  # the install really was kicked off


def test_searxng_start_from_source_spawns_the_process(client, monkeypatch):
    from memorymap.search import searxng_manager

    monkeypatch.setattr(searxng_manager, "docker_available", lambda: False)
    monkeypatch.setattr(searxng_manager, "source_available", lambda: True)
    monkeypatch.setattr(searxng_manager, "source_installed", lambda data_dir: True)
    monkeypatch.setattr(searxng_manager, "_source_state", lambda data_dir: "stopped")
    monkeypatch.setattr(
        searxng_manager,
        "_start_source",
        lambda data_dir: {"url": searxng_manager.BASE_URL, "started": True, "backend": "source"},
    )
    monkeypatch.setattr(searxng_manager, "_wait_until_ready", lambda *a, **k: True)

    body = client.post("/websearch/searxng/start").json()
    assert body["running"] is True
    assert body["backend"] == "source"
    assert client.get("/preferences").json()["searxng_url"] == searxng_manager.BASE_URL


def test_searxng_start_saves_the_url(client, monkeypatch):
    from memorymap.search import searxng_manager

    monkeypatch.setattr(
        searxng_manager,
        "start",
        lambda data_dir, on_ready=None: {"url": "http://localhost:8888", "started": True},
    )
    body = client.post("/websearch/searxng/start").json()
    assert body["running"] is True
    assert client.get("/preferences").json()["searxng_url"] == "http://localhost:8888"


def test_searxng_stop_reverts_to_duckduckgo(client, monkeypatch):
    from memorymap.search import searxng_manager

    client.put("/preferences", json={"searxng_url": "http://localhost:8888"})
    monkeypatch.setattr(searxng_manager, "stop", lambda data_dir=None: {"stopped": True})
    body = client.post("/websearch/searxng/stop").json()
    assert body["running"] is False
    # The dead instance must not stay configured.
    assert client.get("/preferences").json()["searxng_url"] == ""


def test_searxng_settings_enable_the_json_api(tmp_path):
    """The JSON format is the step people miss — we must always write it."""
    from memorymap.search import searxng_manager

    path = searxng_manager.ensure_settings(tmp_path)
    text = path.read_text()
    assert "json" in text
    assert "use_default_settings:" in text

    # Rewritten on each start, so fixes to the managed defaults reach
    # installs made before those fixes existed — but the secret key
    # survives the rewrite, or every start would invalidate sessions.
    secret = searxng_manager._existing_secret_key(path)
    assert secret
    path.write_text(f'server:\n  secret_key: "{secret}"\n# edited by hand\n')
    searxng_manager.ensure_settings(tmp_path)
    refreshed = path.read_text()
    assert "# edited by hand" not in refreshed
    assert secret in refreshed

    # rewrite=False is the escape hatch that keeps a hand-edited file as-is.
    path.write_text("# edited by hand\n")
    searxng_manager.ensure_settings(tmp_path, rewrite=False)
    assert path.read_text() == "# edited by hand\n"


def test_searxng_detection_saves_the_url(client, monkeypatch):
    client.put("/preferences", json={"web_search_enabled": True})
    monkeypatch.setattr(
        websearch, "discover_searxng", lambda: "http://localhost:8888"
    )
    body = client.post("/websearch/detect-searxng").json()
    assert body == {"found": True, "url": "http://localhost:8888"}
    assert client.get("/preferences").json()["searxng_url"] == "http://localhost:8888"


def test_searxng_detection_reports_when_absent(client, monkeypatch):
    client.put("/preferences", json={"web_search_enabled": True})
    monkeypatch.setattr(websearch, "discover_searxng", lambda: None)
    body = client.post("/websearch/detect-searxng").json()
    assert body["found"] is False
    assert "No SearXNG" in body["detail"]


def test_log_noise_filter_drops_windows_proactor_chatter():
    """The Windows asyncio Proactor error is benign and must not reach the
    log viewer, but real errors still must."""
    import logging

    from memorymap.core import logbuffer

    noise = logging.LogRecord(
        "asyncio", logging.ERROR, __file__, 1,
        "Exception in callback _ProactorBasePipeTransport._call_connection_lost(None)",
        None, None,
    )
    real = logging.LogRecord(
        "memorymap", logging.ERROR, __file__, 1, "Something actually broke", None, None
    )
    log_filter = logbuffer.NoiseFilter()
    assert log_filter.filter(noise) is False
    assert log_filter.filter(real) is True


def test_reader_endpoint_requires_opt_in_and_http(client, monkeypatch):
    assert client.get("/websearch/read?url=https://example.com").status_code == 403
    client.put("/preferences", json={"web_search_enabled": True})
    # Not a fetchable URL at all, so it's rejected as a bad request rather than
    # attempted and reported as a bad gateway.
    assert client.get("/websearch/read?url=file:///etc/passwd").status_code == 400


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


# --- outbound-request guards (CodeQL SSRF findings) ---------------------------


def test_reader_refuses_a_link_that_points_at_this_machine(client, monkeypatch):
    """A search result must not be able to make the app fetch localhost."""
    from memorymap.search import websearch

    def boom(*args, **kwargs):  # pragma: no cover — must never be reached
        raise AssertionError("the guard should have stopped this request")

    monkeypatch.setattr(websearch.requests, "get", boom)
    client.put("/preferences", json={"web_search_enabled": True})
    response = client.get("/websearch/read?url=http://127.0.0.1:8080/admin")
    assert response.status_code == 502
    assert "local address" in response.json()["detail"]


def test_reader_refuses_a_url_carrying_credentials(client, monkeypatch):
    """"http://ok.example@evil.example/" reads as one host and resolves to another."""
    from memorymap.search import websearch

    def boom(*args, **kwargs):  # pragma: no cover — must never be reached
        raise AssertionError("the guard should have stopped this request")

    monkeypatch.setattr(websearch.requests, "get", boom)
    client.put("/preferences", json={"web_search_enabled": True})
    response = client.get("/websearch/read?url=http://example.com@127.0.0.1/")
    assert response.status_code == 502


def test_searxng_probe_rejects_a_public_address(monkeypatch):
    """SearXNG is self-hosted, so a public URL is refused rather than probed."""
    from memorymap.search import websearch

    def boom(*args, **kwargs):  # pragma: no cover — must never be reached
        raise AssertionError("the guard should have stopped this request")

    monkeypatch.setattr(websearch.requests, "get", boom)
    assert websearch.probe_searxng("https://searx.example.com") is False
    assert websearch.probe_searxng("not-a-url") is False


def test_searxng_search_rejects_a_public_address():
    from memorymap.search import websearch

    with pytest.raises(websearch.WebSearchError, match="this machine or your own network"):
        websearch._search_searxng("anything", 5, "https://searx.example.com")


def test_searxng_probe_still_allows_localhost(monkeypatch):
    """The guard must not break the instance the app itself starts."""
    from memorymap.search import websearch

    class FakeResponse:
        status_code = 200

        def json(self):
            return {"results": []}

    monkeypatch.setattr(websearch.requests, "get", lambda *a, **k: FakeResponse())
    assert websearch.probe_searxng("http://localhost:8888") is True


def test_reader_refuses_a_redirect_into_the_local_network(client, monkeypatch):
    """A public page must not be able to 302 the app onto localhost."""
    from memorymap.search import websearch

    seen = []

    class FakeResponse:
        def __init__(self, url):
            self.is_redirect = True
            self.is_permanent_redirect = False
            self.headers = {"location": "http://127.0.0.1:11434/api/tags"}
            self.url = url

        def close(self):
            pass

    class FakeSession:
        def get(self, url, **kwargs):
            seen.append((url, kwargs.get("headers", {}).get("Host")))
            return FakeResponse(url)

        def mount(self, prefix, adapter):
            pass

        def close(self):
            pass

    monkeypatch.setattr(websearch, "_private_session", FakeSession)
    client.put("/preferences", json={"web_search_enabled": True})
    response = client.get("/websearch/read?url=https://example.com/post")
    assert response.status_code == 502
    assert "local address" in response.json()["detail"]
    # One hop was fetched and the redirect target never was. The fetched URL
    # carries the resolved IP rather than the hostname — each hop connects to
    # the address that passed the check, so a nameserver can't answer the
    # check and the connection differently (DNS rebinding).
    assert len(seen) == 1
    fetched_url, host_header = seen[0]
    assert host_header == "example.com"
    assert "example.com" not in fetched_url


def test_reader_opens_an_ordinary_result_page(client, monkeypatch):
    """The reader's whole job is opening results, which live on any site.

    Guards this against the host allowlist that briefly shipped and rejected
    every real page, since the engines it allowed are never where results are.
    """
    from memorymap.search import websearch

    monkeypatch.setattr(
        websearch,
        "fetch_readable",
        lambda url: {"title": "A post", "url": url, "blocks": [], "text": "hello"},
    )
    client.put("/preferences", json={"web_search_enabled": True})
    response = client.get("/websearch/read?url=https://en.wikipedia.org/wiki/Cat")
    assert response.status_code == 200
    assert response.json()["title"] == "A post"


def test_uploading_recreates_a_missing_uploads_folder(client, app_state, tmp_path):
    """The folder is made at startup, but it only has to vanish once.

    A cleanup tool, an unmounted data directory, or a restore that skipped an
    empty folder used to turn every upload into a 500 with a traceback. For a
    sketch that is the worst shape of failure: the note saves first, so only
    the drawing is lost and the caption is left behind pointing at nothing.
    """
    import shutil

    entry = _save(client, "a sketch caption", category="Sketches")
    uploads = deps.get_config().uploads_dir
    shutil.rmtree(uploads)
    assert not uploads.exists()

    response = client.post(
        f"/entries/{entry['id']}/files",
        files={"file": ("sketch.png", b"\x89PNG\r\n\x1a\nnot-really", "image/png")},
    )
    assert response.status_code == 201
    assert response.json()["attachments"][0]["filename"] == "sketch.png"


def test_the_source_install_never_shells_out_to_git(app_state, tmp_path, monkeypatch):
    """git is not used at all now, with or without the binary installed.

    SearXNG's repository has four files with a colon in the name, so it cannot
    be checked out on Windows — see SOURCE_TARBALL. The archive is downloaded
    and unpacked here instead, minus the members this filesystem can't hold.
    """
    from memorymap.search import searxng_manager

    calls = []

    class _Ok:
        returncode = 0
        stdout = ""
        stderr = ""

    def fake_run(cmd, timeout=None, on_line=None, env=None):
        calls.append(list(cmd))
        return _Ok()

    src = searxng_manager._source_dir(tmp_path)

    def fake_fetch(target, state):
        target.mkdir(parents=True, exist_ok=True)
        (target / "setup.py").write_text("")

    monkeypatch.setattr(searxng_manager, "_run", fake_run)
    monkeypatch.setattr(searxng_manager, "_run_streaming", fake_run)
    monkeypatch.setattr(searxng_manager, "_fetch_source", fake_fetch)
    # Pretend the venv already exists so the install goes straight to pip.
    monkeypatch.setattr(searxng_manager, "_venv_python", lambda d: tmp_path / "python")
    (tmp_path / "python").write_text("")

    searxng_manager.install_source(tmp_path)
    for _ in range(100):  # the install runs on a worker thread
        if not searxng_manager._install_state["running"]:
            break
        time.sleep(0.05)

    assert searxng_manager._install_state["error"] == ""
    assert not any(c[0] == "git" for c in calls), "should not shell out to git"
    package = next(c for c in calls if "-e" in c)
    assert package[-2:] == ["-e", str(src)]
