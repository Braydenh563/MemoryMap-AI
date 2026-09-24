"""The server-mode process used to sit for 5 to 9 seconds after uvicorn had
already logged "Finished server process" (INBOX 423i).

**The thread.** Almost every route in this app is a plain `def`, not an
`async def`, so Starlette runs each one through `anyio.to_thread.run_sync`,
which is backed by a small pool of "AnyIO worker thread" objects. Each one is
supposed to stop itself once the server's own root asyncio task finishes, but
that stop is scheduled as a callback for the event loop's *next* iteration,
and `uvicorn.run()` can tear the loop down before that iteration happens. A
worker left over that way is not a daemon thread, so Python's own interpreter
shutdown, which joins every non-daemon thread with no timeout before the
process can exit, sits waiting on it.

Measured directly (`scratchpad/` is not the place for a one-off repro, so the
numbers are recorded here instead): a real `uvicorn.Server` handling one sync
request and then shutting down consistently leaves an "AnyIO worker thread"
alive and `daemon=False` at the moment `Server.run()` returns, and Python's
own process took an extra 1.8 to 4.6 seconds to actually disappear because of
it, on top of whatever else interpreter teardown costs on this machine. The
worst case is unbounded: nothing tells that thread to stop, so how long it
survives is a race with anyio's own `MAX_IDLE_TIME` (10 seconds), not a
guarantee.

`_stop_lingering_worker_threads` (`__main__.py`, called right after
`uvicorn.run()` returns in `_run_server`) asks any thread of exactly that
class to stop, the same way anyio's own done-callback would have, and bounds
the wait rather than trusting it to be instant. This test reproduces the
leftover thread with a real `uvicorn.Server` running this app's own
`create_app()` and checks the fix actually clears it inside the 1 second
budget. A bare FastAPI app with one throwaway route did not reproduce this
reliably: the leftover thread comes from a race (anyio's done-callback for
the *next* event loop iteration against `uvicorn.run()` tearing the loop
down), and it is this app's own startup work, the embeddings warmup thread,
the autonomous scheduler, that is enough concurrent activity to make that
race land the same way it does for a real launch.
"""

from __future__ import annotations

import socket
import threading
import time

from memorymap.__main__ import _stop_lingering_worker_threads


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _anyio_worker_threads() -> list[threading.Thread]:
    return [
        thread
        for thread in threading.enumerate()
        if type(thread).__module__ == "anyio._backends._asyncio"
        and type(thread).__name__ == "WorkerThread"
    ]


def _serve_one_sync_request_then_shut_down(app) -> None:
    """Runs `app` through a real `uvicorn.Server`: one request against a
    plain `def` route (`/health`, this app's own, not a stand-in), then shut
    down exactly as Ctrl+C would ask for (`should_exit`, not `os.kill`, so
    this has no signal-handling side effects the rest of the suite could
    see). Returns once `Server.run()` itself has returned, i.e. the exact
    moment `_run_server` calls `_stop_lingering_worker_threads`.

    **The real app, not a minimal stand-in.** A bare FastAPI app with one
    route did not reproduce this reliably in trial runs: the leftover thread
    comes from a race (anyio's done-callback for the *next* event loop
    iteration against `uvicorn.run()` tearing the loop down), and this app's
    own startup work (the embeddings warmup thread, the autonomous scheduler)
    is enough concurrent activity to make that race land the same way it
    does for a real launch. A smaller repro is a different, easier race.
    """
    import uvicorn

    port = _free_port()
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config)

    def hit_then_stop() -> None:
        import urllib.request

        for _ in range(200):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=1)
                break
            except Exception:
                time.sleep(0.05)
        time.sleep(0.3)
        server.should_exit = True

    threading.Thread(target=hit_then_stop, daemon=True).start()
    server.run()


#: **What this race actually is.** anyio schedules a worker's own cleanup as
#: a callback for the event loop's *next* iteration
#: (`root_task.add_done_callback`), and whether `uvicorn.run()` tears the
#: loop down before that iteration runs depends on exact scheduling, not on
#: anything this test controls. It reproduced on the first attempt in most
#: manual runs, so this retries a bounded number of times rather than
#: asserting on one attempt: a false "the bug isn't real" from unlucky
#: scheduling is worse than a test that occasionally takes a few seconds
#: longer to prove it.
#:
#: **One test, not two.** A `create_app()`/`Server.run()` cycle that has
#: already reproduced the race once measurably changes the odds of the next
#: one in the same process (reliable alone, essentially never reproduced a
#: second time back to back in manual runs, almost certainly anyio's own
#: per-thread `RunVar` caching warming up). Splitting "the bug reproduces"
#: and "the fix clears it" into separate test functions made the second one
#: flaky for a reason that has nothing to do with what it is testing, so
#: both live in the one attempt below instead.
_REPRODUCE_ATTEMPTS = 8


def test_a_real_uvicorn_server_leaves_a_non_daemon_worker_thread_behind_and_the_fix_clears_it(
    app_state,
) -> None:
    """The bug, reproduced directly, so a future anyio/Starlette release that
    stops doing this is a visible change here rather than a silently
    untested assumption; then the fix, proven against that same thread
    rather than a stand-in. If this ever starts failing on the first half,
    `_stop_lingering_worker_threads` (called from `_run_server`) has become
    a no-op, not a broken test."""
    from memorymap.api.app import create_app

    after: list[threading.Thread] = []
    for _ in range(_REPRODUCE_ATTEMPTS):
        before = _anyio_worker_threads()
        _serve_one_sync_request_then_shut_down(create_app())
        after = [t for t in _anyio_worker_threads() if t not in before]
        if after:
            break
    assert after, f"expected a leftover AnyIO worker thread within {_REPRODUCE_ATTEMPTS} attempts"
    assert any(not t.daemon for t in after), "the leftover worker is expected to be non-daemon"

    started = time.monotonic()
    _stop_lingering_worker_threads(timeout=1.0)
    elapsed = time.monotonic() - started

    assert elapsed < 1.1, f"took {elapsed:.2f}s, over the 1s budget plus slack"
    assert not _anyio_worker_threads(), "a worker thread is still alive after being asked to stop"


def test_stop_lingering_worker_threads_is_a_quiet_no_op_with_nothing_to_stop() -> None:
    """Called on every server-mode exit, whether or not any sync route was
    ever actually hit: must never raise or hang when there is nothing to do."""
    started = time.monotonic()
    _stop_lingering_worker_threads(timeout=1.0)
    assert time.monotonic() - started < 0.5


def test_only_the_named_anyio_class_is_touched() -> None:
    """A thread this function does not recognise must be left alone: calling
    an arbitrary object's `.stop()` because it happens to have one is how a
    shutdown handler breaks something it was never meant to touch."""

    class _NotAnyio(threading.Thread):
        def __init__(self) -> None:
            super().__init__(daemon=False, name="not-anyio")
            self.stopped = False
            self._ready = threading.Event()
            self._go = threading.Event()

        def stop(self) -> None:
            self.stopped = True
            self._go.set()

        def run(self) -> None:
            self._ready.set()
            self._go.wait(timeout=5)

    thread = _NotAnyio()
    thread.start()
    thread._ready.wait(timeout=5)
    try:
        _stop_lingering_worker_threads(timeout=0.2)
        assert not thread.stopped, "a thread outside anyio's own class must not be told to stop"
    finally:
        thread.stop()
        thread.join(timeout=5)
