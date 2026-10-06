"""The librarian's stop flag and hold are module-level, so they used to leak.

`autonomous._cancel` (the Quit flag), `_snooze_until` and `_snooze_frozen` live
at module level because the scheduler is one per process. Under pytest that is
one per *run*: a test that pressed Quit left the flag set and a six hour hold
armed for every test after it in the same process, and which tests those were
depended on the order they ran in (`-n auto` reshuffles it per worker).

`conftest._reset_the_librarian` clears all three around every test, and
`autonomous.reset_state()` is what it calls; a new app does the same on start,
because a fresh app is a fresh notebook and its hold is not the last one's.

The two tests below are order dependent on purpose: the first dirties the state
and the second, which pytest runs after it in file order, asserts it is clean.
Either one failing alone means the isolation is gone.
"""

from __future__ import annotations

from memorymap.ai import autonomous


def test_dirty_the_state_one():
    autonomous.request_stop(snooze_seconds=3600)
    assert autonomous.cancelled()
    assert autonomous.snoozed_for() > 0


def test_the_next_test_starts_clean():
    assert not autonomous.cancelled()
    assert autonomous.snoozed_for() == 0


def test_reset_state_clears_the_flag_the_hold_and_the_frozen_hold():
    autonomous.request_stop(snooze_seconds=3600)
    autonomous.freeze_hold()
    autonomous.reset_state()
    assert not autonomous.cancelled()
    assert autonomous.snoozed_for() == 0
    assert autonomous._snooze_frozen is None


def test_a_new_app_starts_without_the_last_apps_hold(app_state):
    autonomous.request_stop(snooze_seconds=3600)
    from memorymap.api.app import create_app

    create_app()
    assert not autonomous.cancelled()
    assert autonomous.snoozed_for() == 0
    autonomous.stop()
