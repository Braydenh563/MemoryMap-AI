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
