"""Add one line under the first `### <section>` of [Unreleased] in both changelogs.

    python3 scratchpad/perf2-1005-changelog.py Fixed "Chat: ..."
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
section, line = sys.argv[1], "- " + sys.argv[2].strip() + "\n"
for name in ("CHANGELOG.md", "docs/CHANGELOG.md"):
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    start = text.index("## [Unreleased]")
    anchor = f"### {section}\n\n"
    at = text.index(anchor, start) + len(anchor)
    path.write_text(text[:at] + line + text[at:], encoding="utf-8")
