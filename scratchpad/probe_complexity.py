"""Which functions carry the app's complexity, in lines and in branches.

The audit's A5 row was written from this scan (`run_agent` 831 lines and 71
branches, `_run_skill` 682 and 66, `chat_stream` 424 and 46, `graph` 355 and
45, `timeline` 346 and 42), and a split is only worth committing if the same
scan says the number moved. So it lives here rather than in a session's
scrollback: the before and the after have to come from the same ruler.

    python scratchpad/probe_complexity.py             # the top 15
    python scratchpad/probe_complexity.py run_agent   # just these, by name

**Lines** are the function's own span (`end_lineno - lineno + 1`), docstring
and comments included, because what makes a function hard to hold in the head
is how far you scroll, not how many statements survive a minifier.

**Branches** counts the decision points inside the function *excluding nested
function bodies*: `if`, `for`, `while`, each `except`, each `with` item, each
boolean operator past the first, each comprehension `if`, and each `if`/`else`
expression. A nested helper is a thing you can read on its own, which is
precisely what the split produces, so counting its branches against its parent
would make every split look like a no-op.
"""

from __future__ import annotations

import ast
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "memorymap"


def _branches(node: ast.AST) -> int:
    """Decision points in this function, not counting nested functions."""
    count = 0
    stack = list(ast.iter_child_nodes(node))
    while stack:
        child = stack.pop()
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            continue  # its own function; scanned separately
        if isinstance(child, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.IfExp)):
            count += 1
        elif isinstance(child, ast.ExceptHandler):
            count += 1
        elif isinstance(child, (ast.With, ast.AsyncWith)):
            count += len(child.items)
        elif isinstance(child, ast.BoolOp):
            count += len(child.values) - 1
        elif isinstance(child, ast.comprehension):
            count += 1 + len(child.ifs)
        elif isinstance(child, ast.Assert):
            count += 1
        stack.extend(ast.iter_child_nodes(child))
    return count


def scan() -> list[tuple[int, int, str, str]]:
    rows: list[tuple[int, int, str, str]] = []
    for path in sorted(SRC.rglob("*.py")):
        try:
            tree = ast.parse(path.read_text(encoding="utf-8"))
        except SyntaxError:  # pragma: no cover - a file mid-edit
            continue
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            end = getattr(node, "end_lineno", node.lineno)
            rows.append(
                (
                    end - node.lineno + 1,
                    _branches(node),
                    node.name,
                    str(path.relative_to(ROOT)),
                )
            )
    rows.sort(reverse=True)
    return rows


def main(argv: list[str]) -> int:
    wanted = set(argv[1:])
    rows = scan()
    if wanted:
        rows = [row for row in rows if row[2] in wanted]
    else:
        rows = rows[:15]
    for lines, branches, name, path in rows:
        print(f"{lines:5d} lines {branches:4d} branches  {name}  ({path})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
