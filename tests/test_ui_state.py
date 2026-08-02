"""The interface's own settings survive a shell that loses localStorage (§35E).

Reported as two bugs — *"the theme resets to default on every start"* and
*"onboarding shows every time"* — and §35E guessed correctly that they were
one: both were stored in `localStorage` and nowhere else, and the desktop shell
does not reliably persist it. pywebview is a different browser with its own
profile, and if that profile is not stable across launches then everything kept
there is something the app forgets.

The fix is a mirror rather than a move. The browser still writes localStorage
first — it is synchronous, it works with the server unreachable, and it is what
every existing appearance read already goes through — and the server keeps a
copy that is seeded back when the local one is empty. These tests cover the
server half; the frontend half is `watchMirroredUiKeys` and
`seedUiStateFromServer` in app.js.
"""

from __future__ import annotations

import pytest


def test_ui_state_round_trips(client):
    state = {"theme": "dark", "palette": "ocean", "onboardingDone": "1"}
    client.put("/preferences", json={"ui_state": state})
    assert client.get("/preferences").json()["ui_state"] == state


def test_ui_state_starts_empty_rather_than_missing(client):
    """The frontend reads `prefsCache.ui_state` unconditionally. An absent key
    would be an exception on a brand-new notebook, which is the one install
    where nothing has ever been saved."""
    assert client.get("/preferences").json()["ui_state"] == {}


def test_updating_one_setting_replaces_the_whole_map(client):
    """The browser always sends every watched key it has, so the map is a
    snapshot rather than a patch — which is what makes *clearing* a setting
    (falling back to the system theme) survive a restart as well as setting
    one does."""
    client.put("/preferences", json={"ui_state": {"theme": "dark", "font": "serif"}})
    client.put("/preferences", json={"ui_state": {"font": "serif"}})
    assert client.get("/preferences").json()["ui_state"] == {"font": "serif"}


def test_ui_state_does_not_disturb_other_preferences(client):
    client.put("/preferences", json={"recycle_bin_days": 7})
    client.put("/preferences", json={"ui_state": {"theme": "dark"}})
    body = client.get("/preferences").json()
    assert body["recycle_bin_days"] == 7
    assert body["ui_state"] == {"theme": "dark"}


@pytest.mark.parametrize(
    "bad",
    [
        {f"key{n}": "x" for n in range(61)},        # too many keys
        {"theme": "x" * 401},                        # one value too long
        {"k" * 41: "dark"},                          # one key too long
    ],
)
def test_an_unbounded_ui_state_is_refused(client, bad):
    """A preferences file that can be grown without limit from the browser is
    a way to fill a disk. Nothing the interface stores here is ever large."""
    assert client.put("/preferences", json={"ui_state": bad}).status_code == 422


def test_the_frontend_watches_the_keys_it_promises_to(client):
    """The list is the contract: adding a key to MIRRORED_UI_KEYS is the whole
    of making a new setting persistent, and the reported two are the reason
    this exists."""
    import re
    from pathlib import Path

    source = (Path(__file__).resolve().parents[1] / "frontend" / "app.js").read_text(
        encoding="utf-8"
    )
    block = re.search(r"const MIRRORED_UI_KEYS = \[(.*?)\];", source, re.S)
    assert block, "MIRRORED_UI_KEYS not found in app.js"
    keys = set(re.findall(r'"([^"]+)"', block.group(1)))
    assert {"theme", "onboardingDone"} <= keys, (
        "the two settings this whole mechanism was reported for must be in the "
        "watched list"
    )
    # And the watch has to be installed before anything can write one.
    assert "watchMirroredUiKeys();" in source
    assert source.index("watchMirroredUiKeys();") < source.index(
        'switchTab(localStorage.getItem("activeTab")'
    ), "the watch must be installed before the tab restore writes activeTab"
