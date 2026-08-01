"""The roadmap's Tier 1 — six small things, each invisible until it bites.

What links them is that none announces itself. A slider that does nothing, a
log that silently forgot the line you needed, an engine choice that never says
whether it was honoured, a second worker quietly halving the log: all of them
look like the app working until you depend on them.
"""

from __future__ import annotations

import logging

import pytest

from memorymap.core import deps, logbuffer
from memorymap.search import searxng_manager, websearch

# Asserted as text rather than parsed YAML, deliberately: nothing in this
# project depends on PyYAML — searxng_manager reads SearXNG's own settings by
# scanning the text — and a test is the wrong place to add a dependency the
# app does not have.


# --- the log buffer's dropped records (§1) ----------------------------------


def _fill_buffer(count: int) -> None:
    logger = logging.getLogger("memorymap.test")
    for index in range(count):
        logger.info("record %d", index)


def test_nothing_is_reported_dropped_before_the_buffer_fills(client):
    logbuffer.clear()
    _fill_buffer(10)
    assert client.get("/logs/stats").json()["dropped"] == 0


def test_records_pushed_out_of_the_ring_are_counted(client):
    """A deque with a maxlen discards silently, so a busy hour and a quiet one
    look identical: the same 500 rows, and no way to tell whether the top row
    is the start of the story or the middle of it."""
    logbuffer.clear()
    _fill_buffer(logbuffer.MAX_RECORDS + 25)
    stats = client.get("/logs/stats").json()
    assert stats["dropped"] >= 25
    assert stats["held"] == logbuffer.MAX_RECORDS
    assert stats["capacity"] == logbuffer.MAX_RECORDS


def test_the_gap_says_how_far_back_the_log_still_reaches(client):
    logbuffer.clear()
    _fill_buffer(logbuffer.MAX_RECORDS + 5)
    assert client.get("/logs/stats").json()["dropped_since"]


def test_clearing_the_log_clears_the_gap_with_it(client):
    """Otherwise the viewer reports a hole in a log it just emptied itself."""
    logbuffer.clear()
    _fill_buffer(logbuffer.MAX_RECORDS + 5)
    client.delete("/logs")
    assert client.get("/logs/stats").json()["dropped"] == 0


def test_truncated_and_dropped_are_different_numbers(client):
    """One is gone for good; the other is one bigger `limit` away. Reporting
    them as the same thing sends a reader looking in the wrong place."""
    logbuffer.clear()
    _fill_buffer(50)
    stats = logbuffer.stats(limit=10)
    assert stats["dropped"] == 0
    assert stats["truncated"] >= 40


def test_the_records_endpoint_is_still_a_plain_list(client):
    """The stats live at their own path precisely so this shape never moved."""
    assert isinstance(client.get("/logs").json(), list)


# --- which engine answered (§13) --------------------------------------------


def test_an_answer_names_the_engine_and_what_it_meant():
    """DuckDuckGo and SearXNG have different privacy properties and the person
    chose one deliberately in Settings. Without this the choice is invisible at
    the only moment it applies."""
    searx = websearch.answered_by("searxng")
    ddg = websearch.answered_by("duckduckgo")
    assert "SearXNG" in searx["label"] and searx["detail"]
    assert "DuckDuckGo" in ddg["label"] and ddg["detail"]
    assert searx["detail"] != ddg["detail"]


def test_an_unknown_engine_is_described_rather_than_crashed_on():
    assert websearch.answered_by("something new")["label"] == "something new"
    assert websearch.answered_by("")["label"] == "unknown"


def test_the_search_route_reports_who_answered_even_with_no_results(ai_client, monkeypatch):
    """"Nothing found" and "nothing found *by DuckDuckGo*" are different facts,
    and only the second one can be acted on."""
    monkeypatch.setattr(websearch, "search_web", lambda *a, **k: [])
    deps.get_config().set_preference("web_search_enabled", True)
    body = ai_client.get("/websearch?q=anything").json()
    assert body["answered_by"]["label"]


def test_searxng_results_name_the_engines_that_actually_found_them():
    """SearXNG is a metasearch engine: "via SearXNG" says where the query was
    assembled, not who answered it."""
    row = {"url": "https://example.com", "title": "T", "engines": ["qwant", "mojeek"]}
    assert websearch._upstream_engines(row) == ["qwant", "mojeek"]


def test_a_single_engine_key_is_accepted_too():
    assert websearch._upstream_engines({"engine": "mojeek"}) == ["mojeek"]


def test_upstream_engine_names_are_cleaned_before_they_reach_the_page():
    """Third-party text on its way to the DOM."""
    row = {"engines": ["<script>alert(1)</script>", "qwant"]}
    names = websearch._upstream_engines(row)
    assert all("<" not in name and ">" not in name for name in names)


def test_a_flood_of_engine_names_cannot_push_the_result_off_the_row():
    row = {"engines": [f"engine{n}" for n in range(50)]}
    assert len(websearch._upstream_engines(row)) <= websearch.MAX_UPSTREAM_ENGINES


def test_a_missing_engines_key_is_not_an_error():
    """Presentational only — an upstream schema change must not break search."""
    assert websearch._upstream_engines({"url": "https://example.com"}) == []
    assert websearch._upstream_engines({"engines": "not a list"}) == []


# --- SearXNG as the recommended default (§13) -------------------------------


def test_the_default_still_falls_back_so_search_works_out_of_the_box():
    """The roadmap said "flip the default to SearXNG". Read literally that is
    the `searxng` mode — which exists precisely so it will NOT fall back, and
    would therefore make every search fail on a fresh notebook that has no
    SearXNG yet. `auto` already prefers SearXNG whenever it is running, which
    is the behaviour actually wanted; what was missing was saying so."""
    assert websearch.DEFAULT_PROVIDER == "auto"
    assert "recommended" in websearch.PROVIDERS["auto"]["label"].lower()
    assert "searxng" in websearch.PROVIDERS["auto"]["detail"].lower()


def test_searxng_only_still_refuses_to_fall_back():
    """The one person who most wants SearXNG is running it so their queries
    stay on their own network; a silent fallback would be the whole point
    lost."""
    assert "fails" in websearch.PROVIDERS["searxng"]["detail"]


def test_the_settings_copy_no_longer_calls_searxng_optional():
    from memorymap.api.app import FRONTEND_DIR

    html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
    block = html.split("Your SearXNG instance", 1)[1][:1600]
    assert "optional, self-hosted" not in block
    assert "recommended" in block.lower()


# --- the generated SearXNG settings (§13) -----------------------------------


def test_autocomplete_is_pinned_off(app_state):
    """The one thing in a search UI that leaks even when no search is run: a
    fragment of every query goes to a third-party suggestion endpoint as it is
    typed. SearXNG defaults it off; pinning it means a changed upstream default
    or a hand-edited file cannot turn it back on."""
    text = searxng_manager.ensure_settings(app_state.data_dir).read_text()
    search_block = text.split("\nsearch:", 1)[1].split("\noutgoing:", 1)[0]
    assert 'autocomplete: ""' in search_block


def test_result_images_are_proxied_rather_than_fetched_by_the_browser(app_state):
    """Without this, merely rendering a result page tells every pictured site
    that someone searched and got them back — before anything is clicked."""
    text = searxng_manager.ensure_settings(app_state.data_dir).read_text()
    server_block = text.split("\nserver:", 1)[1].split("\nsearch:", 1)[0]
    assert "image_proxy: true" in server_block


def test_the_generated_settings_still_have_every_section(app_state):
    """The failure mode this guards is specific: SearXNG reads this file before
    it writes a line of its own log, so a broken one presents as "started but
    never answered" with nothing to go on."""
    text = searxng_manager.ensure_settings(app_state.data_dir).read_text()
    for section in ("server:", "search:", "engines:", "plugins:", "outgoing:"):
        assert f"\n{section}" in text, f"{section} went missing from the template"
    # Tabs are the classic way to make a YAML file unparseable without it
    # looking wrong; YAML forbids them for indentation outright.
    code = [line for line in text.splitlines() if not line.strip().startswith("#")]
    assert not any("\t" in line for line in code)


def test_the_limiter_being_off_is_tied_to_the_loopback_bind(app_state):
    """It is only safe because nothing off this machine can reach the port.
    The comment is the link between the two decisions; if the bind is ever
    widened this is what should stop it being widened silently."""
    text = searxng_manager.ensure_settings(app_state.data_dir).read_text()
    assert "limiter: false" in text
    assert "loopback" in text.lower()


def test_the_docker_container_is_still_published_to_loopback_only():
    assert searxng_manager._publish_spec().startswith("127.0.0.1:")


# --- one worker only (§20) --------------------------------------------------


@pytest.fixture()
def _no_worker_flags(monkeypatch):
    monkeypatch.setattr("sys.argv", ["uvicorn"])
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)


def test_a_normal_start_is_not_refused(_no_worker_flags):
    deps.refuse_multiple_workers()  # must not raise


@pytest.mark.parametrize(
    "argv",
    [
        ["uvicorn", "--workers", "2"],
        ["uvicorn", "--workers=4"],
        ["uvicorn", "-w", "3"],
    ],
)
def test_more_than_one_worker_is_refused(argv, monkeypatch):
    """Every singleton silently becomes per-worker: the log console would show
    a fraction of what happened, unlocking would work only sometimes, and two
    workers would each think they own the SearXNG they started. None of that
    fails loudly, which is why it is refused rather than warned about."""
    monkeypatch.setattr("sys.argv", argv)
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    with pytest.raises(deps.MultipleWorkersError) as raised:
        deps.refuse_multiple_workers()
    assert "single-user" in str(raised.value)


def test_one_worker_asked_for_explicitly_is_fine(monkeypatch):
    monkeypatch.setattr("sys.argv", ["uvicorn", "--workers", "1"])
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    deps.refuse_multiple_workers()


def test_the_environment_variable_is_honoured_too(monkeypatch):
    """WEB_CONCURRENCY is what uvicorn and gunicorn both read, and it is how a
    platform turns workers up without touching the command line."""
    monkeypatch.setattr("sys.argv", ["uvicorn"])
    monkeypatch.setenv("WEB_CONCURRENCY", "8")
    with pytest.raises(deps.MultipleWorkersError):
        deps.refuse_multiple_workers()


def test_a_nonsense_worker_count_does_not_stop_the_app(monkeypatch):
    """Refusing to start is a big hammer; it should only fall on a value that
    actually says "more than one"."""
    monkeypatch.setattr("sys.argv", ["uvicorn", "--workers", "lots"])
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    deps.refuse_multiple_workers()


def test_the_check_actually_runs_when_the_app_is_built(app_state, monkeypatch):
    """The tests above call the check directly, which proves it works and not
    that anything calls it — removing the one line from create_app left every
    one of them green. This is the test that notices.

    It must also run BEFORE any singleton is built, since those are the things
    a second worker would duplicate.
    """
    from memorymap.api import app as app_module

    monkeypatch.setattr("sys.argv", ["uvicorn", "--workers", "2"])
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    with pytest.raises(deps.MultipleWorkersError):
        app_module.create_app()


# --- graph physics sliders (§8/§9) ------------------------------------------


def test_the_physics_sliders_are_disabled_under_tree_layouts():
    """Gravity and Spread scale the force simulation, and the tree layouts do
    not run one. Left enabled they are two controls that move, save, and change
    nothing — which reads as a broken app rather than a setting that does not
    apply here."""
    from memorymap.api.app import FRONTEND_DIR

    source = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    start = source.index("function setGraphPhysicsEnabled(")
    body = source[start : start + 1400]
    assert 'layoutKind === "force"' in body
    assert "disabled" in body
    # Called on arrival as well as on change, or a notebook left on Tree comes
    # back with two live-looking dead sliders.
    assert source.count("setGraphPhysicsEnabled(") >= 3
