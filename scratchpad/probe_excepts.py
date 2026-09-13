"""Count the broad excepts in src/memorymap and say which say nothing at all.

WORLD_CLASS_PLAN section 10, F4. The row's `grep` counts every broad handler;
what actually costs something is the subset that catches and then says
nothing, because that is the shape behind "a feature that never ran once".
"""

import ast
import pathlib
import sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "src/memorymap")
broad = 0
sites = []
for f in sorted(root.rglob("*.py")):
    tree = ast.parse(f.read_text())
    for node in ast.walk(tree):
        if not isinstance(node, ast.ExceptHandler):
            continue
        t = node.type
        is_broad = t is None or (isinstance(t, ast.Name) and t.id in {"Exception", "BaseException"})
        if not is_broad:
            continue
        broad += 1
        body = ast.dump(ast.Module(body=node.body, type_ignores=[]))
        talks = any(
            k in body
            for k in ("logger", "logging", "Raise", "log_action", "print", "HTTPException", "_log", "warn")
        )
        if not talks:
            sites.append(f"{f}:{node.lineno}")
print("broad:", broad, "silent:", len(sites))
for s in sites:
    print(" ", s)
