// spaces-find.js: the status bar's slots, spaces, the templates pane, Find
// anything, then the boot kick-offs. Moved out of app.js on 2026-09-26 as one
// contiguous range (INBOX 426 cc, docs/roadmap/agent-remaining/appjs-split.md).
// A classic script sharing app.js's globals, loaded in app.js's old order;
// nothing in an earlier file calls into it while the page loads
// (scratchpad/appjs-map.js --check).

// --- what shows in the status bar --------------------------------------------
//
// Asked for: "allow more stuff to be added and removed to the bottom status
// bar?? maybe??" The bar is a permanent strip across the bottom of every
// screen, so what belongs on it is taste rather than correctness.
//
// **Stored as what is hidden, not what is shown**, and that choice is the
// whole of the forward-compatibility story: a slot added in a later version
// appears by default for everyone, instead of being invisible to every user
// who ever opened this screen and saved a list that could not have named it.
//
// Only the slots that are *always* there are listed. The offline badge, the
// power-saver badge and the running-job slot appear when there is something
// to say and hide themselves again, and hiding a warning you asked for is a
// different kind of setting from tidying a permanent one away.
const STATUS_SLOTS = [
  { key: "ai", label: "AI status", hint: "The dot and emblem saying what the local model is doing" },
  { key: "notes", label: "Note count", hint: "How many notes you have, as a link to them" },
  { key: "reminders", label: "Reminders", hint: "Open and due reminders" },
  { key: "nav", label: "Back and forward", hint: "Move between the pages you have visited" },
  { key: "undo", label: "Undo and redo", hint: "The same undo the rest of the app uses" },
  { key: "command", label: "Command palette hint", hint: "The Ctrl-K reminder" },
  {
    key: "agent",
    label: "Ask the agent",
    hint: "Open the agent over whatever you are doing, from any tab",
  },
  //: Added with INBOX 207, when the Guide left the header cluster. A slot
  //: added later appears by default for everyone, which is what storing the
  //: hidden set rather than the shown one buys (the note above).
  {
    key: "guide",
    label: "Guide",
    hint: "Ask the guide how this app works, from any tab",
  },
  //: Added with INBOX 270. A slot added later appears by default for
  //: everyone, which is what storing the hidden set rather than the shown one
  //: buys (the note above).
  {
    key: "find",
    label: "Find anything",
    hint: "Search your notes, documents, files and the app itself",
  },
];

function hiddenStatusSlots() {
  // `prefsCache`, not `window.prefsCache`. It is declared with `let` at the
  // top level of a classic script, which puts it in the *global lexical*
  // scope, shared with every other script here, so a bare reference works , 
  // and explicitly NOT on `window`. Two existing call sites in this file get
  // that wrong and silently read `undefined` forever; this one measured as a
  // toggle that ticked and did nothing.
  const stored = typeof prefsCache === "object" && prefsCache ? prefsCache.status_bar_hidden : null;
  return new Set(Array.isArray(stored) ? stored : []);
}

function applyStatusBarSlots() {
  const hidden = hiddenStatusSlots();
  for (const element of document.querySelectorAll("[data-status-slot]")) {
    // `.hidden` rather than a style: everything else in this app that shows
    // and hides uses the class, and one of these slots (`status-task`) is
    // already driven by it from another code path.
    element.classList.toggle("status-slot-off", hidden.has(element.dataset.statusSlot));
  }
}

function renderStatusBarSettings() {
  const box = $("status-bar-items");
  if (!box) return;
  const hidden = hiddenStatusSlots();
  // The clock's own row lives inside this same container now (index.html): 
  // moved there so it wraps as one more compact chip alongside STATUS_SLOTS'
  // instead of stretching full-width as a lone sibling after the flex box.
  // `replaceChildren()` below is only ever meant to clear the *generated*
  // rows this loop is about to rebuild; without pulling the static clock
  // label out first, it would delete that markup along with them on every
  // call and silently orphan `#status-bar-clock-toggle` for the rest of
  // this function.
  const clockLabel = document.getElementById("status-bar-clock-toggle")?.closest("label");
  box.replaceChildren();
  for (const slot of STATUS_SLOTS) {
    const label = document.createElement("label");
    label.className = "checkbox-label status-bar-item";
    label.title = slot.hint;
    const box_ = document.createElement("input");
    box_.type = "checkbox";
    box_.checked = !hidden.has(slot.key);
    box_.addEventListener("change", () => {
      const next = hiddenStatusSlots();
      if (box_.checked) next.delete(slot.key);
      else next.add(slot.key);
      const list = [...next];
      if (prefsCache) prefsCache.status_bar_hidden = list;
      applyStatusBarSlots();
      setPreference("status_bar_hidden", list);
    });
    const text = document.createElement("span");
    text.textContent = slot.label;
    label.append(box_, text);
    box.appendChild(label);
  }
  // Put the clock's row back: see the comment above `clockLabel`'s
  // declaration. Appended last, so it reads as the odd one out it actually
  // is (off by default) without visually separating from its siblings.
  if (clockLabel) box.appendChild(clockLabel);
  // The clock's own opt-in toggle, not one of STATUS_SLOTS above (it is
  // off by default, so it is rendered and wired separately rather than
  // joining a loop that assumes every entry starts visible).
  const clockToggle = $("status-bar-clock-toggle");
  if (clockToggle) {
    clockToggle.checked = Boolean(prefsCache?.status_bar_clock);
    clockToggle.onchange = () => {
      if (prefsCache) prefsCache.status_bar_clock = clockToggle.checked;
      applyStatusClock();
      setPreference("status_bar_clock", clockToggle.checked);
    };
  }
}

let statusClockTimer = null;

// HH:MM, no seconds, repainted on the minute by `startMinuteTicker` (see it
// for why a clock without seconds is one wake a minute rather than sixty,
// or, as this one used to be, two).
function paintStatusClock() {
  const el = $("status-clock");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Reads prefsCache.status_bar_clock rather than taking an argument, the same
// convention applyStatusBarSlots() and applyAppearance() already use: one
// source of truth, called again after every write.
function applyStatusClock() {
  const el = $("status-clock");
  if (!el) return;
  const on = Boolean(prefsCache?.status_bar_clock);
  el.classList.toggle("hidden", !on);
  if (statusClockTimer) {
    statusClockTimer();
    statusClockTimer = null;
  }
  if (on) {
    //: Was `setInterval(..., 30000)`, which cost two wakes a minute to paint
    //: HH:MM *and* left the bar up to 30 seconds behind the minute it was
    //: showing. `startMinuteTicker` is one wake and never behind.
    statusClockTimer = startMinuteTicker(paintStatusClock);
  } else {
    closeStatusClockDetail();
  }
}

// **The detail popover.** Asked for directly: seconds, the date and the
// timezone, on click or hover, none of which belong in the bar's own
// HH:MM (the comment on paintStatusClock explains why: glanced at, not
// watched, so a 30s repaint is deliberate there). This is the opposite
// case, open only while someone is actually looking at it, so it gets
// its own 1s ticker, started on open and stopped on close rather than
// running unconditionally in the background the way the bar's clock does.
let statusClockDetailTimer = null;
let statusClockDetailPinned = false;

function paintStatusClockDetail() {
  const now = new Date();
  const dateEl = $("status-clock-detail-date");
  const timeEl = $("status-clock-detail-time");
  const zoneEl = $("status-clock-detail-zone");
  if (!dateEl || !timeEl || !zoneEl) return;
  dateEl.textContent = now.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  timeEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  // Both the IANA name (what a person recognises, "Europe/London") and
  // the numeric offset (what actually explains a gap between two
  // people's clocks): a name alone doesn't say which side of UTC you're
  // on, and an offset alone doesn't say which timezone that even is.
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMatch = /GMT([+-]\d+(?::\d+)?)/.exec(
    now.toLocaleTimeString([], { timeZoneName: "shortOffset" })
  );
  zoneEl.textContent = offsetMatch ? `${zone} (UTC${offsetMatch[1]})` : zone;
}

function openStatusClockDetail(pin) {
  const panel = $("status-clock-detail");
  const btn = $("status-clock");
  if (!panel || !btn || !prefsCache?.status_bar_clock) return;
  if (pin) statusClockDetailPinned = true;
  panel.classList.remove("hidden");
  btn.setAttribute("aria-expanded", "true");
  paintStatusClockDetail();
  if (!statusClockDetailTimer) {
    statusClockDetailTimer = setInterval(paintStatusClockDetail, 1000);
  }
  // Positioned from the button's own rect, not a static CSS offset: the
  // clock's horizontal position among the bar's other optional slots
  // (STATUS_SLOTS) isn't fixed, so a hardcoded `right:` would drift out
  // from under the button the moment a neighbouring slot is toggled off.
  // Opens *upward*: the status bar is the bottom of the screen, so
  // "below the button" is off-window.
  const margin = 8;
  const anchor = btn.getBoundingClientRect();
  panel.style.left = "0px";
  const box = panel.getBoundingClientRect();
  let left = anchor.left;
  if (left + box.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - margin - box.width);
  }
  panel.style.left = `${Math.round(left)}px`;
  panel.style.bottom = `${Math.round(window.innerHeight - anchor.top + margin)}px`;
}

function closeStatusClockDetail(force) {
  // Hover-out shouldn't close a click-pinned popover, only Escape,
  // outside click, or the clock itself being turned off should.
  if (statusClockDetailPinned && !force) return;
  statusClockDetailPinned = false;
  $("status-clock-detail")?.classList.add("hidden");
  $("status-clock")?.setAttribute("aria-expanded", "false");
  if (statusClockDetailTimer) {
    clearInterval(statusClockDetailTimer);
    statusClockDetailTimer = null;
  }
}

(() => {
  const btn = $("status-clock");
  if (!btn) return;
  btn.addEventListener("mouseenter", () => openStatusClockDetail(false));
  btn.addEventListener("mouseleave", () => closeStatusClockDetail(false));
  btn.addEventListener("focus", () => openStatusClockDetail(false));
  btn.addEventListener("blur", () => closeStatusClockDetail(false));
  btn.addEventListener("click", () => {
    if (statusClockDetailPinned) closeStatusClockDetail(true);
    else openStatusClockDetail(true);
  });
})();
document.addEventListener("click", (e) => {
  if (
    statusClockDetailPinned &&
    !e.target.closest("#status-clock, #status-clock-detail")
  ) {
    closeStatusClockDetail(true);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && statusClockDetailPinned) closeStatusClockDetail(true);
});

// --- Agent Activity: moved to agent-activity.js ---

// --- Global Command Palette (Ctrl+K): moved to palette.js ---
// Split out on 2026-09-24 when the gzipped app.js crossed
// test_static_compression.py's bound; see palette.js's header.

// --- spaces ------------------------------------------------------------------
//
// A space partitions notes, categories, links and documents. It is soft
// separation, not separate databases: every row carries a `workspace_id` and
// the server adds a loader criterion for the one named in `X-Workspace-ID`.
// That header is added in `api()` above, which is the only reason switching
// spaces changes what you see rather than just the label in the header.
//
// The id is kept in localStorage rather than on the server on purpose: which
// space you were last in is a property of this window, not of the notebook,
// and syncing it would mean two open windows fighting over one value.
//
// `SPACE_ALL` itself is declared up near `api()`, not here: see the comment
// there for why.

// The icons a space may be given. A closed set, because the value is
// interpolated into a class name, an arbitrary string there is CSS class
// injection, and it is also how you end up with a space whose icon is a
// typo that renders as an empty box.
const SPACE_ICONS = [
  "ph-folder", "ph-briefcase", "ph-house", "ph-user", "ph-kanban",
  "ph-code", "ph-flask", "ph-heart", "ph-book-open", "ph-graduation-cap",
  "ph-game-controller", "ph-terminal-window", "ph-camera", "ph-music-notes",
  "ph-airplane", "ph-shopping-cart", "ph-tree", "ph-lightbulb",
];

let spacesCache = [];

function activeSpaceId() {
  return localStorage.getItem("spaceId") || SPACE_ALL;
}

function setActiveSpace(id) {
  localStorage.setItem("spaceId", id);
  // A full reload rather than a re-fetch of everything on the page. Every list,
  // count, graph and sidebar in the app is scoped by the header, so a partial
  // refresh would leave whichever one we forgot showing the old space, and a
  // space that is half-switched is worse than one that took a second.
  window.location.reload();
}

function spaceIconPicker(container, hiddenInput) {
  container.replaceChildren();
  for (const name of SPACE_ICONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(hiddenInput.value === name));
    button.setAttribute("aria-label", name.replace("ph-", "").replace(/-/g, " "));
    const icon = document.createElement("i");
    icon.className = `ph ${name}`;
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    button.addEventListener("click", () => {
      hiddenInput.value = name;
      for (const sibling of container.children) {
        sibling.setAttribute("aria-checked", String(sibling === button));
      }
    });
    container.appendChild(button);
  }
}

function spaceMenuOption({ id, name, icon, deletable, hiddenFromAll }) {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "space-option";
  option.setAttribute("role", "option");
  option.dataset.spaceId = id;
  option.setAttribute("aria-selected", String(id === activeSpaceId()));
  // .space-option-name ellipsises with no other escape hatch for a long
  // board name.
  option.title = name;

  const glyph = document.createElement("i");
  glyph.className = `ph ${icon}`;
  glyph.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "space-option-name";
  label.textContent = name;

  option.append(glyph, label);
  option.addEventListener("click", () => setActiveSpace(id));

  if (deletable) {
    const actions = document.createElement("span");
    actions.className = "space-option-actions";

    // Nested <button> is invalid HTML, so these are spans with a button role.
    // The click handlers stop propagation: without it, "rename" would also
    // trip the row's own switch-to-this-space handler and reload the page out
    // from under the dialog that was about to open.
    for (const [glyphName, title, run] of [
      // Keep this space out of "All spaces", or put it back. Asked for
      // directly: "how do I hide a specific space's notes and
      // images/documents etc, all the content from the 'all spaces' space if
      // I wish??" It lives on the space's own row because that is where a
      // person is when they think it, not buried in Settings, which is the
      // other place it could have gone and a worse one.
      //
      // The glyph carries the state (an open eye means visible, a struck-out
      // one means hidden), and the title says what pressing it will do,
      // which is the pair every other toggle in this app uses.
      [
        hiddenFromAll ? "ph-eye-slash" : "ph-eye",
        hiddenFromAll
          ? "Hidden from All spaces, show it there again"
          : "Hide this space's contents from All spaces",
        () => toggleSpaceHidden(id, !hiddenFromAll),
      ],
      ["ph-pencil-simple", "Rename this space", () => openSpaceEdit(id, name, icon)],
      ["ph-trash", "Delete this space", () => openSpaceDelete(id)],
    ]) {
      const action = document.createElement("span");
      action.className = "ghost small";
      action.setAttribute("role", "button");
      action.tabIndex = 0;
      action.title = title;
      action.setAttribute("aria-label", title);
      const actionIcon = document.createElement("i");
      actionIcon.className = `ph ${glyphName}`;
      actionIcon.setAttribute("aria-hidden", "true");
      action.appendChild(actionIcon);
      const fire = (event) => {
        event.stopPropagation();
        event.preventDefault();
        closeSpaceMenu();
        run();
      };
      action.addEventListener("click", fire);
      action.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") fire(event);
      });
      actions.appendChild(action);
    }
    option.appendChild(actions);
  }
  return option;
}

// Flip a space in or out of the everything-view. A view filter, not a
// privacy boundary: the space stays completely usable when selected.
async function toggleSpaceHidden(id, hidden) {
  try {
    await apiJson(`/spaces/${id}`, {
      method: "PUT",
      body: JSON.stringify({ hidden_from_all: hidden }),
    });
    await loadSpaces();
    renderSpaceMenu();
    toast(
      hidden
        ? "Hidden from All spaces. It still opens normally when you pick it."
        : "Showing in All spaces again."
    );
    // The everything-view's contents just changed under whatever is on
    // screen, so it has to be re-read rather than left stale.
    if (activeSpaceId() === SPACE_ALL) await loadEntries();
  } catch (error) {
    toast(error.message || "Couldn't change that space.", true);
  }
}

function renderSpaceMenu() {
  const menu = $("space-menu");
  if (!menu) return;
  menu.replaceChildren();

  menu.appendChild(spaceMenuOption({
    id: SPACE_ALL,
    name: "All spaces",
    icon: "ph-circles-four",
    deletable: false,
  }));
  for (const space of spacesCache) {
    menu.appendChild(spaceMenuOption({
      id: space.id,
      name: space.name,
      icon: space.icon,
      // "default" is where a deleted space's notes go, so it cannot itself be
      // deleted: the server refuses it too, but offering a button that always
      // errors is not a UI.
      hiddenFromAll: Boolean(space.hidden_from_all),
      deletable: space.id !== "default",
    }));
  }

  const divider = document.createElement("div");
  divider.className = "space-menu-divider";
  menu.appendChild(divider);

  const create = document.createElement("button");
  create.type = "button";
  create.className = "space-option";
  create.id = "space-create-open";
  const plus = document.createElement("i");
  plus.className = "ph ph-plus";
  plus.setAttribute("aria-hidden", "true");
  const createLabel = document.createElement("span");
  createLabel.className = "space-option-name";
  createLabel.textContent = "New space…";
  create.append(plus, createLabel);
  create.addEventListener("click", () => {
    closeSpaceMenu();
    openSpaceCreate();
  });
  menu.appendChild(create);

  // The button's own label follows whatever is selected.
  const current = spacesCache.find((space) => space.id === activeSpaceId());
  const nameEl = $("space-current-name");
  const iconEl = $("space-current-icon");
  if (nameEl) {
    nameEl.textContent = current ? current.name : "All spaces";
    nameEl.title = current ? current.name : "All spaces";
  }
  if (iconEl) iconEl.className = `ph ${current ? current.icon : "ph-circles-four"}`;
}

function closeSpaceMenu() {
  //: The same hand-back as `closeNavHistoryMenu`: Escape in the list left
  //: the focus on `body`.
  const held = $("space-menu")?.contains(document.activeElement);
  $("space-menu")?.classList.add("hidden");
  $("space-switcher-btn")?.setAttribute("aria-expanded", "false");
  if (held) $("space-switcher-btn")?.focus({ preventScroll: true });
}

function openSpaceCreate() {
  $("space-create-name").value = "";
  $("space-create-icon").value = "ph-folder";
  $("space-create-error").textContent = "";
  spaceIconPicker($("space-create-icon-picker"), $("space-create-icon"));
  $("space-create-dialog").showModal();
  $("space-create-name").focus();
}

function openSpaceEdit(id, name, icon) {
  $("space-edit-id").value = id;
  $("space-edit-name").value = name;
  $("space-edit-icon").value = icon;
  $("space-edit-error").textContent = "";
  spaceIconPicker($("space-edit-icon-picker"), $("space-edit-icon"));
  $("space-edit-dialog").showModal();
  $("space-edit-name").focus();
}

function openSpaceDelete(id) {
  $("space-delete-id").value = id;
  $("space-delete-error").textContent = "";
  $("space-delete-dialog").showModal();
}

async function loadSpaces() {
  if (!$("space-switcher-btn")) return;
  const wasEmpty = !spacesCache.length;
  try {
    spacesCache = await apiJson("/spaces", { silent: true });
  } catch {
    // A notebook that has never had a space made still has to work. Failing to
    // list them leaves the switcher on "All spaces", which is exactly right.
    spacesCache = [];
  }
  renderSpaceMenu();
  updateCaptureSpaceLabel();
  //: The other half of the guard on the note card's space chip: the list is
  //: drawn before this request comes back, and every card that drew while the
  //: cache was empty is now missing the chip it should carry. Re-rendered only
  //: when there is something on screen to re-render and the cache actually has
  //: something in it, so this costs a fresh notebook nothing and cannot loop
  //: (nothing in `renderEntries` calls back into here).
  if (wasEmpty && spacesCache.length && $("entry-list")?.children.length) renderEntries();
}

//: INBOX 1a/38: says which space the capture form actually files into,
//: because the answer is not always the one picked at the top. Selecting
//: "All spaces" turns off the workspace filter for *reading*, but a new
//: note still has to land somewhere concrete, and `database.py`'s own
//: insert hook only stamps a workspace when one is actually selected: with
//: "all" sent, a fresh row keeps its column default, "default" (Default
//: Space). Read that off the same rule rather than re-deciding it here, so
//: this label and the server's own behaviour cannot drift apart.
function updateCaptureSpaceLabel() {
  const label = $("capture-space-hint");
  if (!label) return;
  const active = activeSpaceId();
  const filingId = active === SPACE_ALL ? "default" : active;
  const space = spacesCache.find((s) => s.id === filingId);
  const name = space ? space.name : "Default Space";
  label.textContent =
    active === SPACE_ALL
      ? `Filing into ${name} (pick a space above to file there instead).`
      : `Filing into ${name}.`;
}

function initSpaceSwitcher() {
  const button = $("space-switcher-btn");
  const menu = $("space-menu");
  if (!button || !menu) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!open));
    menu.classList.toggle("hidden", open);
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target) && !button.contains(event.target)) closeSpaceMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSpaceMenu();
  });

  // Cancel buttons. These were `onclick` attributes, which this app's CSP
  // refuses outright, so every one of them was dead markup.
  for (const closer of document.querySelectorAll("[data-close-dialog]")) {
    closer.addEventListener("click", () => {
      document.getElementById(closer.dataset.closeDialog)?.close();
    });
  }

  // Tensions: the review's own start button. `data-close-dialog` above
  // already wires its Close.
  $("tensions-run")?.addEventListener("click", runTensionReview);

  $("space-create-submit")?.addEventListener("click", async () => {
    const name = $("space-create-name").value.trim();
    const error = $("space-create-error");
    error.textContent = "";
    if (!name) {
      error.textContent = "Give the space a name.";
      return;
    }
    try {
      const space = await apiJson("/spaces", {
        method: "POST",
        body: JSON.stringify({ name, icon: $("space-create-icon").value }),
      });
      $("space-create-dialog").close();
      setActiveSpace(space.id);
    } catch (err) {
      error.textContent = err.message;
    }
  });

  $("space-edit-submit")?.addEventListener("click", async () => {
    const id = $("space-edit-id").value;
    const name = $("space-edit-name").value.trim();
    const error = $("space-edit-error");
    error.textContent = "";
    if (!name) {
      error.textContent = "Give the space a name.";
      return;
    }
    try {
      await apiJson(`/spaces/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ name, icon: $("space-edit-icon").value }),
      });
      $("space-edit-dialog").close();
      await loadSpaces();
      toast(`Renamed to “${name}”.`);
    } catch (err) {
      error.textContent = err.message;
    }
  });

  $("space-delete-submit")?.addEventListener("click", async () => {
    const id = $("space-delete-id").value;
    const error = $("space-delete-error");
    error.textContent = "";
    try {
      await apiJson(`/spaces/${encodeURIComponent(id)}`, { method: "DELETE" });
      $("space-delete-dialog").close();
      // Standing in the space you just deleted has to move you somewhere real,
      // and reload() alone would leave the header naming a space that is gone.
      if (activeSpaceId() === id) setActiveSpace("default");
      else await loadSpaces();
    } catch (err) {
      error.textContent = err.message;
    }
  });

  // Deliberately NOT loading the list here, see the "load spaces" step in
  // startApp(), which runs once there is a token.
}

initSpaceSwitcher();

// --- capture templates, Settings pane (extends Wave B) ------------------------------
//
// Every template is editable, the built-ins included (INBOX 409, "templates
// cant be edited"): the persona pane's shape, where editing a built-in saves
// a copy under the same name into the same preference the person's own live
// in (`templateCatalogue`, near the Capture form, is where that copy wins),
// the row then says "Edited" and grows Reset, and Reset removes the copy.
// The server's only refusal is two saved templates with one name
// (routes_settings._validated_templates).

// Which template (by name) the editor is currently editing, if any,
// same tracking `editingSkillName` does, so Save updates in place on a
// rename instead of leaving a duplicate behind.
let editingTemplateName = null;

// The saved list as stored: the person's own templates and the edited
// built-ins together, which is what every PUT writes back.
function customTemplates() {
  return (prefsCache && prefsCache.custom_templates) || [];
}

function startEditingTemplate(template) {
  editingTemplateName = template.name;
  const name = $("template-name");
  name.value = template.name;
  //: A built-in's edit keeps the built-in's name: the name is what makes the
  //: saved copy an edit of it rather than a fifth template beside it, so the
  //: field is shown but not for typing. A person who wants a "Journal" of a
  //: different name adds their own.
  name.readOnly = Boolean(template.builtin);
  $("template-description").value = template.description || "";
  $("template-body").value = template.content;
  $("template-add").textContent = "Save changes";
  $("template-cancel").classList.remove("hidden");
  $("template-status").textContent = template.builtin
    ? `Editing the built-in “${template.name}”…`
    : `Editing “${template.name}”…`;
  (template.builtin ? $("template-body") : name).focus();
}

function stopEditingTemplate() {
  editingTemplateName = null;
  for (const id of ["template-name", "template-description", "template-body"]) {
    $(id).value = "";
  }
  $("template-name").readOnly = false;
  $("template-add").textContent = "Add template";
  $("template-cancel").classList.add("hidden");
  $("template-status").textContent = "";
}

async function saveTemplateList(templates) {
  prefsCache = await apiJson("/preferences", {
    method: "PUT",
    body: JSON.stringify({ custom_templates: templates }),
  });
  await loadTemplates();
  renderTemplateSettings();
}

async function addTemplate() {
  const name = $("template-name").value.trim();
  const body = $("template-body").value.trim();
  const status = $("template-status");
  status.classList.remove("error");
  if (!name || !body) {
    status.classList.add("error");
    status.textContent = "Both a name and a template body are needed.";
    return;
  }
  // Only the entry being edited is dropped before the push, a genuine
  // rename (or, for a built-in, the previous edit of it). A name that
  // instead collides with a DIFFERENT saved template is left in place and
  // the save is rejected server-side (§_validated_templates) rather than
  // silently replacing someone else's saved text the way a same-named skill
  // would. A new template given a built-in's name becomes that built-in's
  // edit, which is what the name means now.
  const custom = customTemplates().filter((t) => t.name !== editingTemplateName);
  custom.push({
    name,
    description: $("template-description").value.trim(),
    content: body,
  });
  const wasEditing = editingTemplateName;
  try {
    await saveTemplateList(custom);
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
    return;
  }
  stopEditingTemplate();
  status.textContent = wasEditing ? `Updated “${name}”.` : `Saved “${name}”.`;
}

// One row in the Settings list, deliberately the same shape as `skillRow`
// (same classes, same chip-then-blurb-then-actions layout) so the two panes
// that manage a "named, user-editable list of markdown" read as one pattern
// rather than two. `textContent` throughout: template bodies are untrusted
// user text and are never rendered as HTML.
function templateRow(template) {
  const li = document.createElement("li");
  const row = document.createElement("div");
  row.className = "entry-meta skill-row";
  row.appendChild(chip(template.name, "item-title"));
  //: The persona row's two words: a shipped template that has been edited
  //: says so, and the word is what tells the reader the Reset beside it
  //: has something to restore.
  if (template.builtin) {
    row.appendChild(chip(template.overridden ? "Edited" : "Built-in", "item-label"));
  }
  const note = document.createElement("span");
  note.className = "muted skill-blurb";
  note.textContent = template.description || template.content;
  row.appendChild(note);
  const actions = document.createElement("span");
  actions.className = "entry-actions";
  actions.appendChild(
    smallButton("Edit", "Edit this template", () => startEditingTemplate(template))
  );
  if (template.builtin && template.overridden) {
    actions.appendChild(
      smallButton("Reset", "Restore the original template", async () => {
        if (editingTemplateName === template.name) stopEditingTemplate();
        await saveTemplateList(customTemplates().filter((t) => t.name !== template.name));
      })
    );
  }
  if (!template.builtin) {
    actions.appendChild(
      smallButton("Delete", "Remove this template", async () => {
        if (!(await confirmDialog(`Delete the “${template.name}” template?`))) return;
        if (editingTemplateName === template.name) stopEditingTemplate();
        await saveTemplateList(customTemplates().filter((t) => t.name !== template.name));
      })
    );
  }
  row.appendChild(actions);
  li.appendChild(row);
  return li;
}

async function renderTemplateSettings() {
  await loadTemplates();
  const list = $("template-list");
  list.replaceChildren();
  const { builtin, custom } = templateCatalogue();
  for (const template of [...custom, ...builtin]) list.appendChild(templateRow(template));
}

$("template-add")?.addEventListener("click", addTemplate);
$("template-cancel")?.addEventListener("click", stopEditingTemplate);


// Upgrade every dropdown in the app, and keep upgrading the ones that
// appear later. Last line of the file on purpose: by here every panel this
// script builds up front exists, and the observer inside covers the rest.
watchForSelects();

//: Clicking it does the one thing its name promises, and hands the pane back
//: to the follow logic by landing at the bottom, the next `scroll` event sets
//: `data-stuck` to "1" and the stream resumes carrying the view with it.
$("chat-jump-latest")?.addEventListener("click", () => {
  const pane = $("chat-messages");
  if (!pane) return;
  pane.scrollTo({ top: pane.scrollHeight, behavior: reducedMotionWanted() ? "auto" : "smooth" });
  pane.dataset.stuck = "1";
  syncChatJumpLatest();
});

//: The panel-wide half of "mark as unread": one gesture that puts every row
//: back to read, overrides included. See `forcedUnreadIds`.
$("notif-mark-all-read")?.addEventListener("click", () => {
  localStorage.setItem(NOTIFICATIONS_READ_KEY, String(Date.now()));
  setForcedUnreadIds(new Set());
  setForcedReadIds(new Set());
  openNotifications();
  toast("All notifications marked as read.");
});

// --- Find anything ------------------------------------------------------------
//
//: **One search over everything you keep, and over the app itself.**
//:
//: INBOX 270, the owner: *"this is a search for any and all content, items,
//: text, files everything. a full application wide semantic search which shows
//: content as well as features and actions etc. absolutely everything and what
//: shows can be filtered, sorted and toggled."*
//:
//: The engine was already here and nothing called it. `/search`
//: (routes_search.py over `search/engine.py`) ranks notes, documents, boards,
//: files, bookmarks and reminders in one list, keyword and meaning together,
//: with three scores, a plain-English explanation per hit and a count per kind
//: so an empty result can say whether nothing matched or nothing of that kind
//: is indexed. Measured against a live server before any of this was written:
//: a three-note, one-document notebook answers `?q=sourdough` with all four,
//: correctly ranked. The only reader of anything under `/search` in the whole
//: frontend was Settings, asking for a number.
//:
//: So this file is a front door, not a second search. What it adds on top of
//: the route is the half the route cannot have: the app's own actions. A
//: person looking for "dark mode" or "tensions" is searching, and a search
//: that answers only with documents sends them to the settings tree to hunt.
//: `paletteCommands()` is the existing list, so a command added there appears
//: here without anyone remembering this exists.

//: One icon per kind, the same glyph that kind wears everywhere else, plus
//: "action", which is this surface's own and is not a kind the index knows.
const FINDER_KINDS = [
  { key: "note", icon: "ph:note-pencil", one: "note", many: "notes" },
  { key: "document", icon: "ph:file-text", one: "document", many: "documents" },
  { key: "board", icon: "ph:squares-four", one: "board", many: "boards" },
  //: Its own kind since the index learned to tell a map from a board.
  //: Reported: "Mind maps don't show in the Find anything universal search".
  //: A previous pass renamed the board chip "boards & maps" and left the
  //: map filed as a board, so a map still wore a board's meaning and could
  //: not be asked for on its own; `search/index.py` now indexes it as `map`,
  //: with the words on its topics, and it wears the glyph a map wears in the
  //: Library and the tab strip.
  { key: "map", icon: "ph:tree-structure", one: "mind map", many: "mind maps" },
  { key: "file", icon: "ph:paperclip", one: "file", many: "files" },
  { key: "bookmark", icon: "ph:bookmark-simple", one: "link", many: "links" },
  { key: "reminder", icon: "ph:alarm", one: "reminder", many: "reminders" },
  { key: "action", icon: "ph:lightning", one: "action", many: "actions" },
];

let finderKind = "";       // "" is everything
let finderQuery = "";
let finderHits = [];
let finderCounts = {};
let finderTimer = null;
let finderRun = 0;         // so a slow answer cannot paint over a newer one
let finderActive = -1;     // which row the keyboard is on
let finderOpener = null;   // what to give focus back to

//: What pressing a result does, per kind. A row whose kind has no opener is
//: still drawn: knowing the thing exists and where it lives is most of the
//: answer, and a control that does nothing when pressed is the one thing worse
//: than no control, so those rows are not buttons.
//: Through the Library's own `openLibraryItem` wherever a kind is one of its
//: rows, rather than a second set of "how do I open a board" rules. That
//: function already knows a board opens its board and not the empty note the
//: board is stored in, which is exactly the mistake a fresh copy would make.
const FINDER_OPEN = {
  note: (hit) => { switchTab("notes"); flashEntry(hit.id); },
  document: (hit) => { switchTab("documents"); openDocument(hit.id); },
  board: (hit) => openLibraryItem({ kind: "board", id: hit.id }),
  map: (hit) => openLibraryItem({ kind: "map", id: hit.id }),
  file: (hit) => flashLibraryItem("file", hit.id),
  bookmark: (hit) => flashLibraryItem("link", hit.id),
  reminder: () => switchTab("reminders"),
};

function finderOverlay() { return document.getElementById("finder-overlay"); }

//: The app's own actions, matched here rather than sent to the server: they
//: are not in the index, they change with the tab you are on, and matching a
//: dozen labels in the browser is cheaper than a round trip.
function finderActions(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || typeof paletteCommands !== "function") return [];
  const out = [];
  for (const command of paletteCommands()) {
    const label = String(command.label || "").replace(/^ph:[\w-]+\s*/, "");
    const hay = label.toLowerCase();
    if (!words.every((word) => hay.includes(word))) continue;
    out.push({
      kind: "action",
      id: label,
      title: label,
      snippet: "",
      explain: ["an action in the app"],
      //: Ranked just under a real content hit on purpose: someone typing
      //: "sourdough" wants their notes, and someone typing "zoom in" gets no
      //: content hits at all, so the ordering only matters in the case where
      //: content exists and should win.
      score: 0.5,
      written: "",
      run: command.run,
    });
    if (out.length >= 6) break;
  }
  return out;
}

async function finderSearch() {
  const run = ++finderRun;
  const query = finderQuery.trim();
  const results = document.getElementById("finder-results");
  const summary = document.getElementById("finder-summary");
  if (!results) return;
  if (!query) {
    finderHits = [];
    finderCounts = {};
    finderRenderEmpty();
    return;
  }
  //: **No "Searching" flash.** Reported: "the 'searching...' text keeps
  //: suddenly appearing and disappearing and it feels jarring and not
  //: smooth". A local index answers in tens of milliseconds, so on every
  //: keystroke the word appeared and was replaced before it could be read: a
  //: label that existed only to blink. It is written only if the search is
  //: still going after a beat, which on this machine is almost never, and
  //: the previous count stays on screen until the new one replaces it, so
  //: the line never empties between two answers.
  const slow = setTimeout(() => {
    if (run === finderRun) summary.textContent = "Searching…";
  }, 400);
  //: `kind` is passed to the route, not filtered here, so a filtered search
  //: gets a *full page* of that kind rather than whatever survived a page of
  //: everything. Actions are filtered here because the route has never heard
  //: of them.
  const kindParam = finderKind && finderKind !== "action" ? `&kind=${finderKind}` : "";
  const body = await apiJson(
    `/search?q=${encodeURIComponent(query)}${kindParam}&limit=30`,
    { silent: true }
  ).catch(() => null);
  clearTimeout(slow);
  if (run !== finderRun) return; // a newer keystroke owns the screen now
  if (!body) {
    finderHits = [];
    finderCounts = {};
    results.replaceChildren();
    surfaceFailed(results, "results", finderSearch);
    return;
  }
  surfaceRecovered(results);
  const actions = finderKind && finderKind !== "action" ? [] : finderActions(query);
  const hits = finderKind === "action" ? [] : body.hits || [];
  //: **A chip counts what this search found, not what the index holds.**
  //: `body.counts` is the index's size per kind (the route says so), and
  //: beside "3 results" a chip reading "Notes 46" was read as 46 matches.
  //: Counted from an unfiltered page of hits, and kept while a kind filter
  //: is on, so the other chips still say how many of theirs the query
  //: found. A kind the index holds none of stays a zero either way.
  if (!finderKind) {
    const found = {};
    for (const hit of hits) found[hit.kind] = (found[hit.kind] || 0) + 1;
    for (const [kind, total] of Object.entries(body.counts || {})) {
      if (!total) found[kind] = 0;
    }
    finderCounts = found;
  }
  finderHits = [...hits, ...actions];
  finderRender();
}

//: Sorting is done here rather than asked of the route because two of the
//: three orders are about the answer set on screen, and one of them ("best
//: match") is the order the route already returned. Re-querying to reverse a
//: list would be a round trip to rearrange thirty rows.
function finderSorted() {
  const rows = [...finderHits];
  const sort = document.getElementById("finder-sort")?.value || "best";
  if (sort === "best") return rows.sort((a, b) => (b.score || 0) - (a.score || 0));
  const dir = sort === "newest" ? -1 : 1;
  return rows.sort((a, b) => {
    //: An action has no date, and an undated row sorted as the empty string
    //: would bunch every one of them at one end of a date sort. They keep
    //: their relative order and go last either way.
    if (!a.written && !b.written) return 0;
    if (!a.written) return 1;
    if (!b.written) return -1;
    return a.written < b.written ? dir : a.written > b.written ? -dir : 0;
  });
}

function finderRenderEmpty() {
  const results = document.getElementById("finder-results");
  const summary = document.getElementById("finder-summary");
  if (summary) summary.textContent = "";
  if (!results) return;
  results.replaceChildren();
  const box = document.createElement("div");
  box.className = "empty-state";
  const icon = document.createElement("i");
  icon.className = "ph ph-magnifying-glass empty-icon";
  icon.setAttribute("aria-hidden", "true");
  const title = document.createElement("p");
  title.className = "empty-title";
  title.textContent = "Search everything you keep";
  const body = document.createElement("p");
  body.textContent =
    "Notes, documents, boards, mind maps, files, links and reminders at once, by your words and by what they mean. Type to begin.";
  box.append(icon, title, body);
  results.appendChild(box);
  finderRenderFilters();
}

//: **Built once, updated in place.** Every search refreshes the counts, and a
//: first version rebuilt the whole row to show them. Measured: the chip you
//: had just pressed was replaced by a new node a moment later, so it reported
//: itself unpressed to anything reading it, and a keyboard user lost focus to
//: <body> on every filter change. The row is furniture; only its numbers and
//: its pressed state change.
//: Which ends of the kind row can still scroll, so the fade sits only on
//: an edge with more behind it (the owner, 2026-09-24: the last chip,
//: Actions, was faded with the row scrolled all the way to it).
function finderSyncFilterEdges(bar) {
  const max = bar.scrollWidth - bar.clientWidth;
  bar.classList.toggle("fade-start", bar.scrollLeft > 1);
  bar.classList.toggle("fade-end", max - bar.scrollLeft > 1);
}

function finderRenderFilters() {
  const bar = document.getElementById("finder-filters");
  if (!bar) return;
  if (!bar.dataset.edgesWired) {
    bar.dataset.edgesWired = "1";
    bar.addEventListener("scroll", () => finderSyncFilterEdges(bar), { passive: true });
    new ResizeObserver(() => finderSyncFilterEdges(bar)).observe(bar);
  }
  requestAnimationFrame(() => finderSyncFilterEdges(bar));
  const wanted = [
    { key: "", label: "Everything", count: null },
    ...FINDER_KINDS.map((kind) => ({
      key: kind.key,
      label: kind.many.charAt(0).toUpperCase() + kind.many.slice(1),
      //: A kind with nothing indexed still gets a chip, showing its own zero,
      //: because "there are no files" is an answer and a missing chip is not.
      //: Actions are counted by whatever the current query matches, so they
      //: carry no number at all rather than a misleading one.
      count: kind.key === "action" ? null : finderCounts[kind.key] ?? 0,
    })),
  ];
  if (!bar.children.length) {
    for (const row of wanted) {
      const chip = document.createElement("button");
      chip.type = "button";
      //: `.library-chip`, the app's own interactive filter chip
      //: (UI_MODERNISATION_PLAN Phase 2), not `.chip`, which is a *display*
      //: chip: accent-soft, 0.75rem, weight 600, meant for a status label.
      //: Reported with a screenshot: eight of them in a row read as eight
      //: badges rather than eight controls, at a size nothing else here uses.
      chip.className = "library-chip finder-chip";
      chip.dataset.kind = row.key;
      chip.addEventListener("click", () => {
        finderKind = finderKind === row.key ? "" : row.key;
        finderSearch();
      });
      bar.appendChild(chip);
    }
  }
  [...bar.children].forEach((chip, index) => {
    const row = wanted[index];
    if (!row) return;
    //: **A count only once there is something to count.** The chips used to
    //: read "Notes 0, Documents 0, Boards 0" before a single character had
    //: been typed, which is eight confident zeroes about a notebook nobody
    //: had searched: they are the index's counts for the *query*, and with
    //: no query they mean nothing. Reported with a screenshot.
    const showCount = row.count != null && finderQuery.trim();
    chip.textContent = showCount ? `${row.label} ${row.count}` : row.label;
    //: Kept, by the decision above ("there are no files" is an answer), but
    //: quieter: a zero is a fact, not a filter worth reaching for.
    chip.classList.toggle("is-zero", Boolean(showCount && row.count === 0 && finderKind !== row.key));
    //: `aria-pressed`, not a class alone: this is a filter that is on or off
    //: and a screen reader has to hear which. `.active` is the class the
    //: chip recipe paints from, and it is painted from the same fact rather
    //: than being the fact.
    chip.setAttribute("aria-pressed", String(finderKind === row.key));
    chip.classList.toggle("active", finderKind === row.key);
  });
}

function finderRender() {
  const results = document.getElementById("finder-results");
  const summary = document.getElementById("finder-summary");
  if (!results) return;
  finderRenderFilters();
  let rows = finderSorted();
  results.replaceChildren();
  finderActive = -1;
  if (!rows.length) {
    const box = document.createElement("div");
    box.className = "empty-state";
    const title = document.createElement("p");
    title.className = "empty-title";
    title.textContent = "Nothing matched";
    const body = document.createElement("p");
    //: Says *why* it is empty, which the counts make possible: nothing
    //: matched and nothing of that kind exists yet are different answers and
    //: a bare empty list renders them identically.
    const indexed = Object.values(finderCounts).reduce((sum, n) => sum + (n || 0), 0);
    body.textContent = indexed
      ? "Try fewer words, or take a filter off."
      : "Nothing is indexed yet. Save a note and it will appear here.";
    box.append(title, body);
    results.appendChild(box);
    if (summary) summary.textContent = "";
    return;
  }
  if (summary) {
    summary.textContent = `${rows.length} result${rows.length === 1 ? "" : "s"}`;
  }
  const icons = Object.fromEntries(FINDER_KINDS.map((k) => [k.key, k.icon]));
  const names = Object.fromEntries(FINDER_KINDS.map((k) => [k.key, k]));
  //: **Grouped by kind, once there is more than one kind on screen.**
  //: Reported: "the results could have better Information Architecture". A
  //: flat list of thirty rows mixing notes, documents and actions asks the
  //: reader to sort them by eye, which is the work the app should have done.
  //: A heading per kind, in the order the filter chips run, so the two agree
  //: about what order the world is in.
  //:
  //: Only when it helps: one kind, or a sort other than best match, and a
  //: heading would be a label on a list that needs none. A date sort in
  //: particular is a *cross-kind* question ("what changed lately"), and
  //: grouping it by kind would break exactly the order that was asked for.
  const sortMode = document.getElementById("finder-sort")?.value || "best";
  const kinds = [...new Set(rows.map((hit) => hit.kind))];
  const grouped = sortMode === "best" && kinds.length > 1;
  if (grouped) {
    //: By kind in the chips' own order, and within a kind by the score the
    //: sort already put them in. A stable sort is what keeps that second
    //: half true without sorting twice.
    const rank = Object.fromEntries(FINDER_KINDS.map((k, i) => [k.key, i]));
    rows = [...rows].sort((a, b) => (rank[a.kind] ?? 99) - (rank[b.kind] ?? 99));
  }
  let lastKind = null;
  rows.forEach((hit, index) => {
    if (grouped && hit.kind !== lastKind) {
      lastKind = hit.kind;
      const head = document.createElement("p");
      head.className = "finder-group muted";
      const many = rows.filter((row) => row.kind === hit.kind).length;
      const kind = names[hit.kind];
      //: A heading, so it starts with a capital: the names are the in-sentence
      //: nouns ("3 notes"), and printed alone they read as lowercase labels
      //: once the uppercase transform went (the owner: "all lowercase and
      //: hard to see"). The group's size beside it, muted.
      const word = kind ? (many === 1 ? kind.one : kind.many) : hit.kind;
      const label = document.createElement("span");
      label.textContent = word.charAt(0).toUpperCase() + word.slice(1);
      const count = document.createElement("span");
      count.className = "finder-group-count";
      count.textContent = String(many);
      head.replaceChildren(label, count);
      //: Not a `role="option"` inside the listbox: a heading is not
      //: selectable, and a screen reader walking the options would otherwise
      //: read the word "notes" as a result.
      head.setAttribute("aria-hidden", "true");
      results.appendChild(head);
    }
    const open = hit.run || FINDER_OPEN[hit.kind];
    const row = document.createElement(open ? "button" : "div");
    if (open) row.type = "button";
    row.className = "finder-row";
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", "false");
    row.dataset.index = String(index);
    const head = document.createElement("span");
    head.className = "finder-row-head";
    const title = document.createElement("span");
    title.className = "finder-row-title";
    //: `setNoteLabel`, not `setLabel`: a hit's title is the thing's own text
    //: and can begin with anything, a `#` or a `1.` included, so it must not
    //: go through the markdown renderer joined to an app-written icon token.
    setNoteLabel(title, icons[hit.kind] || "ph:dot", hit.title || "(untitled)", 70);
    head.appendChild(title);
    if (hit.written) {
      const when = document.createElement("span");
      when.className = "finder-row-when muted text-xs";
      //: A day the way the rest of the app writes one ("23 Sept"), not the
      //: ISO date the API sends; the year only when it is not this one.
      const day = /^\d{4}-\d\d-\d\d$/.test(hit.written) ? new Date(`${hit.written}T00:00:00`) : null;
      when.textContent = day && !Number.isNaN(day.getTime())
        ? day.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: day.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
        })
        : hit.written;
      if (day) when.title = day.toLocaleDateString(undefined, { dateStyle: "full" });
      head.appendChild(when);
    }
    row.appendChild(head);
    if (hit.snippet && hit.snippet !== hit.title) {
      const snippet = document.createElement("span");
      snippet.className = "finder-row-snippet muted";
      //: **Rendered, not printed.** Reported: "in the universal search,
      //: inline md isnt rendered or handled". `textContent` on a note's own
      //: text prints its asterisks and the literal text of any image it
      //: holds, which is the same report the chat's source cards had and is
      //: fixed here the same way. `compact`, because this is a two-line
      //: preview inside a row rather than a note body, and wiki links are
      //: unwrapped first since `renderInlineMarkdown` is inline-only and does
      //: not know `[[…]]`: without that a linked note prints its brackets.
      renderInlineMarkdown(
        snippet,
        //: Block markers go too: the snippet is a note's lines run together,
        //: so a heading's `##` lands mid-line ("test ## Introduction ... ###
        //: Adding"), where an inline renderer prints it. Stripped wherever
        //: one starts a word, the same rule the link labels use.
        hit.snippet
          .slice(0, 200)
          .replace(/\[\[([^[\]]{1,120})\]\]/g, "$1")
          .replace(/(^|\s)#{1,6}\s+/g, "$1")
          .replace(/(^|\s)>\s+/g, "$1"),
        null,
        true
      );
      row.appendChild(snippet);
    }
    //: One line of facts, not a row of chips: this is what the row *is*,
    //: which is DESIGN.md's `.library-file-meta` recipe ("short statements,
    //: dot separators, `--text-xs`, `--muted`, one rank"). Chips here read as
    //: things you could press, and two of them under every row turned the
    //: list into a field of badges. Reported with a screenshot.
    const reasons = (hit.explain || []).filter(Boolean);
    if (reasons.length) {
      const why = document.createElement("span");
      why.className = "finder-why muted";
      why.textContent = reasons.join(" \u00b7 ");
      row.appendChild(why);
    }
    if (open) {
      row.addEventListener("click", () => {
        closeFinder();
        open(hit);
      });
    }
    results.appendChild(row);
  });
}

//: Up and down move a highlight rather than focus, so the input keeps the
//: caret and you can keep typing: the shape every search field in the world
//: has, and the reason this is a `listbox` with `aria-activedescendant`
//: behaviour rather than a list of focusable buttons you tab through.
function finderMove(step) {
  const rows = [...document.querySelectorAll("#finder-results .finder-row")];
  if (!rows.length) return;
  if (finderActive >= 0 && rows[finderActive]) {
    rows[finderActive].setAttribute("aria-selected", "false");
    rows[finderActive].classList.remove("is-active");
  }
  finderActive = (finderActive + step + rows.length) % rows.length;
  const row = rows[finderActive];
  row.setAttribute("aria-selected", "true");
  row.classList.add("is-active");
  //: The list's own `scrollTop`, never `scrollIntoView`, which walks every
  //: scrolling ancestor including the page (DESIGN.md, the recipe index).
  const box = row.parentElement;
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
}

function openFinder(prefill = "") {
  const overlay = finderOverlay();
  if (!overlay) return;
  finderOpener = document.activeElement;
  overlay.classList.remove("hidden");
  const input = document.getElementById("finder-input");
  if (input) {
    if (prefill) input.value = prefill;
    finderQuery = input.value;
    input.focus();
    input.select();
  }
  if (finderQuery.trim()) finderSearch();
  else finderRenderEmpty();
}

function closeFinder() {
  const overlay = finderOverlay();
  if (!overlay || overlay.classList.contains("hidden")) return;
  overlay.classList.add("hidden");
  //: Focus goes back where it came from. A dialog that drops focus on <body>
  //: sends the next Tab to the top of the page, which is how a keyboard user
  //: loses their place.
  if (finderOpener && document.contains(finderOpener)) finderOpener.focus();
  finderOpener = null;
}

function wireFinder() {
  const overlay = finderOverlay();
  const input = document.getElementById("finder-input");
  if (!overlay || !input) return;
  input.addEventListener("input", () => {
    finderQuery = input.value;
    clearTimeout(finderTimer);
    //: Long enough that a typist does not fire a query per letter, short
    //: enough that the list feels attached to the keyboard. The abort is the
    //: `finderRun` counter rather than an AbortController because the route
    //: is cheap and a cancelled fetch mid-index-read is not.
    finderTimer = setTimeout(finderSearch, 180);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); finderMove(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); finderMove(-1); }
    else if (event.key === "Enter") {
      const rows = [...document.querySelectorAll("#finder-results .finder-row")];
      const row = rows[finderActive] || rows[0];
      if (row) { event.preventDefault(); row.click(); }
    }
  });
  document.getElementById("finder-sort")?.addEventListener("change", finderRender);
  document.getElementById("finder-close")?.addEventListener("click", closeFinder);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeFinder();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      //: Captured before anything else can treat Escape as its own: this is
      //: the topmost surface while it is open.
      event.stopPropagation();
      closeFinder();
    }
  }, true);
}
wireFinder();

// --- the boot kick-offs, last ------------------------------------------------
//
//: These two calls ran from the middle of app.js while it was one file
//: (initNotesSubtabs from the notification controls' wiring, initAuth after
//: the Wave F wiring), where every function they reach was already hoisted.
//: Split into files, that is no longer true: initNotesSubtabs reaches
//: activeSpaceId and loadSpaces (this file) and maybeShowOnboarding
//: (settings-wiring.js) synchronously, and initAuth's answer from
//: /auth/status can arrive between two script executions and run startApp,
//: which calls loadSpaces. So they are the last thing the last file does, when
//: every piece has been declared (appjs-split.md hazard 1). What ran after
//: them in the old order is declarations and listeners, none of which read
//: what they set up.
initNotesSubtabs();
initAuth();
