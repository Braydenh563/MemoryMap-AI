// sheets-selects.js: resizable sidebars, sheets and their dismissal, the select
// menu recipe. Moved out of app.js on 2026-09-26 as one contiguous range (INBOX
// 426 cc, docs/roadmap/agent-remaining/appjs-split.md). A classic script
// sharing app.js's globals, loaded in app.js's old order; nothing in an earlier
// file calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- resizable sidebars ----------------------------------------------------------
// Both sidebars were a fixed 230px. In the chat list that left about four
// characters of a conversation's name visible, which is no name at all, and
// how much room a sidebar deserves depends on your screen and your titles,
// not on a number picked once.
//
// Drag the edge to resize. The width is remembered per sidebar, and there's a
// keyboard path because a mouse-only control is one that some people simply
// cannot use.

const SIDEBAR_MIN = 170;
const SIDEBAR_MAX = 520;
// Per-sidebar starting widths. The chat list carries the most text per row, 
// a title, then a date/turns/tokens line, so it starts wider than a list of
// one-word category names.
const SIDEBAR_DEFAULTS = { "chat-sidebar": 300, sidebar: 260, "doc-sidebar": 260 };
const sidebarDefault = (id) => SIDEBAR_DEFAULTS[id] || 260;

function sidebarWidth(id, fallback = 260) {
  const saved = Number(localStorage.getItem(`sidebarWidth:${id}`));
  return Number.isFinite(saved) && saved >= SIDEBAR_MIN ? saved : fallback;
}

// Below this the layout stacks into one column and there is no column to size.
//
// **Moved from 720 to 820** (UI_MODERNISATION_PLAN.md Phase 9, band 3: an
// iPad in portrait is 768 or 810 CSS px). The number has to move here and in
// the stylesheet together, and this is the half that is easy to forget:
// `applySidebarWidth` writes an inline `grid-template-columns` when the
// layout is *not* stacked, and an inline style beats a media query, so a CSS
// breakpoint at 820 with this constant left at 720 would have left every
// width from 721 to 819 silently two-column with a stylesheet that said
// otherwise. Verified at 721, 780 and 819 after the move.
const STACKED_LAYOUT = "(max-width: 819.98px)";

function layoutIsStacked() {
  return window.matchMedia(STACKED_LAYOUT).matches;
}

//: The most of the window a sidebar may take. Reported directly: "the ui
//: needs to seemlessly adapt and perfect itself on any resolution and not
//: just be squashed but still fit somehow."
//:
//: Measured before this existed: the sidebar was its saved pixel width at
//: *every* viewport: 260px at 1920 (14% of the window, fine) and 260px at
//: 820 (32%, leaving the notes column 459px). The sidebar never gave up a
//: pixel, so the content absorbed the entire difference. That is the
//: "squashed but still fit somehow" feeling, and its cause is a stored
//: absolute width applied to a relative space.
//:
//: A stylesheet `clamp()` cannot fix it: the width is written as an inline
//: `grid-template-columns` on the parent (below), and an inline style beats
//: every rule. So the cap belongs here, where the number is decided.
const SIDEBAR_VIEWPORT_SHARE = 0.24;

//: The iPad-landscape band (UI_MODERNISATION_PLAN.md Phase 9, 820-1100).
//:
//: The share above is a ratio, and a ratio alone gets this band wrong in
//: both directions: 24% of 1024 is 246px, which is a desktop sidebar on a
//: tablet, and 24% of 820 is 197px, which is a different sidebar again on
//: the same device held the other way. A band is supposed to look like one
//: design, so this one names an absolute ceiling instead: 12rem, the width
//: at which a category name and a conversation title still read.
//:
//: It has to live here rather than in the stylesheet. The sidebar's width is
//: written as an inline `grid-template-columns` on the parent (see
//: applySidebarWidth below), and an inline style beats every rule in every
//: file, media query or not. A `clamp()` in CSS would have looked correct,
//: passed review, and done nothing at all.
const SIDEBAR_TABLET_MAX = 192;
const SIDEBAR_TABLET_BAND = "(min-width: 820px) and (max-width: 1099.98px)";

function layoutIsTablet() {
  return window.matchMedia(SIDEBAR_TABLET_BAND).matches;
}

//: What the sidebar may actually occupy right now, the user's own width
//: where there is room for it, less where there is not, never below the
//: floor a category name needs to stay readable.
function sidebarFittedWidth(saved) {
  const cap = Math.max(SIDEBAR_MIN, Math.round(window.innerWidth * SIDEBAR_VIEWPORT_SHARE));
  const banded = layoutIsTablet() ? Math.min(cap, SIDEBAR_TABLET_MAX) : cap;
  return Math.min(saved, banded);
}

function applySidebarWidth(aside, width, { remember = true } = {}) {
  const clamped = Math.min(Math.max(Math.round(width), SIDEBAR_MIN), SIDEBAR_MAX);
  // **The user's choice is stored, the fitted width is applied**, and the
  // split matters: storing the fitted one would mean dragging a window
  // narrow permanently shrank a preference the user set on a wide screen,
  // with no way to notice it had happened. Widening the window restores it.
  // `remember: false` is for the re-fit on resize, which is the app
  // reacting rather than the user choosing.
  if (remember) localStorage.setItem(`sidebarWidth:${aside.id}`, String(clamped));
  aside.style.setProperty("--saved-width", `${clamped}px`);

  if (layoutIsStacked()) {
    aside.parentElement.style.removeProperty("grid-template-columns");
    return clamped;
  }

  if (aside.classList.contains("sidebar-collapsed")) {
    aside.parentElement.style.gridTemplateColumns = `48px minmax(0, 1fr)`;
  } else {
    aside.parentElement.style.gridTemplateColumns = `${sidebarFittedWidth(clamped)}px minmax(0, 1fr)`;
  }
  return clamped;
}

//: Re-fit every sidebar as the window changes size, not only when it crosses
//: the one stacking breakpoint below. Without this the cap above would apply
//: at load and then go stale the moment anyone resized a window, which is
//: the normal way a desktop app is used, and exactly the case the report was
//: about. `remember: false`: this is not the user choosing a width.
let sidebarRefitTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(sidebarRefitTimer);
  sidebarRefitTimer = setTimeout(() => {
    for (const id of ["sidebar", "chat-sidebar", "doc-sidebar"]) {
      const aside = document.getElementById(id);
      if (aside?.dataset.resizable) {
        applySidebarWidth(aside, sidebarWidth(id, sidebarDefault(id)), { remember: false });
      }
    }
  }, 120);
});

// Rotating a phone, or dragging a desktop window narrow, crosses the
// threshold without reloading: so re-decide then too.
// Rotating a phone, or dragging a desktop window narrow, crosses a band
// boundary without reloading, so both boundaries re-decide the width. The
// tablet band is listed with the stacking one because forgetting it is
// exactly the failure the band exists to prevent: an iPad turned from
// portrait to landscape would come back with the portrait sheet's width.
for (const query of [STACKED_LAYOUT, SIDEBAR_TABLET_BAND]) {
  window.matchMedia(query).addEventListener("change", () => {
    applySidebarSheetMode(layoutIsStacked());
    for (const id of SIDEBAR_IDS) {
      const aside = document.getElementById(id);
      if (aside?.dataset.resizable) {
        applySidebarWidth(aside, sidebarWidth(id, sidebarDefault(id)), { remember: false });
      }
    }
  });
}

// --- the sidebars, as sheets (Phase 9, bands 3 and 4) -------------------------
// Stacked, a sidebar used to sit *above* the content: at 390 the Notes
// categories card was 48px of chrome before the first note and the chat list
// was 99px before the first message, and on a tablet in portrait it is worse
// because there is more of it. A panel you are not using should not cost the
// panel you are using any height at all.
//
// So below 820 the three sidebars leave the flow and become sheets that slide
// in from the left, over the content, with a rail left showing that carries
// the collapse toggle they already have. No new control, no new gesture: the
// button that opens and closes a sidebar on a desktop opens and closes the
// sheet on a tablet.
//
// The state is a class of its own rather than a reuse of `.sidebar-collapsed`,
// and the reason is worth writing down. `.sidebar-collapsed` means something
// specific on a desktop, a 48px rail with a hover-peek, and it carries
// `width: 48px !important` plus a `:hover` rule at higher specificity that
// re-expands it. Reusing it here would mean fighting two `!important`
// declarations from a later block, and a touch-hold would have triggered the
// hover-peek. Instead the desktop classes are taken off while stacked and put
// back on the way out, so none of those rules apply and there is nothing to
// fight.
const SIDEBAR_IDS = ["sidebar", "chat-sidebar", "doc-sidebar"];

function eachSidebar(fn) {
  for (const id of SIDEBAR_IDS) {
    const aside = document.getElementById(id);
    if (aside) fn(aside, id);
  }
}

function applySidebarSheetMode(stacked) {
  eachSidebar((aside) => {
    if (stacked) {
      // Remember the desktop state exactly once, so a second call inside the
      // band cannot record "not collapsed" over the user's real preference.
      if (aside.dataset.deskCollapsed === undefined) {
        aside.dataset.deskCollapsed = aside.classList.contains("sidebar-collapsed") ? "1" : "";
      }
      aside.classList.remove("sidebar-collapsed");
      aside.parentElement?.classList.remove("layout-sidebar-collapsed");
      // A sheet opens closed. Arriving with the content already covered is
      // the failure a sheet exists to avoid.
      aside.classList.remove("sidebar-sheet-open");
    } else {
      aside.classList.remove("sidebar-sheet-open");
      if (aside.dataset.deskCollapsed) {
        aside.classList.add("sidebar-collapsed");
        aside.parentElement?.classList.add("layout-sidebar-collapsed");
      }
      delete aside.dataset.deskCollapsed;
    }
  });
}

// --- the dismissal every sheet keeps, wherever it is built -------------------
// UI_MODERNISATION_PLAN.md Phase 11. `openSheet` builds a modal bottom sheet
// out of nothing and owns its own listeners for the life of that one overlay.
// The two sheets that predate it are a different object: an element that is
// already on the page and *becomes* a sheet inside a band (the three sidebars
// below 600, the graph's popup at the bottom of the map). Those cannot be built
// by `openSheet` without losing what each was built for, and the reason is
// written in DESIGN.md's index rather than rediscovered: the sidebar sheet
// keeps a rail on screen with its own opener on it, which is the way back, and
// the graph's is deliberately not modal, because the map it came from has to
// stay visible for the sheet to have an origin.
//
// What they must share is the *dismissal*, which is the half a hand-built sheet
// always gets wrong: Escape, a press outside, and the focus going back to the
// control that opened it. This is that half, in one place, so a third in-place
// sheet inherits all three rather than inventing them.
//
// Captured, both of them, which is the one behavioural change this extraction
// makes: the sidebar sheet's Escape was a bubbling listener, so any handler
// bound further down the page that stops an Escape took it first. `openSheet`
// has always captured for exactly that reason.
function wireInPlaceSheetDismissal({ find, close }) {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const open = find();
    if (!open) return;
    event.stopPropagation();
    close(open);
  }, true);
  document.addEventListener("pointerdown", (event) => {
    const open = find();
    if (!open || open.contains(event.target)) return;
    close(open);
  }, true);
}

// Escape closes an open sheet, and a tap on the content behind it does too.
// Both are what a sheet means; without them the only way back is the rail,
// which is the half of the panel the sheet is covering.
function initSidebarSheetDismissal() {
  wireInPlaceSheetDismissal({
    find: () => document.querySelector(".sidebar-sheet-open"),
    close: (open) => {
      open.classList.remove("sidebar-sheet-open");
      //: The rail's own button is the opener, so focus goes back to it: the
      //: same contract `openSheet`'s `returnFocus` keeps.
      const opener = open.querySelector(".sidebar-collapse-toggle");
      opener?.setAttribute("aria-expanded", "false");
      opener?.focus();
      //: Below 600 that toggle is not on the page once the sheet is shut
      //: (the head's `.phone-sidebar-opener` stands for it), so the focus
      //: went nowhere, measured by `sheetdismiss.js` at 390: activeElement
      //: was the body. The phone's own opener takes it there.
      const phoneOpener = open.id
        ? document.querySelector(`.phone-sidebar-opener[aria-controls="${CSS.escape(open.id)}"]`)
        : null;
      if (phoneOpener) {
        phoneOpener.setAttribute("aria-expanded", "false");
        if (document.activeElement !== opener) phoneOpener.focus();
      }
    },
  });
}

//: The name a folded sidebar shows on its rail (see makeSidebarResizable).
const SIDEBAR_RAIL_NAMES = {
  sidebar: "Categories",
  "chat-sidebar": "Chats",
  "doc-sidebar": "Documents",
};

function makeSidebarResizable(aside) {
  if (!aside || aside.dataset.resizable) return;
  aside.dataset.resizable = "1";
  applySidebarWidth(aside, sidebarWidth(aside.id, sidebarDefault(aside.id)));

  const handle = document.createElement("div");
  handle.className = "sidebar-resize";
  // A real slider: screen readers announce it, and arrows resize it.
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Resize the sidebar: arrow keys, or drag");
  aside.appendChild(handle);

  const collapseBtn = document.createElement("button");
  collapseBtn.className = "sidebar-collapse-toggle";
  // Sentence case (DESIGN.md copy rules), and a name that is not the
  // whitespace between the three icons (INBOX 424).
  collapseBtn.type = "button";
  collapseBtn.title = "Hide or show the sidebar";
  collapseBtn.setAttribute("aria-label", "Hide or show the sidebar");
  collapseBtn.innerHTML = `
    <svg class="icon-expanded" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>
    <svg class="icon-collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
    <svg class="icon-peek" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"></line>
      <path d="M5 17h14v-1.5c0-1.5-1.5-2-1.5-4v-3c0-3-2-5-5.5-5S6.5 5.5 6.5 8.5v3c0 2-1.5 2.5-1.5 4V17z"></path>
    </svg>
  `;
  collapseBtn.addEventListener("click", () => {
    // Stacked, this same button is the sheet's opener. The desktop classes
    // are not applied in that band (applySidebarSheetMode takes them off), so
    // toggling them here would put back exactly the rules the sheet was built
    // to avoid fighting.
    if (layoutIsStacked()) {
      const open = aside.classList.toggle("sidebar-sheet-open");
      collapseBtn.setAttribute("aria-expanded", String(open));
      return;
    }
    aside.classList.toggle("sidebar-collapsed");
    aside.parentElement.classList.toggle("layout-sidebar-collapsed");
    
    // We update the grid column based on whether it is now collapsed or not
    if (aside.classList.contains("sidebar-collapsed")) {
      aside.parentElement.style.gridTemplateColumns = `48px minmax(0, 1fr)`;
    } else {
      const saved = Number(localStorage.getItem(`sidebarWidth:${aside.id}`)) || sidebarDefault(aside.id);
      aside.parentElement.style.gridTemplateColumns = `${saved}px minmax(0, 1fr)`;
    }
  });
  aside.appendChild(collapseBtn);

  //: What a folded sidebar shows (INBOX 425, the owner: the collapsed
  //: sidebars were "white plain"). A 48px column with one button in it read
  //: as an empty panel rather than as the sidebar, put away. Its name, set
  //: sideways under the button, says which sidebar it is and is a second way
  //: to open it; the same recipe as the skill logs' folded column.
  const railName = SIDEBAR_RAIL_NAMES[aside.id];
  if (railName) {
    const rail = document.createElement("button");
    rail.type = "button";
    rail.className = "sidebar-rail-name";
    rail.textContent = railName;
    rail.title = `Show ${railName.toLowerCase()}`;
    rail.tabIndex = -1; // the toggle above is the keyboard's way in
    rail.addEventListener("click", () => collapseBtn.click());
    aside.appendChild(rail);
  }

  const startDrag = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = aside.getBoundingClientRect().width;
    document.body.classList.add("resizing-sidebar");

    const move = (e) => applySidebarWidth(aside, startWidth + (e.clientX - startX));
    const stop = () => {
      document.body.classList.remove("resizing-sidebar");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  handle.addEventListener("pointerdown", startDrag);

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 40 : 12;
    const current = aside.getBoundingClientRect().width;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applySidebarWidth(aside, current - step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applySidebarWidth(aside, current + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      applySidebarWidth(aside, sidebarDefault(aside.id)); // back to the default
    }
  });
  // Double-click the handle to reset, the convention everywhere else.
  handle.addEventListener("dblclick", () =>
    applySidebarWidth(aside, sidebarDefault(aside.id))
  );
}

function initResizableSidebars() {
  for (const id of ["sidebar", "chat-sidebar", "doc-sidebar"]) {
    const aside = document.getElementById(id);
    if (aside) makeSidebarResizable(aside);
  }
  makeWebPanelResizable(document.getElementById("web-panel"));
  applySidebarSheetMode(layoutIsStacked());
  initSidebarSheetDismissal();
}

// The Notes sidebar used to mirror `main`'s height into its own `min-height`
// via a ResizeObserver watching `main`. That's exactly backwards for a grid
// row with `align-items: stretch`: setting the sidebar's height taller grows
// the shared row, which stretches `main` to fill it, which re-fires the
// observer with a bigger `main.offsetHeight`, an unbounded feedback loop
// (reported as the sidebar "continuously expanding"). The chat sidebar never
// needed this: it just sets `height: 100%` and lets the grid resolve it (see
// `#chat-sidebar` in style.css). Removed here too: `.layout`'s own
// `align-items: stretch` plus the `min-height: var(--page-sticky-h)` floor in
// style.css already produces the right height with no JS and nothing to loop.

// The web panel (§36G) isn't a grid column like the three sidebars above, it
// is a flex sibling of #chat-main inside <main>, sized by `flex-basis:
// clamp(19rem, 30%, 26rem)` (see style.css). That clamp is a considered
// default, not a placeholder, it keeps the column readable without a drag , 
// so unlike the sidebars, this only overrides it once the user actually asks
// to, and "reset" removes the inline style entirely rather than reapplying a
// remembered default. Below WEB_PANEL_NARROW the panel takes the whole of
// <main> (see the media query in style.css); an inline flex-basis would beat
// that stylesheet rule regardless of the media query; so it stays suppressed
// there and comes back once the window is wide enough again.
const WEB_PANEL_MIN = 280;
const WEB_PANEL_MAX = 900;
const WEB_PANEL_NARROW = "(max-width: 1100px)";

function webPanelIsNarrow() {
  return window.matchMedia(WEB_PANEL_NARROW).matches;
}

//: The widest the panel may be is also bounded by the conversation beside
//: it. `innerWidth * 0.6` alone let the panel take 864px of a 1440 window
//: whose <main> is about 1,100px, which left the chat 210px wide with its
//: composer folded into a column (measured, `scratchpad/ui-sweeps/webpanel.js`).
const WEB_PANEL_CHAT_MIN = 360;

function webPanelMaxWidth(panel) {
  const main = panel.parentElement;
  const room = main ? main.getBoundingClientRect().width - WEB_PANEL_CHAT_MIN : Infinity;
  return Math.max(WEB_PANEL_MIN, Math.min(WEB_PANEL_MAX, window.innerWidth * 0.6, room));
}

function applyWebPanelWidth(panel, width) {
  const clamped = Math.min(Math.max(Math.round(width), WEB_PANEL_MIN), webPanelMaxWidth(panel));
  try {
    localStorage.setItem("webPanelWidth", String(clamped));
  } catch {
    /* blocked storage: the width holds for this session */
  }
  if (webPanelIsNarrow()) {
    panel.style.removeProperty("flex");
    panel.style.removeProperty("width");
  } else {
    // 0 0 prevents flex shrinkage so the drag math stays pixel-perfect
    panel.style.flex = `0 0 ${clamped}px`;
    panel.style.width = `${clamped}px`;
  }
  return clamped;
}

function resetWebPanelWidth(panel) {
  localStorage.removeItem("webPanelWidth");
  panel.style.removeProperty("flex");
  panel.style.removeProperty("width");
}

window.matchMedia(WEB_PANEL_NARROW).addEventListener("change", () => {
  const panel = document.getElementById("web-panel");
  if (!panel?.dataset.resizable) return;
  const saved = Number(localStorage.getItem("webPanelWidth"));
  if (Number.isFinite(saved) && saved >= WEB_PANEL_MIN && !webPanelIsNarrow()) {
    panel.style.flex = `0 0 ${saved}px`;
    panel.style.width = `${saved}px`;
  } else {
    panel.style.removeProperty("flex");
    panel.style.removeProperty("width");
  }
});

function makeWebPanelResizable(panel) {
  if (!panel || panel.dataset.resizable) return;
  panel.dataset.resizable = "1";

  const saved = Number(localStorage.getItem("webPanelWidth"));
  if (Number.isFinite(saved) && saved >= WEB_PANEL_MIN) applyWebPanelWidth(panel, saved);

  const handle = document.createElement("div");
  handle.className = "sidebar-resize web-panel-resize";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", "Resize the web panel, arrow keys, or drag");
  panel.appendChild(handle);

  const startDrag = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panel.getBoundingClientRect().width;
    document.body.classList.add("resizing-sidebar");

    // The panel sits to the *right* of the conversation, so dragging the
    // handle left (a negative clientX delta) is what widens it, the mirror
    // image of the sidebars, whose handle is on their trailing (right) edge.
    const move = (e) => applyWebPanelWidth(panel, startWidth - (e.clientX - startX));
    const stop = () => {
      document.body.classList.remove("resizing-sidebar");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  handle.addEventListener("pointerdown", startDrag);

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 40 : 12;
    const current = panel.getBoundingClientRect().width;
    // Same mirrored direction as the drag: ArrowLeft widens, ArrowRight narrows.
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      applyWebPanelWidth(panel, current + step);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      applyWebPanelWidth(panel, current - step);
    } else if (event.key === "Home") {
      event.preventDefault();
      resetWebPanelWidth(panel);
    }
  });
  handle.addEventListener("dblclick", () => resetWebPanelWidth(panel));
}

// A ⋯ button that opens a small menu. Built from the same pieces as the note
// overflow menu so the two behave identically, one open at a time, click away
// or Escape to close, arrow keys to move.
function makeMenuItem(label, title, run) {
  return { label, title, run };
}

// The same menu as `kebabMenu`, with a worded opener instead of a "⋯".
//
// Reported: "a lot of the dropdown menus aren't the same ui style??", and
// they were not, because some of them were not this component at all. A
// native `<select>` used as an action list is drawn by the operating system:
// it cannot take the app's padding, radius, hover or icons, which is exactly
// the "tight and right up against the edge of the text" the report describes.
// A `<select>` is the right control for *choosing a value in a form*; an
// action that happens the moment you pick it is a menu, and now uses the
// app's own one.
//
// `openerClass` because the opener has to belong to the row it stands in: on
// a `.small` toolbar it is a `.small` button, and on the capture panel's
// 40px attach row it is a plain `.ghost` one beside "Attach" and "From
// library". Defaulted to what every existing caller already got, so adding
// the parameter changed nothing that was already on screen.
function labelledMenu(label, items, ariaLabel, openerClass = "ghost small") {
  const wrap = document.createElement("span");
  wrap.className = "menu-wrap";

  const menu = document.createElement("div");
  menu.className = "action-menu hidden";
  menu.setAttribute("role", "menu");

  const opener = document.createElement("button");
  opener.type = "button";
  opener.className = openerClass;
  setLabel(opener, label);
  opener.title = ariaLabel;
  opener.setAttribute("aria-label", ariaLabel);
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");
  opener.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = menu.classList.contains("hidden");
    if (willOpen) openActionMenu(menu, opener);
    else closeActionMenus();
  });

  for (const item of items) {
    const button = document.createElement("button");
    button.className = "menu-item";
    button.setAttribute("role", "menuitem");
    setLabel(button, item.label);
    button.title = item.title;
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      closeActionMenus();
      await item.run();
    });
    menu.appendChild(button);
  }
  wireMenuKeyboard(menu, opener);
  wrap.append(opener, menu);
  return wrap;
}

// --- every <select> in the app wears the app's own menu ---------------------
//
// **The last surface the stylesheet could not reach.** Reported repeatedly,
// and finally with a screenshot of the model picker: a native `<select>`
// popup is drawn by the operating system, not the page. It ignores the
// app's palette, radius, padding, hover and icons entirely, which is why
// dropdowns looked like a different program, why their text sat "right up
// against the edge", and why no amount of CSS on `select` ever fixed it.
// `select` itself is styled (the closed control matches); only the *popup*
// was out of reach, and there is no CSS that reaches it.
//
// So the popup is replaced rather than restyled. The real `<select>` stays
// in the DOM and stays the source of truth: every `.value` read, `.options`
// write and `change` listener in the rest of the app keeps working
// untouched, which is what makes this safe to apply everywhere at once
// instead of rewriting dozens of call sites. The visible control is a
// button plus a `role="listbox"`, using the same `openActionMenu` /
// `closeActionMenus` plumbing as every other menu here, so it inherits
// their positioning, flip-when-clipped and click-away behaviour for free.
//
// Selects are repopulated all over this app (models, categories, personas),
// often long after first render, so a MutationObserver re-reads the options
// rather than trusting a one-time build.
const SELECT_ENHANCED = "data-enhanced-select";

function enhanceSelect(select) {
  if (!select || select.hasAttribute(SELECT_ENHANCED)) return;
  // A multi-select is a different control with different semantics, and
  // nothing in this app uses one; leave it to the browser rather than
  // guessing at a listbox that supports multiple selection.
  if (select.multiple || select.size > 1) return;
  if (select.closest("[data-no-select-enhance]")) return;
  select.setAttribute(SELECT_ENHANCED, "1");

  const shell = document.createElement("span");
  shell.className = "select-shell";

  const opener = document.createElement("button");
  opener.type = "button";
  opener.className = "select-opener";
  opener.setAttribute("aria-haspopup", "listbox");
  opener.setAttribute("aria-expanded", "false");

  const valueText = document.createElement("span");
  valueText.className = "select-value";
  const caret = document.createElement("i");
  caret.className = "ph ph-caret-down select-caret";
  caret.setAttribute("aria-hidden", "true");
  opener.append(valueText, caret);
  //: **A select whose closed face is an icon and a caret** (`data-select-icon`
  //: on the select, a Phosphor class). For a picker that is an action rather
  //: than a setting, whose resting text is only ever its own name ("Text
  //: colour…"): in a toolbar that name is a word-sized box saying what the
  //: icon beside it already says. The word stays in the opener, visually
  //: hidden (`.select-opener-icon`), and the opener's name is the select's
  //: aria-label below, so nothing is lost to a screen reader.
  if (select.dataset.selectIcon) {
    const icon = document.createElement("i");
    icon.className = `ph ${select.dataset.selectIcon} select-icon`;
    icon.setAttribute("aria-hidden", "true");
    opener.prepend(icon);
    opener.classList.add("select-opener-icon");
  }

  const menu = document.createElement("div");
  menu.className = "action-menu select-menu hidden";
  menu.setAttribute("role", "listbox");

  select.parentNode.insertBefore(shell, select);
  shell.append(select, opener, menu);
  // Reported repeatedly, on different selects, as the same shape: the
  // model picker (Settings) and the note editor's category picker both
  // spilled off the edge of whatever scrolling/backdrop-filter ancestor
  // they opened inside: ".modal-content" for the first, the note card's
  // own stacking context for the second. `wireEscapedActionMenu` (this
  // file, above) already exists for exactly this, it was built for the
  // Library's Documents kebab and reparents an open menu to <body>,
  // positioning it from the opener's own rect so no ancestor's overflow or
  // stacking context can clip it, but it was only ever wired to that one
  // menu. Every one of this app's 51+ selects shares the same
  // `.select-menu`/`openActionMenu` shape, so wiring it here once covers
  // all of them instead of chasing each report to a different select.
  wireEscapedActionMenu(shell);

  // The native control keeps doing its job (form value, validation, the
  // label association) but stops being what you see or tab to, the opener
  // carries the keyboard now.
  select.classList.add("select-native-hidden");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");

  //: The name the select already has, wherever it was given: its own
  //: `aria-label`, the element `aria-labelledby` points at, or the `<label
  //: for>` beside it. Only the first was read, so a select named the ordinary
  //: HTML way reached a screen reader as "Choose an option": measured on
  //: Settings, Account's idle-lock select and the Graph's colour select.
  const labelledBy = (select.getAttribute("aria-labelledby") || "")
    .split(/\s+/)
    .map((id) => id && document.getElementById(id)?.textContent.trim())
    .filter(Boolean)
    .join(" ");
  const label =
    select.getAttribute("aria-label") ||
    labelledBy ||
    select.labels?.[0]?.textContent.trim().replace(/\s+/g, " ") ||
    select.title ||
    "Choose an option";
  opener.setAttribute("aria-label", label);
  opener.title = select.title || label;

  const syncValue = () => {
    const chosen = select.options[select.selectedIndex];
    valueText.textContent = chosen ? chosen.textContent.trim() : "";
    opener.disabled = select.disabled;
    for (const row of menu.querySelectorAll("[role='option']")) {
      const on = row.dataset.value === select.value;
      row.setAttribute("aria-selected", String(on));
      row.classList.toggle("is-chosen", on);
    }
  };

  //: **An option the app has hidden is not offered here either.** Measured
  //: on the OCR workspace's reader picker: `#ocr-reader` carries
  //: `<option value="ocr" hidden>AI vision model</option>`, which
  //: `ocrLoadReaders` unhides only on a machine that really has two
  //: different readers, and this stand-in listed all three regardless, so
  //: the control offered a reader that does not exist here. The native
  //: `<select>` has honoured `hidden` on an option for years; the shell in
  //: front of it had never been told to. `syncHidden` below covers the same
  //: mistake one level up, for a select that is hidden as a whole.
  const buildOptionRow = (option) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "menu-item select-option";
    row.setAttribute("role", "option");
    row.dataset.value = option.value;
    row.textContent = option.textContent.trim();
    if (option.disabled) row.setAttribute("aria-disabled", "true");
    row.addEventListener("click", (event) => {
      event.stopPropagation();
      closeActionMenus();
      if (option.disabled || select.value === option.value) return;
      select.value = option.value;
      syncValue();
      // The app listens on the real control, so the real control is what
      // announces the change.
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return row;
  };

  const rebuild = () => {
    menu.replaceChildren();
    //: **A group's own name, drawn once, not folded into each option's
    //: words.** INBOX 273: this opener built its menu by walking
    //: `select.options`, `HTMLOptionsCollection`'s flat view that drops
    //: which `<optgroup>` (if any) an option came from, so grouping the app
    //: sets on a select never reached the control the reader actually opens
    //: -- the Library's document-property filter worked around it by putting
    //: the group's name in each option's own text ("status: draft") rather
    //: than teach this shared opener about groups. Walking `select.children`
    //: instead of `select.options` keeps document order (an optgroup's
    //: options stay under it, a bare option stays where it was written) and
    //: lets a group draw its own label row, `.dock-menu-section`'s shape: a
    //: hairline above it and small text, not a `role="option"` row, so
    //: `syncValue`'s `[role='option']` walk and the click handler both skip
    //: past it without change. No observer needed for either shape: `rebuild()`
    //: runs on every open, so a picker that gains a reader, or a group, while
    //: the app is running shows it the next time it is opened.
    for (const node of select.children) {
      if (node.tagName === "OPTGROUP") {
        const visible = [...node.children].filter((option) => !option.hidden);
        if (!visible.length) continue;
        const label = document.createElement("div");
        label.className = "select-group-label";
        label.textContent = node.label || "";
        menu.appendChild(label);
        for (const option of visible) menu.appendChild(buildOptionRow(option));
      } else if (node.tagName === "OPTION") {
        if (node.hidden) continue;
        menu.appendChild(buildOptionRow(node));
      }
    }
    syncValue();
  };

  opener.addEventListener("click", (event) => {
    event.stopPropagation();
    if (select.disabled) return;
    if (menu.classList.contains("hidden")) {
      rebuild();
      openActionMenu(menu, opener);
      focusMenuItem(menu.querySelector(".is-chosen"), menu);
    } else {
      closeActionMenus();
    }
  });

  select.addEventListener("change", syncValue);
  new MutationObserver(rebuild).observe(select, { childList: true, subtree: true });

  // **A `<select>` that has been hidden must take its stand-in with it.**
  // Measured, not reasoned: on Library → Images the native
  // `#library-media-read` was 0x0 (`setLibraryMediaKind` adds `hidden`, since a
  // read filter is a Files idea) while the shell this function wraps it in
  // still rendered a 124x36 dropdown reading "Read or not", on a tab where
  // "read" means nothing. `#update-version-select` in Settings → About is
  // toggled the same way and had the same hole.
  //
  // This is the shape CLAUDE.md names: the value was set correctly on the
  // native control and did its damage on a *different element*, so the code
  // that hides it reads as right at every line. The fix belongs here rather
  // than at either call site, because every one of the app's 50-odd selects
  // inherits the same stand-in and any of them could be hidden tomorrow.
  // `hidden` is watched alongside the class for the same reason the
  // stylesheet protects both: this app hides things with either.
  const syncHidden = () => {
    shell.classList.toggle("hidden", select.classList.contains("hidden") || select.hidden);
  };
  syncHidden();
  new MutationObserver(syncHidden).observe(select, {
    attributes: true,
    attributeFilter: ["class", "hidden"],
  });

  // **Programmatic `select.value = …` fires no event at all**, and this app
  // sets one directly in dozens of places, every "load the saved settings
  // into the form" path does. A `change` listener alone therefore leaves the
  // opener showing whatever was selected when the page was built.
  //
  // Measured, not reasoned: the Timeline's own View control read "Grid" while
  // the timeline underneath it was rendering the *line* view, because the tab
  // assigned the saved value to that select directly, after this control had
  // been enhanced. (Both views and the select are gone now, the Timeline is one
  // feed: the hole this fixes was in every one of the app's 51 selects.)
  //
  // The fix is to make assignment observable: shadow `value`, `selectedIndex`
  // and `disabled` on this instance with accessors that call through to the
  // prototype's real ones and then re-sync the label. `Reflect.get/set` with
  // the element as receiver is what keeps the native accessor working on the
  // right object: reading the descriptor and calling `.get.call(select)`
  // directly would be the same thing written less safely.
  const proto = Object.getPrototypeOf(select);
  for (const prop of ["value", "selectedIndex", "disabled"]) {
    const native = Object.getOwnPropertyDescriptor(proto, prop);
    if (!native || !native.set) continue;
    Object.defineProperty(select, prop, {
      configurable: true,
      enumerable: false,
      get() {
        return native.get.call(this);
      },
      set(next) {
        native.set.call(this, next);
        syncValue();
      },
    });
  }

  wireMenuKeyboard(menu, opener);
  rebuild();
}

// **Double-click any slider to put it back to its default.** Asked for
// directly: "allow the user to double click any slider to reset it to
// default."
//
// One delegated listener rather than fourteen handlers, and no table of
// default values anywhere: every `<input type="range">` in this app already
// carries its default in its `value` attribute, and `defaultValue` reflects
// exactly that attribute rather than whatever the control currently shows.
// So the default is read from the same place the markup states it, and a
// slider added later is covered the moment it exists.
//
// Both events are dispatched, and both are needed: this app has live
// handlers on `input` (the graph's gravity/spread redraw as you drag) and
// commit handlers on `change` (the appearance settings persist there).
// Firing only one would either leave the screen stale or leave the setting
// unsaved.
document.addEventListener("dblclick", (event) => {
  const slider = event.target;
  if (!(slider instanceof HTMLInputElement) || slider.type !== "range") return;
  if (slider.disabled || slider.value === slider.defaultValue) return;
  slider.value = slider.defaultValue;
  slider.dispatchEvent(new Event("input", { bubbles: true }));
  slider.dispatchEvent(new Event("change", { bubbles: true }));
  toast("Reset to default");
});

// A control that does something on double-click has to say so somewhere, and
// the tooltip is where this app already explains its controls. Appended to
// whatever the slider's own title says rather than replacing it, so the
// existing explanations survive.
function annotateSliders(root) {
  for (const slider of (root || document).querySelectorAll("input[type='range']")) {
    if (slider.dataset.dblHinted) continue;
    slider.dataset.dblHinted = "1";
    const existing = (slider.title || "").trim();
    slider.title = existing
      ? `${existing}: double-click to reset`
      : "Double-click to reset to default";
  }
}

function enhanceAllSelects(root) {
  for (const select of (root || document).querySelectorAll("select")) {
    enhanceSelect(select);
  }
}

// **Focus a `<select>`. Never call `.focus()` on one directly.**
//
// `enhanceSelect` above takes the native control out of the tab order
// (`select-native-hidden`, `tabIndex = -1`, `aria-hidden`) and puts a
// `<button class="select-opener">` in front of it. So `select.focus()` on any
// enhanced select focuses *nothing*: the keystrokes that follow go to
// `document.body`, and a `keydown` bound to the select never fires at all
// because the select never has the focus. Nothing throws and nothing logs;
// the call reads as correct at every line involved.
//
// Found the hard way. Two listeners in the documents editor's "attach a link"
// picker were written this way and only a Playwright sweep caught them: the
// sweep pressed Escape, the picker stayed open, and the row's children read
// back as SPAN and BUTTON rather than SELECT and BUTTON. Three more call
// sites elsewhere in this file were doing the same thing silently
// (the note's own bookmark picker, the chat skills panel, the note-to-document
// picker), which is why this is a helper rather than three edits.
//
// **Why there is no lint for it.** `tests/test_frontend_handlers.py` and its
// siblings read the source as text, and the thing that decides here is what a
// variable *holds* at runtime: `picker.focus()` is dead when `picker` is a
// select and correct when it is an input, and nothing in the text says which.
// A name-based rule (`/select|picker/`) would both miss `box.focus()` on a
// select and fail `picker.focus()` on a text input, and CLAUDE.md's rule is
// that a lint which fires on the wrong thing gets widened until it means
// nothing. So the guard is this function plus this comment, and the check is
// the sweep: `scratchpad/ui-sweeps/selectfocus.js` walks every enhanced select
// in the page and asserts that focusing it through here lands on something
// focusable.
//
// The frame matters: `enhanceSelect` runs from a MutationObserver, so a select
// created and focused in the same turn has no shell yet. One retry on the next
// frame covers that without a timeout anyone has to tune.
//
// **`closest(".select-shell")`, not `parentElement`,** and that is a measured
// correction rather than defensive coding. `enhanceSelect` does
// `shell.append(select, opener, menu)`, so the shell *is* the parent at the
// moment it runs, and the first version of this helper read the opener off
// `select.parentElement`. `scratchpad/ui-sweeps/selectfocus.js` then found
// three selects where that returns null (`notes-page-size`,
// `library-page-size`, `reminders-page-size`): something in their markup sits
// between them and the shell, so `parentElement` is not it, and the fallback
// quietly focused the native control instead, which is `tabindex="-1"` and
// `aria-hidden="true"`. `closest` finds the shell for every enhanced select in
// the app, on every tab, measured.
//
// **When nothing takes the focus, nothing takes it.** Six of the app's selects
// live inside a closed `<details>` menu (the timeline's options, the graph's,
// the page-size pickers), where no descendant is focusable at all. This ends
// up calling `opener.focus()` on a button that cannot have it, and the focus
// stays where it was. That is the honest outcome for "the control you asked
// for is inside a menu that is shut", and it is why the sweep skips those
// rather than demanding a landing.
function focusSelect(select) {
  if (!select) return;
  const land = () => {
    const opener = select.closest(".select-shell")?.querySelector(".select-opener");
    (opener || select).focus();
  };
  if (select.hasAttribute(SELECT_ENHANCED)) land();
  else requestAnimationFrame(land);
}

// New selects appear whenever a panel renders, so watch for them rather
// than asking every render path to remember to call this.
function watchForSelects() {
  enhanceAllSelects(document);
  annotateSliders(document);
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === "SELECT") enhanceSelect(node);
        else enhanceAllSelects(node);
        if (node.tagName === "INPUT") annotateSliders(node.parentNode || document);
        else annotateSliders(node);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// **On a phone a ⋯ menu is an action sheet** (INBOX 392, UI_MODERNISATION_PLAN
// Phase 11 item 12: "a bottom sheet instead of a popover"). A popover hung
// from a 44px opener in a 390px window lands wherever the opener is, often
// under the thumb's far reach at the top of the screen, and is clamped and
// flipped to fit; the phone's own answer is the sheet from the bottom edge,
// every row full width at the thumb. Below 600 every `kebabMenu` opens the
// sheet recipe with the menu itself moved in, its rows, their handlers, their
// groups and its keyboard the same, and put back on close. A row press closes
// the sheet first (captured, before the row's own handler runs), so whatever
// the row opens next, a dialog or another sheet, takes the focus after it.
// Only `kebabMenu`, the recipe: a context menu at a point (`openMenuAtPoint`)
// stays where the finger held.
const PHONE_ACTION_SHEET = "(max-width: 599.98px)";

function openKebabSheet(menu, opener, label) {
  closeActionMenus();
  const home = menu.parentElement;
  let closeSheet = null;
  // A group's row opens its group in place (below 720 a submenu is an
  // accordion, `buildMenuGroupButton`), so it leaves the sheet open.
  const onRow = (event) => {
    const row = event.target.closest(".menu-item");
    if (row && !row.classList.contains("has-submenu") && closeSheet) closeSheet();
  };
  closeSheet = openSheet({
    label,
    name: "action-menu",
    returnFocus: opener,
    build: (card) => {
      card.classList.add("action-menu-card");
      menu._inSheet = true;
      menu.style.left = "";
      menu.style.top = "";
      menu.classList.remove("hidden", "action-menu-flip", "action-menu-escaped");
      card.appendChild(menu);
      card.addEventListener("click", onRow, true);
    },
    onClose: () => {
      closeSheet = null;
      menu.classList.add("hidden");
      if (home) home.appendChild(menu);
      // After the observer has seen the class change above, so it does not
      // escape a menu that is on its way home.
      queueMicrotask(() => {
        menu._inSheet = false;
      });
      opener.setAttribute("aria-expanded", "false");
    },
  });
  opener.setAttribute("aria-expanded", "true");
}

function kebabMenu(items, ariaLabel) {
  const wrap = document.createElement("span");
  wrap.className = "menu-wrap";

  const menu = document.createElement("div");
  menu.className = "action-menu hidden";
  menu.setAttribute("role", "menu");

  const opener = smallButton("ph:dots-three", ariaLabel, () => {
    if (window.matchMedia(PHONE_ACTION_SHEET).matches && typeof openSheet === "function") {
      openKebabSheet(menu, opener, ariaLabel);
      return;
    }
    const willOpen = menu.classList.contains("hidden");
    if (willOpen) openActionMenu(menu, opener);
    else closeActionMenus();
  });
  //: **A kebab is one glyph, so it is square.** Reported: "all the chat header
  //: buttons [should] be square, there should be no rectangle single icon
  //: buttons as that is not consistent with the rest of the application."
  //: Measured in that header: Fork and Compress 28×28, this opener 43×28, it
  //: took `.small`'s text padding because the class that squares an icon
  //: button has to be remembered per button (see the rule's own comment in
  //: 00-tokens-shell.css) and nobody remembered it here. Set at the source, so
  //: every ⋯ in the app is square rather than one more thing to remember.
  opener.classList.add("icon-only");
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");

  //: **Groups, drawn from the items rather than from separator objects**
  //: (DOCUMENTS_PLAN section 16). The table cell's menu was the case that
  //: asked for this: ten items covering rows, columns, alignment and the
  //: whole table, read as one list of ten, and a reader scanning it had to
  //: know the order to find anything. A menu of five or fewer needs no help;
  //: past that, the thing that makes a list scannable is a break every few
  //: rows, which is what every other application's menus do.
  //:
  //: An item carries `group`, a name, and the rule is "a hairline wherever
  //: the name changes". Callers declare meaning, never pixels, and a caller
  //: that declares nothing gets exactly what it got before, so every existing
  //: menu in the app is untouched. The name is not drawn: a heading per three
  //: rows would make a ten-row menu seventeen rows tall, and the rule here is
  //: the divider, not the label. `role="separator"` so the grouping is in the
  //: accessibility tree too, and `wireMenuKeyboard` walks `.menu-item`, so a
  //: divider is never a stop on the way down.
  let lastGroup = null;
  for (const item of items) {
    if (lastGroup !== null && item.group && item.group !== lastGroup) {
      const rule = document.createElement("div");
      rule.className = "menu-sep";
      rule.setAttribute("role", "separator");
      menu.appendChild(rule);
    }
    if (item.group) lastGroup = item.group;
    const button = document.createElement("button");
    button.className = item.disabled ? "menu-item menu-item-unavailable" : "menu-item";
    //: A destructive row says so in the app's own danger colour. Added when
    //: the Images gallery's bespoke menu was folded into this one, it had a
    //: red Delete and this did not, and losing that on the way in would have
    //: made the shared control worse than the one it replaced.
    //: `menu-danger`, the class this menu's own stylesheet already defines, 
    //: not the generic `danger`, which is written for buttons with a ground.
    if (item.danger) button.classList.add("menu-danger");
    button.setAttribute("role", "menuitem");
    setLabel(button, item.label);
    button.title = item.title;
    // Muted, not `disabled`, a native disabled button also blocks its own
    // title tooltip on some platforms, which is the one piece of information
    // this state actually needs to deliver (why the button can't do its
    // normal job). `run` still fires; a disabled item's `run` says why.
    if (item.disabled) button.setAttribute("aria-disabled", "true");
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      closeActionMenus();
      await item.run();
    });
    menu.appendChild(button);
  }
  wireMenuKeyboard(menu, opener);
  wrap.append(opener, menu);
  //: What a right-click on the row this menu belongs to opens at the pointer
  //: (`openRowMenu`), and what F2 looks through for Rename: the same items,
  //: so the two ways in cannot disagree about what the row can do.
  wrap.rowMenu = { items, ariaLabel };
  //: **Every ⋯ menu escapes its container, not just the ones somebody
  //: remembered.** Reported three times across three surfaces, the documents
  //: list, the gallery, and then the lightbox, always the same shape: the
  //: menu is `position: absolute` inside an ancestor that scrolls or paints a
  //: `backdrop-filter`, and either clips it.
  //:
  //: `wireEscapedActionMenu` was written to be opted into "for any menu known
  //: to live inside a scrolling ancestor", and that is the part that keeps
  //: failing: which ancestors scroll is not knowable from where the menu is
  //: built, and a caller added next year will not know either. Opting in
  //: *here* covers every `kebabMenu` at once, which is every ⋯ in the app.
  //:
  //: It is still not folded into `openActionMenu`, deliberately: the chat
  //: dock's popovers, the selection popup and the whiteboard's context menu
  //: build `.action-menu` by other routes, none of them are clipped, and
  //: rewriting what they all share to fix this class is the bigger change
  //: that function's own comment argues against.
  wireEscapedActionMenu(wrap);
  return wrap;
}

//: **A formatting-toolbar menu has to stay inside its panel**, and until this
//: ran it did not.
//:
//: Reported twice: *"formatting can go off the edge of the pannel in the
//: capture tab and im assuming the documents tab as well"* and *"dropdown
//: menus from the formatting bar get cut off and dont stay in the panel"*.
//: Measured in the capture composer at 1440px: the **Insert** menu spanned
//: x=164–356 against a panel starting at x=287, **123px of it outside the
//: panel's left edge**. The three menus at the right end of the same strip
//: were all comfortably inside, which is why this reads as intermittent.
//:
//: The cause is one line of CSS doing the right thing in the wrong place.
//: `.doc-dock-menu-list` is `position: absolute; right: 0`, anchored to its
//: opener's *right* edge, growing leftwards. That is correct for the menu it
//: was written for (the document ⋯, which sits at the right end of the header
//: row) and wrong for an opener near the left of a toolbar, where a 192px
//: menu is pushed straight out of the panel.
//:
//: Not fixable in CSS: which edge to anchor to depends on where the opener
//: happens to sit relative to a panel whose width changes with the window,
//: the sidebar and the chat dock. So it is measured on open, the same way
//: `wireEscapedActionMenu` handles the clipping case it owns.
//:
//: `toggle` does not bubble, so this listens in the capture phase, one
//: delegated listener covers the note composer's strip and the document
//: editor's, including any `<details>` menu added to either later.
function clampToolbarMenu(details, { retry = true } = {}) {
  const list = details.querySelector(".doc-dock-menu-list");
  if (!list) return;
  const opener = details.querySelector("summary") || details;
  // **Cleared, not zeroed: and this distinction is the whole bug below.**
  //
  // The inline values have to go before measuring, or the menu's own size is
  // measured from wherever the previous open left it. This used to clear them
  // by writing `left: 0; top: 0`, and then the guard two lines down could
  // `return`, leaving those zeros in place. A `position: fixed` element at
  // 0,0 sits in the top-left corner of whatever its containing block is,
  // which for these menus is the surrounding `.card`: reported as "the
  // toolbar dropdowns are now appearing in the top left corner of the panel",
  // with a screenshot of the Block menu pinned to the corner of the capture
  // card while its button sat 1,600px away.
  //
  // Writing "" removes the declaration instead, so a failed measurement falls
  // back to the stylesheet, which now says `top: auto; left: auto`, i.e. the
  // static position, i.e. roughly under the button. A wrong-but-near answer
  // beats a corner every time.
  list.style.left = "";
  list.style.top = "";
  list.style.right = "";
  const anchor = opener.getBoundingClientRect();
  const box = list.getBoundingClientRect();
  if (!box.width || !anchor.width) {
    // Nothing to measure *yet* is a real state: a `<details>` panel is not
    // laid out until the open takes effect, and this runs from the `toggle`
    // event. One retry on the next frame, once, a loop here would spin
    // forever on a menu that is genuinely empty.
    if (retry) requestAnimationFrame(() => clampToolbarMenu(details, { retry: false }));
    // Out of retries: show it where the stylesheet put it rather than never.
    // `.doc-dock-menu-list` is invisible until this class arrives.
    else list.classList.add("is-placed");
    return;
  }
  const margin = 8;
  // **Left-aligned to the opener, growing rightwards.**
  //
  // This was `anchor.right - box.width`, right-aligned, transcribed from the
  // stylesheet's `right: 0`, which is correct for `#doc-dock-menu` (a kebab at
  // the far right of the panel, where a menu growing rightwards would leave
  // the screen) and wrong for every menu in a toolbar. Measured: a 192px menu
  // right-aligned to a 41px icon button lands **151px to the left of the
  // button that opened it**, over the sidebar, on the capture toolbar, at
  // every viewport. Reported as "dropdowns are completely broken and dont show
  // in the capture notes and documents toolbars", which is what a menu that
  // opens nowhere near its control looks like from the outside.
  //
  // `clampToolbarMenu` only ever runs for `.doc-toolbar-menu` (see the toggle
  // listener below), so the kebab keeps the stylesheet's right-alignment and
  // this is a toolbar-only rule.
  let left = anchor.left;
  if (left + box.width > window.innerWidth - margin) {
    // No room to the right: right-align to the opener, which is the shape that
    // keeps a menu attached to its button near the end of a row.
    left = Math.min(anchor.right - box.width, window.innerWidth - margin - box.width);
  }
  // `margin` wins a tie deliberately: a viewport narrower than the menu cannot
  // satisfy both edges, and losing the *start* of the list is worse than
  // losing its end.
  if (left < margin) left = margin;
  let top = anchor.bottom + 4;
  if (top + box.height > window.innerHeight - margin) {
    // Flip above the opener, and only fall back to "pinned to the bottom" when
    // there is no room either way, a menu that covers its own button is still
    // better than one whose last item is unreachable.
    const above = anchor.top - 4 - box.height;
    top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - box.height);
  }
  list.style.left = `${Math.round(left)}px`;
  list.style.top = `${Math.round(top)}px`;

  // **A second pass, because `position: fixed` is not always fixed to the
  // viewport.** Any ancestor with `transform`, `filter`, `backdrop-filter`,
  // `perspective`, `contain` or `will-change` becomes the containing block for
  // its fixed descendants, and `left`/`top` are then measured from *that* box,
  // not from the screen. Every one of these menus lives inside a `.card`, and
  // `.card` carries `backdrop-filter: blur(var(--glass-blur))` whenever the
  // Appearance → Glass setting is on, which is the default.
  //
  // So the numbers computed above, which are viewport coordinates taken from
  // `getBoundingClientRect` and clamped against `window.innerWidth/Height`,
  // land the panel offset by the card's own position: up and to the left of
  // where it belongs, and clipped by the card on top of that. Reported as
  // "these toolbar dropdowns flicker somewhere random on the screen and dont
  // show", and the flicker is this function re-running on every scroll and
  // re-placing it wrongly each time.
  //
  // Rather than enumerate the properties that create a containing block, a
  // list CSS keeps adding to, and one that would have to be checked up the
  // whole ancestor chain on every open, measure where the panel actually
  // landed and correct by the difference. Self-correcting, cause-agnostic, and
  // one extra layout read.
  //
  // Proven, not reasoned. **And the real trigger does fire here, which is a
  // correction to what this comment said until 2026-09-20.** It read that
  // headless Chromium reports `backdrop-filter: none` on every `.card`, so
  // the user's exact trigger could not be reproduced and `filter: saturate(1)`
  // had to stand in for it. That was true of a card measured with the
  // background art *off*, which is the default and was the only state anyone
  // had looked at. Turn the art on (`data-bg-art="on"`, Settings) and the
  // same card reports `backdrop-filter: blur(14px) saturate(1.5)
  // brightness(1.02)` in this Chromium: measured, a `position: fixed` child
  // written to `left: 0; top: 0` inside `.card.doc-main` lands at x=293
  // against the card's own x=292, so the card is its containing block and the
  // trap is live on the real property. Test that path, not the stand-in.
  //
  // The stand-in's numbers are kept because they are the same fault measured
  // twice: forcing `.card.doc-main { filter: saturate(1) }` reproduces it
  // exactly, and with that in place the panel's `style.left` reads
  // 595px while it renders at x=886, the correction having subtracted the
  // card's own 291px offset. Without the second pass the same menu would have
  // been given left=886 and rendered at 1177, 291px to the right of the
  // button that opened it, which is the reported "somewhere random". After
  // the correction, dx is 0 (±1 rounding) on all six and every one is
  // hit-testable. With no containing block the correction is zero, so this
  // costs one layout read and changes nothing.
  const landed = list.getBoundingClientRect();
  const driftX = left - landed.x;
  const driftY = top - landed.y;
  if (Math.abs(driftX) > 0.5 || Math.abs(driftY) > 0.5) {
    list.style.left = `${Math.round(left + driftX)}px`;
    list.style.top = `${Math.round(top + driftY)}px`;
  }
  // Only now is it allowed to paint -- see `.doc-dock-menu-list` in
  // 04-chat-dock-appearance.css for the flicker this prevents.
  list.classList.add("is-placed");
}

//: A fixed-position menu does not travel with the strip it belongs to, so any
//: scroll or resize while it is open would leave it stranded beside a button
//: that has moved. Re-placing on both is cheaper than the alternative (an
//: anchor-positioning polyfill) and covers the two ways it can happen: the
//: page scrolls under a sticky toolbar, or the toolbar itself is scrolled
//: sideways in row mode.
//: A live collection for the same reason as `ACTION_MENUS`: a capturing
//: scroll listener on every tab, with nothing open nearly always (18ms of
//: selector matching over a 30-step scroll, traced).
const TOOLBAR_MENUS = document.getElementsByClassName("doc-toolbar-menu");

function replaceOpenToolbarMenus() {
  const open = [];
  for (const details of TOOLBAR_MENUS) if (details.open) open.push(details);
  for (const details of open) clampToolbarMenu(details);
}
window.addEventListener("resize", replaceOpenToolbarMenus);
window.addEventListener("scroll", replaceOpenToolbarMenus, true);

document.addEventListener(
  "toggle",
  (event) => {
    const details = event.target;
    if (!(details instanceof HTMLElement) || details.tagName !== "DETAILS") return;
    if (!details.classList.contains("doc-toolbar-menu")) return;
    if (!details.open) {
      // Back to invisible for the next open, so it never paints unplaced.
      details.querySelector(".doc-dock-menu-list")?.classList.remove("is-placed");
      return;
    }
    clampToolbarMenu(details);
  },
  true
);

// "12.4k" beats "12417" when the number is a rough sense of scale, which is
// all a token count ever is.
//: **A model's name as a badge should say, at a glance, which model.**
//: Reported: "can you truncate hugging face model names in visual badges
//: except for in the model settings page to remove the hf.co/ part??"
//:
//: A HuggingFace id arrives as `hf.co/LiquidAI/LFM2.5-VL-1.6B` (Ollama's own
//: form): three segments of which only the last identifies the model, and
//: the first two eat the width a badge has. The org is kept off too: two
//: models from the same org differ in their last segment, never their first.
//: Settings → Models is deliberately *not* a caller: choosing a model to pull
//: needs the id you would actually type.
//:
//: Only prefixes that are registry addresses are stripped. `llama3.2:3b` and
//: `gemma3:latest` are already short and are returned untouched, tag and all.
function shortModelName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const withoutHost = raw.replace(/^(https?:\/\/)?(hf\.co|huggingface\.co)\//i, "");
  //: Only when a registry host was actually stripped is the remaining
  //: `org/model` split safe: a bare `library/llama3` from a private registry
  //: keeps its shape, because there the org may be the only thing telling two
  //: models apart.
  if (withoutHost === raw) return raw;
  const parts = withoutHost.split("/").filter(Boolean);
  return parts.at(-1) || withoutHost;
}
window.shortModelName = shortModelName;

//: **A picture can carry two readings, and the lightbox showed one of them.**
//: Reported, and reproduced before it was touched: a `MediaUpload` or an
//: `Attachment` holds `ocr_text` (Tesseract's own pass, written automatically
//: the moment the file is saved into a note) and `vision_ocr_text` (a vision
//: model's transcription, always asked for by hand). With both stored, the
//: lightbox drew `vision_ocr_text || ocr_text` and the Tesseract reading was
//: nowhere on the surface built for reading: measured at 1440 with both seeded
//: through `POST /media/{id}/ocr` and `/vision-ocr`, `.lightbox-text` held the
//: vision reading and the whole `.lightbox-info` panel never contained a
//: character of the other one.
//:
//: What it shows now is not a new decision. The Library card's own reading
//: fold settled this exact question already (`renderLibraryImagesGallery`,
//: library.js): "Tesseract's reading goes inside the same disclosure, under
//: the vision one: it is the same question ('what does this say'), answered by
//: the other reader", labelled "Also read with Tesseract OCR" and left out
//: entirely when it is empty, which on a machine with no Tesseract is always.
//: This applies that decision to the one surface that missed it, in the
//: elements already there (`.lightbox-text`, `.lightbox-byline`), so there is
//: no second recipe and no new rule to lint.
//:
//: Stacked rather than behind a two-state control, on purpose: the lightbox is
//: the picture "at a size the text can be checked against", and two
//: transcriptions of one image are worth having open precisely so they can be
//: read against each other and against the page. A toggle answers "which one
//: is current", which is a question the badge on the card already answers,
//: and it makes the comparison impossible.
//:
//: One reader of the row, so the four surfaces that build a lightbox item
//: cannot drift apart again (`hydrate` here, the two menu rows that re-read a
//: picture, and `libraryLightboxItems` in library.js).
function lightboxReadingsFor(row) {
  const vision = (row?.vision_ocr_text || "").trim();
  const tesseract = (row?.ocr_text || "").trim();
  if (vision) {
    return {
      text: vision,
      byline: `Text read by ${shortModelName(row?.vision_ocr_model) || "a model"}`,
      //: Only a *second* reading is an alternate. With no vision reading the
      //: Tesseract one is the reading, and it is returned as `text` below
      //: rather than as a footnote to an empty panel.
      altText: tesseract,
      altByline: tesseract ? "Also read with Tesseract OCR" : "",
      //: Which stored field each one is, so the lightbox can delete the
      //: reading it shows (INBOX 421 e) rather than guess at the reader.
      textSource: "vision",
      altSource: tesseract ? "tesseract" : "",
    };
  }
  return {
    text: tesseract,
    byline: tesseract ? "Text read with Tesseract OCR" : "",
    altText: "",
    altByline: "",
    textSource: tesseract ? "tesseract" : "",
    altSource: "",
  };
}
window.lightboxReadingsFor = lightboxReadingsFor;

function formatTokens(n) {
  const count = Number(n) || 0;
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(count < 10000 ? 1 : 0)}k`;
}

// Server timestamps are UTC. Most now carry an explicit offset or Z; older
// stored values may carry neither, and a naive string is parsed as LOCAL by
// JavaScript. One parser, so the assumption lives in exactly one place.
function parseServerTime(iso) {
  if (!iso) return null;
  const text = String(iso);
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(text);
  const date = new Date(hasZone ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// How long ago, in words. A wall of identical timestamps tells you nothing;
// "yesterday" and "3 weeks ago" are what you actually navigate by.
function relativeTime(iso) {
  // Timestamps now come back explicitly UTC ("...+00:00"), so the old
  // unconditional `iso + "Z"` produced "…+00:00Z", an unparseable string that
  // rendered literally as "Invalid Date" in the documents sidebar. Only assume
  // UTC when the value doesn't already say what it is.
  const then = parseServerTime(iso);
  if (!then) return "";
  const seconds = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  // Screenshotted as "1 weeks ago". Rounding 8 days gives 1, and the plural
  // was hard-coded: the only branch here that forgot to agree with its own
  // number.
  const weeks = Math.round(days / 7);
  if (days < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

//: How many chats the switcher shows. Searching and sorting all of them is
//: the Library's job now (§36F); this list exists so the chat you were in ten
//: minutes ago is one click away without leaving the tab you are typing in,
//: and eight is comfortably more than "the one before this one" while still
//: fitting beside a conversation.
const RECENT_CHATS_SHOWN = 8;

const CHAT_SIDEBAR_SORT_KEY = "chatSidebarSort";

// Pinned notes stay first regardless of sort, that promise (a divider marks
// the boundary, just below) predates this control and a sort choice
// shouldn't silently break it. Only the order *within* each of the two
// groups changes.
function sortConversations(conversations, mode) {
  const pinned = conversations.filter((c) => c.pinned);
  const rest = conversations.filter((c) => !c.pinned);
  const byMode = {
    recent: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    turns: (a, b) => (b.turns || 0) - (a.turns || 0),
    tokens: (a, b) => (b.tokens || 0) - (a.tokens || 0),
    alpha: (a, b) => a.title.localeCompare(b.title),
  }[mode] || null;
  if (!byMode) return conversations; // "recent" is already the server's own order
  return [...pinned.sort(byMode), ...rest.sort(byMode)];
}

async function loadConversationList() {
  const conversations = sortConversations(
    await apiJson("/conversations").catch(() => []),
    $("chat-sidebar-sort")?.value || "recent"
  ).slice(0, RECENT_CHATS_SHOWN);
  const list = $("conversation-list");
  list.replaceChildren();
  const empty = $("conv-empty");
  empty.classList.toggle("hidden", conversations.length > 0);
  empty.textContent = "No saved chats yet. Ask something to start one.";

  let sawUnpinned = false;
  for (const conversation of conversations) {
    // One divider between the pinned block and the rest, so "pinned" reads as
    // a section rather than as an unexplained reordering.
    if (!conversation.pinned && !sawUnpinned && list.children.length) {
      const rule = document.createElement("li");
      rule.className = "conv-divider";
      rule.setAttribute("aria-hidden", "true");
      list.appendChild(rule);
    }
    if (!conversation.pinned) sawUnpinned = true;

    const li = document.createElement("li");
    if (conversation.id === chatConv.id) li.classList.add("active-conv");
    if (conversation.pinned) li.classList.add("pinned-conv");

    //: **The whole row opens the chat, not just the words in it.** Reported:
    //: "I clicked on other chat conversations in the chat sidebar but the
    //: conversations didnt visibly select in the sidebar." Measured: the
    //: `<li>` is 268x48 and `.conv-title`, which carried the only click
    //: handler: is 211x35. The 6.4px/9.6px padding ring and the gutter kept
    //: clear for the ⋯ are dead: `elementFromPoint` returns the `<li>` at the
    //: row's top edge, bottom edge, left edge and right-hand side alike. So
    //: roughly a third of every row did nothing when clicked, which reads
    //: exactly like a selection that failed rather than a click that missed.
    //:
    //: On the `<li>`, with the actions cluster excluded: a click on the ⋯ (or
    //: on anything inside the menu it opens) is not a request to switch
    //: conversations. `aria-current` says which row is the open one to a
    //: screen reader, which the accent fill says to everyone else.
    li.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest(".entry-actions")) return;
      openConversation(conversation.id);
    });
    li.setAttribute("aria-current", conversation.id === chatConv.id ? "true" : "false");

    const title = document.createElement("span");
    title.className = "conv-title";
    title.title = "Open this chat";

    const name = document.createElement("span");
    name.className = "conv-name";
    setLabel(name, `${conversation.pinned ? "ph:push-pin " : ""}${conversation.title}`);
    const meta = document.createElement("span");
    meta.className = "conv-meta muted";
    const bits = [relativeTime(conversation.updated_at)];
    if (conversation.turns) {
      bits.push(`${conversation.turns} ${conversation.turns === 1 ? "turn" : "turns"}`);
    }
    // "tok" rather than "tokens": the row is one line by design, and the
    // number is the useful part, spelling out the unit is what pushed it
    // into an ellipsis at the default sidebar width.
    if (conversation.tokens) bits.push(`${formatTokens(conversation.tokens)} tok`);
    meta.textContent = bits.join(" · ");
    meta.title = bits.join(" · "); // in full, if the row still has to clip
    title.append(name, meta);
    // The title often isn't the subject: show what was actually asked.
    if (conversation.preview && conversation.preview !== conversation.title) {
      title.title = conversation.preview;
    }
    // One ⋯ instead of three buttons. In a sidebar this narrow they were
    // taking most of the row, leaving a few characters of the chat's name.
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    const items = [];
    items.push(
      makeMenuItem(
        conversation.pinned ? "ph:push-pin-slash Unpin" : "ph:push-pin Pin",
        conversation.pinned ? "Let this chat sort by date again" : "Keep this chat at the top",
        async () => {
          await apiJson(`/conversations/${conversation.id}/pin`, {
            method: "PUT",
            body: JSON.stringify({ pinned: !conversation.pinned }),
          });
          loadConversationList();
        }
      )
    );
    items.push(
      makeMenuItem("ph:pencil-simple Rename", "Rename this chat", async () => {
        const next = await promptDialog("Rename this chat:", conversation.title);
        if (!next || !next.trim()) return;
        await apiJson(`/conversations/${conversation.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: next.trim() }),
        });
        loadConversationList();
      })
    );
    items.push(
      makeMenuItem("ph:magic-wand Name with Atlas", "Let Atlas name this chat", async () => {
        const named = await apiJson(`/conversations/${conversation.id}/retitle`, {
          method: "POST",
        }).catch((e) => {
          toast(e.message, true);
          return null;
        });
        if (!named) return;
        if (chatConv.id === conversation.id) $("chat-title").textContent = named.title;
        //: The AI naming a conversation is activity, not something the user
        //: did: so it obeys the same "pop up, or only in the centre" choice
        //: as every other thing the AI does on its own.
        agentActivityNotice(
          named.ai_named ? `Renamed to “${named.title}”.` : "Used the first question as the title.",
          { kind: "run" }
        );
        loadConversationList();
      })
    );
    items.push(
      // Not destructive, so not grouped with Delete below, same "keep it,
      // but out of the way" action Notes already has for entries (BACKLOG
      // §30b's named remaining scope: chats and documents). Reachable
      // again from the Library's Shelved filter.
      makeMenuItem("ph:archive Archive", "Keep it, but out of the way, not deleted", async () => {
        await apiJson(`/conversations/${conversation.id}/archive`, { method: "PUT" });
        if (chatConv.id === conversation.id) newChatConversation();
        toast("Archived.");
        loadConversationList();
      })
    );
    items.push(
      makeMenuItem("ph:trash Delete", "Delete this chat", async () => {
        if (!(await confirmDialog("Delete this saved chat?"))) return;
        await apiJson(`/conversations/${conversation.id}`, { method: "DELETE" });
        if (chatConv.id === conversation.id) newChatConversation();
        loadConversationList();
      })
    );
    actions.appendChild(kebabMenu(items, `Actions for ${conversation.title}`));
    li.append(title, actions);
    list.appendChild(li);
  }
}

// An edited answer is labelled, always. A transcript that silently presents
// your words as the model's is worse than no transcript.
function editedMarker() {
  const tag = document.createElement("span");
  tag.className = "edited-marker muted";
  tag.textContent = "edited by you";
  tag.title = "You changed this answer after the model wrote it";
  return tag;
}

// Editing questions has worked for a while; answers were fixed forever, so a
// model that got one detail wrong left you regenerating the whole thing and
// hoping. Editing in place keeps the rest of the thread intact.
function editChatAnswer(handles, turnIndex, current) {
  if (handles.bubble.querySelector(".answer-editor")) return; // already open
  const editor = document.createElement("div");
  editor.className = "answer-editor";
  const box = document.createElement("textarea");
  box.value = current;
  box.rows = Math.min(20, Math.max(4, current.split("\n").length + 1));
  box.setAttribute("aria-label", "Edit this answer");

  const target = handles.timeline.answerElement();
  const finish = (markdown) => {
    editor.remove();
    target.classList.remove("hidden");
    if (markdown !== null) handles.timeline.replaceAnswer(markdown);
  };

  const save = document.createElement("button");
  save.className = "small";
  save.type = "button";
  save.textContent = "Save";
  save.addEventListener("click", async () => {
    const next = box.value.trim();
    if (!next) {
      toast("An empty answer isn't a correction: delete the message instead.", true);
      return;
    }
    if (chatConv.id) {
      try {
        await apiJson(`/conversations/${chatConv.id}/turns/${turnIndex}/answer`, {
          method: "PUT",
          body: JSON.stringify({ content: next }),
        });
      } catch (error) {
        toast(error.message, true);
        return; // leave the editor open rather than losing the edit
      }
    }
    if (chatConv.turns[turnIndex]) chatConv.turns[turnIndex].answer = next;
    finish(next);
    if (!handles.bubble.querySelector(".edited-marker")) {
      handles.bubble.insertBefore(
        editedMarker(),
        handles.bubble.querySelector(".msg-actions")
      );
    }
    toast("Answer updated.");
  });

  const cancel = document.createElement("button");
  cancel.className = "ghost small";
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => finish(null));

  const row = document.createElement("div");
  row.className = "row";
  row.append(save, cancel);
  editor.append(box, row);
  target.classList.add("hidden");
  target.after(editor);
  box.focus();
}

async function openConversation(id) {
  const full = await apiJson(`/conversations/${id}`).catch(() => null);
  if (!full) return;
  // Before the pane is rebuilt, not after: this reads the composer state that
  // belongs to the conversation being left.
  releaseChatComposer();
  // ROADMAP.md item 13: switching between saved chats was invisible to
  // back/forward. Recorded here rather than at each of this function's
  // call sites (the sidebar, the Library) so neither has to remember to.
  recordTabVisit("chat", `conv:${full.id}`);
  chatConv = { id: full.id, turns: [] };
  chatAwaitingAgentAnswer = false; // a saved thread's own pending ask, if any, isn't answerable live
  // Not carried across conversations, and not persisted: re-deriving it is one
  // click, and a summary restored against the wrong thread would be worse than
  // no summary at all.
  chatSummary = null;
  renderCompressionState();
  $("chat-title").textContent = full.title;
  renderChatUsage(full.tokens);
  //: **Give the starter chips back before clearing the pane, not after.**
  //:
  //: Reported with a screenshot: *"I cant view older chat sessions, the
  //: panel/page just appears blank."* The title, model and token count in the
  //: header were all correct, only the transcript was empty, which is what
  //: made it look like a rendering problem with the messages rather than a
  //: crash.
  //:
  //: `#chat-suggest` is **on loan**. `chatEmptyState` *moves* that element out
  //: of the dock and into `.chat-empty` inside `#chat-messages` (see its own
  //: comment on why the starters belong with the welcome). So on any chat that
  //: was showing the empty state, every fresh load of the tab, the element
  //: is a child of the very thing being wiped here: `replaceChildren()`
  //: destroyed it, and the next line dereferenced `null` and threw.
  //:
  //: The throw landed exactly between "clear the transcript" and "render the
  //: messages", so the pane was emptied and then nothing was drawn. Every
  //: saved conversation opened blank, and the console error was the only
  //: sign.
  //:
  //: `clearChatEmptyState` already knows how to return the chips to the dock, 
  //: it exists for this, so the fix is to let it run first rather than to
  //: null-guard the symptom.
  clearChatEmptyState();
  $("chat-messages").replaceChildren();
  //: Optional-chained regardless: this element is moved between two parents at
  //: runtime, and a second caller that clears the pane should degrade to a
  //: stale chip strip rather than to a blank conversation.
  $("chat-suggest")?.classList.add("hidden");
  let lastQuestionText = null;
  for (const message of full.messages) {
    if (message.role === "user") {
      lastQuestionText = message.content;
      addBubble("user", message.content, message.attachments);
    } else {
      const handles = addAssistantBubble(message.persona || null);
      // Replay the run in the order it happened when the turn recorded one.
      // Older turns (saved before steps existed) only have the flattened
      // thinking/tools/answer, so they're rebuilt in that fixed order, 
      // everything is still shown, just without the interleaving.
      if (message.steps && message.steps.length) {
        handles.timeline.replay(message.steps);
      } else {
        if (message.thinking) {
          handles.timeline.thinking(message.thinking);
        }
        // Re-draw the tool-activity chips (Wave G) so they don't vanish on
        // reload the way they used to (user-reported).
        for (const t of message.tools || []) {
          handles.timeline.tool(toolChip(t.label, t.ok !== false, t));
        }
        if (message.content) {
          handles.timeline.answer(message.content);
        }
      }
      handles.timeline.finalise();
      //: …and the step group, so a replayed turn does not reopen with
      //: "Working: 3 steps" over a conversation that finished yesterday.
      handles.timeline.finish?.();
      // Rebuild the metadata line. Reported in IDEAS.md as "chat message
      // metadata disappears on reload": it was only ever built from the live
      // stream, so reopening a chat showed answers with nothing to say which
      // model wrote them or what they cost. Turns saved before this stored no
      // stats and correctly get no line, rather than a row of "?"s.
      if (message.stats) {
        //: A reopened conversation gets its meter back from the last turn that
        //: recorded one: without this the header says nothing about a thread
        //: that is already 80% through its window, which is precisely the
        //: thread you want warned about.
        renderChatContextMeter(message.stats);
        handles.bubble.appendChild(
          messageMetaLine({
            model: message.stats.model,
            elapsedMs: message.elapsed_ms,
            stats: message.stats,
            toolCount: (message.tools || []).length,
            rounds: message.stats.round || 0,
            usedTools: message.used_tools ?? null,
          })
        );
      }
      //: **The Sources panel is rebuilt, not the thing it replaced.**
      //:
      //: Reported: *"a lot of the steps and agent process disappears when I
      //: leave the chat session and come back to it."* A live turn ends with
      //: the Sources panel: notes, files and web pages, with previews and
      //: links: and this path rebuilt the old "N matching notes" disclosure
      //: instead, which knows nothing about files or the web. So reopening a
      //: conversation genuinely lost most of what the turn had consulted, and
      //: what survived was drawn as a different control.
      //:
      //: `touched` comes back off the saved tool events, which have carried it
      //: since the live action line was built, the same rows, from the same
      //: place, so a reopened panel is the panel and not an approximation.
      const savedSources = chatSourcesPanel({
        meta: {
          raw_results: message.raw_results || [],
          search_mode: message.search_mode,
        },
        toolEvents: message.tools || [],
        touched: (message.tools || []).flatMap((t) => t.touched || []),
      });
      if (savedSources) {
        handles.recordsHolder.appendChild(savedSources);
      } else if (message.raw_results) {
        renderRecordsDetails(handles.recordsHolder, {
          raw_results: message.raw_results,
          search_mode: message.search_mode,
          match_info: message.match_info || {},
          connected_ids: message.connected_ids || [],
        });
      }
      // Same reload-reconstruction fix as raw_results just above, for the
      // "Grounded in" chips: reported directly as disappearing once the chat
      // tab was left or the session ended, since nothing rebuilt this on
      // reopen either.
      if (message.sentence_grounding) {
        renderAnswerGrounding(
          handles.groundingHolder,
          message.sentence_grounding,
          message.raw_results || [],
          handles.bubble?.querySelectorAll(".bubble-answer") || null,
          "",
          null,
          //: Saved on the turn by the server from the same counter the live
          //: stream used, so the notice survives reopening the chat.
          message.support || null
        );
      }
      // And the same shape again for the "what to ask next" chips, reported
      // separately: "suggested repsponse continuation prompts in chat doesnt
      // persist and disappears once I switch chat sessions or quit the app".
      // Rendered through the same function the live path uses, so a restored
      // chip is not a slightly different chip.
      if (message.followups) {
        renderFollowups(handles.bubble, message.followups);
      }
      //: And the Resume and Edit-step buttons, which disappeared on reopen for
      //: the same reason and are rebuilt through the same function the live
      //: path uses, from the state saved with the turn.
      if (message.resume) {
        appendRunResumeControls(handles.bubble, {
          ...message.resume,
          timeline: handles.timeline,
        });
      }
      const turnIndex = chatConv.turns.length; // index this pair will occupy
      if (message.edited) handles.bubble.appendChild(editedMarker());
      //: The same list the live stream builds, see `assistantMessageActions`.
      //: These two paths had already drifted (this one had Edit and no fork or
      //: rewrite; the live one the reverse), which is how a fix lands on half
      //: the app's messages.
      handles.bubble.appendChild(
        assistantMessageActions({
          bubble: handles.bubble,
          text: message.content,
          question: lastQuestionText,
          onEdit: () => editChatAnswer(handles, turnIndex, message.content),
        })
      );
      if (lastQuestionText !== null) {
        chatConv.turns.push({ question: lastQuestionText, answer: message.content });
      }
    }
  }
  // A conversation that is still being answered has not saved that turn yet, 
  // the save happens when the stream ends, so what came back from the server
  // above is the thread *without* the message in flight. Left alone, coming
  // back to it shows either an empty pane or a thread missing its newest
  // question: exactly the "my message disappeared" this whole change is about.
  // Saying so is the honest render, and the note is replaced by the real turn
  // the moment the stream finishes and the list refreshes.
  if (isStreamingConversation(full.id)) {
    // Coming back to the thread that is still being answered. The saved
    // messages above are the thread *without* this turn, it has not been
    // written yet, or exists only as a half-finished checkpoint row, which is
    // the reported "empty message bubble". Drop that partial and put the live
    // nodes back instead.
    const bubbles = $("chat-messages").querySelectorAll(".msg");
    const lastAssistant = [...bubbles].reverse().find((b) => b.classList.contains("assistant"));
    if (lastAssistant && !lastAssistant.textContent.trim()) {
      lastAssistant.previousElementSibling?.classList.contains("msg")
        && lastAssistant.previousElementSibling.remove();
      lastAssistant.remove();
    }
    reattachStreamingTurn();
  } else if (!full.messages.length) {
    renderChatEmptyState();
  }
  if (lastQuestionText) lastChatQuestion = lastQuestionText;
  loadConversationList();
  chatScrollToEnd();
}

async function loadChatSuggestions() {
  // Only the welcome placeholder may be present, real messages hide the chips.
  if ($("chat-messages").querySelector(".msg")) return;
  const picks = await apiJson("/chat/suggestions").catch(() => []);

  // Re-check after the await in case a message was sent while we waited
  if ($("chat-messages").querySelector(".msg")) return;

  // batch-a.md's "left open" item: `#chat-suggest` is on loan to `.chat-empty`
  // (see the long comment on `openConversation` below) and `newChatConversation`
  // used to wipe `#chat-messages` with a bare `replaceChildren()` without
  // sending it home first, so a "+ New" click while this call was still
  // awaiting the network took the element it was about to write to with it.
  // `newChatConversation` returns it home first now (below), so this should
  // not fire in practice any more; kept as the same defensive `?.`
  // `openConversation` already uses at its own call site, since a null box
  // here would otherwise throw past the point where anything could tell.
  const box = $("chat-suggest");
  if (!box) return;
  box.replaceChildren();
  box.classList.toggle("hidden", picks.length === 0);
  if (!picks.length) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Try asking:";
  box.appendChild(label);
  for (const question of picks) {
    const chipEl = chip(question, "", () => sendChatMessage(question));
    box.appendChild(chipEl);
  }
  //: They arrive after the welcome was drawn, so the welcome takes them now.
  const empty = $("chat-messages").querySelector(".chat-empty");
  if (empty && !empty.contains(box)) empty.appendChild(box);
  // These chips arrive after the tab is drawn and are a row or two of height
  // the composer's fit was measured without.
  refitComposer();
}

// Personas section in Settings (Wave C, editing + reset in Wave D).
// Mirrors the backend's built-ins: editing one saves an override with the
// same name (the saved list wins), and Reset deletes the override.
//: The name, and the function that reads it. The function is kept even now
//: that the constant is declared above it, because `GUIDE_NAME` is still
//: settings.js's and the two are read the same way; the `typeof` guard is
//: what stopped the first version of this throwing at boot, when the
//: constant lived in the last script on the page and `renderPlanToggle()`
//: read it at load.
//: One name for the notebook's AI, spelt once (INBOX 225). It lives here
//: rather than in settings.js because index.html loads app.js first and
//: settings.js last: a module-level string anywhere else in the app can read
//: this one at load time, and could not read a constant declared in the last
//: script on the page. The backend's `AI_NAME` in ai/__init__.py is the same
//: word.
const AI_NAME = "Atlas";

function aiNameNow() {
  return typeof AI_NAME === "string" ? AI_NAME : "Atlas";
}

//: The built-in librarian is Atlas; a preference saved as "Librarian" from
//: before the rename reads as Atlas everywhere (INBOX 237).
function personaDisplayName(name) {
  return !name || name === "Librarian" ? aiNameNow() : name;
}

//: A function, not a table: the librarian is named after the app's AI
//: (`AI_NAME`, settings.js), so its key and its prompt are built from that
//: name when asked for, the same way `librarian.DEFAULT_PERSONA` is built
//: from the backend's `AI_NAME` (the owner, 2026-09-14: "since you were
//: using {ai name} as the ai name variable, should that be used instead??").
function builtinPersonas() {
  const name = aiNameNow();
  return {
    [name]: `You are ${name}, the librarian of this notebook: warm, curious and a little witty. You know these notes well, love spotting how they connect, speak plainly, and say so when the notes don't know.`,
    Coach:
      "You are an encouraging personal coach reviewing the user's notes. " +
      "Spot patterns, celebrate progress, and suggest one concrete next step.",
    Analyst:
      "You are a precise analyst. Extract the facts, numbers, and patterns " +
      "from the notes and organise your answer clearly.",
  };
}

let personaEditing = null; // name currently in inline-edit mode

async function savePersonaList(personas) {
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ personas }),
  });
  await renderPersonas();
  personaOptions();
}

//: The names the pickers offer, from what is already in memory.
function personaNamesNow() {
  const custom = ((prefsCache && prefsCache.personas) || []).map((p) => p.name);
  return [...new Set([...Object.keys(builtinPersonas()), ...custom])];
}

async function renderPersonas() {
  //: The greeting picker is filled before the wait, not after it (the owner:
  //: "the dashboard greeting persona selection box is broken and there is no
  //: avatar next to it ... it sometimes works and sometimes doesnt"). It was
  //: filled at the end of this function, after `GET /preferences` and after
  //: the whole persona list was built, so on a busy server, or if anything in
  //: the list threw, the section showed an empty select and an empty face.
  renderDashboardPersonaSelect(personaNamesNow());
  prefsCache = await apiJson("/preferences").catch(() => prefsCache);
  const custom = (prefsCache && prefsCache.personas) || [];
  const overrides = new Map(custom.map((p) => [p.name, p]));
  const list = $("persona-list");
  list.replaceChildren();

  const rows = [
    ...Object.keys(builtinPersonas()).map((name) => ({
      name,
      builtin: true,
      overridden: overrides.has(name),
      prompt: overrides.has(name) ? overrides.get(name).prompt : builtinPersonas()[name],
    })),
    ...custom
      .filter((p) => !(p.name in builtinPersonas()))
      .map((p) => ({ ...p, builtin: false, overridden: false })),
  ];

  renderDashboardPersonaSelect(rows.map((p) => p.name));

  for (const persona of rows) {
    const li = document.createElement("li");

    if (personaEditing === persona.name) {
      // Inline editor: textarea + save/cancel.
      const textarea = document.createElement("textarea");
      textarea.rows = 3;
      textarea.value = persona.prompt;
      const row = document.createElement("div");
      row.className = "row";
      row.appendChild(
        smallButton(
          "Save",
          "",
          async () => {
            const prompt = textarea.value.trim();
            if (!prompt) return;
            const updated = custom.filter((p) => p.name !== persona.name);
            updated.push({ name: persona.name, prompt });
            personaEditing = null;
            await savePersonaList(updated);
          },
          false
        )
      );
      row.appendChild(
        smallButton("Cancel", "", () => {
          personaEditing = null;
          renderPersonas();
        })
      );
      li.append(chip(persona.name), textarea, row);
      list.appendChild(li);
      setTimeout(() => textarea.focus(), 0);
      continue;
    }

    const row = document.createElement("div");
    row.className = "entry-meta persona-row";
    //: Each persona its own mark, so a list of them is told apart at a
    //: glance; the app's own emblem for its own voice.
    const mark = document.createElement("span");
    mark.className = "persona-mark";
    //: 36px in the Settings list (the owner: "enlarge the avatar icons on
    //: personas in settings a bit"): a row there has the room, and a face
    //: at 20px was a coloured dot with a smile.
    fillPersonaMark(mark, persona.name, 36);
    row.append(mark, chip(persona.name, "item-title"));
    if (persona.builtin) {
      row.appendChild(chip(persona.overridden ? "Edited" : "Built-in", "item-label"));
    }
    const note = document.createElement("span");
    note.className = "muted persona-preview";
    note.textContent = persona.prompt;
    row.appendChild(note);

    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Edit", "Edit this persona's prompt", () => {
        personaEditing = persona.name;
        renderPersonas();
      })
    );
    if (persona.builtin && persona.overridden) {
      actions.appendChild(
        smallButton("Reset", "Restore the default prompt", async () => {
          await savePersonaList(custom.filter((p) => p.name !== persona.name));
        })
      );
    }
    if (!persona.builtin) {
      actions.appendChild(
        smallButton("Delete", "Remove this persona", async () => {
          if (!(await confirmDialog(`Delete the “${persona.name}” persona?`))) return;
          await savePersonaList(custom.filter((p) => p.name !== persona.name));
        })
      );
    }
    row.appendChild(actions);
    li.appendChild(row);
    list.appendChild(li);
  }
}

// A second, independent picker (asked for directly): the dashboard greeting
// otherwise always spoke in whichever persona Chat had active, with no way
// to give the notebook's own front page a different voice. "" means "no
// override" and falls back to active_persona server-side, same clear-with-
// empty-string convention display_name/dashboard_persona already share.
function renderDashboardPersonaSelect(names) {
  const select = $("dashboard-persona-select");
  const current = (prefsCache && prefsCache.dashboard_persona) || "";
  select.replaceChildren();
  const sameAsChat = document.createElement("option");
  sameAsChat.value = "";
  sameAsChat.textContent = "Same as Chat";
  select.appendChild(sameAsChat);
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  //: A saved name that is no longer in the list (the built-in was
  //: "Librarian" before it became Atlas; a custom persona can be deleted)
  //: left the select with no selected option, which the enhanced opener
  //: drew as an empty box with a chevron (the owner, 2026-09-14: "this
  //: dashboard welcome message persona dropdown box is broken visually").
  //: The old built-in reads as the new one; anything else unknown reads as
  //: "Same as Chat", which is what the server falls back to as well.
  const wanted = personaDisplayName(current) === current || current === "Librarian" ? personaDisplayName(current) : current;
  select.value = names.includes(wanted) ? wanted : "";
  paintDashboardPersonaMark();
}

//: "Same as Chat" follows Chat's picker, so its face does too.
document.addEventListener("change", (event) => {
  if (event.target?.id === "persona-select") paintDashboardPersonaMark();
});

async function addPersona() {
  const name = $("persona-name").value.trim();
  const promptText = $("persona-prompt").value.trim();
  const status = $("persona-status");
  if (!name || !promptText) {
    status.textContent = "Both a name and a prompt are needed.";
    return;
  }
  const custom = ((prefsCache && prefsCache.personas) || []).filter(
    (p) => p.name !== name
  );
  custom.push({ name, prompt: promptText });
  await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ personas: custom }),
  });
  $("persona-name").value = "";
  $("persona-prompt").value = "";
  status.textContent = `Added “${name}”.`;
  await renderPersonas();
  personaOptions();
}
