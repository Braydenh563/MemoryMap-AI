"""Top-level functions in src/ that only tests/ name (audit ARCH-21).

    python3 scratchpad/perf2-1005-testonly.py

A name counts as used in production if any src/ file other than its own
definition line names it (a call, a reference, a string in a registry), or
frontend/ names it (a route handler is reached over HTTP, so route functions
are skipped: they carry an @router decorator).
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = {p: p.read_text(encoding="utf-8") for p in (ROOT / "src").rglob("*.py")}
tests = "\n".join(p.read_text(encoding="utf-8") for p in (ROOT / "tests").rglob("*.py"))
all_src = "\n".join(src.values())
rows = []
for path, text in src.items():
    lines = text.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(", line)
        if not m:
            continue
        if i and lines[i - 1].lstrip().startswith("@"):
            continue  # decorated: a route, a fixture, a registered hook
        name = m.group(1)
        if name.startswith("__"):
            continue
        uses = len(re.findall(rf"\b{name}\b", all_src)) - 1
        if uses == 0:
            in_tests = len(re.findall(rf"\b{name}\b", tests))
            end = i + 1
            while end < len(lines) and (not lines[end].strip() or lines[end].startswith((" ", "\t"))):
                end += 1
            rows.append((in_tests, end - i, f"{path.relative_to(ROOT)}:{i + 1} {name}"))
for in_tests, size, where in sorted(rows, key=lambda r: (r[0] == 0, -r[1])):
    print(f"{'tests' if in_tests else 'DEAD '} {size:4d} lines  {where}")
