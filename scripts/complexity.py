"""Cyclomatic complexity and import cycles over `src/memorymap` (WORLD_CLASS_PLAN 26.2, decision 63).

    python scripts/complexity.py            # functions over 15, worst first
    python scripts/complexity.py --cycles   # strongly connected import groups
    python scripts/complexity.py --cycles --lazy   # ... counting imports inside functions
    python scripts/complexity.py --over 30  # a different threshold

Complexity is 1 plus each `if`, `for`, `while`, `except`, conditional
expression, extra `and`/`or` operand, comprehension clause and match case,
not counting nested function bodies (the same definition as
`scratchpad/census/census.py`, so the numbers agree with section 24).
Radon is not vendored, so this is an `ast` walk with no dependency.

Import cycles are taken from module-level imports only (the ones that run at
load); an import inside a function is the project's usual way out of a
cycle and is not counted. `tests/test_complexity.py` ratchets both.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
PKG = SRC / "memorymap"
THRESHOLD = 15


class _Cx(ast.NodeVisitor):
    def __init__(self, root: ast.AST) -> None:
        self.n = 1
        self.root = root

    def generic_visit(self, node: ast.AST) -> None:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)) and node is not self.root:
            return
        if isinstance(node, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.IfExp)):
            self.n += 1
        elif isinstance(node, ast.BoolOp):
            self.n += len(node.values) - 1
        elif isinstance(node, ast.comprehension):
            self.n += 1 + len(node.ifs)
        elif isinstance(node, ast.match_case):
            self.n += 1
        super().generic_visit(node)


def functions(threshold: int = THRESHOLD) -> dict[str, tuple[int, int, int]]:
    """`file::qualname` to (complexity, line, lines) for every function over `threshold`."""
    out: dict[str, tuple[int, int, int]] = {}
    for path in sorted(PKG.rglob("*.py")):
        if "vendor" in path.parts:
            continue
        rel = path.relative_to(ROOT).as_posix()
        tree = ast.parse(path.read_text(encoding="utf-8"))

        def visit(node: ast.AST, scope: str) -> None:
            for child in ast.iter_child_nodes(node):
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    name = f"{scope}.{child.name}" if scope else child.name
                    v = _Cx(child)
                    for part in ast.iter_child_nodes(child):
                        v.visit(part)
                    if v.n > threshold:
                        key = f"{rel}::{name}"
                        n = 2
                        while key in out:  # a redefinition keeps its own row
                            key = f"{rel}::{name}#{n}"
                            n += 1
                        out[key] = (v.n, child.lineno, (child.end_lineno or child.lineno) - child.lineno + 1)
                    visit(child, name)
                elif isinstance(child, ast.ClassDef):
                    visit(child, f"{scope}.{child.name}" if scope else child.name)
                else:
                    visit(child, scope)

        visit(tree, "")
    return out


def _module_name(path: Path) -> str:
    parts = list(path.relative_to(SRC).with_suffix("").parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


def import_graph(lazy: bool = False) -> dict[str, set[str]]:
    """Module to the `memorymap` modules it imports at load; `lazy` adds the ones inside functions."""
    mods = {_module_name(p): p for p in PKG.rglob("*.py") if "vendor" not in p.parts}
    graph: dict[str, set[str]] = {m: set() for m in mods}
    for mod, path in mods.items():
        is_pkg = path.name == "__init__.py"
        tree = ast.parse(path.read_text(encoding="utf-8"))

        def top_level(node: ast.AST):
            for child in ast.iter_child_nodes(node):
                if not lazy and isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
                    continue
                yield child
                yield from top_level(child)

        for node in top_level(tree):
            targets: list[str] = []
            if isinstance(node, ast.Import):
                targets = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                if node.level:
                    base = mod.split(".") if is_pkg else mod.split(".")[:-1]
                    base = base[: len(base) - (node.level - 1)]
                    prefix = ".".join(base + ([node.module] if node.module else []))
                else:
                    prefix = node.module or ""
                targets = [prefix] + [f"{prefix}.{a.name}" for a in node.names]
            for t in targets:
                if t in mods and t != mod:
                    graph[mod].add(t)
    return graph


def cycles(lazy: bool = False) -> list[list[str]]:
    """Strongly connected groups of more than one module (Tarjan, iterative)."""
    graph = import_graph(lazy)
    index: dict[str, int] = {}
    low: dict[str, int] = {}
    on: set[str] = set()
    stack: list[str] = []
    groups: list[list[str]] = []
    counter = 0
    for root in graph:
        if root in index:
            continue
        work = [(root, iter(sorted(graph[root])))]
        index[root] = low[root] = counter
        counter += 1
        stack.append(root)
        on.add(root)
        while work:
            node, it = work[-1]
            advanced = False
            for nxt in it:
                if nxt not in index:
                    index[nxt] = low[nxt] = counter
                    counter += 1
                    stack.append(nxt)
                    on.add(nxt)
                    work.append((nxt, iter(sorted(graph[nxt]))))
                    advanced = True
                    break
                if nxt in on:
                    low[node] = min(low[node], index[nxt])
            if advanced:
                continue
            work.pop()
            if work:
                low[work[-1][0]] = min(low[work[-1][0]], low[node])
            if low[node] == index[node]:
                group = []
                while True:
                    w = stack.pop()
                    on.discard(w)
                    group.append(w)
                    if w == node:
                        break
                if len(group) > 1:
                    groups.append(sorted(group))
    return sorted(groups, key=lambda g: -len(g))


def main(argv: list[str]) -> None:
    if "--cycles" in argv:
        for g in cycles("--lazy" in argv):
            print(f"{len(g)} modules: {', '.join(g)}")
        return
    over = int(argv[argv.index("--over") + 1]) if "--over" in argv else THRESHOLD
    rows = sorted(functions(over).items(), key=lambda kv: -kv[1][0])
    print(f"{len(rows)} functions over {over}")
    for key, (cx, line, size) in rows:
        print(f"{cx:4d}  {size:4d} lines  {key} (line {line})")


if __name__ == "__main__":
    main(sys.argv[1:])
