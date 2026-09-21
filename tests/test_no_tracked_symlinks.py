"""No tracked symlink may point outside the repository.

This exists because one did, and it destroyed the working environment.

An agent building in a git worktree wants a `.venv` there, and the cheap way
to get one is a symlink to the main checkout's. That is correct inside the
worktree. What is not correct is committing it: `.gitignore` listed `.venv/`
with a trailing slash, which matches a directory and not a symlink of the
same name, so `git add -A` swept it in. In the main checkout the committed
target resolves to the very path the link occupies, so checking the commit
out replaced the real environment with a link to itself, and every path
under it failed with "too many levels of symbolic links". No `pyvenv.cfg`
survived anywhere and the environment had to be rebuilt from CLAUDE.md
section 7's install line.

A relative symlink inside the tree is fine and stays fine: it means the same
thing in every clone. An absolute one means whatever happens to sit at that
path on the machine doing the checkout, which is a property of the machine
and not of the repository.
"""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _tracked_symlinks() -> list[tuple[str, str]]:
    """(path, target) for every symlink git has under version control."""
    listing = subprocess.run(
        ["git", "ls-files", "-s"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    found = []
    for line in listing.splitlines():
        if not line.startswith("120000"):
            continue
        path = line.split("\t", 1)[1]
        target = subprocess.run(
            ["git", "cat-file", "-p", f":{path}"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        found.append((path, target))
    return found


def test_no_tracked_symlink_points_at_an_absolute_path():
    absolute = [
        f"{path} -> {target}" for path, target in _tracked_symlinks() if target.startswith("/")
    ]
    assert absolute == [], (
        "a committed symlink names an absolute path, so what it resolves to "
        "is a property of the machine checking it out rather than of this "
        "repository: " + "; ".join(absolute)
    )


def test_the_environment_is_not_tracked():
    """Belt as well as braces: `.venv` in any form stays out of the history."""
    tracked = subprocess.run(
        ["git", "ls-files", ".venv", ".venv/"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.split()
    assert tracked == [], (
        "the virtual environment is tracked: " + ", ".join(tracked)
    )


def test_gitignore_covers_the_environment_as_a_link_as_well_as_a_folder():
    """`.venv/` alone does not match a symlink named `.venv`, which is how
    this got in. Both spellings, so neither shape can be added by accident."""
    lines = {
        line.strip()
        for line in (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines()
    }
    assert ".venv/" in lines and ".venv" in lines, (
        "`.gitignore` needs both `.venv/` and `.venv`: the first matches the "
        "directory, the second a symlink standing where it would be"
    )
