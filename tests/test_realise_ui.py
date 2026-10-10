"""The quote style of a sentence said from a note (CHAT_PLAN Phase 6 step 3,
decision 33; DESIGN.md's recipe row "A sentence an answer says from a
note"): the page draws it, the text never carries added quotation marks."""

from __future__ import annotations

import re
from pathlib import Path

from tests import _composer_eval

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
SHEET = (FRONTEND / "css" / "ask-compose-lazy.css").read_text(encoding="utf-8")
ASK_COMPOSE = (FRONTEND / "js" / "ask-compose.js").read_text(encoding="utf-8")
CAPTURE_ASK = (FRONTEND / "js" / "capture-ask.js").read_text(encoding="utf-8")


def _rule(selector: str) -> str:
    found = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", SHEET)
    assert found, selector
    return found.group(1)


def test_the_quote_style_is_tokens_only():
    for selector in (".said", ".said-shifted"):
        for declaration in filter(None, (d.strip() for d in _rule(selector).split(";"))):
            prop, value = (p.strip() for p in declaration.split(":", 1))
            if prop in ("color", "padding-inline-start", "box-shadow"):
                assert "var(--" in value, declaration


def test_the_page_marks_the_rows_the_composer_marks():
    assert "function markSaidSentences(targets, sentences)" in ASK_COMPOSE
    assert 'lazyScript("/css/ask-compose-lazy.css")' in ASK_COMPOSE
    assert "markSaidSentences(targets, sentences)" in CAPTURE_ASK


def test_no_quoted_sentence_carries_quotation_marks_of_the_apps_own():
    for row in _composer_eval.run():
        for part in row["result"]["parts"]:
            if part[0] in ("quote", "shifted"):
                assert not part[1].startswith(("“", '"')) or part[1].count("“") + part[1].count('"') > 1, part
        for g in row["result"]["grounding"]:
            assert g["said"] in ("quoted", "shifted", "picture"), g
            assert ("original" in g) == (g["said"] == "shifted"), g
