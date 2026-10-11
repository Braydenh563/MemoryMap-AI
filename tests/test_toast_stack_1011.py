"""The corner's toast stack (the owner 2026-10-11: "lots of the same
notifcations dont neatly stack when they appear fast in the corner").

Driven by `scratchpad/ui-sweeps/toaststack.js` at 1440 and 390: ten identical
toasts and five different ones inside 500 ms are one card counting ten plus
the others, no two cards overlap at any frame, three show plus "+N more"."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / "frontend/js/status.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend/css/01-forms-settings.css").read_text(encoding="utf-8")
DESIGN = (ROOT / "docs/DESIGN.md").read_text(encoding="utf-8")


def _fn(name: str) -> str:
    start = JS.index(f"function {name}(")
    return JS[start : JS.index("\n}\n", start)]


def test_the_same_notice_merges_with_a_count_and_a_fresh_timer():
    merge = _fn("toastMerge")
    assert "t.toastKey === key && t.toastAct === act" in merge
    assert "TOAST_MERGE_MS" in merge
    assert "`×${same.toastCount}`" in merge
    assert "clearTimeout(same.toastTimer)" in merge and "setTimeout(() => dismissToast(same)" in merge
    assert "if (toastMerge(box, key, action?.[1] || null)) return;" in _fn("toast")


def test_an_undo_merges_only_with_the_same_undo():
    action = _fn("toastAction")
    assert "if (toastMerge(box, key, onAction)) return;" in action
    # The progress toast never merges: its key is null.
    assert "toastMark(note, null," in _fn("toastProgress")


def test_a_double_fired_gesture_is_one_notice_but_a_later_repeat_counts():
    toast = _fn("toast")
    assert "if (key === lastToastKey) return;" in toast
    assert re.search(r"setTimeout\(\(\) => \{\s*if \(lastToastKey === key\) lastToastKey = \"\";\s*\}, 0\)", toast)
    assert "now - lastToastAt < 400" not in JS


def test_three_show_and_the_rest_fold_into_one_card_that_opens_the_bell():
    assert "const TOAST_VISIBLE = 3;" in JS
    layout = _fn("toastLayout")
    assert "live.slice(TOAST_VISIBLE)" in layout
    assert '$("notif-btn")?.click()' in layout
    assert "recordNotification(" in layout
    assert re.search(r"\.toast\.is-folded \{\s*display: none;", CSS)


def test_arrivals_ride_with_the_stack_and_a_card_leaves_in_place():
    stack = _fn("toastStack")
    assert "toastLayout(box)" in stack
    assert "translate: `0 ${shift || step}px`" in stack
    assert "toastReduced()" in stack
    toast_in = re.search(r"@keyframes toast-in \{(.*?)\n\}", CSS, re.S).group(1)
    toast_out = re.search(r"@keyframes toast-out \{(.*?)\n\}", CSS, re.S).group(1)
    assert "translate" not in toast_in and "translate" not in toast_out
    # Reduced motion: the slide is the JS's alone, so it stops there; the fades
    # stay with Interface animations (test_motion_tokens).
    reduced = _fn("toastReduced")
    assert "prefers-reduced-motion: reduce" in reduced and 'dataset.motion === "reduced"' in reduced


def test_the_stack_gap_is_a_spacing_token():
    for sel in ("#toast-box", ".toast-host"):
        body = re.search(re.escape(sel) + r" \{([^}]*)\}", CSS).group(1)
        assert "gap: var(--space-2);" in body


def test_the_recipe_says_so():
    assert "toastMerge" in DESIGN and "+N more" in DESIGN
