#!/usr/bin/env python3
"""Codebase census (Brief 45 part 1): numbers only, stdlib only.

    python scratchpad/census/census.py [--section N] [--full] [--markdown]

Prints the tables that WORLD_CLASS_PLAN "## 24. Codebase census" holds, so a
later run can be diffed against it. Sections: 1 size and complexity, 2
duplicated blocks, 3 dead-code candidates, 4 coupling of the classic
scripts, 5 counts (markers, largest files, untested routes, unused CSS
selectors, ids). Section 6 (console errors) is scratchpad/ui-sweeps/errors.js
and is not run from here.

Limits, stated once because every number below inherits them:
- JS is not parsed. A scanner blanks strings, comments, template text and
  regex literals (a heuristic on the previous token), then finds named
  functions (`function f(`, `f = function(`, `f = (..) =>`/`async`) and
  brace-matches the body. Object-method shorthand, class methods and
  arrow functions with an expression body are not functions here; their
  tokens count toward the enclosing named function. Anonymous callbacks
  likewise. Complexity counts if/for/while/case/catch/&&/||/?: tokens,
  excluding the bodies of nested named functions. `?:` is any `?` not
  followed by `.` or `?` and not preceded by `?`.
- Python complexity is 1 plus If, For, AsyncFor, While, each except handler,
  each extra BoolOp value, each comprehension `for` and `if`, each match
  case, IfExp, excluding nested function bodies.
- Names are matched as identifier tokens across the corpus, so a name that
  is built at run time ("on" + name) looks unused.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src" / "memorymap"
JS_DIR = ROOT / "frontend" / "js"
CSS_DIR = ROOT / "frontend" / "css"
INDEX = ROOT / "frontend" / "index.html"
TESTS = ROOT / "tests"


def read(p: Path) -> str:
    with open(p, encoding="utf-8", errors="replace") as fh:
        return fh.read()


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT))


def py_files() -> list[Path]:
    return sorted(p for p in SRC.rglob("*.py") if "vendor" not in p.parts and "__pycache__" not in p.parts)


def js_files() -> list[Path]:
    return sorted(JS_DIR.glob("*.js"))


def classic_scripts() -> list[str]:
    """The 27 classic scripts: /js/app.js through /js/agent-activity.js in index.html order."""
    names = re.findall(r'<script src="/js/([\w.-]+\.js)', read(INDEX), re.IGNORECASE)
    start = names.index("app.js")
    end = names.index("agent-activity.js")
    return names[start : end + 1]


# ---------------------------------------------------------------- JS scanner

_REGEX_PREV = set("(,=:[!&|?{};+-*%<>~^")
_KEYWORD_BEFORE_REGEX = {"return", "typeof", "case", "in", "of", "delete", "void", "throw", "else", "do"}


def blank_js(src: str) -> str:
    """Return src with comments, strings, template text and regexes replaced by spaces.

    Newlines and offsets are preserved so line numbers still match. Template
    `${...}` expressions are kept as code.
    """
    out = list(src)
    n = len(src)
    i = 0
    stack: list[str] = []  # "tpl" entries mark where a `${` opened inside a template
    brace_depth_in_tpl: list[int] = []
    last_sig = ""  # last significant char
    last_word = ""

    def blank(a: int, b: int) -> None:
        for k in range(a, b):
            if out[k] != "\n":
                out[k] = " "

    while i < n:
        c = src[i]
        nx = src[i + 1] if i + 1 < n else ""
        if c == "/" and nx == "/":
            j = src.find("\n", i)
            j = n if j < 0 else j
            blank(i, j)
            i = j
            continue
        if c == "/" and nx == "*":
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            blank(i, j)
            i = j
            continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c and src[j] != "\n":
                j += 2 if src[j] == "\\" else 1
            blank(i, min(j + 1, n))
            i = j + 1
            last_sig = '"'
            last_word = ""
            continue
        if c == "`":
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "`":
                    break
                if src[j] == "$" and j + 1 < n and src[j + 1] == "{":
                    break
                j += 1
            if j < n and src[j] == "$":
                blank(i, j + 2)
                stack.append("tpl")
                brace_depth_in_tpl.append(0)
                i = j + 2
                last_sig = "{"
                last_word = ""
                continue
            blank(i, min(j + 1, n))
            i = j + 1
            last_sig = '"'
            last_word = ""
            continue
        if c == "}" and stack and brace_depth_in_tpl[-1] == 0:
            # end of a `${ }`: resume the template text
            stack.pop()
            brace_depth_in_tpl.pop()
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "`":
                    break
                if src[j] == "$" and j + 1 < n and src[j + 1] == "{":
                    break
                j += 1
            if j < n and src[j] == "$":
                blank(i, j + 2)
                stack.append("tpl")
                brace_depth_in_tpl.append(0)
                i = j + 2
                last_sig = "{"
                continue
            blank(i, min(j + 1, n))
            i = j + 1
            last_sig = '"'
            continue
        if c == "{" and stack:
            brace_depth_in_tpl[-1] += 1
        elif c == "}" and stack:
            brace_depth_in_tpl[-1] -= 1
        if c == "/":
            # regex literal when the previous significant token cannot end an operand
            if last_sig == "" or last_sig in _REGEX_PREV or last_word in _KEYWORD_BEFORE_REGEX:
                j = i + 1
                in_class = False
                while j < n and src[j] != "\n":
                    ch = src[j]
                    if ch == "\\":
                        j += 2
                        continue
                    if ch == "[":
                        in_class = True
                    elif ch == "]":
                        in_class = False
                    elif ch == "/" and not in_class:
                        break
                    j += 1
                if j < n and src[j] == "/":
                    j += 1
                    while j < n and (src[j].isalpha()):
                        j += 1
                    blank(i, j)
                    i = j
                    last_sig = '"'
                    last_word = ""
                    continue
        if not c.isspace():
            last_sig = c
            if c.isalnum() or c in "_$":
                j = i
                while j < n and (src[j].isalnum() or src[j] in "_$"):
                    j += 1
                last_word = src[i:j]
                last_sig = "a"
                i = j
                continue
            last_word = ""
        i += 1
    return "".join(out)


_FN_PATTERNS = [
    re.compile(r"\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\("),
    re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b"),
    re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{"),
    re.compile(r"(?:^|[;{}\s])([A-Za-z_$][\w$.]*)\s*=\s*(?:async\s+)?function\b"),
]


def _match_brace(code: str, start: int) -> int:
    depth = 0
    for k in range(start, len(code)):
        ch = code[k]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return k
    return -1


def _paren_end(code: str, start: int) -> int:
    depth = 0
    for k in range(start, len(code)):
        if code[k] == "(":
            depth += 1
        elif code[k] == ")":
            depth -= 1
            if depth == 0:
                return k
    return -1


def js_functions(code: str):
    """Yield (name, start_offset, body_open, body_close) for each named function."""
    seen = set()
    found = []
    for pat in _FN_PATTERNS:
        for m in pat.finditer(code):
            name = m.group(1)
            if pat is _FN_PATTERNS[2]:
                brace = m.end() - 1
            else:
                p = code.find("(", m.end() - 1 if pat is _FN_PATTERNS[0] else m.end())
                if p < 0:
                    continue
                pe = _paren_end(code, p)
                if pe < 0:
                    continue
                brace = code.find("{", pe)
                if brace < 0 or code[pe + 1 : brace].strip():
                    continue
            if brace in seen:
                continue
            end = _match_brace(code, brace)
            if end < 0:
                continue
            seen.add(brace)
            found.append((name, m.start(1), brace, end))
    return sorted(found, key=lambda t: t[2])


_JS_TOKENS = re.compile(r"\bif\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|&&|\|\||(?<!\?)\?(?![?.])")


def js_metrics(path: Path):
    src = read(path)
    code = blank_js(src)
    fns = js_functions(code)
    line_of = lambda off: code.count("\n", 0, off) + 1  # noqa: E731
    rows = []
    for idx, (name, s, b, e) in enumerate(fns):
        # tokens inside nested named functions do not count for the parent
        text = code[b : e + 1]
        sub = [(b2 - b, e2 - b) for (_, _, b2, e2) in fns[idx + 1 :] if b < b2 and e2 < e]
        if sub:
            chars = list(text)
            for a, z in sub:
                for k in range(a, z + 1):
                    chars[k] = " "
            text = "".join(chars)
        cx = 1 + len(_JS_TOKENS.findall(text))
        lines = code.count("\n", b, e) + 1
        rows.append((name, line_of(b), lines, cx))
    total = len(src.splitlines())
    return total, rows, code


# ----------------------------------------------------------- Python metrics

class _Cx(ast.NodeVisitor):
    def __init__(self) -> None:
        self.n = 1

    def generic_visit(self, node):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)) and getattr(self, "_root", None) is not node:
            return
        if isinstance(node, (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler, ast.IfExp)):
            self.n += 1
        elif isinstance(node, ast.BoolOp):
            self.n += len(node.values) - 1
        elif isinstance(node, ast.comprehension):
            self.n += 1 + len(node.ifs)
        elif hasattr(ast, "match_case") and isinstance(node, ast.match_case):
            self.n += 1
        super().generic_visit(node)


def py_metrics(path: Path):
    src = read(path)
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return len(src.splitlines()), []
    rows = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            v = _Cx()
            v._root = node
            for child in ast.iter_child_nodes(node):
                v.visit(child)
            rows.append((node.name, node.lineno, node.end_lineno - node.lineno + 1, v.n))
    return len(src.splitlines()), rows


# ------------------------------------------------------------------ report

def table(headers, rows) -> str:
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for r in rows:
        out.append("| " + " | ".join(str(c) for c in r) + " |")
    return "\n".join(out)


def section1(full: bool) -> str:
    out = []
    allfns = {"python": [], "js": []}
    for lang, files, fn in (("python", py_files(), py_metrics), ("js", js_files(), js_metrics)):
        per_file = []
        for p in files:
            res = fn(p)
            total, rows = res[0], res[1]
            for name, line, ln, cx in rows:
                allfns[lang].append((rel(p), name, line, ln, cx))
            longest = max(rows, key=lambda r: r[2], default=("-", 0, 0, 0))
            over = sum(1 for r in rows if r[2] > 80)
            maxcx = max((r[3] for r in rows), default=0)
            per_file.append((rel(p), total, len(rows), f"{longest[0]} ({longest[2]})", over, maxcx, sum(r[3] for r in rows)))
        per_file.sort(key=lambda r: -r[1])
        out.append(f"### 1.{1 if lang == 'python' else 2} {'Python (src/memorymap, vendor excluded)' if lang == 'python' else 'JavaScript (frontend/js)'}")
        tot_lines = sum(r[1] for r in per_file)
        tot_fns = sum(r[2] for r in per_file)
        out.append(f"{len(per_file)} files, {tot_lines} lines, {tot_fns} functions, {sum(r[4] for r in per_file)} over 80 lines, summed complexity {sum(r[6] for r in per_file)}.\n")
        shown = per_file if full else per_file[:25]
        out.append(table(["file", "lines", "functions", "longest (lines)", "over 80", "max cx", "sum cx"], shown))
        if not full:
            out.append(f"\n(top 25 of {len(per_file)} files by lines; `--full` lists all)")
        out.append("")
    for lang, title in (("python", "1.3 Ten most complex Python functions"), ("js", "1.4 Ten most complex JavaScript functions")):
        rows = sorted(allfns[lang], key=lambda r: -r[4])[:10]
        out.append(f"### {title}")
        out.append(table(["function", "file:line", "lines", "cx"], [(r[1], f"{r[0]}:{r[2]}", r[3], r[4]) for r in rows]))
        out.append("")
    allover = sorted((r for group in allfns.values() for r in group if r[3] > 80), key=lambda r: -r[3])
    out.append("### 1.5 Functions over 80 lines")
    out.append(f"{len(allover)} in total ({sum(1 for r in allover if r[0].endswith('.py'))} Python, {sum(1 for r in allover if r[0].endswith('.js'))} JavaScript). Top 20 by length:\n")
    out.append(table(["function", "file:line", "lines", "cx"], [(r[1], f"{r[0]}:{r[2]}", r[3], r[4]) for r in allover[:20]]))
    return "\n".join(out)


_COMMENT_START = ("//", "#", "/*", "*", "*/")


def normalised(path: Path):
    """Return [(original_line_number, normalised_text)] without blanks and comments."""
    rows = []
    in_doc = False
    for no, line in enumerate(read(path).splitlines(), 1):
        s = line.strip()
        if path.suffix == ".py":
            if in_doc:
                if '"""' in s or "'''" in s:
                    in_doc = False
                continue
            if s.startswith(('"""', "'''")):
                if not (len(s) > 3 and (s.endswith('"""') or s.endswith("'''"))):
                    in_doc = True
                continue
        if not s or s.startswith(_COMMENT_START):
            continue
        rows.append((no, s))
    return rows


def section2(full: bool, K: int = 8) -> str:
    files = py_files() + js_files()
    norm = {rel(p): normalised(p) for p in files}
    groups: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for f, rows in norm.items():
        for i in range(len(rows) - K + 1):
            window = [t for _, t in rows[i : i + K]]
            if len(set(window)) < 4 or sum(len(t) for t in window) < 100:
                continue  # closing-brace runs and stubs are not a copied block
            h = hashlib.sha1("\n".join(window).encode()).hexdigest()
            groups[h].append((f, i))
    dup = {h: locs for h, locs in groups.items() if len(locs) >= 2}
    loc2g = {}
    for h, locs in dup.items():
        for loc in locs:
            loc2g[loc] = h
    # chains: shingle i continues shingle i-1 when the same set of places shifts by one
    blocks = []
    covered = set()
    for h, locs in dup.items():
        first = locs[0]
        prev = loc2g.get((first[0], first[1] - 1))
        is_start = True
        if prev is not None:
            shifted = {(f, i - 1) for f, i in locs}
            if shifted == set(dup[prev]):
                is_start = False
        for f, i in locs:
            for k in range(i, i + K):
                covered.add((f, norm[f][k][0]))
        if not is_start:
            continue
        length = 1
        cur = locs
        while True:
            nxt_loc = (cur[0][0], cur[0][1] + 1)
            nh = loc2g.get(nxt_loc)
            if nh is None or {(f, i + 1) for f, i in cur} != set(dup[nh]):
                break
            cur = dup[nh]
            length += 1
        blocks.append((length + K - 1, locs))
    # coverage in original lines (blank/comment lines between are not counted)
    blocks.sort(key=lambda b: (-b[0], -len(b[1])))
    total_lines = sum(len(r) for r in norm.values())
    out = [
        f"{len(files)} files, {total_lines} normalised lines (blank and comment lines dropped); window {K} lines; "
        f"shingles with fewer than 4 distinct lines or under 100 characters are skipped.",
        f"{len(blocks)} duplicated blocks (groups of 2+ places); {len(covered)} distinct source lines sit inside a duplicated block "
        f"({100 * len(covered) / max(total_lines, 1):.1f}% of normalised lines).\n",
    ]
    rows = []
    for size, locs in (blocks if full else blocks[:30]):
        places = ", ".join(f"{f}:{norm[f][i][0]}" for f, i in locs[:6])
        if len(locs) > 6:
            places += f" (+{len(locs) - 6})"
        rows.append((size, len(locs), places))
    out.append(table(["normalised lines", "places", "file:line"], rows))
    if not full:
        out.append(f"\n(top 30 of {len(blocks)} blocks by size)")
    return "\n".join(out)


# ------------------------------------------------------------ dead code etc.

_IDENT = re.compile(r"[A-Za-z_$][\w$]*")


def corpus_counter(roots=None) -> Counter:
    c: Counter = Counter()
    roots = roots or [ROOT / "frontend", SRC, TESTS]
    for r in roots:
        for p in r.rglob("*"):
            if not p.is_file() or p.suffix not in {".py", ".js", ".html", ".css"}:
                continue
            if "vendor" in p.parts or "node_modules" in p.parts or "__pycache__" in p.parts:
                continue
            c.update(_IDENT.findall(read(p)))
    return c


def section3() -> str:
    c = corpus_counter()
    prod = corpus_counter([ROOT / "frontend", SRC])
    out = ["Corpus: identifier tokens in frontend/ (js, html, css), src/ and tests/, vendor excluded; strings and comments count as uses. A candidate is a name whose only occurrence is its own definition (grep count after the definition, 0). The last column is the count of uses in tests/ alone (a name used only by tests is listed with a non-zero count).\n"]
    # JS: top-level functions of the 27 classic scripts
    js_def = Counter()
    js_rows = []
    for name in classic_scripts():
        p = JS_DIR / name
        code = blank_js(read(p))
        depth = 0
        for m in re.finditer(r"[{}]|^function\s+(?:async\s+)?([A-Za-z_$][\w$]*)|^async\s+function\s+([A-Za-z_$][\w$]*)", code, re.M):
            t = m.group(0)
            if t == "{":
                depth += 1
            elif t == "}":
                depth -= 1
            else:
                nm = m.group(1) or m.group(2)
                if depth == 0:
                    js_def[nm] += 1
                    js_rows.append((nm, name, code.count("\n", 0, m.start()) + 1))
    cands = [(n, f, ln) for n, f, ln in js_rows if prod[n] - js_def[n] <= 0]
    out.append(f"### 3.1 Top-level functions in the 27 classic scripts: {len(js_rows)} defined, {len(cands)} candidates\n")
    out.append(table(["function", "file:line", "uses in tests"], [(n, f"frontend/js/{f}:{ln}", c[n] - prod[n]) for n, f, ln in sorted(cands, key=lambda r: (r[1], r[2]))]) if cands else "(none)")
    # Python: every def
    py_def = Counter()
    py_rows = []
    skipped_routes = 0
    for p in py_files():
        try:
            tree = ast.parse(read(p))
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                py_def[node.name] += 1
                is_route = any(
                    isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and isinstance(d.func.value, ast.Name) and d.func.value.id in {"router", "app", "open_router", "media_router", "capture_router", "mcp"}
                    for d in node.decorator_list
                )
                py_rows.append((node.name, rel(p), node.lineno, is_route or bool(node.decorator_list)))
    pc = []
    for n, f, ln, is_route in py_rows:
        if n.startswith("__") and n.endswith("__"):
            continue
        if n in {"process_bind_param", "process_result_value", "upgrade", "downgrade"}:
            skipped_routes += 1
            continue
        if prod[n] - py_def[n] <= 0:
            if is_route:
                skipped_routes += 1
            else:
                pc.append((n, f, ln))
    out.append(f"\n### 3.2 Python defs in src/memorymap: {len(py_rows)} defined, {len(pc)} candidates (excluded as called by a framework: dunder methods, {skipped_routes} decorated defs such as route handlers and validators, and SQLAlchemy type hooks)\n")
    out.append(table(["def", "file:line", "uses in tests"], [(n, f"{f}:{ln}", c[n] - prod[n]) for n, f, ln in sorted(pc, key=lambda r: (r[1], r[2]))]) if pc else "(none)")
    return "\n".join(out)


# ----------------------------------------------------------------- coupling

_TOP_DECL = re.compile(r"^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)|^window\.([A-Za-z_$][\w$]*)\s*=", re.M)


def depth_at(code: str, off: int, _cache: dict = {}) -> int:
    key = id(code)
    arr = _cache.get(key)
    if arr is None:
        _cache.clear()
        arr = []
        d = 0
        for ch in code:
            arr.append(d)
            if ch == "{":
                d += 1
            elif ch == "}":
                d -= 1
        _cache[key] = arr
    return arr[off]


def section4(full: bool) -> str:
    order = classic_scripts()
    pos = {n: i for i, n in enumerate(order)}
    defs: dict[str, list[str]] = defaultdict(list)  # name -> files defining it
    codes = {}
    depth0 = {}
    for n in order:
        code = blank_js(read(JS_DIR / n))
        codes[n] = code
        # top-level text: everything at brace depth 0 (statements run at load)
        buf = []
        depth = 0
        for ch in code:
            if ch == "{":
                depth += 1
                buf.append(" ")
            elif ch == "}":
                depth -= 1
                buf.append(" ")
            else:
                buf.append(ch if depth == 0 or ch == "\n" else " ")
        depth0[n] = "".join(buf)
        for m in _TOP_DECL.finditer(code):
            # a declaration counts only when it starts its line at brace depth 0
            if code.rfind("\n", 0, m.start()) + 1 != m.start() or depth_at(code, m.start()) != 0:
                continue
            defs[m.group(1) or m.group(2) or m.group(3)].append(n)
    idents = {n: set(_IDENT.findall(codes[n])) for n in order}
    idents0 = {n: set(_IDENT.findall(depth0[n])) for n in order}
    readers: dict[str, set[str]] = defaultdict(set)
    for nm, files in defs.items():
        for n in order:
            if n not in files and nm in idents[n]:
                readers[nm].add(n)
    rows = []
    for n in order:
        mine = [nm for nm, fs in defs.items() if n in fs]
        shared = [nm for nm in mine if readers.get(nm)]
        rf = set()
        for nm in shared:
            rf |= readers[nm]
        rows.append((n, len(mine), len(shared), len(rf)))
    out = [
        f"{len(order)} classic scripts in index.html order ({order[0]} to {order[-1]}); {sum(len(set(v)) for v in defs.values())} top-level names defined "
        f"({len(defs)} distinct); {sum(1 for nm in defs if readers.get(nm))} read by another script.\n",
        "### 4.1 Per script (a name counts as read when another script contains it as an identifier token)\n",
        table(["script", "globals defined", "read elsewhere", "reader scripts"], rows),
        "",
    ]
    # downward references
    down_any = defaultdict(set)  # (reader, definer) -> names
    down_load = defaultdict(set)
    for nm, files in defs.items():
        definer_pos = min(pos[f] for f in files)
        for n in order:
            if n in files or pos[n] >= definer_pos:
                continue
            if nm in idents[n]:
                down_any[(n, min(files, key=lambda f: pos[f]))].add(nm)
            if nm in idents0[n]:
                down_load[(n, min(files, key=lambda f: pos[f]))].add(nm)
    out.append("### 4.2 Downward references (a script naming a global defined only in a later script)\n")
    out.append(
        f"Anywhere in the file (including inside functions, which run later and are legal): {sum(len(v) for v in down_any.values())} names over {len(down_any)} script pairs. "
        f"At brace depth 0 (runs at load; IIFE and object-literal bodies are depth 1 and are not seen): {sum(len(v) for v in down_load.values())} names over {len(down_load)} pairs.\n"
    )
    rows = [(a, b, len(v), ", ".join(sorted(v)[:6]) + (" ..." if len(v) > 6 else "")) for (a, b), v in sorted(down_load.items(), key=lambda kv: -len(kv[1]))]
    out.append("At load (depth 0):\n")
    out.append(table(["script", "defined later in", "names", "examples"], rows) if rows else "(none)")
    rows = [(a, b, len(v)) for (a, b), v in sorted(down_any.items(), key=lambda kv: -len(kv[1]))]
    out.append("\nAnywhere (top 15 pairs by name count):\n" if not full else "\nAnywhere (all pairs):\n")
    out.append(table(["script", "defined later in", "names"], rows if full else rows[:15]) if rows else "(none)")
    # most shared globals
    top = sorted(((nm, len(r)) for nm, r in readers.items()), key=lambda t: -t[1])[:15]
    out.append("\n### 4.3 The fifteen globals read by the most other scripts\n")
    out.append(table(["global", "defined in", "reader scripts"], [(nm, defs[nm][0], k) for nm, k in top]))
    return "\n".join(out)


# ------------------------------------------------------------------- counts

def section5(full: bool) -> str:
    out = []
    # 5.1 markers
    marker = re.compile(r"\b(TODO|FIXME|XXX|HACK)\b")
    by_file: dict[str, Counter] = defaultdict(Counter)
    for base, pats in ((SRC, ("*.py",)), (JS_DIR, ("*.js",)), (CSS_DIR, ("*.css",)), (ROOT / "frontend", ("index.html",))):
        for pat in pats:
            for p in (base.rglob(pat) if base == SRC else base.glob(pat)):
                if "vendor" in p.parts or "__pycache__" in p.parts:
                    continue
                for m in marker.finditer(read(p)):
                    by_file[rel(p)][m.group(1)] += 1
    tot = Counter()
    for c in by_file.values():
        tot.update(c)
    out.append("### 5.1 TODO, FIXME, XXX, HACK (src/memorymap, frontend/js, frontend/css, index.html; vendor excluded)\n")
    out.append(f"Totals: TODO {tot['TODO']}, FIXME {tot['FIXME']}, XXX {tot['XXX']}, HACK {tot['HACK']}.\n")
    if by_file:
        out.append(table(["file", "TODO", "FIXME", "XXX", "HACK"], [(f, c["TODO"], c["FIXME"], c["XXX"], c["HACK"]) for f, c in sorted(by_file.items(), key=lambda kv: -sum(kv[1].values()))]))
    # 5.2 largest files
    out.append("\n### 5.2 Ten largest files by bytes\n")
    for title, files in (
        ("frontend/js", js_files()),
        ("frontend/css", sorted(CSS_DIR.glob("*.css"))),
        ("src/memorymap (vendor excluded)", [p for p in SRC.rglob("*") if p.is_file() and p.suffix == ".py" and "vendor" not in p.parts]),
    ):
        top = sorted(files, key=lambda p: -p.stat().st_size)[:10]
        out.append(f"{title}:\n")
        out.append(table(["file", "bytes", "lines"], [(rel(p), p.stat().st_size, len(read(p).splitlines())) for p in top]))
        out.append("")
    # 5.3 routes with no test naming the path
    tests_text = "\n".join(read(p) for p in sorted(TESTS.rglob("*.py")))
    route_re = re.compile(r"""@(\w+)\.(get|post|put|delete|patch)\(\s*["']([^"']*)["']""")
    prefix_re = re.compile(r"""(\w+)\s*=\s*APIRouter\(([^)]*)\)""")
    prefix_in = re.compile(r"""prefix\s*=\s*["']([^"']*)["']""")
    routes = []
    for p in sorted(SRC.rglob("*.py")):
        if "vendor" in p.parts:
            continue
        text = read(p)
        prefixes = {}
        for m in prefix_re.finditer(text):
            pm = prefix_in.search(m.group(2))
            prefixes[m.group(1)] = pm.group(1) if pm else ""
        for m in route_re.finditer(text):
            if m.group(1) not in prefixes and m.group(1) != "router":
                continue
            path = prefixes.get(m.group(1), "") + m.group(3)
            routes.append((m.group(2).upper(), path or "/", rel(p), text.count("\n", 0, m.start()) + 1))
    untested = []
    for method, path, f, ln in routes:
        pat = "".join("[^\\s\"']*" if seg.startswith("{") else re.escape(seg) for seg in re.split(r"(\{[^}]*\})", path) if seg)
        if not re.search(pat, tests_text):
            untested.append((method, path, f"{f}:{ln}"))
    out.append("### 5.3 Backend routes with no test file naming their path\n")
    out.append(
        f"{len(routes)} routes (`@router.*`-style decorators with the router's own prefix; any `include_router(prefix=...)` is not added). "
        f"{len(untested)} have no path match in tests/: a `{{param}}` segment matches any run of non-space, non-quote characters, so this undercounts untested routes.\n"
    )
    by = Counter(f.split(":")[0] for _, _, f in untested)
    out.append(table(["route file", "untested routes"], by.most_common(15)))
    if full:
        out.append("")
        out.append(table(["method", "path", "file:line"], untested))
    # 5.4 CSS selectors unused
    markup = read(INDEX)
    js_text = "\n".join(read(p) for p in js_files()) + "\n" + read(ROOT / "frontend" / "sw.js")
    used = set(re.findall(r"[A-Za-z_][\w-]*", markup)) | set(re.findall(r"[A-Za-z_][\w-]*", js_text))
    sels: dict[str, set[str]] = defaultdict(set)
    for p in sorted(CSS_DIR.glob("*.css")):
        css = re.sub(r"/\*.*?\*/", " ", read(p), flags=re.S)
        for m in re.finditer(r"([^{}]+)\{", css):
            prelude = m.group(1)
            if prelude.strip().startswith("@"):
                continue
            prelude = re.sub(r"\[[^\]]*\]", " ", prelude)
            prelude = re.sub(r'"[^"]*"|\'[^\']*\'', " ", prelude)
            for k in re.finditer(r"([.#])(-?[A-Za-z_][\w-]*)", prelude):
                sels[k.group(2)].add(f"{p.name}")
    unused = sorted(n for n in sels if n not in used)
    nclass = len(sels)
    out.append("\n### 5.4 CSS class and id names in frontend/css used by no markup or script\n")
    out.append(
        f"{nclass} distinct class or id names in selector preludes; {len(unused)} appear as no token in index.html or frontend/js (names built by string concatenation, "
        f"and classes added by Python-rendered HTML, would be false candidates).\n"
    )
    byfile = Counter()
    for n in unused:
        for f in sels[n]:
            byfile[f] += 1
    out.append(table(["css file", "unused names (a name in two files counts in both)"], byfile.most_common()))
    if full:
        out.append("\n" + ", ".join(unused))
    # 5.5 ids and handlers
    ids = re.findall(r'\bid="([^"]+)"', re.sub(r"<!--.*?-->", "", markup, flags=re.S))
    idset = set(ids)
    all_js = "\n".join(read(JS_DIR / n) for n in classic_scripts()) + "\n" + "\n".join(read(p) for p in js_files() if p.name not in classic_scripts())
    looked = set(re.findall(r'\$\(\s*["\']([\w-]+)["\']\s*\)', all_js)) | set(re.findall(r'getElementById\(\s*["\']([\w-]+)["\']', all_js))
    bound = set(re.findall(r'\$\("([\w-]+)"\)\??\.addEventListener\(\s*"(?:\w+)"', all_js)) | set(re.findall(r'getElementById\("([\w-]+)"\)\??\.addEventListener', all_js))
    alltok = set(re.findall(r"[\w-]+", all_js))
    out.append("\n### 5.5 Frontend ids and handlers\n")
    out.append(
        table(
            ["measure", "count"],
            [
                ("id attributes in index.html", len(ids)),
                ("distinct ids", len(idset)),
                ("ids looked up by $(\"id\") or getElementById in frontend/js", len(looked)),
                ("looked-up ids with no element in index.html (runtime-created or missing)", len(looked - idset)),
                ("ids bound with $(\"id\").addEventListener(\"event\")", len(bound)),
                ("bound ids with no element in index.html", len(bound - idset)),
                ("index.html ids named by no token in frontend/js", len([i for i in idset if i not in alltok])),
            ],
        )
    )
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--section", type=int, choices=[1, 2, 3, 4, 5])
    ap.add_argument("--full", action="store_true", help="list every row instead of the top rows")
    a = ap.parse_args()
    fns = {1: lambda: section1(a.full), 2: lambda: section2(a.full), 3: section3, 4: lambda: section4(a.full), 5: lambda: section5(a.full)}
    titles = {1: "## 24.1 Size and complexity", 2: "## 24.2 Duplicated blocks", 3: "## 24.3 Dead-code candidates", 4: "## 24.4 Coupling of the classic scripts", 5: "## 24.5 Counts"}
    for k in ([a.section] if a.section else [1, 2, 3, 4, 5]):
        print(titles[k] + "\n")
        print(fns[k]())
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
