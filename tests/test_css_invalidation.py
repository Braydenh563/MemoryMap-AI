"""No stylesheet makes a class change restyle a whole subtree.

**Why this exists (MINDMAP_PLAN.md 13a-view).** A browser keeps, for each
class name and attribute a selector mentions, the list of elements a change
to it can affect, so toggling `.is-open` on one element restyles only what
the rules about `.is-open` can reach. There is one shape it cannot narrow: an
attribute selector on `class` itself (`[class*="card"]`, `[class^="wb-"]`)
in an *ancestor* position. Any class change on any element might have just
made it match, so the browser has to restyle that element's whole subtree on
every class change, for every element in the app.

One rule of that shape was in Settings (`#settings-modal .settings-section
[class*="card"] *`). Measured on a 500-topic mind map, toggling one
unrelated class on the board's container restyled 13,662 elements in 218ms;
with the rule gone, 0.1ms. The id in front of it did not help: the browser
cannot know an element is outside `#settings-modal` until it has restyled it.

So the lint is exactly that shape: a `[class` attribute selector in a
compound that is followed by a descendant or child combinator. The same
selector as the *last* compound (the element itself) is fine, and so is one
followed by a sibling combinator, which reaches one sibling rather than a
subtree.
"""

from __future__ import annotations

import re

from tests._css_paths import FRONTEND_DIR


def _strip_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def _selectors(text: str):
    """Yield (line, selector) for every rule prelude, at any nesting depth."""
    text = _strip_comments(text)
    depth_stack = []
    start = 0
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "{":
            prelude = text[start:i].strip()
            line = text.count("\n", 0, i) + 1
            if prelude and not prelude.startswith("@"):
                yield line, prelude
            depth_stack.append(i)
            start = i + 1
        elif ch in "};":
            if ch == "}" and depth_stack:
                depth_stack.pop()
            start = i + 1
        i += 1


def _split_top(selector: str, seps: str):
    """Split at `seps` characters that are outside brackets and parentheses."""
    parts, depth, cur = [], 0, []
    for ch in selector:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if depth == 0 and ch in seps:
            parts.append("".join(cur))
            cur = []
            continue
        cur.append(ch)
    parts.append("".join(cur))
    return parts


def _ancestor_class_attr(selector: str) -> bool:
    """True when a `[class...]` sits in a compound followed by ' ' or '>'."""
    # Normalise the combinators so each is one token between compounds.
    norm = re.sub(r"\s*([>+~])\s*", r" \1 ", selector.strip())
    tokens = [t for t in _split_top(norm, " ") if t]
    compounds = []  # (compound, combinator that follows it)
    for tok in tokens:
        if tok in (">", "+", "~"):
            if compounds:
                compounds[-1] = (compounds[-1][0], tok)
            continue
        compounds.append((tok, " "))
    if compounds:
        compounds[-1] = (compounds[-1][0], None)
    for compound, comb in compounds:
        if comb in (" ", ">") and "[class" in compound:
            return True
    return False


def test_the_detector_knows_the_shape():
    assert _ancestor_class_attr('#m .s [class*="card"] *')
    assert _ancestor_class_attr('.a > [class^="wb-"] .b')
    assert not _ancestor_class_attr('#m .s [class*="card"]')
    assert not _ancestor_class_attr('.s button:not([class*="card"])')
    assert not _ancestor_class_attr('.d > :is(.x, [class*="help"]) + :is(.y)')


def test_no_class_attribute_selector_in_an_ancestor_position():
    offenders = []
    for path in sorted((FRONTEND_DIR / "css").glob("*.css")):
        for line, prelude in _selectors(path.read_text(encoding="utf-8")):
            for selector in _split_top(prelude, ","):
                if _ancestor_class_attr(selector):
                    offenders.append(f"{path.name}:{line}: {selector.strip()}")
    assert not offenders, (
        "A `[class...]` attribute selector before a descendant or child "
        "combinator makes every class change in the app restyle a whole "
        "subtree (see this file's docstring). Put the rule on the element "
        "itself, or name the classes:\n" + "\n".join(offenders)
    )
