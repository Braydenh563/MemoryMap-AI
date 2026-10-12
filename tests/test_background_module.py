"""core/background.py: a registered thread is listed while it runs and gone after (decision 58)."""

from __future__ import annotations

import threading

from tessellate.core import background


def test_a_thread_is_listed_while_it_runs_and_dropped_when_it_returns():
    release = threading.Event()
    thread = background.start("probe", release.wait, stop=release.set)
    names = [r["name"] for r in background.running()]
    assert "probe" in names
    assert [r for r in background.running() if r["name"] == "probe"][0]["stoppable"] is True
    release.set()
    thread.join(2)
    assert "probe" not in [r["name"] for r in background.running()]


def test_stop_all_asks_only_the_threads_that_can_stop():
    release = threading.Event()
    other = threading.Event()
    a = background.start("stoppable", release.wait, stop=release.set)
    b = background.start("plain", other.wait)
    asked = background.stop_all()
    assert "stoppable" in asked and "plain" not in asked
    a.join(2)
    other.set()
    b.join(2)
