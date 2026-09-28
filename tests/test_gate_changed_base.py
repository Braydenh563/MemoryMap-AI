"""What `scripts/gate.sh --changed` compares against (OPEN.md, 0.3.3).

On a long branch the gate used to diff against `origin/main` (the fallback
for a worktree with no upstream), which is the whole branch: 338 test files
selected, forty minutes and more for a "targeted" run, so standing order 5a's
per-step gate was the full suite in disguise. The base is now, in order:

1. `GATE_BASE`, when set (so `GATE_BASE=origin/main` still reaches the old
   comparison on purpose);
2. the merge-base with the branch's upstream, when it has one;
3. the last pushed commit: the parent of the oldest commit on this branch
   that no remote branch has, which is where "what I have not pushed yet"
   starts, and what an agent worktree cut from a pushed branch wants;
4. `HEAD~1`, when nothing is on a remote at all.

Each case is built in a scratch repository with a bare remote, and the
function is run out of the script itself, so the test reads what the gate
runs.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
GATE = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")


def _function() -> str:
    match = re.search(r"(?ms)^changed_base\(\) \{.*?^\}", GATE)
    assert match, "gate.sh has no changed_base()"
    return match.group(0)


def _git(repo: Path, *args: str) -> str:
    env = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t",
           "GIT_COMMITTER_EMAIL": "t@t", "GIT_CONFIG_NOSYSTEM": "1", "HOME": str(repo.parent)}
    out = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, env=env, check=True)
    return out.stdout.strip()


def _commit(repo: Path, name: str) -> str:
    (repo / name).write_text(name, encoding="utf-8")
    _git(repo, "add", name)
    _git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", name)
    return _git(repo, "rev-parse", "HEAD")


def _base(repo: Path, gate_base: str | None = None) -> str:
    env = {k: v for k, v in os.environ.items() if k != "GATE_BASE"}
    if gate_base is not None:
        env["GATE_BASE"] = gate_base
    script = _function() + "\ncd \"$1\" && git rev-parse \"$(changed_base 2>/dev/null)\"\n"
    out = subprocess.run(["bash", "-c", script, "gate", str(repo)], capture_output=True, text=True, env=env, check=True)
    return out.stdout.strip()


@pytest.fixture
def repo(tmp_path: Path) -> tuple[Path, dict[str, str]]:
    if not shutil.which("git"):  # pragma: no cover - git is in the sandbox and in CI
        pytest.skip("git is not available")
    remote = tmp_path / "remote.git"
    subprocess.run(["git", "init", "-q", "--bare", str(remote)], check=True)
    work = tmp_path / "work"
    work.mkdir()
    _git(work, "init", "-q", "-b", "main")
    commits = {"a": _commit(work, "a"), "b": _commit(work, "b")}
    _git(work, "remote", "add", "origin", str(remote))
    _git(work, "push", "-q", "origin", "main")
    _git(work, "checkout", "-q", "-b", "agent")  # cut from main, tracks nothing
    commits["c"] = _commit(work, "c")
    commits["d"] = _commit(work, "d")
    return work, commits


def test_an_agent_branch_compares_against_the_last_pushed_commit(repo) -> None:
    work, commits = repo
    assert _base(work) == commits["b"]


def test_gate_base_still_wins(repo) -> None:
    work, commits = repo
    assert _base(work, commits["a"]) == commits["a"]


def test_a_tracking_branch_compares_against_its_merge_base(repo) -> None:
    work, commits = repo
    _git(work, "push", "-q", "-u", "origin", "agent")
    commits["e"] = _commit(work, "e")
    assert _base(work) == commits["d"]


def test_nothing_pushed_falls_back_to_the_previous_commit(tmp_path: Path) -> None:
    if not shutil.which("git"):  # pragma: no cover
        pytest.skip("git is not available")
    work = tmp_path / "alone"
    work.mkdir()
    _git(work, "init", "-q", "-b", "main")
    first = _commit(work, "one")
    _commit(work, "two")
    assert _base(work) == first


def test_origin_main_is_no_longer_a_silent_fallback() -> None:
    body = _function()
    assert "for candidate in" not in body, "the old origin/main walk is back"
    assert "changed_base" in GATE[GATE.index("changed_tests() {") :], "changed_tests does not use changed_base"
