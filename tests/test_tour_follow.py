"""The guided tour follows what it points at, reaches folded settings and
says when there is no mind map (INBOX 426 y, images 87, 95, 96).

Measured with `scratchpad/ui-sweeps/tourfollow.js`: with content growing
above the companion step's control (no scroll, no resize), the old tour left
its ring 180px off the control; now 0. `tourfirst.js` walks basics into Notes
and the Settings section at 1184 to 1600 wide: the card covers its control in
no 50ms sample from the moment it shows, and the companion step (in the
closed "Atlas and faces" fold on a fresh notebook, so dropped from every run
before) is shown. `tourmaps.js`: with no map the maps section is one card that
says so.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOUR = (ROOT / "frontend" / "tour.js").read_text(encoding="utf-8")


def _body(name: str) -> str:
    start = TOUR.index(f"function {name}(")
    return TOUR[start : TOUR.index("\n}\n", start)]


def test_placement_keeps_the_wanted_box_and_never_nudges_a_frame_later() -> None:
    place = _body("tourPlaceFixed")
    assert "el._tourWant =" in place
    assert "requestAnimationFrame" not in place


def test_a_showing_step_is_watched_every_frame() -> None:
    watch = _body("tourWatchFrame")
    assert "requestAnimationFrame(tourWatchFrame)" in watch
    assert "_tourWant" in watch
    assert "tourPosition()" in watch
    show = _body("tourShow")
    assert "tourWatch();" in show


def test_a_settings_step_opens_the_fold_its_control_is_in_and_the_close_folds_it() -> None:
    assert "tourOpenFoldsAround(step);" in _body("tourNavigate")
    assert "fold.open = true;" in _body("tourOpenFoldsAround")
    assert "fold.open = false;" in _body("tourClose")


def test_the_maps_section_says_when_there_is_no_map() -> None:
    assert 'unless: "map",' in TOUR
    assert "run.step.unlessText" in _body("tourRender")


def test_atlas_in_the_guide_head_is_a_disc_sized_to_the_title() -> None:
    """Image 86: the bust drawn in the guide head's 32px mark painted 47 by
    62px, hung 28px below the head and sat 15px under the middle of its two
    lines. The head's mark is a 2.5rem disc that keeps the drawing inside it
    (`guidehead.js`: centred on the words to 0px, inside the head, at 1440
    and 390)."""
    import re

    css = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    rule = re.search(r"\.sheet-card-corner \.sheet-title > \.atlas-mark\s*\{([^}]*)\}", css)
    assert rule, "the guide head's mark has no rule of its own"
    assert "overflow: hidden" in rule.group(1)
    assert "height: 2.5rem" in rule.group(1)
