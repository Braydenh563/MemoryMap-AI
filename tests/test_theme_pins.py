"""Classic and Quiet utilitarian are pinned (Brief 95, INBOX 858).

The owner: "upgrade existing themes (keep the classic and quiet utilitarian
the same". Every other look is free to move; these two are not. The pin is on
the source that paints them: Quiet's two `[data-palette="utilitarian"]`
blocks, Classic's colour tokens in the base `:root` and dark blocks of
00-tokens-shell.css (only the fifteen names a palette sets, so a spacing or
type token can still move), their two `PALETTES` cards and their two
`THEME_PRESETS` rows. A change here is a change the owner asked not to have:
revert it, do not update the literals.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEMES = (ROOT / "frontend/css/05-sidebars-themes.css").read_text(encoding="utf-8")
TOKENS = (ROOT / "frontend/css/00-tokens-shell.css").read_text(encoding="utf-8")
SETTINGS = (ROOT / "frontend/js/settings.js").read_text(encoding="utf-8")

PALETTE_KEYS = ['--accent', '--accent-soft', '--blob-a', '--blob-b', '--border', '--card', '--chip-bg', '--glass-border', '--glass-shadow', '--ink', '--inner', '--input-bg', '--modal-bg', '--muted', '--page']


def _blocks(css: str, selector: str) -> list[str]:
    """Bodies of every rule whose selector is exactly `selector` at a line start."""
    out, i = [], 0
    while (j := css.find(selector + " {", i)) >= 0:
        k = css.index("{", j)
        depth, m = 1, k + 1
        while depth:
            depth += {"{": 1, "}": -1}.get(css[m], 0)
            m += 1
        if j == 0 or css[j - 1] == "\n":
            out.append(css[k + 1 : m - 1])
        i = m
    return out


def _decls(body: str) -> dict[str, str]:
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    return {a: " ".join(b.split()) for a, b in re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", body)}


def _first(css: str, selector: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for body in _blocks(css, selector):
        for key, value in _decls(body).items():
            if key in PALETTE_KEYS:
                found.setdefault(key, value)
    return found


QUIET_LIGHT = {
    '--page': '#f4f3f1',
    '--blob-a': 'transparent',
    '--blob-b': 'transparent',
    '--card': '#ffffff',
    '--inner': '#f7f6f4',
    '--input-bg': '#ffffff',
    '--glass-border': '#e3e1dd',
    '--modal-bg': '#ffffff',
    '--glass-shadow': '0 1px 2px rgba(28, 28, 26, calc(0.06 * var(--shadow-low) + 0.44 * var(--shadow-t))), 0 2px 8px rgba(28, 28, 26, calc(0.04 * var(--shadow-low) + 0.46 * var(--shadow-t)))',
    '--ink': '#1c1c1a',
    '--muted': '#66645f',
    '--accent': '#2f5bd3',
    '--accent-soft': 'rgba(47, 91, 211, 0.1)',
    '--border': 'rgba(28, 28, 26, 0.1)',
    '--chip-bg': 'rgba(28, 28, 26, 0.05)',
}

QUIET_DARK = {
    '--page': '#161615',
    '--blob-a': 'transparent',
    '--blob-b': 'transparent',
    '--card': '#1e1e1c',
    '--inner': '#242422',
    '--input-bg': '#1a1a19',
    '--glass-border': '#2f2f2c',
    '--modal-bg': '#1e1e1c',
    '--glass-shadow': '0 1px 2px rgba(0, 0, 0, calc(0.4 * var(--shadow-low) + 0.5 * var(--shadow-t))), 0 4px 12px rgba(0, 0, 0, calc(0.25 * var(--shadow-low) + 0.65 * var(--shadow-t)))',
    '--ink': '#ecebe8',
    '--muted': '#b5b3ad',
    '--accent': '#78a8ff',
    '--accent-soft': 'rgba(120, 168, 255, 0.16)',
    '--border': 'rgba(236, 235, 232, 0.1)',
    '--chip-bg': 'rgba(236, 235, 232, 0.06)',
}

CLASSIC_LIGHT = {
    '--page': 'linear-gradient(135deg, #e9edfb 0%, #f6f2ec 45%, #e6f1f2 100%)',
    '--blob-a': 'rgba(79, 109, 245, 0.30)',
    '--blob-b': 'rgba(157, 88, 245, 0.22)',
    '--card': 'color-mix(in srgb, rgba(255, 255, 255, 0.55) calc(var(--glass-opacity) * 100%), transparent)',
    '--inner': 'color-mix(in srgb, rgba(255, 255, 255, 0.45) calc(var(--glass-opacity) * 100%), transparent)',
    '--input-bg': 'color-mix(in srgb, rgba(255, 255, 255, 0.55) calc(var(--glass-opacity) * 100%), transparent)',
    '--glass-border': 'rgba(255, 255, 255, 0.65)',
    '--modal-bg': 'rgba(252, 253, 255, 0.96)',
    '--glass-shadow': '0 1px 2px rgba(31, 36, 48, calc(0.06 * var(--shadow-low) + 0.44 * var(--shadow-t))), 0 12px 32px rgba(31, 36, 48, var(--shadow-intensity))',
    '--ink': '#1f2430',
    '--muted': '#5b6472',
    '--accent': '#4664f0',
    '--accent-soft': 'rgba(79, 109, 245, 0.14)',
    '--border': 'rgba(31, 36, 48, 0.10)',
    '--chip-bg': 'rgba(31, 36, 48, 0.07)',
}

CLASSIC_DARK = {
    '--page': 'linear-gradient(135deg, #0e1017 0%, #171a26 45%, #0f1720 100%)',
    '--blob-a': 'rgba(123, 144, 247, 0.24)',
    '--blob-b': 'rgba(88, 235, 245, 0.13)',
    '--card': 'color-mix(in srgb, rgba(29, 33, 46, 0.55) calc(var(--glass-opacity) * 100%), transparent)',
    '--inner': 'color-mix(in srgb, rgba(255, 255, 255, 0.05) calc(var(--glass-opacity) * 100%), transparent)',
    '--input-bg': 'color-mix(in srgb, rgba(14, 16, 23, 0.55) calc(var(--glass-opacity) * 100%), transparent)',
    '--glass-border': 'rgba(255, 255, 255, 0.10)',
    '--glass-shadow': '0 1px 2px rgba(0, 0, 0, calc(0.35 * var(--shadow-low) + 0.55 * var(--shadow-t))), 0 12px 32px rgba(0, 0, 0, calc(0.42 * var(--shadow-low) + 0.48 * var(--shadow-t)))',
    '--modal-bg': 'rgba(24, 27, 37, 0.97)',
    '--ink': '#e7e9ee',
    '--muted': '#9aa1ad',
    '--accent': '#8b9df8',
    '--accent-soft': 'rgba(123, 144, 247, 0.20)',
    '--border': 'rgba(255, 255, 255, 0.10)',
    '--chip-bg': 'rgba(255, 255, 255, 0.08)',
}

QUIET_CARD = '  {\n    id: "utilitarian",\n    name: "Quiet",\n    note: "The default. A warm grey ground, solid panels and one ink-blue accent.",\n    light: { page: "#f4f3f1", card: "#ffffff", accent: "#2f5bd3", border: "rgba(28,28,26,0.12)" },\n    dark: { page: "#161615", card: "#1e1e1c", accent: "#78a8ff", border: "rgba(236,235,232,0.12)" },\n  },'

CLASSIC_CARD = '  {\n    id: "default",\n    name: "Classic",\n    note: "The original look: indigo glass over a soft gradient.",\n    light: { page: "linear-gradient(135deg,#e9edfb,#f6f2ec 45%,#e6f1f2)", card: "rgba(255,255,255,0.75)", accent: "#4664f0", border: "rgba(31,36,48,0.12)" },\n    dark: { page: "linear-gradient(135deg,#0e1017,#171a26 45%,#0f1720)", card: "rgba(29,33,46,0.85)", accent: "#8b9df8", border: "rgba(255,255,255,0.14)" },\n  },'


def test_quiet_utilitarian_palette_is_unchanged():
    light = {}
    for body in _blocks(THEMES, ':root[data-palette="utilitarian"]'):
        light.update(_decls(body))
    dark = {}
    for body in _blocks(THEMES, ':root[data-palette="utilitarian"][data-mode="dark"]'):
        dark.update(_decls(body))
    assert light == QUIET_LIGHT
    assert dark == QUIET_DARK


def test_classic_palette_is_unchanged():
    assert _first(TOKENS, ":root") == CLASSIC_LIGHT
    assert _first(TOKENS, ':root[data-mode="dark"]') == CLASSIC_DARK


def test_the_two_cards_and_presets_are_unchanged():
    assert QUIET_CARD in SETTINGS
    assert CLASSIC_CARD in SETTINGS
    assert 'utilitarian: {\n    label: "Quiet utilitarian",\n    values: { palette: "utilitarian", glass: "off", radius: "8" },' in SETTINGS
    assert 'default: {\n    label: "Classic",\n    values: { palette: "default", glass: "on", radius: "14" },' in SETTINGS
    assert 'const DEFAULT_THEME_PRESET = "utilitarian";' in SETTINGS
