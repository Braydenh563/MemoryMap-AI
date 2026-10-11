"""A hover is declared with its keyboard twin (UI_MODERNISATION Phase 13
decision 15).

The design review measured 418 selectors with a `:hover` rule, 282 of them
with no focus rule, and a Tab walk found 110 controls whose look did not change
when focused: a keyboard user saw two thirds of the app without the feedback a
pointer gets. Brief 57 measured 462 hover selectors, 253 of them alone, and
gave each its twin in the same rule, so the two can never drift apart:

    .row:hover,
    .row:is(:focus-visible, :has(:focus-visible)) { ... }

`X:hover` matches X and every ancestor of the pointer, so the faithful twin is
X focused by the keyboard or holding such a focus (`:has(:focus-visible)`), a
row lighting when the button inside it is reached by Tab exactly as it does
when the pointer is over that button. Inside a `:has()`, which cannot nest,
the twin is `:focus-visible` alone. A separately declared focus rule for the
same selector also counts.

Exempt, by shape rather than by name: a field's `:hover:not(:focus)` (the
focused field has its own ring and edge), and a hover on a pseudo-element the
keyboard cannot reach (`::-webkit-scrollbar-thumb`, `::file-selector-button`).
"""

from __future__ import annotations

import re

from tests._css_paths import CSS_FILES

NOT = re.compile(r":not\((?:[^()]|\([^()]*\))*\)")
FOCUS = re.compile(r":focus-visible|:focus-within|:focus\b")
TWIN = ":is(:focus-visible, :has(:focus-visible))"


def _split_top(text: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in text:
        depth += {"(": 1, ")": -1}.get(ch, 0)
        if ch == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
            continue
        cur += ch
    parts.append(cur.strip())
    return parts


def _selector_lists() -> list[list[str]]:
    from memorymap.api.asset_strip import strip_for_path

    lists = []
    for path in CSS_FILES:
        served = strip_for_path(path.name, path.read_bytes()).decode("utf-8")
        served = re.sub(r"@(media|supports|container|layer)[^{]*\{", "", served)
        for m in re.finditer(r"([^{};]+)\{", served):
            lists.append(_split_top(m.group(1)))
    return lists


def _key(selector: str, pattern: re.Pattern) -> str:
    return re.sub(r"\s+", " ", pattern.sub("§", selector.replace(TWIN, ":focus-visible")))


def _exempt(selector: str) -> bool:
    return ":not(:focus)" in selector or "::-webkit-scrollbar" in selector or "::file-selector-button" in selector


def _lone_hovers() -> list[str]:
    lists = _selector_lists()
    focused = {_key(s, FOCUS) for sels in lists for s in sels if FOCUS.search(NOT.sub("", s))}
    lone = []
    for sels in lists:
        for s in sels:
            bare = NOT.sub("", s)
            if ":hover" not in bare or FOCUS.search(bare) or _exempt(s):
                continue
            if _key(s, re.compile(r":hover")) not in focused:
                lone.append(s)
    return lone


def test_every_hover_has_its_focus_visible_twin():
    lone = _lone_hovers()
    assert not lone, (
        f"{len(lone)} hover selectors with no keyboard twin (docs/DESIGN.md, 'Hover and "
        "focus are one state'). Add the twin to the same rule:\n  X:hover,\n  X" + TWIN
        + "\n\n" + "\n".join(f"  {s[:140]}" for s in lone[:40])
    )


def test_the_lint_sees_the_hovers():
    """A parser that found nothing would pass the test above vacuously."""
    hovers = sum(1 for sels in _selector_lists() for s in sels if ":hover" in NOT.sub("", s))
    assert hovers > 400, hovers


def test_the_base_button_answers_focus_with_its_hover_ground():
    """The one hover every button shares (DESIGN.md, One hover for every
    button) is the base rule's deeper ground; the keyboard gets the same."""
    forms = (CSS_FILES[0].parent / "01-forms-settings.css").read_text(encoding="utf-8")
    assert re.search(
        r"button:hover:not\(:disabled\),\s*button:is\(:focus-visible, :has\(:focus-visible\)\):not\(:disabled\) \{\s*--button-ground: var\(--accent-surface-hover\)",
        forms,
    )
