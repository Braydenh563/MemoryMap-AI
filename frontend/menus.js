// menus.js: action menus and their escape, help popovers, connections, history,
// the menu keyboard, the note's overflow menu. Moved out of app.js on
// 2026-09-26 as one contiguous range (INBOX 426 cc,
// docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

function inlineActionIs(id, kind) {
  return inlineAction && inlineAction.id === id && inlineAction.kind === kind;
}

// Close every open ⋯ menu (shared by outside-click and Esc, Wave L).
// A kebab menu that stays where it opened while the list scrolls under it
// ends up beside the wrong note (reported: "they stay sticky on the screen
// even when I scroll putting the note I clicked it for off the page"). Any
// scroll outside the open menu closes it; a scroll inside a long menu is
// the menu's own and is left alone.
//: Walked from a live collection rather than asked of the whole document:
//: this runs on every scroll event on every tab (it is a capturing listener),
//: nearly always with nothing open, and a `:not(.hidden)` selector over the
//: app's 10,700 elements was the second-largest script cost of a 30-step
//: wheel scroll (27ms on the Library). The collection holds only the menus.
const ACTION_MENUS = document.getElementsByClassName("action-menu");

function closeActionMenusOnScroll(event) {
  const openMenus = [];
  for (const menu of ACTION_MENUS) if (!menu.classList.contains("hidden")) openMenus.push(menu);
  if (openMenus.length === 0) return;

  // Trackpads send small deltaX values along with deltaY when scrolling vertically.
  // If a dropdown lacks horizontal scroll, browsers often chain the deltaX to the 
  // nearest horizontally scrollable ancestor. If that ancestor scrolls, this function
  // fires. By ignoring the scroll while the user is actively hovering the menu, we 
  // prevent the menu from abruptly closing during trackpad scrolling.
  // We also track the last wheel event time, as :hover is often lost during 
  // momentum scrolling on touchpads.
  const timeSinceLastMenuWheel = Date.now() - (window._lastMenuWheelTime || 0);
  if (
    timeSinceLastMenuWheel < 500 || 
    document.querySelector(".select-menu:hover, .action-menu:hover, .doc-dock-menu-list:hover, .library-image-menu-list:hover, .wb-board-menu:hover")
  ) {
    return;
  }

  if (event.target instanceof Node) {
    for (const open of openMenus) {
      if (open.contains(event.target)) return;
    }
  }
  closeActionMenus();
}
window.addEventListener("scroll", closeActionMenusOnScroll, true);

// Track recent wheel events over menus to prevent them from closing during 
// momentum scrolls where the :hover state might temporarily detach.
window.addEventListener("wheel", (event) => {
  if (event.target.closest(".select-menu, .action-menu, .doc-dock-menu-list, .library-image-menu-list, .wb-board-menu")) {
    window._lastMenuWheelTime = Date.now();
  }
}, { passive: true, capture: true });

function closeActionMenus() {
  for (const menu of document.querySelectorAll(".action-menu:not(.hidden)")) {
    //: Read before the menu hides: a hidden element cannot hold the focus,
    //: and the browser hands it to `body`, which is nowhere a keyboard user
    //: can continue from.
    const held = menu.contains(document.activeElement);
    menu.classList.add("hidden");
    restoreEscapedMenu(menu);
    // `menu._escapedOpener` (set by wireEscapedActionMenu) wins when
    // present: a menu reparented to <body> has no useful `.parentElement`
    // to search: `document.body.querySelector` would find the *first*
    // `[aria-haspopup]` anywhere on the page, not this menu's own opener,
    // and set the wrong button's aria-expanded. Undefined for every other
    // menu, so this changes nothing for them.
    const opener = menu._escapedOpener || menu.parentElement.querySelector("[aria-haspopup]");
    if (opener) opener.setAttribute("aria-expanded", "false");
    if (held && opener?.isConnected) opener.focus({ preventScroll: true });
  }
  for (const strip of document.querySelectorAll(".menu-open")) {
    strip.classList.remove("menu-open");
  }
}

// Opening one, shared by the note cards and the sidebar kebabs so the two
// cannot drift apart.
//
// **`menu-open` is the fix for a reported bug, and it is not cosmetic.** On a
// note card, `.entry-actions` is `position: absolute; z-index: 1`, which
// makes it a *stacking context*, so the menu's own `z-index: 30` is resolved
// inside it and counts for nothing outside it. Every other note's action strip
// is also `z-index: 1`, and later in the document, so it paints on top of an
// open menu. Reported as "the other buttons in notes go over the popup options
// from above notes", and measured: with the first note's menu open, the topmost
// element at three separate points *inside* the menu was a button belonging to
// a different note. So it was not only a menu with buttons drawn over it, it
// was a menu whose items clicked the wrong note's controls.
//
// Raising the owning strip lifts the whole context, menu included. 5 rather
// than something larger because the only thing it has to beat is the 1 on its
// siblings; the page's own chrome is a different context and a big number here
// would only be a number waiting to collide with one.
// The nearest ancestor that actually clips overflow, walking up past plain
// flow containers. `.action-menu` is `position: absolute` inside a `.menu-wrap`
// that is itself absolutely positioned on the row, it never escapes an
// `overflow: auto` ancestor the way a portal would, so a row near the bottom
// of a scrolling list grows that ancestor's scrollHeight by however far the
// menu spills past it, and the menu itself is clipped at the same edge.
// Reported on the Documents subtab: the last row's ⋯ menu appeared cut off
// *and* a scrollbar showed up in a panel that fit without one a moment
// before opening it.
function nearestScrollParent(el) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

// **One help popover, for every "?" in the app.** Reported directly, with a
// screenshot of Settings' own Search-relevance hint: "the search relevance
// '?' popup tooltip is completely different from all other tooltips like it,
// same with the 'keep the ai on this machine' tooltip… all the ui and ux
// needs to be consistent in how it looks, how it functions, and where it is
// placed."
//
// It genuinely was three different things wearing the same "?" icon:
//   1. `.graph-help-panel`, a floating glass card (Graph, Timeline, three
//      Library sub-tabs).
//   2. the same class inside `.settings-section`, where a CSS override made
//      it `position: static`, so it was not a popover at all, it was a
//      bordered paragraph that shoved the rest of the form down the page.
//      That is the "just text in a box" in the screenshot.
//   3. `.setting-hint`, Settings' own long hints, which expanded inline
//      with no surface, border or shadow whatsoever.
//
// This makes all three the same control: a real popover, lifted to <body> so
// no card's `overflow` or `backdrop-filter` can clip it (the same escape
// `wireEscapedActionMenu` above makes, for the same reason), anchored under
// its own trigger with a caret pointing back at it, and closed the three
// ways every other popover here closes.
function placeHelpPopover(panel, trigger, retry = true) {
  const margin = 8;
  const anchor = trigger.getBoundingClientRect();
  //: **The other half of the flicker, which this function did not have.**
  //: Reported again after the dropdowns were fixed: "the flickering popup
  //: panels and dropdown panels are still happening", "still happen on some
  //: tooltips". `wireEscapedActionMenu`'s `place` already refuses an
  //: all-zero anchor rect (what a trigger inside a `display: none` or
  //: not-yet-laid-out ancestor reports, which collapses every sum below to
  //: the margin and puts the panel in the top corner); this one measured
  //: the same way and trusted it. Same guard, same shape: one retry on the
  //: next frame, held invisible rather than painted in the corner while it
  //: waits, and out of retries it places as best it can rather than
  //: flashing. A "?" whose trigger is genuinely at the origin also has zero
  //: width and height, so the three-way test cannot mistake a real corner
  //: trigger for an unmeasured one.
  if (!anchor.width && !anchor.height && !anchor.top) {
    if (retry) {
      panel.style.visibility = "hidden";
      requestAnimationFrame(() => placeHelpPopover(panel, trigger, false));
      return;
    }
  }
  // Measured while invisible: the panel is shown at 0,0 for the measure
  // and only then moved, which painted one frame in the top-left corner
  // (reported: "they flicker somewhere else on the screen for a split
  // second"). visibility keeps layout and geometry, so the measure is the
  // same, and nothing paints until the position is set.
  panel.style.visibility = "hidden";
  panel.style.left = "0px";
  panel.style.top = "0px";
  const box = panel.getBoundingClientRect();
  // Centred on the trigger, then pulled inside the window, a "?" sitting in
  // a right-hand control cluster would otherwise open half off-screen.
  //: **Clamped to the surface the trigger lives on, not to the window.**
  //: Reported with a screenshot of the search-relevance help hanging off the
  //: right edge of the Settings dialog and over the page behind it: a modal is
  //: narrower than the viewport, so "inside the window" let the popover leave
  //: the thing it belongs to while still being technically on screen. The
  //: window is the fallback for a "?" that is not inside a dialog at all.
  const surface = trigger.closest(".modal-card, .card") || null;
  const bounds = surface ? surface.getBoundingClientRect() : null;
  const minLeft = bounds ? Math.max(margin, bounds.left + margin) : margin;
  const maxLeft = bounds
    ? Math.min(window.innerWidth - margin - box.width, bounds.right - margin - box.width)
    : window.innerWidth - margin - box.width;
  let left = anchor.left + anchor.width / 2 - box.width / 2;
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));
  //: **The window is the hard bound, the surface is the preference** (INBOX
  //: 206, measured at 390x844: the capture popover sat at x=73 with a 358px
  //: body and ran 41px past the right edge of the screen). When the surface
  //: is narrower than the popover plus its margins, which is every card on a
  //: phone, `maxLeft` falls below `minLeft` and the clamp above resolves to
  //: `minLeft`, the card's own left edge, with nothing left to stop the
  //: right-hand side leaving the window. Clamping to the viewport last cannot
  //: make the surface fit worse: it only ever pulls the panel back towards
  //: the middle of the screen.
  left = Math.min(Math.max(left, margin), Math.max(margin, window.innerWidth - margin - box.width));
  let top = anchor.bottom + 10;
  let above = false;
  if (top + box.height > window.innerHeight - margin) {
    const room = anchor.top - 10 - box.height;
    if (room >= margin) {
      top = room;
      above = true;
    } else {
      top = Math.max(margin, window.innerHeight - margin - box.height);
    }
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.top = `${Math.round(top)}px`;
  panel.style.visibility = "";
  panel.classList.toggle("help-popover-above", above);
  // The caret is positioned against the panel, but it has to point at the
  // trigger: which is only the panel's own centre when nothing clamped it.
  const caretX = Math.min(Math.max(anchor.left + anchor.width / 2 - left, 14), Math.max(box.width - 14, 14));
  panel.style.setProperty("--help-caret-x", `${Math.round(caretX)}px`);
}

//: Every open popover this session, so a second one closes the first and
//: nothing is left stranded at <body> after a tab switch.
const openHelpPopovers = new Set();

function closeHelpPopovers() {
  for (const entry of [...openHelpPopovers]) entry.close();
}

//: **One set of page listeners for every popover, here, not four per
//: wiring.** They used to be added inside `wireHelpPopover`, so each of the
//: fifty-odd '?'s on the page put its own four on document and window, and a
//: '?' built after boot (the chat welcome's, rebuilt on every new chat) added
//: four more each time, each closure holding the welcome it was built for:
//: listenerrounds.js measured +27 listeners a rebuild, for the life of the
//: page. These read the open set instead, so wiring a popover costs the two
//: listeners on its own elements, collected with them.
document.addEventListener("click", (event) => {
  for (const entry of [...openHelpPopovers]) {
    if (entry.panel.contains(event.target) || entry.trigger.contains(event.target)) continue;
    entry.close();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeHelpPopovers();
});
window.addEventListener("resize", () => {
  for (const entry of openHelpPopovers) placeHelpPopover(entry.panel, entry.trigger);
}, { passive: true });
// A popover is anchored to a rect that scrolls away underneath it; every
// other floating thing in this app closes rather than chasing it.
window.addEventListener("scroll", closeHelpPopovers, true);

function wireHelpPopover(trigger, panel) {
  if (!trigger || !panel || panel.dataset.helpPopover) return;
  panel.dataset.helpPopover = "1";
  let homeParent = null;
  let homeNext = null;
  const entry = {
    panel,
    trigger,
    close() {
      if (!openHelpPopovers.has(entry)) return;
      openHelpPopovers.delete(entry);
      panel.classList.add("hidden");
      panel.classList.remove("help-popover", "help-popover-above");
      panel.style.left = "";
      panel.style.top = "";
      //: Cleared with the rest of the inline placement: an element left
      //: `visibility: hidden` in its home tree is an element some other
      //: feature will one day show and find invisible.
      panel.style.visibility = "";
      if (homeParent) homeParent.insertBefore(panel, homeNext);
      trigger.setAttribute("aria-expanded", "false");
    },
  };
  const open = () => {
    closeHelpPopovers();
    homeParent = panel.parentElement;
    homeNext = panel.nextSibling;
    document.body.appendChild(panel);
    //: **Hidden before it is shown, revealed only by the placement**
    //: (INBOX 206: "popups still flicker for a split second at the top left
    //: and then appear in the right place"). Removing `hidden` first and
    //: placing afterwards is safe only while nothing between the two can
    //: yield to the compositor, which is true of this function today and is
    //: not a property anyone editing it can see. Setting `visibility` here
    //: makes the invariant local: the panel is laid out, so it can be
    //: measured, and the only line that can make it visible is the one in
    //: `placeHelpPopover` that runs after `left`/`top` are written.
    panel.style.visibility = "hidden";
    panel.classList.remove("hidden");
    // `.setting-hint`'s own collapsed state is a max-height animation, not a
    // `hidden` class: an inline hint has to be un-collapsed as well, or the
    // popover opens at zero height.
    panel.classList.remove("is-collapsed");
    panel.classList.add("help-popover");
    trigger.setAttribute("aria-expanded", "true");
    openHelpPopovers.add(entry);
    placeHelpPopover(panel, trigger);
  };
  trigger.addEventListener("click", (event) => {
    // These triggers live inside <label>s often enough that a bare click
    // would toggle the setting they explain.
    event.preventDefault();
    event.stopPropagation();
    if (openHelpPopovers.has(entry)) entry.close();
    else open();
  });
  panel.addEventListener("click", (event) => event.stopPropagation());
}
window.wireHelpPopover = wireHelpPopover;

function openActionMenu(menu, opener) {
  closeActionMenus(); // only one open at a time
  //: **Measured while invisible, revealed once.** Reported alongside the
  //: collapsed menu above: "the popup sitll has the left corner screen flicker
  //: before it shows in the right place". Everything below this line needs the
  //: menu laid out to do its job (the flip test reads its rect, and
  //: `escapeMenuIfClipped` reparents it to `<body>` and writes a `top` only
  //: after measuring), and `hidden` is `display: none`, so the menu has to be
  //: shown before any of it can run. That leaves at least one painted frame
  //: where a menu about to be moved is visible where it started, which for an
  //: escaped menu is wherever `<body>` puts an unpositioned child.
  //:
  //: `visibility: hidden` is the difference: the box is laid out and
  //: measurable, and it paints nothing until the last line puts it back. The
  //: same two-step `showSelectionPopupAt` uses, and for the same reason.
  const wasVisibility = menu.style.visibility;
  menu.style.visibility = "hidden";
  menu.classList.remove("hidden", "action-menu-flip");
  opener.setAttribute("aria-expanded", "true");
  // Whichever ancestor is the stacking context this menu is trapped in. On a
  // note card that is `.entry-actions` (positioned, z-index 1); on a Library
  // card it is the card itself, because `backdrop-filter` creates a stacking
  // context too: which is why the same "menu behind the next card" bug turned
  // up again on a surface with no z-index in sight.
  menu.closest(".entry-actions, .library-card")?.classList.add("menu-open");
  // Opens downward by default; flip upward only when that would spill past
  // the nearest clipping ancestor, so a menu near the top of a short list
  // still opens the normal way.
  const bound = nearestScrollParent(opener).getBoundingClientRect();
  if (menu.getBoundingClientRect().bottom > bound.bottom) {
    menu.classList.add("action-menu-flip");
  }
  //: **A select's list starts under its own box** (the owner, with a
  //: screenshot: the Corner companion list opened out to the left of its
  //: select, over the section nav). Menus hang from their opener's right
  //: edge, which suits a ⋯ at the end of a row; a select's list is read
  //: down from the value it replaces, so it takes the opener's left edge
  //: whenever it fits that way, and keeps the right edge only when it
  //: would otherwise run past its container.
  menu.classList.remove("action-menu-start");
  if (opener.closest(".select-shell")) {
    const openerBox = opener.getBoundingClientRect();
    const width = menu.getBoundingClientRect().width;
    if (openerBox.left + width <= Math.min(bound.right, window.innerWidth) - 4) {
      menu.classList.add("action-menu-start");
    }
  }
  //: **And if flipping is not enough, leave the box entirely.** Asked for
  //: app-wide: "make sure the popup menus dont get clipped or go off the
  //: screen." Measured on the live app: **21** absolutely-positioned menus sit
  //: inside an ancestor with `overflow` set: every enhanced `<select>` inside
  //: a scrolling panel, the document dock's own list, the whiteboard's menus.
  //: Flipping upward only helps when the spill is downward and the clipper is
  //: tall enough; sideways, or in a short panel, the menu is simply cut.
  //:
  //: `wireEscapedActionMenu` has solved this since the Library's kebab was
  //: reported: but only for the callers that remembered to ask for it, one at
  //: a time. This makes it the default *when it is needed*: nothing changes for
  //: a menu that fits, and a menu that does not gets the same reparent-to-body
  //: treatment rather than being clipped.
  escapeMenuIfClipped(menu, opener);
  //: Placed, so it can be seen. Restored rather than cleared, in case a caller
  //: had its own reason to hide this menu.
  menu.style.visibility = wasVisibility;
  focusMenuItem(menu.querySelector("button"), menu);
}

//: **Focusing the first row of a menu must never scroll the page behind it.**
//:
//: Measured, not reasoned. The reader picker at the top of the OCR workspace
//: (`#ocr-reader`) would not open at all: one real Chromium click produced,
//: in order, `openActionMenu` (the menu unhides and escapes to <body>), a
//: `focusin` on the chosen row, a `scroll` event on `.ocr-toolbar`, and then
//: `closeActionMenusOnScroll` shutting the menu it had just opened, 3 option
//: rows built and 0 visible. `.ocr-toolbar` is `overflow-x: auto` (it scrolls
//: sideways rather than wrapping, by design), the menu is still a child of
//: that toolbar at the moment the focus lands, and a plain `.focus()` asks
//: the browser to scroll every ancestor until the focused element is in view.
//: So the open *caused* the scroll, and the scroll-away rule, which exists
//: for a real one (a kebab left beside the wrong note while its list scrolls
//: under it), could not tell the two apart.
//:
//: The fix is at the cause rather than at that rule: this app positions its
//: own menus, from the opener's rect, escaping to <body> when they would be
//: clipped, so an ancestor scrolling to "reveal" a menu item is never what is
//: wanted and is the browser undoing the placement. `preventScroll` says
//: exactly that, with no timer for anyone to tune.
//:
//: What it must not lose is the scrolling that *is* wanted: a long menu (the
//: model picker, a 30-option select) whose chosen row is below its own fold
//: has to bring that row into view. So the menu scrolls itself, by the two
//: lines below, and nothing above it moves.
function focusMenuItem(item, menu) {
  if (!item) return;
  item.focus({ preventScroll: true });
  const box = menu || item.closest(".action-menu");
  if (!box || box.scrollHeight <= box.clientHeight) return;
  const top = item.offsetTop;
  const bottom = top + item.offsetHeight;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

//: The nearest ancestor that would clip this menu, `overflow` anything but
//: `visible` makes a box a clipping context, and `clip` and `hidden` clip
//: without even offering a scrollbar to reach what they cut off.
function menuClippingAncestor(el) {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const cs = getComputedStyle(node);
    const clips = (value) => value === "auto" || value === "scroll" || value === "hidden" || value === "clip";
    if (clips(cs.overflowX) || clips(cs.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

//: The placement `wireEscapedActionMenu` has always used, factored out so the
//: automatic path and the hand-wired one cannot drift into placing the same
//: menu differently. Right-aligned to the opener, flipped above when the whole
//: box fits there, and clamped to the viewport on both axes, which is the
//: "or go off the screen" half of the same report.
//:
//: **This is deliberately not `place()`'s vertical rule** (see
//: `wireEscapedActionMenu` below), and the difference was measured rather
//: than assumed, on the note cards' own kebab menus, which are the automatic
//: path's largest population. `place()` decides between the room above the
//: trigger and the room below it and scrolls inside whichever is larger; this
//: one is allowed to span *across* the trigger and use the whole window. For
//: a menu taller than either side, that is the difference between showing all
//: of it and showing part of it: at 1280x640 a 375px menu opened from a card
//: at y=313 sits 257 to 632 here and needs no scrollbar at all, while
//: `place()`'s rule caps it to the 301px above the card and makes it scroll;
//: at 1280x360 the same menu shows 294px of itself against `place()`'s 207px,
//: with 143px of empty window left under it. A kebab covering its own three
//: dots for as long as it is open costs nothing. A `<select>` dropdown
//: covering the field you are choosing a value in is a different matter,
//: which is why `place()`, whose callers are that shell and the wrap kebabs,
//: keeps the trigger clear and takes the scrollbar instead.
//:
//: What is shared is everything else: the horizontal clamp, the 8px margin,
//: the 4px gap, and the rule that the whole box lands inside the window.
//: Neither can run past the bottom, because `07-whiteboard-misc.css` caps
//: every `.action-menu` at `calc(100vh - var(--space-9) * 2)` with
//: `overflow-y: auto`, measured as 576px in a 640px window and 296px in a
//: 360px one, so a menu is never taller than the window it is placed in.
function placeEscapedMenu(menu, opener) {
  const margin = 8;
  const anchor = opener.getBoundingClientRect();
  // Same reason as placeHelpPopover: no frame at 0,0 before the move.
  menu.style.visibility = "hidden";
  menu.style.left = "0px";
  menu.style.top = "0px";
  const box = menu.getBoundingClientRect();
  let left = anchor.right - box.width;
  let top = anchor.bottom + 4;
  if (left < margin) left = margin;
  if (left + box.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - margin - box.width);
  }
  if (top + box.height > window.innerHeight - margin) {
    const above = anchor.top - 4 - box.height;
    //: **Both edges, not just the top.** This branch used to accept `above`
    //: on `above >= margin` alone, which is only half the question: with a
    //: trigger below the fold (a card the list has scrolled past, a menu
    //: opened from script), "above the trigger" is itself off the bottom of
    //: the window. Measured at 1280x360 on the third note card, whose kebab
    //: sits at y=405: the menu landed at top 105, bottom 401, with 41px of it
    //: past the window and nothing able to bring that back. The fallback
    //: below, which pins the box to the last position that fits, was always
    //: the right answer for that case.
    const fits = above >= margin && above + box.height <= window.innerHeight - margin;
    top = fits ? above : Math.max(margin, window.innerHeight - margin - box.height);
  }
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
  menu.style.visibility = "";
}

function escapeMenuIfClipped(menu, opener) {
  //: A menu that already has its own escape wiring is left alone: two
  //: mechanisms reparenting the same node would fight over where home is.
  if (menu._escapeWired || menu._escapedHome) return;
  const clipper = menuClippingAncestor(menu);
  if (!clipper) return;
  const box = menu.getBoundingClientRect();
  const bound = clipper.getBoundingClientRect();
  //: A pixel of tolerance, because a menu whose edge lands exactly on its
  //: container's is not clipped and reparenting it would be a visible jump for
  //: no reason.
  const spills =
    box.right > bound.right + 1 ||
    box.left < bound.left - 1 ||
    box.bottom > bound.bottom + 1 ||
    box.top < bound.top - 1;
  if (!spills) return;
  menu._escapedHome = { parent: menu.parentElement, next: menu.nextSibling };
  //: Read by `closeActionMenus`, which otherwise looks for the opener among
  //: the menu's siblings: and once the menu is a child of <body> that search
  //: finds the first `[aria-haspopup]` on the page, which is the wrong button.
  menu._escapedOpener = opener;
  document.body.appendChild(menu);
  menu.classList.add("action-menu-escaped");
  //: `action-menu-flip` pins `bottom`; `placeEscapedMenu` sets `top`. Both at
  //: once over-constrains an auto-height box, which reproduced as the menu
  //: collapsing to its own padding, see `wireEscapedActionMenu`'s note.
  menu.classList.remove("action-menu-flip");
  placeEscapedMenu(menu, opener);
}

function restoreEscapedMenu(menu) {
  const home = menu._escapedHome;
  if (!home) return;
  //: Put back rather than left in <body>: a page that never restores an
  //: escaped menu accumulates stray fixed nodes forever, and the next
  //: `openActionMenu` expects to find it where it was built.
  home.parent.insertBefore(menu, home.next);
  menu.classList.remove("action-menu-escaped");
  menu.style.left = "";
  menu.style.top = "";
  menu._escapedHome = null;
}

//: **Escape a clipping ancestor, then cap to the room really left below.**
//: The second of this file's two menu recipes, and the one for a menu whose
//: ordinary position comes from the stylesheet rather than from us:
//: `details.dock-menu`'s panel (INBOX 31) and the whiteboard's five top-bar
//: menus (INBOX 43). It was written twice, once in each place, with the same
//: margin, the same floor and the same order; the second copy's own comment
//: said it was "the same recipe ... not a third scheme", which is exactly the
//: state in which a reader improves one of them and leaves the other behind.
//: Measured identical before and after on the whiteboard's own menus at
//: 1440x900, 1280x640 and 1024x560 (View: escaped at the two smaller sizes,
//: capped to 576px and 496px, 20px and 100px of scroll inside it).
//:
//: **Not** folded into `wireEscapedActionMenu`'s `place()`, this file's other
//: recipe, and the difference is not a detail: `place()` *positions* the menu
//: itself, fixed and right-aligned under its opener, every time it opens,
//: because the `.action-menu` it is wired to has no position of its own once
//: it is a child of <body>. These menus do have one. A dock menu that nothing
//: clips is still anchored by CSS under its own summary, and a whiteboard menu
//: under its own toolbar button, so running them through `place()` would move
//: menus that were never in the wrong place to satisfy a shared function. Here
//: the escape stays conditional (a no-op when nothing clips) and only the
//: height is decided.
function escapeAndCapMenu(menu, opener) {
  //: **Measured with every cap off, not just this function's own.**
  //: The inline cap is cleared before the measurement rather than after the
  //: close: the `top` read below has to be this open's real one, and a cap
  //: left over from the last open changes it (a menu that would have flipped
  //: above no longer needs to) as well as hiding the fact that the menu wants
  //: more room.
  //:
  //: `none` rather than empty, because clearing the inline value only hands
  //: the menu back to the *stylesheet's* cap, and that is the same lie one
  //: level down. Measured on the map's View menu at 1440x760 (INBOX 114, "the
  //: view dropdown menu in the whiteboard and mindmap is still broken", with
  //: "Snap to grid" cut in half and a scrollbar): 714px of content, held to
  //: 616 by `.wb-board-menu`'s own `calc(100vh - 9rem)`, so `placeEscapedMenu`
  //: measured 616, found that it fitted under the opener, and left the menu at
  //: top 56. It was then capped to the 696px of room under *that* line and
  //: scrolled 18px of content it had the window height to show: placed at the
  //: top of the window instead, all 714 fit. A menu is moved up by how tall it
  //: really is, or it is moved for the wrong reason.
  menu.style.maxHeight = "none";
  escapeMenuIfClipped(menu, opener);
  const margin = 8;
  //: After the escape, so the number is measured against wherever the menu
  //: has ended up: `placeEscapedMenu` may have flipped it above the opener or
  //: clamped it to the top of the window, and a cap computed from the old top
  //: would be the wrong one for the new position.
  const box = menu.getBoundingClientRect();
  //: **Anchor on the opener, not on the menu, and never on a rect that was
  //: not laid out.** Measured while the whiteboard tab was hidden: every
  //: `.wb-board-menu` reported `top: 0` and this wrote a 892px cap from it,
  //: on a viewport of 900. A rect read from an element inside a
  //: `display: none` ancestor is all zeroes, and the arithmetic below
  //: cannot tell that from a menu genuinely sitting at the top of the
  //: window: it just produces a number, which is how a cap ends up either
  //: meaningless or, when the stale `top` is large, small enough to read as
  //: the reported "overly short" menu.
  //:
  //: The opener is by definition laid out (it was just clicked), so its own
  //: bottom edge is the honest answer to "where does this menu start".
  //: The menu's own top is the fallback for a caller that has no opener,
  //: and if neither is laid out the stylesheet's cap is left alone rather
  //: than replaced with a number derived from zeroes.
  //: **But where it was actually put beats where it would have gone.**
  //: `placeEscapedMenu` measures the menu *uncapped* and, when that height
  //: does not fit below the opener, pins the box higher up the window. The cap
  //: was still being computed from the opener's bottom, so a menu that had
  //: been moved up got the height of the room under the *opener* while sitting
  //: in the larger room under its own top, and scrolled with empty window
  //: below it. Measured on a board at 1440x700 (INBOX 107c, "the arrange
  //: dropdown is also very short"): the View menu was placed at top 96 with
  //: 604px of room under it and capped to 507, scrolling 594px of content
  //: through a 505px port with 89px of window to spare; at 600 it wasted 137.
  //:
  //: `placeEscapedMenu` only ever writes `top` (never `bottom`, the
  //: over-constraint note there says why), so the menu grows downward from
  //: exactly this edge in every one of its branches, and the room under that
  //: edge is the honest answer. The opener stays as the fallback for a menu
  //: the stylesheet placed and for one whose own rect is not laid out.
  const anchor = opener ? opener.getBoundingClientRect() : null;
  const laidOut = (rect) => rect && (rect.width || rect.height || rect.top);
  const top = laidOut(box) ? box.top : laidOut(anchor) ? anchor.bottom + margin : null;
  //: Nothing measurable to cap against: the stylesheet's own cap is the right
  //: thing to fall back to, and `none` above must not be what is left behind.
  if (top === null) {
    menu.style.maxHeight = "";
    return;
  }
  //: The floor keeps a menu opened near the bottom edge a menu rather than a
  //: slit; under it, scrolling inside the panel is the affordance.
  menu.style.maxHeight = `${Math.max(120, Math.round(window.innerHeight - top - margin))}px`;
}

// **Escapes a `kebabMenu()` dropdown from a clipping scroll ancestor.**
// Reported live, with a screenshot: "the documents popup menu in the
// library subtab gets cut off." `.library-view-section` is
// `overflow-y: auto`, and `.action-menu` is `position: absolute`, the
// same shape as the gallery kebab menu's own clipping bug earlier this
// session (`section.card.glass`'s `backdrop-filter`, there), fixed the
// same way: reparent to `<body>` and position from the opener's own rect,
// which is the only thing that actually escapes an ancestor's `overflow`.
//
// Deliberately **not** folded into `openActionMenu`/`closeActionMenus`
// themselves: `.action-menu` is shared by every note card, the chat
// dock, the selection popup and nested submenus, none of which are
// clipped, and none of which this session re-verified live. Rewriting
// what they all depend on to fix one clipped caller is a bigger, riskier
// change than watching that one caller's own open/close state and acting
// on it: which is what this does, via a MutationObserver on the menu's
// own `hidden` class, so `openActionMenu`'s existing flip logic keeps
// running unmodified underneath it.
//
// Call once, right after building a `kebabMenu()` wrap, for any menu
// known to live inside a scrolling ancestor.
function wireEscapedActionMenu(wrap) {
  const menu = wrap.querySelector(".action-menu");
  const opener = wrap.querySelector("[aria-haspopup]");
  if (!menu || !opener) return;
  // Read by closeActionMenus() in place of a DOM-parent lookup, which
  // would otherwise search the whole <body> for the first [aria-haspopup]
  // it finds, the wrong button, once this menu is no longer a
  // descendant of its own opener's wrapper.
  menu._escapedOpener = opener;
  //: Claimed, so `escapeMenuIfClipped` (the automatic path) does not also try
  //: to reparent this one, two mechanisms with two ideas of "home" would put
  //: it back in the wrong place.
  menu._escapeWired = true;
  let homeParent = null;
  let homeNext = null;
  const place = (retry = true) => {
    const margin = 8;
    const anchor = opener.getBoundingClientRect();
    //: **Never place against a rect that was not laid out.** Reported:
    //: dropdowns and tooltips "flicker into the top corner for a second
    //: then appear in the right place". Reproduced by measuring an open
    //: menu frame by frame: with the opener unmeasurable (all-zero rect,
    //: which is what an element inside a `display: none` or
    //: not-yet-laid-out ancestor reports) the arithmetic below resolves to
    //: the margin in both axes and the menu lands at 8,4: the top corner,
    //: exactly as described. A later pass then places it properly, which
    //: is the "and then it appears in the right place" half.
    //:
    //: So: one retry on the next frame, the same shape `clampToolbarMenu`
    //: already uses, and the menu is held invisible rather than painted in
    //: the corner while it waits. `visibility`, not `.hidden`: the class is
    //: the open/closed state that this observer is driven by, and writing
    //: it here would re-enter.
    if (!anchor.width && !anchor.height && !anchor.top) {
      if (retry) {
        menu.style.visibility = "hidden";
        requestAnimationFrame(() => place(false));
        return;
      }
      //: Out of retries: show it where the stylesheet puts it rather than
      //: never, and rather than in a corner of our own choosing.
      menu.style.visibility = "";
      return;
    }
    // Reset first: a stale left/top from the last open would otherwise
    // seed the width/height measurement below at the wrong size on some
    // browsers' layout of a `position: fixed` element mid-transition.
    menu.style.left = "0px";
    menu.style.top = "0px";
    //: **Measure the menu at its full height, not at whatever a stylesheet
    //: last capped it to.** Written in response to the whiteboard's View
    //: menu (INBOX 57, then 105), but the correction belongs here in the
    //: retest, not in the fix: this `place()` is `wireEscapedActionMenu`'s
    //: own, wired only to `enhanceSelect`'s dropdown shell and `kebabMenu`'s
    //: wrap (this file's own two call sites) -- the whiteboard's
    //: `.wb-board-menu` (Insert, Edit, Arrange, View, Board) never calls it.
    //: It goes through the file's other recipe, `escapeAndCapMenu` above,
    //: which leaves a menu the stylesheet has already anchored where it is
    //: and caps `max-height` to the room below its own final `top`. Read that
    //: function's comment before moving anything between the two: they differ
    //: because one owns the menu's position and the other does not.
    //: Retested directly on the real View menu, board and mind map, at
    //: 1440 and 820 wide, 900/700/640 tall: it already holds up (see INBOX
    //: 105's own retest note for the numbers), which is why this fix stayed
    //: scoped to the surfaces that actually call it rather than being
    //: ported into a second implementation that was not shown to need it.
    //: Whichever rule caps it, an inline `max-height: none` for the
    //: duration of the measurement is what makes `box.height` the height this
    //: menu actually wants, so the choice below is made on the real number.
    //:
    //: **And the cap below is not `placeEscapedMenu`'s job, deliberately.**
    //: Sharing it was tried and measured: giving the automatic path this rule
    //: made a 375px note-card menu that fitted whole at 1280x640 into a 301px
    //: scrolling one, and cost 87px of visible menu at 1280x360, because that
    //: path is allowed to span across its trigger and use the window while
    //: this one keeps the trigger clear. The numbers are at
    //: `placeEscapedMenu`, which is the site a reader is more likely to reach
    //: first.
    menu.style.maxHeight = "none";
    const box = menu.getBoundingClientRect();
    let left = anchor.right - box.width;
    let top = anchor.bottom + 4;
    if (left < margin) left = margin;
    if (left + box.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - box.width);
    }
    //: The room on each side of the trigger, which is the only honest cap:
    //: a fixed figure is either smaller than the window (the reported bug) or
    //: larger than it (a menu running off the bottom).
    const roomBelow = window.innerHeight - margin - (anchor.bottom + 4);
    const roomAbove = anchor.top - 4 - margin;
    if (box.height <= roomBelow) {
      top = anchor.bottom + 4;
      //: **`none`, not `""`.** Clearing the inline cap hands the menu back to
      //: the *stylesheet's* cap, and that is the same lie one level down that
      //: `escapeAndCapMenu` was fixed for in 8b92164: the menu is then placed
      //: by a height it is not drawn at. Downwards that only wastes room;
      //: upwards, the branch below, it is the reported bug. The height was
      //: measured a few lines up with every cap off and found to fit in the
      //: room on this side, so keeping it is exactly what "it fits" meant.
      menu.style.maxHeight = "none";
      menu.style.overflowY = "";
    } else if (box.height <= roomAbove) {
      //: Upwards only when the whole menu fits there. Opening up and *then*
      //: scrolling puts the first row at the bottom of the panel, furthest
      //: from the button that opened it, which reads as a different menu.
      //:
      //: **This is where the cap mattered** (INBOX 119, the owner: "the let
      //: the ai decide button popup is a massive gap above the picker").
      //: Reproduced on :8895, 1440x900 dark, with nine categories in the
      //: notebook (scratchpad/ui-sweeps/notesmenugap3.js): the File under menu
      //: wanted 410.8px, `.select-menu`'s own `max-height: 18rem` drew it at
      //: 288, and `top` was computed from the 410.8, so the menu opened at
      //: y=99 and its bottom landed 127.1px above the opener at y=514.1, with
      //: the gap covering the formatting toolbar and the note body. The
      //: owner's screenshot measures the same 127. Eight categories gave 91px
      //: of gap, ten 163, eleven 199: exactly `wants - drawn + 4` every time,
      //: which is the signature of placing a box by a height something else
      //: then takes away.
      top = anchor.top - 4 - box.height;
      menu.style.maxHeight = "none";
      menu.style.overflowY = "";
    } else {
      //: Taller than both sides: take the larger side and scroll inside it,
      //: with the cut row visible rather than sliced, which is the
      //: affordance. `--space-*` is not reachable from here, so the eight
      //: pixels are the same `margin` the placement already uses.
      const takeBelow = roomBelow >= roomAbove;
      const room = Math.max(120, takeBelow ? roomBelow : roomAbove);
      top = takeBelow ? anchor.bottom + 4 : margin;
      menu.style.maxHeight = `${Math.round(room)}px`;
      menu.style.overflowY = "auto";
    }
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    //: **Escaping a clipping ancestor can drop the menu below the surface it
    //: belongs to, and that is a second bug wearing the first one's clothes**
    //: (INBOX 239). `<body>` is a lower place to stand than some of the things
    //: this app draws: the escaped menu is `z-index: 1020` from the
    //: stylesheet, and a table block in full view is a fixed panel at 2400, so
    //: the ⋯ menu opened *inside* that panel drew underneath it. Measured on
    //: :8802: the menu's Back row at 1166,248 with `elementFromPoint` at its
    //: centre returning `DIV.md-table-wrap`, and a real click at that point
    //: leaving the panel open, which is the "no way to close it" report.
    //:
    //: The honest rule is the one this reparenting broke: a menu belongs above
    //: the surface it was opened from. So the opener's own positioned
    //: ancestors are read and the highest of them wins, once, at open time.
    //: Nothing is written when the stylesheet's own tier is already higher,
    //: which is every other caller in the app, so this is inert until a menu
    //: is opened inside a surface that outranks it.
    //: Cleared before it is read, or the second pass (a resize, the retry
    //: frame) measures the lift this one wrote and decides it is already high
    //: enough, which alternates between the two values on every resize.
    menu.style.zIndex = "";
    const ownZ = Number(getComputedStyle(menu).zIndex) || 0;
    let over = 0;
    for (let el = opener.parentElement; el && el !== document.body; el = el.parentElement) {
      const z = Number(getComputedStyle(el).zIndex);
      if (Number.isFinite(z) && z > over) over = z;
    }
    menu.style.zIndex = over >= ownZ ? String(over + 1) : "";
    //: Placed, so it may be seen (see the guard at the top of this
    //: function for what this is undoing).
    menu.style.visibility = "";
  };
  //: **A `<select>` inside a native `<dialog>` escapes to the dialog, not to
  //: `<body>`.** Reported directly, on the documents dictionary dialog's
  //: spelling picker: "the dictionary preferences dropdown appears behind
  //: the panel." A `showModal()` dialog paints in the browser's top layer,
  //: which is *always* above the regular document regardless of z-index;
  //: `<body>` is the regular document, so a menu reparented there is behind
  //: every open dialog by construction, not by any z-index this file could
  //: raise. The dialog element itself is still the top-layer root, so
  //: appending inside it keeps the menu in the same painting layer as its
  //: own opener.
  const escapeTarget = () => opener.closest("dialog[open]") || document.body;
  const observer = new MutationObserver(() => {
    // A menu shown as a phone's action sheet (`openKebabSheet`) is already
    // out of every clipping ancestor; escaping it would take it back out of
    // the sheet.
    if (menu._inSheet) return;
    const open = !menu.classList.contains("hidden");
    const target = escapeTarget();
    if (open && menu.parentElement !== target) {
      homeParent = menu.parentElement;
      homeNext = menu.nextSibling;
      //: **Moving a node takes the focus out of it**, and this runs after the
      //: open has already put the focus on the first row (`openActionMenu`,
      //: the select's chosen option): the observer is a microtask, so the
      //: move lands a tick later and the browser drops the focus to `body`.
      //: Measured by scratchpad/ui-sweeps/menus.js at 1440: every select in
      //: the app and every library kebab opened with `document.activeElement`
      //: on `body`, so ArrowDown did nothing and Escape gave the focus to
      //: nobody. Held across the move and handed back.
      const held = menu.contains(document.activeElement) ? document.activeElement : null;
      target.appendChild(menu);
      if (held && held.isConnected) held.focus({ preventScroll: true });
      menu.classList.add("action-menu-escaped");
      // openActionMenu() may have already set `.action-menu-flip` (`bottom:
      // calc(100% + 4px)`) based on the menu's *pre-escape* position. `place()`
      // below sets its own inline `top` to open up-or-down as needed, left
      // together, an element with both `top` and `bottom` pinned and
      // `height: auto` is over-constrained, and reproduced live as the menu's
      // box collapsing to ~15px (just its padding+border) while the buttons
      // still rendered past that line, which is what "background doesn't
      // fill the dropdown, looks transparent" actually was. `place()` makes
      // this class redundant once escaped, so drop it rather than fight it.
      menu.classList.remove("action-menu-flip");
      place();
    } else if (!open && menu.parentElement !== homeParent && homeParent) {
      // Restored on close, not left wherever it escaped to (`<body>` or an
      // open dialog): closeActionMenus() and any future openActionMenu()
      // call both expect to find this menu where it started, and a page
      // that never puts an escaped menu back accumulates stray
      // position:fixed nodes at the end of whichever element it escaped to.
      //: A menu closed with the focus still inside it (Escape handled by
      //: someone other than `wireMenuKeyboard`, a click on a row that opens
      //: nothing) would drop it to `body` on this move; the opener is where it
      //: belongs. Measured on every select: Escape left the focus on `body`.
      const held = menu.contains(document.activeElement);
      homeParent.insertBefore(menu, homeNext);
      if (held && opener.isConnected) opener.focus({ preventScroll: true });
      menu.classList.remove("action-menu-escaped");
      menu.style.left = "";
      menu.style.top = "";
      menu.style.visibility = "";
      // The height decisions are the escape's, not the menu's own: left
      // behind they would cap it in its home position too. The same goes for
      // the tier the escape may have lifted it to (INBOX 239).
      menu.style.maxHeight = "";
      menu.style.overflowY = "";
      menu.style.zIndex = "";
    }
  });
  observer.observe(menu, { attributes: true, attributeFilter: ["class"] });
  menu._escapedObserver = observer;
  //: **The re-place on resize is one listener for the whole app, not one per
  //: menu.** This used to be `window.addEventListener("resize", ...)` here,
  //: inside a function that runs once per `kebabMenu()`, which is once per
  //: card. The Library draws sixty cards and rebuilds them on every render,
  //: and `window` is never collected, so every one of those closures stayed
  //: alive holding its own `menu`, `opener` and `place`, and through them the
  //: whole detached card.
  //:
  //: Measured per round (`scratchpad` leak probe, 1440x900, eight rounds of
  //: the seven tabs on a four thousand note notebook, three forced GCs before
  //: each sample), because the question is whether it plateaus. Round one is
  //: one-time: it renders tabs that had never been drawn. A leak keeps
  //: climbing after that, and this did, dead straight:
  //:
  //:              round  1     2     3     4     5     6     7     8
  //:   listeners  3999  4719  5439  6159  6879  7599  8319  9039   (+720 each)
  //:   nodes      26767 28793 30820 32843 34868 36895 38920 40943  (+2025 each)
  //:
  //: with the document itself flat at 13,237 nodes throughout, so every one
  //: of those 2,025 nodes a round was detached and retained. 360 of the 370
  //: observers created and never disconnected came from this function too.
  //:
  //: After: 3,866 listeners and 26,768 nodes on every round from the first,
  //: flat. Heap growth over rounds two to eight went from +1.4 MB to +0.7 MB,
  //: and the `resize` registrations in a run from 657 to 104.
  //:
  //: The listener below is registered once and finds its work in the DOM, so
  //: it holds nothing: a menu that is gone is a menu the query does not
  //: return. `_placeEscaped` is on the element, so the closure lives exactly
  //: as long as the element does.
  menu._placeEscaped = place;
  wireEscapedMenuResize();
}

//: One `resize` listener for every escaped menu there will ever be. See
//: `wireEscapedActionMenu` for the measurement that made this necessary.
//:
//: It asks the document rather than holding a list: `closeActionMenus` can
//: remove a menu, a render can replace the card under it, and either would
//: leave a stale entry in a registry. `:not(.hidden)` because a closed menu
//: has nothing to place, and only an escaped one is positioned by this file
//: at all.
let escapedMenuResizeWired = false;
function wireEscapedMenuResize() {
  if (escapedMenuResizeWired) return;
  escapedMenuResizeWired = true;
  window.addEventListener(
    "resize",
    () => {
      for (const menu of document.querySelectorAll(".action-menu-escaped:not(.hidden)")) {
        menu._placeEscaped?.();
      }
    },
    { passive: true }
  );
}

// The Connections block (REDESIGN.md §R7.3 item 1), for a note or a document.
//
// `kind` is "entries" or "documents", the two API prefixes, used verbatim
// as the path segment rather than mapped through a lookup, because a third
// kind would need a third endpoint anyway and a two-entry map is a place for
// them to disagree.
//
// Direction is the whole point of the first two groups. `links_for_entry`
// has always returned both directions merged, so a note could show what it
// was connected to and never which way round, and "this note points at that
// one" and "that one points at this" are different facts. Everything else on
// this dialog is a join that existed in the database and was surfaced
// nowhere: the boards a note is a card on, and the uploads its markdown
// embeds.
async function openConnections(kind, id, subject) {
  const overlay = $("connections-overlay");
  const list = $("connections-list");
  const status = $("connections-status");
  status.classList.remove("error");
  status.textContent = "Loading…";
  list.replaceChildren();
  $("connections-subject").textContent = subject || "";
  overlay.classList.remove("hidden");
  $("connections-close").focus();

  let data;
  try {
    data = await apiJson(`/${kind}/${id}/connections`);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  status.textContent = "";

  // Each group is [heading, rows, how to open one]. Built as data rather
  // than five near-identical blocks of DOM code: the groups differ only in
  // their label field and their click target, and writing that out five
  // times is how one of them quietly loses its keyboard handling.
  const groups =
    kind === "entries"
      ? [
          ["ph:arrow-up-right This note links to", data.outgoing, noteRow],
          ["ph:arrow-down-left Notes that link here", data.incoming, noteRow],
          ["ph:file-text In these documents", data.documents, docRow],
          ["ph:squares-four On these boards and maps", data.boards, boardRow],
          ["ph:image Files it uses", data.files, fileRow],
        ]
      : [
          ["ph:note Notes attached", data.notes, noteRow],
          ["ph:bookmark-simple References", data.bookmarks, bookmarkRow],
          ["ph:image Files it uses", data.files, fileRow],
        ];

  function row(label, title, onOpen) {
    const item = smallButton(label, title, () => {
      overlay.classList.add("hidden");
      onOpen();
    });
    item.classList.add("connection-row");
    return item;
  }
  function noteRow(link) {
    // A private note contributes the fact of the connection and not its
    // words: the server sends "Private note" as the preview, and the flag
    // is what lets this say so rather than showing a label that reads like
    // a real (empty-looking) note title.
    const label = link.is_private ? "ph:lock Private note" : `ph:note ${link.preview}`;
    const why = link.reason ? `\nWhy: ${link.reason}` : "";
    return row(label, `Open this note${why}`, () => flashEntry(link.id));
  }
  function docRow(doc) {
    return row(`ph:file-text ${doc.title}`, `Open “${doc.title}”`, () =>
      openDocumentFromNote(doc.id)
    );
  }
  function boardRow(board) {
    // `kind` is "board" or "map" from the one reader the Referenced-by row
    // uses (INBOX 246): a map is a different surface and gets its own icon.
    const icon = board.kind === "map" ? "ph:tree-structure" : "ph:squares-four";
    return row(`${icon} ${board.title}`, `Open “${board.title}”`, () =>
      openWhiteboardBoard(board.id ?? null)
    );
  }
  function bookmarkRow(mark) {
    return row(`ph:bookmark-simple ${mark.title || mark.url}`, `Open ${mark.url}`, () =>
      window.open(mark.url, "_blank", "noopener,noreferrer")
    );
  }
  function fileRow(file) {
    const name = file.original_name || file.name;
    // `focusLibraryFile` (library.js) rather than the three steps this used
    // to take inline: the media view is two sub-tabs now, so which one to
    // click depends on whether the file is an image, and that decision
    // belongs in one place.
    return row(`ph:image ${name}`, `Find “${name}” in the Library`, () =>
      focusLibraryFile(name, file.url || file.name)
    );
  }

  let shown = 0;
  for (const [heading, rows, build] of groups) {
    if (!rows || !rows.length) continue;
    shown += rows.length;
    const section = document.createElement("div");
    section.className = "connection-group";
    const head = document.createElement("p");
    head.className = "muted connection-heading";
    setLabel(head, `${heading} (${rows.length})`);
    section.appendChild(head);
    const holder = document.createElement("div");
    holder.className = "connection-rows";
    for (const item of rows) holder.appendChild(build(item));
    section.appendChild(holder);
    list.appendChild(section);
  }
  if (!shown) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent =
      kind === "entries"
        ? "Nothing is joined to this note yet. Link it to another note, attach it to a document, or drop it on a whiteboard."
        : "Nothing is joined to this document yet. Attach a note or a reference to it.";
    list.appendChild(empty);
  }
}

$("connections-close")?.addEventListener("click", () =>
  $("connections-overlay").classList.add("hidden")
);

// The ⋯ overflow menu on each note card (Wave L rework).
// Everything that ever happened to one note, with a way back to any of it.
//
// The rows are the event log (Brief 7): every write through the managers
// records one event with an actor and the whole value of each field it set,
// so a row can say who changed the note, what it became, and put it back by
// replaying the log to that point. `revisions` is the older per-edit snapshot
// list, still written and still restorable, and it is what a note whose
// history predates the event log has instead of rows.
const HISTORY_ACTION_WORDS = {
  created: "Written",
  edited: "Edited",
  restored: "Restored",
  deleted: "Moved to the bin",
  archived: "Archived",
  unarchived: "Taken out of the archive",
  linked: "Linked",
  unlinked: "Unlinked",
  purged: "Deleted for good",
};

function historyActorLabel(actor) {
  // "ai:summarise" and "system:auto-file" carry the half worth reading after
  // the colon; "user" is everything a person did and needs no chip at all.
  if (!actor || actor === "user") return "";
  const [kind, rest] = [actor.slice(0, actor.indexOf(":")), actor.slice(actor.indexOf(":") + 1)];
  if (kind === "ai") return `AI: ${rest}`;
  if (kind === "system") return `Background: ${rest}`;
  return actor;
}

async function openEntryHistory(entry) {
  const overlay = $("history-overlay");
  const list = $("history-list");
  $("history-status").textContent = "";
  $("history-status").classList.remove("error");
  list.replaceChildren();
  overlay.classList.remove("hidden");
  $("history-close").focus();

  let history;
  try {
    history = await apiJson(`/entries/${entry.id}/history`);
  } catch (error) {
    $("history-status").classList.add("error");
    $("history-status").textContent = error.message;
    return;
  }
  const events = history?.items || [];
  const revisions = history?.revisions || [];
  if (!events.length && !revisions.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Nothing has happened to this note yet, so there's nothing to go back to.";
    list.appendChild(p);
    return;
  }

  const restoreTo = async (url, message) => {
    if (!(await confirmDialog("Replace the note with this version?\n\nThe current text is kept in the history, so this is undoable."))) return;
    try {
      await apiJson(url, { method: "POST" });
      overlay.classList.add("hidden");
      toast(message);
      await loadEntries();
      flashEntry(entry.id);
    } catch (error) {
      $("history-status").classList.add("error");
      $("history-status").textContent = error.message;
    }
  };

  // The current text first, so you can see what you'd be replacing.
  const current = document.createElement("div");
  current.className = "history-entry history-current";
  const currentHead = document.createElement("p");
  currentHead.className = "muted";
  currentHead.textContent = "Now";
  const currentBody = document.createElement("p");
  currentBody.textContent = notePreviewText(entry.content);
  current.append(currentHead, currentBody);
  list.appendChild(current);

  // The row every event renders as. A function rather than a loop body
  // because a second page of events is rendered by the same code, below.
  const eventRow = (item) => {
    const row = document.createElement("div");
    row.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `${HISTORY_ACTION_WORDS[item.action] || item.action} ${relativeTime(item.created_at)}`;
    const actor = historyActorLabel(item.actor);
    if (actor) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = actor;
      head.append(" ", chip);
    }
    row.appendChild(head);
    if (item.compacted) {
      // The event is still a fact, its text is not kept: `events.compact`
      // drops the values behind changes older than the history window so the
      // log stops growing by a copy of the note on every edit. Saying that in
      // the row is the difference between a history with a gap and a history
      // that looks broken.
      const gone = document.createElement("p");
      gone.className = "muted";
      gone.textContent = "The text from this change is no longer kept.";
      row.appendChild(gone);
    } else if (item.content) {
      const body = document.createElement("p");
      body.textContent = notePreviewText(item.content);
      row.appendChild(body);
      // Only a version that differs from what is on screen is worth putting
      // back: offering "restore" on the state the note is already in reads as
      // a broken button rather than a safe one.
      if (item.content !== entry.content) {
        row.appendChild(
          smallButton("ph:arrow-u-up-left Put this back", "Restore this version", () =>
            restoreTo(`/entries/${entry.id}/restore/${item.id}`, "Earlier version restored.")
          )
        );
      }
    }
    return row;
  };

  // **Paging, and saying what is on screen.** `GET /entries/{id}/history`
  // returns at most `HISTORY_PAGE` (fifty) events and a `next_cursor` for
  // what is older than the oldest of them. This sheet used to read the first
  // page and drop the cursor, so a note edited more than fifty times showed
  // its newest fifty and looked like the whole history: silent truncation,
  // which is worse than a short list, because nothing on screen says the
  // rest exists and a version that is still there reads as lost. The row
  // below is both halves of the fix: it counts what is shown and it fetches
  // the next page.
  let shown = 0;
  let paged = false;  // whether "load older" has been pressed at least once
  let cursor = history?.next_cursor || null;

  // The control sits at the bottom of the events and stays there: the pages
  // that follow are inserted above it, so the list stays in newest-first
  // order however many times it is pressed.
  const more = document.createElement("div");
  more.className = "history-entry";

  const addEvents = (items) => {
    for (const item of items) {
      list.insertBefore(eventRow(item), more);
      shown += 1;
    }
  };

  const loadOlder = async () => {
    if (!cursor) return;
    const at = cursor;
    cursor = null;  // so a second press while this one is in flight is a no-op
    renderMore(true);
    let page;
    try {
      page = await apiJson(`/entries/${entry.id}/history?before=${at}`);
    } catch (error) {
      cursor = at;
      renderMore();
      $("history-status").classList.add("error");
      $("history-status").textContent = error.message;
      return;
    }
    addEvents(page?.items || []);
    paged = true;
    cursor = page?.next_cursor || null;
    renderMore();
  };

  const renderMore = (loading = false) => {
    more.replaceChildren();
    // A history that fits in one page says nothing extra: the row exists to
    // answer "is this all of it?", and on a note with a dozen changes the
    // list already answers that by ending.
    more.classList.toggle("hidden", !cursor && !loading && !paged);
    const note = document.createElement("p");
    note.className = "muted";
    if (cursor || loading) {
      // Plain about what it is: the count is what is on screen, not a
      // guess at the total, which the route does not send and which
      // counting would cost a second query to know.
      note.textContent = `Showing the ${shown} most recent changes to this note.`;
    } else if (paged) {
      note.textContent = `That is all ${shown} changes to this note.`;
    }
    more.appendChild(note);
    if (cursor) {
      more.appendChild(
        smallButton("ph:clock-counter-clockwise Load older changes", "Load the next page of this note's history", loadOlder)
      );
    } else if (loading) {
      const wait = document.createElement("p");
      wait.className = "muted";
      wait.textContent = "Loading older changes.";
      more.appendChild(wait);
    }
  };

  list.appendChild(more);
  addEvents(events);
  renderMore();

  // The snapshots are the same versions the events already show, one row
  // earlier, so they are only worth rendering for a note whose edits predate
  // the event log: measured on a note edited twice, both lists said "version
  // one of the note" and the sheet showed it twice.
  const snapshotsOnly = !events.some((item) => item.content);
  for (const revision of snapshotsOnly ? revisions : []) {
    const item = document.createElement("div");
    item.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `Before ${new Date(revision.created_at).toLocaleString()}`;
    const body = document.createElement("p");
    body.textContent = notePreviewText(revision.content);
    const restore = smallButton("ph:arrow-u-up-left Put this back", "Restore this version", () =>
      restoreTo(`/entries/${entry.id}/history/${revision.id}/restore`, "Earlier version restored.")
    );
    item.append(head, body, restore);
    list.appendChild(item);
  }
}

async function toggleEntryPrivacy(entry) {
  const makingPrivate = !entry.is_private;
  if (makingPrivate) {
    const ok = (await confirmDialog(
      "Make this note private?\n\n" +
        "It gets encrypted with a key derived from your password, so it stays " +
        "unreadable in the database, in backups, and to anyone without that " +
        "password.\n\n" +
        "It also stops appearing in search and stops being given to Atlas.\n\n" +
        "There is no recovery: if you forget your password this note is gone."
    ));
    if (!ok) return;
  }
  // Both directions need the key, which a session without a password lacks.
  if (!(await ensureVaultOpen())) return;
  try {
    await apiJson(`/entries/${entry.id}/privacy`, {
      method: "POST",
      body: JSON.stringify({ private: makingPrivate }),
    });
    toast(makingPrivate ? "Note encrypted." : "Note is readable again.");
    await loadEntries();
  } catch (error) {
    toast(error.message, true);
  }
}

// Reported: no popup shows when a title is regenerated.
//
// There WAS a toast, and it was being swallowed. `toast()` drops anything
// that is not an error while notifications are muted, which is right for
// background chatter and wrong here: this is the result of a button the user
// just pressed, and a direct action that reports nothing reads as a broken
// button. Muting is about noise you did not ask for.
//
// The "Generating…" toast is also worth keeping distinct from the settled one:
// this call waits on the model, so it can take seconds, and a control that
// looks inert for seconds gets pressed again.
async function generateEntryTitle(entry) {
  const regenerating = Boolean(entry.title);
  try {
    toast(regenerating ? "Regenerating the title…" : "Generating a title…", false, {
      exempt: true,
    });
    const updated = await apiJson(`/entries/${entry.id}/generate-title`, { method: "POST" });
    await loadEntries();
    flashEntry(entry.id);
    const title = updated && updated.title;
    toast(title ? `Titled “${title}”.` : "Titled.", false, { exempt: true });
    // And in the notification centre, so the result survives the 5.5 seconds
    // the toast lives for, the model can finish while you are on another tab.
    recordNotification({
      kind: "task",
      title: regenerating ? "Title regenerated" : "Title generated",
      detail: title ? `“${title}”` : `Note #${entry.id}`,
    });
  } catch (error) {
    toast(error.message || "Couldn't generate a title.", true);
  }
}

async function removeEntryTitle(entry) {
  try {
    await apiJson(`/entries/${entry.id}/remove-title`, { method: "POST" });
    await loadEntries();
    flashEntry(entry.id);
    // Said out loud for the same reason as above: it was silent, so the only
    // feedback was noticing the title had gone.
    toast("Title removed.", false, { exempt: true });
  } catch (error) {
    toast(error.message || "Couldn't remove the title.", true);
  }
}

// Arrow-key navigation, as the `role="menu"` contract implies. ↑/↓ move
// between *top-level* items (wrapping): `:scope >` so a hidden submenu's own
// items (handled by their own keydown handler) never get mixed into this list,
// which would desync Home/End and let arrow keys land on an item the user
// can't currently see. Home/End jump to the ends, Esc closes and returns focus
// to the opener.
//
// **Shared, because it used to belong to one menu.** This was written inline
// inside `entryOverflowMenu`, so the note card's ⋯ had full keyboard
// navigation and every menu built by `kebabMenu`, the conversation list, the
// sidebar kebabs, and now the text-selection menu, had none: Tab still
// stepped through the items (they are buttons), but ↑/↓ did nothing, which is
// the one thing a person who has just opened a menu will try. Found by
// driving the new selection menu from the keyboard and watching ArrowDown
// leave focus where it was.
function wireMenuKeyboard(menu, opener) {
  //: Read by the delegated walker for markup menus (search `menuRowsOf`),
  //: which leaves a menu wired here alone.
  menu.dataset.menuKeys = "1";
  menu.addEventListener("keydown", (event) => {
    const menuItems = [
      ...menu.querySelectorAll(
        //: `role="option"` too: an enhanced select's listbox is wired here, and
        //: with menuitems alone its arrow keys found nothing and returned,
        //: which left every select in the app without ArrowDown (and without
        //: this Escape, so inside Settings the Escape went on to close the
        //: whole Settings window and left the list floating over the page).
        ':scope > [role="option"], ' +
        ':scope > [role="menuitem"], :scope > .menu-group > [role="menuitem"], ' +
        //: `role="group"` as well as `.menu-group`, so a menu written in
        //: markup can use the wrapper ARIA actually names. `kebabMenu` builds
        //: its own groups as `.menu-group` divs with no role, and the board's
        //: five top-bar menus are sections in index.html that become
        //: `role="group"` at boot (`wbStampMenuRoles` in whiteboard.js): with
        //: only the class in this list, ArrowDown in those five found no items
        //: at all and left the focus where it was, which is the one thing a
        //: person who has just opened a menu will try.
        ':scope > [role="group"] > [role="menuitem"]'
      ),
    ]
      //: An item nobody can see is not one the arrows may land on. It never
      //: came up while every menu here was built by `kebabMenu`, which draws
      //: only the items it was given; the board's View menu keeps two map rows
      //: `hidden` on an ordinary whiteboard, and walking onto one of those
      //: calls `focus()` on an element that cannot take it, which leaves the
      //: focus where it was and reads as "the arrow keys do nothing".
      .filter((item) => !item.hidden && item.offsetParent !== null);
    if (!menuItems.length) return;
    const current = menuItems.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusMenuItem(menuItems[(current + 1) % menuItems.length], menu);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusMenuItem(menuItems[(current - 1 + menuItems.length) % menuItems.length], menu);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusMenuItem(menuItems[0], menu);
    } else if (event.key === "End") {
      event.preventDefault();
      focusMenuItem(menuItems[menuItems.length - 1], menu);
    } else if (event.key === "Escape") {
      event.preventDefault();
      //: The menu owns this Escape: without the stop, the document's own
      //: Escape handler goes on to close whatever the menu is inside (the
      //: Settings window, a sheet), one key doing two things.
      event.stopPropagation();
      closeActionMenus();
      opener.focus();
    }
  });
}

// A single `role="menuitem"` button: shared by the top-level menu and every
// submenu, so a click behaves identically (close everything, then run) no
// matter how deep the item is nested.
function buildMenuItemButton(item) {
  const button = document.createElement("button");
  button.setAttribute("role", "menuitem");
  button.className = "menu-item" + (item.danger ? " menu-danger" : "");
  setLabel(button, item.label);
  if (item.title) button.title = item.title;
  button.addEventListener("click", () => {
    closeActionMenus();
    item.run();
  });
  return button;
}

// At most one grouped flyout (AI actions / Connect / Add) is ever open at
// once, on any note card: `openActionMenu` already guarantees at most one
// top-level kebab is open on the page, and only one of its own groups can
// be expanded at a time. A single reference here is enough to close a
// sibling group's flyout when another opens, without a DOM search that
// escaping the flyout to `<body>` below has already made impossible (see
// `buildMenuGroupButton`'s own note).
let openGroupSubmenu = null;

// A grouped trigger ("AI AI actions ›") that opens a side flyout of its own
// items: asked for directly, to cut a 15-item flat list down to something
// scannable. Hover opens it on a device that has hover; click/tap opens it
// everywhere, which is the only way in on a touchscreen. Below
// `--menu-submenu-stack-width` (phone-width) there is nowhere for a flyout
// to go without running off-screen, so it drops the side-popup positioning
// entirely and expands in place instead, an accordion, not a flyout, which
// is what "compatible with small screens like iPhones" actually means here.
function buildMenuGroupButton(label, subItems) {
  let openedByHoverAt = 0;
  const groupWrap = document.createElement("div");
  groupWrap.className = "menu-group";

  const trigger = document.createElement("button");
  trigger.setAttribute("role", "menuitem");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.className = "menu-item has-submenu";
  const labelSpan = document.createElement("span");
  // setLabel, not textContent: these three group triggers ("AI actions",
  // "Connect", "Add") were the one label sink the sweep missed, so the note
  // kebab menu rendered the literal text "ph:magic-wand AI actions".
  setLabel(labelSpan, label);
  const arrow = document.createElement("span");
  arrow.className = "menu-submenu-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "›";
  trigger.append(labelSpan, arrow);

  const submenu = document.createElement("div");
  submenu.className = "action-menu submenu hidden";
  submenu.setAttribute("role", "menu");
  //: **An entry may be a button that already exists**, not only a descriptor
  //: to build one from. The document editor's ⋯ is static markup whose rows
  //: carry ids that `documents.js` binds handlers to (`doc-export-md` and
  //: four more), so folding them into a group has to *move* those buttons
  //: rather than rebuild them: a rebuilt row is a row with no handler and an
  //: id that two lints watch. Everything else about the group is identical,
  //: which is the point of reusing this recipe rather than writing a second
  //: flyout for one menu.
  for (const item of subItems) {
    submenu.appendChild(item instanceof HTMLElement ? item : buildMenuItemButton(item));
  }

  // **Reparented to `<body>` while open, like `escapeMenuIfClipped` does for
  // the top-level kebab.** Reported: a submenu opened from a kebab near the
  // bottom or right of the viewport (a note card low in the list, or the
  // last card in a row) drew past the window edge with nothing but a
  // scrollbar to show for it. `.action-menu.submenu` was `position:
  // absolute` against its own `.menu-group`, which only ever checked the
  // *horizontal* edge (`submenu-left`, below); there was no vertical check
  // at all, and once the parent kebab is itself escaped (also `position:
  // fixed`, also reparented to `<body>`) the submenu's containing block
  // moves with it, so a flyout that fit its note card could still miss the
  // actual browser window. Reusing `.action-menu-escaped` (`position:
  // fixed`, the same z-index tier) plus this menu's own placement, computed
  // from the trigger's rect and clamped on both axes, fixes both at once:
  // this is why `openSubmenu`/`closeSubmenuState` below write the same
  // `_escapedHome`/`_escapedOpener` fields `restoreEscapedMenu` already
  // knows how to put back, rather than inventing a second bookkeeping
  // scheme `closeActionMenus`' own document-wide sweep would not see.
  const placeSubmenu = () => {
    const margin = 8;
    const anchor = trigger.getBoundingClientRect();
    submenu.style.marginLeft = "0";
    submenu.style.left = "0px";
    submenu.style.top = "0px";
    const box = submenu.getBoundingClientRect();
    let left = anchor.right + 8;
    let onLeft = false;
    if (left + box.width > window.innerWidth - margin) {
      left = anchor.left - 8 - box.width;
      onLeft = true;
    }
    left = Math.max(margin, left);
    let top = anchor.top;
    if (top + box.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - margin - box.height);
    }
    submenu.style.left = `${Math.round(left)}px`;
    submenu.style.top = `${Math.round(top)}px`;
    submenu.classList.toggle("submenu-left", onLeft);
  };

  const openSubmenu = () => {
    // Only one flyout open at a time, at this level or any sibling group;
    // a DOM search under `groupWrap.parentElement` cannot find a sibling's
    // flyout once it may live at `<body>`, so this is tracked directly.
    if (openGroupSubmenu && openGroupSubmenu !== submenu) closeSubmenuState(openGroupSubmenu);
    submenu.classList.remove("hidden");
    trigger.setAttribute("aria-expanded", "true");
    submenu.classList.remove("submenu-left");
    // Below phone-width the flyout positioning is dropped for an in-place
    // accordion (CSS media query); escaping it there would strand it at a
    // fixed viewport position while its own trigger scrolls underneath.
    if (window.innerWidth > 720) {
      submenu._escapedHome = { parent: submenu.parentElement, next: submenu.nextSibling };
      submenu._escapedOpener = trigger;
      document.body.appendChild(submenu);
      submenu.classList.add("action-menu-escaped");
      placeSubmenu();
    }
    openGroupSubmenu = submenu;
  };
  function closeSubmenuState(target) {
    target.classList.add("hidden");
    target._escapedOpener?.setAttribute("aria-expanded", "false");
    restoreEscapedMenu(target);
    target.style.marginLeft = "";
    target.classList.remove("submenu-left");
    if (openGroupSubmenu === target) openGroupSubmenu = null;
  }
  const closeSubmenu = () => closeSubmenuState(submenu);

  let hoverTimer = null;
  groupWrap.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      openSubmenu();
      openedByHoverAt = Date.now();
    }, 120); // brief delay: a mouse crossing the item isn't a request to open it
  });
  groupWrap.addEventListener("mouseleave", () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(closeSubmenu, 200); // outlives the diagonal move from the trigger into the flyout
  });
  // Once escaped, the submenu is a sibling of `groupWrap` at `<body>`, not
  // its descendant, so `groupWrap`'s own `mouseleave` above fires the
  // instant the pointer crosses onto the (still open) flyout: measured
  // live, the submenu closed under the cursor before a hovering mouse user
  // could ever reach a second-level item. These two mirror the pair above
  // so hovering the flyout itself also keeps it open.
  submenu.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
  submenu.addEventListener("mouseleave", () => {
    hoverTimer = setTimeout(closeSubmenu, 200);
  });
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    //: A click that lands just after the hover opened the flyout is the same
    //: request, not a second one: toggling there closed what the person had
    //: just reached for (measured on the map node menu).
    if (submenu.classList.contains("hidden")) openSubmenu();
    else if (Date.now() - openedByHoverAt > 600) closeSubmenu();
  });
  submenu.addEventListener("keydown", (event) => {
    const subItems = [...submenu.querySelectorAll(':scope > [role="menuitem"]')];
    const current = subItems.indexOf(document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      subItems[(current + 1) % subItems.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      subItems[(current - 1 + subItems.length) % subItems.length]?.focus();
    } else if (event.key === "ArrowLeft" || event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // don't also close the whole menu on ArrowLeft
      closeSubmenu();
      trigger.focus();
    }
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSubmenu();
      submenu.querySelector('[role="menuitem"]')?.focus();
    }
  });

  groupWrap.append(trigger, submenu);
  return groupWrap;
}

function entryOverflowMenu(entry) {
  const wrap = document.createElement("span");
  wrap.className = "menu-wrap";

  const menu = document.createElement("div");
  menu.className = "action-menu hidden";
  menu.setAttribute("role", "menu");

  //: Same square-kebab rule as `kebabMenu` below: this is the *other* ⋯
  //: builder (note cards, built lazily on first open), and a rule applied to
  //: one of two implementations of the same control is how they drift.
  //:
  //: **And they had.** Reported: "the ellipse kebab icons in the notes on the
  //: your notes tab are not centred." `kebabMenu` draws `ph:dots-three`; this
  //: one drew the literal character `⋯` (U+22EF), and a text glyph is placed
  //: on the *font's* baseline inside a 19.2px line box centred in a 28px
  //: button: U+22EF sits at the em box's midline, which is above the line
  //: box's optical centre, so the dots rode high. No amount of flex centring
  //: fixes that: the box is centred correctly and the glyph is not centred
  //: within the box. The icon font's own glyph is drawn to fill its box, so
  //: using the same icon as the other builder fixes the centring and the
  //: drift in one go.
  const opener = smallButton("ph:dots-three", "More actions", () => {
    // The phone's action sheet, as `kebabMenu` opens (`openKebabSheet`).
    if (window.matchMedia(PHONE_ACTION_SHEET).matches && typeof openSheet === "function") {
      fillMenu();
      openKebabSheet(menu, opener, "Note actions");
      return;
    }
    const willOpen = menu.classList.contains("hidden");
    if (willOpen) {
      fillMenu();
      openActionMenu(menu, opener);
    } else closeActionMenus();
  });
  opener.classList.add("icon-only");
  opener.setAttribute("aria-haspopup", "menu");
  opener.setAttribute("aria-expanded", "false");

  // **Built on first open, not on render, and that is a scale fix rather than
  // a micro-optimisation.** This menu is 19 items across four groups, call it
  // 45-60 DOM nodes once the submenu wrappers, icon `<i>`s and label `<span>`s
  // are counted: and `entryItem()` builds one of these for *every* note card.
  // The Notes list renders the whole notebook (there is no windowing), so a
  // 2,500-note notebook built well over a hundred thousand permanently-hidden
  // nodes, and rebuilt all of them on every `renderEntries()`, which runs on
  // every search keystroke, every sort change, every filter and every save.
  //
  // Almost none of it is ever looked at: a person opens the ⋯ menu on one note
  // at a time, if at all. Deferring the items costs one function call on the
  // first open and nothing after.
  //
  // The opener itself still renders eagerly, deliberately, it carries the
  // `aria-haspopup`/`aria-expanded` state and it occupies a place in the tab
  // order, so making *it* lazy would change focus behaviour. Only the contents
  // are deferred, and `openActionMenu` is called after `fillMenu()` so it still
  // finds a first item to focus.
  let filled = false;
  function fillMenu() {
    if (filled) return;
    filled = true;
    // Kept flat: the three actions used often enough, or serious enough (a
    // delete), that burying them a level down would cost more than the
    // grouping below saves. Everything else groups into three side flyouts, 
    // asked for directly, to cut what had grown into a 15-item flat list.
    const topLevel = [
      // Direct instruction: a way into multi-select from the row itself,
      // not only the toolbar's own "Select" button: which is real and
      // already works, but requires knowing it exists and is above the
      // list rather than on the note someone actually wants to start
      // selecting from. Reuses that exact same mode (`enterSelectMode`,
      // `selectedIds`) rather than inventing a second one, and seeds it
      // with this note already checked, so choosing "Select" here is a
      // head start rather than an empty selection identical to the
      // toolbar button's own.
      {
        label: "ph:check-square Select",
        title: "Start selecting multiple notes, beginning with this one",
        run: () => {
          enterSelectMode();
          selectedIds.add(entry.id);
          updateBatchCount();
          renderEntries();
        },
      },
      {
        label: entry.is_private ? "ph:lock-open Make readable" : "ph:lock Make private",
        title: entry.is_private
          ? "Decrypt this note so search and Atlas can use it again"
          : "Encrypt this note at rest, and keep it out of search and Atlas",
        run: () => toggleEntryPrivacy(entry),
      },
      {
        // Sits above History because it is the more common question by far:
        // "what else is this about?" is asked of a note every time it is
        // read, and "what did it used to say?" only when something looks
        // wrong.
        label: "ph:graph Connections",
        title: "Everything this note is joined to, links both ways, documents, boards and files",
        // The note's own title when it wrote one, and its first words
        // otherwise: `notePreviewText` alone hands back both lines of a
        // titled note ("Probe A\nrelates to sourdough"), which reads as
        // two sentences jammed together on one line of the dialog.
        run: () =>
          openConnections(
            "entries",
            entry.id,
            entry.title || clipText(notePreviewText(entry.content).split("\n")[0], 80)
          ),
      },
      {
        label: "ph:clock-counter-clockwise History",
        title: "See earlier versions of this note, and put one back",
        run: () => openEntryHistory(entry),
      },
      // BACKLOG.md §95 item D.14: "Full export exists. There is no way to
      // hand one note to someone." Same route shape and same "download,
      // not navigate" pattern the Documents kebab's own "Download .md"
      // already uses (library.js).
      {
        label: "ph:download-simple Download .md",
        title: "Save a copy of this note as a markdown file",
        run: () => downloadFromApi(`/entries/${entry.id}/export.md`, "note.md"),
      },
    ];

    const aiItems = [
      {
        //: **Named for what it does, not for what it is called internally**
        //: (INBOX 292, the owner: "i feel like it is more than just
        //: re-evaluating, and it is hidden away"). The route re-files the
        //: note, refreshing its confidence and its category unless the person
        //: filed it themselves, *and* suggests tags and links for them to
        //: apply. "Re-evaluate" named the smallest part of that, and tags,
        //: the part it is actually reached for, were not in the name at all.
        label: "ph:sparkle Tag and file with Atlas",
        title: "Atlas re-reads the note, suggests tags and links, and may refile it",
        run: () => reevaluateEntry(entry),
      },
      {
        label: "ph:magic-wand Improve writing",
        title: "Proofread or rewrite this note with AI",
        run: () => {
          editingId = entry.id;
          renderEntries();
          // The edit textarea now exists, improve it in place.
          const box = document.querySelector(`#entry-list li[data-id="${entry.id}"] textarea`);
          if (box) openImprove(box);
        },
      },
      {
        // Recognising a title the note already wrote (a leading `# Heading`)
        // is free; writing one costs a real model call, so it's this
        // separate, on-request action rather than something automatic.
        label: entry.title ? "ph:magic-wand Regenerate title" : "ph:magic-wand Generate title",
        title: "Write a short title for this note with AI",
        run: () => generateEntryTitle(entry),
      },
      ...(entry.title
        ? [
            {
              label: "ph:x Remove title",
              title: "Take the title back out, the note's text is unchanged",
              run: () => removeEntryTitle(entry),
            },
          ]
        : []),
    ];

    const connectItems = [
      {
        label: "ph:file-text Add to a document",
        title: "Attach this note to a document you have already started",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "document")
            ? null
            : { id: entry.id, kind: "document" };
          renderEntries();
        },
      },
      {
        //: INBOX 246's first sentence. Next to "Add to a document" because
        //: it is the same act on the other kind of surface, and the note
        //: stays exactly where it is either way.
        label: "ph:squares-four Add to a board or map",
        title: "Put this note on a whiteboard or a mind map",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "board")
            ? null
            : { id: entry.id, kind: "board" };
          renderEntries();
        },
      },
      {
        label: "ph:file-text Expand into a document",
        title: "Start a document from this note, the note stays where it is",
        run: () => expandNoteIntoDocument(entry),
      },
      { label: "ph:link Link to another", run: () => beginOrCompleteLink(entry) },
      { label: "ph:approximate-equals Similar notes", run: () => toggleRelated(entry) },
      {
        label: "ph:arrow-u-up-left Referenced by",
        title: "Documents, notes, boards and maps that point at this note",
        run: () => toggleReferences(entry),
      },
      {
        label: "ph:hourglass-medium Forgotten notes like this",
        title: "Notes you have not looked at in a long time that are close to this one",
        run: () => toggleFaded(entry),
      },
      //: **The note's two other homes, one press away** (INBOX 393: "there
      //: needs to be more integration between all the main features"). The
      //: menu could put a note on a board, in a document and in a reminder,
      //: and could not take it to the graph that draws it or to the chat that
      //: answers about it.
      {
        label: "ph:graph Show in graph",
        title: "Open the graph centred on this note, its links lit",
        run: () => showNoteInGraph(entry.id),
      },
      {
        label: "ph:chat-circle Ask Atlas about this note",
        title: "Start a chat about this note and what it connects to",
        run: () => askAtlasAboutNote(entry),
      },
      {
        label: "ph:translate Translate",
        title: "Open this note in Write with Atlas, set to translate",
        run: () => translateNoteInDesk(entry),
      },
    ];

    const addItems = [
      {
        label: "ph:copy Duplicate",
        title: "Make a copy of this note, opens ready to edit",
        run: async () => {
          closeActionMenus();
          try {
            const copy = await apiJson("/entries", {
              method: "POST",
              body: JSON.stringify({
                content: entry.content,
                title: entry.title ? `${entry.title} (Copy)` : undefined,
                category: entry.category,
                tags: entry.tags || [],
              }),
            });
            await loadEntries();
            // Open the new note in edit mode straight away.
            if (copy && copy.id) {
              editingId = copy.id;
              renderEntries();
              flashEntry(copy.id);
            }
            toast("Note duplicated.");
          } catch (err) {
            toast(err.message || "Couldn't duplicate note.", true);
          }
        },
      },
      {
        label: "ph:plus Add context",
        title: "Append detail: Atlas may refile it",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "context") ? null : { id: entry.id, kind: "context" };
          renderEntries();
        },
      },
      {
        label: "ph:arrow-bend-down-right Continue thought",
        title: "Start or extend a thread from this note",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "continue") ? null : { id: entry.id, kind: "continue" };
          renderEntries();
        },
      },
      {
        label: "ph:alarm Remind me",
        run: () => {
          inlineAction = inlineActionIs(entry.id, "remind") ? null : { id: entry.id, kind: "remind" };
          renderEntries();
        },
      },
      { label: "ph:paperclip Attach a file", run: () => attachFileTo(entry) },
      { label: "ph:images-square Attach from Library", run: () => attachFromLibrary(entry) },
    ];

    // Not destructive, so not grouped with "danger" below: but visually
    // adjacent to it (asked for directly: a way to keep a note but get it
    // out of the way, distinct from binning it) so the two "get this off my
    // list" actions sit together rather than one being buried in a group.
    const archive = entry.archived_at
      ? {
          label: "ph:arrow-u-up-left Unarchive",
          title: "Bring this note back into your notebook",
          run: async () => {
            await apiJson(`/entries/${entry.id}/unarchive`, { method: "POST" });
            await loadEntries();
            toast("Unarchived.");
          },
        }
      : {
          label: "ph:archive Archive",
          title: "Keep it, but out of the way, not the bin",
          run: async () => {
            await apiJson(`/entries/${entry.id}/archive`, { method: "POST" });
            await loadEntries();
            toast("Archived.");
          },
        };

    const danger = {
      label: "ph:trash Move to bin",
      danger: true,
      run: () => binNoteWithUndo(entry),
    };

    //: Three groups, broken by the same hairline `kebabMenu` draws for a
    //: grouped menu (DESIGN.md: past five rows a menu is grouped): what you
    //: do to this note, the three families that open further, and the two
    //: that put it away. Ten rows read as one list before this (menus.js).
    const rule = () => {
      const sep = document.createElement("div");
      sep.className = "menu-sep";
      sep.setAttribute("role", "separator");
      return sep;
    };
    for (const item of topLevel) menu.appendChild(buildMenuItemButton(item));
    menu.appendChild(rule());
    menu.appendChild(buildMenuGroupButton("ph:magic-wand AI actions", aiItems));
    menu.appendChild(buildMenuGroupButton("ph:link Connect", connectItems));
    menu.appendChild(buildMenuGroupButton("ph:plus Add", addItems));
    menu.appendChild(rule());
    menu.appendChild(buildMenuItemButton(archive));
    menu.appendChild(buildMenuItemButton(danger));
  }

  wireMenuKeyboard(menu, opener);

  wrap.append(opener, menu);
  return wrap;
}
