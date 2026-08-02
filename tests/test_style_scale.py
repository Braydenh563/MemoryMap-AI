"""Spacing stays on the scale (roadmap §35L).

Asked for repeatedly, and in the end bluntly:

> *"the way spacing, alignment and margins of all the ui features in each tab
> aren't consistent and it changes each tab. I want the UI across the
> application to be very professional, consistent and clean. not to look like
> it is just a bunch of ai generated slop features joined together."*

That description was accurate, and the cause was structural rather than
cosmetic: `style.css` had 667 margin/padding/gap declarations across more than
twenty-five distinct values, seven of them between 0.3rem and 0.6rem — all
meaning "a small gap", all slightly different, and each one a place where two
things that should line up nearly do.

**This test is the part that makes the fix hold.** Extracting a scale and
converting the file is a one-off; without something that fails, the next tab
built in the next session reaches for whatever looks right at the time and the
drift starts again. §35L calls this out explicitly: "a lint that fails on a raw
px margin or padding outside the token block, so tab seven cannot reintroduce
the problem. This is the step that makes it stick; without it this section will
be rewritten in six months."

The scale is deliberately generous — nine steps, fitted to the distribution
that was already in the file rather than imposed on it, so adopting it moved
nothing by more than 0.1rem. If a value genuinely needs to be off-scale, add it
to ALLOWED with the reason. Being made to write the reason is the point.
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

STYLE = Path(__file__).resolve().parents[1] / "frontend" / "style.css"

#: The scale, in rem. Mirrors the --space-* custom properties in :root.
SCALE = {0.05, 0.1, 0.15, 0.25, 0.4, 0.5, 0.6, 0.8, 1.0, 1.25, 1.5, 2.0}

#: Off-scale values that earn their place. Keep this list short, and keep the
#: reasons real — an entry with a vague reason is a value that should have been
#: snapped to the scale instead.
ALLOWED = {
    # Indent steps for the document outline: each level is one nesting depth,
    # and they have to stay evenly spaced relative to each other rather than
    # land on a scale built for gaps between unrelated things.
    1.65,
    2.4,
    # A negative pull-back that cancels a list's own indent exactly.
    1.1,
}

SPACING = re.compile(
    r"\b(?:margin|padding|gap|row-gap|column-gap)"
    r"(?:-top|-right|-bottom|-left|-inline|-block)?\s*:\s*([^;{}]+);"
)
VALUE = re.compile(r"(?<![\w.-])(-?[0-9]*\.?[0-9]+)rem\b")


def _stylesheet() -> str:
    """style.css with comments stripped.

    The comments here explain layout decisions, so they quote lengths — and a
    naive scan reads those as real declarations. `test_frontend_ids.py` had to
    learn the same lesson about markup comments quoting ids.
    """
    return re.sub(r"/\*.*?\*/", "", STYLE.read_text(encoding="utf-8"), flags=re.S)


def _offenders() -> Counter:
    text = _stylesheet()
    found: Counter = Counter()
    for declaration in SPACING.findall(text):
        for raw in VALUE.findall(declaration):
            size = abs(float(raw))
            if size and size not in SCALE and size not in ALLOWED:
                found[size] += 1
    return found


def test_every_spacing_value_is_on_the_scale():
    offenders = _offenders()
    assert not offenders, (
        "These margin/padding/gap values are off the spacing scale:\n  "
        + "\n  ".join(f"{size}rem — used {n}×" for size, n in sorted(offenders.items()))
        + "\n\nUse a --space-* step (see :root in style.css). If the value is "
        "genuinely special, add it to ALLOWED in this file with the reason."
    )


def test_the_scale_is_actually_declared():
    """The test and the stylesheet must agree, or this passes while the
    properties it is protecting have been renamed out from under it."""
    text = _stylesheet()
    declared = {
        float(m) for m in re.findall(r"--space-\d+:\s*([0-9.]+)rem;", text)
    }
    assert declared, "no --space-* custom properties found in style.css"
    assert declared <= SCALE, f"declared but not in SCALE: {sorted(declared - SCALE)}"


def test_the_scale_did_not_quietly_grow():
    """Nine steps is a scale; twenty is the problem this replaced. A new step
    should be a deliberate decision, not something that accretes."""
    text = _stylesheet()
    assert len(re.findall(r"--space-\d+:", text)) <= 10


# --- type ---------------------------------------------------------------------

#: The type scale, in rem. Mirrors the --text-* custom properties.
TYPE_SCALE = {0.7, 0.75, 0.8, 0.85, 0.92, 1.0, 1.15, 1.3, 1.7, 2.2}

#: Single hero elements, each the only thing at its size. A display size is a
#: deliberate one-off, not a step other components should reach for.
TYPE_ALLOWED = {2.4, 2.6, 2.8}

FONT_SIZE = re.compile(r"\bfont-size\s*:\s*([^;{}]+);")


def test_every_font_size_is_on_the_scale():
    """Thirty-seven distinct sizes, nine of them between 0.74 and 0.85rem.

    Text that is *almost* the same size in two adjacent components is the
    texture the report called "a bunch of ai generated slop features joined
    together" — nothing quite lines up, and no size means anything because
    every one is slightly its own.
    """
    offenders = Counter()
    for declaration in FONT_SIZE.findall(_stylesheet()):
        for raw in VALUE.findall(declaration):
            size = abs(float(raw))
            if size and size not in TYPE_SCALE and size not in TYPE_ALLOWED:
                offenders[size] += 1
    assert not offenders, (
        "Off-scale font sizes:\n  "
        + "\n  ".join(f"{s}rem — used {n}×" for s, n in sorted(offenders.items()))
        + "\n\nUse a --text-* step (see :root in style.css)."
    )


# --- corners ------------------------------------------------------------------

RADIUS = re.compile(r"\bborder(?:-[a-z]+)?-radius\s*:\s*([^;{}]+);")
PX = re.compile(r"(?<![\w.-])([0-9]+)px\b")


def test_no_corner_is_hard_coded_in_pixels():
    """Corners have to follow the slider in Settings → Appearance.

    Everything rounded used to be one of twelve hard-coded pixel values, none
    of which moved when that slider did — so choosing square corners squared
    the cards and left every chip, popup and button rounded, and adjacent
    surfaces at 8px and 10px read as belonging to different applications.

    The tiers are multiples of --radius, so this is a property about the whole
    interface responding to one setting, not only about consistency.
    """
    offenders = Counter()
    for declaration in RADIUS.findall(_stylesheet()):
        # calc(var(--radius) * 0.6) is the point, not a violation.
        if "var(--radius" in declaration:
            continue
        for raw in PX.findall(declaration):
            offenders[int(raw)] += 1
    assert not offenders, (
        "Hard-coded corner radii:\n  "
        + "\n  ".join(f"{px}px — used {n}×" for px, n in sorted(offenders.items()))
        + "\n\nUse --radius-sm / --radius-md / --radius-lg / --radius-pill."
    )


def test_the_corner_tiers_are_derived_from_the_setting():
    """If a tier is ever pinned to a constant, the slider silently stops
    reaching whatever uses it — which is the bug this replaced."""
    text = _stylesheet()
    for tier in ("--radius-sm", "--radius-md", "--radius-lg"):
        line = re.search(rf"{tier}:\s*([^;]+);", text)
        assert line, f"{tier} is not declared"
        assert "var(--radius)" in line.group(1), f"{tier} does not follow --radius"


# --- the page shell -----------------------------------------------------------

#: Containers that sit directly inside a tab page. Each one used to draw its
#: own outer gutter, and no two agreed — see .tab-page in style.css.
PAGE_CONTAINERS = (".layout", ".doc-layout", ".dash-hero", ".reminders-card", "#graph-card")


def test_no_page_draws_its_own_outer_gutter():
    """Seven tabs had four gutter treatments between them.

    The side inset was 2rem in five separate rules, but the space above the
    first element was 1rem on Notes and Chat, 0 on Documents and 0.8rem on the
    Dashboard, Reminders and Graph — each *on top of* .tab-page's own 0.8rem.
    Content therefore began 1.8rem down one tab and 0.8rem down the next,
    which is the page-level form of "spacing… changes each tab".

    A page container may set its internal gap. The distance from the window is
    the shell's business, and only the shell's.
    """
    text = _stylesheet()
    offenders = []
    for selector in PAGE_CONTAINERS:
        # `margin` is what holds a box away from the window, so a horizontal
        # margin on a page container *is* a gutter however it is spelled.
        # `padding` is internal — .dash-hero is a visible panel and its own
        # padding is none of the shell's business — except on the pure grid
        # wrappers below, which have no background and nothing to pad.
        props = "padding|margin" if selector in (".layout", ".doc-layout") else "margin"
        for m in re.finditer(rf"(?m)^{re.escape(selector)}[^{{,]*\{{([^}}]*)\}}", text):
            for prop, value in re.findall(rf"\b({props})\s*:\s*([^;]+);", m.group(1)):
                parts = value.split()
                horizontal = parts[1] if len(parts) > 1 else parts[0]
                if horizontal not in ("0", "auto"):
                    offenders.append(f"{selector} {{ {prop}: {value}; }}")
    assert not offenders, (
        "These page containers set their own outer inset:\n  "
        + "\n  ".join(offenders)
        + "\n\nThe gutter belongs to .tab-page (--page-gutter). Set only the "
        "internal gap here."
    )


def test_the_shell_is_declared_once_and_responsively():
    """One place to tighten on a narrow window. Per-page media queries shrinking
    to different numbers is how the desktop drift got reproduced on mobile."""
    text = _stylesheet()
    for token in ("--page-gutter", "--page-top", "--page-bottom"):
        assert f"{token}:" in text, f"{token} is not declared"
        assert f"var({token})" in text, f"{token} is declared but never used"
    assert "padding: var(--page-top) var(--page-gutter) var(--page-bottom);" in text


# --- colour -------------------------------------------------------------------

#: Tokens whose fallback is legitimate: a font stack has to name real families,
#: and an opacity needs a number when the art is off.
FALLBACK_ALLOWED = {"--mono", "--ui-font", "--bg-art-opacity", "--modal-bg", "--chip-bg"}

VAR_WITH_FALLBACK = re.compile(r"var\(\s*(--[\w-]+)\s*,")
DECLARED = re.compile(r"(?m)^\s*(--[\w-]+)\s*:")


def test_no_token_is_used_with_a_dead_fallback():
    """`var(--danger, #e2534b)` in six rules, and `--danger` declared nowhere.

    All six therefore rendered the hard-coded red in *both* themes, ignoring
    the theme-aware `--error` that already existed and is a different colour in
    dark mode. `var(--text-muted, inherit)` was the same bug quieter still — it
    simply inherited, so the text was never muted at all.

    A fallback on a token that IS declared is dead code with a sharper edge: it
    looks like a safety net and is actually a way for a rename to silently stop
    applying, since the rule keeps working while quietly showing the wrong
    colour. Either the token exists — use it plainly — or it does not, and the
    fallback is hiding a bug.
    """
    text = _stylesheet()
    declared = set(DECLARED.findall(text))
    offenders = sorted(
        {
            name
            for name in VAR_WITH_FALLBACK.findall(text)
            if name not in FALLBACK_ALLOWED
        }
    )
    detail = [
        f"{name} — {'declared, so the fallback is dead code' if name in declared else 'NOT DECLARED, so the fallback is what renders'}"
        for name in offenders
    ]
    assert not offenders, "Tokens used with a fallback:\n  " + "\n  ".join(detail)


def test_the_semantic_colour_set_is_complete_in_both_themes():
    """Every state colour needs a dark-mode value, or a component using it is
    unreadable on one of the two themes the app ships with."""
    text = _stylesheet()
    for token in ("--ok", "--warn", "--error", "--accent", "--muted", "--ink"):
        assert len(re.findall(rf"(?m)^\s*{token}\s*:", text)) >= 2, (
            f"{token} is declared once — it needs a dark-mode value too"
        )
