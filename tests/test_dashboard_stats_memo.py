"""The dashboard's shared `/insights/stats` fetch must call the API, not itself.

A search-and-replace that turned every `apiJson("/insights/stats")` into
`fetchDashStats()` also rewrote the one inside `fetchDashStats`, and the
function recursed until the stack overflowed: four dashboard widgets (Stats,
Streak, Notebook constellation, Categories) then read "Couldn't load this
widget." with no console error, because the card renderer swallows its
widget's rejection. The suite cannot run the browser, so this pins the shape.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DASHBOARD = ROOT / "frontend" / "dashboard.js"


def _function_body(source: str, name: str) -> str:
    match = re.search(rf"function {name}\(\)\s*\{{", source)
    assert match, f"{name} not found"
    depth, i = 0, match.end() - 1
    while i < len(source):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                return source[match.end() : i]
        i += 1
    raise AssertionError(f"{name} body never closes")


def test_fetch_dash_stats_calls_the_api_not_itself():
    body = _function_body(DASHBOARD.read_text(encoding="utf-8"), "fetchDashStats")
    assert 'apiJson("/insights/stats")' in body
    assert "fetchDashStats(" not in body


def test_widgets_share_the_memoised_fetch():
    source = DASHBOARD.read_text(encoding="utf-8")
    body = _function_body(source, "fetchDashStats")
    outside = source.replace(body, "")
    assert 'apiJson("/insights/stats")' not in outside, "widgets must use fetchDashStats()"
