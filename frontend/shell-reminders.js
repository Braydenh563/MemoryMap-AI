// shell-reminders.js: the clock and welcome, the scroll edge, the phone bar's
// recede, the Reminders tab. Moved out of app.js on 2026-09-26 as one
// contiguous range (INBOX 426 cc, docs/roadmap/agent-remaining/appjs-split.md).
// A classic script sharing app.js's globals, loaded in app.js's old order;
// nothing in an earlier file calls into it while the page loads
// (scratchpad/appjs-map.js --check).

// --- live clock + dashboard welcome ------------------------------------------------
// One ticker updates every visible .live-clock (reminders tab + dashboard),
// so the current time is always on screen, the reminders tab used to give
// no sense of "now" at all (user-reported).
function tickClocks() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  for (const el of document.querySelectorAll(".live-clock")) {
    const t = el.querySelector(".clock-time");
    const d = el.querySelector(".clock-date");
    if (t) t.textContent = time;
    if (d) d.textContent = date;
  }
}
// **Stopped while the tab is hidden, restarted when it comes back.**
// This paints HH:MM, so 59 of every 60 runs wrote the string that was already
// there, and it ran for as long as the app was open whether or not anyone
// could see it: a background tab kept a one-second timer and a
// `querySelectorAll` alive for hours (WORLD_CLASS_PLAN section 10, F6, whose
// gate is "0 timers while hidden").
//
// Cleared rather than made to return early, because a timer that wakes the
// process a thousand times an hour to decide it has nothing to do is the
// thing being paid for. The repaint on return is what keeps it honest: a
// clock that resumed on the next tick would show the time it stopped at for
// up to a second, and "up to a second" on a clock is exactly what a person
// notices.
//: **A clock with no seconds on it needs one wake a minute, not sixty.**
//: (INBOX 266, item 7.) Stopping these while the tab is hidden, which is
//: what the comment above records, fixed the half that ran for nobody; this
//: is the half that ran for somebody and still wrote the string that was
//: already there 59 times out of 60. Measured with `scratchpad/ui-sweeps/
//: idle.js`, which now counts timer *fires* rather than only live intervals:
//: two 1s clocks were 120 of the 123 callbacks an idle visible minute ran.
//:
//: Aligned to the wall clock rather than set to a 60,000 ms interval, which
//: is the whole reason this is a `setTimeout` chain: an interval started at
//: 10:00:59.8 repaints at 10:01:59.8, so for the 58 seconds in between the
//: clock is a minute behind, and a clock that is a minute behind is worse
//: than one that costs 60 wakes. The 250 ms is margin for a timer that fires
//: a hair early; landing at :00.25 rather than :59.99 is the difference
//: between showing the new minute and showing the old one again.
//:
//: One helper rather than three, because the app has three of these (the
//: header clocks here, the Dashboard's, and the status bar's opt-in one) and
//: they were 1s, 1s and 30s: `startMinuteTicker` is what they all mean.
const MINUTE_TICK_MARGIN_MS = 250;

function startMinuteTicker(paint) {
  let handle = null;
  const schedule = () => {
    const wait = 60000 - (Date.now() % 60000) + MINUTE_TICK_MARGIN_MS;
    //: Named, not an arrow: `scratchpad/ui-sweeps/idle.js` counts wakes by
    //: `fn.name`, and a census of anonymous callbacks cannot tell anyone
    //: which one to look at.
    handle = setTimeout(function minuteTick() {
      paint();
      schedule();
    }, wait);
  };
  paint();
  schedule();
  //: The caller keeps the stopper rather than an id: a chained timeout has a
  //: different id after every tick, so a caller holding the first one could
  //: not cancel the chain.
  return () => {
    if (handle !== null) clearTimeout(handle);
    handle = null;
  };
}

let clockTimer = null;

function startClockTicker() {
  if (clockTimer === null) clockTimer = startMinuteTicker(tickClocks);
}

function stopClockTicker() {
  if (clockTimer !== null) {
    clockTimer();
    clockTimer = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopClockTicker();
  } else {
    tickClocks();
    startClockTicker();
  }
});

startClockTicker();
tickClocks();

window.addEventListener("resize", () => {
  //: `typeof`, for the reason `refreshArtForTheme` below already records:
  //: `sizeDashWidgets` lives in dashboard.js, which loads after this file,
  //: and the desktop window resizes itself while the scripts are still being
  //: fetched (pywebview shows the window, then sizes it to the saved
  //: geometry). A resize in that gap ran this handler before dashboard.js had
  //: executed, and the owner's log had it: "Uncaught ReferenceError:
  //: sizeDashWidgets is not defined (app.js:22128)". The grid is not on
  //: screen yet at that moment anyway, so skipping the call loses nothing;
  //: dashboard.js sizes its own widgets when it renders.
  if ($("dash-grid") && typeof sizeDashWidgets === "function") sizeDashWidgets();
  // A dragged composer height is only valid for the window it was dragged in.
  refitComposer();
});

// Fade a tab-strip edge only while there is something hidden beyond it.
//
// This was a media query, which is the wrong test: whether the tabs overflow
// depends on how long the AI status pill's text currently is and whether the
// wordmark is showing, not only on the window width. So a fixed breakpoint
// faded a tab bar that fitted perfectly, and left a scrolling one at other
// widths looking as though "Reminders" had been clipped: which is exactly
// the complaint the fade exists to prevent. Measuring is both simpler and
// correct at every width.
//
// Measuring *overflow* was still not enough, and it was reported: "the
// reminders tab in the top bar is partially faded out on the right." A bar
// scrolled to its end has nothing further right, but the old single class
// kept fading anyway: so the last tab was permanently dimmed, which reads as
// a disabled control. The question each edge answers is "is there more THIS
// way", so each edge gets its own class and the answer is recomputed on
// scroll as well as on resize.
// How much room the tab strip has if it stays on the header's own row.
//
// Measured from the header's other children rather than guessed from a
// breakpoint, for the same reason the fade is: whether the tabs fit depends on
// the wordmark, the status pill's current text and which header buttons are
// showing, none of which a width range knows about.
function tabRowSpace() {
  const header = document.getElementById("top-bar");
  const bar = $("tab-bar");
  if (!header || !bar) return 0;
  const style = getComputedStyle(header);
  const gap = parseFloat(style.columnGap || style.gap) || 0;
  const padding =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  let others = 0;
  let siblings = 0;
  for (const child of header.children) {
    if (child === bar || child.classList.contains("hidden")) continue;
    others += child.getBoundingClientRect().width;
    siblings += 1;
  }
  return header.clientWidth - padding - others - gap * siblings;
}

// What the tab strip actually needs, summed from the buttons rather than read
// off the strip's own box.
//
// **This is the fix for a reported bug, and the distinction is the whole
// bug.** The wrap test used `bar.scrollWidth`, which is `max(content,
// clientWidth)`, and the wrapped rule gives the strip `flex-basis: 100%`. So
// the moment it wrapped, its scrollWidth became the *width of the header*,
// which is by definition larger than the room beside the header's other
// children, and the test that decided wrapping was measuring its own output.
// It could not oscillate, as the old comment said. It latched, which is worse:
// one transient narrow moment, a drag of the window edge, a font arriving
// late: and the header stayed two rows tall for the rest of the session.
// Measured: at 900px it wraps and scrollWidth reads 868; widened to 2000px it
// reads 1952 and stays wrapped at 102px tall, where a fresh load at the same
// width renders one row at 60px. That is "the top bar keeps switching and
// permanently changing layout", exactly.
//
// The buttons are `flex: 0 0 auto`, so their widths are the same whichever row
// the strip is on. That is what makes this measurement independent of the
// state it is being used to decide.
function tabContentWidth() {
  const bar = $("tab-bar");
  if (!bar) return 0;
  const style = getComputedStyle(bar);
  const gap = parseFloat(style.columnGap || style.gap) || 0;
  const padding =
    (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  let total = 0;
  let count = 0;
  for (const child of bar.children) {
    if (child.classList.contains("hidden")) continue;
    total += child.getBoundingClientRect().width;
    count += 1;
  }
  return total + padding + gap * Math.max(0, count - 1);
}

function syncTabOverflowFade() {
  const bar = $("tab-bar");
  if (!bar) return;
  // A tab you have to scroll to is a tab you will not find. When the strip
  // cannot fit beside the wordmark and the header buttons, it takes a row of
  // its own: where all seven fit with room to spare at any width the app is
  // usable at. Photographed on a 7-tab window: "Dashboard" clipped to "oard"
  // at the left edge, which no amount of edge-fading makes readable.
  const header = document.getElementById("top-bar");
  // Below 600 the strip is not in the header at all: `dockTabBar` moves it
  // onto the body so `position: fixed` can reach the viewport past the
  // header's backdrop filter. The wrap question is then meaningless, and
  // leaving it to be asked kept `.tabs-wrapped` on a header that had nothing
  // to wrap: measured at 390 the top bar stood at 110px against 58px at 599
  // with identical contents.
  if (header && bar.parentElement !== header) {
    header.classList.remove("tabs-wrapped");
    bar.classList.remove("fade-start", "fade-end");
    return;
  }
  if (header) {
    const needed = tabContentWidth();
    const space = tabRowSpace();
    // Asymmetric thresholds, and only for jitter: both measurements are now
    // independent of which row the strip is on, so there is no feedback to
    // oscillate. What remains is sub-pixel rounding at the exact width where
    // the two are equal, and a header that flickers between one and two rows
    // while you drag the window edge is its own kind of broken. 8px is under
    // half a character and well over the rounding.
    const wrapped = header.classList.contains("tabs-wrapped");
    //: 16px of slack, not 1: from 1200 up the strip is centred on the window
    //: (`position: absolute`, 07-whiteboard-misc.css), so the room beside
    //: the controls is not where it is drawn, and a strip that fits by 13px
    //: on paper ran 13px under the controls at 1240 (INBOX 195).
    header.classList.toggle(
      "tabs-wrapped",
      wrapped ? needed > space - 24 : needed > space - 16
    );
  }
  // 1px of slack at each end: sub-pixel layout makes scrollWidth exceed
  // clientWidth by a fraction on plenty of widths where nothing is cut off,
  // and a scroll offset lands on .5 of a pixel as often as not.
  const hidden = bar.scrollWidth - bar.clientWidth;
  bar.classList.toggle("fade-start", hidden > 1 && bar.scrollLeft > 1);
  bar.classList.toggle("fade-end", hidden - bar.scrollLeft > 1);
}

// A tab you cannot fully see is a tab you cannot fully read. Selecting one
// brings it into view, so the fade is only ever over a tab you are not using.
//
//: **`scrollIntoView` here is not the cost it looks like, and this note is so
//: that nobody spends another hour on it.** A CDP sampling profile over seven
//: tab switches puts 83.7ms of 88.9ms of `scrollIntoView` in this one call,
//: which reads as the largest non-idle thing in the app. It is not: it is the
//: layout the tab switch was going to force anyway, attributed to whichever
//: call happens to flush it first. Two changes were tried and measured
//: against a tab switch timed directly, ten rounds over seven tabs:
//: skipping the call when the strip has nothing hidden, and deferring the
//: whole thing to `requestAnimationFrame`. Median synchronous cost of a
//: switch, before 13.8ms and 13.8ms, after 13.2ms and 14.8ms. Both were
//: taken back out; with the guard gone the profile simply attributes the
//: same 88ms to `scrollTo` instead.
//:
//: If this is worth attacking, the target is the tab switch's own DOM work,
//: not the call that reveals the layout it caused.
function revealActiveTab() {
  const active = document.querySelector("#tab-bar button.active");
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  syncTabOverflowFade();
}

window.addEventListener("resize", syncTabOverflowFade, { passive: true });
//: Once more when the webfont lands: the boot measurement sees fallback
//: glyphs, and a strip that fit in those can wrap or collide in the real face.
document.fonts?.ready?.then(() => syncTabOverflowFade());
//: And whenever a neighbour changes size: the space switcher gets its name
//: and the notification button appears after boot, each taking room the boot
//: measurement had counted as the strip's. Measured at 1240: the boot sync
//: left the strip unwrapped and 13px under the controls, and the same call
//: a moment later wrapped it (INBOX 195).
if (window.ResizeObserver) {
  const headerWatch = new ResizeObserver(() => syncTabOverflowFade());
  for (const child of $("top-bar")?.children || []) {
    if (child.id !== "tab-bar") headerWatch.observe(child);
  }
}
$("tab-bar")?.addEventListener("scroll", syncTabOverflowFade, { passive: true });

// Same edge-fade, generalised for every other `.edge-fade` strip (Notes
// sub-tabs, Library sub-tabs, the document sidebar's tabs): none of them
// wrap to their own row the way #tab-bar does, so this is just the fade
// half of syncTabOverflowFade, reused rather than duplicated.
function syncEdgeFade(bar) {
  if (!bar) return;
  const hidden = bar.scrollWidth - bar.clientWidth;
  bar.classList.toggle("fade-start", hidden > 1 && bar.scrollLeft > 1);
  bar.classList.toggle("fade-end", hidden - bar.scrollLeft > 1);
}

for (const bar of document.querySelectorAll(".edge-fade")) {
  syncEdgeFade(bar);
  bar.addEventListener("scroll", () => syncEdgeFade(bar), { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    // Fires when a hidden (0-width) strip becomes visible on tab switch,
    // same as content changing width, no extra wiring needed per tab.
    new ResizeObserver(() => syncEdgeFade(bar)).observe(bar);
  }
}
window.addEventListener("resize", () => {
  document.querySelectorAll(".edge-fade").forEach(syncEdgeFade);
}, { passive: true });

// --- the scroll edge effect (UI_MODERNISATION_PLAN Phase 10, INBOX 100) -----
//
// "Optimize for legibility when content scrolls beneath controls": the bar
// over a scrolling region fades a soft edge under itself while there is
// content passing behind it, and paints nothing at rest. DESIGN.md, "Taken
// from Liquid Glass and the HIG", rule 2.
//
// **One listener, and the bar is chosen by measurement rather than by name.**
// The obvious implementation is a rule per surface, and it is wrong on the
// first surface you try it on: Notes has three candidate bars stacked above
// its list (the top bar, the sub-tab strip, the dock) and only the *last* of
// them has scrolling content under it. A gradient under the other two lands
// on another bar, where it reads as a smudge rather than as depth. So this
// takes the region that actually scrolled, and marks the one bar whose bottom
// edge is sitting against that region's top.
//
// Nothing here knows which tab it is on, which is the point: a new surface
// with a dock over a scroller gets the effect with no new code, and a surface
// that puts its dock somewhere else gets nothing rather than getting it in
// the wrong place.
const SCROLL_EDGE_BARS = "header#top-bar, .dock, .notes-subtabs, .library-subtabs";

// How close a bar's bottom edge has to be to the top of the scrolling region
// to count as "the bar over it". A few pixels of margin between the two is
// normal (`.dock` carries `margin-bottom: var(--space-4)`); half a control
// height is not, and means the bar belongs to something else.
const SCROLL_EDGE_GAP = 24;

// Regions that have actually scrolled at least once. Switching tabs has to
// restore the effect on a page that was left mid-scroll, and re-scanning
// every element of a page for scrollability on each tab change is a lot of
// getComputedStyle for a cosmetic gradient. A scroll event is the cheapest
// possible way to learn which elements are worth asking about.
const scrollEdgeRegions = new Set();

//: What each region last told its bar. The bar over a region only changes
//: when the region crosses its top edge, so a scroll that stays below it
//: (nearly every frame of every scroll) has nothing to measure: without this
//: each frame read every bar's box, which traced at 34 to 87ms per scroll.
const scrollEdgeLastState = new WeakMap();

function markScrollEdge(region, force = false) {
  if (!region || typeof region.getBoundingClientRect !== "function") return;
  const wasScrolled = scrollEdgeLastState.get(region);
  const nowScrolled = region.scrollTop > 1;
  if (!force && wasScrolled === nowScrolled) return;
  scrollEdgeLastState.set(region, nowScrolled);
  // A menu, a dialog or a popover scrolls over the page, not under a bar.
  if (
    region.closest &&
    region.closest(".action-menu, .help-popover, .modal-overlay, #settings-modal, [role='menu']")
  ) {
    return;
  }
  scrollEdgeRegions.add(region);
  const scrolled = region.scrollTop > 1;
  const top = region.getBoundingClientRect().top;
  let best = null;
  let gap = Infinity;
  for (const bar of document.querySelectorAll(SCROLL_EDGE_BARS)) {
    // A bar inside the region scrolls with the content; a bar wrapping it is
    // its container, not a lid over it.
    if (region.contains(bar) || bar.contains(region)) continue;
    const box = bar.getBoundingClientRect();
    if (!box.height) continue;
    const distance = top - box.bottom;
    if (distance < -1 || distance > SCROLL_EDGE_GAP) continue;
    if (distance < gap) {
      gap = distance;
      best = bar;
    }
  }
  for (const bar of document.querySelectorAll("[data-scrolled]")) {
    if (bar !== best) bar.removeAttribute("data-scrolled");
  }
  if (best && scrolled) best.setAttribute("data-scrolled", "1");
  else if (best) best.removeAttribute("data-scrolled");
}

// --- the phone's tab bar recedes on the way down (INBOX 104) ----------------
//
// DESIGN.md's Liquid Glass rule 10: the bar over a scrolling region gives its
// space back while you are reading and takes it again the moment you turn
// round. **Never hidden**, which is the half of the rule that is easy to lose:
// a bar that disappears is a navigation people hunt for, so what recedes is the
// caption, not the bar. 57.6px of bar with words becomes 44px of icons, which
// is still a full row of 44px targets.
//
// It rides on the scroll-edge listener above rather than bringing one of its
// own, which is that block's own warning taken seriously: one capture-phase
// listener, coalesced with `requestAnimationFrame`, choosing its target by
// measuring rather than by name. A per-surface listener here would be seven
// listeners reading layout on every scroll event on a phone.
//
// The page's reservation for the bar (`#status-bar`'s bottom margin, and
// `--page-viewport`) deliberately does *not* change with it. A fixed bar that
// shrinks while the space reserved for it shrinks too moves the content under
// it, which moves the scroll position, which fires the scroll event that
// shrank it: the reservation stays at the full height and the bar is simply
// shorter inside it.
const PHONE_BAR_RECEDE_PX = 12;
//: Per region, because two lists on two tabs are two reading positions, and
//: coming back to one mid-page should not read as a scroll up.
const phoneBarLastTop = new WeakMap();

function markTabBarRecede(region) {
  const dock = document.getElementById("phone-tab-dock");
  if (!dock) return;
  //: The bar only exists in the phone band; above it there is nothing to
  //: recede, and an attribute left behind would be waiting for the next
  //: resize down.
  if (!window.matchMedia(PHONE_TABS).matches) {
    dock.removeAttribute("data-receded");
    return;
  }
  const top = region.scrollTop;
  const last = phoneBarLastTop.get(region);
  phoneBarLastTop.set(region, top);
  //: At the top of anything the bar is always whole. Arriving at the top of a
  //: list with the captions still folded away is the state nobody asked for,
  //: and it is the state a threshold alone leaves you in.
  if (top <= PHONE_BAR_RECEDE_PX) {
    dock.removeAttribute("data-receded");
    return;
  }
  //: The first scroll event a region ever sends has no previous reading, and
  //: zero is the honest one to compare it with: the event only exists because
  //: something moved, and a region starts at the top. Without this the first
  //: flick of a list is swallowed and the bar recedes on the second.
  const delta = top - (last ?? 0);
  //: A dead band in both directions, so a finger resting on a list does not
  //: flicker the bar between its two heights.
  if (delta > PHONE_BAR_RECEDE_PX) dock.setAttribute("data-receded", "1");
  else if (delta < -PHONE_BAR_RECEDE_PX) dock.removeAttribute("data-receded");
}

let scrollEdgeFrame = 0;
function onScrollEdge(event) {
  const region = event.target === document ? document.scrollingElement : event.target;
  if (!region || region.nodeType !== 1) return;
  if (scrollEdgeFrame) return;
  // Coalesced to one measurement per frame: a scroll event fires far more
  // often than the screen repaints, and this one reads layout.
  scrollEdgeFrame = requestAnimationFrame(() => {
    scrollEdgeFrame = 0;
    markScrollEdge(region);
    //: The same guard the edge effect uses: a menu, a dialog or a sheet
    //: scrolls *over* the page, and the bar it is covering has no business
    //: reacting to it.
    if (
      !region.closest ||
      !region.closest(".action-menu, .help-popover, .modal-overlay, #settings-modal, [role='menu']")
    ) {
      markTabBarRecede(region);
    }
  });
}

// Capture, because scroll does not bubble: without it this would only ever
// hear about the document's own scrolling, which is the one thing this app
// does not do (the page is its own scroll container, see §36A).
document.addEventListener("scroll", onScrollEdge, { capture: true, passive: true });

//: **While a list scrolls, its rows change their hover look at once rather
//: than animating it.** Traced on Notes (a 30-step wheel scroll at
//: 1184x760): with the pointer resting over the list, every card that slid
//: under it ran its 120ms hover transition in and out, and a transition of a
//: card's border or shadow repaints and re-rasterises the whole card every
//: frame. A/B with the rows' transitions off: raster 940ms to 280ms, paint
//: 250ms to 100ms. Hover still shows (the row under the pointer still changes
//: its look); it only stops being animated during the scroll, and the
//: transitions are back 150ms after the last scroll event. One attribute on
//: <html>, set on the first event of a gesture and cleared once, so a scroll
//: costs two style invalidations, not one per frame.
let pageScrollingTimer = 0;
document.addEventListener(
  "scroll",
  () => {
    if (pageScrollingTimer) clearTimeout(pageScrollingTimer);
    else document.documentElement.setAttribute("data-scrolling", "");
    pageScrollingTimer = setTimeout(() => {
      pageScrollingTimer = 0;
      document.documentElement.removeAttribute("data-scrolling");
    }, 150);
  },
  { capture: true, passive: true }
);

function syncScrollEdges() {
  const page = document.querySelector(".tab-page:not(.hidden)");
  let handled = false;
  for (const region of scrollEdgeRegions) {
    if (!region.isConnected) {
      scrollEdgeRegions.delete(region);
      continue;
    }
    if (page && page.contains(region) && region.scrollTop > 1) {
      markScrollEdge(region, true);
      handled = true;
    }
  }
  if (handled) return;
  for (const bar of document.querySelectorAll("[data-scrolled]")) {
    bar.removeAttribute("data-scrolled");
  }
  //: And a tab you have just arrived on shows its bar whole, whatever the tab
  //: you left was scrolled to. `syncScrollEdges` already runs on a tab change
  //: and on a resize, which are the two moments this is true of.
  document.getElementById("phone-tab-dock")?.removeAttribute("data-receded");
}

window.addEventListener("resize", syncScrollEdges, { passive: true });

// A tab switch is a class change on the pages, not an event this file
// publishes, and observing it here keeps the whole effect in one block
// instead of adding a line to the tab machinery for a gradient.
if (typeof MutationObserver !== "undefined") {
  const scrollEdgeObserver = new MutationObserver(() => syncScrollEdges());
  for (const page of document.querySelectorAll(".tab-page")) {
    scrollEdgeObserver.observe(page, { attributes: true, attributeFilter: ["class"] });
  }
}
// The pill's text arrives with the status polls, long after first paint, and
// changes width when it does, so remeasure whenever the header changes size
// rather than only on window resize.
if (typeof ResizeObserver !== "undefined") {
  // Measured on the next frame rather than inside the callback.
  //
  // Reported from the desktop shell's console: "ResizeObserver loop completed
  // with undelivered notifications." That warning is the browser saying an
  // observer callback changed the layout of something it observes, and this
  // one does exactly that, deciding `.tabs-wrapped` changes the header's
  // height and the strip's width, which is what it is watching. The loop
  // terminates (both measurements are independent of the class now, so the
  // second pass agrees with the first), but it costs a wasted layout every
  // resize and prints an error that looks like a fault.
  //
  // Deferring breaks the cycle: the write lands after the observation phase,
  // and the `queued` flag collapses a burst of resize notifications into one
  // measurement instead of one per element per frame.
  let queued = false;
  const headerObserver = new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncTabOverflowFade();
    });
  });
  const bar = $("tab-bar");
  if (bar) {
    headerObserver.observe(bar);
    if (bar.parentElement) headerObserver.observe(bar.parentElement);
  }
}
syncTabOverflowFade();

// safeMdSlice/notePreviewText stay here rather than moving to dashboard.js
// with the widgets that use them (roadmap §88.3): notePreviewText is also
// called from note-card previews, the writing room and whiteboard.js's node
// labels, and safeMdSlice from the Library's own truncation: genuinely
// shared, not dashboard-only, despite having sat in the same comment block.
//
// A note's text as it should read in a preview: the [[link]] syntax is
// scaffolding, not content, so previews show the words without the brackets.
// Full note bodies get real clickable chips instead (renderNoteText).
//: A raw-character slice that won't leave a markdown marker dangling at the
//: cut: reported directly (Notes-tab "Most used" list): a clip landing
//: mid-`` `code` `` left a bare `` ` `` sitting in the rendered text, since
//: `INLINE_MD` only matches a marker pair that's fully present and an
//: unmatched one falls through as a literal character. Checked longest
//: marker first (`**`/`~~` before `*`) so a bold pair isn't mistaken for two
//: stray italics. Not a full CommonMark-safe truncator, good enough for a
//: short label, which is the only place this is used.
// A preview slice that never cuts through markdown syntax, and, since it is
// the only thing standing between a note and a widget row, never returns
// nothing.
//
// **It returned the empty string for a whole class of note.** Balancing an
// unpaired marker was done with `cut.slice(0, cut.lastIndexOf(marker))`, and
// when the marker was the FIRST character that index is 0, so the slice was
// empty and the row rendered as a bare "…" with no text at all. One stray `*`
// in the first hundred characters was enough, reported on the Most-used
// widget, where long notes showed as nothing but an ellipsis.
//
// Two changes:
//   - the balanced cut is only accepted if something survives it, and the
//     fallback is a plain-text slice with the markers stripped, because a
//     preview with visible asterisks still beats an empty row;
//   - the cut prefers a sentence end inside the budget. Asked for: show the
//     first sentence like the rest of the list does. A preview that stops on a
//     full stop reads as a summary; one that stops mid-word reads as damage.
function safeMdSlice(text, maxChars) {
  if (text.length <= maxChars) return { text, truncated: false };

  // Look for a sentence end in the back half of the budget, so a very long
  // first sentence still gets cut at the budget rather than swallowing it.
  const window = text.slice(0, maxChars);
  const sentence = window.search(/[.!?…](?=\s|$)(?![^\s]*[.!?])/);
  let cut =
    sentence >= Math.floor(maxChars * 0.4) ? window.slice(0, sentence + 1) : window;

  for (const marker of ["**", "~~", "`", "*"]) {
    if ((cut.split(marker).length - 1) % 2 !== 1) continue;
    const balanced = cut.slice(0, cut.lastIndexOf(marker));
    // Only if it leaves something to show. Otherwise drop the markers and
    // keep the words.
    if (balanced.trim()) cut = balanced;
    else cut = cut.replace(/[*~`]/g, "");
    break;
  }
  if (!cut.trim()) cut = window.replace(/[*~`]/g, "");
  return { text: cut, truncated: cut.length < text.length };
}

// One line of a note, as plain text, used wherever a preview genuinely
// can't be rendered markup (a `title` tooltip, an SVG export label, a
// whiteboard card's own text). The dashboard's label-sized widget lists
// (dashboard.js) render real markdown instead, via `safeMdSlice` +
// `renderInlineMarkdown`'s `compact` mode, the same as every other
// label-sized surface in this app.
//: **The first image a note actually shows**, for surfaces that want to put a
//: face on a row rather than a filename. Reported against the Contents tab,
//: which rendered every note as `noteLabel` text: so a note that *is* a photo
//: appeared as "20251018_OHR.SilburyHill….jpg", or as the bare word "image"
//: when the alt text was empty.
//:
//: Reads the markdown rather than any stored field, because that is where a
//: note's images live: pasted, dropped and AI-attached pictures all end up as
//: `![alt](/media/…)` in the body, and there is no column that mirrors them.
//:
//: Only this app's own stored files. An external `https://` image in a note is
//: skipped on purpose: the CSP blocks it (`img-src 'self' data: blob:`), so a
//: thumbnail built from one would be a guaranteed broken frame, which is worse
//: than no thumbnail at all.
//: A note's picture, wherever it lives, the markdown, or the attachments
//: table. See `noteRowImage` in dashboard.js for the report behind this: an
//: *attached* image appears nowhere in the note's text, so every surface that
//: looked for `![](…)` alone showed nothing for a note whose only picture was
//: attached rather than pasted.
function noteAnyImage(entry) {
  const embedded = noteFirstImage(entry?.content);
  if (embedded) return embedded;
  const attached = (entry?.attachments || []).find((file) => file.is_image);
  return attached ? { alt: attached.filename || "", url: `/files/${attached.id}` } : null;
}

function noteFirstImage(content) {
  const match = /!\[([^\]\n]{0,200})\]\((\/(?:media|files)\/[^)\n]{1,500})\)/.exec(content || "");
  if (!match) return null;
  return { alt: match[1] || "", url: match[2] };
}

//: **A `[[link]]`'s visible words, without the syntax its target happens to
//: start with.** Reported: *"note links have inline md not rendered or
//: suppressed, when an ai mentions a note that starts with a note that has a
//: '# text' hashtag md heading, it will write the hashtag"*, with a screenshot
//: of `[[# Girl with bell]]` rendering as "# Girl with bell" in both the
//: editor and the preview.
//:
//: The `[[` picker inserts the target note's first line verbatim, `# ` and
//: all, and `resolveWikiTarget` deliberately keeps matching that form, because
//: every link already written in every existing note is in it. So the raw text
//: has to stay in the document and only the *label* is cleaned, which is what
//: this is: the same treatment `noteLabel` already gives a chat badge, for the
//: same reason (INBOX 35 and 40, "a badge is not a source view"), applied to
//: the other place a note's opening words are shown as a control.
//:
//: Falls back to the raw name rather than to an empty string: a link whose
//: text is nothing but markers is still a link somebody typed, and a button
//: with no words in it cannot be clicked on purpose.
function wikiLinkLabel(name) {
  //: An id-addressed board reads as its title, never as "board:12|House
  //: jobs". The raw form is an address, and an address on a chip is the
  //: same mistake as a url where a link's text should be.
  const ref = boardEmbedRef(name);
  if (ref) return ref.title || (ref.map ? "Mind map" : "Board");
  const clean = notePreviewText(name).replace(/\s+/g, " ").trim();
  return clean || name;
}

//: Text shortened for display: cut at the last whole word inside `limit`
//: with an ellipsis, never mid-word. A bare `.slice(0, n)` left labels such
//: as "responds to the blu" all over the app, which reads as a typo rather
//: than as "there is more". A single word longer than the limit is cut hard,
//: still with the ellipsis. Text that fits comes back unchanged.
function clipText(text, limit) {
  const full = String(text ?? "").trim();
  if (full.length <= limit) return full;
  const hard = full.slice(0, Math.max(1, limit - 1));
  const soft = hard.replace(/\s+\S*$/, "");
  return `${(soft.length >= limit / 2 ? soft : hard).replace(/[\s,.;:!?-]+$/, "")}…`;
}

function notePreviewText(content) {
  return (content || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[\[([^[\]]{1,120})\]\]/g, "$1")
    .replace(
      new RegExp(INLINE_MD.source, "g"),
      // m[10]/m[12] are the image/link *URLs*, only checked for "which branch
      // matched", never shown; a preview shows the image's alt text (or a
      // placeholder, since alt is often empty) and a link's own text, not a
      // raw path nobody asked to read.
      //
      // **These indices were off by two and the previous comment named the
      // wrong groups.** Reported with a screenshot of the Contents page:
      // "Girl with bell undefined", "Leafeon Pokemon image test undefined", 
      // notes whose body ends in an image. The `++colour|text++` highlight
      // alternative was added to INLINE_MD after this replacer was written,
      // and it introduced two capture groups in the middle of the pattern, so
      // every index past it shifted by two. Nothing failed loudly: `??` walked
      // off the end of the branches it knew, the last one returned
      // `undefined`, and `String.replace` stringified that into the preview.
      //
      // It was wrong in three ways at once, and only one of them was visible:
      // an image previewed as "undefined", a link previewed as "undefined",
      // and `==red|highlighted==` previewed as "red", the colour name, because
      // m[4] is the optional colour group and was being read as the text.
      // Verified against the live pattern: g1 code, g2 bold, g3 strike,
      // g4 highlight colour, g5 highlight text, g6 ++colour, g7 ++text,
      // g8 italic, g9/g10 image alt+url, g11/g12 link text+url.
      (...m) =>
        m[1] ?? m[2] ?? m[3] ?? m[5] ?? m[7] ?? m[8] ??
        (m[10] !== undefined ? m[9] || "image" : m[11])
    );
}

// --- reminders tab (Wave D) --------------------------------------------------------

// (The session-scoped `notifiedReminderIds` set went with the dead poller
// above. §36C keeps announced ids in localStorage instead, so a reload does
// not re-announce everything already overdue, which a Set could not survive.)

let reminderFilter = "open"; // open | all | done

// BACKLOG §77's pattern, extended to Reminders (§89 item 1): deliberately
// narrower than Notes' own version. Applies only to the Done group; see the
// note on #reminders-page-size in index.html for why Overdue/Today/Upcoming
// are never paginated in any filter.
let remindersPageSize = localStorage.getItem("reminders-page-size") || "all";
let remindersDonePage = 1;

// list | calendar. Persisted the same way timeline's own view toggle is
// (a bare localStorage key), a display mode, not data, so it doesn't need
// the weight of a real preference round-tripped through the backend.
let reminderView = localStorage.getItem("reminderView") === "calendar" ? "calendar" : "list";
// The month the calendar is showing, always pinned to day 1 so "next month"
// arithmetic can't land on the 31st of a shorter month.
let reminderCalMonth = (() => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
})();

async function loadReminders() {
  //: Every reminder, not the first page. `/reminders` is ordered `due_at`
  //: ascending, so the first page is the *oldest* rows with the ticked-off
  //: ones among them: a notebook whose oldest two hundred are all done would
  //: push everything upcoming off the list, which is exactly the silent loss
  //: paging was added to prevent. Reading to the end keeps the grouping below
  //: unchanged and loses nothing; a real pager is the better answer at
  //: thousands and is written up in `archive/agent-remaining/list-paging.md`.
  //: A sentinel, not `[]`: "you have no reminders" and "the reminders could
  //: not be read" are different facts and only one of them is about the
  //: person. See `surfaceFailed`.
  const all = await apiPagedList("/reminders", 200).catch(() => null);
  if (!all) {
    surfaceFailed($("reminders-empty"), "reminders", loadReminders);
    return;
  }
  surfaceRecovered($("reminders-empty"));
  //: Anything that changes a reminder ends up here (setting, ticking off,
  //: deleting, undoing), and every one of those changes a note card's
  //: reminder chip (INBOX 309). Cleared rather than tracked per reminder:
  //: this list is the whole table, so working out *which* note moved would
  //: be a second model of the same data.
  reminderCountsCache.clear();
  const groupsBox = $("reminder-groups");
  groupsBox.replaceChildren();

  const reminders = all.filter((r) =>
    reminderFilter === "all" ? true : reminderFilter === "done" ? r.done : !r.done
  );
  const isList = reminderView === "list";
  $("reminder-groups").classList.toggle("hidden", !isList);
  $("reminders-empty").classList.toggle("hidden", !isList || all.length > 0);
  $("reminder-calendar").classList.toggle("hidden", isList);
  if (!isList) renderReminderCalendar(all);
  $("reminder-clear-done").classList.toggle("hidden", !all.some((r) => r.done));
  // Surface anything due on the tab itself, from wherever you are.
  updateReminderBadge(all);

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const groups = { Overdue: [], Today: [], Upcoming: [], Done: [] };
  for (const reminder of reminders) {
    const due = new Date(reminder.due_at);
    if (reminder.done) groups.Done.push(reminder);
    else if (due < now) groups.Overdue.push(reminder);
    else if (due <= endOfToday) groups.Today.push(reminder);
    else groups.Upcoming.push(reminder);
  }

  // Nothing in this filter, but reminders do exist elsewhere.
  if (all.length && !reminders.length) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent =
      reminderFilter === "done"
        ? "Nothing completed yet."
        : "All clear: nothing open.";
    groupsBox.appendChild(none);
  }

  const donePagination = $("reminders-done-pagination");
  for (const label of ["Overdue", "Today", "Upcoming", "Done"]) {
    const items = groups[label];
    if (!items.length) continue;
    const heading = document.createElement("h3");
    heading.className = `reminder-group-head group-${label.toLowerCase()}`;
    const text = document.createElement("span");
    text.textContent = label;
    const count = document.createElement("span");
    count.className = "group-count";
    count.textContent = items.length;
    heading.append(text, count);
    groupsBox.appendChild(heading);
    const ul = document.createElement("ul");
    ul.className = "entry-list";
    // Done is the one group this app ever slices, see remindersPageSize's
    // own comment. Every other group renders in full, always, regardless of
    // this control's value.
    const shown =
      label === "Done" ? paginateDoneReminders(items) : items;
    for (const reminder of shown) ul.appendChild(reminderItem(reminder, label));
    groupsBox.appendChild(ul);
  }
  // The bar only means something under a Done group that actually rendered
  // one: paginateDoneReminders already hid/showed it for that case, but a
  // filter with no Done items at all (Open) has to hide it too, since the
  // loop above never reaches the branch that would.
  if (!groups.Done.length) donePagination.classList.add("hidden");
}

function paginateDoneReminders(items) {
  const bar = $("reminders-done-pagination");
  if (remindersPageSize === "all") {
    bar.classList.add("hidden");
    return items;
  }
  const pageSize = Number(remindersPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  remindersDonePage = Math.min(Math.max(1, remindersDonePage), totalPages);
  const start = (remindersDonePage - 1) * pageSize;
  bar.classList.remove("hidden");
  $("reminders-done-page-status").textContent = `Page ${remindersDonePage} of ${totalPages}`;
  $("reminders-done-page-prev").disabled = remindersDonePage <= 1;
  $("reminders-done-page-next").disabled = remindersDonePage >= totalPages;
  return items.slice(start, start + pageSize);
}

// Month-grid view of due dates (ROADMAP.md gap 4: the flat list has no way
// to see "what's due this week" laid out as a calendar). `all` is every
// reminder regardless of reminderFilter, a month view answers "what's on
// this day," which isn't the same question the Open/All/Done filter above it
// answers, so it deliberately ignores that filter rather than surprising
// someone who switches view mid-browse and sees fewer days than expected.
function renderReminderCalendar(all) {
  const box = $("reminder-calendar");
  box.replaceChildren();

  const byDay = new Map(); // "YYYY-MM-DD" -> reminders due that local day
  for (const reminder of all) {
    const due = new Date(reminder.due_at);
    const key = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(reminder);
  }

  const head = document.createElement("div");
  head.className = "reminder-cal-head";
  const prev = smallButton("‹", "Previous month", () => {
    reminderCalMonth.setMonth(reminderCalMonth.getMonth() - 1);
    renderReminderCalendar(all);
  });
  const today = smallButton("Today", "Jump to this month", () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    reminderCalMonth = d;
    renderReminderCalendar(all);
  });
  const next = smallButton("›", "Next month", () => {
    reminderCalMonth.setMonth(reminderCalMonth.getMonth() + 1);
    renderReminderCalendar(all);
  });
  const title = document.createElement("h3");
  title.className = "reminder-cal-title";
  title.textContent = reminderCalMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  head.append(prev, title, today, next);
  box.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "reminder-cal-grid";
  for (const label of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
    const dow = document.createElement("span");
    dow.className = "reminder-cal-dow muted";
    dow.textContent = label;
    grid.appendChild(dow);
  }

  const monthStart = new Date(reminderCalMonth);
  const lead = monthStart.getDay(); // blank cells so day 1 lands in its real weekday column
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  for (let i = 0; i < lead; i++) {
    const blank = document.createElement("span");
    blank.className = "reminder-cal-cell reminder-cal-blank";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayReminders = byDay.get(key) || [];
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "reminder-cal-cell";
    if (key === todayKey) cell.classList.add("reminder-cal-today");
    if (dayReminders.length) cell.classList.add("reminder-cal-has-items");

    const num = document.createElement("span");
    num.className = "reminder-cal-daynum";
    num.textContent = day;
    cell.appendChild(num);

    if (dayReminders.length) {
      const dots = document.createElement("span");
      dots.className = "reminder-cal-dots";
      for (const reminder of dayReminders.slice(0, 4)) {
        const dot = document.createElement("span");
        dot.className = `reminder-cal-dot priority-${reminder.priority || "normal"}${reminder.done ? " done" : ""}`;
        dots.appendChild(dot);
      }
      cell.appendChild(dots);
      cell.title = dayReminders.map((r) => r.text).join("\n");
      cell.setAttribute("aria-label", `${day}: ${dayReminders.length} reminder${dayReminders.length === 1 ? "" : "s"}`);
      cell.addEventListener("click", () => {
        // Jump into the list at the first one, reuses flashReminder's own
        // switch-to-list/scroll/flash rather than inventing a day-filtered
        // list view just for this.
        reminderView = "list";
        localStorage.setItem("reminderView", "list");
        for (const b of document.querySelectorAll("#reminder-view-toggle button")) {
          b.classList.toggle("active", b.dataset.view === "list");
        }
        flashReminder(dayReminders[0].id);
      });
    } else {
      cell.setAttribute("aria-label", `${day}, no reminders`);
      cell.title = "Add a reminder on this day";
      cell.addEventListener("click", () => {
        const iso = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        $("reminder-date").value = iso;
        $("reminder-text").focus();
      });
    }
    grid.appendChild(cell);
  }
  box.appendChild(grid);
}

// A count of due-or-overdue reminders on the Reminders tab button, so you
// notice them from any tab.
function updateReminderBadge(reminders) {
  const button = $("tab-btn-reminders");
  if (!button) return;
  const now = new Date();
  const due = (reminders || []).filter(
    (r) => !r.done && new Date(r.due_at) <= now
  ).length;
  // The status bar's reminder slot is fed from here rather than from its own
  // fetch: this function is the one place both callers of /reminders land, so
  // the bar and the tab badge cannot disagree and no second timer exists to
  // drift from the first.
  reminderCounts = {
    open: (reminders || []).filter((r) => !r.done).length,
    due,
  };
  renderStatusBar();

  let badge = button.querySelector(".tab-badge");
  if (!due) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "tab-badge";
    button.appendChild(badge);
  }
  badge.textContent = due;
  badge.title = `${due} reminder${due === 1 ? "" : "s"} due`;
}

async function clearDoneReminders() {
  //: To the end, or this clears the first page's done rows and reports that
  //: count as if it were all of them.
  const all = await apiPagedList("/reminders", 200).catch(() => []);
  const done = all.filter((r) => r.done);
  if (!done.length) return;
  if (!(await confirmDialog(`Delete ${done.length} completed reminder${done.length === 1 ? "" : "s"}?`))) {
    return;
  }
  await Promise.all(
    done.map((r) => api(`/reminders/${r.id}`, { method: "DELETE" }).catch(() => {}))
  );
  toast(`Cleared ${done.length} completed reminder${done.length === 1 ? "" : "s"}.`);
  loadReminders();
}

let editingReminderId = null;

function reminderItem(reminder, label) {
  const li = document.createElement("li");
  li.dataset.id = reminder.id; // flashReminder's own hook, same shape as #entry-list's data-id
  li.dataset.swipeRight = reminder.done ? "Reopen" : "Done"; // the phone's swipe (initRowSwipe)
  if (label === "Overdue") li.classList.add("overdue");
  // Colour-code by priority (styled in CSS: a coloured left border).
  if (reminder.priority && reminder.priority !== "normal") {
    li.classList.add(`priority-${reminder.priority}`);
  }

  if (editingReminderId === reminder.id) {
    li.appendChild(reminderEditForm(reminder));
    return li;
  }

  const row = document.createElement("div");
  row.className = "entry-meta";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = reminder.done;
  checkbox.title = reminder.done ? "Reopen" : "Mark done";
  checkbox.setAttribute("aria-label", `${reminder.done ? "Reopen" : "Mark done"}: ${reminder.text || "this reminder"}`);
  checkbox.style.width = "auto";
  checkbox.addEventListener("change", async () => {
    // Completing a recurring reminder rolls it forward to the next interval
    // instead of closing it permanently.
    if (checkbox.checked && reminder.recurring && reminder.recurring !== "none") {
      const next = nextRecurringDate(reminder.due_at, reminder.recurring);
      await apiJson(`/reminders/${reminder.id}`, {
        method: "PUT",
        body: JSON.stringify({ due_at: next.toISOString(), done: false }),
      });
      toast(`Rescheduled to ${next.toLocaleString()}.`);
      loadReminders();
      return;
    }
    await apiJson(`/reminders/${reminder.id}`, {
      method: "PUT",
      body: JSON.stringify({ done: checkbox.checked }),
    });
    loadReminders();
  });
  row.appendChild(checkbox);

  const text = document.createElement("span");
  text.className = "reminder-text";
  text.textContent = reminder.text;
  if (reminder.done) text.style.textDecoration = "line-through";
  row.appendChild(text);

  if (reminder.recurring && reminder.recurring !== "none") {
    const repeat = chip(`ph:repeat ${reminder.recurring}`, "tag");
    repeat.title = `Repeats ${reminder.recurring}`;
    row.appendChild(repeat);
  }

  const due = document.createElement("span");
  due.className = "entry-date";
  due.textContent = relativeWhen(reminder.due_at); // "in 2 hours" / "3 days ago"
  due.title = new Date(reminder.due_at).toLocaleString(); // exact on hover
  row.appendChild(due);

  const actions = document.createElement("span");
  actions.className = "entry-actions";
  if (!reminder.done) {
    actions.appendChild(
      smallButton("+1h", "Snooze one hour", () =>
        snoozeReminderTo(reminder, new Date(Date.now() + 60 * 60 * 1000))
      )
    );
    actions.appendChild(
      smallButton("ph:arrow-right tmrw", "Snooze to tomorrow 9am", () =>
        snoozeReminderTo(reminder, presetDate("tomorrow"))
      )
    );
  }
  actions.appendChild(
    smallButton("ph:pencil-simple", "Edit this reminder", () => {
      editingReminderId = reminder.id;
      loadReminders();
    })
  );
  //: Delete joins the row's other connections in one menu (INBOX 393, the
  //: integration vocabulary every object already speaks: its note, Atlas,
  //: copy). The two snoozes and Edit stay on the row, being what a reminder
  //: is touched for; four same-sized icons were one more than a row reads.
  const deleteReminder = async () => {
      await apiJson(`/reminders/${reminder.id}`, { method: "DELETE" });
      loadReminders();
      // Deleting a reminder is as undo-able as binning a note. There's no
      // restore endpoint here (unlike entries): undo recreates it, which
      // means a redo's own delete target has to track the *new* id, not the
      // one this closure started with.
      let liveId = reminder.id;
      const recreate = async () => {
        const created = await apiJson("/reminders", {
          method: "POST",
          body: JSON.stringify({
            text: reminder.text,
            due_at: reminder.due_at,
            entry_id: reminder.entry_id,
            priority: reminder.priority || "normal",
            recurring: reminder.recurring || "none",
          }),
        });
        liveId = created.id;
        loadReminders();
      };
      const redelete = async () => {
        await apiJson(`/reminders/${liveId}`, { method: "DELETE" });
        loadReminders();
      };
      const action = pushUndo("Deleted a reminder", recreate, redelete);
      toastAction("Reminder deleted.", "Undo", async () => {
        settleUndoFromToast(action);
        await recreate().catch((e) => toast(e.message, true));
        toast("Reminder restored.");
      });
    };
  const menuItems = [];
  if (reminder.entry_id) {
    menuItems.push({ label: "ph:note-pencil Open its note", run: () => flashEntry(reminder.entry_id), group: "go" });
  }
  menuItems.push(
    { label: "ph:chat-circle Ask Atlas about this", run: () => askAtlasAboutThing("reminder", reminder.text), group: "go" },
    {
      label: "ph:copy Copy text",
      run: async () => {
        if (await copyToClipboard(reminder.text)) toast("Copied.");
      },
      group: "go",
    },
    { label: "ph:trash Delete", run: deleteReminder, group: "remove", danger: true }
  );
  actions.appendChild(kebabMenu(menuItems, `Actions for the reminder “${reminder.text}”`));
  row.appendChild(actions);
  li.appendChild(row);

  if (reminder.entry_preview) {
    const linkRow = document.createElement("div");
    linkRow.className = "entry-links";
    const noteChip = chip(`ph:note-pencil ${reminder.entry_preview}`, "link", () =>
      flashEntry(reminder.entry_id)
    );
    linkRow.appendChild(noteChip);
    li.appendChild(linkRow);
  }
  return li;
}

// Relative time that works both ways: "in 2 hours" (future) and "3 days ago"
// (past). relativeTime() only handles the past, which is wrong for reminders.
function relativeWhen(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  const future = diff >= 0;
  const mins = Math.abs(diff) / 60000;
  if (mins < 0.75) return future ? "now" : "just now";
  let value;
  let unit;
  if (mins < 60) {
    value = Math.round(mins);
    unit = "minute";
  } else if (mins / 60 < 24) {
    value = Math.round(mins / 60);
    unit = "hour";
  } else if (mins / 60 / 24 < 7) {
    value = Math.round(mins / 60 / 24);
    unit = "day";
  } else {
    return new Date(iso).toLocaleDateString();
  }
  const label = `${value} ${unit}${value === 1 ? "" : "s"}`;
  return future ? `in ${label}` : `${label} ago`;
}

// Convert an ISO timestamp to the value a <input type=datetime-local> wants.
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// The next occurrence of a recurring reminder. Steps forward from the due
// time until it lands in the future, so completing a long-overdue daily
// reminder doesn't just move it one day into the past.
function nextRecurringDate(fromIso, recurring) {
  const next = new Date(fromIso);
  const step = () => {
    if (recurring === "daily") next.setDate(next.getDate() + 1);
    else if (recurring === "weekly") next.setDate(next.getDate() + 7);
    else if (recurring === "monthly") next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 1); // safety fallback
  };
  step();
  const now = Date.now();
  let guard = 0;
  while (next.getTime() <= now && guard < 600) {
    step();
    guard += 1;
  }
  return next;
}

// A named quick-due preset -> a concrete Date.
function presetDate(preset) {
  const d = new Date();
  d.setSeconds(0, 0);
  switch (preset) {
    case "30m":
      d.setMinutes(d.getMinutes() + 30);
      break;
    case "1h":
      d.setHours(d.getHours() + 1);
      break;
    case "3h":
      d.setHours(d.getHours() + 3);
      break;
    case "tonight":
      // If it's already past 7pm, "tonight" can only mean tomorrow evening.
      if (d.getHours() >= 19) d.setDate(d.getDate() + 1);
      d.setHours(19, 0, 0, 0);
      break;
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      break;
    case "tomorrowpm":
      d.setDate(d.getDate() + 1);
      d.setHours(14, 0, 0, 0);
      break;
    case "weekend": {
      // The coming Saturday morning; on a Saturday or Sunday, the next one.
      const daysToSaturday = (6 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysToSaturday);
      d.setHours(10, 0, 0, 0);
      break;
    }
    case "nextweek":
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      break;
    default:
      break;
  }
  return d;
}

// --- the due time, split across two fields ------------------------------------
// #reminder-due stays the single source of truth (every caller already writes
// it), and these two keep the visible date/time inputs in step with it. Going
// through one setter is what stops the hidden value and the fields drifting
// apart, which would show one time and save another.

function setDue(localValue) {
  $("reminder-due").value = localValue || "";
  syncPartsFromDue();
  updateDueReadout();
}

function syncPartsFromDue() {
  const raw = $("reminder-due").value;
  const [date, time] = raw.split("T");
  $("reminder-date").value = date || "";
  // datetime-local may carry seconds; the time field wants HH:MM.
  $("reminder-time").value = (time || "").slice(0, 5);
}

function syncDueFromParts() {
  const date = $("reminder-date").value;
  const time = $("reminder-time").value || "09:00";
  // A date with no time is still a usable intention; a time with no date
  // isn't, so that combination is left alone until a date is picked.
  $("reminder-due").value = date ? `${date}T${time}` : "";
  updateDueReadout();
}

// A plain-English echo of whatever is in the datetime field. The raw
// "27/07/2026 11:20 AM" is hard to sanity-check at a glance; "in about 3
// hours: Monday 27 July, 11:20" is not (user-reported).
function updateDueReadout() {
  const readout = $("reminder-due-readout");
  if (!readout) return;
  const raw = $("reminder-due").value;
  if (!raw) {
    readout.textContent = "No time set";
    readout.classList.add("muted");
    return;
  }
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) {
    readout.textContent = "That date doesn't look right";
    return;
  }
  const minutes = Math.round((when.getTime() - Date.now()) / 60000);
  const pretty = when.toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  let relative;
  if (minutes < 0) relative = "in the past";
  else if (minutes < 1) relative = "in under a minute";
  else if (minutes < 60) relative = `in ${minutes} min`;
  else if (minutes < 60 * 24) relative = `in about ${Math.round(minutes / 60)} h`;
  else {
    const days = Math.round(minutes / (60 * 24));
    relative = `in ${days} day${days === 1 ? "" : "s"}`;
  }
  setLabel(readout, `ph:alarm ${relative}: ${pretty}`);
  readout.classList.toggle("error", minutes < 0);
}

// Shift the due time by a number of minutes, from whatever is there now.
function nudgeDue(minutes) {
  const raw = $("reminder-due").value;
  const base = raw && !Number.isNaN(new Date(raw).getTime()) ? new Date(raw) : new Date();
  base.setMinutes(base.getMinutes() + minutes);
  setDue(toLocalInputValue(base.toISOString()));
}

// True when the compose form is untouched, nothing typed anywhere. Only then
// is it safe to move the due time out from under the user.
function reminderComposeIsPristine() {
  return (
    !$("reminder-text").value.trim() &&
    !$("reminder-magic").value.trim() &&
    $("reminder-priority").value === "normal" &&
    $("reminder-recurring").value === "none"
  );
}

// Re-seed the due time whenever the tab is opened on an untouched form, so it
// is always relative to now rather than to whenever the app happened to start
// (user request). A half-written reminder is never disturbed.
function refreshReminderDefaults() {
  if (!$("reminder-due").value || reminderComposeIsPristine()) {
    setDue(defaultDueValue());
  } else {
    syncPartsFromDue();
    updateDueReadout();
  }
}

async function snoozeReminderTo(reminder, when) {
  await apiJson(`/reminders/${reminder.id}`, {
    method: "PUT",
    body: JSON.stringify({ due_at: when.toISOString(), done: false }),
  });
  toast(`Snoozed to ${when.toLocaleString()}.`);
  loadReminders();
}

function reminderEditForm(reminder) {
  const wrap = document.createElement("div");
  wrap.className = "inline-action";
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.maxLength = 500;
  textInput.value = reminder.text;
  const dueInput = document.createElement("input");
  dueInput.type = "datetime-local";
  dueInput.value = toLocalInputValue(reminder.due_at);
  const prioritySelect = buildSelect(
    [
      ["normal", "Normal"],
      ["low", "Low priority"],
      ["high", "High priority"],
    ],
    reminder.priority || "normal"
  );
  prioritySelect.title = "Priority";
  const recurringSelect = buildSelect(
    [
      ["none", "Once"],
      ["daily", "Daily"],
      ["weekly", "Weekly"],
      ["monthly", "Monthly"],
    ],
    reminder.recurring || "none"
  );
  recurringSelect.title = "Repeat";
  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton("Save", "", async () => {
      const text = textInput.value.trim();
      if (!text || !dueInput.value) {
        toast("A reminder needs text and a time.", true);
        return;
      }
      await apiJson(`/reminders/${reminder.id}`, {
        method: "PUT",
        body: JSON.stringify({
          text,
          due_at: new Date(dueInput.value).toISOString(),
          priority: prioritySelect.value,
          recurring: recurringSelect.value,
        }),
      });
      editingReminderId = null;
      loadReminders();
    }, false)
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      editingReminderId = null;
      loadReminders();
    })
  );
  wrap.append(textInput, dueInput, prioritySelect, recurringSelect, row);
  //: Enter saves and Escape cancels, from any field in the form: the two
  //: keys every inline editor answers. Only the buttons did before.
  wrap.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      row.querySelectorAll("button")[1]?.click();
    } else if (event.key === "Enter" && event.target.tagName === "INPUT") {
      event.preventDefault();
      row.querySelector("button")?.click();
    }
  });
  setTimeout(() => textInput.focus(), 0);
  return wrap;
}

async function addReminder(text, dueValue, entryId = null, opts = {}) {
  if (!text || !dueValue) {
    toast("A reminder needs text and a due time.", true);
    return false;
  }
  await apiJson("/reminders", {
    method: "POST",
    body: JSON.stringify({
      text,
      due_at: new Date(dueValue).toISOString(),
      entry_id: entryId,
      priority: opts.priority || "normal",
      recurring: opts.recurring || "none",
    }),
  });
  // Asked here, when a reminder actually lands, and not on first load, a
  // permission prompt with no context is refused by default, and a refusal is
  // close to permanent (§36C).
  askNotificationPermission();
  toast("Reminder set.");
  //: The card's reminder chip (INBOX 309) reads a cached count, and this is
  //: the moment that count became wrong. Dropped rather than adjusted: the
  //: next render asks, and a number kept in step by hand is a number that
  //: eventually is not.
  if (entryId != null) reminderCountsCache.delete(Number(entryId));
  loadReminders();
  return true;
}

// Magic Add: send natural language to the AI, which parses it into a reminder.
async function magicAddReminder() {
  const input = $("reminder-magic");
  const status = $("reminder-magic-status");
  const text = input.value.trim();
  if (!text) return;
  status.classList.remove("error");
  setLabel(status, "ph:magic-wand Parsing…");
  try {
    const reminder = await apiJson("/reminders/parse", {
      method: "POST",
      // Send our clock, so "tomorrow evening" is resolved against the time
      // the user can see rather than the server's UTC.
      body: JSON.stringify({ text, tz_offset_minutes: -new Date().getTimezoneOffset() }),
    });
    input.value = "";
    status.textContent = `Added “${reminder.text}”: ${relativeWhen(reminder.due_at)}. Edit it below if needed.`;
    askNotificationPermission();
    loadReminders();
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// The Wave O reminder poller used to live here. **It was dead code with a
// live timer**, and that combination is worse than either half.
//
// §36C rewrote `checkDueReminders` further down this file, badge, title
// count, one-notification-per-reminder, announced ids in localStorage, and a
// second `async function checkDueReminders` at the same scope simply replaces
// the first. What did not get deleted was the `setInterval(...)` that sat
// beside the old one, and since the name resolves to the surviving
// definition, that stray timer was running the *new* poller on a second
// 30-second interval. Two effects, both real:
//
// - twice the requests, for nothing;
// - and a race on the announcement: both polls read `announcedReminders()`
//   before either calls `rememberAnnounced`, so a reminder coming due could
//   be announced twice: which is precisely the "notifications are noisy"
//   shape of report this rewrite existed to fix.
//
// Found by opening the app in a real browser and reading the network log,
// which also showed the other half: the surviving poller runs before the
// unlock and 401s once per load. Its predecessor guarded on `authToken()`;
// that guard moved with the deletion (see `checkDueReminders` below).

// Default due time for new reminders: tomorrow morning, 9am.
// The field starts at today's date and the current time, so the common case
// is a small nudge rather than re-typing the whole thing. It used to jump to
// 9am tomorrow, which was wrong far more often than it was right. Rounded up
// to the next five minutes so the default isn't already in the past by the
// time you press Add.
function defaultDueValue() {
  const due = new Date();
  due.setSeconds(0, 0);
  due.setMinutes(Math.ceil((due.getMinutes() + 1) / 5) * 5);
  return toLocalInputValue(due.toISOString());
}
