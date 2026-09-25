"""The companion moves on its own time and rides with the panel it is on.

INBOX 426, the owner: "they still telleport and move suddenly as well and it
is jarring"; "atlas needs to move and work on its own time not based off how
fast the user is switching tabs or scrolling. if it is sitting on a pannel and
I scroll or that panel moves it might fall or move with the panel"; "it keeps
disappearing and reappearing on different parts of the page as I scroll";
"when I press the option to stay in the same spot across pages ... it still
moves"; "the companion just went off the screen and I cant get it back now";
"the right click companion dropdown menu doesnt appear where the companion
is"; "I changed my name but the companion which was me didnt update".

The motion itself is measured in a browser by
`scratchpad/ui-sweeps/companionscroll.js` (a per-frame trace over a scroll:
glued within 2px, no frame jump past 45px beyond its panel's own, never
below full opacity) and `companionbeats.js` (fast tab switching, pinning,
resize, the menu's place, call back, no frame loop when idle). These tests
pin the wiring that makes those numbers true, so a later edit cannot quietly
put the old behaviour back.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AV = (ROOT / "frontend" / "avatars.js").read_text(encoding="utf-8")
APP = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")
SETTINGS = (ROOT / "frontend" / "settings.js").read_text(encoding="utf-8")
HTML = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")


def _fn(name: str, src: str = AV) -> str:
    start = src.index(f"function {name}(")
    return src[start : src.index("\n}\n", start) + 2]


def test_it_is_drawn_through_a_transform_not_left_and_top() -> None:
    # Following a panel every frame must never be a layout.
    assert "buddy.style.transform = `translate(${x}px, ${y}px)`" in _fn("nameMarkBuddyPut")
    region = AV[AV.index("function nameMarkBuddyPut(") : AV.index("// --- being found")]
    assert not re.search(r"buddy\.style\.(left|top) =", region)


def test_a_scroll_moves_it_with_its_panel_in_the_same_frame() -> None:
    listener = AV[AV.index('document.addEventListener("scroll", (event) => {\n  const g = nmb.glue;') :]
    listener = listener[: listener.index("}, { passive: true, capture: true });")]
    assert "nameMarkBuddyFollow();" in listener
    follow = _fn("nameMarkBuddyFollow")
    assert "g.el.getBoundingClientRect()" in follow and "box.top + g.dy" in follow
    # A panel drawn again is found again by its path, not lost.
    assert "document.querySelector(g.sel)" in follow


def test_following_stops_when_the_page_is_still() -> None:
    frame = _fn("nameMarkBuddyFollowFrame")
    assert "now < nmbFollow.until" in frame
    assert "performance.now() + ms" in _fn("nameMarkBuddyKeepUp")


def test_no_move_is_a_fade_to_somewhere_else() -> None:
    move = _fn("nameMarkBuddyMoveTo")
    assert "distance > 700" not in move
    # The one fade left is Reduce motion's, in place of the travel.
    assert move.count("opacity: 0") == 2 and "if (nameMarkBuddyNoTravel()) {" in move


def test_a_tab_switch_only_asks_for_a_look_on_its_own_beat() -> None:
    changed = _fn("nameMarkBuddyTabChanged")
    assert "placeNameMarkBuddy" not in changed and "nameMarkBuddyQueuePlace();" in changed
    queue = _fn("nameMarkBuddyQueuePlace")
    # The first ask's time stands, and never within five seconds of a move.
    assert "if (nmb.placeTimer" in queue and "5000 - since" in queue
    beat = _fn("nameMarkBuddyBeat")
    assert "nameMarkBuddyStillGood(" in beat


def test_a_scroll_or_a_moved_panel_is_not_a_reason_to_choose_again() -> None:
    check = _fn("nameMarkBuddyCheck")
    assert "anchorMoved" not in check and "panel moved" not in check
    assert "nmbFollow.scrollAt" in check
    # Resize fits it back in, it does not choose a new perch at once.
    assert "setTimeout(nameMarkBuddyRefit" in AV


def test_pinned_on_every_page_means_it_never_moves_on_its_own() -> None:
    for name in ("nameMarkBuddyCheck", "nameMarkBuddyQueuePlace", "nameMarkBuddyBeat", "nameMarkBuddyErrand", "nameMarkBuddyUnheld"):
        assert "nmb.pinned" in _fn(name), name
    menu = _fn("nameMarkBuddyMenu")
    assert '"*": {' in menu and "keep: 1" in menu and 'kind: "pinned"' in menu


def test_it_can_always_be_called_back() -> None:
    callback = _fn("nameMarkBuddyCallBack")
    assert "nameMarkBuddyKeepSpots({})" in callback and 'revealFeature("set-companion")' in callback
    assert "run: nameMarkBuddyCallBack" in _fn("nameMarkBuddyMenu")
    assert "act: () => nameMarkBuddyCallBack()" in APP
    assert 'id="avatar-buddy-recall"' in HTML
    assert '$("avatar-buddy-recall").addEventListener("click", () => nameMarkBuddyCallBack());' in SETTINGS


def test_its_menu_opens_at_it() -> None:
    menu = _fn("nameMarkBuddyMenu")
    assert 'face.getBoundingClientRect()' in menu and "menu.style.translate" in menu
    # However it is opened, the pointer's place is not used.
    assert "nameMarkBuddyMenu(buddy, x, y)" not in AV and "beside()" not in AV


def test_a_new_name_redraws_the_companion() -> None:
    paint = _fn("paintUserMarks", APP)
    assert "syncNameMarkBuddy()" in paint


def test_a_companion_of_your_own() -> None:
    # INBOX 426 e: any name, the same part pickers as Your look, kept on this
    # computer, and its parts worn only by its own name while it is the
    # companion.
    assert '<option value="custom">Your own character</option>' in HTML
    assert 'id="avatar-buddy-name"' in HTML and 'id="avatar-buddy-parts"' in HTML
    assert 'if (choice === "custom") return nameMarkBuddyCustom().name;' in AV
    own = _fn("nameMarkOwnFor")
    assert 'appearancePref("avatar-buddy", "off") === "custom"' in own
    mount = _fn("mountBuddyCustom")
    assert 'nameMarkLookPickers(host, "avatar-buddy-look-", "From its name"' in mount
    # Your look and the companion share one picker builder.
    assert 'nameMarkLookPickers(host, "profile-look-", "From your name"' in _fn("mountProfileLook")
    assert '"avatar-buddy-custom"' in _fn("nameMarkBuddyKeepCustom")
    assert "mountBuddyCustom();" in SETTINGS
