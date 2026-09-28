"""Accent-coloured words use `--accent-text`, never the raw accent (INBOX
426, round 4; the decision: links and accent-coloured text use a text-safe
token, the accent itself stays for fills).

The raw accent is chosen as a fill and fails as text: `scratchpad/ui-sweeps/
accenttext.js` measures it under 4.5:1 on 228 of 348 palette, accent and
mode combinations (rose on paper was 3.35:1 for a link in Settings, Models),
and `--accent-text` on none (lowest 4.71:1). This holds the swap: a `color`
declaration, in the stylesheets or in a CodeMirror theme object, may reach
the accent only through the token. Borders, outlines, fills and
`accent-color` keep the accent, which is what it is for.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"

# `color:` as a property of its own: not border-color, outline-color,
# accent-color, background-color or -webkit-text-fill-color.
_CSS_TEXT_COLOUR = re.compile(r"(?<![-\w])color:([^;{}]*)")
_JS_TEXT_COLOUR = re.compile(r"(?<![-\w])color:\s*[\"'`]([^\"'`]*)[\"'`]")
_RAW = re.compile(r"var\(--accent\)")


def test_no_stylesheet_paints_words_with_the_raw_accent() -> None:
    bad = []
    for path in sorted((FRONTEND / "css").glob("*.css")):
        text = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.S)
        for match in _CSS_TEXT_COLOUR.finditer(text):
            if _RAW.search(match.group(1)):
                line = text[: match.start()].count("\n") + 1
                bad.append(f"{path.name}:{line}: color:{match.group(1).strip()}")
    assert not bad, "use var(--accent-text) for accent-coloured text:\n" + "\n".join(bad)


def test_no_script_paints_words_with_the_raw_accent() -> None:
    bad = []
    for path in sorted(FRONTEND.glob("*.js")):
        text = path.read_text(encoding="utf-8")
        for match in _JS_TEXT_COLOUR.finditer(text):
            if _RAW.search(match.group(1)):
                line = text[: match.start()].count("\n") + 1
                bad.append(f"{path.name}:{line}: color: {match.group(1)}")
    assert not bad, "use var(--accent-text) for accent-coloured text:\n" + "\n".join(bad)


def test_the_token_is_derived_with_a_fallback() -> None:
    tokens = (FRONTEND / "css" / "00-tokens-shell.css").read_text(encoding="utf-8")
    assert re.search(r":root\s*\{\s*--accent-text: var\(--accent\);", tokens), "the fallback"
    guarded = tokens[tokens.index("@supports (color: oklch(from red l c h))"):]
    assert "oklch(from var(--accent) min(l," in guarded
    assert ':root[data-mode="dark"]' in guarded and "max(l," in guarded
