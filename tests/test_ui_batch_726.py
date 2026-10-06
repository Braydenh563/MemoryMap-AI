"""INBOX 726: four small UI bugs, pinned as text (the DOM is measured in
Chromium by the sweeps; this keeps the fixes from being edited away).

1. The graph's settings panel: the sections' side padding is one value on
   both sides, so the right gap (control to the scrollport's edge) equals the
   left gap (label to the panel's edge) with or without the scrollbar.
2. The companion hides while any full-screen surface is up, keyed on one flag
   on the root element and the companion's own container.
3. The Library's Boards / Maps filter row has its gap below it.
4. Settings: no rule above the autonomous pass's second switch.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "frontend" / "css"
JS = ROOT / "frontend" / "js"


def _css(name: str) -> str:
    return (CSS / name).read_text(encoding="utf-8")


def _rule(text: str, selector: str) -> str:
    """The body of the first rule whose selector list is exactly `selector`."""
    match = re.search(r"(?m)^" + re.escape(selector) + r"\s*\{([^}]*)\}", text)
    assert match, f"no rule for {selector}"
    return match.group(1)


def test_graph_options_sections_pad_both_sides_equally():
    body = _rule(_css("03-dashboard-widgets.css"), ".graph-options .dock-menu-section")
    pads = re.search(r"padding:\s*var\(--space-1\)\s+var\(--space-(\d)\)\s*;", body)
    assert pads, "the section's padding must be one block value and one shared side value"
    assert "scrollbar-gutter" not in _css("02-chat-graph.css").split(".graph-overlay .graph-options {")[-1][:900], (
        "`scrollbar-gutter: stable both-edges` clipped the selects' right borders (INBOX 726)"
    )


def test_boards_filter_gap_is_set_after_the_ring_room_rule():
    text = _css("08-consistency.css")
    ring = text.index(":is(.launch-row, .library-filters, #chat-suggest) {")
    gap = text.index(":is(#library-boards-filter, #reminder-filter) {")
    assert gap > ring, "the gap must come after the `:is()` whose #chat-suggest id outranks a lone id"
    body = _rule(text, ":is(#library-boards-filter, #reminder-filter)")
    assert "margin-bottom: calc(var(--space-6) - var(--ring-room))" in body
    # The earlier lone-id rules never applied; they must not come back.
    assert not re.search(r"(?m)^#library-boards-filter\s*\{", _css("00-tokens-shell.css"))
    assert not re.search(r"(?m)^#reminder-filter\s*\{", _css("07-whiteboard-misc.css"))


def test_autonomous_pass_jobs_have_no_rule_above_the_second_switch():
    text = _css("library-lazy.css")
    body = _rule(text, ".skills-worker-toggles")
    assert "flex-direction: column" in body and "flex-wrap" not in body
    rule = _rule(text, ".skills-worker-toggles > .setting-check")
    assert "border-top-color: transparent" in rule


# --- 2. The companion hides while anything fills the window -------------------

#: The surfaces the flag knows, by name: each is a full-screen class (or a
#: modal that covers the window) watched in wiring.js. Adding one is a new
#: entry here and a new `watchFullscreenSurface(...)` there.
FULLSCREEN_SURFACES = {
    "graph": "graph-fullscreen",
    "whiteboard": "wb-fullscreen",
    "documents": "doc-focus",
    "ocr": "ocr-workspace",
}


def _js(name: str) -> str:
    return (JS / name).read_text(encoding="utf-8")


def test_companion_container_fades_on_the_root_flag():
    text = _css("08-consistency.css")
    body = _rule(text, ":root[data-fullscreen] #nm-buddy-band")
    assert "opacity: 0" in body and "visibility: hidden" in body
    assert "pointer-events: none" in body
    # Its own fade, on the container, for whichever avatar it draws.
    assert "transition: opacity" in _rule(text, "#nm-buddy-band")
    # Keyed on the container and the flag, never on one avatar's classes.
    assert not re.search(r":root\[data-fullscreen[^\]]*\][^{]*(nm-atlas|atl-figure|nm-figure|\.name-mark)", text)


def test_every_full_screen_surface_is_watched():
    wiring = _js("wiring.js")
    for name, marker in FULLSCREEN_SURFACES.items():
        assert re.search(r'watchFullscreenSurface\("' + name + r'",[^\n]*' + re.escape(marker), wiring), name
    assert 'setFullscreenSurface("lightbox", true)' in _js("lightbox-view.js")
    assert 'setFullscreenSurface("lightbox", false)' in _js("lightbox-view.js")


def test_a_new_full_screen_class_must_be_watched():
    """Any `classList.toggle/add("...fullscreen...")` or the document focus
    class, anywhere in the scripts, is a surface that fills the window; the
    companion hides for it only if wiring.js watches that class."""
    wiring = _js("wiring.js")
    seen: dict[str, str] = {}
    pattern = r'classList\.(?:toggle|add)\(\s*"([\w-]*(?:fullscreen|doc-focus)[\w-]*)"'
    for path in sorted(JS.glob("*.js")):
        for match in re.finditer(pattern, path.read_text(encoding="utf-8")):
            seen.setdefault(match.group(1), path.name)
    # `graph-fullscreen-on` is the body class that hides the app chrome beside
    # the card's own `graph-fullscreen`, which is the one watched.
    seen.pop("graph-fullscreen-on", None)
    # Sub-modes of a watched surface (tools and sidebar inside focus mode).
    for sub in ("doc-focus-tools", "doc-focus-sidebar", "doc-focus-idle"):
        seen.pop(sub, None)
    unwatched = {cls: file for cls, file in seen.items() if f'"{cls}"' not in wiring}
    assert not unwatched, f"full-screen classes with no watchFullscreenSurface in wiring.js: {unwatched}"


def test_the_browsers_own_full_screen_is_only_asked_for_by_a_watched_surface():
    callers = [p.name for p in JS.glob("*.js") if "requestFullscreen(" in p.read_text(encoding="utf-8")]
    assert callers == ["documents.js"], f"a new requestFullscreen caller needs its own flag: {callers}"


def test_every_viewer_overlay_that_covers_the_window_sets_the_flag():
    # The lightbox is built and removed, so it says so itself rather than being watched.
    for path in JS.glob("*.js"):
        text = path.read_text(encoding="utf-8")
        if 'overlay.className = "lightbox"' in text:
            assert "setFullscreenSurface(" in text, path.name
