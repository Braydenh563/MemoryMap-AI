"""A laser pointer while presenting (INBOX 797, canvasdepth; Excalidraw's and
tldraw's; WHITEBOARD_PLAN "canvasdepth, ranked" row 9). L or the bar's
button; the trail fades by CSS, so no frame loop is added (the wake-source
ratchet holds whiteboard.js's count), and nothing is drawn on the board. The
browser half is `scratchpad/ui-sweeps/wblaser.js`."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WB = (ROOT / "frontend" / "js" / "whiteboard.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "library-lazy.css").read_text(encoding="utf-8")


def _body(name: str) -> str:
    start = WB.index(f"function {name}(")
    return WB[start : WB.index("\n}\n", start)]


def test_the_laser_is_wired_and_ends_with_the_presentation():
    assert "wbPresentLaser(false)" in _body("wbStopPresenting")
    assert "wbPresentLaserButton()" in _body("wbStartPresenting")
    trail = _body("wbLaserTrail")
    assert "requestAnimationFrame" not in trail and "animationend" in trail
    assert 'event.key === "l"' in WB


def test_the_trail_fades_by_itself_and_respects_reduced_motion():
    assert "@keyframes wb-laser-fade" in CSS
    reduced = CSS[CSS.index("@keyframes wb-laser-fade") :]
    assert "prefers-reduced-motion" in reduced
