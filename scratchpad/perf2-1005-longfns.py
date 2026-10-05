"""The longest functions in src/ (audit ARCH-22), by AST line span.

    python3 scratchpad/perf2-1005-longfns.py [N]
"""

import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rows = []
for path in (ROOT / "src").rglob("*.py"):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            rows.append((node.end_lineno - node.lineno + 1, f"{path.relative_to(ROOT)}:{node.lineno} {node.name}"))
rows.sort(reverse=True)
n = int(sys.argv[1]) if len(sys.argv) > 1 else 12
for size, where in rows[:n]:
    print(f"{size:5d}  {where}")
print("over 150:", sum(1 for size, _ in rows if size > 150))
