"""The privacy receipt's ledger is written as connections happen.

It used to be flushed only on a receipt read and at a clean shutdown, so a
process that was killed (a crash, the OS ending a laptop's session, a power
cut) lost every connection it had seen since the last read, and the receipt
that is meant to prove what left the machine under-reported exactly the
launches that ended badly. The hook still does no I/O; it queues one job on
`core/jobs.py`'s pool, which flushes after `FLUSH_DELAY` (no thread of its own:
`test_flaw_class_lints.py` ratchets those).
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import textwrap
import time
from pathlib import Path

import pytest

from memorymap.core import egress

SRC = str(Path(__file__).resolve().parents[1] / "src")


def _wait_for(path: Path, predicate, seconds: float = 8.0):
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            data = json.loads(path.read_text())
        except (OSError, ValueError):
            data = None
        if data is not None and predicate(data):
            return data
        time.sleep(0.05)
    return None


@pytest.fixture
def writer(tmp_path, monkeypatch):
    egress.install()
    egress.reset()
    monkeypatch.setattr(egress, "FLUSH_DELAY", 0.05)
    path = tmp_path / egress.LEDGER_NAME
    egress.configure(path)
    yield path
    egress.configure(None)
    # Let a writer that was already woken see that it has nowhere to write,
    # so it cannot flush this test's counts into the next test's file.
    time.sleep(0.2)
    egress.reset()


def test_a_connection_reaches_the_ledger_without_a_read_or_a_shutdown(writer):
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    data = _wait_for(writer, lambda d: d["totals"]["internet"] == 1)
    assert data is not None, "nothing was written without a receipt read or a shutdown"
    (row,) = data["destinations"]
    assert row["host"] == "93.184.216.34" and row["count"] == 1


def test_a_burst_is_one_count_each_and_never_twice(writer):
    for _ in range(20):
        sys.audit("socket.connect", None, ("93.184.216.34", 443))
    assert _wait_for(writer, lambda d: d["totals"]["internet"] == 20) is not None
    time.sleep(0.3)
    egress.flush(writer)
    stored = json.loads(writer.read_text())
    assert stored["totals"]["internet"] == 20
    assert [row["count"] for row in stored["destinations"]] == [20]


def test_the_writer_and_another_file_do_not_consume_each_others_difference(writer, tmp_path):
    other = tmp_path / "other" / egress.LEDGER_NAME
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    assert _wait_for(writer, lambda d: d["totals"]["internet"] == 1) is not None
    other.parent.mkdir()
    egress.flush(other)
    assert json.loads(other.read_text())["totals"]["internet"] == 1


def test_a_failed_write_is_carried_by_the_next_flush(writer, monkeypatch):
    from memorymap.core import atomic_io

    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    real = atomic_io.atomic_write_json

    def full_disk(*_args, **_kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(atomic_io, "atomic_write_json", full_disk)
    egress.flush(writer)
    monkeypatch.setattr(atomic_io, "atomic_write_json", real)
    egress.flush(writer)
    assert json.loads(writer.read_text())["totals"]["internet"] == 1


def test_the_flush_is_not_a_row_in_the_activity_panel(writer):
    from memorymap.core import jobs

    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    seen = []
    deadline = time.time() + 2
    while time.time() < deadline and not writer.exists():
        seen += [row["kind"] for row in jobs.pending()]
        time.sleep(0.005)
    assert "job-ledger" not in seen


def test_loopback_traffic_does_not_queue_a_write(writer):
    sys.audit("socket.connect", None, ("127.0.0.1", 11434))
    time.sleep(0.4)
    assert not writer.exists()


CHILD = textwrap.dedent(
    """
    import sys, time
    sys.path.insert(0, {src!r})
    from pathlib import Path
    from memorymap.core import egress

    egress.install()
    egress.FLUSH_DELAY = 0.05
    egress.configure(Path({ledger!r}))
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    sys.audit("socket.connect", None, ("93.184.216.34", 443))
    print("recorded", flush=True)
    # No flush(), no shutdown handler: this process is killed from outside.
    time.sleep(60)
    """
)


@pytest.mark.skipif(not hasattr(signal, "SIGKILL"), reason="needs SIGKILL")
def test_a_killed_process_leaves_what_it_saw_in_the_ledger(tmp_path):
    ledger = tmp_path / egress.LEDGER_NAME
    child = subprocess.Popen(
        [sys.executable, "-c", CHILD.format(src=SRC, ledger=str(ledger))],
        stdout=subprocess.PIPE,
        text=True,
        env={**os.environ, "PYTHONPATH": SRC},
    )
    try:
        assert child.stdout.readline().strip() == "recorded"
        written = _wait_for(ledger, lambda d: d["totals"]["internet"] == 2)
        child.send_signal(signal.SIGKILL)
        child.wait(timeout=10)
    finally:
        if child.poll() is None:
            child.kill()
            child.wait(timeout=10)
        child.stdout.close()
    assert written is not None, "the ledger had nothing in it before the kill"
    after = json.loads(ledger.read_text())
    assert after["totals"]["internet"] == 2
    (row,) = after["destinations"]
    assert row["host"] == "93.184.216.34" and row["count"] == 2
    assert child.returncode == -signal.SIGKILL
