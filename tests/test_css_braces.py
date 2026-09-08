"""The stylesheets parse: braces balanced, and no rule left half open.

Written during UI_MODERNISATION_PLAN.md Phase 9, which appends whole media
blocks to the end of a 8,000 line file, and which wrapped 24 existing rules in
`@media (hover: hover)` with a script.

Both of those are edits a human eye skims. A single missing `}` in CSS does
not throw, does not log and does not fail any other test in this suite: the
browser silently swallows the rest of the file from that point on, so the
symptom is "the last third of the stylesheet stopped applying" appearing on
some unrelated tab, days later. That is the same shape as the
`APPEARANCE_DEFAULTS` bug CLAUDE.md records, where a value invalid at its use
site did its damage nowhere near the code that caused it.

Comments are stripped first, because these files carry long prose comments
that quote braces and selectors. `test_style_scale.py` learned the same lesson
about comments quoting lengths, and `test_frontend_ids.py` about markup
comments quoting ids.
"""

from __future__ import annotations

import re

from tests._css_paths import CSS_FILES


def _stripped(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def test_every_stylesheet_has_balanced_braces():
    offenders = []
    for path in CSS_FILES:
        text = _stripped(path.read_text())
        depth = text.count("{") - text.count("}")
        if depth:
            offenders.append(
                f"{path.name}: {depth:+d} "
                f"({text.count('{')} open, {text.count('}')} close)"
            )
    assert not offenders, (
        "Unbalanced braces:\n  "
        + "\n  ".join(offenders)
        + "\n\nA browser drops the rest of the file from the first stray brace "
        "and says nothing."
    )


def test_no_stylesheet_closes_more_than_it_opens_at_any_point():
    """Balanced overall is not the same as valid.

    `}` before `{` balances across a whole file while breaking it in the
    middle, which is exactly what a bad `sed` or a mis-anchored script edit
    produces: the total is right and the file is ruined.
    """
    offenders = []
    for path in CSS_FILES:
        depth = 0
        for line_no, line in enumerate(_stripped(path.read_text()).split("\n"), 1):
            for char in line:
                if char == "{":
                    depth += 1
                elif char == "}":
                    depth -= 1
                    if depth < 0:
                        offenders.append(f"{path.name}:{line_no} closes a rule that was never opened")
                        depth = 0
    assert not offenders, "\n  ".join(["Stray closing braces:"] + offenders)


def test_media_queries_are_never_nested_more_than_one_deep():
    """One level of `@media` is the app's whole convention.

    A rule inside two nested media queries applies under conditions no one
    reading either query can state, and `test_ui_signatures.py` reads
    innermost rules only, so the outer condition is invisible to the lints
    as well. If this ever needs to change, it needs to change deliberately.
    """
    offenders = []
    for path in CSS_FILES:
        text = _stripped(path.read_text())
        depth = 0
        at_depth: list[bool] = []
        for match in re.finditer(r"@media[^{}]*\{|\{|\}", text):
            token = match.group(0)
            if token.startswith("@media"):
                at_depth.append(True)
                depth += 1
                if sum(at_depth) > 1:
                    line = text.count("\n", 0, match.start()) + 1
                    offenders.append(f"{path.name}:~{line} nested @media")
            elif token == "{":
                at_depth.append(False)
                depth += 1
            else:
                if at_depth:
                    at_depth.pop()
                depth = max(0, depth - 1)
    assert not offenders, "\n  ".join(["Nested media queries:"] + offenders)
