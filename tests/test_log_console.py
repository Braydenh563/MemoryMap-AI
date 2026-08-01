"""The live log console and the support bundle (§1).

Asked for directly: the Logs screen should read "like the terminal running in
the background, with key errors flagged", not a list you refresh by hand.

The stream's contract is the interesting part here — a log console that
silently skips records, or replays them, is worse than one you refresh
yourself, because you would not know to distrust it.
"""

from __future__ import annotations

import io
import json
import logging
import zipfile

import pytest

from memorymap.api import routes_settings
from memorymap.core import deps, logbuffer


@pytest.fixture(autouse=True)
def _empty_buffer():
    # install() is what attaches the handler, and it normally runs from
    # create_app(). The buffer tests below have no app, so without this they
    # would assert against a buffer nothing ever writes to — and pass for the
    # wrong reason the moment an assertion was weakened.
    logbuffer.install()
    logbuffer.clear()
    yield
    logbuffer.clear()


def _log(count: int, level: int = logging.INFO, name: str = "memorymap.test") -> None:
    logger = logging.getLogger(name)
    for index in range(count):
        logger.log(level, "record %d", index)


# --- sequence numbers, which the stream is built on -------------------------


def test_every_record_gets_an_increasing_id():
    _log(3)
    seqs = [record["seq"] for record in logbuffer.recent()]
    assert seqs == sorted(seqs)
    assert len(set(seqs)) == len(seqs)


def test_ids_are_not_reused_after_the_ring_wraps():
    """Position in the deque cannot do this job — the deque shifts every time
    it is full, so "the 400th record" means something different one message
    later. A reader resuming at 8,317 has to get exactly what follows it."""
    _log(logbuffer.MAX_RECORDS + 20)
    seqs = [record["seq"] for record in logbuffer.recent(logbuffer.MAX_RECORDS)]
    assert seqs == sorted(seqs)
    assert len(set(seqs)) == len(seqs)
    assert min(seqs) > 1, "the earliest ids should have been pushed out"


def test_since_returns_only_what_the_reader_has_not_seen():
    _log(3)
    cursor = logbuffer.latest_seq()
    _log(2)
    fresh = logbuffer.since(cursor)
    assert len(fresh) == 2
    assert all(record["seq"] > cursor for record in fresh)


def test_since_zero_is_everything_held():
    _log(4)
    assert len(logbuffer.since(0)) == 4


def test_a_reader_further_ahead_than_the_log_gets_nothing_rather_than_everything():
    """Guards the inverted-comparison bug, where a stale cursor would replay
    the whole buffer on every poll."""
    _log(3)
    assert logbuffer.since(logbuffer.latest_seq()) == []
    assert logbuffer.since(10**9) == []


def test_latest_seq_is_zero_on_an_empty_log():
    assert logbuffer.latest_seq() == 0


def test_clearing_does_not_restart_the_numbering():
    """Restarting at 1 would break every stream already open: a reader holding
    "I have seen up to 400" would treat the next 400 records as older than
    what it had and show none of them — a console that goes silent the moment
    you press Clear."""
    _log(5)
    before = logbuffer.latest_seq()
    logbuffer.clear()
    _log(1)
    assert logbuffer.latest_seq() > before


# --- the stream endpoint ----------------------------------------------------


@pytest.fixture()
def _brief_stream(monkeypatch):
    """Make the stream hand back on its first pass.

    TestClient reads a response to completion, so an open-ended generator
    would hang the suite rather than fail it. Zeroing the lifetime exercises
    the real code path — including the handover the client relies on — and
    lets the response finish. The live behaviour that this cannot show was
    driven in a browser instead.
    """
    monkeypatch.setattr(routes_settings, "LOG_STREAM_SECONDS", 0)


def _stream_events(client, url: str = "/logs/stream?after=999999999") -> list[dict]:
    response = client.get(url)
    assert response.status_code == 200, response.text
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def test_the_stream_is_ndjson_not_server_sent_events(client, _brief_stream):
    """EventSource cannot set request headers and this app authenticates with
    X-Auth-Token, so an EventSource here would simply 401. The usual fix is to
    put the token in the query string — which on the endpoint that serves the
    log would write the token into the records it protects."""
    response = client.get("/logs/stream?after=999999999")
    assert response.status_code == 200
    assert "ndjson" in response.headers["content-type"]


def test_the_stream_opens_immediately_rather_than_waiting_for_a_record(
    client, _brief_stream
):
    """A stream that says nothing until something is logged is
    indistinguishable from one that failed to connect."""
    events = _stream_events(client)
    assert events[0]["type"] == "open"
    assert "cursor" in events[0] and "latest" in events[0]


def test_the_stream_hands_back_instead_of_dying_quietly(client, _brief_stream):
    """The client reconnects from its cursor, so the handover costs no
    records — but only if it is told the connection ended on purpose."""
    events = _stream_events(client)
    assert events[-1]["type"] == "reconnect"
    assert "cursor" in events[-1]


def test_the_stream_carries_records_the_reader_has_not_seen(client, _brief_stream):
    _log(3)
    events = _stream_events(client, "/logs/stream?after=0")
    records = [event["record"] for event in events if event["type"] == "record"]
    assert len(records) >= 3
    assert [r["seq"] for r in records] == sorted(r["seq"] for r in records)


def test_the_stream_skips_what_the_reader_already_has(client, _brief_stream):
    _log(3)
    cursor = logbuffer.latest_seq()
    _log(2)
    events = _stream_events(client, f"/logs/stream?after={cursor}")
    records = [event["record"] for event in events if event["type"] == "record"]
    assert all(record["seq"] > cursor for record in records)


def test_the_stream_tells_a_proxy_not_to_buffer_it(client, _brief_stream):
    """A stream whose whole value is arriving promptly, sat in nginx's buffer,
    is just a slower version of the list this replaces."""
    response = client.get("/logs/stream?after=999999999")
    assert response.headers["x-accel-buffering"] == "no"
    assert response.headers["cache-control"] == "no-cache"


def test_the_stream_is_behind_the_unlock_gate(client):
    """It carries every message the app has logged."""
    client.post("/auth/setup", json={"password": "a password"})
    from memorymap.api import routes_auth

    routes_auth._active_tokens.clear()
    # 401s before any streaming begins, so this needs no shortened lifetime.
    assert client.get("/logs/stream").status_code == 401


def test_the_stream_hands_back_rather_than_living_forever():
    """A connection held open for a tab left open all week is a resource
    nothing ever reclaims; the client reconnects with its cursor, so the
    handover costs no records."""
    assert routes_settings.LOG_STREAM_SECONDS <= 30 * 60
    assert routes_settings.LOG_STREAM_HEARTBEAT < routes_settings.LOG_STREAM_SECONDS


# --- the support bundle -----------------------------------------------------


def _bundle(client) -> zipfile.ZipFile:
    response = client.get("/support-bundle")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    return zipfile.ZipFile(io.BytesIO(response.content))


def test_the_bundle_contains_what_a_bug_report_needs(client):
    names = _bundle(client).namelist()
    for member in ("README.txt", "logs.json", "preferences.json", "status.json"):
        assert member in names


def test_the_bundle_explains_itself(client):
    """It is a file the user is being asked to send to a stranger, so it says
    what is in it, what is not, and that nothing was transmitted."""
    readme = _bundle(client).read("README.txt").decode()
    assert "Nothing was sent anywhere" in readme
    assert "No note, document, chat or reminder content" in readme


def test_free_text_settings_are_described_rather_than_disclosed(client):
    """An allowlist, not a denylist. A denylist has to predict every sensitive
    key anyone will ever add; this only has to name the ones that help."""
    config = deps.get_config()
    secret = "MY-PRIVATE-NICKNAME"
    config.set_preference("display_name", secret)
    config.set_preference("user_profile", f"I work at {secret}")
    config.set_preference("personas", [{"name": "p", "prompt": secret}])

    response = client.get("/support-bundle")
    assert secret.encode() not in response.content, "the secret reached the bundle"

    prefs = json.loads(zipfile.ZipFile(io.BytesIO(response.content)).read("preferences.json"))
    assert "display_name" not in prefs["included"]
    # Still useful: you can tell a setting is populated without seeing it.
    assert "chars" in prefs["withheld"]["display_name"]


def test_diagnostic_settings_are_included_verbatim(client):
    """Withholding everything would make the bundle useless — the point is to
    diagnose a bug, and these are the settings that cause them."""
    deps.get_config().set_preference("search_provider", "duckduckgo")
    prefs = json.loads(_bundle(client).read("preferences.json"))
    assert prefs["included"]["search_provider"] == "duckduckgo"


def test_the_bundle_carries_counts_but_never_content(client):
    client.post("/entries", json={"content": "a very private thought indeed"})
    response = client.get("/support-bundle")
    assert b"a very private thought indeed" not in response.content
    counts = json.loads(zipfile.ZipFile(io.BytesIO(response.content)).read("counts.json"))
    assert counts["entries"] == 1


def test_the_bundle_still_builds_when_a_probe_fails(client, monkeypatch):
    """The moment this is most needed is when something is already broken, so
    one failing probe must not take the whole file with it."""
    monkeypatch.setattr(
        routes_settings, "_models_status_snapshot", lambda: 1 / 0
    )
    status = json.loads(_bundle(client).read("status.json"))
    assert "error" in status["models"]
    assert status["app_version"]


def test_the_bundle_is_behind_the_unlock_gate(client):
    client.post("/auth/setup", json={"password": "a password"})
    from memorymap.api import routes_auth

    routes_auth._active_tokens.clear()
    assert client.get("/support-bundle").status_code == 401


def test_building_a_bundle_is_recorded_in_the_activity_log(client):
    """It collects settings and logs; that is worth a line in the audit trail
    even though it never leaves the machine."""
    client.get("/support-bundle")
    actions = [row["action"] for row in client.get("/audit?limit=20").json()]
    assert "exported" in actions


# --- the console's own rules, asserted against the frontend -----------------


def test_the_console_does_not_authenticate_through_the_query_string():
    """The reason NDJSON was chosen over EventSource. Putting the token in the
    URL would write it into the very log being streamed."""
    from memorymap.api.app import FRONTEND_DIR

    source = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    start = source.index("async function startLogStream(")
    body = source[start : start + 1200]
    assert "X-Auth-Token" in body
    assert "token=" not in body


def test_leaving_the_screen_closes_the_stream():
    """A stream held open by a tab nobody is looking at is invisible until it
    is a hundred of them."""
    from memorymap.api.app import FRONTEND_DIR

    source = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    assert 'if (name !== "logs") closeLogs();' in source


def test_the_live_pill_is_not_left_claiming_to_be_live():
    """A deliberate abort returns early from the stream's own exit path, so the
    pill would still read "live" with nothing behind it. Found in a browser,
    not by a test — this is the test that would notice it coming back."""
    from memorymap.api.app import FRONTEND_DIR

    source = (FRONTEND_DIR / "app.js").read_text(encoding="utf-8")
    start = source.index("function closeLogs() {")
    body = source[start : start + 500]
    assert "setLogLive" in body
