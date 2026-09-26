// settings-panes.js: autogrow, account, web search, backups, document import,
// the catalogue's deep links. Moved out of app.js on 2026-09-26 as one
// contiguous range (INBOX 426 cc, docs/roadmap/agent-remaining/appjs-split.md).
// A classic script sharing app.js's globals, loaded in app.js's old order;
// nothing in an earlier file calls into it while the page loads
// (scratchpad/appjs-map.js --check).

// --- textareas that grow with what you type -----------------------------------
// A fixed-height box for "capture a thought" or "magic add" hides everything
// but the last couple of lines the moment a note runs long, which is exactly
// when you most want to see it (user request). Height follows content, up to a
// cap so the page never gets pushed around; past that it scrolls.
// 480, not 340: "about a third of the screen" (asked for) is the 0.35 cap
// below on any window under ~1370px tall; 340 undercut it on a 1080p display.
const AUTOGROW_MAX_PX = 480;

// How much of the window a growing box may take before it scrolls instead.
//
// A flat 340px is most of a laptop window's chat area and nearly all of a
// phone's: the box kept growing and the conversation it was about disappeared
// above it. The cap is the *smaller* of the two, so a tall screen keeps the
// familiar 340 and a short one keeps its conversation.
const AUTOGROW_MAX_VIEWPORT = 0.35;
//: The most of the window a hand-dragged composer may take (INBOX 111).
const COMPOSER_DRAG_MAX_VIEWPORT = 0.7;

//: Where a hand-dragged composer height is remembered. A preference about how
//: you write, so it outlives the session that set it.
const COMPOSER_HEIGHT_KEY = "chat-composer-height";

function autoGrowLimit(el) {
  // A height the user dragged to wins over both defaults, they have said, in
  // the most direct way an interface allows, how tall they want this box.
  const chosen = Number(el.dataset.maxPx || 0);
  if (chosen > 0) return chosen;
  return Math.min(AUTOGROW_MAX_PX, Math.round(window.innerHeight * AUTOGROW_MAX_VIEWPORT));
}

function autoGrow(el) {
  if (!el) return;
  //: **A note editor's mirror is not a box anyone sees** (INBOX 424i). Once
  //: the capture box's editor has mounted, the textarea is laid over it at
  //: zero opacity and sized by the stylesheet to the editor's own box
  //: (`.note-surface > textarea.note-surface-mirror`); the editor is what
  //: grows. Every keystroke mirrors the text into it with an `input` event,
  //: and this function then paid a forced layout per keystroke (the
  //: `offsetParent` read below, then the measure) to size a box that is not
  //: drawn: measured at 4x CPU, 448ms of a 50-character typing run. A class
  //: check reads no layout.
  if (el.classList.contains("note-surface-mirror")) return;
  // **A hidden textarea reports scrollHeight 0, and sizing to that collapses
  // it.** This is the reported "the capture box is short at the bottom and
  // only opens up when I click in it": the box was measured while its section
  // was display:none, sized to nothing, and the first `focus` re-ran this with
  // the box finally on screen, which looked like clicking made it grow.
  //
  // One caller already re-measured after a sub-tab switch, which fixed that
  // one route in. It did not fix arriving from another TAB with Capture
  // already the remembered section, and it never could, the bug is that a
  // measurement taken while invisible is meaningless, and the right place to
  // say so is here, once, rather than at every call site that might run early.
  //
  // `offsetParent` is null for a display:none element and for any element
  // inside one, which is exactly the condition. (It is also null for
  // position:fixed elements: none of the app's autogrow boxes are fixed, and
  // the cost of being wrong would be one un-resized box, not a collapsed one.)
  if (el.offsetParent === null) {
    // Marked so the box gets its size the moment it becomes visible, instead
    // of waiting for a focus that may never come.
    el.dataset.autogrowPending = "1";
    return;
  }
  delete el.dataset.autogrowPending;
  if (el.dataset.resizing) return; // a grabber drag is in progress; it wins
  // Reset first: without it the height only ever ratchets upwards, because
  // scrollHeight is measured against the height already set.
  el.style.height = "auto";
  const limit = autoGrowLimit(el);
  // **A height somebody dragged to is a floor, not just a ceiling.** Driven in
  // a browser: dragging the composer taller stored the new height and then
  // snapped the box straight back to one line, because this took
  // `min(scrollHeight, limit)` and an empty box has a scrollHeight of one row.
  // The setting was saved and instantly undone, which is worse than not
  // offering the drag at all.
  //
  // So a hand-set height is the height. It is what "manually adjustable"
  // means: the box stays where it was put, and only scrolls once the text
  // outgrows it.
  //: **Revised, by direct instruction**: "should auto expand to about a
  //: third of the screen if large amounts of text are in it but should be
  //: able to be lowered in height manually and should go back to normal
  //: when empty or the text reduces." A fixed hand-set height (the previous
  //: rule) is exactly what stopped the box expanding. Now a drag *below*
  //: the automatic height is a cap, a drag *above* it is a floor.
  //: **Revised again (INBOX 111)**: "when I drag the height of the chat bar,
  //: it snaps back to what it was with or without text in it." The earlier
  //: rule also forgot the drag the moment the box was empty, exempting only
  //: the release of the drag itself; the next `input` event on an empty box
  //: (a keystroke, then backspace) forgot it anyway, which from the chair
  //: is the same snap-back one keystroke later. A dragged height is a
  //: preference and is kept until the next drag; what "go back to normal
  //: when empty" still gets is the *automatic* growth collapsing, which
  //: `chosen < auto` below already does for a drag under the automatic
  //: height.
  const chosen = Number(el.dataset.maxPx || 0);
  const viewportLimit = Math.min(AUTOGROW_MAX_PX, Math.round(window.innerHeight * AUTOGROW_MAX_VIEWPORT));
  //: A drag may exceed the automatic ceiling (that is what the drag is for),
  //: but not the window: past this the conversation above is gone entirely.
  const dragLimit = Math.round(window.innerHeight * COMPOSER_DRAG_MAX_VIEWPORT);
  const auto = Math.min(el.scrollHeight, viewportLimit);
  //: **INBOX 37: an empty box is pinned to its CSS floor, not measured.**
  //: Reported with a screenshot: Reminders' Magic add field taller than its
  //: own Add button on the owner's desktop shell; measured 44/44 (equal) in
  //: this sandbox's headless Chromium, on the bundled system font, in light
  //: mode. `el.scrollHeight` on an *empty* box is still a function of the
  //: rendered line box, which is a function of the actual font in use, and
  //: that is exactly what differs: a fallback font before a webfont has
  //: finished loading, a heavier weight dark mode's own stylesheet may pick,
  //: a different system font entirely on another OS. Every one of those can
  //: round `scrollHeight` a pixel or two past the button's fixed height,
  //: which is why this was invisible here and not there. `min-height` in
  //: rem is none of that, it is a fixed length the browser converts from the
  //: root font size alone, so reading it back is the one measurement that
  //: cannot drift with the textarea's own font. Only while there is nothing
  //: to measure: the moment real content wraps past this floor, `scrollHeight`
  //: takes back over below, which is the box actually growing to fit typed
  //: text rather than a static height with nothing behind it.
  const next = chosen > 0
    ? (chosen < auto ? chosen : Math.max(auto, Math.min(chosen, dragLimit)))
    : !el.value.trim()
      //: An empty box is its own natural height (`rows` and the placeholder,
      //: measured at height:auto above), floored at min-height, never *just*
      //: min-height. Reported with a screenshot: the capture box at 44px
      //: under a two-line placeholder, the second line clipped, a scrollbar
      //: on an empty textarea. "A cleared box must not keep the height of
      //: what was in it" still holds: scrollHeight at height:auto is the
      //: empty box's own size, not the old text's.
      ? Math.max(parseFloat(getComputedStyle(el).minHeight) || 0, auto)
      : Math.min(el.scrollHeight, limit);
  el.style.height = `${next}px`;
  const overflows = el.scrollHeight > next;
  //: What this height was measured against, read while the layout the
  //: `scrollHeight` above just flushed is still clean (see `autoGrowVisible`).
  el._autoGrownValue = el.value;
  el._autoGrownFor = autoGrowInputs(el);
  el.style.overflowY = overflows ? "auto" : "hidden";
  // What this function chose, so a later resize can be told apart from a drag
  // by the user: the two are indistinguishable to a ResizeObserver otherwise.
  el.dataset.autoHeight = String(next);
  fitComposerToDock(el);
}

//: Everything besides the text that a grown box's height depends on: its
//: width (`offsetWidth`, which a scrollbar appearing does not change), the
//: window's height (the cap), a height dragged by hand, and the font.
function autoGrowInputs(el) {
  return `${el.offsetWidth}|${window.innerHeight}|${el.dataset.maxPx || ""}|${getComputedStyle(el).font}`;
}

//: **Every visible box whose height could be wrong, and only those** (INBOX
//: 424h). A tab or section switch used to run `autoGrow` on every visible
//: autogrow box: each one a height write, a forced layout for its
//: `scrollHeight`, another write, another read, box after box: measured at
//: 4x CPU, 70 to 110ms of every tab switch. A box that was measured on
//: screen, has the same text and the same width, font and caps as then, is
//: already the height `autoGrow` would give it. So every check is read first,
//: in one pass (one layout for all of them), and only the boxes that were
//: measured while hidden or whose inputs changed are grown, after it.
function autoGrowVisible() {
  const due = [];
  for (const box of document.querySelectorAll("textarea.autogrow")) {
    if (box.classList.contains("note-surface-mirror") || box.offsetParent === null) continue;
    if (
      box.dataset.autogrowPending ||
      box._autoGrownValue !== box.value ||
      box._autoGrownFor !== autoGrowInputs(box)
    ) {
      due.push(box);
    }
  }
  for (const box of due) autoGrow(box);
}

//: A composer smaller than this is not a composer. The floor exists so a very
//: short window trims the box rather than erasing it, at that point the
//: conversation scrolls and the user can drag the window instead.
const MIN_COMPOSER_PX = 44;

// A hand-dragged composer height, trimmed to the room the chat card has.
//
// The drag is a preference and it is kept as one: `dataset.maxPx` and
// localStorage are **not** touched here. Only the applied height is trimmed,
// so a box dragged to 380px on a large monitor comes back to 380px the moment
// there is room for it again. Writing the trimmed value back would be the app
// quietly forgetting a setting because the window was small once.
//
// The measurement is the card's own overflow rather than any sum of the
// furniture above it. Every number this file has ever guessed at, a viewport
// fraction, a rem cap, the dock's height: has been wrong within two sessions,
// because the dock gains controls and the tab strip wraps. `scrollHeight -
// clientHeight` is the browser answering "by how much does this not fit",
// which needs no maintenance and is exact.
// It iterates because one subtraction does not converge. The conversation
// above the dock is `flex: 1 1 auto` with a floor, so some of the height the
// composer gives back is immediately taken by the message list growing into
// it: measured: a 56px trim cleared only 24px of a 88px overflow. Each pass
// is exact about what it can see, and three of them have been enough at every
// size driven so far; the cap is there so a layout that somehow oscillates
// costs four reflows rather than the frame.
const COMPOSER_FIT_PASSES = 4;

function fitComposerToDock(box) {
  if (!box || box.id !== "chat-input") return;
  const card = document.getElementById("chat-main");
  // Nothing to measure while the tab is hidden; switchTab re-runs this.
  if (!card || !card.getClientRects().length) return;
  for (let pass = 0; pass < COMPOSER_FIT_PASSES; pass += 1) {
    const overflow = Math.round(card.scrollHeight - card.clientHeight);
    if (overflow <= 0) return;
    const now = Math.round(box.getBoundingClientRect().height);
    const next = Math.max(MIN_COMPOSER_PX, now - overflow);
    if (next >= now) return; // already as small as it is allowed to be
    // Set before the style write: the ResizeObserver below reads this to
    // decide whether a height change was a drag, and a trim must never be
    // recorded as one: that is how a preference gets eaten.
    box.dataset.autoHeight = String(next);
    box.style.height = `${next}px`;
    box.style.overflowY = box.scrollHeight > next ? "auto" : "hidden";
  }
}

// The trim depends on the window, so it has to be redone when the window
// changes. Re-running `autoGrow` rather than `fitComposerToDock` alone is what
// lets the box grow *back* towards the dragged height when the window gets
// bigger: autoGrow re-applies the preference, and the fit trims it again only
// if it still does not fit.
function refitComposer() {
  const box = document.getElementById("chat-input");
  if (box) autoGrow(box);
  fitChatEmpty();
}

//: **The welcome fits its pane, or it gets smaller** (the owner, 2026-09-24:
//: "the new chat page has a scrollbar as the suggested try asking stuff makes
//: it scroll"). Measured at 1440x720 with no model connected: the pane is
//: 295px and the welcome 350px, so a new chat opened on a scrollbar. Below
//: its own natural height the welcome drops the emblem and tightens its
//: spacing (`.chat-empty.is-short`, 08-consistency.css), which is 110px back.
//: The choice is made against the welcome's *full* height, and that is never
//: read by taking the class off: doing so resized the pane whenever the pane's
//: own height followed its content, the ResizeObserver fired on it, and the
//: two chased each other every frame (the owner, 2026-09-24: after closing
//: the skill hint above the composer "the whole new chat page started
//: viciously stuttering jumping up and down"). The full height is read while
//: the welcome is full; while it is compact, the height saved at the switch
//: plus what the welcome has grown since (the chips arrive late). A change
//: under 4px, or one this function caused, does nothing.
function fitChatEmpty() {
  const pane = document.getElementById("chat-messages");
  const empty = pane && pane.querySelector(".chat-empty");
  if (!empty) return;
  const room = pane.clientHeight;
  if (!room) return;
  const short = empty.classList.contains("is-short");
  const now = empty.offsetHeight;
  const full = short ? Number(empty.dataset.fullHeight || 0) + (now - Number(empty.dataset.shortHeight || now)) : now;
  const want = room + 4 < full ? true : room >= full + 4 ? false : short;
  if (want === short) return;
  const now2 = performance.now();
  if (now2 - (fitChatEmpty.lastFlip || 0) < 500) return;
  fitChatEmpty.lastFlip = now2;
  if (want) {
    empty.dataset.fullHeight = String(full);
    empty.classList.add("is-short");
    empty.dataset.shortHeight = String(empty.offsetHeight);
  } else {
    empty.classList.remove("is-short");
  }
}

//: `ring-held` holds `.chat-dock:focus-within`'s accent ring off while the
//: focus in the composer is the app's doing rather than the reader's. See the
//: call in `switchTab` for the measurement that produced it, and
//: `.chat-dock.ring-held` in 04-chat-dock-appearance.css for what it turns off.
//:
//: A class rather than a `blur()` because the caret has to stay where it is:
//: the whole point of focusing the composer on arrival is that you can type
//: straight away, and taking the focus back to fix the ring would undo that.
//:
//: **Everything here is a hoisted `function` and the class name is a literal.**
//: `switchTab` can run before this line does (the app restores the last tab at
//: startup), so a `const` holding the name would be in its temporal dead zone
//: at the one moment that matters, and a module-level IIFE binding the
//: listeners would run before `.chat-dock` is necessarily in the document. The
//: listeners are therefore bound on the first suppression instead, which is
//: also the first moment the dock is certain to exist.
function chatDockSuppressRing() {
  const dock = document.querySelector(".chat-dock");
  if (!dock) return;
  //: Three ways the focus becomes the reader's: they type, they press
  //: something in the dock, or they leave and come back. `focusout` covers
  //: the last on its own, since the ring is only ever drawn while something
  //: in here has focus, so releasing the hold as focus leaves means the next
  //: focus, however it arrives, rings normally. Bound once (the dock element
  //: itself remembers), on the dock rather than per control: all three
  //: bubble.
  if (!dock.dataset.ringWired) {
    dock.dataset.ringWired = "1";
    for (const type of ["keydown", "pointerdown", "focusout"]) {
      dock.addEventListener(type, chatDockReleaseRing);
    }
  }
  dock.classList.add("ring-held");
}

function chatDockReleaseRing() {
  const dock = document.querySelector(".chat-dock");
  if (dock) dock.classList.remove("ring-held");
}

// The chat composer can be dragged taller, and remembers it.
//
// Asked for directly: *"there should be a max height that the chat text bar
// can grow to before it gets a scrollbar. the height should also be manually
// adjustable."* Both halves: the cap above, and this.
//
// The native resize grabber does the dragging; all this has to do is notice
// the result and stop `autoGrow` from immediately undoing it on the next
// keystroke. A drag is told from a grow by comparing against the height
// autoGrow last set: anything else was a hand on the corner.
function initComposerResize() {
  const box = $("chat-input");
  if (!box || box.dataset.resizeReady) return;
  box.dataset.resizeReady = "1";

  //: A saved drag is no longer applied on load: the box starts at its
  //: automatic size and a drag is remembered only until the box is emptied
  //: (see autoGrow). The key is still cleared here for profiles that have
  //: one from before.
  try { localStorage.removeItem(COMPOSER_HEIGHT_KEY); } catch { /* storage may be unavailable */ }

  //: **Double-tap the grabber to put it back.** Asked for directly: "allow
  //: double tapping the bottom expansion corner of the chat text box to reset
  //: it to the regular height." A dragged height is sticky by design (it
  //: survives reloads, see above), so without this the only way back to the
  //: automatic height was to drag it to *exactly* the right size by hand, 
  //: which is not a thing anyone can do.
  //:
  //: Scoped to the corner rather than the whole box: a double-click in the
  //: text is how you select a word, and stealing that would trade one small
  //: annoyance for a much larger one. The grabber is ~16px square at the
  //: bottom-right, and a little slack around it costs nothing because the
  //: only thing in that corner *is* the grabber.
  const GRABBER = 22;
  box.addEventListener("dblclick", (event) => {
    const rect = box.getBoundingClientRect();
    const inCorner =
      event.clientX >= rect.right - GRABBER && event.clientY >= rect.bottom - GRABBER;
    if (!inCorner) return;
    event.preventDefault();
    delete box.dataset.maxPx;
    try {
      localStorage.removeItem(COMPOSER_HEIGHT_KEY);
    } catch {
      /* private mode: there was nothing stored to remove */
    }
    // The inline height a drag left behind has to go too, or `autoGrow`'s own
    // reset measures against it and the box never shrinks back.
    box.style.height = "auto";
    autoGrow(box);
    toast("Composer height reset.");
  });

  if (typeof ResizeObserver !== "function") return;
  // The observer used to re-run autoGrow on every size change, including
  // the ones the grabber drag itself was making: autoGrow reset the height,
  // the drag set it again, the observer fired again (reported: "it just
  // spasms and fails"). While the pointer is down on the grabber nothing
  // fights the drag; the final height is recorded once on release. The
  // deferred frame stays: a synchronous autoGrow inside the callback is
  // the "ResizeObserver loop" console error.
  let dragging = false;
  const record = () => {
    const height = Math.round(box.getBoundingClientRect().height);
    const automatic = Number(box.dataset.autoHeight || 0);
    if (!height || Math.abs(height - automatic) <= 2) return;
    box.dataset.maxPx = String(height);
    try { localStorage.setItem(COMPOSER_HEIGHT_KEY, String(height)); } catch { /* private mode */ }
    requestAnimationFrame(() => autoGrow(box));
  };
  box.addEventListener("pointerdown", (event) => {
    const rect = box.getBoundingClientRect();
    dragging = event.clientX >= rect.right - GRABBER && event.clientY >= rect.bottom - GRABBER;
    if (dragging) box.dataset.resizing = "1";
  });
  window.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    delete box.dataset.resizing;
    record();
  });
  const observer = new ResizeObserver(() => {
    if (dragging) return;
    record();
  });
  observer.observe(box);
}

function initAutoGrow() {
  for (const el of document.querySelectorAll("textarea.autogrow")) {
    if (el.dataset.autogrowReady) continue;
    el.dataset.autogrowReady = "1";
    el.addEventListener("input", () => autoGrow(el));
    // Also on programmatic changes, templates, the Remind button, a cleared form.
    el.addEventListener("focus", () => autoGrow(el));
    autoGrow(el);
  }
  initComposerResize();
}

function watchOverlays() {
  let queued = false;
  // The app toggles classes constantly while streaming a chat answer, so this
  // observer sees a lot of traffic it doesn't care about. Ignore anything that
  // isn't an overlay, then coalesce the rest into one check per frame, the
  // lock must never become a cost on the hot path.
  const touchesOverlay = (record) => {
    const target = record.target;
    if (target instanceof Element && target.matches(OVERLAY_SELECTOR)) return true;
    // An added/removed node may BE an overlay (the lightbox) or contain one.
    const isOverlay = (node) =>
      node instanceof Element &&
      (node.matches(OVERLAY_SELECTOR) || node.querySelector(OVERLAY_SELECTOR) !== null);
    return [...record.addedNodes, ...record.removedNodes].some(isOverlay);
  };

  const observer = new MutationObserver((records) => {
    if (queued || !records.some(touchesOverlay)) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      syncScrollLock();
    });
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true, // lightbox-style overlays appended at runtime
    attributes: true,
    attributeFilter: ["class"], // the `hidden` toggle on existing dialogs
  });
  syncScrollLock();
}

// --- account & security ------------------------------------------------------------

async function renderAccount() {
  const facts = $("account-facts");
  facts.replaceChildren();
  const info = await apiJson("/auth/account").catch(() => null);
  if (!info) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Couldn't read the account state.";
    facts.appendChild(li);
    return;
  }
  const rows = [
    ["Password", info.configured ? "Set" : "Not set yet"],
    [
      "Created",
      info.created_at ? new Date(info.created_at).toLocaleDateString() : "Unknown",
    ],
    [
      "Private notes",
      info.vault_exists
        ? info.vault_open
          ? "Encryption key loaded: private notes are readable"
          : "Locked: unlock to read private notes"
        : "No encrypted notes yet",
    ],
    ["Open sessions", String(info.active_sessions)],
  ];
  if (typeof info.vault_open === "boolean") vaultOpen = info.vault_open;
  $("account-password-on-open").checked = info.password_on_open !== false;
  for (const [label, value] of rows) {
    //: A label column and a value column (`.account-facts`), not "Label: value"
    //: in bold run-in: four facts read as a table, so they are laid out as one.
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.className = "account-fact-label";
    name.textContent = label;
    const text = document.createElement("span");
    text.textContent = value;
    li.append(name, text);
    facts.appendChild(li);
  }
}

async function changePassword() {
  const status = $("account-status");
  const current = $("account-current").value;
  const next = $("account-new").value;
  const confirmed = $("account-confirm").value;
  status.classList.remove("error");

  // Checked here as well as on the server, so a typo costs a moment rather
  // than a password you didn't mean to set.
  if (!current || !next) {
    status.classList.add("error");
    status.textContent = "Fill in your current and new password.";
    return;
  }
  if (next !== confirmed) {
    status.classList.add("error");
    status.textContent = "The two new passwords don't match.";
    return;
  }
  if (next.length < 4) {
    status.classList.add("error");
    status.textContent = "A password needs at least 4 characters.";
    return;
  }

  status.textContent = "Changing…";
  try {
    const result = await apiJson("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: current, new_password: next }),
      // A 401 here means "wrong current password", not "your session died".
      ownsAuthErrors: true,
    });
    // Changing the password invalidates every token, including this tab's.
    // The server hands back a fresh one so the change doesn't log you out of
    // the screen you just used to make it. Key must match authToken().
    localStorage.setItem("token", result.token);
    $("account-current").value = "";
    $("account-new").value = "";
    $("account-confirm").value = "";
    status.textContent = "Password changed.";
    toast(
      result.other_sessions_ended
        ? `Password changed. ${result.other_sessions_ended} other session(s) were signed out.`
        : "Password changed."
    );
    renderAccount().catch(() => {});
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

let prefsCache = null;
// Set by savePrefs() to the PUT's own promise while it is in flight, and
// awaited here first (INBOX 73, see savePrefs' own comment): without this,
// re-showing the Preferences section (closing and reopening Settings does,
// via showSettingsSection) fires this function's fresh GET concurrently
// with an unfinished save, and whichever one the server answers first wins
// -- reproduced with the GET winning, which replaced prefsCache wholesale
// with the pre-save value and left the checkbox showing it permanently,
// not just for the moment the save was in flight.
let prefsSaveInFlight = null;

//: **One GET /preferences per boot** (WORLD_CLASS_PLAN A2). The whole of
//: `startApp` runs its steps in parallel, and three of them wanted the
//: preferences: the settings restore, `loadTemplates` (custom templates and
//: saved searches live in the same payload) and `reportTimezone`. Each did its
//: own `apiJson("/preferences")`, so a cold start asked for the same document
//: twice and then decided what to do with the second copy. Measured: two GETs
//: at 311 ms and 290 ms on this sandbox, of 24 boot fetches.
//:
//: This is `fetchDashStats`'s shape, for the same reason: the cache if it is
//: filled, otherwise the one request already in flight, otherwise a new one.
//: Every PUT in this file assigns its own response to `prefsCache`, so the
//: cache is current after a save and a caller that has just written does not
//: need `refresh`; pass it where a *server-side* change is expected (another
//: window, or a job that writes preferences behind the app's back).
let prefsInflight = null;

function loadPreferences({ refresh = false } = {}) {
  if (!refresh && prefsCache) return Promise.resolve(prefsCache);
  if (prefsInflight) return prefsInflight;
  //: Silent: the one boot caller that cared about the error is the settings
  //: restore, and behind the lock screen a 401 here is the lock screen's
  //: message, not a second toast about preferences (§35E).
  prefsInflight = apiJson("/preferences", { silent: true })
    .then((prefs) => {
      prefsCache = prefs;
      paintUserMarks();
      return prefs;
    })
    .finally(() => {
      prefsInflight = null;
    });
  return prefsInflight;
}

async function renderPrefs() {
  if (prefsSaveInFlight) await prefsSaveInFlight.catch(() => {});
  prefsCache = await apiJson("/preferences");
  $("pref-display-name").value = prefsCache.display_name || "";
  //: The saved look, and its controls (avatars.js).
  if (typeof setOwnNameMarkStyle === "function") {
    setOwnNameMarkStyle(prefsCache.avatar_style || {});
    mountProfileLook();
  }
  $("pref-bin-days").value = prefsCache.recycle_bin_days;
  $("pref-chat-retention").value = prefsCache.conversation_retention_days ?? 0;
  $("pref-search-min-sim").value = prefsCache.search_min_similarity;
  $("pref-search-z-margin").value = prefsCache.search_relative_z_margin;
  $("pref-style").value = prefsCache.communication_style;
  $("pref-profile").value = prefsCache.user_profile;
  $("pref-profile-enabled").checked = prefsCache.profile_enabled;
  paintUserMarks();
  updateProfileCount();
  if (prefsCache.session_idle_ttl_minutes) {
    $("account-idle-ttl").value = prefsCache.session_idle_ttl_minutes;
  }
  $("pref-notif-mute-except-reminders").checked = Boolean(
    prefsCache.notifications_muted_except_reminders
  );
  $("pref-smart-punctuation").checked = prefsCache.smart_punctuation === true;
  $("prefs-status").textContent = "";
  //: The fields now hold what the server holds, so nothing is unsaved: this
  //: also covers the reopen, since `showSettingsSection` re-renders.
  markPrefsSaved();
}

// --- Settings → Web search ------------------------------------------------------
//
// Its own screen, and its own save. Web search used to be four controls inside
// Preferences, which is why every error message that said "Settings → Web
// search" pointed at a screen that did not exist.
//
// The engine list comes from the server rather than being written out here:
// the frontend and `websearch.PROVIDERS` would otherwise drift, and the first
// symptom would be a radio button the API rejects.
// The Background tasks section's own controls (`#pref-autonomous-tasks` and
// everything under it): pulled out so `showSettingsSection` can populate
// them the moment *that* section opens, not only as a side effect of opening
// Web search. They used to be filled in exclusively by `renderWebSearch`
// despite living in `#settings-tasks`, a different section entirely, open
// Settings → Background tasks directly in a fresh session (never having
// visited Web search) and every checkbox here read its raw HTML default
// (unchecked) instead of what was actually saved. Toggling one of them then
// called `savePrefs()`, which rebuilds the *entire* preferences object from
// the DOM: sending those defaults back to the server and silently
// overwriting the real values. This is "my preferences settings keep
// getting deleted": not one bad field, but a whole section's worth of
// settings reset the moment anything on it was touched without the
// Web-search tab having been opened first in the same session.
function renderAutonomousSettings() {
  $("pref-autonomous-tasks").checked = Boolean(prefsCache.autonomous_tasks_enabled);
  $("pref-ai-first-filing").checked = prefsCache.ai_first_filing ?? true;
  $("pref-background-filing").checked = prefsCache.background_filing ?? true;
  $("pref-auto-caption-images").checked = prefsCache.auto_caption_images ?? true;
  $("pref-auto-read-image-text").checked = prefsCache.auto_read_image_text ?? true;
  $("pref-auto-tag").checked = prefsCache.auto_tag_enabled ?? true;
  $("pref-auto-link").checked = prefsCache.auto_link_enabled ?? true;
  $("pref-auto-dedupe").checked = prefsCache.auto_dedupe_enabled ?? true;
  $("pref-auto-stale-review").checked = Boolean(prefsCache.auto_stale_review_enabled);
  $("pref-auto-capture").checked = Boolean(prefsCache.auto_capture_enabled);
  $("pref-autonomous-interval").value = prefsCache.autonomous_tasks_interval_hours || 6;
  $("pref-autonomous-model").value = prefsCache.autonomous_tasks_model || "";
  $("pref-battery-mode").checked = Boolean(prefsCache.battery_efficient_mode);
  $("pref-smart-model-routing").checked = prefsCache.smart_model_routing_enabled ?? true;
  toggleAutonomousPanel();
}

async function renderWebSearch() {
  prefsCache = await apiJson("/preferences");
  $("pref-web-search").checked = Boolean(prefsCache.web_search_enabled);
  $("pref-searxng").value = prefsCache.searxng_url || "";
  renderAutonomousSettings();
  $("searxng-autostart").checked = Boolean(prefsCache.searxng_autostart);
  $("search-provider-status").textContent = "";

  const picker = $("search-provider-picker");
  picker.replaceChildren();
  const info = await apiJson("/websearch/providers").catch(() => null);
  if (!info) {
    picker.textContent = "Couldn't load the engine list.";
    return;
  }
  for (const provider of info.providers) {
    const row = document.createElement("label");
    row.className = "provider-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "search-provider";
    radio.value = provider.id;
    radio.checked = provider.id === info.selected;
    radio.addEventListener("change", () => saveSearchProvider(provider.id));
    const text = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = provider.label;
    const detail = document.createElement("span");
    detail.className = "muted";
    detail.textContent = provider.detail;
    text.append(title, document.createElement("br"), detail);
    row.append(radio, text);
    picker.appendChild(row);
  }
  refreshSearxngHost().catch(() => {});
}

async function saveSearchProvider(provider) {
  const status = $("search-provider-status");
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ search_provider: provider }),
    });
    status.classList.remove("error");
    status.textContent = "Saved.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

async function saveWebSearchSettings() {
  const status = $("search-provider-status");
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({
        web_search_enabled: $("pref-web-search").checked,
        searxng_url: $("pref-searxng").value.trim(),
      }),
    });
    // Reported: "the web search button is visibly disabled in the chat
    // dock instead of inactive when I have web search enabled in the
    // settings", the chat dock's own click handler keeps this Settings
    // checkbox in sync going the other way, but this save handler never
    // synced the chat dock button back, so it stayed on whatever look it
    // had at page load until clicked directly or the page reloaded.
    renderWebSearchToggle();
    status.classList.remove("error");
    status.textContent = "Saved.";
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  }
}

// Shared by the "Check now" button and the silent startup check. `silent`
// suppresses the status-line text and the toast for the common "you're on
// the latest version" outcome: the startup check should only ever speak up
// when there's actually something to say.
async function checkForUpdate(silent = false) {
  const status = $("update-check-status");
  const applyBtn = $("update-apply-now");
  if (!silent && status) status.textContent = "Checking…";
  let result;
  try {
    result = await apiJson("/update/check", { silent: true });
  } catch (error) {
    if (!silent && status) status.textContent = "Couldn't check for updates.";
    return;
  }
  if (!result || !result.checked) {
    if (!silent && status) {
      //: The server's own sentence when it wrote one. It knows which of
      //: "offline", "no release published yet" and "rate-limited" happened,
      //: and all three used to be printed here as the first: reported with a
      //: screenshot of "Couldn't reach GitHub" on a machine that was online,
      //: which it was, and had nothing to update to.
      status.textContent =
        result && result.reason === "disabled"
          ? "Enable the checkbox above, then try again."
          : (result && result.message) || "Couldn't reach GitHub to check for updates.";
    }
    applyBtn?.classList.add("hidden");
    return;
  }
  // Settings -> About's own fallback for "or they can manually do it in the
  // settings", same button, same apiJson('/update/apply') call the
  // post-login dialog's "Update automatically" makes.
  applyBtn?.classList.toggle("hidden", !(result.update_available && result.can_auto_apply));
  if (result.update_available) {
    const msg = `Version ${result.latest} is available (you have ${result.current}).`;
    if (status) status.textContent = msg;
    // The silent startup check is the one that runs on every login, asked
    // for directly: a popup after login, but "only if... not every time
    // they login". A toast alone auto-dismisses in 5.5s and is easy to miss
    // entirely if it fires mid-startup while other things are still
    // loading, so a newly-detected version also gets a real dialog, but
    // only once per version, via the same localStorage-latch pattern the
    // rest of this app uses for "seen it" state (e.g. the graph layout/
    // colour prefs above). Re-showing it every login for a version the
    // user has already dismissed would be the exact nagging this was
    // asked to avoid.
    if (silent && localStorage.getItem(UPDATE_SEEN_KEY) !== result.latest) {
      showUpdateAvailableDialog(result);
    } else {
      toast(msg);
    }
  } else if (!silent && status) {
    status.textContent = `You're on the latest version (${result.current}).`;
  }
}

//: The last version this profile was already told about, so the post-login
//: dialog fires once per newly-available release rather than every login
//: for as long as the user hasn't updated.
const UPDATE_SEEN_KEY = "update-seen-version";

// Shared by the dialog's "Update automatically" button and Settings ->
// About's manual one: asked for directly: "either by the message popping
// up the next time they load up the app and are connected to the internet,
// and/or they can manually do it in the settings." `onProgress(state)` is
// called on every poll (`{step, done_bytes, total_bytes}` from
// GET /update/apply/status) so each caller can render it its own way; the
// promise resolves `true` on outcome "launched" and `false` on "failed", 
// never rejects, since a failed apply is exactly the case both callers have
// to handle gracefully (offline, GitHub unreachable, no asset), not an
// exception to propagate.
async function applyUpdateNow(onProgress, tag = null) {
  const url = tag ? `/update/apply?tag=${encodeURIComponent(tag)}` : "/update/apply";
  const start = await apiJson(url, { method: "POST" }).catch((error) => {
    onProgress?.({ step: error.message, failed: true });
    return null;
  });
  if (!start) return false;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const state = await apiJson("/update/apply/status", { silent: true }).catch(() => null);
    if (!state) continue; // a transient miss mid-poll isn't a failure
    onProgress?.(state);
    if (state.outcome === "launched") return true;
    if (state.outcome === "failed") return false;
    if (!state.running) return false; // shouldn't happen, but never loop forever
  }
}

function showUpdateAvailableDialog(result) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "A new version is available");

  const card = document.createElement("div");
  card.className = "card modal-card confirm-card";
  const heading = document.createElement("h3");
  heading.textContent = "A new version is available";
  const text = document.createElement("p");
  text.className = "confirm-text";
  text.textContent = result.can_auto_apply
    ? `MemoryMap AI ${result.latest} is out: you're on ${result.current}. ` +
      "Update automatically (downloads and installs it, then closes MemoryMap " +
      "AI: reopen it in a minute or two to start using the new version), or " +
      "download it yourself from the release page."
    : `MemoryMap AI ${result.latest} is out: you're on ${result.current}. ` +
      "This app never updates itself without asking: download the new " +
      "version yourself whenever you're ready.";
  const progress = document.createElement("p");
  progress.className = "muted";
  const row = document.createElement("div");
  row.className = "row confirm-actions";

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    localStorage.setItem(UPDATE_SEEN_KEY, result.latest);
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
    }
  };

  const later = smallButton("Remind me next time", "Remind me next time", dismiss);
  const view = document.createElement("a");
  view.href = result.url;
  view.target = "_blank";
  view.rel = "noopener";
  // A real <a>, not a button with a click handler that navigates, right-
  // click "open in new tab", middle-click, and Ctrl-click all need to keep
  // working the way they do on every other external link in this app. The
  // `.small`/`.ghost` button rules are scoped to `button.small` and don't
  // reach an anchor at all, hence the dedicated class below rather than
  // relying on those.
  view.className = "small update-dialog-link";
  view.textContent = "View release";
  view.addEventListener("click", dismiss);
  row.append(later, view);

  if (result.can_auto_apply) {
    const auto = smallButton("Update automatically", "Update automatically", async () => {
      auto.disabled = true;
      later.disabled = true;
      const ok = await applyUpdateNow((state) => {
        progress.textContent = state.total_bytes
          ? `${state.step} (${Math.round((state.done_bytes / state.total_bytes) * 100)}%)`
          : state.step;
      });
      if (!ok) {
        // A failed apply must not mark this version "seen", asked for
        // directly: it has to come back next login while still offline (or
        // whatever the real cause was), not go quiet. Re-enabling the
        // buttons also lets them retry immediately without waiting for
        // that next login at all.
        auto.disabled = false;
        later.disabled = false;
        toast(progress.textContent || "Couldn't apply the update.", true);
      }
      // On success the app exits itself shortly after (routes_update.py): 
      // nothing left to do here; the dialog just stays up, showing the
      // last progress line, until the process closes.
    }, false);
    row.appendChild(auto);
  }

  card.append(heading, text, progress, row);
  overlay.appendChild(card);
  wireBackdropClose(overlay, () => dismiss());
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  later.focus();
}

// A source checkout (start.sh/start.bat) auto-updates via `git pull` before
// the server even starts, asked for directly, the same "popup after
// login, only if the app auto updates" the packaged-Windows dialog above
// gives, for the other install type that also auto-updates but had no way
// to say so. GET /update/source-status is a plain env-var read with no
// network call and self-clears after one read, so this never fires twice
// for the same real update and never blocks on being offline.
async function checkForSourceUpdateNotice() {
  const result = await apiJson("/update/source-status", { silent: true }).catch(() => null);
  if (!result || !result.just_updated) return;
  showSourceUpdatedDialog(result);
}

function showSourceUpdatedDialog(result) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "MemoryMap AI was updated");

  const card = document.createElement("div");
  card.className = "card modal-card confirm-card";
  const heading = document.createElement("h3");
  heading.textContent = "MemoryMap AI was updated";
  const text = document.createElement("p");
  text.className = "confirm-text";
  text.textContent = result.from
    ? `Your checkout auto-updated from ${result.from} to ${result.to} when you started it just now.`
    : `Your checkout auto-updated to ${result.to} when you started it just now.`;
  const row = document.createElement("div");
  row.className = "row confirm-actions";

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
    }
  };
  const ok = smallButton("Got it", "Got it", dismiss, false);
  row.appendChild(ok);

  card.append(heading, text, row);
  overlay.appendChild(card);
  wireBackdropClose(overlay, () => dismiss());
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  ok.focus();
}

//: Which checkbox in Settings mirrors which one elsewhere in the app. Two
//: controls for one preference is a reasonable convenience and a reliable way
//: to get them out of step; this is the list that keeps them honest.
const MIRRORED_PREFS = {
  autonomous_tasks_enabled: ["pref-autonomous-tasks", "skills-auto-toggle"],
  auto_tag_enabled: ["pref-auto-tag", "skills-auto-tag"],
  auto_link_enabled: ["pref-auto-link", "skills-auto-link"],
};

// Save one preference without rebuilding the whole object from the DOM.
//
// `savePrefs` reads every control on the Preferences screen and PUTs the lot,
// which is fine when that screen is what you are looking at and wrong when it
// is not: a control on another panel that saved directly left `prefsCache`
// stale, and the next `savePrefs` overwrote it from a checkbox nobody had
// touched. Anything outside the Preferences form should come through here.
async function setPreference(key, value) {
  try {
    prefsCache = await apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify({ [key]: value }),
    });
    for (const id of MIRRORED_PREFS[key] || []) {
      const box = $(id);
      if (box && box.checked !== value) box.checked = value;
    }
    if (key === "autonomous_tasks_enabled") {
      $("autonomous-settings-panel")?.classList.toggle("hidden", !value);
    }
  } catch (error) {
    toast(error.message || "Couldn't save that setting.", true);
  }
}

async function savePrefs(options = {}) {
  const quiet = options?.quiet === true;
  clearTimeout(prefsAutoSaveTimer);
  try {
    const binDaysRaw = Number($("pref-bin-days").value);
    const recycleBinDays = Number.isFinite(binDaysRaw) && binDaysRaw >= 1
      ? Math.min(365, Math.round(binDaysRaw))
      : 30;
    $("pref-bin-days").value = recycleBinDays;
    const minSimRaw = Number($("pref-search-min-sim").value);
    const searchMinSim = Number.isFinite(minSimRaw) ? Math.min(1, Math.max(0, minSimRaw)) : 0.25;
    const zMarginRaw = Number($("pref-search-z-margin").value);
    const searchZMargin = Number.isFinite(zMarginRaw) ? Math.min(3, Math.max(0, zMarginRaw)) : 0.5;
    $("pref-search-min-sim").value = searchMinSim;
    $("pref-search-z-margin").value = searchZMargin;
    // Only this section's own fields. Background tasks' checkboxes
    // (autonomous_tasks_enabled and everything under it) save independently
    // via `setPreference` now: see the comment on `renderAutonomousSettings`
    // for why folding them in here was the actual cause of "preferences keep
    // getting deleted": this form's DOM may never have been rendered this
    // session, and sending its stale defaults back overwrote real values.
    const payload = {
      display_name: $("pref-display-name").value.trim(),
      avatar_style: typeof ownNameMarkStyle === "function" ? ownNameMarkStyle() : undefined,
      recycle_bin_days: recycleBinDays,
      conversation_retention_days: Number($("pref-chat-retention").value) || 0,
      search_min_similarity: searchMinSim,
      search_relative_z_margin: searchZMargin,
      communication_style: $("pref-style").value,
      user_profile: $("pref-profile").value,
      profile_enabled: $("pref-profile-enabled").checked,
      notifications_muted_except_reminders:
        $("pref-notif-mute-except-reminders").checked,
      smart_punctuation: $("pref-smart-punctuation").checked,
    };
    // INBOX 73: "'Mute notifications except reminders' toggle disables
    // itself when the settings close." Reproduced two ways with Playwright
    // route interception: (1) check the box, Save, close and reopen
    // Settings before the PUT resolves -- renderPrefs' own fresh GET can
    // win the race and replace prefsCache wholesale with the pre-save
    // value; (2) delay the PUT leaving the browser at all (a slow
    // connection) so a concurrent GET genuinely reaches the server first
    // -- the checkbox then stayed wrong even after the PUT went on to
    // succeed, since nothing re-read it afterwards. Two matched fixes:
    // write the change into prefsCache immediately, before the await, so
    // any render mid-flight already sees it (renderPrefs still overwrites
    // this with the server's answer once its own GET lands, this is only
    // for the window before that); and hold the PUT's promise in
    // `prefsSaveInFlight` so renderPrefs (above) waits for it first
    // instead of racing it, which is what closes case 2.
    if (prefsCache) Object.assign(prefsCache, payload);
    prefsSaveInFlight = apiJson("/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    try {
      prefsCache = await prefsSaveInFlight;
    } finally {
      prefsSaveInFlight = null;
    }
    $("prefs-status").textContent = "Saved.";
    markPrefsSaved();
    // The microbes and mycelium backgrounds grow from the display name
    // (bg-art.js), so a new name regrows them now rather than next launch.
    if (typeof bgArtRefreshSeed === "function") bgArtRefreshSeed();
    //: **A toast as well as the inline word** (INBOX 263). Reported: "no
    //: visual confirmation popup shows when I use ctrl s to save my
    //: preferences settings". The inline "Saved." is beside the button, which
    //: is at the bottom of the last group: press ctrl+s while reading the
    //: field you just changed at the top of the section and the only feedback
    //: the app gives is off screen. `toast` is DESIGN.md's recipe for a brief
    //: confirmation and it is the same one every other save in the app uses,
    //: so this also stops Preferences being the one place a save says
    //: nothing.
    if (!quiet) toast("Preferences saved.");

    // Reflect a name change immediately if the dashboard is showing.
    if (typeof renderDashboardGreeting === "function") renderDashboardGreeting();
    paintUserMarks();
  } catch (error) {
    $("prefs-status").textContent = error.message;
    toast(error.message, true);
  }
}

//: **Preferences is the only section in Settings that does not save on its
//: own**, and that was true without being said anywhere: every other section
//: writes on change (`setPreference`, `saveSearchProvider`, the appearance
//: controls), so someone who has learned that everywhere else closes this one
//: and loses the field they just typed. Reported as "there is no visual
//: indications that the preferences settings are the only settings that dont
//: save automatically".
//:
//: Two things say it. A standing line at the top of the section says it
//: before anything is typed, and this mark says it again at the moment it
//: starts to matter: the button fills and names the state, so the thing you
//: have to press is the thing that changed.
let prefsDirty = false;

//: **The profile saves itself** (the owner: "remove the need for saving
//: preferences in the settings and just have it auto save like the rest of
//: the settings, it is too unintuitive for it to be the only settings page
//: in which you need to do that", and "my shuffled avatar reset and didnt
//: persist", which is the same cause: a shuffle nobody pressed Save after).
//: Every change schedules one quiet save a moment later, the same save the
//: button used to run, so a burst of typing is one request, not one per key.
let prefsAutoSaveTimer = 0;
function markPrefsDirty() {
  clearTimeout(prefsAutoSaveTimer);
  prefsAutoSaveTimer = setTimeout(() => savePrefs({ quiet: true }), 700);
  if (prefsDirty) return;
  prefsDirty = true;
  const button = $("prefs-save");
  if (button) {
    button.classList.add("primary");
    button.textContent = "Save preferences";
  }
  const note = $("prefs-unsaved");
  if (note) note.classList.remove("hidden");
  const status = $("prefs-status");
  if (status) status.textContent = "";
}

function markPrefsSaved() {
  prefsDirty = false;
  const button = $("prefs-save");
  if (button) button.classList.remove("primary");
  const note = $("prefs-unsaved");
  if (note) note.classList.add("hidden");
}

//: Every control the payload above reads, so the mark cannot go stale against
//: a field someone adds to one and forgets in the other. A `change` and an
//: `input` both, because a `<select>` and a checkbox fire the first and a
//: text field is worth marking on the keystroke rather than on the blur.
const PREFS_FIELD_IDS = [
  "pref-display-name", "pref-bin-days", "pref-chat-retention",
  "pref-search-min-sim", "pref-search-z-margin", "pref-style",
  "pref-profile", "pref-profile-enabled", "pref-notif-mute-except-reminders",
  "pref-smart-punctuation",
];

function wirePrefsDirtyMarks() {
  for (const id of PREFS_FIELD_IDS) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener("input", markPrefsDirty);
    el.addEventListener("change", markPrefsDirty);
  }
  //: The profile head previews the name as it is typed; the rest of the app's
  //: marks wait for the save, since that is when the name is real.
  $("pref-display-name")?.addEventListener("input", (e) => {
    const typed = e.target.value.trim();
    $("profile-avatar")?.replaceChildren(nameMark(typed || "You", 56));
    const head = $("profile-head-name");
    if (head) head.textContent = typed || "Your profile";
  });
  $("pref-profile")?.addEventListener("input", updateProfileCount);
}

//: The prompt reads the first 600 characters of About me
//: (`librarian.PROFILE_ABOUT_CAP_CHARS`); the box stops there, and the count
//: says how much is left. A profile saved before the cap may be longer, and
//: then the line says which part Atlas reads rather than hiding the rest.
const PROFILE_ABOUT_CAP = 600;

function updateProfileCount() {
  const line = $("pref-profile-count");
  const box = $("pref-profile");
  if (!line || !box) return;
  const used = box.value.length;
  line.textContent = used > PROFILE_ABOUT_CAP
    ? `${used} characters; Atlas reads the first ${PROFILE_ABOUT_CAP}.`
    : `${used} of ${PROFILE_ABOUT_CAP} characters.`;
}

async function deleteProfile() {
  if (!(await confirmDialog("Delete your profile text? Atlas will stop personalising answers."))) return;
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ user_profile: "", profile_enabled: false }),
  });
  await renderPrefs();
  toast("Profile data deleted.");
}

// Downloads need the auth header, so plain <a href> won't do: fetch the
// bytes and hand the browser a blob instead.
async function downloadExport(kind) {
  const response = await api(`/export/${kind}`);
  // Markdown and the full backup arrive as zips; the rest are single files.
  const name =
    kind === "markdown" ? "memorymap-markdown.zip" :
    kind === "backup" ? "memorymap-backup.zip" :
    `memorymap-export.${kind}`;
  await saveFile(name, await response.blob());
}

// --- Wave F: backups UI -------------------------------------------------------------

async function renderBackups() {
  const list = $("backup-list");
  const backups = await apiJson("/backups").catch(() => []);
  list.replaceChildren();
  for (const item of backups) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "entry-meta";
    const name = document.createElement("span");
    setLabel(name, item.name);
    const size = document.createElement("span");
    size.className = "muted";
    size.textContent = `${(item.size / 1024).toFixed(0)} KB`;
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      smallButton("Restore", "Roll the notebook back to this backup", async () => {
        if (
          !(await confirmDialog(
            "Restore this backup? Your current notebook is snapshotted first, " +
              "then replaced by the backup."
          ))
        )
          return;
        try {
          await apiJson("/backups/restore", {
            method: "POST",
            body: JSON.stringify({ name: item.name }),
          });
          toast("Backup restored.");
          loadEntries().catch(() => {});
          renderBackups();
        } catch (error) {
          toast(error.message, true);
        }
      })
    );
    actions.appendChild(
      smallButton("ph:x", "Delete this backup", async () => {
        if (!(await confirmDialog("Delete this backup file?"))) return;
        await apiJson(`/backups/${item.name}`, { method: "DELETE" }).catch(() => {});
        renderBackups();
      })
    );
    row.append(name, size, actions);
    li.appendChild(row);
    list.appendChild(li);
  }
}

// The retention setting itself, separate fetch from renderBackups() (which
// only ever hits GET /backups) because the count/bounds live on GET
// /storage, so this app's own tests that treat GET /backups as a plain list
// of backups don't have to change shape for a control that isn't about any
// one backup.
//: "4.2 MB", for a line a person reads rather than a byte count. The server
//: has the same function (`core/diskspace.human_bytes`), because the notice
//: below is drawn from raw bytes and the toast is built server-side.
function humanBytes(count) {
  if (typeof count !== "number" || !isFinite(count)) return "";
  let size = count;
  for (const unit of ["bytes", "KB", "MB", "GB"]) {
    if (size < 1024 || unit === "GB") {
      return unit === "bytes" ? `${Math.round(size)} bytes` : `${size.toFixed(1)} ${unit}`;
    }
    size /= 1024;
  }
  return "";
}

//: **Say it before a save is the thing that says it** (INBOX 266, item 6).
//: Measured on a data dir filled to 100%: `data_dir_writable` stayed `true`
//: throughout, so the one signal this panel had was a reassurance the app
//: could not keep. The threshold is the server's (`low_space_bytes`), so
//: there is one answer to "is this getting tight" rather than one per
//: screen, and the line names the folder and what is worth deleting rather
//: than only the number.
function renderStorageSpaceNotice(storage) {
  const line = $("storage-space-notice");
  if (!line) return;
  const free = storage && typeof storage.free_bytes === "number" ? storage.free_bytes : null;
  const limit = (storage && storage.low_space_bytes) || 0;
  if (free === null || !limit || free >= limit) {
    line.classList.add("hidden");
    line.replaceChildren();
    return;
  }
  line.classList.remove("hidden");
  setLabel(
    line,
    `ph:warning Only ${humanBytes(free)} left where your notebook is kept ` +
      `(${storage.data_dir}). Deleting old backups below, or exports in ` +
      "Import and export, is usually the quickest space to find."
  );
}

async function renderBackupRetention() {
  const input = $("backup-retention");
  if (!input) return;
  const storage = await apiJson("/storage", { silent: true }).catch(() => null);
  if (!storage) return;
  renderStorageSpaceNotice(storage);
  input.min = storage.backup_retention_min;
  input.max = storage.backup_retention_max;
  input.value = storage.backup_retention_count;
  input.title = `Between ${storage.backup_retention_min} and ${storage.backup_retention_max}`;
}

$("backup-retention")?.addEventListener("change", async (e) => {
  const status = $("backup-retention-status");
  const keep = Number(e.target.value);
  try {
    const result = await apiJson("/backups/retention", {
      method: "PUT",
      body: JSON.stringify({ keep }),
    });
    status.textContent = result.removed
      ? `Saved: removed ${result.removed} old backup${result.removed === 1 ? "" : "s"}.`
      : "Saved.";
    renderBackups();
  } catch (error) {
    status.textContent = error.message;
    renderBackupRetention(); // put the field back to what's actually saved
  }
});

async function backupNow() {
  const status = $("backup-status");
  try {
    const made = await apiJson("/backups", { method: "POST" });
    status.textContent = `Saved ${made.name}.`;
    renderBackups();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function importDirectory() {
  const pathInput = $("import-dir-path").value.trim();
  const status = $("import-dir-status");
  if (!pathInput) {
    status.textContent = "Please enter a directory path.";
    return;
  }
  status.textContent = "Starting import...";
  try {
    const response = await apiJson("/import/directory", {
      method: "POST",
      body: { path: pathInput },
    });
    status.textContent = "Import started in the background. Check your library soon.";
    $("import-dir-path").value = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

async function importMarkdown(inputId = "import-md-files") {
  const input = $(inputId);
  const status = $("import-md-status");
  if (!input.files.length) {
    status.textContent =
      inputId === "import-md-folder"
        ? "Choose a folder first."
        : "Choose one or more .md files first.";
    return;
  }
  const form = new FormData();
  //: The third argument is the filename the server sees, and `webkitRelativePath`
  //: is the only place a folder picker puts the path, `file.name` is the bare
  //: name even when the file came from three folders down. Sending the path is
  //: what lets an imported vault keep its tree (`Entry.source_path`) and its
  //: `[[wiki links]]`, which name the file rather than its opening words.
  //: A vault folder holds far more than markdown (`.obsidian/`, images,
  //: PDFs), and the picker hands over every one of them, filtering here
  //: keeps the request from being mostly files the endpoint would reject one
  //: at a time and report as "skipped".
  const chosen = [...input.files].filter((file) =>
    /\.(md|markdown|txt)$/i.test(file.webkitRelativePath || file.name),
  );
  if (!chosen.length) {
    status.textContent = "No markdown files in that folder.";
    return;
  }
  for (const file of chosen) {
    form.append("files", file, file.webkitRelativePath || file.name);
  }
  try {
    const response = await fetch("/import/markdown", {
      method: "POST",
      // The multipart type still comes from the browser; X-Workspace-ID does
      // not, and without it an import while a non-default space is active
      // would silently land the new notes in the default space instead.
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
      body: form,
    });
    if (!response.ok) throw new Error(`Import failed (${response.status})`);
    const result = await response.json();
    status.textContent =
      `Imported ${result.imported} note${result.imported === 1 ? "" : "s"}.` +
      (result.skipped.length ? ` Skipped: ${result.skipped.join("; ")}` : "");
    input.value = "";
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}

// §37G: a document (PDF/Word/slide deck) becomes one or more notes, via the
// markitdown extra: the same "Import" pattern as importMarkdown above, one
// file at a time rather than several, since a document commonly becomes
// several notes on its own (one per chapter or slide).
async function importDocument() {
  const input = $("import-document-file");
  const status = $("import-document-status");
  const file = input.files[0];
  if (!file) {
    status.textContent = "Choose a file first.";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await fetch("/import/document", {
      method: "POST",
      // Same gap as /import/markdown above: without this, the imported
      // document lands in the default space regardless of which is active.
      headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
      body: form,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.detail || `Import failed (${response.status})`);
    }
    const result = await response.json();
    status.textContent =
      `Imported ${result.imported} note${result.imported === 1 ? "" : "s"}` +
      ` from ${result.filename}.` +
      (result.truncated ? " (Stopped at the note limit, the rest wasn't imported.)" : "");
    input.value = "";
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}

// --- Wave F: command palette (Ctrl/Cmd-K) -------------------------------------------

let paletteIndex = 0;

// Static commands; note search results are appended live as you type.
//: Interface zoom, in one place so the slider, the +/- buttons, the keyboard
//: shortcut and the command palette cannot drift apart. Asked for directly:
//: "a nicer way to adjust zoom… + and - buttons next to the slider, hotkeys
//: like ctrl + +/-, and in the commands list".
//:
//: Same range and step as the slider in Settings -> Appearance, and it writes
//: the same key, so all four routes are literally the same control.
const ZOOM_MIN = 70;
const ZOOM_MAX = 130;
const ZOOM_STEP = 5;

function currentZoom() {
  const stored = Number(localStorage.getItem("zoom"));
  return Number.isFinite(stored) && stored ? stored : 100;
}

function setZoom(percent) {
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(percent / ZOOM_STEP) * ZOOM_STEP));
  localStorage.setItem("zoom", String(next));
  const slider = $("zoom-slider");
  if (slider) slider.value = next;
  const readout = $("zoom-value");
  if (readout) readout.textContent = `${next}%`;
  applyAppearance();
  return next;
}

//: **Feedback for a control you just used, which muting must not swallow.**
//: Reported: "the mute notifications button mutes things like if I hot key
//: zooming in and out, I cant see what zoom level Im at if the notifications
//: dont appear, maybe they can appear some other way visually??"
//:
//: The answer is that this was never a notification. A notification tells you
//: about something that happened elsewhere -- a background pass, a reminder --
//: and muting it is a real preference. Confirming a key you are holding down
//: is a *readout*: it belongs on screen for a moment, centred, with no history
//: and no dismiss button, and it has nothing to do with whether the app is
//: allowed to interrupt you. Every editor with a zoom shortcut does this.
//:
//: Deliberately not recorded in the notifications centre either: "Zoom 110%"
//: is not something anyone wants to scroll back through tomorrow.
let hudTimer = null;

//: Where the HUD has to live to be seen. INBOX 86: "zoom popup does not show
//: while a dialog (Settings) is open." Two different reasons, and only one of
//: them is a z-index.
//:
//: Settings is a `.modal-overlay` div at `z-index: 1010` against the HUD's
//: 90, so it simply painted over it: that is fixed in the stylesheet. A
//: native `<dialog>` opened with `showModal()` is a harder case, because it
//: renders in the browser's top layer, which sits above *every* z-index in
//: the document, so no number would ever win. The only way in is to be inside
//: that dialog, so while one is open the HUD is moved into it and put back
//: afterwards. `hudHome` remembers where it belongs rather than assuming
//: `<body>`, the same shape `wireEscapedActionMenu` uses for menus.
let hudHome = null;

function hud(text) {
  const box = $("hud");
  if (!box) return;
  const dialog = document.querySelector("dialog[open]");
  const wanted = dialog || hudHome || document.body;
  if (box.parentElement !== wanted) {
    if (!hudHome) hudHome = box.parentElement;
    wanted.appendChild(box);
  }
  box.textContent = text;
  box.classList.remove("hidden");
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => {
    box.classList.add("hidden");
    //: Home again once it is hidden, so a dialog that closes does not take
    //: the app's only HUD element out of the document with it.
    if (hudHome && box.parentElement !== hudHome) hudHome.appendChild(box);
  }, 1100);
}
window.hud = hud;

function nudgeZoom(direction) {
  const next = setZoom(currentZoom() + direction * ZOOM_STEP);
  hud(`Zoom ${next}%`);
}

// Ctrl/Cmd with + or - . On `capture` so a focused textarea cannot swallow it,
// and `preventDefault` so the browser's own zoom does not fire as well, 
// otherwise the two stack and one press moves both.
//
// `event.key` for "-" and "=" rather than a keyCode: "+" needs Shift on most
// layouts, so the unshifted "=" is what people actually press, and both are
// accepted for the same reason every other app accepts both.
document.addEventListener(
  "keydown",
  (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      nudgeZoom(1);
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      nudgeZoom(-1);
    } else if (event.key === "0") {
      event.preventDefault();
      setZoom(100);
      hud("Zoom 100%");
    }
  },
  true
);

// --- landing on the feature a catalogue row names ----------------------------
//
// The owner, 2026-09-24: "I clicked on the "suggested links" option in the
// tools and features panel and all it did was take me to the graph page, it
// didnt actually open the menu option for suggested links in the graph like it
// should have." Measured: of the 110 written rows in Tools and features, 50
// switched tab (or opened the Library sub-tab, or a Settings pane) and stopped
// there while naming one control on it, and the palette's two board rows did
// nothing at all unless a board was already open. Each row was a hand-written
// closure, and `switchTab("graph")` is the shortest closure that looks like it
// works.
//
// So a row declares where it goes instead (`tests/test_catalogue_reveal.py`
// has the three forms), and every row that names something smaller than a
// tab names one entry here. `revealFeature` does the same five things for
// each: the tab, the lazy bundle, the menu or panel or dialog the control is
// in, a wait until the control is really on screen, and the app's own
// jump-to highlight on it (`flashRevealed`, the ring `flashEntry` and a
// Settings deep link already wear), so the eye lands where the row said.
//
// A target is `{ tab?, settings?, module?, open?, el | sel+built, text?,
// focus?, flash?, fallback? }`: `el` is an id in index.html, `sel` a selector
// for something built at runtime by the function `built` names (with `{arg}`
// filled in from the row), `text` picks a menu row by its words, and
// `fallback` is what is ringed instead when the feature needs something the
// notebook does not have yet (a board to find a card on, a document to set a
// word goal for): the control that makes one, rather than a row that does
// nothing.

//: Resolves to the element once it is on screen (a layout box, not hidden),
//: or null when it has not arrived in `ms`. Polled rather than observed: the
//: things waited for arrive by a tab's module loading, a fetch, a render on
//: the next frame or a dialog's own animation, and a poll is one answer to
//: all four.
function revealWait(find, ms = 3000) {
  const started = performance.now();
  return new Promise((resolve) => {
    const tick = () => {
      let el = null;
      try {
        el = find();
      } catch {
        el = null;
      }
      if (el && el.getClientRects().length) return resolve(el);
      if (performance.now() - started > ms) return resolve(null);
      setTimeout(tick, 60);
    };
    tick();
  });
}

const revealTimers = new WeakMap();

//: The ring, on what the person can see. An enhanced `<select>` is a 1x1
//: clipped box behind its opener (`enhanceSelect`, and openSettingsModal's
//: own comment on the deep link that ringed nothing because of it), and a
//: checkbox is a square whose meaning is in the label beside it, so both ring
//: their visible representative.
function flashRevealed(target) {
  if (!target) return null;
  const shown =
    target.closest(".select-shell") ||
    (target.matches('input[type="checkbox"], input[type="radio"], input[type="color"], input[type="range"]')
      ? target.closest("label, .setting-row, .row")
      : null) ||
    target;
  //: Scrolled only when it is not already in the window: a scroll moves the
  //: page under a resting pointer, and the hover that follows closed a menu
  //: group the reveal had just opened (measured on the phone's note sheet).
  const box = shown.getBoundingClientRect();
  const inView = box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth;
  //: Inside an open menu only the menu's own list scrolls: a scroll of the
  //: page closes every open menu (`closeActionMenusOnScroll`), which took the
  //: document's Export group away the moment it was ringed on a phone.
  const menu = shown.closest(".action-menu, .dock-menu-list, .doc-dock-menu-list, [role='menu'], .sheet-card");
  if (!inView && menu) {
    for (let box = shown.parentElement; box && menu.contains(box); box = box.parentElement) {
      if (box.scrollHeight > box.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(box).overflowY)) {
        const offset = shown.getBoundingClientRect().top - box.getBoundingClientRect().top;
        box.scrollTop += offset - box.clientHeight / 2 + shown.offsetHeight / 2;
        break;
      }
    }
  } else if (!inView) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    shown.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center", inline: "nearest" });
  }
  shown.classList.remove("feature-reveal");
  void shown.offsetWidth;
  shown.classList.add("feature-reveal");
  //: Taken off again, reduced motion included: under that setting the ring is
  //: static rather than animated, and a class nothing removes is a ring that
  //: stays for good (the Search relevance report, openSettingsModal).
  clearTimeout(revealTimers.get(shown));
  revealTimers.set(shown, setTimeout(() => shown.classList.remove("feature-reveal"), 2700));
  return shown;
}

//: A `<details>` dock menu, opened. Setting `open` is what a press on its
//: summary does, without the press's chance of closing one already open.
function revealDetails(id) {
  const menu = $(id);
  if (menu && menu.tagName === "DETAILS") menu.open = true;
}

//: The first visible element matching `sel`, or the first whose text
//: carries `text` when a menu row is picked by its words.
function revealQuery(sel, text) {
  const all = [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length);
  if (!text) return all[0] || null;
  const want = text.toLowerCase();
  return all.find((el) => (el.textContent || "").toLowerCase().includes(want)) || null;
}

//: A row's ⋯ menu in the note list, opened, for the features that live in it
//: (a thread, making a note private, its similar notes). The first note is as
//: good as any: the row is about the menu, not about a note.
async function revealEntryMenu() {
  await switchTab("notes");
  showNotesSection("browse");
  //: Pressed until its menu shows, three times at most: the list is fetched
  //: and drawn again as the tab arrives, and a menu opened on the first
  //: drawing goes with the row it belonged to (measured: the first press
  //: alone left no menu on screen).
  //: And the list is let settle first: a press on a row the next drawing
  //: replaces opens a menu that goes with it, a moment after it showed.
  let rows = -1;
  for (let settle = 0; settle < 12; settle += 1) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const now = document.querySelectorAll("#entry-list li").length;
    if (now && now === rows) break;
    rows = now;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const opener = await revealWait(() => document.querySelector("#entry-list li .menu-wrap > button"));
    if (!opener) return;
    opener.click();
    if (await revealWait(() => revealQuery('[role="menuitem"]'), 700)) break;
  }
}

//: A row that sits in one of an open menu's groups ("Connect ›", "Add ›")
//: is in the page and not on screen until its group is opened, so the group
//: that holds it is pressed.
function revealSubmenuFor(text) {
  const want = text.toLowerCase();
  for (const group of document.querySelectorAll(".action-menu:not(.hidden) .menu-group")) {
    const holds = [...group.querySelectorAll('[role="menuitem"]')].some(
      (item) => !item.classList.contains("has-submenu") && (item.textContent || "").toLowerCase().includes(want)
    );
    if (holds) {
      group.querySelector(".has-submenu")?.click();
      return;
    }
  }
}

//: The formatting strip, shown. The note editor's and the document editor's
//: strips start folded to one row (`docToolbarCollapsed`, documents.js), so
//: a tool that lives in the strip (Insert, the checklist, Find, Focus) is on
//: the page and not on screen until the strip is opened, which is what a
//: person would do to reach it; the choice is remembered, as theirs is.
async function revealStrip() {
  await ensureModule("library");
  if (typeof docToolbarCollapsed === "function" && docToolbarCollapsed()) setDocToolbarCollapsed(false);
}

//: The graph's gear panel, open. Below 600 it is the one sheet the phone
//: layout gives the map's controls (`openGraphControlsSheet`); above, the
//: floating panel. Either way the same `#graph-options` is what shows.
function revealGraphOptions() {
  if (window.matchMedia(PHONE_TABS).matches) {
    if (!graphSheetClose) openGraphControlsSheet($("graph-options-toggle"));
    return;
  }
  setGraphOptionsOpen(true);
}

//: A document open on the Documents tab. Its own load opens the newest when
//: none is (`loadDocuments`), so this is the tab plus a check.
async function revealDocument() {
  await switchTab("documents");
  await revealWait(() => (typeof currentDoc !== "undefined" && currentDoc ? $("doc-title") : null), 2500);
  return typeof currentDoc !== "undefined" && Boolean(currentDoc);
}

//: A board open on its canvas: the one already open, else the newest (a map
//: when `wantMap`, since growing a map by keyboard means nothing on a board).
//: No board at all leaves the boards gallery showing, where the target's
//: `fallback` is the button that makes one.
async function revealBoard(wantMap = false) {
  await switchTab("library");
  document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click();
  await ensureModule("library");
  const onCanvas = !$("wb-canvas-view")?.classList.contains("hidden");
  const isMap = typeof wbIsMap === "function" && wbIsMap();
  if (window.currentBoardId && onCanvas && (!wantMap || isMap)) return true;
  const boards = await apiJson("/whiteboard/boards").catch(() => []);
  const pick = wantMap
    ? boards.find((board) => board.type === "map")
    : boards.find((board) => board.id === window.currentBoardId) || boards.find((board) => board.id != null);
  if (!pick) return false;
  await openWhiteboardBoard(pick.id);
  return true;
}

//: A dashboard widget, or its row in the widget picker when it is switched
//: off or the notebook is new enough that the dashboard shows its welcome
//: instead: the picker is where a hidden widget is turned on.
async function revealDashWidget(name) {
  await switchTab("dashboard");
  const card = await revealWait(() => document.querySelector(`#dash-grid [data-widget="${name}"]`), 1500);
  if (card) return;
  $("dash-widgets-open")?.click();
}

const REVEAL_TARGETS = {
  // Capture & notes
  "notes-capture": { tab: "notes", open: () => showNotesSection("capture"), el: "entry-content", focus: true },
  "notes-template": { tab: "notes", open: () => showNotesSection("capture"), el: "entry-template" },
  "notes-improve": { tab: "notes", open: () => showNotesSection("capture"), el: "improve-btn" },
  "notes-dictation": { tab: "notes", open: () => showNotesSection("capture"), el: "mic-note" },
  "notes-attach": { tab: "notes", open: () => showNotesSection("capture"), el: "entry-attach-file" },
  "notes-checklist": {
    tab: "notes",
    open: async () => {
      showNotesSection("capture");
      await revealStrip();
    },
    sel: '#note-toolbar [data-md="task"]',
    built: "showNotesSection",
    fallback: "note-toolbar",
  },
  "writing-room": { tab: "notes", open: () => showNotesSection("writing-room"), el: "draft-thoughts", focus: true },
  "notes-ask": { tab: "notes", open: () => showNotesSection("ask"), el: "question", focus: true },
  "notes-thread": {
    open: async () => {
      await revealEntryMenu();
      revealSubmenuFor("Continue thought");
    },
    sel: '[role="menuitem"]',
    text: "Continue thought",
    built: "kebabMenu",
    fallback: "entry-list",
  },
  "notes-private": { open: revealEntryMenu, sel: '[role="menuitem"]', text: "Make private", built: "kebabMenu", fallback: "entry-list" },
  "notes-related": {
    open: async () => {
      await revealEntryMenu();
      revealSubmenuFor("Similar notes");
    },
    sel: '[role="menuitem"]',
    text: "Similar notes",
    built: "kebabMenu",
    fallback: "entry-list",
  },
  "notes-favourite": {
    tab: "notes",
    open: () => showNotesSection("browse"),
    sel: "#entry-list .favourite-btn",
    built: "renderEntries",
    fallback: "entry-list",
  },
  "notes-forgotten": {
    tab: "notes",
    open: () => {
      showNotesSection("browse");
      const sort = $("note-sort");
      if (sort.value !== "forgotten") {
        sort.value = "forgotten";
        sort.dispatchEvent(new Event("change"));
      }
    },
    el: "note-sort",
  },
  "notes-filter-help": {
    tab: "notes",
    open: () => {
      showNotesSection("browse");
      $("search-help-hint").classList.remove("hidden");
      $("search-help").setAttribute("aria-expanded", "true");
    },
    el: "search-help-hint",
  },
  "recycle-bin": {
    tab: "library",
    module: "library",
    open: () => {
      document.querySelector('#library-subtabs button[data-target="library-view-documents"]')?.click();
      libraryKind = "archived";
      const binned = $("library-show-binned");
      if (binned && !binned.checked) {
        binned.checked = true;
        binned.dispatchEvent(new Event("change"));
      }
      renderLibraryFilters();
      renderLibrary();
    },
    sel: '#library-filters [data-kind="archived"]',
    built: "renderLibraryFilters",
  },
  sketch: { open: () => openSketch(), el: "sketch-card", flash: false },
  meeting: { open: () => openMeetingRecorder(), el: "meeting-card", flash: false },
  "page-reader": { module: "library", open: () => window.openPageReader?.(), el: "ocr-workspace", flash: false, fallback: "library-view-media" },

  // Ask & chat
  "chat-input": { tab: "chat", el: "chat-input", focus: true, flash: false },
  "chat-new": { tab: "chat", open: () => newChatConversation(), el: "chat-input", focus: true, flash: false },
  "chat-attach": { tab: "chat", open: () => $("attach-note").click(), el: "note-picker-panel" },
  "chat-conversations": { tab: "chat", el: "conversation-list", fallback: "chat-sidebar" },
  "chat-agent-mode": { tab: "chat", sel: '#chat-mode-seg [data-chat-mode="agent"]', built: "switchTab" },
  //: Below the dock's width the toggle lives in the How it answers panel
  //: (a sheet on a phone), so that is opened when the toggle is not on screen.
  "chat-web-search": {
    tab: "chat",
    open: () => {
      if (!$("web-search-toggle")?.getClientRects().length && !chatDockMoreOpen()) openChatDockMore();
    },
    el: "web-search-toggle",
  },
  "chat-export": {
    tab: "chat",
    open: async () => {
      //: Export is about a saved chat: with none open, the newest is opened,
      //: and with none at all the box that starts one is ringed instead.
      if (!chatConv?.id) {
        const saved = await apiJson("/conversations").catch(() => []);
        const newest = (saved.items || saved || [])[0];
        if (newest) await openConversation(newest.id);
      }
      const opener = await revealWait(() => document.querySelector("#chat-actions-menu .menu-wrap > button"), 1500);
      opener?.click();
    },
    sel: '[role="menuitem"]',
    text: "Export as Markdown",
    built: "mountChatActionsMenu",
    fallback: "chat-input",
  },
  //: On a phone the agent is the Chat tab (`toggleAgentPalette` says why),
  //: so either surface is the landing.
  "agent-palette": {
    open: () => toggleAgentPalette(),
    sel: "#command-palette-overlay, #chat-input",
    built: "toggleAgentPalette",
    flash: false,
  },
  "atlas-help": { open: () => askAtlasAbout(""), sel: '[data-sheet="guide"]', built: "openHelpChat", flash: false },

  // Documents
  "doc-new": { tab: "documents", open: () => createDocument(), el: "doc-title", focus: true },
  "doc-templates": { tab: "documents", open: () => openDocTemplateDialog(), el: "doc-template-dialog", flash: false },
  "doc-insert": {
    open: async () => (await revealDocument()) && (await revealStrip(), revealDetails("doc-toolbar-insert")),
    el: "doc-toolbar-insert",
    fallback: "doc-new",
  },
  "doc-tables": {
    open: async () => (await revealDocument()) && (await revealStrip(), revealDetails("doc-toolbar-insert")),
    sel: '#doc-toolbar-insert [data-md="table"]',
    built: "revealDetails",
    fallback: "doc-new",
  },
  "doc-outline": {
    open: async () => {
      await switchTab("documents");
      showDocSidebarSection("outline");
    },
    el: "doc-outline-wrap",
    fallback: "doc-sidebar",
  },
  "doc-crumbs": { open: revealDocument, el: "doc-crumbs", fallback: "doc-title" },
  //: CodeMirror's own search panel where the engine is mounted, the plain
  //: bar where it is not (`toggleDocFindBar` picks).
  "doc-find": {
    open: async () => {
      if (!(await revealDocument())) return;
      //: Find and replace is an editing tool: a document open to read (a
      //: phone opens them that way) is switched to its editing view first.
      if (typeof docView !== "undefined" && docView === "rendered") setDocView(lastEditView);
      toggleDocFindBar(true);
    },
    sel: "#doc-find-bar, #doc-panes .cm-search",
    built: "toggleDocFindBar",
    fallback: "doc-new",
  },
  "doc-focus": { open: revealDocument, el: "doc-focus-toggle", fallback: "doc-new" },
  "doc-properties": { open: revealDocument, sel: "#doc-editor .doc-props", built: "renderDocProperties", fallback: "doc-title" },
  "doc-connections": { open: async () => (await revealDocument()) && $("doc-connections").click(), el: "connections-overlay", flash: false, fallback: "doc-new" },
  "doc-prose": { open: async () => (await revealDocument()) && $("doc-prose").click(), el: "doc-prose-panel", fallback: "doc-prose" },
  "doc-dictionary": { module: "library", open: () => openDocDictionary(), el: "doc-dictionary-dialog", flash: false },
  "doc-word-goal": { open: async () => (await revealDocument()) && $("doc-word-goal").click(), el: "doc-word-goal-dialog", flash: false, fallback: "doc-new" },
  "doc-history": { open: async () => (await revealDocument()) && $("doc-history").click(), el: "doc-history-dialog", flash: false, fallback: "doc-new" },
  "doc-ai": { open: async () => (await revealDocument()) && $("doc-ai").click(), el: "doc-ai-panel", fallback: "doc-ai" },
  //: The exports are a group inside the ⋯ menu (`foldDocMenuGroup`), so the
  //: group's own row is pressed to open it.
  "doc-export": {
    open: async () => {
      if (!(await revealDocument())) return;
      revealDetails("doc-dock-menu");
      $("doc-export-md")?.closest(".menu-group")?.querySelector(".has-submenu")?.click();
    },
    el: "doc-export-md",
    fallback: "doc-new",
  },

  // Boards and maps
  "board-new": {
    open: () => revealBoardsGallery(),
    el: "wb-boards-new",
  },
  "board-create": { open: () => createNewBoard(), sel: ".prompt-card", built: "promptDialog", flash: false },
  "map-create": { open: () => createConceptMap(), sel: ".prompt-card", built: "promptDialog", flash: false },
  "map-keyboard": { open: () => revealBoard(true), el: "whiteboard-container", fallback: "wb-boards-new-map" },
  "map-templates": { open: () => revealBoard(true), el: "wb-map-templates", fallback: "wb-boards-new-map" },
  //: On a map, where laying the tree out again is one button; on a board
  //: it is a right-click on a note with links, which no row can press.
  "board-arrange": {
    open: async () => {
      if (!(await revealBoard(true))) return;
      //: On a phone the rail is a sheet behind the Tools opener.
      if (!$("wb-map-tidy")?.getClientRects().length && $("wb-tools-opener")?.getClientRects().length) {
        $("wb-tools-opener").click();
      }
    },
    el: "wb-map-tidy",
    fallback: "wb-boards-new-map",
  },
  //: Below 720 the overview steps aside for the tools (07-whiteboard-misc.css),
  //: so there the board itself is the landing.
  "board-overview": { open: async () => (await revealBoard()) && wbToggleNavigator(true), el: "wb-navigator", fallback: "whiteboard-container" },
  "board-find": { open: async () => (await revealBoard()) && wbOpenBoardSearch(), el: "wb-search-bar", fallback: "wb-boards-new" },
  "board-tools": { open: () => revealBoard(), el: "wb-tools-panel", fallback: "wb-boards-new" },
  "board-context": { open: () => revealBoard(), el: "wb-context", fallback: "wb-topbar" },
  "board-export": {
    open: async () => (await revealBoard()) && wbExportBoard(),
    sel: ".wb-export-card",
    built: "wbExportBoard",
    flash: false,
    fallback: "wb-boards-new",
  },

  // Library
  "library-docs": { tab: "library", open: () => revealLibrarySub('[data-target="library-view-docs"]'), el: "library-view-docs", flash: false },
  "library-images": { tab: "library", open: () => revealLibrarySub('[data-media-kind="images"]'), el: "library-view-media", flash: false },
  "library-files": { tab: "library", open: () => revealLibrarySub('[data-media-kind="files"]'), el: "library-view-media", flash: false },
  "library-links": { tab: "library", open: () => revealLibrarySub('[data-target="library-view-links"]'), el: "library-view-links", flash: false },
  "library-skills": { tab: "library", open: () => revealLibrarySub('[data-target="library-view-skills"]'), el: "library-view-skills", flash: false },
  "library-contents": { tab: "library", open: () => revealLibrarySub('[data-target="library-view-contents"]'), el: "library-view-contents", flash: false },

  // Map and discovery
  "graph-edit": {
    tab: "graph",
    open: async () => {
      await ensureModule("graph");
      await revealWait(() => (typeof graphNodesRef !== "undefined" && graphNodesRef.length ? $("graph-box") : null), 2500);
      const node = typeof graphNodesRef !== "undefined" ? graphNodesRef[0] : null;
      if (node) openGraphPopup({ ...graphNodeScreenPoint(node), stopPropagation() {} }, node);
    },
    el: "graph-popup",
    flash: false,
    fallback: "graph-add-node",
  },
  "graph-physics": { tab: "graph", open: revealGraphOptions, el: "graph-physics" },
  "graph-suggest": {
    tab: "graph",
    open: () => {
      revealGraphOptions();
      loadLinkSuggestions();
    },
    el: "link-suggestions",
    fallback: "link-suggest-btn",
  },
  "timeline-zoom": { tab: "timeline", open: () => revealDetails("timeline-options-menu"), el: "timeline-scale-group" },
  "timeline-bands": { tab: "timeline", open: () => revealDetails("timeline-options-menu"), el: "timeline-band-section" },
  "global-find": { open: () => openGlobalFind(), el: "global-find-bar", flash: false, fallback: "wb-search-bar" },
  tensions: { open: () => openTensions(), el: "tensions-dialog", flash: false },

  // Plan and focus: the dashboard's widgets
  "widget-on-this-day": { open: () => revealDashWidget("on-this-day"), sel: '[data-widget="on-this-day"]', built: "renderDashboard" },
  "widget-focus": { open: () => revealDashWidget("focus"), sel: '[data-widget="focus"]', built: "renderDashboard" },
  "widget-digest": { open: () => revealDashWidget("digest"), sel: '[data-widget="digest"]', built: "renderDashboard" },
  "widget-rediscover": { open: () => revealDashWidget("random"), sel: '[data-widget="random"]', built: "renderDashboard" },
  "widget-orphans": { open: () => revealDashWidget("orphans"), sel: '[data-widget="orphans"]', built: "renderDashboard" },
  "widget-unfinished": { open: () => revealDashWidget("unfinished"), sel: '[data-widget="unfinished"]', built: "renderDashboard" },
  "widget-pace": { open: () => revealDashWidget("pace"), sel: '[data-widget="pace"]', built: "renderDashboard" },
  "widget-heatmap": { open: () => revealDashWidget("heatmap"), sel: '[data-widget="heatmap"]', built: "renderDashboard" },
  "widget-streak": { open: () => revealDashWidget("streak"), sel: '[data-widget="streak"]', built: "renderDashboard" },
  "dash-layout": {
    tab: "dashboard",
    open: () => {
      if (!dashEditMode) $("dash-edit").click();
    },
    el: "dash-edit",
  },
  //: Below 1100 the form is a sheet opened by New reminder
  //: (`openReminderCompose`); above, it is on the page.
  "reminder-magic": { tab: "reminders", open: () => openReminderCompose(), el: "reminder-magic", focus: true },

  // Make it yours: Settings rows, each ringed in its pane
  "set-theme": { settings: "appearance", el: "theme-seg" },
  "set-accent": { settings: "appearance", el: "accent-swatches" },
  "set-typography": { settings: "appearance", el: "fontsize-seg" },
  "set-radius": { settings: "appearance", el: "radius-slider" },
  "set-background": { settings: "appearance", el: "bg-art-toggle" },
  "set-companion": { settings: "appearance", el: "avatar-buddy-row" },
  "set-contrast": { settings: "appearance", el: "contrast-toggle" },
  "set-custom-css": { settings: "appearance", el: "custom-css" },
  "set-search-relevance": { settings: "general", el: "search-relevance-group" },
  "set-export": { settings: "data", el: "export-json" },
  "set-import-md": { settings: "data", el: "import-md" },
  "set-backups": { settings: "data", el: "backup-now" },
  "set-updates": { settings: "about", el: "update-check-now", fallback: "settings-about" },
  //: One row per tool the agent can call, built from the backend's own list
  //: when the features browser opens (`renderFeatures`): the tool's own row
  //: in Settings → Tools it can use, where it is switched on or off.
  "ai-tool": { settings: "tools", sel: '#tool-list [data-tool="{arg}"]', built: "renderToolSettings", fallback: "settings-tools" },
  "workspace-new": { open: () => openSpaceCreate(), el: "space-create-dialog", flash: false },

  // Data and control
  palette: { open: () => openPalette(), el: "palette-overlay", flash: false },
  features: { open: () => openFeatures(), el: "features-card", flash: false },
  shortcuts: { open: () => openShortcuts(), el: "shortcuts-card", flash: false },
  onboarding: { open: () => openOnboarding(), el: "onboarding-card", flash: false },
};

//: The Library's gallery of boards, not a board on its canvas.
function revealBoardsGallery() {
  return switchTab("library").then(() => {
    document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click();
    return ensureModule("library").then(() => wbShowBoardsLanding());
  });
}

//: One of the Library's sub-tabs, pressed the way a person presses it, so its
//: own handler decides what loads.
function revealLibrarySub(selector) {
  document.querySelector(`#library-subtabs button${selector}`)?.click();
}

async function revealFeature(key, arg = "") {
  let target = REVEAL_TARGETS[key];
  //: `settings:<section>` is a row that names a whole pane ("Settings →
  //: Models"): the pane is the feature, so it is shown and not ringed.
  if (!target && key.startsWith("settings:")) {
    const section = key.slice("settings:".length);
    target = { settings: section, el: `settings-${section}`, flash: false };
  }
  if (!target) return false;
  const fill = (text) => (text || "").replace("{arg}", String(arg).replace(/["\\]/g, ""));
  try {
    if (target.settings) await openSettingsModal(target.settings);
    if (target.tab) await switchTab(target.tab);
    if (target.module) await ensureModule(target.module);
    //: Raced, not awaited outright: some openers resolve only when a person
    //: answers the dialog they open (`createNewBoard` asks for a name), and
    //: what is waited for below is the dialog, which is there long before.
    if (target.open) await Promise.race([Promise.resolve(target.open(arg)), new Promise((r) => setTimeout(r, 1500))]);
  } catch (error) {
    console.warn("revealFeature", key, error);
  }
  const find = () => (target.el ? $(target.el) : revealQuery(fill(target.sel), target.text));
  const land = (el) => {
    if (target.flash !== false) flashRevealed(el);
    if (target.focus) el.focus({ preventScroll: true });
  };
  const found = await revealWait(find);
  if (!found) {
    const fallback = target.fallback ? await revealWait(() => $(target.fallback), 800) : null;
    if (fallback) flashRevealed(fallback);
    return false;
  }
  land(found);
  //: **A list drawn twice as it arrives takes the ring with it.** Settings →
  //: Tools it can use renders its rows on open and again when its own fetch
  //: lands, so the row ringed first was gone a moment later (measured: every
  //: AI tool row "visible but not ringed"). So a found element that has left
  //: the page is found again and ringed again.
  //: Checked twice, since a slow fetch can land after the first look.
  let current = found;
  for (const pause of [350, 550]) {
    await new Promise((resolve) => setTimeout(resolve, pause));
    if (current.isConnected) continue;
    let again = await revealWait(find, 1000);
    //: A menu goes with the row it was opened on, so a menu row that left
    //: is opened again rather than looked for.
    if (!again && target.open) {
      try {
        await Promise.race([Promise.resolve(target.open(arg)), new Promise((r) => setTimeout(r, 1500))]);
      } catch (error) {
        console.warn("revealFeature", key, error);
      }
      again = await revealWait(find, 1500);
    }
    if (!again) break;
    land(again);
    current = again;
  }
  return true;
}

//: A row's declaration, turned into the `run` the three lists call. The
//: order matters only for a row that wrongly carries two, which the test
//: refuses.
function catalogueRun(row) {
  if (typeof row.run === "function") return row;
  let run = () => {};
  if (row.reveal) run = () => revealFeature(row.reveal, row.arg);
  else if (row.tab) run = () => switchTab(row.tab);
  else if (typeof row.act === "function") run = row.act;
  return { ...row, run };
}

function paletteCommands() {
  //: **The documents editor's own commands, at the top, while one is open**
  //: (DOCUMENTS_PLAN Phase 4 item 4). The plan named `Ctrl+K` for an editor
  //: palette of its own, which is the chord this one already has: two
  //: palettes on one key is the collision the agent palette's comment records
  //: being caught twice. So the editor contributes a group here instead, and
  //: `docPaletteCommands` (documents.js) returns nothing at all unless the
  //: Documents tab is showing with a document in it. Guarded by `typeof`
  //: because that file is in the Library's lazy bundle and the palette opens
  //: from every tab, including before it has ever been fetched.
  const editor = typeof docPaletteCommands === "function" ? docPaletteCommands() : [];
  //: Every row below declares where it goes (tests/test_catalogue_reveal.py)
  //: and `catalogueRun` makes its `run`; the editor's rows are commands on
  //: the document already open, so they keep their own.
  return [
    ...editor,
    { label: "ph:clipboard Go to Dashboard", tab: "dashboard" },
    { label: "ph:magnifying-glass-plus Zoom in", act: () => nudgeZoom(1) },
    { label: "ph:magnifying-glass-minus Zoom out", act: () => nudgeZoom(-1) },
    { label: "ph:arrow-counter-clockwise Reset zoom to 100%", act: () => { setZoom(100); hud("Zoom 100%"); } },
    { label: "ph:note-pencil Go to Notes", tab: "notes" },
    { label: "ph:chat-circle Go to Chat", tab: "chat" },
    { label: "ph:graph Go to Graph", tab: "graph" },
    { label: "ph:file-text Go to Documents", tab: "documents" },
    //: Two tabs the palette could not reach. The Library holds six sub-tabs of
    //: real surfaces (documents, images, files, links, skills, contents) and
    //: the Timeline is a top-level tab, and neither had a command: a jump list
    //: missing two of the seven places you can be is the one kind of gap that
    //: teaches people not to use it.
    { label: "ph:books Go to Library", tab: "library" },
    { label: "ph:clock-counter-clockwise Go to Timeline", tab: "timeline" },
    { label: "ph:alarm Go to Reminders", tab: "reminders" },
    // Features reachable *only* from inside one surface are exactly the ones a
    // palette has to carry, or they are found by accident or not at all.
    // Tensions lives in a dialog; the board's overview and find bar live on a
    // board you have to be on already.
    { label: "ph:scales Tensions: find where I disagreed with myself", reveal: "tensions" },
    //: Atlas is a surface with no tab of its own, which is exactly what a
    //: command palette is for (INBOX 224).
    //: The row wears Atlas's own face rather than a glyph (the owner: "find
    //: anything search" should have the avatar too), see `renderPalette`.
    { label: "Ask Atlas about the app", mark: "atlas", reveal: "atlas-help" },
    //: A companion that went somewhere it cannot be reached (INBOX 426 k).
    { label: "ph:arrow-counter-clockwise Call the companion back", act: () => nameMarkBuddyCallBack() },
    //: Both did nothing at all unless a board was already on screen: the
    //: palette opens from every tab, and the two functions act on the board
    //: that is open. The reveal opens one first (the newest), and with no
    //: board at all rings the button that makes one.
    { label: "ph:map-trifold Board overview", reveal: "board-overview" },
    { label: "ph:magnifying-glass Find a card on this board", reveal: "board-find" },
    //: Capture is a sub-tab of Notes, and focusing its box while another
    //: sub-tab was showing did nothing (the dashboard's own New note says so).
    { label: "ph:pencil-simple New note", reveal: "notes-capture" },
    { label: "ph:file-text New document", reveal: "doc-new" },
    { label: "ph:magic-wand Write a note from rough thoughts", reveal: "writing-room" },
    { label: "ph:sparkle New chat", reveal: "chat-new" },
    // The popup agent (Ctrl+Shift+A) has real capability, it's the same
    // tool-calling agent as Chat's agent mode, just reachable from anywhere
    //, but was reachable only by already knowing that chord. This palette
    // is the app's own "what can I do here" list; it belongs in it.
    { label: "ph:magic-wand Ask the agent anything", reveal: "agent-palette" },
    { label: "ph:palette New sketch", reveal: "sketch" },
    {
      // Reachable from anywhere, which is the point. Asked for directly: "I
      // would also like the meeting notes popup to be expanded as a proper
      // feature with more capabilities and expansion which is also accessible
      // throughout the app, not just from the dashboard." A recording is
      // started the moment a meeting starts, and "go to the Dashboard first"
      // is exactly the friction that means it does not get started at all.
      label: "ph:microphone Record a meeting or lecture",
      reveal: "meeting",
    },
    {
      // The same ask about the page reader, in the same words: "I want an
      // easier and more accessible way to access the ocr workspace as a proper
      // and more central feature." It had four doors and every one of them
      // started from a file you had already found, which is no answer to "I
      // want to read something". `openPageReader` (library.js) opens it on what
      // you were last reading, else your newest readable file; the decision and
      // what was deliberately not built is in UI_MODERNISATION_PLAN.md, "how
      // the page reader is reached".
      label: "ph:book-open-text Read a document or image with AI",
      reveal: "page-reader",
    },
    {
      // Asked for directly: "add creating a new board to the command
      // palette and tools and features as well", the only way in before
      // this was the Add button inside the whiteboard's own board-picker
      // panel, unreachable without already being on that tab.
      label: "ph:folders New whiteboard board",
      reveal: "board-create",
    },
    {
      //: A map is a board with a name people recognise (`createConceptMap`,
      //: whiteboard.js), and it was reachable only from the Library's own
      //: create picker. The same argument as the board row above it.
      label: "ph:tree-structure New concept map",
      reveal: "map-create",
    },
    {
      //: The Library's sub-tabs, as commands. These are the two halves of the
      //: file gallery, and getting to either meant three clicks through a tab
      //: and a sub-tab strip that scrolls on a narrow window.
      label: "ph:image Browse images",
      reveal: "library-images",
    },
    {
      label: "ph:paperclip Browse files",
      reveal: "library-files",
    },
    {
      label: "ph:link Browse links",
      reveal: "library-links",
    },
    {
      //: The whole list of what the app can do, from the list of what the app
      //: can do: the features browser was reachable from a dashboard button
      //: and nowhere else, and it is the answer to "what was that thing
      //: called", which is exactly the question the palette is opened with.
      label: "ph:compass Tools and features",
      reveal: "features",
    },
    {
      //: Resurfacing shipped as a sort and a widget and was named in neither
      //: list. The sort is the half a person can act on: it re-ranks the notes
      //: they are already looking at by what is slipping out of reach.
      label: "ph:hourglass Show forgotten notes first",
      reveal: "notes-forgotten",
    },
    {
      //: The word list the document spelling check reads, which is otherwise
      //: only reachable from inside a suggestion popup on a flagged word, so
      //: "what have I taught it" had no door at all.
      label: "ph:book-bookmark Words you have taught it",
      reveal: "doc-dictionary",
    },
    {
      //: Ctrl+F is bound globally (`openGlobalFind`) and the palette is where
      //: a person looks for a key they have forgotten.
      label: "ph:magnifying-glass Find on this screen",
      reveal: "global-find",
    },
    {
      //: Workspaces filter every tab in the app from one control in the top
      //: left, and nothing in the palette mentioned them.
      label: "ph:folders New workspace",
      reveal: "workspace-new",
    },
    // Filters as commands: the fastest route to "the notes I mean" without
    // remembering the operator syntax.
    ...[
      ["ph:star Show favourites", "is:favourite"],
      ["ph:tag Show untagged notes", "is:untagged"],
      ["ph:lock Show private notes", "is:private"],
      ["ph:link Show linked notes", "is:linked"],
    ].map(([label, query]) => ({
      label,
      act: () => showNotesFilter(query),
    })),
    {
      label: "ph:magnifying-glass What can I type in the filter?",
      reveal: "notes-filter-help",
    },
    { label: "ph:gear Settings → Models", reveal: "settings:models" },
    { label: "ph:mask-happy Settings → Personas", reveal: "settings:personas" },
    { label: "ph:lightning Settings → Skills", reveal: "settings:skills" },
    { label: "ph:toolbox Settings → Tools it can use", reveal: "settings:tools" },
    { label: "ph:palette Settings → Appearance", reveal: "settings:appearance" },
    { label: "ph:user-circle Settings → Profile", reveal: "settings:preferences" },
    { label: "ph:sliders Settings → General", reveal: "settings:general" },
    { label: "ph:floppy-disk Settings → Import & export", reveal: "settings:data" },
    { label: "ph:brain Settings → What it remembers", reveal: "settings:memory" },
    { label: "ph:note-blank Settings → Templates", reveal: "settings:templates" },
    { label: "ph:shield-check Settings → Account & security", reveal: "settings:account" },
    { label: "ph:list-checks Settings → Background tasks", reveal: "settings:tasks" },
    { label: "ph:package Settings → Packages", reveal: "settings:extras" },
    { label: "ph:tree-evergreen Settings → Logs", reveal: "settings:logs" },
    { label: "ph:question Settings → Help", reveal: "settings:help" },
    { label: "ph:info Settings → About & updates", reveal: "settings:about" },
    { label: "ph:archive Back up now", act: () => { openSettingsModal("data"); backupNow(); } },
    { label: "ph:export Export markdown", act: () => downloadExport("markdown") },
    { label: "ph:circle-half Toggle light/dark", act: toggleTheme },
    { label: "ph:keyboard Keyboard shortcuts", reveal: "shortcuts" },
    { label: "ph:lock Lock MemoryMap", act: lockNow },
  ].map(catalogueRun);
}

let paletteReminders = [];
let paletteConversations = [];
//: Files and boards, so the palette resolves every kind of thing this app
//: holds rather than four of six. REDESIGN.md R7.3 asks for exactly this, 
//: "one universal picker... resolving notes, documents, files and maps
//: alike", and it is the difference between a jump-to-note box and the way
//: you actually move around the app.
let paletteMedia = [];
let paletteBoards = [];

async function openPalette() {
  overlayReturnFocus = document.activeElement;
  $("palette-overlay").classList.remove("hidden");
  $("palette-input").value = "";
  paletteIndex = 0;
  renderPalette("");
  $("palette-input").focus();
  
  // Background fetch of Reminders and Conversations for the palette to search.
  //: To the end: the palette searches these by text, so a reminder past the
  //: first page would simply not be findable from the palette.
  apiPagedList("/reminders", 200, { silent: true }).then(res => { paletteReminders = res || []; }).catch(() => { paletteReminders = []; });
  //: Both to the end, for the same reason as the reminders above: each is
  //: paged server-side, and the palette searches them by text, so anything
  //: past the first page was simply not findable from the palette. The chat
  //: list joined them when its own flat cap became a page (INBOX 117's
  //: finding, one list later).
  apiPagedList("/conversations", 200, { silent: true }).then(res => { paletteConversations = res || []; }).catch(() => { paletteConversations = []; });
  apiPagedList("/media", 200, { silent: true }).then(res => { paletteMedia = res || []; }).catch(() => { paletteMedia = []; });
  //: Boards joined them when `GET /whiteboard/boards` became a page of its
  //: own: the palette searches boards by title, so a board past the first
  //: page would not be findable from here.
  apiPagedList("/whiteboard/boards", 200, { silent: true }).then(res => { paletteBoards = res || []; }).catch(() => { paletteBoards = []; });
}

function closePalette() {
  $("palette-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

//: Read a field that is *supposed* to be a string, without letting one bad
//: record take the whole palette down with it.
//:
//: Not defensive padding: the fix for a real outage. The reminders filter
//: below read `r.content`, and a reminder has no `content`: its field is
//: `text`. So `undefined.toLowerCase()` threw, and because the throw happened
//: partway through `paletteMatches`, **every** group was lost with it, notes,
//: documents, reminders and conversations alike. The palette silently degraded
//: to its static command list for anyone with so much as one reminder saved,
//: and the only trace was an exception in a console nobody has open.
//:
//: The field name is fixed below. This helper exists so the *class* of failure
//: cannot come back: a payload that changes shape again costs one missing
//: group, not all of them.
function paletteText(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function paletteMatches(query) {
  const lowered = query.trim().toLowerCase();
  //: **The app's own commands get a group name too, now that something can
  //: sit above them.** They had none because they were always first and a
  //: header over the top of a list says nothing; with the editor's group
  //: ahead of them, an unlabelled run reads as more of "This document", which
  //: is the one thing it is not. `group` is only set where the row has not
  //: already claimed one, so the editor's stays its own.
  const commands = paletteCommands()
    .filter((c) => paletteText(c.label).includes(lowered))
    .map((c) => (c.group ? c : { ...c, group: "Everywhere" }));
  if (!lowered) return commands;

  //: **A question typed into the palette is a question** (INBOX 224). The
  //: palette is a jump list, so "how do I turn off web search?" matches
  //: nothing in it and the box goes empty, which reads as "this app has no
  //: answer". A line ending in a question mark is offered to Atlas instead,
  //: first, with everything the palette did find underneath.
  if (query.trim().endsWith("?")) {
    commands.unshift({
      label: `Ask Atlas: ${query.trim()}`,
      mark: "atlas",
      run: () => askAtlasAbout(query.trim()),
    });
  }

  // Notes: match body or title.
  const notes = allEntries
    .filter((e) =>
      paletteText(e.content).includes(lowered) ||
      paletteText(e.title).includes(lowered)
    )
    .slice(0, 5)
    .map((e) => ({
      group: "Notes",
      label: `ph:file-text ${e.title || e.content.slice(0, 55)}${!e.title && e.content.length > 55 ? "…" : ""}`,
      run: () => flashEntry(e.id),
    }));

  //: Documents: title search against the in-memory docs list.
  //:
  //: **`docs` may not exist yet**, and this threw when it did not. It is
  //: declared in documents.js, which is in the Library's lazy bundle
  //: (`LAZY_MODULES`), so on a fresh load the palette's very first keystroke
  //: raised `ReferenceError: docs is not defined` inside `renderPalette` and
  //: the list stopped rendering from then on: the palette looked like it had
  //: no answers for anything typed into it until the Library had been visited
  //: once. Found while measuring INBOX 224's own palette line, in a page that
  //: had never opened the Library.
  const docMatches = (typeof docs === "undefined" ? [] : docs)
    .filter((d) => paletteText(d.title).includes(lowered))
    .slice(0, 3)
    .map((d) => ({
      group: "Documents",
      label: `ph:article ${d.title}`,
      run: () => openDocumentFromNote(d.id),
    }));

  // Reminders: search content.
  // `r.text`, not `r.content`, see `paletteText` above for what the wrong
  // field name actually cost.
  const reminderMatches = paletteReminders
    .filter((r) => paletteText(r.text).includes(lowered))
    .slice(0, 3)
    .map((r) => ({
      group: "Reminders",
      label: `ph:alarm ${r.text.length > 55 ? r.text.slice(0, 55) + "…" : r.text}`,
      run: () => flashReminder(r.id),
    }));

  // Conversations: search title.
  const conversationMatches = paletteConversations
    .filter((c) => paletteText(c.title).includes(lowered))
    .slice(0, 3)
    .map((c) => ({
      group: "Conversations",
      label: `ph:chat-circle ${c.title}`,
      //: `openConversation`, the one function that loads a saved chat back
      //: into the pane. This said `loadChatHistory`, which nothing defines,
      //: so picking a conversation out of the command palette raised a
      //: ReferenceError and the palette closed on an unchanged screen.
      run: () => openConversation(c.id),
    }));

  // Files: matched on the name you gave the file and on its caption, because
  // "the screenshot of the timetable" is how people remember an image, not
  // `a3f9c2.png`. Opens the Library's Files tab, which is where the file's own
  // metadata and its usage links live.
  const mediaMatches = paletteMedia
    .filter(
      (m) =>
        paletteText(m.original_name).includes(lowered) ||
        paletteText(m.caption).includes(lowered)
    )
    .slice(0, 3)
    .map((m) => ({
      group: "Files",
      label: `ph:image ${m.original_name || "Untitled file"}`,
      // `focusLibraryFile` picks Images or Files from the url, the media
      // view is two sub-tabs now, and a `[data-target="library-view-media"]`
      // query matches both.
      run: () => focusLibraryFile(m.original_name || "", m.url || ""),
    }));

  // Boards and maps. `id` is null for the default board, passed through as
  // null rather than skipped, because the default board is the one most
  // people actually draw on.
  const boardMatches = paletteBoards
    .filter((b) => paletteText(b.title).includes(lowered))
    .slice(0, 3)
    .map((b) => ({
      group: "Boards & maps",
      label: `ph:squares-four ${b.title || "Untitled board"}`,
      run: () => openWhiteboardBoard(b.id ?? null),
    }));

  return [
    ...commands,
    ...notes,
    ...docMatches,
    ...mediaMatches,
    ...boardMatches,
    ...reminderMatches,
    ...conversationMatches,
  ];
}

function renderPalette(query) {
  const list = $("palette-list");
  const matches = paletteMatches(query);
  paletteIndex = Math.min(paletteIndex, Math.max(0, matches.length - 1));
  list.replaceChildren();
  let lastGroup = null;
  matches.forEach((match, index) => {
    // Insert a non-interactive group header when the group changes.
    if (match.group && match.group !== lastGroup) {
      const header = document.createElement("li");
      header.className = "palette-group-header";
      header.textContent = match.group;
      header.setAttribute("aria-hidden", "true");
      list.appendChild(header);
      lastGroup = match.group;
    }
    const li = document.createElement("li");
    setLabel(li, match.label);
    if (match.mark === "atlas" && typeof atlasAvatar === "function") li.prepend(atlasAvatar(20));
    //: **The chord, beside the command that runs it.** A palette that only
    //: performs an action teaches nobody the key for it, and the plan's whole
    //: reason for this list is features that do not show themselves. Only the
    //: rows that carry one, which today is the editor's group.
    if (match.keys) {
      const keys = document.createElement("kbd");
      keys.className = "palette-keys";
      keys.textContent = match.keys;
      li.appendChild(keys);
    }
    if (index === paletteIndex) li.classList.add("active");
    li.addEventListener("click", () => {
      closePalette();
      match.run();
    });
    list.appendChild(li);
  });
  if (!matches.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No matching command, note or document.";
    list.appendChild(li);
  }
}

function paletteKeydown(event) {
  const matches = paletteMatches($("palette-input").value);
  if (event.key === "Escape") closePalette();
  else if (event.key === "ArrowDown") {
    event.preventDefault();
    paletteIndex = Math.min(paletteIndex + 1, matches.length - 1);
    renderPalette($("palette-input").value);
    scrollPaletteToActive();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    paletteIndex = Math.max(paletteIndex - 1, 0);
    renderPalette($("palette-input").value);
    scrollPaletteToActive();
  } else if (event.key === "Enter" && matches[paletteIndex]) {
    closePalette();
    matches[paletteIndex].run();
  }
}

// Reported live: arrowing past the visible rows left the selection off
// screen: nothing followed it. `renderPalette` rebuilds the list from
// scratch on every keypress (replaceChildren), so there is no focused or
// otherwise browser-tracked element for the browser's own native
// scroll-on-focus to follow; `.active` is a plain CSS class on an
// unfocused `<li>`, invisible to that mechanism entirely.
function scrollPaletteToActive() {
  $("palette-list").querySelector(".active")?.scrollIntoView({ block: "nearest" });
}
