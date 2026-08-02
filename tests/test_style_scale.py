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
