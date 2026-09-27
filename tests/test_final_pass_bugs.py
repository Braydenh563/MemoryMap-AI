"""The final pass's bug scan of the branch's frontend changes (wrap-up
ledger 0927): each test names the bug it pins.

Read as text, like the other frontend lints: these are the shapes of the
fixes, each measured or reasoned in its comment.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIGHTBOX = (ROOT / "frontend" / "lightbox-view.js").read_text(encoding="utf-8")
CATEGORIES = (ROOT / "frontend" / "categories-panel.js").read_text(encoding="utf-8")
AV = (ROOT / "frontend" / "avatars.js").read_text(encoding="utf-8")


def _fn(src: str, name: str) -> str:
    start = src.index(f"function {name}(")
    return src[start : src.index("\n}\n", start) + 2]


def test_a_zoom_left_on_the_other_viewer_is_cleared() -> None:
    # The lightbox zooms the picture or the PDF page column, whichever is
    # shown. Paging from a zoomed PDF to a picture reset only the picture,
    # and the next PDF opened at the old scale with the zoom reading 100%.
    body = LIGHTBOX[LIGHTBOX.index("const applyZoom = () => {") :]
    body = body[: body.index("\n  };\n")]
    assert "const other = isImg ? pdfPages : img;" in body
    assert 'other.style.transform = "";' in body and 'other.classList.remove("zoomed");' in body


def test_a_split_is_sent_once_and_survives_a_note_without_text() -> None:
    # Two presses of Move to new category asked the server to split notes
    # already moved; a note with no `content` (an image) threw while the
    # sheet was being built, so it never opened.
    assert "if (apply.disabled) return;" in CATEGORIES and "apply.disabled = false;" in CATEGORIES
    assert 'String(entry.content || "").slice(0, 80)' in CATEGORIES
    assert "entry.content.slice(" not in CATEGORIES


def test_a_companion_shown_again_starts_fresh() -> None:
    # `nmb.act` outlived the companion: shown again after hiding it asleep,
    # the new one counted as asleep and was carried in by the sleeping fade;
    # pending pose frames and a grumpy spell's pout landed on the new one.
    gone = _fn(AV, "nameMarkBuddyGone")
    for part in ('nmb.act = "";', "clearTimeout(nmb.poutTimer);", "for (const t of nmb.poseSteps || []) clearTimeout(t);", "nmb.wokeAt = 0;"):
        assert part in gone, part
    assert "if (!buddy.isConnected) return;\n        buddy.classList.remove(\"nmb-grumpy\");" in AV


NAV = (ROOT / "frontend" / "navigation.js").read_text(encoding="utf-8")


def test_a_declined_leave_puts_the_history_step_back() -> None:
    # With unsaved work, Back asks "Leave without saving?". Cancel kept the
    # tab but the history stack had already stepped and the address named
    # the old tab (unsavedback.js: after Cancel, shown notes, hash
    # #/dashboard, stack at dashboard; now all three say notes). The step
    # also went on to open the entry's note or board in the hidden tab.
    assert "tabSwitchDeclined = !leave;" in _fn(NAV, "confirmLeavingUnsavedWork")
    assert "if (tabSwitchDeclined) return;" in _fn(NAV, "openHistoryEntry")
    walk = _fn(NAV, "goToTabHistory")
    assert "tabHistory.index = from;" in walk and "history.go(from - next);" in walk
