"""An opt-in beta channel (OPEN ledger 302).

`update_beta` off (the default) asks GitHub for `releases/latest`, which never
holds a pre-release. On, the check reads the recent list and takes the highest
version, pre-releases included, so a person can try a finished candidate before
it is final. Never touches the network: `requests.get` is mocked.
"""

from __future__ import annotations

import pytest

from tessellate import __version__
from tessellate.api import routes_update


@pytest.fixture(autouse=True)
def _clean():
    routes_update.reset_for_tests()
    yield
    routes_update.reset_for_tests()


class _Reply:
    status_code = 200

    def __init__(self, body):
        self._body = body

    def raise_for_status(self):
        pass

    def json(self):
        return self._body


def test_a_final_release_outranks_its_own_pre_releases():
    key = routes_update._release_key
    assert key("0.5.0") > key("0.5.0-rc.1") > key("0.5.0-beta.2") > key("0.5.0-beta.1") > key("0.5.0-alpha")
    assert key("0.5.1-beta.1") > key("0.5.0")
    assert key("v0.10.0") > key("0.9.9")
    assert key("0.5.0-beta.10") > key("0.5.0-beta.9")


def _ask(client, app_state, monkeypatch, beta, listing, latest=None):
    app_state.set_preference("update_check_enabled", True)
    app_state.set_preference("update_channel", "stable")
    app_state.set_preference("update_beta", beta)
    asked = []

    def fake_get(url, **kwargs):
        asked.append(url)
        return _Reply(listing if url.endswith("/releases") else latest)

    monkeypatch.setattr(routes_update.requests, "get", fake_get)
    return client.get("/update/check").json(), asked


def _tag(tag, **extra):
    return {"tag_name": tag, "assets": [], **extra}


def test_off_by_default_and_never_offered_a_pre_release(client, app_state, monkeypatch):
    assert app_state.get_preference("update_beta", False) is False
    body, asked = _ask(client, app_state, monkeypatch, False, [], latest=_tag("v99.0.0"))
    assert asked[0].endswith("/releases/latest")
    assert body["update_available"] is True and body["prerelease"] is False


def test_on_takes_the_highest_version_including_pre_releases(client, app_state, monkeypatch):
    listing = [
        _tag("v98.0.0-beta.1", prerelease=True),
        _tag("v97.0.0"),
        _tag("v99.0.0-beta.1", prerelease=True, draft=True),
    ]
    body, asked = _ask(client, app_state, monkeypatch, True, listing)
    assert asked[0].endswith("/releases")
    assert body["latest"] == "98.0.0-beta.1"  # the draft is skipped
    assert body["update_available"] is True and body["prerelease"] is True


def test_a_beta_older_than_the_running_version_is_not_an_update(client, app_state, monkeypatch):
    listing = [_tag(f"v{__version__}-beta.3", prerelease=True), _tag(f"v{__version__}")]
    body, _ = _ask(client, app_state, monkeypatch, True, listing)
    assert body["latest"] == __version__
    assert body["update_available"] is False


def test_an_empty_list_says_there_is_no_release(client, app_state, monkeypatch):
    body, _ = _ask(client, app_state, monkeypatch, True, [])
    assert body["reason"] == "no_releases"


def test_the_preference_round_trips_and_has_a_row(client):
    assert client.get("/preferences").json()["update_beta"] is False
    client.put("/preferences", json={"update_beta": True})
    assert client.get("/preferences").json()["update_beta"] is True


def test_settings_has_the_switch_wired():
    from pathlib import Path

    root = Path(__file__).resolve().parents[1] / "frontend"
    assert 'id="pref-update-beta"' in (root / "index.html").read_text(encoding="utf-8")
    rows = (root / "js" / "settings-rows.js").read_text(encoding="utf-8")
    assert '{ key: "update_beta", id: "pref-update-beta" }' in rows
