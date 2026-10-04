"""Add one line under [Unreleased] / ### Changed in both changelogs.

    python3 scratchpad/changelog_add.py "Agent: ..."
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
line = "- " + sys.argv[1].strip() + "\n"
for name in ("CHANGELOG.md", "docs/CHANGELOG.md"):
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    anchor = "## [Unreleased]\n\n### Changed\n\n"
    if anchor not in text:
        raise SystemExit(f"{name}: no Unreleased/Changed heading")
    path.write_text(text.replace(anchor, anchor + line, 1), encoding="utf-8")
    print("added to", name)
