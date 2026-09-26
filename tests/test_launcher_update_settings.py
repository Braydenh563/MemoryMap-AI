"""The launchers obey the app's own update settings (INBOX 221).

The owner, 2026-09-14: "make sure all the auto update whether upon new
release or following main works which can be adjusted and set in settings
and make sure the bat and sh files stick to the set things in those
settings."

Before this, `start.sh` and `start.bat` ran `git pull --ff-only` on every
launch of a git checkout, whatever Settings said. Both switches in
Settings -> About were therefore half true: "Update automatically" turned
off still updated the code on the next launch, and "Stable (tagged
releases)" still followed whatever branch happened to be checked out.

There are two very different things to test here and they need two very
different tests:

* **start.sh** can be *run*, and is. `mm_update_plan` is pulled out of the
  real script with `sed` and evaluated against a real `preferences.json`,
  so what these tests exercise is the launcher's own parser rather than a
  copy of it in the test. The doctor row is then run end to end.
* **start.bat** cannot run on Linux CI, so it gets the contract tests the
  rest of `test_launcher_scripts.py` already uses for it: the settings are
  read, the block is gated, and each channel has its own path. A contract
  test is weaker than an execution test and is said so here rather than
  quietly presented as equivalent.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
START_SH = ROOT / "start.sh"
START_BAT = ROOT / "start.bat"

#: Pulls the three functions out of the live script and calls the last one,
#: so a change to how `start.sh` parses `preferences.json` is a change these
#: tests see. Deliberately not a re-implementation: a parser tested against
#: its own copy proves nothing.
PROBE = r"""
set -u
MM_DATA_DIR="$1"
eval "$(sed -n '/^mm_pref_str() {/,/^}/p;/^mm_pref_bool() {/,/^}/p;/^mm_update_plan() {/,/^}/p' "$2")"
mm_update_plan
"""


def _plan(data_dir: Path) -> str:
    result = subprocess.run(
        ["bash", "-c", PROBE, "probe", str(data_dir), str(START_SH)],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return result.stdout.strip()


def _prefs(tmp_path: Path, **values) -> Path:
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "preferences.json").write_text(json.dumps(values, indent=2))
    return data_dir


class TestStartShReadsTheSettings:
    """Run for real: the plan is whatever the live script says it is."""

    def test_no_preferences_file_yet_keeps_todays_behaviour(self, tmp_path):
        """A fresh clone has no `preferences.json`, and has always pulled."""
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        assert _plan(data_dir) == "main"

    def test_the_switch_off_means_off(self, tmp_path):
        assert _plan(_prefs(tmp_path, auto_update_enabled=False)) == "off"

    def test_off_wins_over_the_channel(self, tmp_path):
        """Both settings set: off is not a channel, it is "do nothing"."""
        data_dir = _prefs(tmp_path, auto_update_enabled=False, update_channel="stable")
        assert _plan(data_dir) == "off"

    def test_the_stable_channel_is_read(self, tmp_path):
        data_dir = _prefs(tmp_path, auto_update_enabled=True, update_channel="stable")
        assert _plan(data_dir) == "stable"

    def test_the_main_channel_is_read(self, tmp_path):
        data_dir = _prefs(tmp_path, auto_update_enabled=True, update_channel="main")
        assert _plan(data_dir) == "main"

    def test_a_corrupt_preferences_file_falls_back_rather_than_failing(self, tmp_path):
        """The app itself starts on defaults when this file cannot be read
        (core/config.py); the launcher must not do worse, and a launcher that
        died here would take the whole app with it."""
        data_dir = tmp_path / "data"
        data_dir.mkdir()
        (data_dir / "preferences.json").write_text("{not json at all")
        assert _plan(data_dir) == "main"

    def test_the_setting_survives_the_app_writing_the_file(self, tmp_path):
        """Written by `ConfigManager`, read by the launcher: the one shape
        that matters, and the one a hand-built fixture cannot prove."""
        from memorymap.core.config import ConfigManager

        data_dir = tmp_path / "written"
        config = ConfigManager(data_dir)
        config.set_preference("auto_update_enabled", False)
        assert _plan(data_dir) == "off"
        config.set_preference("auto_update_enabled", True)
        config.set_preference("update_channel", "stable")
        assert _plan(data_dir) == "stable"


class TestStartShHonoursThePlan:
    """The gate itself, not only the reading of it."""

    def _text(self) -> str:
        return START_SH.read_text(encoding="utf-8")

    def test_the_pull_cannot_run_when_the_plan_is_off(self):
        text = self._text()
        guard = '[ "$MM_UPDATE_PLAN" != "off" ]'
        assert guard in text, "the self-update block is not gated on the setting"
        # The gate has to sit on the block that pulls, not somewhere later.
        # `rindex`, because the header comment above it quotes the old command
        # while explaining what changed.
        assert text.index(guard) < text.rindex("pull --ff-only")

    def test_the_stable_channel_moves_to_a_tag_and_not_to_the_branch(self):
        text = self._text()
        assert 'if [ "$MM_UPDATE_PLAN" = "stable" ]; then' in text
        assert "fetch --tags --quiet origin" in text
        assert "git tag -l 'v*' --sort=-v:refname" in text
        assert 'git merge --ff-only "$MM_LATEST_TAG"' in text

    def test_neither_channel_can_rewrite_local_work(self):
        """Both paths are --ff-only, so a diverged checkout is left alone."""
        text = self._text()
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith(("git merge", "git pull")) or "pull --ff-only" in stripped:
                assert "--ff-only" in stripped, stripped

    def test_off_is_a_ticked_step_rather_than_silence(self):
        """A step that says nothing is the shape of the "it only loads up to
        step 3 of 5" report; every other skipped update here ticks with a
        reason, so this one does too."""
        assert '"Update" "Off in Settings" "done"' in self._text()


class TestTheDoctorSaysWhatWillHappen:
    """`./start.sh --doctor` is the one part of this that Linux CI can run
    end to end, and it reports the same `mm_update_plan` the update step
    obeys, so the two can never disagree."""

    def _doctor(self, data_dir: Path) -> str:
        env = dict(os.environ, MEMORYMAP_DATA_DIR=str(data_dir))
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
        return result.stdout

    def test_it_says_so_when_updates_are_off(self, tmp_path):
        out = self._doctor(_prefs(tmp_path, auto_update_enabled=False))
        assert "off in Settings" in out, out

    def test_it_names_the_channel_when_they_are_on(self, tmp_path):
        out = self._doctor(_prefs(tmp_path, auto_update_enabled=True, update_channel="stable"))
        # Either the remote answered (the row names the channel) or it did
        # not (offline sandbox); the row must never claim updates are off.
        assert "off in Settings" not in out, out
        if "the git remote answered" in out:
            assert "channel: stable" in out, out


class TestStartBatMatchesStartSh:
    """Contract tests, not execution: Windows is not available here, and
    saying so is the point (CLAUDE.md section 1)."""

    def _text(self) -> str:
        return START_BAT.read_text(encoding="utf-8")

    def test_it_reads_both_settings_out_of_preferences_json(self):
        text = self._text()
        assert 'set "MM_PREFS_FILE=!MM_DATA_DIR!\\preferences.json"' in text
        assert "auto_update_enabled.*false" in text
        assert "update_channel.*stable" in text

    def test_the_block_is_gated_on_the_setting(self):
        text = self._text()
        assert 'if "!MM_UPDATE_PLAN!"=="off" goto :updates_off' in text
        assert text.index("goto :updates_off") < text.rindex("pull --ff-only")

    def test_each_channel_has_its_own_path(self):
        text = self._text()
        assert 'if "!MM_UPDATE_PLAN!"=="stable" call :pull_stable' in text
        assert 'if not "!MM_UPDATE_PLAN!"=="stable" call :pull_main' in text
        assert ":pull_stable" in text and ":pull_main" in text
        assert "fetch --tags --quiet origin" in text
        assert 'git merge --ff-only "!MM_LATEST_TAG!"' in text

    def test_off_is_a_ticked_step_rather_than_silence(self):
        assert '"Update" "Off in Settings" "done"' in self._text()

    @pytest.mark.parametrize(
        "fragment",
        [
            'set "MM_UPDATE_PLAN=main"',
            'set "MM_UPDATE_PLAN=off"',
            'set "MM_UPDATE_PLAN=stable"',
        ],
    )
    def test_the_three_plans_are_the_same_three_words_as_the_sh(self, fragment):
        """One vocabulary across the two launchers: a reader comparing them
        should not have to translate."""
        assert fragment in self._text()


class TestTheDesktopLaunchersInheritIt:
    """`start-desktop.sh`/`.bat` are three lines that delegate, so the
    settings reach them for free; this is what asserts they still delegate
    rather than growing an update path of their own."""

    def test_the_sh_delegates(self):
        text = (ROOT / "start-desktop.sh").read_text(encoding="utf-8")
        assert "./start.sh --desktop" in text
        assert "git pull" not in text

    def test_the_bat_delegates(self):
        text = (ROOT / "start-desktop.bat").read_text(encoding="utf-8")
        assert "start.bat" in text
        assert "git pull" not in text


class TestTheAppAgreesWithTheLaunchers:
    """The default the launchers assume is the default the app reports, or
    Settings would show a switch in the opposite position to the behaviour."""

    def test_a_source_checkout_defaults_to_updating_on_main(self, tmp_path):
        from memorymap.core.config import ConfigManager

        config = ConfigManager(tmp_path / "fresh")
        assert config.get_preference("auto_update_enabled") is True
        assert config.get_preference("update_channel") == "main"


class TestTheFirstLaunchOfAFreshInstall:
    """Found while writing the tests above, and nothing to do with updates.

    `./start.sh --doctor` into a brand new data directory exited 2 with an
    empty terminal roughly one run in eight. Cause: `set -e` and `set -o
    pipefail` are both on, the log rotation runs `ls -1t <dir>/launcher-*.log`
    immediately after `exec > >(tee -a ...)`, and `tee` is a *background*
    process, so on a fresh install the file it is about to create often does
    not exist yet. The glob then stays unexpanded, `ls` exits 2, pipefail
    hands that to the pipeline and errexit ends the launcher there. Nothing
    was printed because the only two things that print are the tee's own
    buffer and the rows that never ran.

    Measured before the fix: 2 failures in 10 fresh directories, and 30 runs
    in a row into an existing directory without one. After: 30 in a row clean.
    """

    def test_the_log_rotation_cannot_end_the_launcher(self):
        text = START_SH.read_text(encoding="utf-8")
        line = next(
            ln for ln in text.splitlines() if ln.strip().startswith("ls -1t \"$MM_LOG_DIR\"")
        )
        block = text[text.index(line) :]
        end = block.index("\n", block.index("done"))
        assert block[:end].rstrip().endswith("done || true"), block[:end]

    @pytest.mark.parametrize("run", range(6))
    def test_a_brand_new_data_directory_starts_cleanly(self, run, tmp_path):
        """Six fresh directories, because one is not enough to see a race
        that used to fire about one time in eight."""
        data_dir = tmp_path / f"fresh{run}" / "data"
        data_dir.mkdir(parents=True)
        env = dict(os.environ, MEMORYMAP_DATA_DIR=str(data_dir))
        env.pop("MEMORYMAP_PORT", None)
        result = subprocess.run(
            ["./start.sh", "--doctor"],
            cwd=ROOT,
            env=env,
            capture_output=True,
            text=True,
            timeout=180,
        )
        assert result.returncode in (0, 1), (result.returncode, result.stdout, result.stderr)
        assert "MemoryMap AI - checks" in result.stdout, result.stdout


def test_preferences_are_written_one_key_per_line_for_start_bat(tmp_path):
    """start.bat reads the update settings with `findstr` line by line
    (`auto_update_enabled.*false`, `update_channel.*stable`). On a one-line
    JSON file that pattern also matches any *later* key that is false, 34
    keys of which five are false by default, and "updates off" would be
    read for a user who has them on. So the file must keep one key per
    line, which `atomic_write_json`'s indent gives it; this pins that, so a
    change to compact JSON fails here rather than on someone's Windows
    launch (checked 2026-09-23 with a real `git` remote for the .sh side)."""
    from memorymap.core.config import ConfigManager

    config = ConfigManager(data_dir=tmp_path)
    config.set_preference("auto_update_enabled", True)
    config.set_preference("update_channel", "main")
    lines = (tmp_path / "preferences.json").read_text().splitlines()
    enabled = [line for line in lines if '"auto_update_enabled"' in line]
    channel = [line for line in lines if '"update_channel"' in line]
    assert len(enabled) == 1 and "false" not in enabled[0], enabled
    assert len(channel) == 1 and "stable" not in channel[0], channel
