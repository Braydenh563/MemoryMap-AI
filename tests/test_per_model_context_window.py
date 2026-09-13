"""The context window a user sets by hand, for one model.

Asked for directly (INBOX 77): "the window itself should be manageable by the
user and auto when set ... a `num_ctx` preference per model in Settings >
Models with Auto (the model file's value) or a number, sent on every request;
the badge shows 'used / window'". The badge shipped first; these are the
window's own rules.

Three of them are worth a test each because each is a decision that could
reasonably have gone the other way, and a later reader changing one back would
otherwise find nothing to stop them:

- a hand-set window replaces what the model file declares, rather than losing
  to it;
- it also beats `max_requested_context`, the machine-wide ceiling, because that
  ceiling exists to stop the app *guessing* its way to a window a laptop cannot
  fill, and a number typed into a box for one named model is not a guess;
- anything that is not a positive number means auto, which is how the box is
  cleared, and must never leave a model running at 0 or at a typo.
"""

from __future__ import annotations

import pytest

from memorymap.ai.openai_client import OpenAICompatClient


class _Prefs:
    """Just enough of `deps.get_config()` for `preferred_context` to read."""

    def __init__(self, windows):
        self._windows = windows

    def get_preference(self, key, default=None):
        if key == "model_context_windows":
            return self._windows
        return default


@pytest.fixture
def client(monkeypatch):
    import memorymap.core.deps as deps

    c = OpenAICompatClient(base_url="http://localhost:1234/v1")
    c._catalog = []
    c._props = {}

    def use(windows):
        monkeypatch.setattr(deps, "get_config", lambda: _Prefs(windows))
        return c

    return use


def test_a_hand_set_window_is_what_the_model_runs_at(client):
    c = client({"qwen3": 16384})
    assert c.preferred_context("qwen3") == 16384
    assert c.usable_context("qwen3") == 16384


def test_a_hand_set_window_beats_the_machine_wide_ceiling(client):
    """The ceiling stops the app guessing big; it does not overrule a person
    who typed a number for one model. Clamping here would make the setting look
    broken in the one case anybody would use it for."""
    c = client({"big-model": 65536})
    assert c.MAX_REQUESTED_CONTEXT < 65536
    assert c.usable_context("big-model") == 65536


def test_a_model_with_no_entry_is_still_on_auto(client):
    c = client({"qwen3": 16384})
    assert c.preferred_context("other-model") is None
    assert c.usable_context("other-model") == c.DEFAULT_CONTEXT_TOKENS


@pytest.mark.parametrize("stored", [None, "", "auto", 0, -1, "sixteen thousand"])
def test_everything_that_is_not_a_positive_number_means_auto(client, stored):
    """An unknown model on a silent server, so "auto" has exactly one possible
    answer. A named model like qwen3 would resolve through the known-windows
    table instead, which is auto working correctly and would prove nothing
    about this entry being ignored."""
    c = client({"mystery-model": stored})
    assert c.preferred_context("mystery-model") is None
    assert c.usable_context("mystery-model") == c.DEFAULT_CONTEXT_TOKENS


def test_a_window_below_the_floor_is_raised_to_it(client):
    """A typo like 40 must not quietly make the app unusable for one model."""
    c = client({"mystery-model": 40})
    assert c.preferred_context("mystery-model") == c.DEFAULT_CONTEXT_TOKENS


def test_a_broken_preferences_file_does_not_stop_a_chat(client):
    c = client("not a dict at all")
    assert c.preferred_context("mystery-model") is None


def test_the_route_cleans_what_the_box_sends():
    """The number arrives from a text box, so "", "auto", a negative and a
    paste all reach the route. None of them may fail the whole Settings save,
    which carries every other field on the screen in the same PUT."""
    from memorymap.api.routes_settings import (
        _MAX_SETTABLE_CONTEXT,
        _validated_context_windows,
    )

    cleaned = _validated_context_windows(
        {
            "good": 16384,
            "empty": "",
            "word": "auto",
            "negative": -5,
            "absurd": _MAX_SETTABLE_CONTEXT + 1,
            "": 4096,
            "x" * 201: 4096,
        }
    )
    assert cleaned["good"] == 16384
    assert cleaned["empty"] is None
    assert cleaned["word"] is None
    assert cleaned["negative"] is None
    assert cleaned["absurd"] is None
    # A nameless model and an absurdly long name are not models.
    assert "" not in cleaned
    assert not any(len(k) > 200 for k in cleaned)
    assert _validated_context_windows("not a dict") == {}
