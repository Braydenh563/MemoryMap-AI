"""The scratchpad pile cannot grow back unnoticed.

scratchpad/ once held 1,394 of the repo's 3,008 tracked files (one-off sweeps
whose findings were already in CHANGELOG, their PNG outputs, old seed
scripts). The cleanup left 963; this caps the tracked count at that plus 40.
When it fails, run `python scratchpad/cleanup_inventory.py --list`, delete
what it marks DELETE (scratchpad/README.md says how), and only then think
about the cap. Never raise it to make a sweep fit.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLEANED_COUNT = 963
CAP = CLEANED_COUNT + 40


def test_tracked_scratchpad_files_stay_under_the_cap():
    out = subprocess.run(
        ["git", "ls-files", "scratchpad"], cwd=ROOT, capture_output=True, text=True, check=False
    )
    if out.returncode != 0:  # a source tarball with no .git has nothing to count
        return
    count = len([line for line in out.stdout.splitlines() if line])
    assert count <= CAP, (
        f"{count} tracked files under scratchpad/ (cap {CAP}). Delete one-off sweeps "
        "and outputs whose finding is in CHANGELOG: scratchpad/README.md, "
        "python scratchpad/cleanup_inventory.py --list"
    )
