"""One place that knows how to spawn a child process without a console.

Reported directly, about the packaged Windows build: "random terminal
windows which appear at the top appearing and disappearing after a second
while I navigated throughout the app".

The cause is a Windows rule rather than a bug in any one call site. The
packaged app is a GUI-subsystem process (``pythonw.exe`` in a source
install, a ``console=False`` PyInstaller build when frozen), so it owns no
console. When such a process starts a *console-subsystem* child, and
``docker.exe``, ``pip.exe``, ``tesseract.exe``, ``winget.exe`` and
``python.exe`` all are, Windows allocates a brand new console window for
it, shows it, and destroys it when the child exits. Every probe the app
makes in the background therefore blinks a black window over whatever the
person was doing. Nothing about the app's own windowing changes that: the
flag has to be on the spawn.

``CREATE_NO_WINDOW`` is that flag. It tells Windows to give the child a
console it never shows, so the child's own stdout/stderr pipes keep
working exactly as they did (which matters: `extras.py` and
`searxng_manager.py` both read a child's output line by line to drive a
progress bar) while nothing appears on screen.

``NO_WINDOW`` is ``0`` off Windows, and ``subprocess`` accepts
``creationflags=0`` on every platform: it only rejects a *non-zero* value
on POSIX. So call sites pass it unconditionally rather than each carrying
its own ``sys.platform`` branch, which is how six copies of the same magic
number got here in the first place.

`tests/test_subprocess_no_window.py` fails the build when a new spawn in
`src/` forgets it, because the symptom shows up only in a packaged build
on one operating system, which is the furthest a defect can be from the
person who introduces it.
"""

from __future__ import annotations

import sys

#: Windows' ``CREATE_NO_WINDOW``. Deliberately spelled out rather than
#: taken from ``subprocess.CREATE_NO_WINDOW``, which does not exist as an
#: attribute on POSIX builds of CPython, so importing it would need the
#: same platform branch this constant exists to remove.
CREATE_NO_WINDOW = 0x08000000

#: What to pass as ``creationflags``. Zero off Windows.
NO_WINDOW = CREATE_NO_WINDOW if sys.platform == "win32" else 0
