"""A function's top-level statements with their line spans, to find blocks to lift.

    python3 scratchpad/perf2-1005-fnshape.py src/memorymap/ai/agent.py _dispatch_call
"""

import ast
import sys
from pathlib import Path

path, name = Path(sys.argv[1]), sys.argv[2]
text = path.read_text(encoding="utf-8")
lines = text.splitlines()
tree = ast.parse(text)
for node in ast.walk(tree):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
        for stmt in node.body:
            span = stmt.end_lineno - stmt.lineno + 1
            head = lines[stmt.lineno - 1].strip()[:90]
            print(f"{stmt.lineno:5d} {span:4d}  {head}")
            if isinstance(stmt, (ast.If, ast.For, ast.While, ast.With, ast.Try)) and span > 40:
                for inner in getattr(stmt, "body", []):
                    s2 = inner.end_lineno - inner.lineno + 1
                    if s2 > 15:
                        print(f"      {inner.lineno:5d} {s2:4d}    {lines[inner.lineno - 1].strip()[:80]}")
        break
