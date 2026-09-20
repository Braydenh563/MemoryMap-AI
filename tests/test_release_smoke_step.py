"""The release workflow runs what it built before it publishes it.

The 0.2.x packaged build died at launch (uvicorn's formatter on a console-
less process, INBOX 251) and nothing in the workflow could have noticed:
it built, packaged and uploaded without starting the binary once. Both
package jobs now start the frozen app and wait for its page, before the
step that packages or uploads it.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")


def _job(name: str) -> str:
    start = WORKFLOW.index(f"  {name}:\n")
    rest = WORKFLOW[start + 1 :]
    nxt = rest.find("\n  build-") if "\n  build-" in rest else -1
    return WORKFLOW[start:] if nxt < 0 else WORKFLOW[start : start + 1 + nxt]


def test_windows_job_smoke_tests_the_exe_before_the_installer():
    job = _job("build-windows-installer")
    smoke = job.index("Smoke test the frozen app")
    assert 'MemoryMap AI.exe" &' in job[smoke:]
    assert smoke < job.index("Install Inno Setup")


def test_linux_job_smoke_tests_the_binary_before_zipping():
    job = _job("build-linux-package")
    smoke = job.index("Smoke test the frozen app")
    assert 'MemoryMap AI" &' in job[smoke:]
    assert smoke < job.index("Zip the build")


def test_the_smoke_step_fails_loudly_and_shows_the_log():
    assert WORKFLOW.count("exit 1") >= 2
    assert "desktop-stdio.log" in WORKFLOW


# --- INBOX 253: one-click recovery ------------------------------------------
#
# packaging/windows/installer.iss is the one Windows installer this branch
# builds (a `.wxs`/MSI installer was started on a separate, unmerged agent
# worktree and is not part of this checkout: see that worktree's own
# history if it lands later, there is nothing here to extend for it yet).
# No Windows runner exists in this sandbox to actually run the installer or
# click the shortcut it creates, so this reads the .iss source as text
# instead, the same approach TestOneLauncherTwoSpellings already takes for
# start.bat, and separately proves `--reinstall` really does something on
# a frozen build by importing __main__.py for real (still runnable here:
# it is plain Python, not a PyInstaller build).

INSTALLER_ISS = (ROOT / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
MAIN_PY = ROOT / "src" / "memorymap" / "__main__.py"


def test_a_repair_shortcut_exists_beside_the_ordinary_one():
    """The gate: this shortcut cannot be dropped silently. Matched by
    shape, not by exact text, so a copy-edit to the label does not fail
    this test for the wrong reason, but there must still be exactly one,
    it must run --reinstall, and it must sit in the same Start Menu group
    ({autoprograms}\\{#MyAppName}\\...) as the ordinary shortcut, not
    somewhere a person would never look after the ordinary one stops
    opening."""
    icons = INSTALLER_ISS[INSTALLER_ISS.index("[Icons]") :]
    repair_lines = [
        ln
        for ln in icons.splitlines()
        if ln.strip().startswith("Name:") and "--reinstall" in ln
    ]
    assert len(repair_lines) == 1, repair_lines
    (line,) = repair_lines
    assert '{autoprograms}\\{#MyAppName}\\' in line, line
    assert 'Filename: "{app}\\{#MyAppExeName}"' in line, line
    # --desktop too: a repair that lands in the bare server mode is not
    # what the ordinary shortcut (also --desktop, see the line above it)
    # promised, and confuses "did it work" with "did a window open".
    assert '"--desktop --reinstall"' in line, line


def test_the_repair_shortcut_is_not_the_ordinary_one_in_disguise():
    """A regression that renamed the ordinary shortcut's own Parameters to
    add --reinstall (fixing nothing: see the app-level test below for what
    --reinstall must still do at every ordinary launch) would pass a looser
    "the string --reinstall is in the file somewhere" check; this counts
    shortcuts instead."""
    icons = INSTALLER_ISS[INSTALLER_ISS.index("[Icons]") :]
    names = [ln for ln in icons.splitlines() if ln.strip().startswith("Name:")]
    assert len(names) == 3, names  # Start Menu, Desktop (optional task), Repair
    without_reinstall = [ln for ln in names if "--reinstall" not in ln]
    assert len(without_reinstall) == 2, without_reinstall


def test_reinstall_is_wired_into_main_and_never_touches_notes():
    """Imported for real, not just grepped: `--reinstall` has to actually
    reach `_repair_install` from argparse, and that function's own
    docstring is the record of the decision (INBOX 253) that a repair here
    means "clear the cached window profile", not "rebuild a venv that does
    not exist on a frozen build", read from the source directly, since
    __main__.main() only runs to completion inside a real desktop/server
    process this suite does not start."""
    import ast

    tree = ast.parse(MAIN_PY.read_text(encoding="utf-8"))
    functions = {
        node.name: node
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    assert "_repair_install" in functions, "no _repair_install() in __main__.py"
    repair_fn = functions["_repair_install"]
    # The CODE, not the docstring explaining what it deliberately does not
    # touch: that sentence would otherwise fail this exact check for
    # saying the right thing.
    body = [stmt for stmt in repair_fn.body if not isinstance(stmt, ast.Expr)]
    repair_code = "\n".join(ast.unparse(stmt) for stmt in body)
    # Notes live in the database; preferences in preferences.json. Neither
    # is reachable from here, because this function must never touch either.
    for off_limits in ("preferences.json", "Entry", "database", "get_db", "get_config"):
        assert off_limits not in repair_code, (off_limits, repair_code)
    assert "webview" in repair_code  # the one thing it is allowed to clear

    main_src = ast.get_source_segment(MAIN_PY.read_text(encoding="utf-8"), functions["main"])
    assert "args.reinstall" in main_src
    assert "_repair_install()" in main_src
    # Falls through to the ordinary startup path: a repair that does not
    # then open the app is not "one click" (INBOX 253's own phrase).
    reinstall_at = main_src.index("args.reinstall")
    desktop_at = main_src.index("args.desktop")
    assert reinstall_at < desktop_at
