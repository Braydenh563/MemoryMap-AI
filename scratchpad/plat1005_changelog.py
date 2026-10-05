"""Add one line at the top of [Unreleased]'s ### Changed in both changelogs.

    python3 scratchpad/plat1005_changelog.py "API: ..."

`changelog_add.py` expects Changed to be the first heading under Unreleased,
which stops holding once a Security section opens the release.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
line = "- " + sys.argv[1].strip() + "\n"
for name in ("CHANGELOG.md", "docs/CHANGELOG.md"):
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    start = text.index("## [Unreleased]")
    anchor = text.index("### Changed\n\n", start) + len("### Changed\n\n")
    path.write_text(text[:anchor] + line + text[anchor:], encoding="utf-8")
    print("added to", name)
