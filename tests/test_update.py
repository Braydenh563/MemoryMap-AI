"""Applying an update automatically — POST /update/apply.

Never touches a real GitHub release or spawns a real installer: every test
mocks `requests.get` and `subprocess.Popen`, and asserts on what the code
*tried* to do rather than any real network or process effect. The Win32
mechanics of a real install replacing a real running app are the one part
this suite cannot exercise — see routes_update.py's own module docstring.
"""

from __future__ import annotations

import time

import pytest

from memorymap.api import routes_update


@pytest.fixture(autouse=True)
def _clean_update_state():
    routes_update.reset_for_tests()
    yield
    routes_update.reset_for_tests()


class _FakeResponse:
    def __init__(self, json_body=None, status=200, content=b"", headers=None):
        self._json = json_body
        self.status_code = status
        self.headers = headers or {}
        self._content = content

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._json

    def iter_content(self, chunk_size=None):
        for i in range(0, len(self._content), chunk_size or len(self._content) or 1):
            yield self._content[i : i + (chunk_size or len(self._content))]


RELEASE_WITH_ASSET = {
    "tag_name": "v9.9.9",
    "assets": [
        {
            "name": "MemoryMap-AI-Setup-9.9.9.exe",
            "browser_download_url": "https://example.com/MemoryMap-AI-Setup-9.9.9.exe",
            "size": 12,
        }
    ],
}


def _wait_until_idle(timeout=5.0):
    deadline = time.time() + timeout
    while routes_update.current()["running"] and time.time() < deadline:
        time.sleep(0.02)
    assert not routes_update.current()["running"], "apply thread never finished"


# --- guards, none of which should ever touch the network -------------------


def test_apply_refuses_when_update_check_is_disabled(client):
    response = client.post("/update/apply")
    assert response.status_code == 403


def test_apply_refuses_when_auto_update_is_off(client, app_state, monkeypatch):
    """update_check_enabled alone is not enough — asked for directly, a
    separate switch for "turn auto update off entirely" that this endpoint
    has to respect even when checking is on and the build could otherwise
    apply one."""
    app_state.set_preference("update_check_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)
    response = client.post("/update/apply")
    assert response.status_code == 403
    assert "Update automatically" in response.json()["detail"]


def test_apply_refuses_off_a_source_or_non_windows_build(client, app_state):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    response = client.post("/update/apply")
    assert response.status_code == 409
    assert "packaged Windows" in response.json()["detail"]


def test_apply_refuses_a_second_attempt_while_one_is_running(client, app_state, monkeypatch):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _fake_get(url, **kwargs):
        if "releases/latest" in url:
            return _FakeResponse(RELEASE_WITH_ASSET)
        time.sleep(0.3)  # a window for the second request to arrive mid-download
        return _FakeResponse(content=b"x", headers={"Content-Length": "1"})

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: None)
    monkeypatch.setattr(routes_update.os, "_exit", lambda code: None)

    started = client.post("/update/apply")
    assert started.status_code == 200
    again = client.post("/update/apply")
    assert again.status_code == 409
    _wait_until_idle()


# --- offline / network-failure safety, asked for directly ------------------


def test_apply_fails_cleanly_when_offline_fetching_the_release(client, app_state, monkeypatch):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _offline(*a, **k):
        raise ConnectionError("no route to host")

    monkeypatch.setattr(routes_update.requests, "get", _offline)
    popen_calls = []
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: popen_calls.append(a))

    response = client.post("/update/apply")

    assert response.status_code == 502
    assert not popen_calls, "must never spawn the installer without a real asset URL"


def test_apply_fails_cleanly_when_the_download_drops_mid_stream(client, app_state, monkeypatch):
    """The release check succeeds, but the download itself fails partway —
    a truncated installer must never be handed to subprocess.Popen."""
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _fake_get(url, **kwargs):
        if "releases/latest" in url:
            return _FakeResponse(RELEASE_WITH_ASSET)
        raise ConnectionError("connection reset by peer")

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    popen_calls = []
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: popen_calls.append(a))

    response = client.post("/update/apply")
    assert response.status_code == 200
    _wait_until_idle()

    state = routes_update.current()
    assert state["outcome"] == "failed"
    assert state["error"]
    assert not popen_calls


def test_a_truncated_download_is_caught_even_without_a_network_exception(
    client, app_state, monkeypatch, tmp_path
):
    """The connection can drop without raising — iter_content just yields
    less than Content-Length promised. That has to be caught too, not only
    an outright exception."""
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _fake_get(url, **kwargs):
        if "releases/latest" in url:
            return _FakeResponse(RELEASE_WITH_ASSET)
        return _FakeResponse(content=b"only 5", headers={"Content-Length": "999"})

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    popen_calls = []
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: popen_calls.append(a))
    monkeypatch.setattr(routes_update.tempfile, "mkdtemp", lambda prefix="": str(tmp_path))

    client.post("/update/apply")
    _wait_until_idle()

    assert routes_update.current()["outcome"] == "failed"
    assert "incomplete" in routes_update.current()["error"].lower()
    assert not popen_calls


# --- the successful path ----------------------------------------------------


def test_a_successful_apply_downloads_then_launches_the_official_installer_only(
    client, app_state, monkeypatch, tmp_path
):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _fake_get(url, **kwargs):
        if "releases/latest" in url:
            return _FakeResponse(RELEASE_WITH_ASSET)
        return _FakeResponse(content=b"MZ-fake-installer-bytes", headers={"Content-Length": "23"})

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    popen_calls = []
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: popen_calls.append(a))
    monkeypatch.setattr(routes_update.tempfile, "mkdtemp", lambda prefix="": str(tmp_path))
    # The exit-once-launched watcher calling os._exit(0) would kill the test
    # process — not what "launched" should do here.
    monkeypatch.setattr(routes_update.os, "_exit", lambda code: None)

    response = client.post("/update/apply")
    assert response.status_code == 200
    _wait_until_idle()

    state = routes_update.current()
    assert state["outcome"] == "launched"
    assert len(popen_calls) == 1
    command = popen_calls[0][0]
    # Never anything but the asset this release actually named — no path or
    # URL a request body could have influenced reaches subprocess.Popen.
    assert command[0].endswith("MemoryMap-AI-Setup-9.9.9.exe")
    assert "/VERYSILENT" in command
    assert "/NORESTART" in command
    downloaded = tmp_path / "MemoryMap-AI-Setup-9.9.9.exe"
    assert downloaded.read_bytes() == b"MZ-fake-installer-bytes"


def test_no_matching_windows_asset_is_a_clean_failure_not_a_crash(client, app_state, monkeypatch):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)
    monkeypatch.setattr(
        routes_update.requests,
        "get",
        lambda *a, **k: _FakeResponse({"tag_name": "v9.9.9", "assets": []}),
    )

    response = client.post("/update/apply")

    assert response.status_code == 502


def test_apply_status_reports_idle_before_anything_runs(client):
    response = client.get("/update/apply/status")
    assert response.status_code == 200
    assert response.json() == {
        "running": False,
        "step": "",
        "error": "",
        "done_bytes": 0,
        "total_bytes": 0,
        "outcome": "",
    }


# --- POST /update/apply?tag=... — picking a specific release ---------------


def test_apply_with_a_specific_tag_hits_the_tagged_release_not_latest(
    client, app_state, monkeypatch, tmp_path
):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    requested_urls = []

    def _fake_get(url, **kwargs):
        requested_urls.append(url)
        if "releases/tags/v8.8.8" in url:
            release = dict(RELEASE_WITH_ASSET)
            release["tag_name"] = "v8.8.8"
            release["assets"] = [
                {
                    "name": "MemoryMap-AI-Setup-8.8.8.exe",
                    "browser_download_url": "https://example.com/MemoryMap-AI-Setup-8.8.8.exe",
                    "size": 12,
                }
            ]
            return _FakeResponse(release)
        return _FakeResponse(content=b"old-installer", headers={"Content-Length": "13"})

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: None)
    monkeypatch.setattr(routes_update.tempfile, "mkdtemp", lambda prefix="": str(tmp_path))
    monkeypatch.setattr(routes_update.os, "_exit", lambda code: None)

    response = client.post("/update/apply", params={"tag": "v8.8.8"})
    assert response.status_code == 200
    _wait_until_idle()

    assert any("releases/tags/v8.8.8" in u for u in requested_urls)
    assert not any("releases/latest" in u for u in requested_urls)
    assert routes_update.current()["outcome"] == "launched"


# --- GET /update/check — moved from app.py, now channel-aware --------------


def test_check_reports_disabled_when_the_preference_is_off(client):
    response = client.get("/update/check")
    assert response.status_code == 200
    assert response.json() == {"checked": False, "reason": "disabled"}


def test_check_honestly_refuses_to_fabricate_main_channel_updates(client, app_state):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "main")
    response = client.get("/update/check")
    assert response.status_code == 200
    body = response.json()
    assert body["checked"] is False
    assert body["reason"] == "channel_unavailable"


def test_check_reports_unreachable_when_offline(client, app_state, monkeypatch):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "stable")

    def _offline(*a, **k):
        raise ConnectionError("no route to host")

    monkeypatch.setattr(routes_update.requests, "get", _offline)
    response = client.get("/update/check")
    assert response.status_code == 200
    assert response.json() == {"checked": False, "reason": "unreachable"}


def test_check_finds_an_update_and_reports_the_windows_asset(client, app_state, monkeypatch):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "stable")
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)
    monkeypatch.setattr(routes_update.requests, "get", lambda *a, **k: _FakeResponse(RELEASE_WITH_ASSET))

    response = client.get("/update/check")
    assert response.status_code == 200
    body = response.json()
    assert body["checked"] is True
    assert body["update_available"] is True
    assert body["can_auto_apply"] is True
    assert body["asset"]["name"] == "MemoryMap-AI-Setup-9.9.9.exe"


def test_check_never_offers_auto_apply_off_a_source_build(client, app_state, monkeypatch):
    """Same release data, but not a frozen Windows build — can_auto_apply
    must be False and asset must be None, never a half-offer."""
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "stable")
    monkeypatch.setattr(routes_update.requests, "get", lambda *a, **k: _FakeResponse(RELEASE_WITH_ASSET))

    response = client.get("/update/check")
    body = response.json()
    assert body["update_available"] is True
    assert body["can_auto_apply"] is False
    assert body["asset"] is None


# --- GET /update/releases — the version picker ------------------------------


def test_releases_unavailable_when_check_is_disabled(client):
    response = client.get("/update/releases")
    assert response.status_code == 200
    assert response.json() == {"available": False, "reason": "disabled", "releases": []}


def test_releases_unavailable_on_the_main_channel(client, app_state):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "main")
    response = client.get("/update/releases")
    body = response.json()
    assert body["available"] is False
    assert body["reason"] == "channel_unavailable"


def test_releases_unavailable_off_a_source_build_on_the_stable_channel(client, app_state):
    """A source checkout defaults to the main channel (see
    ConfigManager._load_preferences), so this simulates someone who
    switched it back to stable by hand while still on a source build —
    the frozen-Windows check has to be the one that refuses it then."""
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "stable")
    response = client.get("/update/releases")
    body = response.json()
    assert body["available"] is False
    assert body["reason"] == "not_supported"


def test_releases_unavailable_off_a_source_build_by_default(client, app_state):
    """A source checkout with no explicit channel choice defaults to
    "main" (it already auto-updates for real via start.sh/start.bat's own
    `git pull`), so /update/releases reports channel_unavailable, not
    not_supported — the honest reason, not a coincidentally-similar one."""
    app_state.set_preference("update_check_enabled", True)
    response = client.get("/update/releases")
    body = response.json()
    assert body["available"] is False
    assert body["reason"] == "channel_unavailable"


def test_releases_lists_installable_versions_and_skips_source_only_tags(
    client, app_state, monkeypatch
):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "stable")
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)
    releases = [
        RELEASE_WITH_ASSET,
        {"tag_name": "v9.9.8", "name": "v9.9.8", "assets": [], "published_at": "2026-01-01"},
    ]
    monkeypatch.setattr(routes_update.requests, "get", lambda *a, **k: _FakeResponse(releases))

    response = client.get("/update/releases")
    body = response.json()
    assert body["available"] is True
    assert len(body["releases"]) == 1
    assert body["releases"][0]["tag"] == "v9.9.9"


# --- GET /update/source-status — start.sh/start.bat's own git-pull update --


def test_source_status_reports_nothing_when_no_update_happened(client):
    response = client.get("/update/source-status")
    assert response.status_code == 200
    assert response.json() == {"just_updated": False, "from": "", "to": ""}


def test_source_status_reports_a_real_version_change_once_then_goes_quiet(client, monkeypatch):
    monkeypatch.setenv("MM_UPDATED_FROM", "0.1.2")
    monkeypatch.setenv("MM_UPDATED_TO", "0.1.3")

    first = client.get("/update/source-status")
    assert first.json() == {"just_updated": True, "from": "0.1.2", "to": "0.1.3"}

    second = client.get("/update/source-status")
    assert second.json() == {"just_updated": False, "from": "", "to": ""}


def test_source_status_strips_quotes_left_by_start_bats_own_parsing(client, monkeypatch):
    """start.bat's :read_version leaves the surrounding quotes on rather
    than fight cmd.exe's quoting rules — see start.bat and this module's
    own comment. The Python side has to strip them."""
    monkeypatch.setenv("MM_UPDATED_FROM", '"0.1.2"')
    monkeypatch.setenv("MM_UPDATED_TO", '"0.1.3"')

    response = client.get("/update/source-status")
    assert response.json() == {"just_updated": True, "from": "0.1.2", "to": "0.1.3"}


def test_source_status_ignores_an_unchanged_version(client, monkeypatch):
    """`git pull` ran (env vars are set) but landed on the same version —
    not a real update, must not pop the dialog."""
    monkeypatch.setenv("MM_UPDATED_FROM", "0.1.3")
    monkeypatch.setenv("MM_UPDATED_TO", "0.1.3")

    response = client.get("/update/source-status")
    assert response.json() == {"just_updated": False, "from": "", "to": ""}


# --- blocked download vs. blocked installer execution -----------------------


def test_a_download_blocked_by_a_firewall_gets_a_download_specific_message(
    client, app_state, monkeypatch
):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _fake_get(url, **kwargs):
        if "releases/latest" in url:
            return _FakeResponse(RELEASE_WITH_ASSET)
        raise ConnectionError("connection reset by peer")

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    popen_calls = []
    monkeypatch.setattr(routes_update.subprocess, "Popen", lambda *a, **k: popen_calls.append(a))

    client.post("/update/apply")
    _wait_until_idle()

    state = routes_update.current()
    assert state["outcome"] == "failed"
    assert "firewall" in state["step"].lower() or "download" in state["step"].lower()
    assert not popen_calls


def test_an_installer_blocked_by_antivirus_gets_an_execution_specific_message(
    client, app_state, monkeypatch, tmp_path
):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("auto_update_enabled", True)
    monkeypatch.setattr(routes_update.sys, "platform", "win32")
    monkeypatch.setattr(routes_update.sys, "frozen", True, raising=False)

    def _fake_get(url, **kwargs):
        if "releases/latest" in url:
            return _FakeResponse(RELEASE_WITH_ASSET)
        return _FakeResponse(content=b"MZ-fake-installer", headers={"Content-Length": "17"})

    def _blocked_popen(*a, **k):
        raise PermissionError("[WinError 5] Access is denied")

    monkeypatch.setattr(routes_update.requests, "get", _fake_get)
    monkeypatch.setattr(routes_update.subprocess, "Popen", _blocked_popen)
    monkeypatch.setattr(routes_update.tempfile, "mkdtemp", lambda prefix="": str(tmp_path))

    client.post("/update/apply")
    _wait_until_idle()

    state = routes_update.current()
    assert state["outcome"] == "failed"
    assert "antivirus" in state["step"].lower() or "smartscreen" in state["step"].lower()
