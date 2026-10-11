"""Fail a packaging smoke on a traceback in the app's output, except the ones
named in `packaging/benign_tracebacks.txt` (OPEN ledger 293).

The smoke step used to `grep -q Traceback` the whole log, so one benign logged
traceback on a Windows runner (a connection reset by a probe, say) would turn
the build red. A traceback is still a failure by default; a line in the allow
list is a substring that, found anywhere inside one traceback block, makes that
block ignored. Add a line only with the reason beside it.

    python packaging/traceback_check.py LOG [LOG ...] [--allow FILE]

Exit 0 when every traceback is allowed (or none), 1 otherwise; a log that does
not exist is skipped. Standard library only, so it runs before anything is
installed.
"""

from __future__ import annotations

import sys
from pathlib import Path

HEAD = "Traceback (most recent call last):"
DEFAULT_ALLOW = Path(__file__).with_name("benign_tracebacks.txt")


def tracebacks(text: str) -> list[str]:
    """Each traceback block: the head, its indented frames, its last line."""
    found: list[str] = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if lines[i].strip() != HEAD:
            i += 1
            continue
        block = [lines[i]]
        i += 1
        while i < len(lines) and lines[i][:1] in (" ", "\t"):
            block.append(lines[i])
            i += 1
        if i < len(lines) and lines[i].strip() and lines[i].strip() != HEAD:
            block.append(lines[i])
            i += 1
        found.append("\n".join(block))
    return found


def read_allowed(path: Path) -> list[str]:
    """Substrings from the allow list: `#` starts a comment, blanks are skipped."""
    if not path.is_file():
        return []
    allowed = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            allowed.append(line)
    return allowed


def unexpected(text: str, allowed: list[str]) -> list[str]:
    return [block for block in tracebacks(text) if not any(item in block for item in allowed)]


def main(argv: list[str]) -> int:
    allow_path = DEFAULT_ALLOW
    logs: list[str] = []
    args = list(argv)
    while args:
        arg = args.pop(0)
        if arg == "--allow" and args:
            allow_path = Path(args.pop(0))
        else:
            logs.append(arg)
    allowed = read_allowed(allow_path)
    failed = 0
    for log in logs:
        path = Path(log)
        if not path.is_file():
            continue
        for block in unexpected(path.read_text(encoding="utf-8", errors="replace"), allowed):
            print(f"FAIL a traceback in {log}:")
            print("\n".join(block.splitlines()[:60]))
            failed = 1
    return failed


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
