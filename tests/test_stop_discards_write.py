"""Stop lands while a step's model call is in flight (OPEN row 1362, agent87):
the call returns, and the write it chose used to happen anyway, because a
streamed run only sees Stop between yields. A write that starts after Stop is
discarded; a read still runs; a run that was not stopped writes as before."""

from __future__ import annotations

from tessellate.ai import tools
from tessellate.core import activity
from tessellate.core.database import Entry


def _count(session) -> int:  # noqa: ANN001
    return session.query(Entry).count()


def test_a_write_after_stop_is_discarded_and_says_so(session):
    with activity.track("generation", "Answering in Chat") as job:
        job.request_stop()
        with activity.bind(job):
            result = tools.execute_tool(session, "create_note", {"content": "must not be written"})
    assert "stopped this run" in result["error"]
    assert _count(session) == 0


def test_a_read_after_stop_still_runs(session):
    with activity.track("generation", "Answering in Chat") as job:
        job.request_stop()
        with activity.bind(job):
            result = tools.execute_tool(session, "count_notes", {})
    assert "error" not in result


def test_a_run_that_was_not_stopped_writes(session):
    with activity.track("generation", "Answering in Chat") as job:
        with activity.bind(job):
            result = tools.execute_tool(session, "create_note", {"content": "kept"})
    assert "error" not in result and _count(session) == 1


def test_outside_a_stream_nothing_is_bound(session):
    assert activity.current_stopped() is False
    assert "error" not in tools.execute_tool(session, "create_note", {"content": "plain call"})


def test_the_stream_binds_its_job_for_each_step_and_unbinds_after(session):
    """`tracked_stream` advances the run inside `bind`, so Stop pressed during
    one `next()` is seen by the write that same `next()` goes on to make."""
    seen: list[bool] = []

    def run():
        activity.stop_kind("generation")  # Stop arrives while the step is running
        seen.append(activity.current_stopped())
        yield "data: one\n\n"
        seen.append(activity.current_stopped())
        yield "data: two\n\n"

    lines = list(activity.tracked_stream("generation", "Answering in Chat", run()))
    assert lines == ["data: one\n\n"]  # the stream ends after the step that was stopped
    assert seen == [True]
    assert activity.current_stopped() is False
