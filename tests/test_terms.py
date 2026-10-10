"""One word per thing, held where people read it (DESIGN.md's glossary).

MINDMAP_PLAN 15, row 2: the palette said "New concept map" where the Library's
picker and the toast said "mind map", for the same tree of topics. The rows
below are read from DESIGN.md's glossary table, so a word retired there is
retired here, over the visible text of `index.html`, the palette's and the
Library create picker's rows, the Dashboard's tool tiles, the JS string
literals a toast or a line label is made from, and the Guide's topics (their
titles and bodies; keywords may keep an old word, so typing it still finds
the answer).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESIGN = (ROOT / "docs" / "DESIGN.md").read_text(encoding="utf-8")
#: The glossary rows this lint holds, by the word they say.
LINTED = ("mind map",)


def _retired() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for say, never in re.findall(r"^\|[^|\n]+\|\s*\*\*([^*]+)\*\*[^|\n]*\|([^\n]+)\|\s*$", DESIGN, re.M):
        if say in LINTED:
            out[say] = re.findall(r'"([^"]+)"', never)
    return out


def _js_strings(text: str) -> list[str]:
    code = re.sub(r"^\s*//.*$", "", text, flags=re.M)
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
    return re.findall(r'"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`', code)


def _surfaces() -> dict[str, str]:
    index = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    index = re.sub(r"<!--.*?-->", "", index, flags=re.S)
    #: Case-insensitive and `</script >` too: the file is ours, but the shape is
    #: the one CodeQL reads as an HTML filter, so it has the filter's rigour.
    index = re.sub(r"<script\b.*?</script\s*>", "", index, flags=re.S | re.I)
    out = {"frontend/index.html": index}
    for path in sorted((ROOT / "frontend" / "js").glob("*.js")):
        strings = [a or b for a, b in _js_strings(path.read_text(encoding="utf-8"))]
        out[f"frontend/js/{path.name}"] = "\n".join(strings)
    from memorymap.ai import help_chat

    out["the Guide"] = "\n".join(
        str(topic.get(key, "")) for topic in help_chat.HELP_TOPICS for key in ("title", "body")
    )
    return out


def test_the_glossary_rows_this_lint_holds_are_in_design_md():
    retired = _retired()
    assert set(retired) == set(LINTED), retired
    assert retired["mind map"] == ["concept map"], retired


def test_no_retired_word_where_people_read_it():
    found = []
    for say, words in _retired().items():
        for where, text in _surfaces().items():
            for word in words:
                for match in re.finditer(re.escape(word), text, re.I):
                    found.append(f'{where}: "{text[max(0, match.start() - 30) : match.end() + 30]}" (say "{say}")')
    assert not found, "\n".join(found)
