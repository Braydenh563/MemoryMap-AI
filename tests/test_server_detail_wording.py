"""The sentences the server sends back as `detail` read as plain English.

`frontend/js/status.js` `plainHttpError` passes a server `detail` string
straight to the person's toast, so every one is user-facing copy, not a log
line (INBOX 472). This parses every `HTTPException(..., detail=...)` and
every `{"detail": ...}` error body in `src/memorymap/api/*.py` with `ast`
(plus the two helpers that take the message as an argument, `get_or_404` and
`_transcribe_upload`) and fails on a literal that:

- starts lowercase (sentence case);
- does not end with a full stop or a question mark;
- carries an identifier with an underscore (`start_line`, `is_private`),
  which is a field name the person cannot act on;
- carries an exclamation mark or a dash (CLAUDE.md section 2 order 6);
- names an endpoint path or API vocabulary (`/api/...`, JSON, schema,
  payload, endpoint, parameter, query string, request body).

A string built at run time (`detail=str(exc)`) cannot be checked here; the
inventory script lists those so a human can read them. A literal that has to
break a rule is allowlisted below with the reason beside it, never by
widening a rule.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "src" / "memorymap" / "api"

#: (file name, exact text) -> why this literal is allowed to break a rule.
ALLOWLIST: dict[tuple[str, str], str] = {}

EM_DASH = chr(0x2014)
EN_DASH = chr(0x2013)
IDENT = re.compile(r"[A-Za-z]+_[A-Za-z0-9_]+")
PATH = re.compile(r"(?<![\w.])/(?:api|entries|files|settings|spaces|documents|whiteboards?)/?\b")
JARGON = re.compile(
    r"\b(json|api|schema|payload|endpoint|endpoints|query string|query parameter|"
    r"request body|status code)\b",
    re.IGNORECASE,
)


def _pieces(node: ast.AST) -> list[str]:
    """Literal text of a detail expression.

    A plain literal is one string; an f-string is its literal runs with `{}`
    standing for each placeholder, so the first and last run can still be
    checked. A conditional yields both branches. Anything computed (a name,
    a call) yields nothing: it is the inventory's "computed" list.
    """
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return [node.value]
    if isinstance(node, ast.JoinedStr):
        return [
            "".join(part.value if isinstance(part, ast.Constant) else "{}" for part in node.values)
        ]
    if isinstance(node, ast.IfExp):
        return _pieces(node.body) + _pieces(node.orelse)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = _pieces(node.left), _pieces(node.right)
        if len(left) == 1 and len(right) == 1:
            return [left[0] + right[0]]
        return left + right
    if isinstance(node, ast.Dict):
        out: list[str] = []
        for key, value in zip(node.keys, node.values):
            if isinstance(key, ast.Constant) and key.value in ("message", "detail", "hint"):
                out += _pieces(value)
        return out
    return []


def _status_of(call: ast.Call) -> str:
    for kw in call.keywords:
        if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
            return str(kw.value.value)
    if call.args and isinstance(call.args[0], ast.Constant):
        return str(call.args[0].value)
    return "?"


def _walk(tree: ast.AST):
    """Yield (detail expression, status) for every detail in a module."""
    parents: dict[ast.AST, ast.AST] = {}
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            parents[child] = parent
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = node.func.id if isinstance(node.func, ast.Name) else getattr(node.func, "attr", "")
            if name in ("HTTPException", "StarletteHTTPException"):
                for kw in node.keywords:
                    if kw.arg == "detail":
                        yield kw.value, _status_of(node)
                if len(node.args) > 1:  # HTTPException(400, "text")
                    yield node.args[1], _status_of(node)
            elif name == "get_or_404":  # deps.get_or_404(session, Model, id, "text")
                for kw in node.keywords:
                    if kw.arg == "detail":
                        yield kw.value, "404"
                if len(node.args) > 3:
                    yield node.args[3], "404"
            elif name == "_transcribe_upload" and len(node.args) > 3:
                # The too-big message is handed to a helper that raises 413.
                yield node.args[3], "413"
        elif isinstance(node, ast.Dict):
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and key.value == "detail":
                    # Only an error body: a `detail` key on a list row or a
                    # progress report is a caption, not a toast.
                    call = parents.get(node)
                    while call is not None and not (
                        isinstance(call, ast.Call)
                        and getattr(call.func, "id", getattr(call.func, "attr", "")) == "JSONResponse"
                    ):
                        call = parents.get(call)
                    if call is not None:
                        yield value, _status_of(call)


def collect(computed: bool = False, api: Path = API):
    """Sorted (file, line, text, status) for every checkable detail literal.

    With `computed=True` the run-time ones are included too, as
    `<computed> source`, so the inventory can show them.
    """
    rows = set()
    for path in sorted(api.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for value, status in _walk(tree):
            texts = _pieces(value)
            for text in texts:
                rows.add((path.name, value.lineno, text, status))
            if computed and not texts:
                rows.add((path.name, value.lineno, "<computed> " + ast.unparse(value), status))
    return sorted(rows)


def problems(text: str) -> list[str]:
    """Why a detail literal fails the wording rules; empty when it passes."""
    why = []
    stripped = text.strip()
    # A name in quotes or curly quotes leads some sentences ("'{}' is used by
    # more than one note."); the sentence case rule is about the first word.
    lead = stripped.lstrip("'\"\u2018\u2019\u201c\u201d")
    first = next((c for c in lead if c.isalpha()), "")
    if lead and not lead.startswith("{}") and first and first.islower():
        why.append("starts lowercase")
    if not stripped.endswith((".", "?")):
        why.append("no final full stop")
    if IDENT.search(text):
        why.append("underscore identifier")
    if "!" in text:
        why.append("exclamation mark")
    if EM_DASH in text or EN_DASH in text:
        why.append("dash")
    if PATH.search(text):
        why.append("endpoint path")
    if JARGON.search(text):
        why.append("API jargon")
    return why


def violations(rows=None):
    out = []
    for file, line, text, _status in rows if rows is not None else collect():
        if (file, text) in ALLOWLIST:
            continue
        why = problems(text)
        if why:
            out.append((file, line, text, "; ".join(why)))
    return out


def test_every_server_detail_reads_as_a_plain_sentence():
    bad = violations()
    assert not bad, (
        "a server `detail` goes straight into the person's toast: sentence "
        "case, a full stop, no field names, paths or API words, no dashes "
        "(INBOX 472). Rewrite it, or allowlist it with a reason:\n"
        + "\n".join(f"{f}:{ln}  [{why}]  {text!r}" for f, ln, text, why in bad[:60])
    )


def test_the_allowlist_has_no_stale_entries():
    live = {(file, text) for file, _line, text, _status in collect()}
    stale = [key for key in ALLOWLIST if key not in live]
    assert not stale, f"allowlist entries that match no detail any more: {stale}"
    assert all(ALLOWLIST.values()), "an allowlist entry needs a reason"


def test_the_collector_sees_the_shapes_the_routes_use():
    # A ratchet that parses nothing passes forever; pin that it finds the
    # shapes (keyword, f-string, dict body) in the real tree.
    rows = collect()
    assert len(rows) > 200
    assert any("{}" in text for _f, _l, text, _s in rows), "no f-string detail parsed"
    assert any(f == "app.py" for f, *_ in rows), "no JSONResponse detail parsed"
    sample = ast.parse(
        'raise HTTPException(status_code=400, detail="bad_thing")\n'
        'raise HTTPException(400, "second_form")\n'
        'deps.get_or_404(session, Row, 1, "helper_form")'
    )
    assert sorted(v.value for v, _s in _walk(sample)) == ["bad_thing", "helper_form", "second_form"]
    assert problems("bad_thing") and problems("Fine sentence.") == []
