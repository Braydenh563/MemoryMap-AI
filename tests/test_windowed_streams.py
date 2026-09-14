"""The packaged, windowed build has no console, so `sys.stdout` and
`sys.stderr` are None; uvicorn's log formatter calls `sys.stderr.isatty()`
and the app died before binding a port ("Unable to configure formatter
'default'", INBOX 251). `_ensure_std_streams` gives both a real stream first,
and both entry points call it before anything else can write."""

import re
import sys
from pathlib import Path

import pytest

import memorymap.__main__ as entry

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "src" / "memorymap" / "__main__.py").read_text(encoding="utf-8")


@pytest.fixture
def no_console(monkeypatch, tmp_path):
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(sys, "stdout", None)
    monkeypatch.setattr(sys, "stderr", None)
    yield tmp_path


def test_streams_are_real_files_afterwards(no_console):
    entry._ensure_std_streams()
    assert sys.stdout is not None and sys.stderr is not None
    assert sys.stderr.isatty() is False
    print("a line that must not raise")
    sys.stdout.flush()
    #: conftest's own autouse fixture also points the data dir somewhere
    #: under tmp_path, and pytest's capture may wrap the stream, so the log
    #: is found rather than assumed.
    logs = list(no_console.rglob("desktop-stdio.log"))
    assert logs, "no desktop-stdio.log was opened under the data dir"


def test_real_streams_are_left_alone():
    before = (sys.stdout, sys.stderr)
    entry._ensure_std_streams()
    assert (sys.stdout, sys.stderr) == before


def test_uvicorns_formatter_can_be_built_without_a_console(no_console):
    entry._ensure_std_streams()
    from uvicorn.logging import DefaultFormatter

    DefaultFormatter(fmt="%(levelprefix)s %(message)s")


def test_both_entry_points_call_it_first():
    main_body = SOURCE[SOURCE.index("def main() -> None:") :]
    assert main_body.split("\n")[1].strip() == "_ensure_std_streams()"
    server = re.search(r"def _run_server\(\) -> None:\n(.*?)\n\n", SOURCE, re.S).group(1)
    assert server.strip().splitlines()[0].strip() == "_ensure_std_streams()"
