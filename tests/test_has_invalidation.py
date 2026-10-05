"""A `:has()` must not sit before a rightmost compound that has no class or
id in it (audit FEAT-02, 2026-10-05).

Traced on a 301-topic map: with `.doc-layout:has(> #doc-sidebar.hidden) >
:not(#doc-sidebar)` in the stylesheet, appending one element anywhere inside
the board, or turning a topic's text editable, restyled 3,731 elements, every
element on the page, 55 to 80ms each time. Chrome cannot key the
invalidation for a `:has()` in a non-subject position when what follows it
names no class or id, so it restyles everything. Three such rules
(`.entry-list.is-rows li:not(:has(textarea)) > *:not(...)`, the one above,
and `#capture > .row:has(> h2) button`) took one Tab on a map from about
20ms of style work to about 180ms; rewritten, the insertion costs 20ms.

A ratchet, because a few weaker cases remain (a type selector after the
`:has()`, measured at 10 to 20ms each) and are listed here to be cut down,
never added to.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = sorted((ROOT / "frontend" / "css").glob("*.css"))

#: Selectors with a `:has()` before a rightmost compound that names no class
#: or id. Only ever lowered.
CEILING = 10


def _split_top(text: str, sep: str) -> list[str]:
    out, depth, cur = [], 0, ""
    for ch in text:
        depth += ch == "("
        depth -= ch == ")"
        if ch == sep and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return out


def _rightmost(selector: str) -> str:
    depth, last = 0, 0
    for i, ch in enumerate(selector):
        depth += ch == "("
        depth -= ch == ")"
        if depth == 0 and ch in " >~+":
            last = i + 1
    return selector[last:].strip()


def _outside_parens(compound: str) -> str:
    out, depth = "", 0
    for ch in compound:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif depth == 0:
            out += ch
    return out


def offenders() -> list[str]:
    found = []
    for path in CSS:
        text = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.S)
        for prelude in re.findall(r"([^{}]+)\{", text):
            if ":has(" not in prelude or prelude.strip().startswith("@"):
                continue
            for selector in _split_top(prelude, ","):
                selector = " ".join(selector.split())
                if ":has(" not in selector:
                    continue
                last = _rightmost(selector)
                if ":has(" in last:
                    continue
                keyed = _outside_parens(re.sub(r"::?[\w-]+", "", last))
                if "." in keyed or "#" in keyed:
                    continue
                found.append(f"{path.name}: {selector}")
    return found


def test_the_three_measured_rules_stay_rewritten():
    joined = "\n".join(offenders())
    assert "> :not(#doc-sidebar)" not in joined
    assert "li:not(:has(textarea)) > *:not(.entry-title)" not in joined
    assert ".row:has(> h2) button" not in joined


def test_no_new_unkeyed_rule_after_a_has():
    found = offenders()
    assert len(found) <= CEILING, "\n".join(found)
