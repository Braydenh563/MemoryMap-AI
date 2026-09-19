"""Every child process the app starts says what console it wants.

Reported against the packaged Windows build: "random terminal windows
which appear at the top appearing and disappearing after a second while I
navigated throughout the app". A GUI-subsystem parent (the frozen app, or
`pythonw.exe`) that starts a console-subsystem child, and `docker.exe`,
`pip.exe`, `tesseract.exe` and `python.exe` all are, gets a real console
window from Windows unless the spawn asks for `CREATE_NO_WINDOW`.

The defect is invisible to every other check in this suite: it needs a
packaged build, on Windows, being watched. So this reads the source
instead and fails when a `subprocess.Popen` or `subprocess.run` in `src/`
names no `creationflags` at all. `memorymap.core.subproc.NO_WINDOW` is the
answer for nearly all of them; the handful that want something else (the
update installer wants `DETACHED_PROCESS`, the console-mode relaunch wants
`CREATE_NEW_CONSOLE`) pass that instead and satisfy this the same way.

`creationflags=0` is accepted on POSIX, only a non-zero value is refused,
which is why `NO_WINDOW` can be passed unconditionally rather than behind
a `sys.platform` branch at each call site.
"""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
SPAWNERS = {"Popen", "run", "call", "check_call", "check_output"}

#: Spawns that can never reach Windows, because the platform branch they
#: sit in has already ruled it out. `file` is relative to `src/`.
EXEMPT = {
    # routes_files.py's `open` (darwin) and `xdg-open` (everything else):
    # the Windows arm of the same `if` calls `os.startfile`, which opens no
    # console of its own.
    ("memorymap/api/routes_files.py", "Popen"),
}


def _spawn_calls():
    for path in sorted(SRC.rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            if not isinstance(func, ast.Attribute) or func.attr not in SPAWNERS:
                continue
            if not (isinstance(func.value, ast.Name) and func.value.id == "subprocess"):
                continue
            yield path.relative_to(SRC).as_posix(), func.attr, node


def test_every_spawn_says_which_console_it_wants():
    missing = []
    for relative, attr, node in _spawn_calls():
        if (relative, attr) in EXEMPT:
            continue
        if any(keyword.arg == "creationflags" for keyword in node.keywords):
            continue
        missing.append(f"{relative}:{node.lineno} subprocess.{attr}")
    assert not missing, (
        "a child process spawned with no creationflags: on the packaged "
        "Windows app this flashes a console window over whatever the person "
        "is doing. Pass creationflags=NO_WINDOW from memorymap.core.subproc, "
        "or the flag this one actually wants:\n" + "\n".join(missing)
    )


def test_the_flag_is_inert_off_windows():
    """`NO_WINDOW` is safe to pass unconditionally, which is the whole point
    of it being a constant rather than a branch repeated at each call site."""
    import sys

    from memorymap.core.subproc import CREATE_NO_WINDOW, NO_WINDOW

    assert CREATE_NO_WINDOW == 0x08000000
    if sys.platform == "win32":
        assert NO_WINDOW == CREATE_NO_WINDOW
    else:
        assert NO_WINDOW == 0
