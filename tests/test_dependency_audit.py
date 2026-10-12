"""The dependency audit is a CI job and nothing more (house2 row 1588).

pip-audit reads advisory databases over the network, so it runs on the CI
runner (`.github/workflows/dependency-audit.yml`) and never in the app,
which stays offline. Non-blocking at first: `continue-on-error` until a
clean run is the normal one.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FLOW = ROOT / ".github" / "workflows" / "dependency-audit.yml"


def test_the_audit_installs_what_ci_installs_and_runs_pip_audit() -> None:
    flow = FLOW.read_text(encoding="utf-8")
    assert "pip install -r requirements.txt" in flow
    assert "pip-audit --progress-spinner off" in flow
    assert '"requirements*.txt"' in flow, "a change to the pins no longer runs the audit"
    assert "cron:" in flow, "the weekly run is gone, so a new advisory on an old pin goes unseen"


def test_the_audit_does_not_block_yet_and_writes_nothing() -> None:
    flow = FLOW.read_text(encoding="utf-8")
    assert "continue-on-error: true" in flow
    permissions = flow.split("permissions:", 1)[1].split("jobs:", 1)[0]
    assert "contents: read" in permissions and "write" not in permissions


def test_the_app_never_reaches_for_an_advisory_database() -> None:
    for path in (ROOT / "src" / "tessellate").rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        assert "pip_audit" not in text and "pip-audit" not in text, f"{path} reaches for pip-audit"
