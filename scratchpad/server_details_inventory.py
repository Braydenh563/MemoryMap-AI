"""Inventory every user-facing `detail` string in src/memorymap/api/*.py.

Prints a markdown table (file:line, status, keep/rewrite, text), using the
same collector and rules as tests/test_server_detail_wording.py:

    .venv/bin/python scratchpad/server_details_inventory.py [api dir] > scratchpad/server-details-472.md

Pass the api directory of an older checkout to inventory what a tree said
before a rewrite.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))
import test_server_detail_wording as w  # noqa: E402

api = Path(sys.argv[1]) if len(sys.argv) > 1 else w.API
rows = w.collect(computed=True, api=api)
bad = {(f, ln): why for f, ln, _t, why in w.violations(rows)}
computed = [r for r in rows if r[2].startswith("<computed>")]
literal = [r for r in rows if not r[2].startswith("<computed>")]
print("# Server detail strings (INBOX 472)\n")
print(f"{len(literal)} literals, {sum(1 for r in literal if (r[0], r[1]) in bad)} to rewrite; "
      f"{len(computed)} computed at run time (read by hand).\n")
print("| where | status | verdict | text |\n| --- | --- | --- | --- |")
for f, ln, text, status in rows:
    if text.startswith("<computed>"):
        verdict = "computed"
    else:
        verdict = "rewrite: " + bad[(f, ln)] if (f, ln) in bad else "keep"
    print(f"| {f}:{ln} | {status} | {verdict} | {text!r} |")
