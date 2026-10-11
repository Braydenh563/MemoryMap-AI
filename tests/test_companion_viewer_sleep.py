"""The companion asleep in its large view, and its focus (the owner, 2026-10-11).

"the zzz isnt animated ... on this panel"; a blue rounded rectangle round the
sleeping companion; "a bit glitchy" under load. Measured in a browser by
`scratchpad/ui-sweeps/viewersleep.js` (the Zs' running animations and
opacity over 7s in the view, the ring after a click and after Tab, CPU=6 for
CDP throttling). These pin the wiring those numbers rest on.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AV = (ROOT / "frontend" / "js" / "avatars.js").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")


def _fn(name: str) -> str:
    start = AV.index(f"function {name}(")
    return AV[start : AV.index("\n}\n", start) + 2]


def test_falling_asleep_ends_the_act_under_way() -> None:
    # A wave held on under the Zs was the stuck pose (viewersleep.js:
    # "nmb-act-wave nmb-sleep" for 7s).
    tick = _fn("nameMarkBuddyTick")
    branch = tick[tick.index("if (idle > NMB_SLEEP_MS && !awake)") :]
    end = branch.index('nameMarkBuddyAct("")')
    assert end < branch.index('buddy.classList.add("nmb-sleep")')
    assert "!NMB_RESTING_ACTS.has(nmb.act)" in branch[:end]


def test_coming_back_to_the_page_ends_an_act_whose_timer_hiding_cleared() -> None:
    listener = AV[AV.index("//: Back after a long absence, it is found asleep") - 400 :]
    listener = listener[: listener.index("nameMarkBuddySchedule();")]
    assert 'if (nmb.act && !NMB_RESTING_ACTS.has(nmb.act)) nameMarkBuddyAct("");' in listener


def test_arriving_in_the_view_under_a_still_pointer_is_not_a_hover() -> None:
    visit = _fn("nameMarkBuddyVisit")
    assert "at: Date.now()" in visit
    enter = AV[AV.index('face.addEventListener("pointerenter"') :]
    enter = enter[: enter.index("nameMarkBuddyHover(0);")]
    assert "nmb.visit && Date.now() - nmb.visit.at < NMB_VISIT_SETTLE_MS" in enter


def test_its_focus_is_a_glow_from_the_keyboard_only() -> None:
    assert re.search(r"#nm-buddy \.nm-buddy-face:is\(:focus, :focus-visible\) \{ outline: none; \}", CSS)
    glow = CSS[CSS.index("#nm-buddy .nm-buddy-face::before {") :]
    glow = glow[: glow.index("}")]
    assert "border-radius: 50%" in glow and "radial-gradient" in glow and "opacity: 0" in glow
    assert "#nm-buddy .nm-buddy-face:focus-visible::before { opacity: 1; }" in CSS
    # No filter on the moving figure for it.
    assert "drop-shadow" not in glow
