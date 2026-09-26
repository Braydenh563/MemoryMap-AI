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
    assert "buddy.style.transform = `translate(${nmb.lx}px, ${nmb.ly}px)`" in _fn("nameMarkBuddyPut")
    region = AV[AV.index("function nameMarkBuddyPut(") : AV.index("// --- being found")]
    assert not re.search(r"buddy\.style\.(left|top) =", region)


def test_a_scroll_moves_it_with_its_panel_in_the_same_frame() -> None:
    listener = AV[AV.index('document.addEventListener("scroll", (event) => {\n  //: Any scroll') :]
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


def test_what_a_face_holds_shows_in_its_head_mark() -> None:
    # INBOX 426 f: the first faces drew the held thing in a raised hand at
    # the mark's lower right; the head-only mark had dropped it. Back, with
    # the figure's own drawing, and never in the small mark's one cue.
    draw = _fn("drawCharacter")
    assert "if (!full && !mini && reading.hand) {" in draw
    block = draw[draw.index("if (!full && !mini && reading.hand) {") :]
    assert "nameCharacterHeld(reading.hand, hand," in block[: block.index("\n  }\n")]


def test_a_panel_moved_by_a_transform_is_followed_every_frame() -> None:
    # Round 2: the loop runs on while the panel or an ancestor animates a
    # property that places it, not only for its fixed second and a half,
    # and the events that set a transition going and end it start it.
    frame = _fn("nameMarkBuddyFollowFrame")
    assert "nameMarkBuddyPanelMoving(nmb.glue.el)" in frame
    moving = _fn("nameMarkBuddyPanelMoving")
    assert "document.getAnimations()" in moving and "target.contains(el)" in moving
    # An endless animation elsewhere (a spinner) must not keep an idle page busy.
    assert "Number.isFinite(" in moving
    for event in ("transitionrun", "transitionend", "transitioncancel", "animationend"):
        assert f'"{event}"' in AV
    # Both motion sweeps run in the gate's sweep list.
    gate = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")
    assert "companionscroll companionbeats" in gate


CSS08 = (ROOT / "frontend" / "css" / "08-consistency.css").read_text(encoding="utf-8")


def test_the_companion_is_light_on_the_page() -> None:
    # INBOX 426 x: "the companion showing makes everything noticeably
    # slower". Measured by scratchpad/ui-sweeps/companionperf.js (in the
    # gate's sweeps): Atlas idle +190ms/s of main thread before, +63 after.
    # No filter on the moving figure (it re-layered the page every frame).
    char = CSS08[CSS08.index(".nm-buddy-char {") : CSS08.index("}", CSS08.index(".nm-buddy-char {"))]
    assert "filter" not in char
    # Its drawing's idle animations are paced by hand, reads before writes.
    tempo = _fn("nameMarkBuddyTempo")
    assert "anim.pause()" in tempo and "anim.currentTime = t" in tempo
    assert tempo.index("const states = nmbTempo.anims.map") < tempo.index("anim.currentTime = t")
    assert "SVGElement" in tempo
    # The obstacle sweep waits for any scroll to settle, glued or not.
    check = _fn("nameMarkBuddyCheck")
    assert "if (performance.now() - nmbFollow.scrollAt < 400) {" in check
    gate = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")
    assert "companionperf" in gate


def test_it_rides_its_panels_scroll_and_leaves_with_it() -> None:
    # INBOX 426 x: "if I scroll really fast the companion will just float in
    # the corner ... then it will disappear". On a panel in a scroll area it
    # rides that area's scroll through a ScrollTimeline (the compositor moves
    # it, however fast), clipped to the area's visible box. Measured in
    # composited frames by scratchpad/ui-sweeps/companionsmooth.js.
    ride = _fn("nameMarkBuddyRide")
    assert "new ScrollTimeline({ source: want" in ride
    assert 'rangeEnd: `${NMB_RIDE_PX}px`' in ride and 'rangeStart: "0px"' in ride
    # It stays in the body, in its own band: the app's scroll boxes are
    # never given a child.
    build = _fn("nameMarkBuddyBuild")
    assert 'band.id = "nm-buddy-band"' in build and "document.body.appendChild(band)" in build
    assert "#nm-buddy-band.nmb-riding {\n  overflow: clip;" in CSS08
    # A scroll of the area it rides reads no box and moves nothing.
    listener = AV[AV.index('document.addEventListener("scroll", (event) => {\n  //: Any scroll') :]
    listener = listener[: listener.index("}, { passive: true, capture: true });")]
    riding = listener[listener.index("if (nmb.ride && target === nmb.ride.el) {") :]
    riding = riding[: riding.index("return;")]
    assert "getBoundingClientRect" not in riding and "nameMarkBuddyPut" not in riding
    # Not on a bar that sticks: it ignores the scroll the rider follows.
    assert 'pos === "sticky" || pos === "fixed"' in _fn("nameMarkBuddyScrollsWith")
    # Out of sight, it waits for the page to be still and then its own beat.
    seen = _fn("nameMarkBuddySeen")
    assert "nameMarkBuddyQueuePlace()" in seen and "nmbFollow.scrollAt" in seen


def test_a_jump_it_must_make_is_a_poof_under_400ms() -> None:
    # INBOX 426 x: "a better teleport". Out of sight, or further than a walk
    # should go, it dissolves in stars and appears in another burst.
    assert "const NMB_POOF_OUT_MS = 150;" in AV and "const NMB_POOF_IN_MS = 220;" in AV
    move = _fn("nameMarkBuddyMoveTo")
    assert "nameMarkBuddyPoof(buddy, dx, dy, seenFrom)" in move
    poof = _fn("nameMarkBuddyPoof")
    # The shrink is on the character: a `scale` on the host scaled the
    # translate that places it (measured: swept 600px across the page).
    host_frames = poof[poof.index("nmb.anim = buddy.animate(") : poof.index("const char =")]
    assert "scale" not in host_frames
    # Only its own end takes its class off (a cancelled move's late event).
    assert "if (nmb.anim === anim) buddy.classList.remove(\"nmb-poofing\")" in poof
    assert "if (nmb.anim !== walk) return;" in move


def test_choosing_a_perch_is_cheap() -> None:
    # The choice with `near` hit-tested every point of up to 120 perches
    # (176ms, a stall before every move); a perch that cannot beat the best
    # so far is no longer sampled, and each point is tested once (5.7ms).
    choose = _fn("nameMarkBuddyChoose")
    assert "if (best && ceiling <= best.score) {" in choose
    assert "nmbCoverCache = new Map();" in choose
    assert "nmbCoverCache?.get(key)" in _fn("nameMarkBuddyCovers")
