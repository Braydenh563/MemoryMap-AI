"""List the `typeof x === "function"` guards that guard nothing.

    PYTHONPATH=src:. .venv/bin/python scratchpad/perf2-1005-guards.py

A guard on a name that is a boot file's own function, or an app.js stand-in
(LAZY_ENTRY_POINTS), is always true at run time: the ratchet in
tests/test_global_scope_ratchet.py counts it all the same.
"""

import re
from collections import Counter
from pathlib import Path

from memorymap.api.asset_strip import strip_js
from tests._app_js import app_js_files

JS = Path(__file__).resolve().parents[1] / "frontend" / "js"
code = {p.name: strip_js(p.read_text(encoding="utf-8")) for p in sorted(JS.glob("*.js"))}
boot = {p.name for p in app_js_files()}
app = code["app.js"]
table = app[app.index("const LAZY_ENTRY_POINTS") :]
table = table[: table.index("\n};")]
stand_ins = set(re.findall(r'"([A-Za-z_$][\w$]*)"', table))
defined: dict[str, str] = {}
for name, text in code.items():
    for fn in re.findall(r"^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)", text, re.M):
        defined.setdefault(fn, name)
guards: Counter = Counter()
where: dict[str, Counter] = {}
for name, text in code.items():
    for m in re.finditer(r'typeof\s+([A-Za-z_$][\w$]*)\s*===?\s*"function"', text):
        guards[m.group(1)] += 1
        where.setdefault(m.group(1), Counter())[name] += 1
print("total", sum(guards.values()))
idle = [(k, v) for k, v in guards.items() if k in stand_ins or defined.get(k) in boot]
print("always true", sum(v for _, v in idle))
for k, v in sorted(idle, key=lambda r: -r[1]):
    print(v, k, "stand-in" if k in stand_ins else defined.get(k), dict(where[k]))
lets = Counter()
for name, text in code.items():
    lets[name] = len(re.findall(r"^(?:let|var)\s", text, re.M))
print("lets", sum(lets.values()), lets.most_common(12))
