"""Syntax diagnostics for code documents, from each language's own parser.

The owner, INBOX 392: "the code document types dont act like a code editor
with errors, suggestions and that needs to be improved." The editor draws the
underline and the gutter mark; this module says where they go for the
languages whose real parser lives on the Python side of the app:

- Python, with `ast.parse`: the compiler's own front end, so a message here
  is the message `python file.py` would print, and nothing is executed.
- TOML, with `tomllib` (standard library since 3.11, which is this project's
  floor).
- XML, with `defusedxml`, the same parser every other XML read in this app
  goes through, so an entity bomb in a document is refused rather than
  expanded (reported as a note, not as the file being valid).
- YAML, with PyYAML's *composer* when PyYAML is installed. Composing builds
  the node graph and stops, so no tag constructs an object and an alias is a
  reference rather than a copy. PyYAML is not a declared dependency, so YAML
  is offered only where the import works.

The browser checks the rest itself (JSON with `JSON.parse`, JavaScript, CSS
and HTML from the parse tree CodeMirror already builds), which is why this
list is short: a round trip is only worth it where the browser has no parser
of its own. Offline by construction: every parser here is local, and the
route that calls this never reaches the network.

Positions are 1-based lines and columns, the way every compiler and every
editor status bar counts them.
"""

from __future__ import annotations

import ast
import re
import tomllib
import warnings

from defusedxml import DefusedXmlException
from defusedxml import ElementTree as SafeElementTree

#: Far above any hand-written source file and far below what a parse can be
#: asked to chew on per keystroke: the editor re-checks after a pause in
#: typing, so this bounds the worst case of one request.
MAX_CHARS = 200_000

#: tomllib appends the position to the message ("Invalid value (at line 2,
#: column 10)"); 3.11 has no attributes for it, so it is read back out.
_TOML_AT = re.compile(r"\s*\(at line (\d+), column (\d+)\)\s*$")
_TOML_END = re.compile(r"\s*\(at end of document\)\s*$")


def yaml_available() -> bool:
    try:
        import yaml  # noqa: F401
    except ImportError:
        return False
    return True


def languages() -> set[str]:
    """The file-type extensions this module can check."""
    found = {"py", "toml", "xml"}
    if yaml_available():
        found.add("yaml")
    return found


def _diag(line: int, col: int, message: str, severity: str = "error") -> dict:
    # Sentence case, the app's copy rule: the parsers write "invalid syntax"
    # and "expected ':'", and the tooltip is the app speaking, not the parser.
    text = message.strip() or "Syntax error"
    return {
        "line": max(1, int(line or 1)),
        "col": max(1, int(col or 1)),
        "message": text[0].upper() + text[1:],
        "severity": severity,
    }


def _python(text: str) -> list[dict]:
    try:
        # Warnings are the compiler talking about valid code (an invalid
        # escape sequence, say); they are not what this check reports, and
        # left alone they would go to the server's log once per keystroke.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            ast.parse(text)
    except SyntaxError as error:
        return [_diag(error.lineno or 1, error.offset or 1, error.msg or str(error))]
    # 3.11 raises ValueError for a null byte (3.12 made it a SyntaxError), and
    # a pathological nesting can exhaust the parser's stack or memory. All of
    # them are "this does not parse", said at the top of the file.
    except (ValueError, RecursionError, MemoryError) as error:
        return [_diag(1, 1, str(error) or "This file could not be parsed")]
    return []


def _toml(text: str) -> list[dict]:
    try:
        tomllib.loads(text)
    except tomllib.TOMLDecodeError as error:
        message = str(error)
        at = _TOML_AT.search(message)
        if at:
            return [_diag(int(at.group(1)), int(at.group(2)), _TOML_AT.sub("", message))]
        lines = text.count("\n") + 1
        return [_diag(lines, 1, _TOML_END.sub("", message))]
    return []


def _xml(text: str) -> list[dict]:
    try:
        SafeElementTree.fromstring(text)
    except SafeElementTree.ParseError as error:
        line, col = getattr(error, "position", (1, 0))
        # expat's message ends with its own ": line 3, column 2"; the editor
        # draws the position, so the words are kept and the numbers dropped.
        message = re.sub(r":\s*line \d+, column \d+\s*$", "", str(error))
        return [_diag(line, col + 1, message)]
    except DefusedXmlException:
        return [
            _diag(
                1,
                1,
                "Not checked: this file declares entities or external references, "
                "which the checker refuses to expand.",
                "info",
            )
        ]
    return []


def _yaml(text: str) -> list[dict]:
    import yaml

    try:
        for _ in yaml.compose_all(text, Loader=yaml.SafeLoader):
            pass
    except yaml.MarkedYAMLError as error:
        mark = error.problem_mark or error.context_mark
        line = mark.line + 1 if mark else 1
        col = mark.column + 1 if mark else 1
        message = " ".join(part for part in (error.context, error.problem) if part)
        return [_diag(line, col, message or "Invalid YAML")]
    except (yaml.YAMLError, RecursionError) as error:
        return [_diag(1, 1, str(error) or "Invalid YAML")]
    return []


_CHECKERS = {"py": _python, "toml": _toml, "xml": _xml, "yaml": _yaml}


def check(language: str, text: str) -> list[dict]:
    """Diagnostics for `text` read as `language`; `[]` when it parses.

    Raises `ValueError` for a language this module does not check, so the
    route can answer 400 rather than an empty list that reads as "valid".
    """
    if language not in languages():
        raise ValueError(f"no checker for {language!r}")
    return _CHECKERS[language](text)
