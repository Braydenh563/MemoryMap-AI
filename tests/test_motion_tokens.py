"""Every transition runs on the motion tokens, and no hover is a filter.

**Why this exists (INBOX 399 (4), INBOX 405).** The owner asked for the
component quality of motion.dev, Kokonut UI and bklit.ui: one timing and one
curve family for everything that answers the pointer, so a hover here and a
press there feel like one app. Measured before this lint: 125 transitions on
`ease`, three on `ease-out`, four hand-written `cubic-bezier`s, and eleven
durations written as numbers beside the three `--motion-*` tokens DESIGN.md
names (0.15s, 0.2s, 0.25s, 0.35s, 90ms, 220ms).

And `button:hover { filter: brightness(1.07) }` on every button in the app:
a filter on hover makes the browser give the element a compositing layer for
the length of the hover and re-rasterise its text, which the owner saw as a
flicker on the chat's floating "Jump to latest" pill in the desktop window,
and a 7% brightness shift is too small to read as a state change anyway.
A hover is a colour (`--accent-surface-hover`, `--hover-veil`).

What the rules allow:

- a duration from `--motion-fast`, `--motion-base` or `--motion-slow`, or an
  off switch below one millisecond (the reduced-motion blankets);
- a curve from `--ease-out`, `--ease-in-out` or `--ease-spring`, or `linear`
  and `steps()` for something that moves at a constant rate;
- never `transition: all`, which animates properties nobody chose, layout
  ones included.

`animation` timings are not covered, on purpose: DESIGN.md ("Motion") keeps a
keyframe's own timing as part of the effect it draws.
"""

from __future__ import annotations

import re

from tests._css_paths import CSS_DIR

DECL = re.compile(
    r"(?<![-\w])(transition(?:-duration|-timing-function|-property)?)\s*:\s*([^;{}]*)[;}]"
)
DURATION = re.compile(r"(?<![\w.-])(\d*\.?\d+)(m?s)\b")
EASING = re.compile(r"\b(ease-in-out|ease-out|ease-in|ease)\b|cubic-bezier\(")


def _blank_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S)


def _declarations():
    for path in sorted(CSS_DIR.glob("*.css")):
        text = _blank_comments(path.read_text(encoding="utf-8"))
        for m in DECL.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            yield f"{path.name}:{line}", m.group(1), " ".join(m.group(2).split())


def _off_switch(number: str, unit: str) -> bool:
    ms = float(number) * (1000 if unit == "s" else 1)
    return ms < 1


def _bad_duration(value: str) -> list[str]:
    bare = re.sub(r"var\(--[\w-]+\)", "", value)
    return [n + u for n, u in DURATION.findall(bare) if not _off_switch(n, u)]


def _bad_easing(value: str) -> list[str]:
    bare = re.sub(r"var\(--[\w-]+\)", "", value)
    return [m.group(0) for m in EASING.finditer(bare)]


def test_the_rules_know_the_shapes():
    assert _bad_duration("opacity 0.15s ease") == ["0.15s"]
    assert _bad_duration("opacity var(--motion-fast) var(--ease-out)") == []
    assert _bad_duration("0.001ms !important") == []
    assert _bad_easing("opacity var(--motion-fast) ease") == ["ease"]
    assert _bad_easing("transform var(--motion-base) cubic-bezier(0.2, 0.8, 0.2, 1)") == ["cubic-bezier("]
    assert _bad_easing("transform var(--motion-fast) linear") == []


def test_no_transition_animates_everything():
    offenders = [
        f"{where}: {prop}: {value}"
        for where, prop, value in _declarations()
        if prop in ("transition", "transition-property") and re.search(r"(^|[\s,])all\b", value)
    ]
    assert not offenders, (
        "`transition: all` animates properties nobody chose, layout ones "
        "included. Name them:\n" + "\n".join(offenders)
    )


def test_every_transition_duration_is_a_token():
    offenders = [
        f"{where}: {prop}: {value}"
        for where, prop, value in _declarations()
        if prop in ("transition", "transition-duration") and _bad_duration(value)
    ]
    assert not offenders, (
        "A transition's duration is `--motion-fast`, `--motion-base` or "
        "`--motion-slow` (DESIGN.md, Motion):\n" + "\n".join(offenders)
    )


def _split_top(value: str) -> list[str]:
    parts, depth, cur = [], 0, ""
    for ch in value:
        depth += {"(": 1, ")": -1}.get(ch, 0)
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
            continue
        cur += ch
    parts.append(cur)
    return parts


def _curveless(value: str) -> bool:
    """An item with a duration and no curve runs on `ease`, the untokened default."""
    for item in _split_top(value):
        timed = "var(--motion-" in item or DURATION.search(re.sub(r"var\(--[\w-]+\)", "", item))
        if timed and not re.search(r"var\(--ease-|\blinear\b|steps\(", item) and "!important" not in item:
            return True
    return False


def test_every_transition_curve_is_a_token():
    assert _curveless("background var(--motion-slow), color var(--motion-slow) var(--ease-out)")
    assert not _curveless("opacity var(--motion-fast) var(--ease-out), visibility var(--motion-fast) linear")
    offenders = [
        f"{where}: {prop}: {value}"
        for where, prop, value in _declarations()
        if (prop in ("transition", "transition-timing-function") and _bad_easing(value))
        or (prop == "transition" and _curveless(value))
    ]
    assert not offenders, (
        "A transition's curve is `--ease-out`, `--ease-in-out` or "
        "`--ease-spring` (00-tokens-shell.css), or `linear`:\n" + "\n".join(offenders)
    )


def _rules(text: str):
    """Yield (line, selector, body) for every innermost rule."""
    text = _blank_comments(text)
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", text):
        selector = m.group(1).strip()
        if selector.startswith("@"):
            continue
        yield text.count("\n", 0, m.start(1)) + 1, selector, m.group(2)


def test_no_hover_is_a_filter():
    offenders = []
    for path in sorted(CSS_DIR.glob("*.css")):
        for line, selector, body in _rules(path.read_text(encoding="utf-8")):
            if ":hover" not in selector:
                continue
            if re.search(r"(?<![-\w])filter\s*:", body):
                offenders.append(f"{path.name}:{line}: {selector.splitlines()[-1].strip()}")
    assert not offenders, (
        "A hover is a colour, never a `filter`: a filter gives the element a "
        "compositing layer for the hover and re-rasterises its text (INBOX "
        "405). Use `--accent-surface-hover` on a solid button, "
        "`--hover-veil` as a `background-image` over any other ground:\n"
        + "\n".join(offenders)
    )


def test_the_reduced_motion_blankets_stop_transitions_outright():
    """**An off switch is zero, not almost zero** (the companion's menu, the
    owner: "the right click companion popup still doesnt appear next to the
    companion and instead at the top of the screen", reported several times).

    `transition-property` is `all` on every element unless it says otherwise,
    so a blanket that sets `transition-duration: 0.01ms` does not remove
    transitions: it gives every element in the app a real one, on every
    property. A transition runs from the next frame, and until then a
    `getBoundingClientRect` after a style write reads where the element was:
    measured with the system's reduced-motion hint on, the escaped menu read
    at 0,904 straight after `left: 0; top: 0` was written, and the companion
    placed its menu from that rect, 276 to 565px from the companion, some of
    it off screen (`scratchpad/ui-sweeps/companionmenulow.js`, 12 of 12
    openings under the hint, 0 of 24 without). A zero duration and a zero
    delay start no transition at all, which is what the blanket means."""
    blankets = []
    for path in sorted(CSS_DIR.glob("*.css")):
        text = _blank_comments(path.read_text(encoding="utf-8"))
        for m in re.finditer(r"\{([^{}]*animation-iteration-count:\s*1\s*!important[^{}]*)\}", text):
            blankets.append((path.name, m.group(1)))
    assert len(blankets) >= 2, "the reduced-motion blankets moved; point this lint at them"
    for name, body in blankets:
        duration = re.search(r"transition-duration:\s*([^;]+);", body)
        delay = re.search(r"transition-delay:\s*([^;]+);", body)
        assert duration and duration.group(1).strip() == "0s !important", f"{name}: {duration and duration.group(1)}"
        assert delay and delay.group(1).strip() == "0s !important", f"{name}: a delay starts a transition too"
