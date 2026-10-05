"""Add one line under [Unreleased] / ### Changed in both changelogs.

    python3 scratchpad/changelog_add.py "Agent: ..."
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
line = "- " + sys.argv[1].strip() + "\n"
for name in ("CHANGELOG.md", "docs/CHANGELOG.md"):
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    # The first "### Changed" after "## [Unreleased]" (other headings, such as
    # Security, may come first), with or without a blank line under it.
    head = text.index("## [Unreleased]")
    match = re.compile(r"### Changed\n\n?").search(text, head)
    if not match:
        raise SystemExit(f"{name}: no Unreleased/Changed heading")
    path.write_text(text[: match.end()] + line + text[match.end():], encoding="utf-8")
    print("added to", name)
