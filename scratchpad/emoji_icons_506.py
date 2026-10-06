"""Inventory of emoji / dingbat / pictographic characters in user-visible UI (INBOX 506).

Usage: python scratchpad/emoji_icons_506.py [--md]

Scans frontend/index.html, frontend/sw.js, frontend/js/*.js, frontend/css/*.css and the
server strings that reach the UI (ai/help_chat.py, ai/help_topics_more.py, api/*.py).
Comments are removed first (JS and CSS block/line comments, HTML comments, Python
comments and docstrings), so what is listed is what can render or be matched at runtime.
Each hit is file:line, the characters, a kind (string / regex / css-content / html /
py-string) and the excerpt.

The same scanner is the base of tests/test_no_ui_emoji.py.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RANGES = [
    (0x1F000, 0x1F2FF),  # mahjong, dominoes, cards, enclosed
    (0x1F300, 0x1FAFF),  # pictographs, emoticons, transport, supplemental
    (0x2600, 0x27BF),    # misc symbols + dingbats (check, cross, star, warning, gear)
    (0x2B00, 0x2BFF),    # misc symbols and arrows (star, squares)
    (0x2190, 0x21FF),    # arrows
    (0x25A0, 0x25FF),    # geometric shapes
    (0x2300, 0x23FF),    # misc technical (hourglass, play controls, command key)
    (0x2900, 0x297F),    # supplemental arrows B
    (0xFE0F, 0xFE0F),    # emoji variation selector
    (0x200D, 0x200D),    # zero width joiner (emoji sequences)
    (0x20E3, 0x20E3),    # keycap
    (0x00D7, 0x00D7),    # multiplication sign, the usual "x" close glyph
    (0x22EE, 0x22EF),    # vertical / horizontal ellipsis, the kebab glyphs
    (0x2261, 0x2261),    # identical to, the hamburger glyph
]
CLASS = "[" + "".join(f"\\U{a:08x}-\\U{b:08x}" for a, b in RANGES) + "]"
PAT = re.compile(f"{CLASS}+")


def blank(text: str, keep: str = "") -> str:
    """Replace every char except newlines with a space."""
    return "".join(c if c == "\n" else " " for c in text)


def strip_js(src: str) -> list[tuple[str, str]]:
    """Return [(kind, text_with_comments_blanked)] collapsed to one blanked source plus
    per-position kind is overkill: we return a list of (kind, segment) for strings and
    regex literals only, each carrying its absolute offset via a prefix of newlines."""
    out: list[tuple[int, str, str]] = []
    i, n = 0, len(src)
    prev = ""  # last significant char, to tell a regex from a division
    while i < n:
        c = src[i]
        two = src[i:i + 2]
        if two == "//":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue
        if two == "/*":
            j = src.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        if c in "\"'":
            j = i + 1
            while j < n and src[j] != c and src[j] != "\n":
                j += 2 if src[j] == "\\" else 1
            out.append((i, "string", src[i:j + 1]))
            i, prev = j + 1, c
            continue
        if c == "`":
            # template literal: ${...} nesting is flattened, comments inside are rare.
            j, depth = i + 1, 0
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if depth == 0 and src[j] == "`":
                    break
                if src[j:j + 2] == "${":
                    depth += 1
                    j += 2
                    continue
                if depth and src[j] == "}":
                    depth -= 1
                j += 1
            out.append((i, "string", src[i:j + 1]))
            i, prev = j + 1, "`"
            continue
        if c == "/" and (prev == "" or prev in "(,=:[!&|?{};+-*%<>~^"):
            j, cls = i + 1, False
            while j < n and src[j] != "\n":
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == "[":
                    cls = True
                elif src[j] == "]":
                    cls = False
                elif src[j] == "/" and not cls:
                    break
                j += 1
            out.append((i, "regex", src[i:j + 1]))
            i, prev = j + 1, "/"
            continue
        if not c.isspace():
            prev = c
        i += 1
    return [(o, k, t) for o, k, t in out]  # type: ignore[return-value]


def line_of(src: str, offset: int) -> int:
    return src.count("\n", 0, offset) + 1


ESC = re.compile(r"\\u\{([0-9A-Fa-f]{1,6})\}|\\u([0-9A-Fa-f]{4})")


def decode_escapes(text: str) -> str:
    """`\\u25B8` and `\\u{1F4CE}` in a JS string are the same glyph as the literal."""
    return ESC.sub(lambda m: chr(int(m.group(1) or m.group(2), 16)), text)


def hits_js(path: Path):
    src = path.read_text(encoding="utf-8")
    for off, kind, text in strip_js(src):
        for m in PAT.finditer(decode_escapes(text)):
            ln = line_of(src, off)
            yield ln + text[: max(0, text.find(m.group(0)))].count("\n") if m.group(0) in text else ln, m.group(0), kind


def hits_css(path: Path):
    src = path.read_text(encoding="utf-8")
    clean = re.sub(r"/\*.*?\*/", lambda m: blank(m.group(0)), src, flags=re.S)
    clean = re.sub(r"\\([0-9A-Fa-f]{1,6}) ?", lambda m: chr(int(m.group(1), 16)), clean)
    for m in PAT.finditer(clean):
        line = clean[clean.rfind("\n", 0, m.start()) + 1:clean.find("\n", m.start())]
        kind = "css-content" if "content" in line else "css-other"
        yield line_of(src, m.start()), m.group(0), kind


def hits_html(path: Path):
    src = path.read_text(encoding="utf-8")
    clean = re.sub(r"<!--.*?-->", lambda m: blank(m.group(0)), src, flags=re.S)
    # inline <style> and <script> bodies get their comment syntax stripped too
    clean = re.sub(r"/\*.*?\*/", lambda m: blank(m.group(0)), clean, flags=re.S)
    for m in PAT.finditer(clean):
        yield line_of(src, m.start()), m.group(0), "html"


def hits_py(path: Path):
    src = path.read_text(encoding="utf-8")
    tree = ast.parse(src)
    doc_ids = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            body = getattr(node, "body", [])
            if body and isinstance(body[0], ast.Expr) and isinstance(getattr(body[0], "value", None), ast.Constant):
                doc_ids.add(id(body[0].value))
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in doc_ids:
            for m in PAT.finditer(node.value):
                yield node.lineno, m.group(0), "py-string"


def files(root: Path):
    return (
        [root / "frontend/index.html", root / "frontend/sw.js"]
        + sorted((root / "frontend/js").glob("*.js"))
        + sorted((root / "frontend/css").glob("*.css"))
        + [root / "src/memorymap/ai/help_chat.py", root / "src/memorymap/ai/help_topics_more.py"]
        + sorted((root / "src/memorymap/api").glob("*.py"))
    )


def scan(root: Path = ROOT):
    for path in files(root):
        if not path.exists():
            continue
        fn = {".js": hits_js, ".css": hits_css, ".html": hits_html, ".py": hits_py}[path.suffix]
        lines = path.read_text(encoding="utf-8").splitlines()
        for ln, ch, kind in sorted(set(fn(path))):
            yield path.relative_to(root).as_posix(), ln, ch, kind, lines[ln - 1].strip()


TYPO = re.compile("^[\u2190-\u21ff\u00d7\u2318\u22ee\u22ef]+$")


def role(f: str, ln: int, ch: str, kind: str, line: str) -> str:
    """A short classification for the report. Heuristic: the test file holds the rules."""
    if f.endswith("documents-prose.js") and ln >= 1220:
        return "data: Markdown :shortcode: table (unslop-ignore)"
    if f.endswith("avatars.js") or "LEADING_EMOJI" in line:
        return "data: regex matching emoji the person typed"
    if "AI_STATUS_GLYPH" in line:
        return "kept: colour-blind-safe status mark set (documented exception)"
    if f.endswith("whiteboard.js") and "task" in line:
        return "kept: exported SVG task box (icon font does not travel into the file)"
    if "\u22ef menu" in line:
        return "typographic: help prose naming the more-menu (a word, not an icon)"
    if kind == "css-content":
        return "ICON drawn by CSS content"
    if f.endswith("navigation.js") or (f.endswith("index.html") and "\u22ef" in ch):
        return "ICON (button face or help glyph)"
    if f.endswith(("documents.js", "notes-list.js")) and (
        re.search(r"\\u[0-9a-fA-F]{4}", line) or re.search(r'\w+: "', line)
    ):
        return "data: LaTeX / math symbol table"
    if TYPO.match(ch):
        if ch == "\u2318":
            return "typographic: Mac command key name"
        if kind == "py-string" or kind == "html" or "Settings" in line or "\u2192" in ch:
            return "typographic: arrow in a sentence, breadcrumb or key name"
        return "typographic"
    if kind == "css-content":
        return "ICON as CSS content"
    return "ICON or symbol in UI text"


def md(before_root: Path) -> str:
    before = list(scan(before_root))
    after = list(scan(ROOT))
    key = lambda r: (r[0], r[2], r[4])  # noqa: E731  (file, chars, line text: robust to line shifts)
    after_keys = {key(r) for r in after}
    replaced = [r for r in before if key(r) not in after_keys]
    out = ["# Emoji and dingbat inventory (INBOX 506)", ""]
    out.append(
        "Generated by `python scratchpad/emoji_icons_506.py --md <base checkout>`. Scope: "
        "`frontend/index.html`, `frontend/sw.js`, `frontend/js/*.js` (string, template and regex "
        "literals, comments removed, `\\u` escapes decoded), `frontend/css/*.css` (comments removed, "
        "CSS escapes decoded), `src/memorymap/ai/help_chat.py`, `help_topics_more.py` and "
        "`src/memorymap/api/*.py` (string constants, docstrings removed). Out of scope: prompts the "
        "model may echo, test fixtures, user content."
    )
    out.append("")
    out.append(f"Before (base 6b31151): **{len(before)}** hits. After: **{len(after)}** hits.")
    out.append("")
    out.append("## Replaced with Phosphor (in the before list, gone from the after list)")
    out.append("")
    out.append("| file:line (before) | char | kind | role |")
    out.append("| --- | --- | --- | --- |")
    for f, ln, ch, kind, line in replaced:
        out.append(f"| {f}:{ln} | `{ch}` U+{ord(ch[0]):04X} | {kind} | {role(f, ln, ch, kind, line)} |")
    out.append("")
    out.append("## Left in place, by reason")
    out.append("")
    groups: dict[str, list] = {}
    for r in after:
        groups.setdefault(role(*r), []).append(r)
    for reason, rows in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        files_ = sorted({f"{r[0]}" for r in rows})
        out.append(f"- **{reason}**: {len(rows)} hits in {len(files_)} file(s): " + ", ".join(f"`{x}`" for x in files_[:12]) + (" ..." if len(files_) > 12 else ""))
    out.append("")
    out.append("## Every remaining non-typographic, non-data hit")
    out.append("")
    for r in after:
        if role(*r).startswith(("ICON", "kept")):
            out.append(f"- {r[0]}:{r[1]} `{r[2]}` ({role(*r)})")
    out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    if "--md" in sys.argv:
        base = Path(sys.argv[sys.argv.index("--md") + 1])
        print(md(base))
    else:
        rows = list(scan())
        for f, n, ch, kind, line in rows:
            names = ",".join(f"U+{ord(c):04X}" for c in ch)
            print(f"{f}:{n}\t{ch}\t{names}\t{kind}\t{line[:160]}")
        print(f"\n{len(rows)} hits", file=sys.stderr)
