"""The launcher scripts, checked from Linux CI.

Brief 17's contract is that `./start.sh` and `start.bat` are one launcher
with two spellings: the same flags, in the same order, in the same help
text, writing the same status protocol. Nothing in the suite can run cmd or
PowerShell, so this file reads the two scripts as text and fails the build
when they drift, which is the only way that promise survives a session that
only edits one of them.
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
START_SH = ROOT / "start.sh"
START_BAT = ROOT / "start.bat"
START_DESKTOP_SH = ROOT / "start-desktop.sh"
START_DESKTOP_BAT = ROOT / "start-desktop.bat"
UNINSTALL_SH = ROOT / "uninstall.sh"
UNINSTALL_BAT = ROOT / "uninstall.bat"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


class TestPortFromEnv:
    """`--port N` reaches the server.

    The launcher exports MEMORYMAP_PORT; before this was read, the flag
    moved the launcher's port checks and the URL it opened but left the
    server itself on 8000, so `--port 8010` opened a browser at a port
    nothing was listening on.
    """

    def test_default_is_8000(self, monkeypatch):
        from memorymap.__main__ import _port_from_env

        monkeypatch.delenv("MEMORYMAP_PORT", raising=False)
        assert _port_from_env() == 8000

    def test_a_number_is_honoured(self):
        from memorymap.__main__ import _port_from_env

        assert _port_from_env("8010") == 8010
        assert _port_from_env(" 8781 ") == 8781

    @pytest.mark.parametrize("raw", ["", "abc", "80.5", "0", "-1", "65536", "99999999"])
    def test_junk_falls_back_rather_than_raising(self, raw):
        from memorymap.__main__ import _port_from_env

        assert _port_from_env(raw) == 8000

    def test_the_module_reads_the_environment(self, monkeypatch):
        """PORT is what the desktop paths and _run_server actually use."""
        import importlib

        monkeypatch.setenv("MEMORYMAP_PORT", "8123")
        launcher = importlib.reload(importlib.import_module("memorymap.__main__"))
        try:
            assert launcher.PORT == 8123
        finally:
            monkeypatch.delenv("MEMORYMAP_PORT", raising=False)
            importlib.reload(launcher)

    def test_start_sh_exports_the_variable_the_module_reads(self):
        assert re.search(r"export\s+MEMORYMAP_PORT=", _read(START_SH))

    def test_start_bat_sets_the_variable_the_module_reads(self):
        assert 'set "MEMORYMAP_PORT=!MM_PORT!"' in _read(START_BAT)


class TestTheShellScriptsParse:
    @pytest.mark.parametrize(
        "script", ["start.sh", "start-desktop.sh", "uninstall.sh"]
    )
    def test_bash_n(self, script):
        result = subprocess.run(
            ["bash", "-n", str(ROOT / script)], capture_output=True, text=True
        )
        assert result.returncode == 0, result.stderr

    def test_they_are_executable(self):
        for script in (START_SH, START_DESKTOP_SH, UNINSTALL_SH):
            assert os.access(script, os.X_OK), script


# --- the two launchers, read as one contract -------------------------------

FLAG_ORDER = [
    "desktop",
    "--port",
    "--no-browser",
    "--no-update",
    "--reinstall",
    "--doctor",
    "--logs",
    "--shortcut",
    "--version",
    "--help",
]


def _help_flags(text: str, start: str, end: str) -> list[str]:
    """The flags named in a help block, in the order they are printed."""
    at = text.index(start)
    body = text[at : text.index(end, at)]
    found = []
    for line in body.splitlines():
        # The flag, its optional single-letter argument placeholder, then
        # the column of description text.
        m = re.match(r"^\s*(?:echo\s+)?(--?[a-zA-Z-]+|desktop)(?:\s[A-Z])?\s{2,}\S", line)
        if m:
            found.append(m.group(1))
    return found


class TestOneLauncherTwoSpellings:
    """`start --doctor` has to be the same sentence on both platforms."""

    def test_the_help_texts_list_the_same_flags_in_the_same_order(self):
        sh = _help_flags(_read(START_SH), "MemoryMap AI launcher", "MM_HELP\n}")
        bat = _help_flags(_read(START_BAT), "echo MemoryMap AI launcher", "\n:log")
        assert sh == FLAG_ORDER, sh
        assert bat == FLAG_ORDER, bat

    def test_both_print_where_the_notes_are(self):
        assert "Your notes: $MM_DATA_DIR" in _read(START_SH)
        assert "Your notes: !MM_DATA_DIR!" in _read(START_BAT)

    def test_both_reject_an_unknown_flag_with_exit_2(self):
        assert "exit 2" in _read(START_SH)
        assert "exit /b 2" in _read(START_BAT)

    def test_both_point_at_their_own_uninstaller(self):
        assert "./uninstall.sh --help" in _read(START_SH)
        assert "uninstall.bat --help" in _read(START_BAT)


class TestStatusProtocol:
    """Every phase writes a `step|total|title|detail|state` line, or the
    splash renders a step list with a hole in it."""

    def test_the_two_scripts_use_the_same_phase_titles(self):
        sh = set(re.findall(r'mm_status "\$MM_STEP_\w+" "([^"]+)"', _read(START_SH)))
        bat = set(re.findall(r'call :status \S+ "([^"]+)"', _read(START_BAT)))
        assert sh, "start.sh writes no status lines at all"
        assert sh == bat, sh ^ bat

    def test_every_phase_is_covered(self):
        expected = {"Update", "Python", "Dependencies", "Desktop window", "Start"}
        sh = set(re.findall(r'mm_status "\$MM_STEP_\w+" "([^"]+)"', _read(START_SH)))
        assert expected <= sh, expected - sh

    def test_both_scripts_carry_the_same_step_totals(self):
        for text in (_read(START_SH), _read(START_BAT)):
            assert "MM_STEP_TOTAL=5" in text and "MM_STEP_TOTAL=4" in text

    def test_the_line_shape_is_the_one_the_parser_expects(self):
        from memorymap.core.launch_status import parse_line

        assert parse_line("2|5|Python|Building the environment|active") is not None

    def test_both_poll_the_same_cancel_file(self):
        assert "__cancel__" in _read(START_SH)
        assert "__cancel__" in _read(START_BAT)
        assert "${MM_SPLASH_FILE}.cancel" in _read(START_SH)
        assert "!MM_SPLASH_FILE!.cancel" in _read(START_BAT)


class TestBatchFileRules:
    """The cmd rules start.bat's own header records, checked rather than
    trusted: PowerShell and cmd cannot run in this suite, so a structural
    read is the only gate there is.
    """

    def _lines(self, path: Path = START_BAT):
        return _read(path).splitlines()

    @staticmethod
    def _unquoted(ln: str) -> str:
        out = re.sub(r'"[^"]*"', "", ln)
        # `echo(` is cmd's empty-safe echo, not an opening bracket, and `^(`
        # is an escaped literal.
        out = re.sub(r"(?i)\becho\(", "echo ", out)
        return out.replace("^(", "").replace("^)", "")

    @pytest.mark.parametrize("name", ["start.bat", "uninstall.bat", "start-desktop.bat"])
    def test_no_parenthesis_inside_an_echo_within_a_block(self, name):
        """cmd reads the ) as the end of the block and the script dies."""
        depth = 0
        offenders = []
        for i, ln in enumerate(self._lines(ROOT / name), 1):
            if re.match(r"(?i)^\s*(rem\b|::)", ln):
                continue
            unquoted = self._unquoted(ln)
            if depth > 0 and re.match(r"(?i)^\s*echo[ (.]", ln.strip()):
                body = re.sub(r"(?i)^\s*echo\(", "", unquoted)
                if "(" in body or ")" in body:
                    offenders.append((i, ln.strip()[:80]))
            depth += unquoted.count("(") - unquoted.count(")")
        assert not offenders, offenders

    @pytest.mark.parametrize("name", ["start.bat", "uninstall.bat", "start-desktop.bat"])
    def test_the_blocks_balance(self, name):
        depth = 0
        for ln in self._lines(ROOT / name):
            if re.match(r"(?i)^\s*(rem\b|::)", ln):
                continue
            depth += self._unquoted(ln).count("(") - self._unquoted(ln).count(")")
            assert depth >= 0, ln
        assert depth == 0

    @pytest.mark.parametrize("name", ["start.bat", "uninstall.bat"])
    def test_every_goto_and_call_target_exists(self, name):
        text = _read(ROOT / name)
        labels = {
            m.group(1).lower() for m in re.finditer(r"(?m)^\s*:([A-Za-z_0-9]+)", text)
        }
        targets = {
            m.group(1).lower()
            for m in re.finditer(r"(?:^|\s)(?:goto|call)\s+:([A-Za-z_0-9]+)", text, re.I)
        }
        assert targets - labels - {"eof"} == set()

    def test_the_relaunch_guard_survives_the_new_flags(self):
        """A running .bat is read by byte offset, so the self-update has to
        relaunch a fresh copy; MM_CHILD is what stops that looping. It must
        also pass the flags on, which SHIFT would otherwise have eaten."""
        text = _read(START_BAT)
        assert 'set "MM_ARGS=%*"' in text
        assert 'call "%~f0" !MM_ARGS!' in text
        relaunch = text.index('call "%~f0"')
        assert "if defined MM_CHILD goto :after_update" in text[:relaunch]
        assert 'set "MM_CHILD=1"' in text[:relaunch]

    def test_the_port_flag_reads_its_value_before_shifting(self):
        """%1 inside a block is expanded when the block is parsed, so a
        SHIFT earlier in the same block does not move it."""
        text = _read(START_BAT)
        block = text[text.index('if /i "%~1"=="--port" (') :]
        block = block[: block.index("\n)")]
        assert block.index('set "MM_PORT=%~2"') < block.index("shift")

    def test_the_status_write_puts_the_redirect_first(self):
        """A value ending in a digit turns `echo !VAR!>>file` into a
        numbered stream redirect."""
        text = _read(START_BAT)
        assert '>>"!MM_SPLASH_FILE!" echo(!MM_ST_LINE!' in text
        assert '>>"!MM_LOG!" echo(' in text

    def test_python_one_liners_with_apostrophes_use_backquotes(self):
        """FOR /F ends a single-quoted command at the next apostrophe, so a
        Python one-liner full of them needs `usebackq` and backticks."""
        for ln in self._lines():
            m = re.search(r"for /f [^(]*\('(.*)'\)", ln)
            if m and "'" in m.group(1):
                pytest.fail(f"apostrophe inside a single-quoted FOR /F: {ln.strip()}")


class TestDesktopWrappers:
    """Item 4: both wrappers exist and pass their arguments through, so
    `start-desktop --port 8010` is not silently a plain `desktop`."""

    def test_the_shell_wrapper_execs_the_launcher_with_its_arguments(self):
        text = _read(START_DESKTOP_SH)
        assert 'cd "$(dirname "$0")"' in text
        assert './start.sh --desktop "$@"' in text

    def test_the_batch_wrapper_passes_everything_through(self):
        assert 'start.bat" --desktop %*' in _read(START_DESKTOP_BAT)


class TestUninstallers:
    """Item 5: the same flag set, and the guards that stop an uninstall
    deleting under a running app."""

    UNINSTALL_FLAGS = [
        "--dry-run",
        "--export",
        "--delete-data",
        "--shortcuts",
        "--yes",
        "--help",
    ]

    def test_both_take_the_same_flags(self):
        sh, bat = _read(UNINSTALL_SH), _read(UNINSTALL_BAT)
        for flag in self.UNINSTALL_FLAGS:
            assert flag in sh, flag
            assert flag in bat, flag

    def test_both_check_the_port_before_deleting(self):
        assert "mm_port_open" in _read(UNINSTALL_SH)
        assert ":port_check" in _read(UNINSTALL_BAT)

    def test_env_is_only_removed_with_delete_data(self):
        """.env carries settings someone chose; a reinstall should find them
        again unless the notes are going too."""
        sh = _read(UNINSTALL_SH)
        # The only rm of .env sits inside the DELETE confirmation, after the
        # notes have gone: .env carries the path to the notebook, so
        # removing it while the notes survive loses them.
        removals = [
            ln for ln in sh.splitlines() if re.search(r'rm -f "\.env"', ln)
        ]
        assert len(removals) == 1, removals
        at = sh.index(removals[0])
        assert sh.index('if [ "$DELETE_DATA" = "1" ]; then', sh.index("--- 3.")) < at
        assert sh.index('reply" = "DELETE"') < at

        bat = _read(UNINSTALL_BAT)
        bat_removals = [ln for ln in bat.splitlines() if 'del /q ".env"' in ln]
        assert len(bat_removals) == 1, bat_removals
        assert bat.index('if not "!REPLY!"=="DELETE"') < bat.index(bat_removals[0])

    def test_the_export_entry_point_exists(self):
        text = (ROOT / "src" / "memorymap" / "__main__.py").read_text(encoding="utf-8")
        assert "--export" in text


class TestTheDoctorRunsHere:
    """`./start.sh --doctor` is run for real: it is the one part of this
    contract Linux CI can actually execute."""

    def test_it_exits_0_or_1_and_prints_the_table(self, tmp_path):
        env = dict(os.environ, MEMORYMAP_DATA_DIR=str(tmp_path / "data"))
        env.pop("MEMORYMAP_PORT", None)
        result = subprocess.run(
            ["./start.sh", "--doctor"],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=180,
        )
        assert result.returncode in (0, 1), result.stdout + result.stderr
        out = result.stdout
        assert "MemoryMap AI - checks" in out
        for label in ("Python", ".venv", "Disk", "Port", "Updates", "Notes", "Last run"):
            assert label in out, label
        assert "[ok]" in out or "[x]" in out

    def test_an_unknown_flag_exits_2_with_the_help(self, tmp_path):
        env = dict(os.environ, MEMORYMAP_DATA_DIR=str(tmp_path / "data"))
        result = subprocess.run(
            ["./start.sh", "--no-browsr"],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 2
        assert "Unknown option: --no-browsr" in result.stdout
        assert "--no-browser" in result.stdout

    @pytest.mark.parametrize("bad", ["abc", "0", "70000"])
    def test_a_bad_port_exits_2(self, bad, tmp_path):
        env = dict(os.environ, MEMORYMAP_DATA_DIR=str(tmp_path / "data"))
        result = subprocess.run(
            ["./start.sh", "--port", bad],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 2, result.stdout

    def test_version_prints_the_version_and_the_paths(self, tmp_path):
        env = dict(os.environ, MEMORYMAP_DATA_DIR=str(tmp_path / "data"))
        result = subprocess.run(
            ["./start.sh", "--version"],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0
        assert "MemoryMap AI" in result.stdout
        assert "Your notes:" in result.stdout
