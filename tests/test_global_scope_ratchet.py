"""The frontend's one global scope, counted (audit 2026-10-05, FE-17).

Every script shares one scope (CLAUDE.md section 7: app.js is 25 files and
the lazy bundles join them), so a call across files is a call to a global,
and a call into a bundle that may not be loaded yet is guarded with
`typeof name === "function"`. The audit counted 3,950 top-level functions,
700 top-level `let`/`var` and 371 guards, with no duplicate function names.
Nothing is wrong with any one of them; the numbers are the coupling, and
nothing watched them. These are ratchets: they may only go down, or move
with a reason written here.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

from memorymap.api.asset_strip import strip_js

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"

#: 2026-10-05 (comments excluded; worker files included, they are few).
#: Set on the frontend branch alone (371 and 706), then measured on the merged
#: tree the same day, 2026-10-05: six branches written in parallel added lazy
#: bundles and their guards without knowing this ratchet existed. These are
#: that tree's exact counts; they only go down (the perf2 follow-up owns it).
GUARDS_CAP = 368
TOP_LEVEL_LETS_CAP = 718


def _code() -> dict[str, str]:
    return {p.name: strip_js(p.read_text(encoding="utf-8")) for p in sorted(JS.glob("*.js"))}


def test_cross_file_guards_only_go_down():
    count = sum(
        len(re.findall(r'typeof\s+[A-Za-z_$][\w$]*\s*===?\s*"function"', code))
        for code in _code().values()
    )
    assert count <= GUARDS_CAP, (
        f"{count} `typeof x === \"function\"` guards (cap {GUARDS_CAP}): a call across "
        "files that needs one is a lazy bundle's entry point; name it in app.js's "
        "stand-ins rather than guarding at each caller"
    )


def test_top_level_mutable_state_only_goes_down():
    count = sum(len(re.findall(r"^(?:let|var)\s", code, re.M)) for code in _code().values())
    assert count <= TOP_LEVEL_LETS_CAP, f"{count} top-level let/var (cap {TOP_LEVEL_LETS_CAP})"


def test_no_two_files_define_the_same_function():
    names: Counter = Counter()
    for name, code in _code().items():
        if name.endswith("-worker.js"):
            continue  # a worker has its own scope
        names.update(re.findall(r"^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)", code, re.M))
    twice = sorted(n for n, c in names.items() if c > 1)
    assert not twice, f"defined twice in the one global scope: {twice}"
