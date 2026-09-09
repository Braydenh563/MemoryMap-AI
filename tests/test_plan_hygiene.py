"""A plan holds open work only; what is built lives in HISTORY.md.

The owner, after the fourth time: "you, opus and sonnet have just marked
things as built in the roadmap and not actually moved them to history.md
... if they are fully built, they should not take up room where new
features, fixes and refinements should be." CLAUDE.md standing order 10.
"""

from __future__ import annotations

import re
from pathlib import Path

ROADMAP = Path(__file__).resolve().parent.parent / "docs" / "roadmap"
PLANS = sorted(ROADMAP.glob("*_PLAN.md")) + [ROADMAP / "AGENT_SKILLS_REFORM.md"]


def test_no_plan_carries_a_built_block() -> None:
    offenders = []
    for plan in PLANS:
        for line in plan.read_text(encoding="utf-8").splitlines():
            if re.match(r"^#{2,3} (\d+\. )?Built\b", line):
                body = plan.read_text(encoding="utf-8")
                after = body.split(line, 1)[1][:300]
                if "Moved to HISTORY.md" not in after:
                    offenders.append(f"{plan.name}: {line}")
    assert offenders == [], (
        "move these blocks whole into HISTORY.md ('Moved from the plans') and leave "
        "the one-line pointer: " + "; ".join(offenders)
    )


def test_handover_is_the_current_state_only() -> None:
    lines = (ROADMAP / "HANDOVER.md").read_text(encoding="utf-8").count("\n")
    assert lines < 600, f"HANDOVER.md is {lines} lines; append the session record to HISTORY.md"


def test_inbox_holds_open_reports_only() -> None:
    """A resolved report (fixed, not reproduced, checked) moves to HISTORY.md's
    "INBOX resolved" with its number; INBOX is what is still open."""
    text = (ROADMAP / "INBOX.md").read_text(encoding="utf-8")
    resolved = [
        line for line in text.splitlines()
        if re.match(r"^\d+\. \*\*\(?(fixed|Fixed|Not reproduced|checked|Checked|Done|done)", line)
    ]
    assert resolved == [], "move these to HISTORY.md, INBOX resolved: " + "; ".join(r[:60] for r in resolved)


def test_inbox_is_a_tray_not_a_backlog() -> None:
    """Under twenty open items: anything older is placed in its plan."""
    text = (ROADMAP / "INBOX.md").read_text(encoding="utf-8")
    count = len(re.findall(r"(?m)^\d+\. \*\*", text))
    assert count < 20, f"INBOX has {count} items; place the rest in their plans (Placed from INBOX)"
