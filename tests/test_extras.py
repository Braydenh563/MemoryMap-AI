"""Installing optional dependencies from Settings.

The security property is the whole design and is what these mostly test: the
request names an *entry in an allowlist*, never a package. `pip install
<whatever the body said>` is arbitrary code execution by design, and no amount
of validating the string afterwards makes it safe.
"""

from __future__ import annotations

import pytest

from memorymap.api import routes_tasks
from memorymap.core import extras


@pytest.fixture(autouse=True)
def _clean_extras():
    """Process-global, like the job registry. Without this one test's install
    state leaks into the next test's assertions."""
    extras.reset_for_tests()
    yield
    extras.reset_for_tests()


def test_the_catalogue_says_what_each_extra_buys(client):
    body = client.get("/extras").json()
    ids = {e["id"] for e in body["extras"]}
    assert {"voice", "desktop", "semantic"} <= ids
    for extra in body["extras"]:
        assert extra["enables"], f"{extra['id']} does not say what it turns on"
        assert extra["size"], f"{extra['id']} does not say how big it is"


def test_an_unknown_extra_is_refused_rather_than_installed(client):
    """The id comes from a URL. An unknown one is a thing to report."""
    body = client.post("/extras/not-a-real-extra/install").json()
    assert body["started"] is False
    assert not extras.current().running


def test_a_package_name_in_the_url_is_not_a_package_name(client):
    """The path selects an allowlist entry; it is never handed to pip. If this
    ever regresses, the failure mode is remote code execution, so it is
    asserted directly rather than left to the shape of the code."""
    for hostile in ["requests", "evil-package", "requests;rm -rf /", "../voice"]:
        response = client.post(f"/extras/{hostile}/install")
        # Either the route refuses it or there is no such route. Both are
        # "nothing was installed", which is the property under test — asserting
        # on the status code alone would make this pass for the wrong reason.
        if response.status_code == 200:
            assert response.json()["started"] is False, hostile
        assert not extras.current().running, hostile


def test_installed_extras_are_detected_by_import_not_by_pip(client):
    """What matters is whether *this* interpreter can use it — a different
    question from whether pip put it somewhere. `fastapi` is certainly
    importable here, so it stands in for an installed extra."""
    fake = extras.Extra(
        id="x",
        label="X",
        enables="e",
        packages=("fastapi",),
        module="fastapi",
        size="0",
    )
    missing = extras.Extra(
        id="y",
        label="Y",
        enables="e",
        packages=("nope",),
        module="a_module_that_is_not_installed_anywhere",
        size="0",
    )
    assert extras.is_installed(fake) is True
    assert extras.is_installed(missing) is False


def test_an_already_installed_extra_is_not_reinstalled(client, monkeypatch):
    monkeypatch.setattr(extras, "is_installed", lambda extra: True)
    started, message = extras.start("voice")
    assert started is False
    assert "already installed" in message


def test_only_one_install_runs_at_a_time(client, monkeypatch):
    """Two pips against one environment is a way to corrupt it."""
    monkeypatch.setattr(extras, "is_installed", lambda extra: False)
    monkeypatch.setattr(extras.threading, "Thread", _NoThread)
    assert extras.start("voice")[0] is True
    started, message = extras.start("desktop")
    assert started is False
    assert "already running" in message


def test_a_running_install_appears_in_background_tasks(client, monkeypatch):
    """Asked for directly. It rides `/tasks` like every other background job,
    which is what puts it in the status bar and the Tasks panel without either
    of them learning anything new."""
    monkeypatch.setattr(extras, "is_installed", lambda extra: False)
    monkeypatch.setattr(extras.threading, "Thread", _NoThread)
    extras.start("voice")

    tasks = routes_tasks.collect()
    mine = [t for t in tasks if t["kind"] == "extra"]
    assert mine, [t["kind"] for t in tasks]
    assert "faster-whisper" in mine[0]["label"] or "Voice" in mine[0]["label"]
    # pip reports no fraction worth believing, and a bar that guesses is worse
    # than one that admits it cannot say.
    assert mine[0]["progress"] is None


class _NoThread:
    """Starts nothing. These tests are about the bookkeeping around pip, and
    actually running pip in a test suite would download the internet."""

    def __init__(self, *args, **kwargs):
        pass

    def start(self):
        pass


def test_reinstall_is_allowed_where_install_is_not(client, monkeypatch):
    """The escape hatch for the state detection cannot see: `find_spec` answers
    "is it there", not "is it sound". A wheel built for the wrong platform
    imports and does not work — the Windows torch DLL in the README is exactly
    this — and without a reinstall the app's answer would be "already
    installed" forever."""
    monkeypatch.setattr(extras, "is_installed", lambda extra: True)
    monkeypatch.setattr(extras.threading, "Thread", _NoThread)

    assert extras.start("voice")[0] is False
    extras.reset_for_tests()
    started, message = extras.start("voice", reinstall=True)
    assert started is True
    assert "Reinstalling" in message


def test_a_reinstall_does_not_trust_the_cache(client, monkeypatch):
    """`--upgrade` would see the version it already has and do nothing, which
    is the one outcome that helps nobody; a cached wheel that is itself corrupt
    would be reinstalled faithfully."""
    seen = {}

    class _Capture:
        def __init__(self, command, **kwargs):
            seen["command"] = command
            self.stdout = []

        def wait(self):
            return 0

    monkeypatch.setattr(extras.subprocess, "Popen", _Capture)
    extras._run_install(extras.EXTRAS_BY_ID["voice"], reinstall=True)
    assert "--force-reinstall" in seen["command"]
    assert "--no-cache-dir" in seen["command"]
    assert "faster-whisper" in seen["command"]
