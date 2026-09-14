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


#: pytest re-installs its own capture streams at the start of every test
#: phase, so the streams are set to None inside the test body, never from a
#: fixture: a fixture's None was swapped back before the body ran and the
#: guard saw a real stream.
@pytest.fixture
def no_console(monkeypatch, tmp_path):
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path))
    return tmp_path


def _without_console(monkeypatch):
    monkeypatch.setattr(sys, "stdout", None)
    monkeypatch.setattr(sys, "stderr", None)


def test_streams_are_real_files_afterwards(no_console, monkeypatch):
    _without_console(monkeypatch)
    entry._ensure_std_streams()
    out, err = sys.stdout, sys.stderr
    assert out is not None and err is not None and err.isatty() is False
    print("a line that must not raise")
    out.flush()
    assert Path(out.name).name == "desktop-stdio.log"
    assert "a line that must not raise" in Path(out.name).read_text(encoding="utf-8")


def test_real_streams_are_left_alone():
    before = (sys.stdout, sys.stderr)
    entry._ensure_std_streams()
    assert (sys.stdout, sys.stderr) == before


def test_uvicorns_formatter_can_be_built_without_a_console(no_console, monkeypatch):
    _without_console(monkeypatch)
    entry._ensure_std_streams()
    from uvicorn.logging import DefaultFormatter

    DefaultFormatter(fmt="%(levelprefix)s %(message)s")


def test_both_entry_points_call_it_first():
    main_body = SOURCE[SOURCE.index("def main() -> None:") :]
    assert main_body.split("\n")[1].strip() == "_ensure_std_streams()"
    server = re.search(r"def _run_server\(\) -> None:\n(.*?)\n\n", SOURCE, re.S).group(1)
    assert server.strip().splitlines()[0].strip() == "_ensure_std_streams()"
