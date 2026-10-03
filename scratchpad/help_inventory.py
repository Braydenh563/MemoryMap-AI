"""Write scratchpad/help-inventory.md from tests/test_help_coverage.py's FEATURES
(INBOX 448 (1)). Run: PYTHONPATH=src:. python scratchpad/help_inventory.py"""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cov", ROOT / "tests" / "test_help_coverage.py")
cov = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cov)

#: Measured on the branch head before the entries were written.
BEFORE = {
    "quick-note": "shortcuts",
    "ctrl-enter": "notes-controls",
    "mindmap-reorder": "none (the words matched code-files only by accident)",
    "mindmap-duplicate": "none (Ctrl+D matched today's note in shortcuts)",
    "board-tab-walk": "none (\"Tab walks\" matched code-files' snippet stops)",
    "settings-search": "settings-overview",
    "dashboard-menu": "dashboard-controls (not reached by the question)",
    "companion-toggle": "companion",
}
SINCE_0331 = {"connections-column", "citation-preview", "stop-answer", "view-address",
              "reminders-ics", "density-auto", "companion-toggle", "privacy-receipt"}
SINCE_0332 = {"bookmark-link"}

lines = [
    "# Help inventory (INBOX 448 (1))",
    "",
    (
        "Every user-facing feature from CHANGELOG's Unreleased and 0.3.x sections that a person "
        "might need to find, the help entry (`HELP_TOPICS` id) that covered it before this pass, "
        "and the one that covers it now. The checked form is `FEATURES` in "
        "`tests/test_help_coverage.py`: some entry's body must hold the listed words, and the "
        "question must reach that entry in the Guide's top three. Settings, Help lists every "
        "entry (`GET /help/topics`), and its search finds an entry by title, keywords or text."
    ),
    "",
    (
        "Before: 5 of 52 genuinely covered (8 by the words, 3 of those by accident), 4 of 52 "
        "reachable by the question. After: 52 of 52 covered and reachable."
    ),
    "",
    "| Feature | Since | Question a person asks | Before | Now |",
    "| --- | --- | --- | --- | --- |",
]
for feature, words, question in cov.FEATURES:
    since = "0.3.32" if feature in SINCE_0332 else "0.3.31" if feature in SINCE_0331 else "Unreleased"
    now = ", ".join(cov._covering(words))
    lines.append(f"| {feature} | {since} | {question} | {BEFORE.get(feature, 'none')} | {now} |")
lines += [
    "",
    (
        "Existing entries corrected on the way: library-controls named a Links sub-tab (it is "
        "Bookmarks); settings-overview listed four Settings groups (there are six); the old "
        "Settings, Help accordion still taught \"g then a letter\" for the tab chord (it is m), "
        "and is now drawn from the table itself."
    ),
    "",
]
(ROOT / "scratchpad" / "help-inventory.md").write_text("\n".join(lines))
print(len(cov.FEATURES), "features written")
