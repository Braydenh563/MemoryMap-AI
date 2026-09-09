"""The README's numbers and names are checked against the code.

The owner: "the readme and related documents keep going stale because you
forget them". A number in the README that the code can compute is asserted
here, so a tool added, a skill added or a version bump fails the build until
the README says the same.
"""

from __future__ import annotations

import re
from pathlib import Path

from memorymap import __version__
from memorymap.ai import skills, tools

ROOT = Path(__file__).resolve().parent.parent
README = (ROOT / "README.md").read_text(encoding="utf-8")


def test_the_tool_count_matches_the_registry() -> None:
    assert f"has {len(tools.TOOLS)} tools" in README, (
        f"README says a different tool count; the registry has {len(tools.TOOLS)}"
    )


def test_the_skill_count_matches_the_built_ins() -> None:
    assert f"{len(skills.BUILTIN_SKILLS)} built-in skills" in README


def test_the_version_matches_the_package() -> None:
    assert f"Version {__version__}." in README


def test_the_mode_names_are_the_current_ones() -> None:
    """Request mode was renamed Agent mode (CHAT batch B); the README kept
    the old name for a day."""
    assert "Request mode" not in README
    assert "Agent mode" in README


def test_the_test_count_claim_is_not_stale_by_an_order() -> None:
    """A rough gate: the README's "N,000+ tests" must be within one thousand
    of the collected count, which the suite knows without running."""
    claim = re.search(r"(\d),000\+ tests", README)
    assert claim, "README should state the test count as N,000+ tests"
    files = list((ROOT / "tests").glob("test_*.py"))
    approx = sum(len(re.findall(r"^\s*def test_", f.read_text(encoding='utf-8'), re.M)) for f in files)
    assert int(claim.group(1)) * 1000 <= approx < (int(claim.group(1)) + 2) * 1000, (
        f"README claims {claim.group(0)}, the tree defines about {approx}"
    )
