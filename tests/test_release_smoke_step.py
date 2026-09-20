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


def test_linux_job_smoke_tests_the_binary_before_packing():
    job = _job("build-linux-package")
    smoke = job.index("Smoke test the frozen app")
    assert 'MemoryMap AI" &' in job[smoke:]
    #: Named "Pack the build" since the Linux download became a tarball as
    #: well as a zip. This test caught the rename, which is what it is for:
    #: the assertion is that the smoke test runs *before* whatever packages
    #: the thing, and a step it cannot find is a step it cannot order.
    assert smoke < job.index("Pack the build")


def test_the_linux_package_ships_a_tarball_as_well_as_a_zip():
    """A zip does not reliably carry the executable bit on Linux.

    Measured on a 755 file: `unzip` restores 755, Python's
    `zipfile.extractall` gives 644, and `tar` gives 755 either way. A 644
    launcher is a download that cannot be started, with nothing on screen
    saying why, so the tarball is the one that has to exist.
    """
    job = _job("build-linux-package")
    pack = job[job.index("Pack the build") :]
    assert "tar -czf" in pack and "linux-x86_64.tar.gz" in pack, (
        "the Linux package must include a tarball: a zip loses the executable "
        "bit for several common extractors"
    )
    assert "linux-x86_64.zip" in pack


def test_the_smoke_step_fails_loudly_and_shows_the_log():
    assert WORKFLOW.count("exit 1") >= 2
    assert "desktop-stdio.log" in WORKFLOW
