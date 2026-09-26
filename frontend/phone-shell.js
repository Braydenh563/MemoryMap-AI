// phone-shell.js: the emblem, the first wiring, the notification controls, the
// header tokens, every phone band control, the arrange zone. Moved out of
// app.js on 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- Wave O: the p5 brand emblem (unique each load, reused app-wide) ----------

// A tiny generative emblem next to the title: a ring of linked nodes (the
// MemoryMap motif), coloured in the accent, seeded randomly each visit so
// it's one-of-a-kind, with a slow rotation.
// One identity per visit: every emblem in the app draws from the same seed, so
// the logo in the top bar, on the lock screen and in the empty states is
// recognisably the *same* mark rather than five unrelated doodles.
const emblemSeed = Math.floor(Math.random() * 1e6);
const emblemInstances = new Map(); // element -> p5 instance
const emblemObservers = new Map(); // element -> IntersectionObserver

//: **A mark nobody can see does not need to be drawn.** Six emblems are built
//: at boot (`EMBLEM_SLOTS`) and five of them live inside a panel that is
//: `display: none` almost all the time: the lock screen, the onboarding card,
//: the chat and graph empty states, the About dialog. Each one is a p5
//: instance with its own 24fps draw loop, and p5 keeps that loop running
//: whether or not its canvas has a box: measured on an idle whiteboard, six
//: canvases alive, one visible, and 5.0 `requestAnimationFrame` requests per
//: displayed frame.
//:
//: This is the same shape as the hidden tab that kept two clocks ticking, and
//: it is *not* a retreat from "whenever the generated p5.js node graph logo
//: shows, make sure it is never static and always rotating": the loop is
//: stopped only while the mark is not shown, and started again the moment it
//: is. An `IntersectionObserver` is the right instrument because a
//: `display: none` element never intersects anything, so "is this on screen"
//: needs no polling and no per-panel wiring.
//:
//: Not a claim about the whiteboard's drag lag. That report is still
//: unattributed (`agent-remaining/mindmap.md`); this is work the app was
//: doing for nothing, found while profiling it.
function watchEmblemVisibility(holder, canvas) {
  if (typeof IntersectionObserver === "undefined") return;
  emblemObservers.get(holder)?.disconnect();
  // Off screen, the turn is held rather than left to the compositor.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) canvas.classList.toggle("is-paused", !entry.isIntersecting);
  });
  observer.observe(holder);
  emblemObservers.set(holder, observer);
}

// The shared emblem sketch: a small ring of linked nodes, the MemoryMap motif
//, in the current accent. Animated only where it's worth the frames.
//: **p5 is fetched the first time an emblem is drawn, not at boot.** It is a
//: 1,034 KB file (the largest asset the page loads, 18% of all boot JS) and
//: every use of it here is decoration: the emblem, the dashboard's art, the
//: background art. Measured 2026-09-13: 13 blocking scripts, 1,698 KB
//: compressed, before the first tab could draw. Same-origin dynamic scripts
//: are what the CSP's `script-src 'self'` allows, so this is one element.
let p5Loading = null;
function ensureP5() {
  if (typeof p5 !== "undefined") return Promise.resolve(true);
  if (!p5Loading) {
    p5Loading = new Promise((resolve) => {
      //: After the first paint and the boot fetches, not during them: the
      //: emblem is drawn while the shell boots, and a dynamic script is off
      //: the parser's path but still on the network's.
      const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
      later(() => {
        const script = document.createElement("script");
        script.src = "/vendor/p5.min.js";
        script.onload = () => resolve(typeof p5 !== "undefined");
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
    });
  }
  return p5Loading;
}

// --- generated faces: moved to avatars.js (2026-09-24) ---

function renderEmblem(holder, size = 34, { animate = false } = {}) {
  if (!holder) return;
  if (typeof p5 === "undefined") {
    ensureP5().then((ok) => {
      if (ok && holder.isConnected) renderEmblem(holder, size, { animate });
    });
    return;
  }
  const existing = emblemInstances.get(holder);
  if (existing) {
    existing.remove();
    emblemInstances.delete(holder);
    // The observer holds the instance it was told to pause, so it has to go
    // with it: left behind, it would call `loop()` on a removed sketch the
    // next time its holder came into view.
    emblemObservers.get(holder)?.disconnect();
    emblemObservers.delete(holder);
  }
  //: The colour the page is actually wearing (`currentAccentHex`, settings.js),
  //: not the accent picker's stored name: a look's palette sets the accent
  //: too, and the emblem stayed the old indigo on the Quiet default.
  const accentHex = typeof currentAccentHex === "function"
    ? currentAccentHex()
    : localStorage.getItem("accent-custom") ||
      (ACCENTS.find((a) => a.name === activeAccent()) || ACCENTS[0]).swatch;
  // The emblem spins unless the user has explicitly asked for a still UI in
  // Settings → Appearance. We deliberately don't freeze it on the OS-level
  // prefers-reduced-motion hint alone: this mark has always turned, the app
  // ships its own motion switch, and that switch is the one to obey.
  const still = appearancePref("motion") === "reduced";

  const sketch = (p) => {
    let nodes = [];
    let baseHue = 230;
    p.setup = () => {
      p.createCanvas(size, size);
      p.colorMode(p.HSL, 360, 100, 100, 1);
      p.randomSeed(emblemSeed);
      baseHue = p.hue(p.color(accentHex));
      const count = 4 + Math.floor(p.random(3)); // 4-6 nodes
      nodes = Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * p.TWO_PI + p.random(-0.3, 0.3),
        hue: (baseHue + p.random(-40, 40) + 360) % 360,
      }));
      //: **Drawn once, turned by CSS.** It used to redraw the whole sketch
      //: 24 times a second, per emblem on the page, only to rotate it by
      //: 0.006 radians a frame: a p5 loop (and its allocations) for what a
      //: compositor rotation of one still image does for free. The turn is
      //: `canvas.emblem-spin` (03-dashboard-widgets.css), at the same speed:
      //: 0.006 rad x 24 frames a second, one turn in 43.6 seconds.
      p.draw();
      p.noLoop();
    };
    p.draw = () => {
      p.clear();
      p.translate(size / 2, size / 2);
      const r = size * 0.32;
      const dot = Math.max(4, size * 0.18);
      p.stroke(baseHue, 60, 60, 0.6);
      p.strokeWeight(Math.max(1, size / 34));
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          p.line(
            Math.cos(nodes[i].angle) * r,
            Math.sin(nodes[i].angle) * r,
            Math.cos(nodes[j].angle) * r,
            Math.sin(nodes[j].angle) * r
          );
        }
      }
      p.noStroke();
      for (const n of nodes) {
        p.fill(n.hue, 75, 60, 1);
        p.circle(Math.cos(n.angle) * r, Math.sin(n.angle) * r, dot);
      }
      p.fill(baseHue, 70, 62, 1);
      p.circle(0, 0, dot * 0.85); // a bright hub
    };
  };
  const instance = new p5(sketch, holder);
  emblemInstances.set(holder, instance);
  // Only the animated ones turn, and only those have a turn to pause.
  const canvas = holder.querySelector("canvas");
  if (animate && !still && canvas) {
    canvas.classList.add("emblem-spin");
    watchEmblemVisibility(holder, canvas);
  }
}

// Every emblem currently on the page, keyed by element id and size.
// Every slot animates: direct instruction, after the onboarding and About
// emblems were caught sitting still: "whenever the generated p5.js node
// graph logo shows, make sure it is never static and always rotating."
// `renderEmblem` already respects Settings → Appearance's motion switch
// (and only that switch, not the OS-level prefers-reduced-motion hint, 
// see its own comment), so `animate: true` here doesn't reintroduce motion
// for anyone who asked this app to hold still; it only removes the extra,
// per-slot "hold this one still anyway" that had nothing to do with that
// preference.
const EMBLEM_SLOTS = [
  // Not the top bar any more: that is the favicon now, so the app's icon in
  // the tab strip and the mark above it are the same thing. The generated
  // emblem is the dashboard's hero, and a small animated marker on the tabs
  // where the AI is doing something, asked for as "kinda like an ai symbol".
  ["ai-mark", 24, true],
  ["lock-emblem", 76, true],
  ["onboarding-emblem", 64, true],
  ["chat-empty-emblem", 52, true],
  ["graph-empty-emblem", 52, true],
  ["about-emblem", 44, true],
];

function renderBrandLogo() {
  for (const [id, size, animate] of EMBLEM_SLOTS) {
    const holder = document.getElementById(id);
    if (holder) renderEmblem(holder, size, { animate });
  }
}

// --- wiring --------------------------------------------------------------------

$("account-change").addEventListener("click", changePassword);
//: "Ask for a password when the app opens". Off needs the current password,
//: asked through the lock screen's card; on needs nothing.
$("account-password-on-open").addEventListener("change", async (e) => {
  const box = e.target;
  const wanted = box.checked;
  box.checked = !wanted; // the server's answer decides what it shows
  try {
    if (wanted) {
      await apiJson("/auth/password-on-open", {
        method: "POST",
        body: JSON.stringify({ enabled: true }),
      });
      autoSessionOffered = false;
      box.checked = true;
      toast("The app asks for your password when it opens.");
    } else {
      const done = await askPasswordPrompt({
        title: "Stop asking for a password",
        message: "Enter your password to open the app on this computer without it.",
        submitLabel: "Turn off",
        submit: (password) =>
          apiJson("/auth/password-on-open", {
            method: "POST",
            body: JSON.stringify({ enabled: false, current_password: password }),
            ownsAuthErrors: true,
          }),
      });
      if (done) {
        box.checked = false;
        toast("This computer opens the app without a password. Private notes still ask.");
      }
    }
  } catch (error) {
    toast(error.message, true);
  }
  renderAccount().catch(() => {});
});
$("account-idle-ttl").addEventListener("change", (e) => {
  setPreference("session_idle_ttl_minutes", Number(e.target.value));
});
$("account-lock-all").addEventListener("click", async () => {
  //: With "Ask for a password when the app opens" off, this computer gets
  //: back in without one (only other devices and private notes need it).
  const back = autoSessionOffered
    ? "Other devices will need your password to get back in, and private notes will lock."
    : "You'll need your password to get back in.";
  if (!(await confirmDialog(`End every session, including this one? ${back}`))) return;
  await apiJson("/auth/lock-all", { method: "POST" }).catch(() => {});
  localStorage.removeItem("token");
  location.reload();
});
// Enter anywhere in the change-password form submits it.
for (const id of ["account-current", "account-new", "account-confirm"]) {
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") changePassword();
  });
}

// --- the notifications centre's controls (§36E) -----------------------------
$("notif-btn").addEventListener("click", () => {
  const open = $("notif-panel").classList.contains("hidden");
  $("notif-btn").setAttribute("aria-expanded", String(open));
  if (open) openNotifications();
  else closeNotifications();
});
$("notif-close").addEventListener("click", () => {
  closeNotifications();
  $("notif-btn").setAttribute("aria-expanded", "false");
});
$("notif-clear").addEventListener("click", () => {
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.setItem(NOTIFICATIONS_READ_KEY, String(Date.now()));
  openNotifications(); // redraw in place: the panel stays open, now empty
});
// Asked for directly: the mute toggle reachable from the panel it affects,
// not only three screens away in Settings, and the bell itself says
// whether it's on, so muting isn't a setting you have to remember you set.
$("notif-mute-toggle").addEventListener("click", () => {
  toggleNotificationMute().catch((e) => toast(e.message, true));
});
// Click-away and Escape, the same two gestures every other popup here honours.
document.addEventListener("click", (event) => {
  const panel = $("notif-panel");
  if (panel.classList.contains("hidden")) return;
  //: **A menu this panel owns counts as inside it.** INBOX 70: "the 'AI
  //: activity' combobox doesn't open, and the feature doesn't work". It
  //: opened: `enhanceSelect` replaces the `<select>` with an
  //: `.action-menu.select-menu`, which is reparented to `<body>` while open,
  //: so a click on one of its options is not a descendant of `.notif-wrap`,
  //: this guard read it as a click away, and the panel closed under the menu
  //: before the option's own handler could run. The choice never landed, and
  //: the control read as dead.
  //:
  //: `.action-menu` rather than `.select-menu` alone: every escaped menu in
  //: this app carries it, so a panel that grows a second kind of menu later
  //: does not have to rediscover this.
  if (event.target.closest(".notif-wrap, .action-menu")) return;
  closeNotifications();
  $("notif-btn").setAttribute("aria-expanded", "false");
});
renderNotificationBadge();

// Watch the settings worth surviving a restart *before* anything can write
// one (§35E). Installed here rather than inside startApp because the tab
// restore below writes `activeTab`, and a write that happens before the watch
// is a write the server never hears about.
watchMirroredUiKeys();

// applyAppearance()/startBgArt() moved to settings.js's own tail (§88.3 item
// 4): both are defined there now, and calling them from a bare line here, 
// before settings.js has loaded, threw ReferenceError. See settings.js's
// own file header for the full hazard and why running them slightly later
// (after every split file has loaded, still well before first paint) changes
// nothing visible. watchMirroredUiKeys() above still runs from here.

// Tabs (Wave A): switch pages, restore the last one used.
for (const button of document.querySelectorAll("#tab-bar button")) {
  button.addEventListener("click", (event) => {
    switchTab(button.dataset.tab);
    if (event.detail > 0) focusTabPage(button);
  });
}

//: **A tab chosen with the pointer hands the reading keys to its page**
//: (INBOX 426 u, "a lot of pages keep auto scrolling or jumping"). The click
//: left the focus on the tab button, so the keys a person then pressed to
//: read the page went to the tab strip: measured on the dashboard, ArrowDown,
//: PageDown and Space moved nothing, and Home and End (the keys for the top
//: and the bottom of a page) switched to the first and last tab. The page's
//: own scroller takes the focus instead, without scrolling, and only when
//: the switch left it on the button: a tab that focuses its own field on
//: arrival (Chat's composer) keeps that. From the keyboard (`detail` 0) the
//: focus stays in the strip, where its arrows are expected.
function focusTabPage(button) {
  if (document.activeElement !== button) return;
  const page = document.getElementById(`tab-${button.dataset.tab}`);
  if (!page || !page.getClientRects().length) return;
  const scrolls = (el) => /(auto|scroll)/.test(getComputedStyle(el).overflowY) &&
    el.scrollHeight > el.clientHeight + 1;
  let target = scrolls(page) ? page : null;
  if (!target) {
    //: The page's biggest scrolling region: a tab whose own box does not
    //: scroll (Notes, the Library) scrolls a list inside it.
    let best = 0;
    for (const el of page.querySelectorAll("*")) {
      if (!el.getClientRects().length || !scrolls(el)) continue;
      const area = el.clientWidth * el.clientHeight;
      if (area > best) {
        best = area;
        target = el;
      }
    }
  }
  target ||= page;
  if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
// Arrow keys walk the tablist; Home/End jump to the ends (Wave L).
//
// Read from the bar itself rather than from TABS. Since the Library absorbed
// the Documents tab (§36F) the two lists are no longer the same: `documents`
// is still a page you can switch to, it is the editor the Library opens, but
// it has no button, so walking TABS would land on a tab that does not exist
// and `.focus()` on the null it returned would throw on an arrow key.
$("tab-bar").addEventListener("keydown", (e) => {
  const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
  // Alt+arrow is the app-wide Back/Forward shortcut. Without this check,
  // a bare arrow here always won, a tab button is exactly where focus
  // sits right after clicking a tab, so this ARIA-tablist roving-focus
  // handler (an ancestor of the focused button, so it sees the keydown
  // before the document-level shortcut listener does) hijacked Alt+Left/
  // Right into "move to the adjacent tab button" every time, with its own
  // preventDefault() leaving nothing clean for the real shortcut to act
  // on. Bare Left/Right/Home/End still cycle tabs exactly as before.
  if (!(e.key in keys) || e.altKey) return;
  e.preventDefault();
  const buttons = [...document.querySelectorAll("#tab-bar button")];
  if (!buttons.length) return;
  const names = buttons.map((b) => b.dataset.tab);
  const index = Math.max(0, names.indexOf(localStorage.getItem("activeTab") || "notes"));
  let next;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = names.length - 1;
  else next = (index + keys[e.key] + names.length) % names.length;
  switchTab(names[next]);
  buttons[next].focus();
});
// Every other tablist gets the same keys. Reported directly: "I cant
// navigate things like subtabs with arrow keys." Only the top bar and the
// Notes strip had roving focus; the Library strip, the document sidebar
// tabs, the note picker's sources and every strip added since were mouse
// only, which is exactly the kind of small thing that makes an app feel
// unfinished. One document-level handler covers all of them and any strip
// added later, so long as it is marked role="tablist" with role="tab"
// children. Strips with their own handler call preventDefault first and are
// left alone; a click() on the target tab reuses each strip's own click
// wiring rather than duplicating its section logic here.
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const keys = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };
  if (!(e.key in keys)) return;
  const tab = e.target.closest?.('[role="tab"]');
  const list = tab?.closest('[role="tablist"]');
  if (!tab || !list || list.id === "tab-bar") return;
  const tabs = [...list.querySelectorAll('[role="tab"]')].filter(
    (t) => !t.disabled && !t.hidden && t.offsetParent !== null
  );
  if (tabs.length < 2) return;
  e.preventDefault();
  const index = tabs.indexOf(tab);
  let next;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = tabs.length - 1;
  else next = (index + keys[e.key] + tabs.length) % tabs.length;
  const target = tabs[next];
  target.click();
  target.focus();
});
// Skip link (Wave L): jump keyboard focus straight into the open panel.
$("skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  $(`tab-${localStorage.getItem("activeTab") || "notes"}`).focus();
});
initSelectionPopup();
initEntryListKeyboardNav();
scrollTopUpdate = initScrollTopButton();
// Reminder watching moved into startApp() (below `_active_tokens` note in
// api()'s own comment): this used to run unconditionally here, before
// initAuth() has resolved whether a token even exists. A cold load: 
// lock screen up, nothing unlocked yet, fired /reminders anyway, one 401
// with an empty X-Auth-Token header, joining the exact same pile as the
// dashboard's below. See revealTab("dashboard")'s comment for the full
// picture; both were part of one bug.
initResizableSidebars();

// --- the top bar's real height, as a token ------------------------------------
// UI_MODERNISATION_PLAN.md Phase 9.
//
// `--header-h` is a constant in the stylesheet: `calc(3.7rem + 1px)`, with a
// second value of 7.5rem below the phone breakpoint. Two things read it, and
// both were wrong at ordinary widths. `--page-viewport` is how tall a sticky
// sidebar may be, and the sheet added in band 3 is positioned from the top of
// the header downward.
//
// The bar's height is not a constant. `syncTabOverflowFade` gives the tab
// strip a row of its own (`.tabs-wrapped`) whenever the seven tabs cannot fit
// beside the wordmark and the buttons, which depends on the space switcher's
// current text as much as on the window. Measured at 768: the token said
// 60.2px and the bar was 120px, so the sidebar sheet started 60px too high
// and ran under the header, and every sticky sidebar in the app was told it
// had 60px more room than it has.
//
// A ResizeObserver writes the measured height back into the same token, so
// everything that already reads it gets the truth with no new property to
// learn. Through the CSSOM rather than a style attribute, which this app's
// own CSP refuses. No feedback loop: the bar's height comes from its content,
// and nothing in it is sized from this token.
function initHeaderHeightToken() {
  const bar = document.getElementById("top-bar");
  if (!bar || typeof ResizeObserver === "undefined") return;
  const write = () => {
    const h = Math.round(bar.getBoundingClientRect().height);
    // Zero while the bar is display:none (the lock screen) would collapse
    // every sticky sidebar to the full window height and hand the sheet a
    // top of 0. Leave the stylesheet's value standing until there is a real
    // one to replace it with.
    if (h > 0) document.documentElement.style.setProperty("--header-h", `${h}px`);
  };
  new ResizeObserver(write).observe(bar);
  write();
}

initHeaderHeightToken();

//: **The note editor's formatting bar slid under the Notes sub-tab strip.**
//:
//: Reported: "when I open the edit form for a note and scroll down, only the
//: bottom of the formatting bar sticks to the top of the screen and the bar is
//: clear so it is hard to see". The second half of that is the bar's own
//: background (07-whiteboard-misc.css). This is the first half, and measured
//: with `scratchpad/ui-sweeps/edittoolbar.js` it is not a z-index problem in
//: the way it looks: `.notes-subtabs` is `position: sticky; top: 0; z-index:
//: 20` and `.doc-toolbar` is `position: sticky; top: 0; z-index: 3`, in the
//: **same** scroller, so the two park in exactly the same 46px band and the
//: strip, being the higher of the two, paints over most of the bar. With the
//: form scrolled 400px the bar stuck at y=63 with a height of 46, and
//: `elementsFromPoint` found `#notes-subtabs` painted over it at y=86 and
//: y=106: two thirds of the bar, hidden behind the strip.
//:
//: Raising the bar's z-index would be the wrong fix twice over: the strip is
//: navigation and should stay on top, and the bar would then cover *it*. The
//: bar has to stop lower down instead, which means knowing how tall the strip
//: is, and that is not a number the stylesheet can hold: the strip is a row of
//: `--control-h-lg` buttons with padding and a border, so Large text (an 18px
//: root) and Spacious density both change it. Exactly the case
//: `initHeaderHeightToken` above already solves, so this is the same shape:
//: measure, write the token, let the stylesheet read it.
//:
//: Written on `#tab-notes` rather than the root because only this tab has the
//: strip, and a root token would offset sticky bars on tabs that have nothing
//: above them.
function initNotesSubtabHeightToken() {
  const strip = document.getElementById("notes-subtabs");
  const page = document.getElementById("tab-notes");
  if (!strip || !page || typeof ResizeObserver === "undefined") return;
  const write = () => {
    const box = strip.getBoundingClientRect().height;
    //: The strip's own bottom margin counts: it is the gap the strip keeps
    //: below itself, and a bar that stopped at the strip's edge would touch it.
    const gap = parseFloat(getComputedStyle(strip).marginBottom) || 0;
    const h = Math.round(box + gap);
    //: Zero while the tab is hidden (the strip has no box at all then) would
    //: put the bar back under the strip the moment Notes was opened. Leave the
    //: stylesheet's value standing until there is a real one.
    if (h > 0) page.style.setProperty("--notes-sticky-top", `${h}px`);
  };
  new ResizeObserver(write).observe(strip);
  write();
}

initNotesSubtabHeightToken();

// --- the tab bar docks to the bottom on a phone -------------------------------
// UI_MODERNISATION_PLAN.md Phase 9, band 4.
//
// The stylesheet does the whole of the bottom bar's appearance. This function
// exists for one reason, and it is a reason that cost a measurement to find:
// **`position: fixed` does not reach the viewport from inside the header.**
// `header#top-bar` carries `backdrop-filter`, and a filtered element becomes
// the containing block for every fixed descendant, so the bar pinned itself
// to the bottom of the *header* instead. Measured at 390: `position: fixed`,
// `bottom: 0` applied, and the bar sitting at y=51 on an 844px screen.
//
// So the node moves. Out of the header and onto the body while the phone band
// holds, and back into the header on the way out, in its original place. The
// same element throughout, so every listener, the roving tabindex and the ids
// survive; this is the move `foldDockArrange` makes for the same reason.
//
// `.tabs-wrapped` comes off with it. `syncTabOverflowFade` gives the strip a
// row of its own inside the header when the seven tabs will not fit beside
// the wordmark, and with the strip no longer in the header that class was
// still on, holding the top bar at two rows: 110px at 390 against 58px at
// 599, for a header with identical contents.
const PHONE_TABS = "(max-width: 599.98px)";

function dockTabBar(toBottom) {
  const bar = document.getElementById("tab-bar");
  const header = document.getElementById("top-bar");
  if (!bar || !header) return;
  // The strip's host on a phone is `#phone-tab-dock`, not the body itself:
  // the bar has a fifth column that is not a tab (More), and `#tab-bar` is a
  // `role="tablist"` that may not hold one. The box is the bar; the strip is
  // its first child. Falling back to the body keeps this working against a
  // page that predates the box rather than leaving the strip in the header.
  const dock = document.getElementById("phone-tab-dock") || document.body;
  if (toBottom) {
    if (bar.parentElement === dock) return;
    // Where to put it back. The header's children are fixed markup, so the
    // next sibling is a stable anchor.
    bar.dataset.homeNext = bar.nextElementSibling?.className || "";
    header.classList.remove("tabs-wrapped");
    dock.prepend(bar);
  } else {
    if (bar.parentElement === header) return;
    const anchor = bar.dataset.homeNext
      ? header.querySelector(`:scope > .${CSS.escape(bar.dataset.homeNext.split(" ")[0])}`)
      : null;
    if (anchor) header.insertBefore(bar, anchor);
    else header.appendChild(bar);
    delete bar.dataset.homeNext;
  }
  // The fade is about a strip that scrolls inside the header; recompute it
  // for wherever the strip now lives.
  if (typeof syncTabOverflowFade === "function") syncTabOverflowFade();
}

function initBottomTabBar() {
  const query = window.matchMedia(PHONE_TABS);
  dockTabBar(query.matches);
  query.addEventListener("change", (event) => dockTabBar(event.matches));
}

initBottomTabBar();

// --- the phone top bar: one menu where the desktop has four squares ----------
// UI_MODERNISATION_PLAN Phase 11 item 1, "the top bar's own reduction: the
// title, the AI dot and one action". Measured before (scratchpad/ui-sweeps/
// phonehead.js): at 320 the bar held the space switcher, notifications and
// four more squares (theme, settings, lock, quit), 44px each, and the last
// of them ended at 332 in a 320 window, so every phone page scrolled
// sideways by the width of the Quit button. Six controls is a desktop
// bar; a phone bar is where you are, what came in, and one way to the rest.
//
// The four are not removed, they move: below 600 the CSS hides the four
// buttons and shows this one `kebabMenu` (DESIGN.md's recipe, so it opens,
// clamps and closes like every other menu) holding the same four verbs,
// calling the same four functions the buttons call. Built once at boot and
// shown by the stylesheet, which is the same arrangement the phone tab
// dock uses: no listener, no second copy of the media query in JS.
// **The status bar's rows** (INBOX 392, UI_MODERNISATION_PLAN Phase 11 item
// 12). Below 600 the status bar is no longer a second bar stacked on the tab
// bar: measured at 390, the two together were 95px of the 844 on every tab,
// the bar's AI dot was 28x28 and its reminders count 82x28, and three of its
// controls were scrolled off the end of a bar that scrolls sideways.
// `dockPhoneStatus` moves the three a phone reaches for without looking (the
// AI dot, Back and Undo) into this header, and every other control the bar
// holds is a row here that presses the bar's own button, so the handler, the
// disabled state and the switched-off slot all stay where they are (the
// pattern `mountPhoneSidebarOpeners` uses). A row whose button is switched
// off in Settings or hidden right now is hidden; one whose button is disabled
// is shown muted, the way the menu marks any row that cannot run.
//
// Three of the bar's controls are not rows here because the tab bar's More
// sheet already has each (`openPhoneMoreSheet`): Reminders, Ask the agent and
// Guide. A second copy in a second menu is two answers to "where is it".
const PHONE_STATUS_ROWS = [
  { id: "status-forward", label: "ph:caret-right Forward" },
  { id: "status-nav-history", label: "ph:clock-counter-clockwise Recent places" },
  { id: "status-redo", label: "ph:arrow-clockwise Redo" },
  { id: "status-task", label: "ph:gear Background tasks" },
  { id: "status-find", label: "ph:magnifying-glass Find" },
];

function initPhoneHeaderMore() {
  const home = document.querySelector("#top-bar .header-cluster-end");
  if (!home || typeof kebabMenu !== "function") return;
  const menu = kebabMenu(
    [
      ...PHONE_STATUS_ROWS.map((row) => ({
        label: row.label,
        title: row.label.replace(/^ph:\S+\s*/, ""),
        run: () => $(row.id)?.click(),
        group: "status",
      })),
      {
        label: "ph:circle-half Light or dark",
        title: "Toggle light or dark theme",
        run: () => toggleTheme(),
        group: "app",
      },
      { label: "ph:gear Settings", title: "Settings", run: () => openSettingsModal(), group: "app" },
      { label: "ph:lock Lock", title: "Lock the app", run: () => lockNow(), group: "app" },
      {
        label: "ph:power Quit MemoryMap",
        title: "Quit MemoryMap: stops the app and its server",
        run: () => quitApp(),
        danger: true,
        group: "app",
      },
    ],
    "More"
  );
  menu.id = "header-more";
  // Lock is only offered once a password exists, which is what shows the
  // desktop's `#lock-btn`; the row follows that button's own state each time
  // the menu opens rather than freezing it at boot, when no session exists.
  // The status rows follow their buttons the same way.
  const rows = [...menu.querySelectorAll(".menu-item")];
  const lockRow = rows[PHONE_STATUS_ROWS.length + 2];
  menu.addEventListener(
    "click",
    () => {
      if (lockRow) lockRow.hidden = $("lock-btn")?.classList.contains("hidden") ?? true;
      PHONE_STATUS_ROWS.forEach((spec, index) => {
        const source = $(spec.id);
        const row = rows[index];
        if (!row) return;
        row.hidden =
          !source ||
          source.classList.contains("hidden") ||
          source.classList.contains("status-slot-off");
        const unavailable = Boolean(source?.disabled);
        row.classList.toggle("menu-item-unavailable", unavailable);
        if (unavailable) row.setAttribute("aria-disabled", "true");
        else row.removeAttribute("aria-disabled");
      });
    },
    true
  );
  home.appendChild(menu);
}

initPhoneHeaderMore();

// The three status-bar controls that move into the phone header, and back
// above 600. Moved, never copied: a marker holds each one's place in the bar,
// as `floatPrimaryActions` does for the floating +. Back and Undo sit after
// the space switcher, where a phone keeps its back chevron (the HIG's
// navigation-bar order); the AI dot sits before the bell, since both say
// what the app is doing rather than go anywhere.
const PHONE_STATUS = "(max-width: 599.98px)";

function dockPhoneStatus(phone) {
  const bar = $("top-bar");
  const switcher = bar?.querySelector(".space-switcher");
  const bellCluster = bar?.querySelector(".header-controls > .header-cluster:not(.header-cluster-end)");
  if (!bar || !switcher || !bellCluster) return;
  let nav = bar.querySelector(".header-cluster-nav");
  if (phone && !nav) {
    nav = document.createElement("span");
    nav.className = "header-cluster header-cluster-nav";
    switcher.after(nav);
  }
  const moves = [
    { el: $("status-back"), into: nav, first: false },
    { el: $("status-undo"), into: nav, first: false },
    { el: $("ai-status")?.closest(".ai-status-wrap"), into: bellCluster, first: true },
  ];
  for (const { el, into, first } of moves) {
    if (!el) continue;
    const key = el.id || "ai-status-wrap";
    if (phone) {
      if (el.closest("#top-bar")) continue;
      const slot = document.createElement("span");
      slot.className = "status-home-slot";
      slot.dataset.statusFor = key;
      slot.hidden = true;
      el.replaceWith(slot);
      if (first) into.prepend(el);
      else into.append(el);
    } else {
      const slot = document.querySelector(`.status-home-slot[data-status-for="${CSS.escape(key)}"]`);
      if (slot) slot.replaceWith(el);
    }
  }
  if (!phone) nav?.remove();
}

function initPhoneStatus() {
  const query = window.matchMedia(PHONE_STATUS);
  dockPhoneStatus(query.matches);
  query.addEventListener("change", (event) => dockPhoneStatus(event.matches));
}

initPhoneStatus();

// --- the phone's sidebar opener: a button in the head, not a rail ------------
// UI_MODERNISATION_PLAN Phase 11 item 2 ("the list as full-width rows") and
// item 3 ("the sidebar as a sheet from the left edge"). Below 820 each
// sidebar is already an edge sheet, opened by its own collapse toggle riding
// a 52px rail that stays on screen, and every page beside a sidebar pads
// itself by that rail. Measured at 390 on Notes: the list started at x=82
// in a 390 window (13px page gutter, the 52px rail, 16px card padding), so
// rows ran 262px wide for one 44px button that sat at the top of the strip
// and nothing else the whole way down. On a tablet the rail is 6% of the
// width and reads as a hinge; on a phone it is 13% of it and reads as a
// margin nobody asked for.
//
// So below 600 the rail goes and the opener moves to where a phone keeps
// it: the leading edge of the head bar, before the title (the HIG's
// navigation-bar order, and where Slack, Notion and Mail put theirs). One
// function mounts one `.dock-nav` opener per sidebar in that sidebar's own
// dock, and pressing it presses the sidebar's existing toggle, so the sheet
// logic (`applySidebarSheetMode`, the dismissal, `aria-expanded`) stays in
// one place. The rail and the toggle come back above 600 by CSS alone.
const PHONE_SIDEBAR_OPENERS = [
  { aside: "sidebar", dock: '[data-dock-name="notes"]', label: "Categories and tags" },
  { aside: "chat-sidebar", dock: '[data-dock-name="chat"]', label: "Conversations" },
  { aside: "doc-sidebar", dock: ".doc-dock", label: "Documents list" },
];

function mountPhoneSidebarOpeners() {
  for (const { aside: asideId, dock: dockSel, label } of PHONE_SIDEBAR_OPENERS) {
    const aside = document.getElementById(asideId);
    const dock = document.querySelector(dockSel);
    if (!aside || !dock || dock.querySelector(":scope > .dock-nav")) continue;
    const nav = document.createElement("span");
    nav.className = "dock-nav";
    const opener = smallButton("ph:sidebar-simple", label, () => {
      const toggle = aside.querySelector(".sidebar-collapse-toggle");
      if (toggle) toggle.click();
      opener.setAttribute("aria-expanded", String(aside.classList.contains("sidebar-sheet-open")));
    });
    opener.classList.add("icon-only", "phone-sidebar-opener");
    opener.setAttribute("aria-expanded", "false");
    opener.setAttribute("aria-controls", asideId);
    nav.appendChild(opener);
    dock.prepend(nav);
  }
}

mountPhoneSidebarOpeners();

// --- swipe a row: star to the right, bin to the left --------------------------
// UI_MODERNISATION_PLAN Phase 11 item 2: "the list as full-width rows with
// swipe actions (pin, bin) matched to the row's menu (the HIG rule)". The
// rule is the whole design: a swipe is a shortcut to something the row
// already offers where a person can see it, never the only way to it, and
// never a third copy of the action. So the swipe presses the row's own
// controls: the star button (`.favourite-btn`, visible on the row) and the
// row menu's "Move to bin" (`binNoteWithUndo`, the one function that menu
// row calls, undo toast and all). Nothing here knows what favouriting or
// binning does.
//
// One delegated set of listeners on the list, so re-rendered rows need no
// wiring. Touch only, and only in the phone band: a mouse has the controls
// under it already. The row's children slide on `--swipe-x` and the row's
// own `::before`/`::after` are the two coloured underlays that appear in
// the gap (10-responsive.css); past `ROW_SWIPE_ARM` the underlay saturates
// to say a lift-off will act. `touch-action: pan-y` on the row is what
// makes the horizontal drag ours and the vertical one the page's: the
// first 8px decide which, and a vertical start hands the pointer back.
const ROW_SWIPE_ARM = 88;
const ROW_SWIPE_MAX = 124;

//: `list` is the element the rows live under (delegated, so re-rendered rows
//: need no wiring); `actions.right` and `actions.left` each take the row and
//: press its own control. A direction the row has no label for
//: (`data-swipe-right` / `data-swipe-left`, which are also the underlay's
//: words) never arms: a reminder swipes right to Done and left to nothing.
function initRowSwipe(list, actions) {
  if (!list) return;
  let row = null;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let decided = false;

  const settle = (li) => {
    li.classList.add("is-settling");
    li.style.setProperty("--swipe-x", "0px");
    li.classList.remove("swipe-left", "swipe-right", "swipe-armed", "is-swiping");
    setTimeout(() => li.classList.remove("is-settling"), 240);
  };

  list.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || !window.matchMedia(PHONE_TABS).matches) return;
    const li = event.target.closest("li[data-id]");
    if (!li || li.querySelector("textarea")) return; // the edit form is not a row
    if (event.target.closest("button, a, input, select, [contenteditable]")) return;
    row = li;
    startX = event.clientX;
    startY = event.clientY;
    dx = 0;
    decided = false;
  });

  list.addEventListener("pointermove", (event) => {
    if (!row) return;
    const mx = event.clientX - startX;
    const my = event.clientY - startY;
    if (!decided) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      decided = true;
      if (Math.abs(my) > Math.abs(mx)) {
        row = null; // a scroll, the page's
        return;
      }
      row.classList.add("is-swiping");
    }
    const canRight = Boolean(row.dataset.swipeRight);
    const canLeft = Boolean(row.dataset.swipeLeft);
    dx = Math.max(canLeft ? -ROW_SWIPE_MAX : 0, Math.min(canRight ? ROW_SWIPE_MAX : 0, mx));
    row.style.setProperty("--swipe-x", `${dx}px`);
    row.classList.toggle("swipe-right", dx > 0);
    row.classList.toggle("swipe-left", dx < 0);
    row.classList.toggle("swipe-armed", Math.abs(dx) >= ROW_SWIPE_ARM);
  });

  const end = () => {
    if (!row) return;
    const li = row;
    const travelled = dx;
    row = null;
    settle(li);
    if (Math.abs(travelled) < ROW_SWIPE_ARM) return;
    if (travelled > 0) actions.right?.(li);
    else actions.left?.(li);
  };
  list.addEventListener("pointerup", end);
  list.addEventListener("pointercancel", end);
}

initRowSwipe(document.getElementById("entry-list"), {
  right: (li) => li.querySelector(".favourite-btn")?.click(),
  // The menu builds its rows on open, so the bin is reached as the one
  // function the menu's own row calls, not by pressing a row that does
  // not exist yet.
  left: (li) => {
    const entry = allEntries.find((e) => String(e.id) === li.dataset.id);
    if (entry) binNoteWithUndo(entry);
  },
});

//: Reminders (Phase 11 item 8, "reminders as rows with swipe done"): right
//: presses the row's own Done checkbox, which toggles and saves as a tap on
//: it would; there is no left.
initRowSwipe(document.getElementById("reminder-groups"), {
  right: (li) => li.querySelector('input[type="checkbox"]')?.click(),
});

// --- the note page: a note opened on a phone is a page, not a longer card ----
// UI_MODERNISATION_PLAN Phase 11 item 2: "the note view as a page with a
// back button, its actions in a bottom bar". On a desktop a row opens out
// in place; on a phone that meant a card growing inside a list you were
// scrolling, with its actions wherever its bottom edge landed. A tap on a
// row (not on one of its controls, and not the end of a swipe) opens the
// note as a full-height sheet: the sheet recipe's `page` variant, whose
// close is a back chevron, holding the same card the list renders
// (`entryItem`, unclamped) with that card's own actions row moved into a
// `.thumb-bar` at the foot, where a thumb is. Same card, same actions, one
// place: nothing is rendered twice. Bin or Archive from the page reloads
// the list, and the page closes itself when its note is no longer in it.
let notePageOpenId = null;
let notePageClose = null;

function openNotePage(entry, returnFocus = null) {
  if (!entry || notePageOpenId === entry.id) return;
  expandedNotes.add(entry.id);
  notePageOpenId = entry.id;
  const title = entry.title || clipText(notePreviewText(entry.content).split("\n")[0], 80) || "Note";
  notePageClose = openSheet({
    label: title,
    name: "note",
    variant: "page",
    returnFocus,
    onClose: () => {
      notePageOpenId = null;
      notePageClose = null;
    },
    build: (card) => {
      const list = document.createElement("ul");
      list.className = "entry-list note-page-list";
      const item = entryItem(entry, { actions: true });
      item.querySelector(".entry-content")?.classList.remove("entry-clamped");
      item.querySelector(".entry-more")?.remove();
      list.appendChild(item);
      card.appendChild(list);
      const actions = item.querySelector(".entry-actions");
      if (actions) {
        const bar = document.createElement("div");
        bar.className = "thumb-bar note-page-bar";
        bar.setAttribute("role", "toolbar");
        bar.setAttribute("aria-label", "Note actions");
        while (actions.firstChild) bar.appendChild(actions.firstChild);
        actions.remove();
        card.appendChild(bar);
      }
    },
  });
  const close = document.querySelector('.sheet-overlay[data-sheet="note"] .sheet-close');
  if (close) {
    setLabel(close, "ph:arrow-left");
    close.setAttribute("aria-label", "Back");
    close.title = "Back (Escape)";
  }
}

function closeNotePageIfGone() {
  if (notePageOpenId === null || !notePageClose) return;
  if (!allEntries.some((e) => e.id === notePageOpenId)) notePageClose();
}

function initNotePage() {
  const list = document.getElementById("entry-list");
  if (!list) return;
  list.addEventListener("click", (event) => {
    if (!window.matchMedia(PHONE_TABS).matches) return;
    const li = event.target.closest("li[data-id]");
    if (!li || li.querySelector("textarea")) return;
    if (event.target.closest("button, a, input, select, [contenteditable], .chip-interactive, summary")) return;
    // The lift-off of a swipe is a click too; a row that moved was not tapped.
    if (li.classList.contains("is-settling")) return;
    if (window.getSelection && String(window.getSelection()).length) return;
    const entry = allEntries.find((e) => String(e.id) === li.dataset.id);
    if (entry) openNotePage(entry, li);
  });
}

initNotePage();

// --- the Library reader as the page ------------------------------------------
// UI_MODERNISATION_PLAN Phase 11 item 5, "the reader full-screen with a bottom
// bar". The reader itself is library.js's (`openOcrWorkspace`); what lives
// here is the one thing that may not live there, stamping the sheet recipe's
// `page` variant onto a surface. `tests/test_ui_recipes.py` holds that line,
// and its reason is the loophole it closes: a variant class painted onto a
// div by any file inherits none of the scrim, the tier, the head with its way
// out, Escape or the backdrop press. The reader does inherit all five, because
// it is already the app's `.modal-overlay` + `.card.modal-card` dialog; this
// changes its size and where its actions sit, nothing else.
//
// Measured at 390x844 before: a 342x776 card inset 24px from each edge with a
// 14px rounded top, so a page you were reading had a window's worth of scrim
// around it; the Regions checkbox label 36px tall, a zoom segment button 35px
// wide, the two rail tabs 13x25 and the find box 343x20. And the panes are a
// grid of two columns below 1100 with three children in it, so the reading
// pane fell into an implicit second row at 0px wide: on a phone the
// transcription had no width at all, and at 1024 the hidden rail's column
// still took 593px while the page was squeezed into the 320px column beside
// it. The column half is fixed in 07-whiteboard-misc.css's 1100 band, where
// it was wrong at every width, not only this one.
//
// The actions move rather than being redrawn, the way `openNotePage` moves a
// row's own actions: same buttons, same ids, same handlers, and the code that
// shows and hides them (`ocrSyncDeleteButton`, the describe button's own
// rules) finds them exactly where it did.
const OCR_PHONE_BAR_ID = "ocr-phone-bar";

function ocrPhonePage(phone) {
  const overlay = $("ocr-workspace");
  const card = overlay?.querySelector(".ocr-card");
  const foot = overlay?.querySelector(".ocr-regions-foot");
  const close = $("ocr-close");
  if (!overlay || !card || !foot || !close) return;
  overlay.classList.toggle("sheet-overlay", phone);
  card.classList.toggle("sheet-card", phone);
  card.classList.toggle("sheet-card-page", phone);
  let bar = document.getElementById(OCR_PHONE_BAR_ID);
  if (phone) {
    if (!bar) {
      bar = document.createElement("div");
      bar.id = OCR_PHONE_BAR_ID;
      bar.className = "thumb-bar ocr-phone-bar";
      bar.setAttribute("role", "toolbar");
      bar.setAttribute("aria-label", "What was read");
      card.appendChild(bar);
    }
    while (foot.firstChild) bar.appendChild(foot.firstChild);
    // The way out of a page is Back, not an X: an X says "this was over what
    // you were doing", and on a phone the reader is the screen.
    setLabel(close, "ph:arrow-left");
    close.setAttribute("aria-label", "Back");
    close.title = "Back (Escape)";
  } else {
    if (bar) {
      while (bar.firstChild) foot.appendChild(bar.firstChild);
      bar.remove();
    }
    setLabel(close, "ph:x");
    close.setAttribute("aria-label", "Close");
    close.title = "Close";
  }
}

function initOcrPhonePage() {
  // Only while it is open: a band crossed with the reader shut has nothing to
  // move, and stamping a variant on a hidden dialog leaves state behind that
  // the next open would have to undo.
  window.matchMedia(PHONE_TABS).addEventListener("change", (event) => {
    const overlay = document.getElementById("ocr-workspace");
    if (overlay && !overlay.classList.contains("hidden")) ocrPhonePage(event.matches);
  });
}

initOcrPhonePage();


// --- the chat composer on a phone: attachments and mode in one row -----------
// UI_MODERNISATION_PLAN Phase 11 item 3, "the composer above the keyboard
// with the attachments and mode in one row". Measured at 390: the composer
// row held the note picker, the image button, the box, the microphone and
// Send, and with the row forced onto one line the box got 78px and grew to
// 152px tall (autogrow wrapping its own placeholder), the trap the 820 band
// in 04-chat-dock-appearance.css records. Two of the five are attachments,
// which is what the strip under the box is for: below 600 they move there,
// beside the mode segment, and the box keeps the row with the two buttons
// that act on the message. Same elements, same handlers; back above 600.
function dockChatAttachments(toStrip) {
  const strip = document.querySelector(".chat-dock-controls");
  const composer = document.querySelector(".chat-composer");
  const mode = strip?.querySelector(":scope > .chat-tool-group-mode");
  if (!strip || !composer || !mode) return;
  const movers = [composer.querySelector(":scope > .note-picker"), composer.querySelector(":scope > #attach-image")]
    .filter(Boolean);
  const parked = [...strip.querySelectorAll(":scope > [data-composer-home]")];
  //: The placeholder gives too: "Ask your notebook anything..." wraps to two
  //: lines in the 182px the box has beside its two buttons, and autogrow
  //: sizes the box to its placeholder (measured: 59px tall, empty). Five
  //: words become two on the phone and come back with the width.
  const box = composer.querySelector(":scope > #chat-input");
  if (box) {
    if (toStrip && !box.dataset.placeholderHome) {
      box.dataset.placeholderHome = box.placeholder;
      box.placeholder = "Ask anything…";
    } else if (!toStrip && box.dataset.placeholderHome) {
      box.placeholder = box.dataset.placeholderHome;
      delete box.dataset.placeholderHome;
    }
    if (typeof autoGrow === "function") autoGrow(box);
  }
  if (toStrip) {
    if (!movers.length) return;
    let group = strip.querySelector(":scope > .chat-tool-group-attach");
    if (!group) {
      group = document.createElement("span");
      group.className = "chat-tool-group chat-tool-group-attach";
      mode.after(group);
    }
    for (const el of movers) {
      el.dataset.composerHome = "1";
      group.appendChild(el);
    }
  } else {
    const group = strip.querySelector(":scope > .chat-tool-group-attach");
    const home = composer.querySelector(":scope > #chat-input");
    for (const el of group ? [...group.children] : parked) {
      delete el.dataset.composerHome;
      home ? home.before(el) : composer.prepend(el);
    }
    group?.remove();
  }
}

// **The strip under the box is one row that fits** (INBOX 392). Measured at
// 390 after the attachments joined it: 767px of controls in a 312px strip
// that scrolled sideways, the model picker cut at the strip's edge
// ("Inherited: llam"), and the skills, web search and plan toggles off
// screen to the right with nothing saying they were there. What a phone
// sends a message with is the mode and an attachment; which model answers,
// and what Atlas may use, are settings of the conversation, and the gear
// beside them already opens "How it answers". So below 600 those three
// groups move into that panel (a sheet at that width, `openChatDockMore`)
// and the strip is the mode, the two attachments and the gear, 298px in
// 312. Moved with a marker each, back above 600, the same elements and
// handlers; the header's subline still names the model at a glance.
function dockChatTools(phone) {
  const panel = $("chat-dock-more-panel");
  if (!panel) return;
  // The picker's shell when `enhanceSelect` has built it, the bare select
  // when it has not yet (it runs from a MutationObserver, and wraps the
  // select wherever it then is). Either way, what goes back is the shell.
  const model = $("chat-feature-model");
  const movers = [
    model?.closest(".select-shell") || model,
    $("chat-skills"),
    $("web-search-toggle")?.closest(".chat-tool-group"),
  ];
  let group = panel.querySelector(":scope > .chat-dock-more-tools");
  if (phone) {
    // A labelled row for the model, the way Length and Persona are labelled
    // below it, and one wrapping row for the toggles.
    if (!group) {
      group = document.createElement("div");
      group.className = "chat-dock-more-tools";
      const modelRow = document.createElement("div");
      modelRow.className = "chat-dock-more-row chat-dock-more-model";
      const word = document.createElement("span");
      word.className = "muted";
      word.textContent = "Model";
      modelRow.appendChild(word);
      const toggles = document.createElement("div");
      toggles.className = "chat-dock-more-toggles";
      group.append(modelRow, toggles);
      panel.prepend(group);
    }
    const homes = [
      group.querySelector(".chat-dock-more-model"),
      group.querySelector(".chat-dock-more-toggles"),
      group.querySelector(".chat-dock-more-toggles"),
    ];
    movers.forEach((el, index) => {
      if (!el || panel.contains(el)) return;
      const slot = document.createElement("span");
      slot.className = "chat-tool-home-slot";
      slot.hidden = true;
      el.replaceWith(slot);
      el._chatToolHome = slot;
      homes[index].appendChild(el);
    });
  } else {
    for (const el of [model, ...movers]) {
      if (!el?._chatToolHome) continue;
      const slot = el._chatToolHome;
      delete el._chatToolHome;
      slot.replaceWith(el.parentElement?.classList.contains("select-shell") ? el.parentElement : el);
    }
    group?.remove();
  }
}

function initPhoneChatRow() {
  const query = window.matchMedia(PHONE_TABS);
  dockChatAttachments(query.matches);
  dockChatTools(query.matches);
  query.addEventListener("change", (event) => {
    dockChatAttachments(event.matches);
    dockChatTools(event.matches);
  });
}

initPhoneChatRow();

// --- a sheet, the phone's own dialog ------------------------------------------
// DESIGN.md's recipe index, "A sheet". UI_MODERNISATION_PLAN.md Phase 11.
//
// The app had two sheets before this one and no recipe for either: the three
// sidebars become edge sheets below 600 (`.sidebar-sheet-open`) and the graph's
// dock becomes `.graph-popup-sheet`, each with its own closing behaviour, its
// own idea of what the scrim is and its own bottom inset. A third built the
// same way is how the first two came to disagree, so this is the shared one and
// the lint in `tests/test_ui_recipes.py` says a fourth may not be hand-built.
//
// It is the `.modal-overlay` + `.card.modal-card` dialog the whole app already
// uses, with one class added on each: a dialog that comes from the bottom edge
// rather than the middle of the window is the same object at a different size,
// and building it as one keeps the scrim, the z-index tier, the backdrop press
// and the Escape handling identical to every other dialog here. What the sheet
// classes add is where it sits, how wide it is and the safe-area inset under
// its last row.
//
// `build` fills the card; the caller gets the `close` it can call from a row.
// Focus goes to the first thing in the sheet on open and back to whatever had
// it on close, which for the More sheet is the button that opened it.
//: `variant` is one word, added as `sheet-<variant>` to both the overlay and
//: the card, for a sheet that has to sit somewhere other than across the foot
//: of the window. One user so far, Atlas (INBOX 224), which is a chat and
//: therefore a column: the full-width sheet gave it 1356px lines at 1440. It
//: is a class rather than a second recipe so everything else about a sheet,
//: the scrim, the tier, the head with its X, Escape and the backdrop press,
//: stays the one thing it already is.
function openSheet({ label, sub = "", name, build, variant = "", returnFocus = document.activeElement, onClose = null }) {
  const overlay = document.createElement("div");
  overlay.className = `modal-overlay sheet-overlay${variant ? ` sheet-${variant}` : ""}`;
  overlay.dataset.sheet = name || "";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", label);

  const card = document.createElement("div");
  card.className = `card modal-card sheet-card${variant ? ` sheet-card-${variant}` : ""}`;
  //: The title row carries the one way out that is visible: Escape and a
  //: press on the scrim both close a sheet, and neither is discoverable
  //: from inside it (INBOX 204: "can you add an exit or x button to the top
  //: right of the guide ai panel"). In the recipe, so every sheet has it.
  const head = document.createElement("div");
  head.className = "sheet-head";
  const title = document.createElement("h2");
  title.className = "sheet-title";
  title.textContent = label;
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "ghost small icon-only sheet-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.title = "Close (Escape)";
  const closeIcon = document.createElement("i");
  closeIcon.className = "ph ph-x";
  closeIcon.setAttribute("aria-hidden", "true");
  closeButton.appendChild(closeIcon);
  head.append(title, closeButton);
  card.appendChild(head);
  //: One line of state under the title (the model picker's "Its own model:
  //: granite4.1:3b"): part of the head, in the recipe, so a sheet that needs
  //: it does not hand-build a paragraph with its own margins.
  if (sub) {
    const subLine = document.createElement("p");
    subLine.className = "muted sheet-sub";
    subLine.textContent = sub;
    card.appendChild(subLine);
  }

  let settled = false;
  const close = () => {
    if (settled) return;
    settled = true;
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    onClose?.();
    returnFocus?.focus?.();
  };
  //: Captured, so a keyboard shortcut bound further down the page cannot take
  //: the Escape that is meant to close this. The same shape `confirmDialog`
  //: uses, for the same reason.
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    //: **One Escape, one sheet.** A sheet can open over a sheet (a ⋯ action
    //: sheet over the note page, INBOX 392), and every sheet's listener is
    //: on the document, so one Escape closed both. Only the topmost answers.
    const sheets = document.querySelectorAll(".sheet-overlay");
    if (sheets.length && sheets[sheets.length - 1] !== overlay) return;
    event.stopPropagation();
    close();
  };

  closeButton.addEventListener("click", close);
  build(card, close);

  overlay.appendChild(card);
  wireBackdropClose(overlay, close);
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  (card.querySelector("button, [href], input, select, textarea") || card).focus?.();
  return close;
}

// A row in a sheet: an icon, a name, and the whole width as its target.
function sheetRow(iconClass, label, run) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "sheet-row";
  const icon = document.createElement("i");
  icon.className = iconClass;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = label;
  row.append(icon, text);
  row.addEventListener("click", run);
  return row;
}

// --- More: the three tabs the phone's five-item bar does not show -------------
// UI_MODERNISATION_PLAN.md Phase 11, item 1. Seven columns on a 390px screen is
// seven 55px glyphs with no room for a caption; five is 72px a column at 360,
// which fits every caption in the set. Nothing is hidden by that trade, which
// is the phase's own decision: what leaves the bar is reached in one more tap,
// through this sheet.
//
// Ordered as the tab strip orders them, so the bar and the sheet never disagree
// about where a tab sits. Settings is last because it is the one row here that
// is not a tab.
const PHONE_MORE_TABS = ["dashboard", "timeline", "reminders"];

function openPhoneMoreSheet() {
  const opener = document.getElementById("phone-more-btn");
  opener?.setAttribute("aria-expanded", "true");
  openSheet({
    label: "More",
    name: "more",
    returnFocus: opener,
    onClose: () => opener?.setAttribute("aria-expanded", "false"),
    build: (card, close) => {
      const list = document.createElement("div");
      list.className = "sheet-list";
      for (const tab of PHONE_MORE_TABS) {
        //: Read off the tab button rather than written out again here: the
        //: icon and the caption are then the same two things the strip shows
        //: at every other width, and a tab renamed in the markup is renamed
        //: in the sheet without anyone remembering to.
        const button = document.querySelector(`#tab-bar button[data-tab="${tab}"]`);
        if (!button) continue;
        const icon = button.querySelector(".tab-icon")?.className || "ph ph-circle tab-icon";
        const caption = button.querySelector(".tab-label")?.textContent?.trim()
          || button.getAttribute("aria-label") || tab;
        list.appendChild(sheetRow(icon, caption, () => {
          close();
          switchTab(tab);
        }));
      }
      //: **The agent and the Guide, where the header cannot hold them.**
      //: Measured after they were added (INBOX 190): the header's first
      //: cluster grew from three controls to five, and at 390 the bar's
      //: scrollWidth went from inside the window to 407px against a 390px
      //: client, which is the app scrolling sideways. A phone's answer to a
      //: chrome that will not fit is this sheet, which is where Settings
      //: already went for the same reason; the header keeps both at every
      //: width that has room (600 and up, `10-responsive.css`).
      list.appendChild(sheetRow("ph ph-magic-wand tab-icon", "Ask the agent", () => {
        close();
        toggleAgentPalette();
      }));
      list.appendChild(sheetRow("ph ph-question tab-icon", "Guide", () => {
        close();
        //: settings.js owns the Guide sheet and loads beside this file.
        if (typeof openHelpChat === "function") openHelpChat();
      }));
      list.appendChild(sheetRow("ph ph-gear tab-icon", "Settings", () => {
        close();
        //: settings.js owns the modal and loads beside this file; `typeof` so
        //: a page served without it closes the sheet rather than throwing.
        if (typeof openSettingsModal === "function") openSettingsModal();
      }));
      card.appendChild(list);
    },
  });
}

$("phone-more-btn")?.addEventListener("click", openPhoneMoreSheet);

// The bar has to say where you are on all seven tabs, not on the four it
// shows. While one of the three behind More is the tab in hand, More is the lit
// column: without this the bottom of a phone says nothing at all about where
// you are on three of the seven, which is the defect the caption work fixed for
// the other four.
function syncPhoneMoreButton(activeTabName) {
  const more = document.getElementById("phone-more-btn");
  if (!more) return;
  const behindMore = PHONE_MORE_TABS.includes(activeTabName);
  more.classList.toggle("active", behindMore);
  //: `aria-current`, not `aria-selected`: this is a button that opens a sheet,
  //: not a tab in the tablist, and the two must not be confused by anything
  //: reading the page aloud.
  if (behindMore) more.setAttribute("aria-current", "page");
  else more.removeAttribute("aria-current");
}

// --- how much of the window the on-screen keyboard is covering ----------------
// UI_MODERNISATION_PLAN.md Phase 9, band 4.
//
// The two strips you type at, the chat composer and the documents formatting
// bar, sit at the bottom of their card. On a phone the on-screen keyboard
// comes up over the bottom of the window and takes both with it, so the
// buttons that act on what you are typing are under the keys you are typing
// with.
//
// `window.innerHeight` does not change when a keyboard opens; the *visual*
// viewport does. The difference between the two is the covered strip, and
// writing it into `--keyboard-inset` lets the stylesheet handle the rest:
// both docks already add the token to their bottom padding (07-whiteboard-
// misc.css), so nothing here needs to know which elements exist.
//
// Through the CSSOM, because this app's own CSP refuses a style attribute,
// and rounded because a fractional value here becomes a fractional padding
// on every keystroke of a resize.
//
// **Not verifiable in this sandbox.** Chromium headless has no on-screen
// keyboard, so what is tested here is that the property is written, that it
// is 0 with no keyboard, and that the two docks read it. The behaviour with
// a real keyboard on a real phone is reasoned, not observed.
function initKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const write = () => {
    const covered = window.innerHeight - viewport.height - viewport.offsetTop;
    // Clamped at zero: `offsetTop` is negative while a page is rubber-banding
    // on iOS, which would otherwise write a negative padding.
    document.documentElement.style.setProperty(
      "--keyboard-inset",
      `${Math.max(0, Math.round(covered))}px`
    );
  };
  viewport.addEventListener("resize", write);
  viewport.addEventListener("scroll", write);
  write();
}

initKeyboardInset();

// --- the settings section jump list -------------------------------------------
// UI_MODERNISATION_PLAN.md Phase 9, band 4.
//
// **This one already existed, and that was not the same as it being good
// enough.** Below 640 the Settings dialog already collapses to a single
// column with the seventeen sections laid out as a strip that scrolls
// sideways, and the comment on that rule explains why a vertical list was
// worse: stacked, the nav's natural height is about 700px and the content
// pane was left twenty pixels tall.
//
// The strip fixed that and left its own problem, which is only visible if you
// measure it: at 390 the strip needs **2337px of scroll inside 308px**. Seven
// and a half screen widths of chips, with the group headings hidden because
// they do not work horizontally, to reach "About". Every section is reachable
// and none of them is findable.
//
// A native `<select>` with an `<optgroup>` per heading is the whole answer on
// a phone: it opens the platform's own picker, shows all seventeen at once
// under the three headings the desktop nav uses, is keyboard and screen
// reader accessible for free, and adds no custom popup to a dialog that is
// already a popup. It is built from the nav rather than declared beside it,
// so a section added to the markup appears here with nothing to remember.
function buildSettingsJumpList() {
  const nav = document.getElementById("settings-nav");
  if (!nav || document.getElementById("settings-jump")) return;

  const select = document.createElement("select");
  select.id = "settings-jump";
  select.className = "settings-jump";
  select.setAttribute("aria-label", "Jump to a settings section");
  // A native select, not the enhanced stand-in. The stand-in mirrors a
  // select that CSS hides above 640px, so it drew a "Models" combobox on a
  // desktop Settings page and, opened, covered the pane (reported with a
  // screenshot: "the settings page went blank"). On a phone the native
  // picker is the better control anyway. Same opt-out #timeline-view uses.
  select.setAttribute("data-no-select-enhance", "");

  for (const group of nav.querySelectorAll(":scope > div[role='group']")) {
    const heading = document.getElementById(group.getAttribute("aria-labelledby"));
    const optgroup = document.createElement("optgroup");
    optgroup.label = heading ? heading.textContent.trim() : "Sections";
    for (const button of group.querySelectorAll("button[data-section]")) {
      const option = document.createElement("option");
      option.value = button.dataset.section;
      option.textContent = button.textContent.trim();
      if (button.classList.contains("active")) option.selected = true;
      optgroup.appendChild(option);
    }
    if (optgroup.children.length) select.appendChild(optgroup);
  }
  if (!select.children.length) return;

  // The select drives the real buttons rather than duplicating what they do.
  // Every handler, every side effect and the section history stay in one
  // place, and a hidden button still answers `.click()`.
  select.addEventListener("change", () => {
    nav.querySelector(`button[data-section="${CSS.escape(select.value)}"]`)?.click();
  });

  // And follows them: the section can also change from a search result, from
  // a deep link, or from the dialog's own back and forward pair.
  new MutationObserver(() => {
    const active = nav.querySelector("button[data-section].active");
    if (active && select.value !== active.dataset.section) {
      select.value = active.dataset.section;
    }
  }).observe(nav, { subtree: true, attributes: true, attributeFilter: ["class"] });

  // After the search field, which stays: searching the sections' contents and
  // jumping to one by name are different questions (the search field's own
  // comment makes that case).
  const search = document.getElementById("settings-search");
  const count = document.getElementById("settings-search-count");
  (count || search || nav.firstElementChild)?.after(select);
}

buildSettingsJumpList();

// --- the floating primary action ----------------------------------------------
// UI_MODERNISATION_PLAN.md Phase 9, band 4.
//
// Three docks have a single filled action and the phone band floats it
// bottom-right, in the thumb's arc above the tab bar. The stylesheet does the
// whole appearance; this exists for the same reason `dockTabBar` does, and it
// was found the same way.
//
// **`position: fixed` does not reach the viewport from inside a card.** Every
// `.card` in this app carries `backdrop-filter` (that is what makes it glass),
// and a filtered element is the containing block for its fixed descendants. So
// the button pinned itself to the bottom right of the *card* it lives in,
// which on Library is the card holding the dock, at the top of the page.
// `touch.js` caught it as two controls that cannot be tapped: `#library-refresh`
// and the dock's overflow menu, both covered by "New document" sitting on top
// of them at y=201.
//
// The button moves to its own `.tab-page`, which has no filter and is a direct
// child of the body, so `fixed` means the window again. That element is also
// the one that gets hidden when its tab is not showing, which is what keeps a
// floating action from appearing over a tab it has nothing to do with; parking
// it on the body would have needed a second mechanism to answer that.
const PHONE_FAB = "(max-width: 599.98px)";
const FAB_IDS = [
  "graph-add-node",
  "library-new-doc",
  "timeline-jump-today",
  "notes-new-note",
  "reminders-new",
];

function floatPrimaryActions(floating) {
  for (const id of FAB_IDS) {
    const button = document.getElementById(id);
    if (!button) continue;
    const page = button.closest(".tab-page");
    if (!page) continue;
    if (floating) {
      if (button.parentElement === page) continue;
      // A marker in its place, so it goes back where it was rather than at
      // the end of whatever zone it belonged to.
      const slot = document.createElement("span");
      slot.className = "dock-fab-slot";
      slot.dataset.fabFor = id;
      slot.hidden = true;
      button.replaceWith(slot);
      button.classList.add("dock-fab");
      page.appendChild(button);
    } else {
      if (button.parentElement !== page) continue;
      const slot = page.querySelector(`.dock-fab-slot[data-fab-for="${CSS.escape(id)}"]`);
      button.classList.remove("dock-fab");
      if (slot) slot.replaceWith(button);
    }
  }
}

function initPrimaryFab() {
  const query = window.matchMedia(PHONE_FAB);
  floatPrimaryActions(query.matches);
  query.addEventListener("change", (event) => floatPrimaryActions(event.matches));
}

initPrimaryFab();

// --- the dock's arrange zone folds into its own overflow menu ------------------
// UI_MODERNISATION_PLAN.md Phase 9, bands 2 and 3.
//
// Measured with `scratchpad/ui-sweeps/` at four widths, before this existed:
// the Notes and Graph docks are 36px at 1440 and **80px at 1024 and 820** and
// 172px at 390. They wrap. That is the whole of the owner's complaint about
// this app having no responsive design: nothing was designed for a tablet,
// the row simply ran out of width and folded onto a second and a fourth line
// until the chrome ate the page.
//
// The grammar Phase 8 settled already says what to drop first. Identity,
// search and the one primary action are what a narrow surface must keep;
// order and view are settings you change occasionally, and the dock already
// owns a place for a control used occasionally, its `...` menu. So below
// 1100 the `.dock-arrange` zone moves into that menu, and above 1100 it moves
// back out.
//
// **Moved, not cloned, and never hidden.** Two rules this phase is explicitly
// held to, and both have bitten this codebase before. Cloning a control
// leaves two elements with the same id and one of them wired to nothing
// (`initNotesFiltersSheet` carries the same note). And `display: none` on a
// sort select is a control that no longer exists on a tablet, which is not a
// responsive design, it is a smaller app. Moving the same nodes keeps every
// listener, every id and every enhanced `<select>` shell intact, and the
// controls stay one tap away behind a button that is always in the row.
const DOCK_FOLD_BELOW = "(max-width: 1099.98px)";

// Where the zone came back to. A comment node would be tidier, but a marker
// element can be found again after any re-render of the dock around it.
function dockArrangeSlot(dock) {
  let slot = dock.querySelector(":scope > .dock-arrange-slot");
  if (!slot) {
    slot = document.createElement("span");
    slot.className = "dock-arrange-slot";
    slot.hidden = true;
  }
  return slot;
}

// The zone label, created once per menu and removed when the zone leaves.
function dockArrangeLabel(menu) {
  let label = menu.querySelector(":scope > .dock-arrange-label");
  if (!label) {
    label = document.createElement("span");
    label.className = "muted dock-menu-label dock-arrange-label";
    label.textContent = "Sort and view";
    menu.prepend(label);
  }
  return label;
}

// The whole `.dock-arrange` element, in and out of a menu that sits outside it.
function foldZoneIntoMenu(dock, menu, fold) {
  const inRow = dock.querySelector(":scope > .dock-arrange");
  const inMenu = menu.querySelector(":scope > .dock-arrange");
  if (fold && inRow) {
    inRow.replaceWith(dockArrangeSlot(dock));
    inRow.classList.add("dock-arrange-folded");
    dockArrangeLabel(menu).after(inRow);
  } else if (!fold && inMenu) {
    inMenu.classList.remove("dock-arrange-folded");
    const slot = dock.querySelector(":scope > .dock-arrange-slot");
    if (slot) slot.replaceWith(inMenu);
    else dock.querySelector(":scope > .dock-find")?.after(inMenu);
    menu.querySelector(":scope > .dock-arrange-label")?.remove();
  }
}

// The arrange zone's other children, in and out of a menu that is one of them.
// `data-folded-from` records where each came back to, because unlike the zone
// above these are several elements and they must return in order.
function foldSiblingsIntoMenu(dock, menu, fold) {
  const zone = dock.querySelector(":scope > .dock-arrange");
  if (!zone) return;
  const holder = menu.closest(".dock-menu");
  if (fold) {
    const moving = [...zone.children].filter(
      (child) => child !== holder && !child.classList.contains("dock-native-hidden")
    );
    if (!moving.length) return;
    const label = dockArrangeLabel(menu);
    let after = label;
    for (const child of moving) {
      child.dataset.foldedFrom = dock.dataset.dockName;
      child.classList.add("dock-folded-control");
      after.after(child);
      after = child;
    }
  } else {
    const returning = [...menu.querySelectorAll(":scope > [data-folded-from]")];
    for (const child of returning) {
      delete child.dataset.foldedFrom;
      child.classList.remove("dock-folded-control");
      zone.prepend(child);
    }
    if (returning.length) menu.querySelector(":scope > .dock-arrange-label")?.remove();
  }
}

function foldDockArrange(fold) {
  for (const dock of document.querySelectorAll(".dock[data-dock-name]")) {
    const menu = dock.querySelector(":scope > .dock-actions > .dock-more > .dock-menu-list");
    if (menu) {
      foldZoneIntoMenu(dock, menu, fold);
      continue;
    }
    // A dock whose only overflow menu lives *inside* the arrange zone cannot
    // fold the zone into it, because the zone contains the destination. The
    // Timeline is the one: Phase 8 gave it an `Options` menu in the arrange
    // group and no `...` in the actions group. Folding its siblings into that
    // menu is the same move by the same rule, and it leaves the row at
    // identity + Options + Today + help.
    const inner = dock.querySelector(":scope > .dock-arrange .dock-menu > .dock-menu-list");
    if (inner) foldSiblingsIntoMenu(dock, inner, fold);
  }
}

function initDockFolding() {
  const query = window.matchMedia(DOCK_FOLD_BELOW);
  foldDockArrange(query.matches);
  // A window dragged across the boundary, or a tablet rotated, re-decides.
  query.addEventListener("change", (event) => foldDockArrange(event.matches));
}

initDockFolding();

//: **The second fold: a dock's secondary actions, at a phone's width.**
//: The Boards & maps dock was four rows and 198px at 390, where every other
//: Library dock is two rows and 114px (pass2.md, Remaining 1). Its title and
//: its actions need about 480px of a 309px row: New board, New mind map,
//: refresh, help and the ⋯. The arrange fold above has already emptied the
//: arrange zone into the ⋯, so what is left is actions, and the grammar says
//: which of them a narrow row keeps: the one primary, help, and the ⋯ that
//: holds everything else.
//:
//: An action marked `data-fold-narrow` moves into its dock's ⋯ below 600px
//: and back out above it, by the rule the arrange fold is held to: moved, not
//: cloned, and never hidden, so it keeps its id, its handler and its title.
//: In the menu it is a menu row (`.doc-dock-menu-item`), and an icon-only
//: control gets its accessible name written beside its icon, since a row of
//: bare icons in a list is a row of guesses.
const DOCK_ACTIONS_FOLD_BELOW = "(max-width: 599.98px)";

function foldDockActions(fold) {
  for (const dock of document.querySelectorAll(".dock[data-dock-name]")) {
    const menu = dock.querySelector(":scope > .dock-actions > .dock-more > .dock-menu-list");
    if (!menu) continue;
    if (fold) {
      const moving = [...dock.querySelectorAll(":scope > .dock-actions > [data-fold-narrow]")];
      let after = null;
      for (const control of moving) {
        const slot = document.createElement("span");
        slot.className = "dock-action-slot";
        slot.hidden = true;
        slot.dataset.for = control.id;
        control.replaceWith(slot);
        control.dataset.rowClass = control.className;
        control.className = "doc-dock-menu-item dock-folded-action";
        if (!control.querySelector(".toolbar-word, .dock-folded-word")) {
          const word = document.createElement("span");
          word.className = "dock-folded-word";
          word.textContent = control.getAttribute("aria-label") || control.title || "";
          control.append(" ", word);
        }
        if (after) after.after(control);
        else menu.prepend(control);
        after = control;
      }
    } else {
      for (const control of menu.querySelectorAll(":scope > .dock-folded-action")) {
        const slot = dock.querySelector(`:scope > .dock-actions > .dock-action-slot[data-for="${control.id}"]`);
        if (!slot) continue;
        control.className = control.dataset.rowClass || "";
        delete control.dataset.rowClass;
        control.querySelector(":scope > .dock-folded-word")?.remove();
        //: The space `append(" ", word)` put before the word, left behind as
        //: a trailing text node that would widen the icon button by a glyph.
        if (control.lastChild?.nodeType === Node.TEXT_NODE && !control.lastChild.data.trim()) {
          control.lastChild.remove();
        }
        slot.replaceWith(control);
      }
    }
  }
}

function initDockActionFolding() {
  const query = window.matchMedia(DOCK_ACTIONS_FOLD_BELOW);
  foldDockActions(query.matches);
  query.addEventListener("change", (event) => foldDockActions(event.matches));
}

initDockActionFolding();
watchOverlays(); // page behind a dialog must not scroll
initAutoGrow(); // capture + magic-add boxes follow their content
// Used to reopen on whichever tab was last active, with only the very
// first-ever visit defaulting to Dashboard. Changed on direct request: every
// load should open on Dashboard, not just the first one, closing the app on
// Chat and coming back to Chat wasn't "picking up where you left off" in the
// way that was wanted. `activeTab` is still tracked (`switchTab` still
// writes it) for the things that read the *current* tab during a session, 
// the scroll-to-top button, keyboard tab-cycling, just not to decide where
// a fresh load starts.
//
// revealTab, not switchTab: this runs before initAuth() has asked the server
// whether a token is even needed yet, so switchTab("dashboard")'s dashboard
// branch: renderDashboard(), which fetches stats/greeting/heatmap/tag-cloud/
// on-this-day/entries/chat/recent/most-accessed: used to fire here every
// cold load, token or not. With one already unlocked (stale-but-present, or
// simply not yet re-checked this tab) that's one harmless early 401 caught by
// api()'s isLockout path; with none at all, the common case, lock screen
// still up: it was ~20 requests a load, every one with an empty
// X-Auth-Token header, logged as browser console errors and, for the
// non-silent calls among them, into Settings → Logs. None of it painted
// anything (the lock overlay covers the tab), and startApp() already reloads
// the real data once a session exists (`entriesReady.then(refreshActiveTab)`
// above): so the early fetch was pure waste, not a second source of truth.
// The visual reveal still has to happen now, unconditionally: the tab-pages
// default to `hidden` in the markup, and the lock overlay is the only thing
// standing between a bare `hidden` class and a blank white app once it's
// dismissed.
revealTab("dashboard");

$("local-only-ai").addEventListener("change", async (e) => {
  const on = e.target.checked;
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ local_only_ai: on }),
  }).catch((error) => toast(error.message, true));
  // Say it plainly on the way out of the safe state. Turning the lock ON is
  // unremarkable; turning it OFF is the moment worth naming, because the app's
  // central promise stops being enforced at exactly that click.
  toast(
    on
      ? "Atlas is locked to this machine."
      : "Off: MemoryMap will now let you point Atlas at a server on the internet."
  );
  refreshModelStatus();
});
$("task-history-clear").addEventListener("click", async () => {
  await apiJson("/tasks/history/clear", { method: "POST" }).catch((e) =>
    toast(e.message, true)
  );
  renderTasks();
});
// Quit, from either place it is offered: the top bar (§36D) and Settings →
// System. One handler, bound to both, rather than two copies that drift.
async function quitApp() {
  // Confirmed, because it is not undoable from inside the app: once the
  // server is down, the button that would bring it back is on the page that
  // just stopped being served.
  if (!(await confirmDialog(
    "Quit MemoryMap?\n\nThe app and its server will stop. Your notes are already saved.",
    { confirmLabel: "Quit" }
  ))) {
    return;
  }
  try {
    await apiJson("/shutdown", { method: "POST" });
  } catch {
    // The server may drop the connection as it goes. That is the request
    // succeeding, not failing, so it is not worth an error toast.
  }
  document.body.innerHTML =
    '<div class="farewell">' +
    "<h1>MemoryMap has stopped.</h1>" +
    "<p>Your notes are saved. You can close this tab.</p></div>";
}
$("app-quit").addEventListener("click", quitApp);
$("quit-btn")?.addEventListener("click", quitApp);
for (const button of document.querySelectorAll("#chat-mode-seg button")) {
  button.addEventListener("click", () => setChatMode(button.dataset.chatMode));
}
// Web search saves on change rather than behind a Save button: there are two
// controls, and a checkbox that needs a second click elsewhere to take effect
// is the shape of "this control does nothing" that keeps getting reported.
$("pref-web-search").addEventListener("change", saveWebSearchSettings);
$("pref-searxng").addEventListener("change", saveWebSearchSettings);

$("pref-update-check").addEventListener("change", (e) =>
  setPreference("update_check_enabled", e.target.checked)
);
$("update-check-now").addEventListener("click", () => checkForUpdate());
$("update-apply-now").addEventListener("click", async () => {
  const button = $("update-apply-now");
  const status = $("update-check-status");
  button.disabled = true;
  const ok = await applyUpdateNow((state) => {
    if (status) {
      status.textContent = state.total_bytes
        ? `${state.step} (${Math.round((state.done_bytes / state.total_bytes) * 100)}%)`
        : state.step;
    }
  });
  if (!ok) {
    // Failed (offline, GitHub unreachable, no asset), never leave the
    // button stuck disabled over a real network error someone can just
    // retry once they're back online.
    button.disabled = false;
    toast((status && status.textContent) || "Couldn't apply the update.", true);
  }
});
$("pref-auto-update").addEventListener("change", (e) =>
  setPreference("auto_update_enabled", e.target.checked)
);
$("pref-update-channel-main").addEventListener("change", (e) =>
  setPreference("update_channel", e.target.checked ? "main" : "stable")
);
// "Choose a specific version…" fetches the release list only on demand, 
// not on every Settings open, so leaving this tab open doesn't mean
// repeated GitHub calls, same restraint as the rest of this app's opt-in
// network features.
$("update-show-versions").addEventListener("click", async () => {
  const select = $("update-version-select");
  const installBtn = $("update-install-version");
  const status = $("update-version-status");
  status.textContent = "Loading releases…";
  const result = await apiJson("/update/releases", { silent: true }).catch(() => null);
  if (!result || !result.available) {
    select.classList.add("hidden");
    installBtn.classList.add("hidden");
    status.textContent =
      result?.reason === "channel_unavailable"
        ? "Not available while tracking the main branch."
        : result?.reason === "not_supported"
          ? "Only available for the packaged Windows app."
          : result?.reason === "disabled"
            ? "Enable 'Check GitHub for a newer version' first."
            : "Couldn't reach GitHub to list releases.";
    return;
  }
  select.innerHTML = "";
  for (const release of result.releases) {
    const option = document.createElement("option");
    option.value = release.tag;
    option.textContent = release.tag === `v${result.current}` || release.version === result.current
      ? `${release.name} (current)`
      : release.name;
    select.appendChild(option);
  }
  select.classList.toggle("hidden", result.releases.length === 0);
  installBtn.classList.toggle("hidden", result.releases.length === 0);
  status.textContent = result.releases.length ? "" : "No installable releases found.";
});
$("update-install-version").addEventListener("click", async () => {
  const select = $("update-version-select");
  const button = $("update-install-version");
  const status = $("update-version-status");
  const tag = select.value;
  if (!tag) return;
  if (
    !(await confirmDialog(
      `Download and install ${tag} now? MemoryMap AI will close once the installer starts.`,
      { confirmLabel: "Install" }
    ))
  ) {
    return;
  }
  button.disabled = true;
  select.disabled = true;
  const ok = await applyUpdateNow((state) => {
    status.textContent = state.total_bytes
      ? `${state.step} (${Math.round((state.done_bytes / state.total_bytes) * 100)}%)`
      : state.step;
  }, tag);
  if (!ok) {
    button.disabled = false;
    select.disabled = false;
    toast(status.textContent || "Couldn't install that version.", true);
  }
});

// Not a plain setPreference: switching Dev view/User view is meant to take
// effect live, not just on the next launch (asked for directly: togglable
// from Settings as well as the tray). /system/console-mode saves the same
// preference and, in the desktop app on Windows, restarts the whole
// process into the new console mode right after responding.
$("pref-show-console").addEventListener("change", async (e) => {
  const checked = e.target.checked;
  try {
    const result = await apiJson("/system/console-mode", {
      method: "POST",
      body: JSON.stringify({ show_console_on_startup: checked }),
    });
    if (prefsCache) prefsCache.show_console_on_startup = result.show_console_on_startup;
    toast(
      result.restarting
        ? `Switching to ${checked ? "Dev" : "User"} view: restarting…`
        : `Will switch to ${checked ? "Dev" : "User"} view next launch.`
    );
  } catch (error) {
    e.target.checked = !checked; // the change didn't take: don't leave the switch lying
    toast(error.message || "Couldn't switch view.", true);
  }
});

// ROADMAP item C: "several extras only take effect on restart and the app
// says so without offering one." This is that offer, a plain restart, not
// tied to any preference changing, for Settings → About.
async function forceReloadApp() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs || []).map((r) => r.unregister()));
    const keys = await window.caches?.keys?.();
    await Promise.all((keys || []).map((k) => caches.delete(k)));
  } catch {
    // Nothing to clear, or storage refused, the reload alone still helps.
  }
  location.reload();
}
$("about-force-reload")?.addEventListener("click", forceReloadApp);

$("about-restart")?.addEventListener("click", async () => {
  if (
    !(await confirmDialog(
      "Restart MemoryMap?\n\nThe app closes and reopens. Your notes are already saved."
    ))
  ) {
    return;
  }
  try {
    const result = await apiJson("/system/restart", { method: "POST" });
    if (result.restarting) {
      toast("Restarting…");
    } else {
      // The backend's own platform check said no, this build genuinely
      // can't relaunch itself (see /system/restart's own docstring for
      // which platforms that covers).
      toast("Restart isn't available in this build, close and reopen MemoryMap by hand.", true);
    }
  } catch (error) {
    toast(error.message || "Couldn't restart.", true);
  }
});

// Takes effect on the next close, not on a restart, the handler reads the
// preference each time the window is closed rather than at launch, precisely
// so this switch is not a "restart to apply" one.
//: Read by the launcher on the next launch, before any window opens, so this
//: is not a "restart to apply" switch either: it decides what the *next*
//: double-click does.
$("pref-new-window-on-launch")?.addEventListener("change", (e) => {
  const checked = e.target.checked;
  setPreference("new_window_on_launch", checked);
  toast(
    checked
      ? "Launching again will open another window onto this notebook."
      : "Launching again will bring this window forward."
  );
});

$("pref-close-to-tray")?.addEventListener("change", (e) => {
  const checked = e.target.checked;
  setPreference("close_to_tray", checked);
  toast(
    checked
      ? "Closing the window will keep MemoryMap in the tray."
      : "Closing the window will quit MemoryMap."
  );
});

//: **Where an export lands, from a notification.** On the desktop the OS file
//: manager opens on the folder; a browser tab has no file manager to hand
//: this to, so it gets the Settings list below, where every export has a
//: download link of its own.
async function openExportsFromNotification() {
  if (await desktopShell()) {
    apiJson("/files/open-exports-folder", { method: "POST" }).catch((error) => {
      toast(error.message || "Couldn't open the exports folder.", true);
    });
    return;
  }
  openSettingsModal("data", "exports-recent");
}

//: **The exports folder, as a list in Settings** (INBOX 159: "an area
//: somewhere maybe in settings to open the exports folder location and access
//: exported or downloaded files and images"). Fed by `GET /files/exports`,
//: newest first; each row downloads its file through `GET
//: /files/exports/{name}`, fetched with the app's own auth header and handed
//: to the browser as a download, since a bare link cannot carry the token.
async function renderExportsList() {
  const list = $("exports-list");
  const empty = $("exports-empty");
  if (!list || !empty) return;
  const body = await apiJson("/files/exports", { silent: true }).catch(() => null);
  const files = (body && body.files) || [];
  list.replaceChildren();
  empty.classList.toggle("hidden", files.length > 0);
  empty.textContent = body
    ? `Nothing exported yet. Files land in ${body.path}.`
    : "The exports folder could not be read.";
  for (const file of files) {
    const row = document.createElement("li");
    row.className = "row exports-row";
    const name = document.createElement("span");
    name.className = "exports-name";
    name.textContent = file.filename;
    name.title = file.filename;
    const facts = document.createElement("span");
    facts.className = "muted text-sm exports-facts";
    const size = typeof formatFileSize === "function" ? formatFileSize(file.bytes) : `${file.bytes} B`;
    facts.textContent = `${size} · ${relativeTime(file.modified_at)}`;
    const get = smallButton("ph:download-simple Download", `Download ${file.filename}`, async () => {
      try {
        const response = await api(`/files/exports/${encodeURIComponent(file.filename)}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast(error.message || `Couldn't fetch ${file.filename}.`, true);
      }
    });
    get.classList.add("ghost");
    row.append(name, facts, get);
    list.appendChild(row);
  }
}

$("exports-refresh")?.addEventListener("click", renderExportsList);

$("open-exports-folder").addEventListener("click", async () => {
  try {
    const result = await apiJson("/files/open-exports-folder", { method: "POST" });
    toast(`Opened ${result.path}`);
  } catch (error) {
    toast(error.message || "Couldn't open the exports folder.", true);
  }
});

// Saved on blur/Enter, not on every keystroke, a half-typed path is not a
// preference worth validating server-side yet. Reverts the field on a
// rejected value rather than leaving a bad path sitting there looking saved.
async function saveExportSaveDir() {
  const input = $("pref-export-dir");
  const value = input.value.trim();
  if (value === (prefsCache?.export_save_dir || "")) return; // nothing changed
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ export_save_dir: value }),
    });
    input.value = prefsCache.export_save_dir;
    toast(value ? `Exports will now be saved to ${prefsCache.export_save_dir}` : "Exports will save to the default location.");
  } catch (error) {
    input.value = prefsCache?.export_save_dir || "";
    toast(error.message || "Couldn't save that folder.", true);
  }
}
$("pref-export-dir").addEventListener("blur", saveExportSaveDir);
$("pref-export-dir").addEventListener("keydown", (event) => {
  if (event.key === "Enter") $("pref-export-dir").blur();
});
$("pref-export-dir-reset").addEventListener("click", () => {
  $("pref-export-dir").value = "";
  saveExportSaveDir();
});

function toggleAutonomousPanel() {
  const panel = $("autonomous-settings-panel");
  if (panel) panel.classList.toggle("hidden", !$("pref-autonomous-tasks").checked);
}
// Each of these saves only its own key via `setPreference`, never
// `savePrefs`, which rebuilds and re-sends every field on the Preferences
// section's own form. That form may never have been rendered this session
// (a fresh page load landing straight on Background tasks, say), and its
// stale/default DOM values would silently overwrite whatever was really
// saved the moment any one of these checkboxes changed.
$("pref-autonomous-tasks").addEventListener("change", (e) => {
  toggleAutonomousPanel();
  setPreference("autonomous_tasks_enabled", e.target.checked);
});
$("pref-background-filing").addEventListener("change", (e) =>
  setPreference("background_filing", e.target.checked)
);
$("pref-ai-first-filing").addEventListener("change", (e) =>
  setPreference("ai_first_filing", e.target.checked)
);
$("pref-auto-caption-images").addEventListener("change", (e) =>
  setPreference("auto_caption_images", e.target.checked)
);
$("pref-auto-read-image-text").addEventListener("change", (e) =>
  setPreference("auto_read_image_text", e.target.checked)
);
$("pref-auto-tag").addEventListener("change", (e) =>
  setPreference("auto_tag_enabled", e.target.checked)
);
$("pref-auto-link").addEventListener("change", (e) =>
  setPreference("auto_link_enabled", e.target.checked)
);
$("pref-auto-dedupe").addEventListener("change", (e) =>
  setPreference("auto_dedupe_enabled", e.target.checked)
);
$("pref-auto-stale-review").addEventListener("change", (e) =>
  setPreference("auto_stale_review_enabled", e.target.checked)
);
$("pref-auto-capture").addEventListener("change", (e) =>
  setPreference("auto_capture_enabled", e.target.checked)
);
$("pref-battery-mode").addEventListener("change", (e) => {
  setPreference("battery_efficient_mode", e.target.checked);
  $("power-saver-indicator")?.classList.toggle("hidden", !e.target.checked);
  //: `prefsCache` is what `batteryModeOn` reads, and `setPreference` writes
  //: the server before the cache, so the two pictures are restarted from
  //: here with the new value already in hand. Without this the setting took
  //: effect on the next load, which for a setting about power is the wrong
  //: half of "immediately".
  if (prefsCache) prefsCache.battery_efficient_mode = e.target.checked;
  if (typeof startBgArt === "function") startBgArt();
  if (typeof renderDashboard === "function") renderDashboard();
});
$("pref-autonomous-interval").addEventListener("change", (e) =>
  setPreference("autonomous_tasks_interval_hours", Number(e.target.value) || 6)
);
$("pref-autonomous-model").addEventListener("change", (e) =>
  setPreference("autonomous_tasks_model", e.target.value.trim())
);
//: The switch changes which model background jobs run on, so the line under
//: the utility picker (INBOX 277) is re-read once the preference has landed
//: rather than left describing the old state until the next poll.
$("pref-smart-model-routing").addEventListener("change", async (e) => {
  await setPreference("smart_model_routing_enabled", e.target.checked);
  refreshModelStatus();
});

$("semantic-search-toggle")?.addEventListener("change", () => {
  // `loadEntries`, which is what re-runs the list with the toggle's new
  // state: this said `loadAllNotes()`, a name no file in frontend/ has ever
  // defined, so turning semantic search on or off while a search term was in
  // the box raised a ReferenceError and left the old results on screen.
  // `tests/test_frontend_symbols.py` is what found it. The same pair, "set
  // the term, then reload if semantic is on", is written out at the
  // "Search the notebook" selection action.
  if (noteSearch) loadEntries();
});
// The review panel for the background librarian (ROADMAP §40 item 2).
//
// A true dry-run is not available here, the agent picks each call from the
// result of the last one, so a pass with the writes stubbed out stops
// resembling the pass that would really run, and a preview that lies is worse
// than no preview. What is available is honest and nearly as useful: every
// write already captured the call that reverses it, so the pass can be read
// back and undone one item at a time. `changeRow` is the same renderer the
// chat uses for a skill's result, so Undo here goes through exactly the path
// the chat's own Undo buttons do.
async function renderAutonomousReview() {
  const box = $("autonomous-review");
  const list = $("autonomous-review-list");
  if (!box || !list) return;

  const pass = await apiJson("/tasks/autonomous/last").catch(() => null);
  const changes = pass?.changes || [];
  box.classList.toggle("hidden", changes.length === 0);
  if (!changes.length) return;

  const when = pass.finished_at ? new Date(pass.finished_at).toLocaleString() : "";
  $("autonomous-review-title").textContent =
    `What the last run changed, ${changes.length} thing(s)` + (when ? `, ${when}` : "");
  list.replaceChildren(...changes.map((change) => changeRow(change)));
}

async function addMemoryByHand() {
  const input = $("memory-new");
  const status = $("memory-status");
  const text = (input?.value || "").trim();
  status.classList.add("hidden");
  status.classList.remove("error");
  if (!text) return;
  try {
    await apiJson("/memory", { method: "POST", body: JSON.stringify({ content: text }) });
    input.value = "";
    renderMemorySettings();
  } catch (error) {
    status.textContent = error.message || "Couldn't save that.";
    status.classList.remove("hidden");
    status.classList.add("error");
  }
}

$("memory-add")?.addEventListener("click", addMemoryByHand);
$("memory-new")?.addEventListener("keydown", (e) => {
  // Enter saves. Typing a one-line rule and having to reach for the mouse is
  // the kind of small friction that stops people using a feature at all.
  if (e.key === "Enter") { e.preventDefault(); addMemoryByHand(); }
});

$("autonomous-review-clear")?.addEventListener("click", async () => {
  await api("/tasks/autonomous/last/clear", { method: "POST" }).catch(() => {});
  renderAutonomousReview();
});

$("autonomous-trigger").addEventListener("click", () => {
  api("/tasks/trigger-autonomous", { method: "POST" })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      toast(
        body.started === false
          ? "A pass is already running, the results will appear below."
          : "Optimization started. Its changes will be listed below when it finishes."
      );
      // The pass runs on a worker thread, so there is nothing to await. Look
      // again shortly rather than leaving the panel showing the previous run.
      setTimeout(renderAutonomousReview, 4000);
    })
    .catch((err) => toast(err.message, true));
});

// There is no Tags / Recycle bin / Activity shortcut in the notes sidebar, and
// `openLibraryOn` went with them. The buttons were dropped once with their
// handlers left behind (which is how `test_frontend_ids` found three ids that
// nothing defined), briefly restored during the §40 audit on the assumption
// the removal had been accidental, and then removed again, deliberately this
// time, because the owner asked for it.
//
// The reasoning is the Library's own (§36G): the bin, the activity log and the
// tag list are all "show me the things of this sort", which is what the
// Library is, and it reaches each of them through its own filter chips. A
// second door in a sidebar that is meant to be a category list is exactly the
// "too much in one place, clashing with the text beside it" this app has been
// asked to stop doing.
$("entry-template")?.addEventListener("click", openNoteTemplateDialog);
$("note-template-list")?.addEventListener("keydown", noteTemplateListKeys);
$("note-template-use")?.addEventListener("click", useNoteTemplate);

// Chat tab (Wave C).
$("chat-send").addEventListener("click", () => sendChatMessage());

$("voice-model-select").addEventListener("change", (e) =>
  setPreference("voice_model", e.target.value)
);
