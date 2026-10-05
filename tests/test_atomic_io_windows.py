"""`core/atomic_io.py` on Windows, where a rename over an open file is refused."""

from __future__ import annotations

import os


def test_a_rename_windows_refuses_for_a_moment_is_tried_again(tmp_path, monkeypatch):
    """An antivirus scan or a second launch reading `instance.lock` holds the
    file for milliseconds, and Windows refuses a rename over an open file
    (WinError 5/32): the write is tried again rather than failing."""
    from memorymap.core import atomic_io

    real = os.replace
    refusals = {"left": 2}

    def flaky(src, dst):
        if refusals["left"]:
            refusals["left"] -= 1
            raise PermissionError(13, "in use")
        real(src, dst)

    monkeypatch.setattr(atomic_io.sys, "platform", "win32")
    monkeypatch.setattr(atomic_io.os, "replace", flaky)
    monkeypatch.setattr(atomic_io.time, "sleep", lambda s: None)
    target = tmp_path / "instance.lock"
    atomic_io.atomic_write_text(target, '{"café": 1}')
    written = target.read_text(encoding="utf-8")
    assert written == '{"café": 1}'
    assert refusals["left"] == 0
    assert not list(tmp_path.glob(".instance.lock.*"))


def test_elsewhere_a_refused_rename_is_the_answer(tmp_path, monkeypatch):
    from memorymap.core import atomic_io

    def refused(src, dst):
        raise PermissionError(13, "read-only")

    monkeypatch.setattr(atomic_io.sys, "platform", "linux")
    monkeypatch.setattr(atomic_io.os, "replace", refused)
    raised = False
    try:
        atomic_io.atomic_write_text(tmp_path / "x.json", "{}")
    except PermissionError:
        raised = True
    assert raised
