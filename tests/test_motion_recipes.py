"""The motion pass stays a recipe, and stays cheap (INBOX 459 (2)).

The owner asked for "cheap css animations to things like the horizontal pill
selectors and sidebars ... but dont over do it in a vibecoded way". DESIGN.md's
recipe index has one "Motion" row for what came of it; this holds the row:

- **One indicator.** A selection that moves between options (a `.seg`, the top
  bar's tabs, the sub-tab strips, the Settings nav) is drawn by one shared
  rule: the strip's `::before`, anchored (`position-anchor: --glide`) to the
  option carrying `.active`. A second indicator, per control or in script, is
  how ten strips end up moving ten ways. So `--glide` is named once as an
  anchor and used once as a position anchor, inside the `@supports
  (anchor-scope ...)` gate that keeps an engine without scoped anchors on the
  old instant fill, and no script writes an anchor name.
- **Only the compositor's properties move.** Every rule in a section headed
  `/* --- motion:` transitions or starts from `opacity`, `transform`,
  `translate`, `scale` or a colour, and nothing else. The one exception is the
  indicator's four insets, which is the trade DESIGN.md writes down (an
  out-of-flow box of its own, measured by `scratchpad/ui-sweeps/glide.js`);
  it is allowed in that one rule and nowhere else, so a second inset
  transition cannot ride in on the first one's reason.

Reduced motion is not a rule here because it is not per rule: the two
blankets in 02-chat-graph.css zero every transition's duration, `::before`
included, and `glide.js` (REDUCED=1, APPEARANCE=1) measures that the indicator
lands at once under both. Like the other frontend lints this cannot see the
DOM; the sweep is what runs against a browser.
"""

from __future__ import annotations

import re

from tests._css_paths import CSS_DIR

ROOT = CSS_DIR.parents[1]
JS_DIR = ROOT / "frontend" / "js"

#: What a motion rule may move. Colours change paint, not layout, and a label
#: that changes colour as the fill arrives under it is part of the glide.
COMPOSITOR = {
    "opacity", "transform", "translate", "scale", "rotate",
    "color", "background-color", "box-shadow",
    # `display` and `overlay` with `allow-discrete` only hold an element
    # in the tree for an exit fade; they animate nothing themselves.
    "display", "overlay",
}
INSETS = {"top", "right", "bottom", "left"}
NOT_PROPERTIES = {
    "ease", "ease-in", "ease-out", "ease-in-out", "linear", "allow-discrete",
    "none", "normal",
}


def _blank_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)


def _sheets() -> dict[str, str]:
    return {p.name: p.read_text(encoding="utf-8") for p in sorted(CSS_DIR.glob("*.css"))}


def _motion_sections() -> list[tuple[str, int, str]]:
    """Every `/* --- motion: ...` section: (file, first line, its CSS with
    comments blanked), running to the next `/* ---` head or the file's end."""
    out = []
    for name, text in _sheets().items():
        heads = [m.start() for m in re.finditer(r"/\* ---", text)]
        for i, start in enumerate(heads):
            if not text.startswith("/* --- motion:", start):
                continue
            end = heads[i + 1] if i + 1 < len(heads) else len(text)
            out.append((name, text.count("\n", 0, start) + 1, _blank_comments(text[start:end])))
    return out


def _rules(css: str):
    """(selector, body) for every innermost rule, at-rules unwrapped."""
    for m in re.finditer(r"([^{};]+)\{([^{}]*)\}", css):
        yield " ".join(m.group(1).split()), m.group(2)


def _transitioned(body: str) -> set[str]:
    found: set[str] = set()
    for m in re.finditer(r"(?<![-\w])transition(?:-property)?\s*:([^;]*)", body):
        value = re.sub(r"var\([^)]*\)", " ", m.group(1))
        for part in value.split(","):
            for token in part.split():
                token = token.lower()
                if token in NOT_PROPERTIES or re.match(r"^[\d.]+m?s$", token):
                    continue
                found.add(token)
    return found


def test_there_are_motion_sections_to_check():
    names = {name for name, _, _ in _motion_sections()}
    assert names, "no `/* --- motion:` section found: the lint below would pass on nothing"


def test_motion_rules_move_only_what_the_compositor_moves():
    offenders = []
    for name, line, css in _motion_sections():
        for selector, body in _rules(css):
            moved = _transitioned(body)
            allowed = COMPOSITOR | (INSETS if "position-anchor: --glide" in " ".join(body.split()) else set())
            bad = sorted(moved - allowed)
            if bad:
                offenders.append(f"{name} (section from line {line}): `{selector}` transitions {', '.join(bad)}")
    assert not offenders, "\n".join(offenders) + (
        "\n\nA motion rule moves opacity, transform, translate, scale or a colour "
        "(DESIGN.md, the recipe index's Motion row). The selection indicator's "
        "insets are the one exception and live in its own rule."
    )


def test_starting_styles_in_motion_sections_set_only_compositor_properties():
    offenders = []
    for name, line, css in _motion_sections():
        for m in re.finditer(r"@starting-style\s*\{", css):
            depth, i = 1, m.end()
            while depth and i < len(css):
                depth += {"{": 1, "}": -1}.get(css[i], 0)
                i += 1
            for selector, body in _rules(css[m.end():i - 1]):
                props = {p.group(1).lower() for p in re.finditer(r"(?<![-\w])([a-z-]+)\s*:", body)}
                bad = sorted(props - COMPOSITOR)
                if bad:
                    offenders.append(f"{name} (section from line {line}): @starting-style `{selector}` sets {', '.join(bad)}")
    assert not offenders, "\n".join(offenders)


def test_the_selection_indicator_is_one_recipe():
    css = "".join(_blank_comments(t) for t in _sheets().values())
    flat = " ".join(css.split())
    anchors = re.findall(r"anchor-name\s*:\s*--glide\b", flat)
    users = re.findall(r"position-anchor\s*:\s*--glide\b", flat)
    assert len(anchors) == 1, f"`anchor-name: --glide` is declared {len(anchors)} times; one rule names the chosen option"
    assert len(users) == 1, f"`position-anchor: --glide` is declared {len(users)} times; one indicator recipe draws every strip"
    gate = flat.find("@supports (anchor-scope: --a)")
    assert gate != -1 and gate < flat.find("position-anchor: --glide"), (
        "the indicator must sit inside `@supports (anchor-scope: --a)`: without "
        "scoped names every strip's indicator would anchor to one option"
    )
    # No other position anchor is transitioned: the inset trade is the glide's alone.
    for selector, body in _rules(css):
        b = " ".join(body.split())
        if "position-anchor" in b and "--glide" not in b:
            assert not (_transitioned(body) & INSETS), f"`{selector}` transitions an anchored inset"


def test_no_script_names_an_anchor():
    offenders = [
        p.name for p in sorted(JS_DIR.glob("*.js"))
        if re.search(r"anchorName|anchor-name|positionAnchor|position-anchor", p.read_text(encoding="utf-8"))
    ]
    assert not offenders, (
        f"{offenders} set an anchor in script: the glide is CSS alone, moved by the `.active` class "
        "every strip already sets"
    )
