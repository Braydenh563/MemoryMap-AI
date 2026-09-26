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
from tests._app_js import app_js_text

ROOT = Path(__file__).resolve().parents[1]
AV = (ROOT / "frontend" / "avatars.js").read_text(encoding="utf-8")
APP = app_js_text()
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


def test_its_menu_holds_it_where_it_is() -> None:
    # INBOX 426 x, 84.png: the menu open in one corner, the companion in
    # another. Measured (companionmenu.js): with the menu open, its own
    # behaviours moved it 338px away before; now nothing moves it until the
    # menu closes, and a panel carrying it carries the menu.
    for name in ("nameMarkBuddyBeat", "nameMarkBuddyErrand", "nameMarkBuddyUnheld", "nameMarkBuddyCheck", "nameMarkBuddyTick"):
        assert "nameMarkBuddyMenuOpen()" in _fn(name), name
    assert "if (nmb.menuPlace && nameMarkBuddyMenuOpen()) nmb.menuPlace();" in _fn("nameMarkBuddyPut")
    menu = _fn("nameMarkBuddyMenu")
    place = menu[menu.index("const beside = () => {") :]
    assert "const box = face.getBoundingClientRect();" in place[: place.index("};")]
    # Flipped to its left at the right edge and kept inside the window.
    assert "if (left + now.width > innerWidth - margin) left = box.left - gap - now.width;" in place
    gate = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")
    assert "companionmenu" in gate


def test_its_face_changes_with_what_happens() -> None:
    # INBOX 426 x: "one expression only". Measured by companionlife.js: a
    # hello is happy, a saved note excited, an error surprised, thinking
    # serious, away sleepy and back with a wave, and each comes back.
    express = _fn("nameMarkBuddyExpress")
    assert "nameCharacterFigure(seed, want)" in express
    # The face only: the colours stay the name's.
    draw = _fn("drawCharacter")
    assert "const expr = full && nameCharacterExpression" in draw
    assert "const bias = reading.source !== \"seed\" && reading.mood ?" in draw
    # Drawn ahead in idle time, so a reaction never waits on a first drawing.
    assert "requestIdleCallback" in _fn("nameMarkBuddyPrewarm")
    assert "nameMarkBuddyPrewarm(seed);" in AV
    # Back after a long idle: a wave.
    assert 'nameMarkBuddyAct("wave")' in _fn("nameMarkBuddyAwake")


def test_light_and_dark_and_its_size() -> None:
    # INBOX 426 x: "a light or dark variant", "size options". A soft
    # shadow on a light page, a light of the accent behind it on a dark
    # one, both still gradients (no filter).
    dark = CSS08[CSS08.index(':root[data-theme="dark"] #nm-buddy::after {') :]
    dark = dark[: dark.index("}")]
    assert "radial-gradient" in dark and "filter" not in dark
    # Small, medium, large in its menu and Appearance; any size from the
    # handle; kept; scaled about the point it touches its perch, and its
    # shape and sampled points with it (companionlife.js measures it).
    assert "const NMB_SIZES = { small: 0.8, medium: 1, large: 1.3 };" in AV
    assert 'localStorage.setItem("avatar-buddy-size"' in _fn("nameMarkBuddySetSize")
    assert "nameMarkBuddyScaled(nameMarkBuddyShapeAt1(" in _fn("nameMarkBuddyShape")
    assert "ox + (qx - ox) * size" in _fn("nameMarkBuddyCovers")
    assert 'group: "size"' in _fn("nameMarkBuddyMenu")
    assert 'id="avatar-buddy-size"' in HTML
    assert '"avatar-buddy-size"' in SETTINGS
    assert "#nm-buddy .nm-buddy-face {\n  scale: var(--nmb-scale);\n  transform-origin: 50% var(--nmb-edge);" in CSS08


def test_a_saved_face_is_read_as_it_may_be_drawn_now() -> None:
    # INBOX 426 w (73.png, 90.png): a saved hand "middlefinger" left the
    # Holding select empty. Every saved style is read through the pickers'
    # own option lists (profilelook.js: Holding reads "From your name", a
    # saved hair is kept). The server drops retired parts too
    # (tests/test_preferences_api.py).
    clean = _fn("nameMarkStyleClean")
    assert "options().includes(value)" in clean
    assert "return nameMarkStyleClean(" in _fn("ownNameMarkStyle")
    assert "style: nameMarkStyleClean(saved.style)" in _fn("nameMarkBuddyCustom")


def test_your_picture_enlarges_on_a_double_click() -> None:
    # INBOX 426 w: "the profile picture cannot be enlarged like the
    # companion". A double-click on any of your own pictures opens it large,
    # and the second click of it no longer closes what the first opened.
    listener = AV[AV.index('document.addEventListener("dblclick", (event) => {') :]
    assert 'closest?.("[data-user-mark]")' in listener[:400]
    viewer = _fn("openNameMarkViewer")
    assert "performance.now() - openedAt > 400" in viewer
    assert 'if (document.querySelector(".nm-viewer")) return;' in viewer


def test_pinned_stays_put_through_resizes_and_a_pin_mid_walk() -> None:
    # INBOX 426 (l): "when I press the option to stay in the same spot
    # across pages ... it still moves sometimes". Measured by
    # companionpin.js (six tab switches, scroll, a panel collapsing and its
    # own panel removed, three minutes of simulated idle, resize, reload):
    # before, a pin near the middle jumped 200px when the window went from
    # 900 to 700px high, and a pin made mid-walk jumped 202px to where it
    # was going. A place keeps its place; only one within NMB_EDGE_NEAR of
    # the right or bottom edge keeps its distance from that edge.
    restore = _fn("nameMarkBuddyRestore")
    assert "toRight < NMB_EDGE_NEAR && toRight < sx ? innerWidth - (w - sx) : sx" in restore
    assert "toBottom < NMB_EDGE_NEAR && toBottom < sy ? innerHeight - (h - sy) : sy" in restore
    assert "w / 2" not in restore and "h / 2" not in restore
    menu = _fn("nameMarkBuddyMenu")
    stay = menu[menu.index("Stay here on every page") :]
    stay = stay[: stay.index("} },")]
    assert "const box = buddy.getBoundingClientRect();" in stay
    assert "{ x, y, pose: nmb.pose" in stay
    gate = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")
    assert "companionpin" in gate


def test_its_menu_opens_at_the_pointer_and_stops_a_move() -> None:
    # INBOX 426 x, 84.png, round 4: at 1.25 and 1.5 scale, dark, riding a
    # scrolled dashboard panel, a right-click mid-walk or mid-poof opened
    # the menu at the companion and the move then carried it 38 to 142px
    # away. companionmenu.js (70 menus, every way in) now finds every menu
    # within 24px. A move under way stops where it is drawn; a right-click
    # or a long press opens the menu at the pointer, the keyboard beside it.
    menu = _fn("nameMarkBuddyMenu")
    assert 'if (nmb.anim && nmb.anim.playState === "running") {' in menu
    assert "nameMarkBuddyRide(null, Math.round(drawn.left), Math.round(drawn.top));" in menu
    assert "at ? at[0] : box.left, at ? at[1] : box.top" in menu
    assert "const place = at ? inside : beside;" in menu
    build = _fn("nameMarkBuddyBuild")
    assert "if (event.button === 2) rightDown = " in build
    assert "nameMarkBuddyMenu(buddy, at);" in build


def test_the_size_handle_shows_only_when_asked_for() -> None:
    # Round 4: the handle was reported visible at rest. Hidden by opacity
    # and visibility; shown on hover or the keyboard's focus, or while it
    # is sized, and not while it is carried (companionlife.js: hidden/0 at
    # rest, visible/1 on focus, 1 on hover).
    grip = CSS08[CSS08.index("#nm-buddy .nmb-size-grip {") :]
    grip = grip[: grip.index("}")]
    assert "opacity: 0;" in grip and "visibility: hidden;" in grip
    assert "#nm-buddy:not(.nm-buddy-dragging) .nm-buddy-face:is(:hover, :focus-visible) .nmb-size-grip," in CSS08
    # Atlas round 4's filter stays: its svg roots are composited, not paced.
    assert "!(a.effect.target instanceof SVGSVGElement)" in _fn("nameMarkBuddyTempo")


def test_the_benches_carry_no_inline_style() -> None:
    # Round 5: the avatar lab logged three "Refused to apply inline style"
    # warnings (the app's policy is style-src 'self'); they were three
    # style attributes in tools/avatar-lab.html, now classes in its CSS.
    for page in (ROOT / "tools").glob("*.html"):
        assert not re.search(r"\sstyle=\"", page.read_text(encoding="utf-8")), page.name


def test_it_notices_the_app_rate_limited_and_never_under_reduced_motion() -> None:
    # Round 5: reads along with a long note, peeks at the graph laid out
    # again, cheers once for a longer streak, yawns at night, covers its
    # eyes for a private note, looks at a new toast (companionreact.js, each
    # from its real event). Each has a cooldown, none within 6s of another,
    # none under Reduce motion or Avatar animation Off.
    react = _fn("nameMarkBuddyReact")
    assert "nameMarkBuddyStill()" in react and "NMB_REACT_GAP" in react
    for kind in ("read", "graph", "streak", "yawn", "private", "toast"):
        assert f"{kind}: {{ cool:" in AV, kind
    # The streak: once, and only for a count longer than the last seen.
    assert "if (seen && days > seen) nameMarkBuddyReact(\"streak\");" in _fn("nameMarkBuddyStreak")
    dashboard = (ROOT / "frontend" / "dashboard.js").read_text(encoding="utf-8")
    assert "nameMarkBuddyStreak(streak)" in dashboard
    # Night: a tick yawns.
    assert 'nameMarkBuddyReact("yawn")' in _fn("nameMarkBuddyTick")
    # A toast goes through the same limits.
    assert 'nameMarkBuddyReact("toast", added)' in AV
    # Covering its eyes: its hands over its head, not under it.
    assert '#nm-buddy.nmb-act-hide:not([data-pose="hang"]) :is(.nmb-arm-l, .nmb-arm-r) {\n  z-index: 3;' in CSS08
