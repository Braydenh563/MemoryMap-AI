"""The main-branch channel is a launcher setting; the packaged app reads it
as stable rather than as "no update checks".

`start.bat` and `start.sh` pull main on a source install when the channel
is main (tests/test_launcher_update_settings.py). A frozen build has no
source to pull, and used to answer every check with `channel_unavailable`,
so a packaged user who had switched the channel heard about no release at
all (the owner, 2026-09-14, with a screenshot of the switch on).
"""

import sys

from memorymap.api import routes_update
from memorymap.core import deps


def _config(monkeypatch, prefs):
    class Config:
        def get_preference(self, key, default=None):
            return prefs.get(key, default)

    monkeypatch.setattr(deps, "get_config", lambda: Config())


def test_a_source_install_on_main_is_told_the_check_is_the_launchers(monkeypatch):
    _config(monkeypatch, {"update_check_enabled": True, "update_channel": "main"})
    monkeypatch.setattr(sys, "frozen", False, raising=False)
    result = routes_update.check_for_update()
    #: The launcher's job, and it says so: this copy pulls main on every
    #: start, so telling it to switch back to Stable (the sentence written
    #: for the packaged app, which cannot pull anything) was backwards.
    assert result["checked"] is False and result["reason"] == "channel_source_main"


def test_the_packaged_app_on_main_checks_stable_releases(monkeypatch):
    _config(monkeypatch, {"update_check_enabled": True, "update_channel": "main"})
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    calls = []

    def fake_get(url, *args, **kwargs):
        calls.append(url)
        raise OSError("offline in the test")

    monkeypatch.setattr(routes_update.requests, "get", fake_get, raising=False)
    result = routes_update.check_for_update()
    assert result.get("reason") != "channel_unavailable"
    assert calls, "the packaged app did not go to the releases API at all"
