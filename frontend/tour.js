// The guided tour: one card at a time, anchored to the control it describes.
//
// The app already had a welcome (`#onboarding-overlay`, app.js): a card in the
// middle of the screen with an icon, a title and a paragraph. It says what
// MemoryMap is, and it is the right shape for that, but it cannot say WHERE
// anything is, because it covers the thing it is talking about. That gap is
// what this file fills, and the owner named it: "there is no guided tour and
// introduction, with positioned popup cards with back, next, skip, card
// tutorial tour numbers 1/?, dimmed background".
//
// Three rules shape everything below:
//
// 1. **A step is a real element plus a sentence.** No step invents a picture
//    of a control; it names a selector, and if that selector is missing or
//    hidden right now the step is dropped rather than pointed at nothing.
//    That is what makes the tour survive a narrow window, a control that
//    moved, and every later change to the markup: a step whose element has
//    gone simply stops being shown, and the counter renumbers.
// 2. **Short, and in sections.** The owner: "the tour cant be too long
//    because I dont want users skipping it or finding it too hard and giving
//    up". The first run offers "The basics" alone, four steps; the rest are
//    there to be asked for, whole or one section at a time, from Settings,
//    help and guide. TOUR_SECTIONS is the one place that knows what a section
//    is: the replay buttons are built from it, so a section added to that
//    table needs no markup and no handler.
// 3. **It never traps anybody.** Skip is on every card, Escape does the same
//    thing, the choice is remembered beside `onboardingDone`, and nothing
//    here ever opens itself again once it has been finished or skipped.

// The geometry, in CSS pixels. These are window coordinates rather than
// design tokens: they are arguments to `getBoundingClientRect` arithmetic,
// which is why they live here and not in the stylesheet.
const TOUR_GAP = 12; // between the highlighted control and the card
const TOUR_EDGE = 12; // the closest the card may come to the window's edge
const TOUR_PAD = 6; // how far the bright cut-out is held off the control

// The sections, in the order the whole tour plays them. Each step is:
//
//   target  a CSS selector for the real element the card points at
//   side    where the card would like to sit; it flips and clamps if it
//           cannot fit there, and never covers the element
//   title   three or four words
//   text    one sentence, sentence case, no exclamation marks
//   tab     the tab that has to be showing for the target to be visible
//   notes   the Notes sub-tab ("capture", "browse") the target lives in
const TOUR_SECTIONS = [
  {
    id: "basics",
    label: "The basics",
    blurb: "Where everything lives, and what is running",
    steps: [
      {
        target: "#tab-bar",
        side: "bottom",
        title: "Your tabs",
        text: "Every part of MemoryMap is one of these. Notes is where you write, the others read what you wrote.",
      },
      {
        target: "#space-switcher-btn",
        side: "bottom",
        title: "Spaces",
        text: "A space is a separate notebook, work and home for instance, and this says which one you are looking at.",
      },
      {
        target: "#ai-status",
        side: "top",
        title: "The AI, on this machine",
        text: "This dot says what the local AI is doing. Nothing you write is ever sent anywhere.",
      },
      {
        target: "#settings-btn",
        side: "bottom",
        title: "Settings",
        text: "Themes, the model, backups and this tour again all live behind the gear.",
      },
    ],
  },
  {
    id: "note",
    label: "Writing a note",
    blurb: "The core loop: type, file, save",
    steps: [
      {
        target: "#entry-content",
        side: "bottom",
        tab: "notes",
        notes: "capture",
        title: "Type anything",
        text: "A thought, a list, a link. Type [[two brackets]] to point at another note by its first few words.",
      },
      {
        target: "#entry-category",
        side: "top",
        tab: "notes",
        notes: "capture",
        title: "Filing is automatic",
        text: "Leave the category alone and the AI files the note for you, or set it here when you would rather decide.",
      },
      {
        target: "#entry-tags",
        side: "top",
        tab: "notes",
        notes: "capture",
        title: "Tags, if you want them",
        text: "Optional and comma separated, and the AI suggests some as you type.",
      },
      {
        target: "#save-btn",
        side: "top",
        tab: "notes",
        notes: "capture",
        title: "Save",
        text: "That is the whole loop. Save as draft keeps a note out of the notebook until you are ready.",
      },
    ],
  },
  {
    id: "finding",
    label: "Finding things",
    blurb: "Search, filters and asking questions",
    steps: [
      {
        target: "#note-search",
        side: "bottom",
        tab: "notes",
        notes: "browse",
        title: "Search your notes",
        text: "Type a word here to filter the list as you go.",
      },
      {
        target: "#notes-filter-menu",
        side: "bottom",
        tab: "notes",
        notes: "browse",
        title: "Match by meaning",
        text: "Semantic search finds notes that mean the same thing without sharing a word with what you typed.",
      },
      {
        target: "#status-command",
        side: "top",
        title: "Jump anywhere",
        text: "Ctrl and K, or a press here, opens the command palette to search and to run anything by name.",
      },
      {
        target: "#tab-btn-chat",
        side: "bottom",
        title: "Ask your notebook",
        text: "Chat answers questions from your own notes, and cites the ones it used.",
      },
    ],
  },
  {
    id: "maps",
    label: "Boards and maps",
    blurb: "The graph, the timeline and the library",
    steps: [
      {
        target: "#tab-btn-graph",
        side: "bottom",
        title: "The map",
        text: "Graph draws how your notes connect, and lets you drag and zoom around them.",
      },
      {
        target: "#tab-btn-timeline",
        side: "bottom",
        title: "In order",
        text: "Timeline is the same notebook by time, which is the view that shows a thread taking shape.",
      },
      {
        target: "#tab-btn-library",
        side: "bottom",
        title: "Everything you made",
        text: "Library holds boards, mind maps, documents and every file you have added.",
      },
    ],
  },
];

// The run in progress, or null. `steps` is a flattened copy rather than a
// reference into the table above, because a step whose element turns out to be
// hidden is spliced out of it, and the table has to stay whole for the next
// run (a window widened between two runs brings that step back).
let tourRun = null;

// --- helpers ----------------------------------------------------------------

//: "Visible" here means "worth pointing at": in the document, laid out, and
//: not painted out. Three separate ways to be invisible, and all three happen
//: in this app: `.hidden` (display: none, so a zero box), a responsive rule
//: that drops a control below a width (also a zero box), and an element faded
//: to nothing mid-transition. A step that survives all three has a rectangle
//: the cut-out can sit on.
function tourVisible(el) {
  if (!el || !el.isConnected) return false;
  const box = el.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return false;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return Number(style.opacity || "1") > 0.05;
}

//: The element a step actually points at, which is not always the element it
//: names. `enhanceSelect` (app.js) wraps every `<select>` in the app in a
//: `.select-shell` and puts a button in front of it, leaving the native
//: control in place but out of the layout: measured on the capture form's
//: category picker, `#entry-category` is a 0x0 box behind a 129x30 opener, so
//: a step naming it would be dropped for having nothing to point at while the
//: control it means sits right there on screen. The same rule DESIGN.md
//: already states for focus ("never `select.focus()`", the native control is
//: not the thing the person is looking at), applied to geometry.
function tourAnchorFor(el) {
  return el ? el.closest(".select-shell") || el : el;
}

//: **Set, measure, correct by the difference, never trust the first number.**
//: DESIGN.md's rule for any popup placed in the window's own coordinates, and
//: it is not defensive programming: a `position: fixed` element takes its
//: frame from the nearest ancestor carrying a `filter`, `transform` or
//: `backdrop-filter`, and this app puts a filter on `.card` whenever the
//: background art is on. A word menu measured with the art on once asked for
//: `left: 952` and drew at 1245. The tour's three elements are children of
//: `<body>` precisely so that cannot happen, and the correction pass stays
//: anyway: it costs one extra `getBoundingClientRect` per step and it is the
//: difference between a card beside a button and a card in another postcode.
function tourPlaceFixed(el, left, top) {
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
  const box = el.getBoundingClientRect();
  const dx = left - box.left;
  const dy = top - box.top;
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    el.style.left = `${Math.round(left + dx)}px`;
    el.style.top = `${Math.round(top + dy)}px`;
  }
}

function tourClamp(value, low, high) {
  // `low` wins when the window is narrower than the card plus its two
  // margins: a negative range has to resolve to the near edge rather than to
  // a number outside the window on the other side.
  return Math.max(low, Math.min(value, high));
}

function tourOverlap(a, b) {
  const w = Math.min(a.left + a.width, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.top + a.height, b.bottom) - Math.max(a.top, b.top);
  return w > 0 && h > 0 ? w * h : 0;
}

//: One candidate box per side, each already clamped into the window, so the
//: choice below is made between boxes that are all legal rather than between
//: boxes that would have to be fixed up afterwards. The preferred side leads,
//: its opposite follows (a card that does not fit below a control almost
//: always fits above it), then the two perpendicular ones.
function tourCandidates(target, side, size) {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const maxLeft = vw - TOUR_EDGE - size.width;
  const maxTop = vh - TOUR_EDGE - size.height;
  const centreX = tourClamp(
    target.left + target.width / 2 - size.width / 2,
    TOUR_EDGE,
    Math.max(TOUR_EDGE, maxLeft)
  );
  const centreY = tourClamp(
    target.top + target.height / 2 - size.height / 2,
    TOUR_EDGE,
    Math.max(TOUR_EDGE, maxTop)
  );
  const boxes = {
    bottom: { left: centreX, top: target.bottom + TOUR_GAP },
    top: { left: centreX, top: target.top - TOUR_GAP - size.height },
    right: { left: target.right + TOUR_GAP, top: centreY },
    left: { left: target.left - TOUR_GAP - size.width, top: centreY },
  };
  const opposite = { bottom: "top", top: "bottom", left: "right", right: "left" };
  const order = [side, opposite[side], "bottom", "top", "right", "left"];
  const seen = new Set();
  const out = [];
  for (const name of order) {
    if (!boxes[name] || seen.has(name)) continue;
    seen.add(name);
    const raw = boxes[name];
    // Whether the side it asked for actually had the room is recorded BEFORE
    // clamping, because clamping always produces a box inside the window and
    // would otherwise make every side look as though it fitted.
    const fits =
      raw.left >= TOUR_EDGE - 0.5 &&
      raw.top >= TOUR_EDGE - 0.5 &&
      raw.left <= maxLeft + 0.5 &&
      raw.top <= maxTop + 0.5;
    out.push({
      name,
      fits,
      left: tourClamp(raw.left, TOUR_EDGE, Math.max(TOUR_EDGE, maxLeft)),
      top: tourClamp(raw.top, TOUR_EDGE, Math.max(TOUR_EDGE, maxTop)),
      width: size.width,
      height: size.height,
    });
  }
  return out;
}

//: The choice: a side that leaves the control uncovered beats one that does
//: not, and among equals the side the step asked for wins. Covering the
//: control is the one failure this whole file exists to avoid, so it is
//: weighted far above not quite fitting: a card pushed against the edge of the
//: window is still readable, a card sitting on top of the thing it is
//: describing is the centred slide carousel again.
function tourChoose(target, side, size) {
  let best = null;
  for (const box of tourCandidates(target, side, size)) {
    const score = tourOverlap(box, target) * 1000 + (box.fits ? 0 : 1);
    if (!best || score < best.score) best = { ...box, score };
  }
  return best;
}

// --- painting one step ------------------------------------------------------

//: The cut-out. The dim is this element's own `box-shadow`, spread past the
//: far corner of any window, so the hole in the dim IS this box and the
//: control inside it is drawn by the page at full strength. The alternative,
//: four rectangles arranged around the control, needs all four kept in step on
//: every scroll and resize, and gets it wrong on exactly the frames nobody
//: watches.
function tourSpotlight(target) {
  const spot = document.getElementById("tour-spot");
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const left = Math.max(0, target.left - TOUR_PAD);
  const top = Math.max(0, target.top - TOUR_PAD);
  const right = Math.min(vw, target.right + TOUR_PAD);
  const bottom = Math.min(vh, target.bottom + TOUR_PAD);
  spot.style.width = `${Math.round(right - left)}px`;
  spot.style.height = `${Math.round(bottom - top)}px`;
  tourPlaceFixed(spot, left, top);
}

//: A target below the fold is reached by moving the nearest scrolling
//: ancestor's own `scrollTop`, never by `scrollIntoView`: DESIGN.md's rule for
//: bringing a marked row into view, and the reason is that `scrollIntoView`
//: walks every scrolling ancestor including the page, which here would mean
//: the whole tab shifting under a card already positioned against it.
function tourBringIntoView(el) {
  const vh = document.documentElement.clientHeight;
  let node = el.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const scrolls =
      /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
    if (scrolls) {
      const box = el.getBoundingClientRect();
      const host = node.getBoundingClientRect();
      if (box.top < host.top + TOUR_EDGE || box.bottom > host.bottom - TOUR_EDGE) {
        node.scrollTop += box.top - host.top - (host.height - box.height) / 2;
      }
      return;
    }
    node = node.parentElement;
  }
  const box = el.getBoundingClientRect();
  if (box.top < TOUR_EDGE || box.bottom > vh - TOUR_EDGE) {
    const scroller = document.scrollingElement || document.documentElement;
    scroller.scrollTop += box.top - (vh - box.height) / 2;
  }
}

function tourPosition() {
  if (!tourRun || !tourRun.el) return;
  const card = document.getElementById("tour-card");
  const target = tourRun.el.getBoundingClientRect();
  tourSpotlight(target);
  // The card's own size is measured on screen, with this step's text already
  // in it: the height changes by a whole line between steps, and a placement
  // computed from the previous step's height is a card that overlaps.
  const size = card.getBoundingClientRect();
  const place = tourChoose(target, tourRun.step.side, size);
  card.dataset.side = place.name;
  tourPlaceFixed(card, place.left, place.top);
}

function tourRender() {
  const run = tourRun;
  const total = run.steps.length;
  document.getElementById("tour-section").textContent = run.step.sectionLabel;
  // "3 of 7", the owner's "card tutorial tour numbers". It counts the steps of
  // THIS run (one section, or all of them), and it renumbers when a step is
  // dropped for having no element, so it can never promise a step the tour is
  // not going to show.
  document.getElementById("tour-count").textContent = `${run.index + 1} of ${total}`;
  document.getElementById("tour-title").textContent = run.step.title;
  document.getElementById("tour-text").textContent = run.step.text;
  document.getElementById("tour-back").disabled = run.index === 0;
  document.getElementById("tour-next").textContent =
    run.index === total - 1 ? "Done" : "Next";
}

async function tourFrame() {
  // Two frames: one for the tab switch or sub-tab change to take effect, one
  // for the layout that follows it. Measuring in the first frame reads the
  // outgoing tab's geometry, which is how a card ends up beside where a
  // control used to be.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );
}

//: Getting the app to the place where this step's element is on screen. Both
//: calls are guarded rather than assumed: they live in app.js, which is loaded
//: before this file, and a page served without it should fail loudly there
//: rather than quietly here.
async function tourNavigate(step) {
  if (step.tab && typeof switchTab === "function") {
    if (localStorage.getItem("activeTab") !== step.tab) await switchTab(step.tab);
  }
  if (step.notes && typeof showNotesSection === "function") showNotesSection(step.notes);
  await tourFrame();
}

async function tourShow() {
  const run = tourRun;
  while (run.index >= 0 && run.index < run.steps.length) {
    const step = run.steps[run.index];
    await tourNavigate(step);
    // The awaits above give the tour time to have been skipped, or restarted
    // from Settings, while a tab was loading. Whatever happens next belongs to
    // whichever run is current, not to this one.
    if (tourRun !== run) return;
    const el = tourAnchorFor(document.querySelector(step.target));
    if (!tourVisible(el)) {
      // A step with nothing to point at is dropped from this run, rather than
      // shown empty or left pointing at the corner of the window.
      run.steps.splice(run.index, 1);
      if (run.direction < 0) run.index -= 1;
      if (run.index < 0) {
        run.index = 0;
        run.direction = 1;
      }
      continue;
    }
    run.el = el;
    run.step = step;
    tourRender();
    tourBringIntoView(el);
    tourPosition();
    // Focus lands inside the card, on the control that moves the tour on, so
    // Enter and Space do the obvious thing the moment a card appears. The card
    // itself is the `aria-modal` dialog, so app.js's Tab trap keeps focus in
    // here until the tour ends.
    document.getElementById("tour-next").focus();
    return;
  }
  tourClose(true);
}

// --- the run ----------------------------------------------------------------

function tourStepsFor(sectionId) {
  const steps = [];
  for (const section of TOUR_SECTIONS) {
    if (sectionId && section.id !== sectionId) continue;
    for (const step of section.steps) {
      // Present in the markup at all is the cheap half of the test and it is
      // stable (a control in a tab that is not showing is still in the DOM);
      // whether it can actually be seen is decided in `tourShow`, once the
      // tour has navigated to it.
      if (document.querySelector(step.target)) {
        steps.push({ ...step, sectionLabel: section.label });
      }
    }
  }
  return steps;
}

function openTour(sectionId) {
  const steps = tourStepsFor(sectionId || null);
  if (!steps.length) {
    if (typeof toast === "function") {
      toast("There is nothing to show in that part of the tour.");
    }
    return;
  }
  tourRun = {
    steps,
    index: 0,
    direction: 1,
    el: null,
    step: null,
    // Where the focus came from, so it can be handed back exactly there when
    // the tour ends, whether it ends at the last card, at Skip or at Escape.
    returnFocus: document.activeElement,
  };
  for (const id of ["tour-block", "tour-spot", "tour-card"]) {
    document.getElementById(id).classList.remove("hidden");
  }
  tourShow();
}

function tourClose(finished) {
  if (!tourRun) return;
  const run = tourRun;
  tourRun = null;
  for (const id of ["tour-block", "tour-spot", "tour-card"]) {
    document.getElementById(id).classList.add("hidden");
  }
  // Finished or skipped, the answer is the same: this person has been offered
  // the tour and nothing may offer it to them again by itself. Kept beside
  // `onboardingDone`, and mirrored to the notebook's own preferences by
  // app.js's MIRRORED_UI_EXTRAS, because a desktop shell that loses its
  // profile is exactly how "onboarding shows every time" was reported.
  try {
    localStorage.setItem("tourDone", "1");
  } catch (error) {
    // A browser with storage blocked still gets the tour, it just cannot
    // remember that it did. Refusing to run would be the worse failure.
  }
  run.returnFocus?.focus?.();
  if (finished && typeof toast === "function") {
    toast("That is the tour. Settings, help and guide has it again whenever you want it.");
  }
}

function tourNext() {
  if (!tourRun) return;
  if (tourRun.index >= tourRun.steps.length - 1) {
    tourClose(true);
    return;
  }
  tourRun.index += 1;
  tourRun.direction = 1;
  tourShow();
}

function tourBack() {
  if (!tourRun || tourRun.index === 0) return;
  tourRun.index -= 1;
  tourRun.direction = -1;
  tourShow();
}

// --- wiring -----------------------------------------------------------------

document.getElementById("tour-next").addEventListener("click", tourNext);
document.getElementById("tour-back").addEventListener("click", tourBack);
document.getElementById("tour-skip").addEventListener("click", () => tourClose(false));

//: Captured, and it stops the event: the arrow keys move between tabs in this
//: app and Escape closes whatever is open, and both would fire underneath a
//: tour that is using them for its own steps. Tab is deliberately NOT handled
//: here: the card is a `[role="dialog"][aria-modal="true"]`, which is what
//: app.js's own trap looks for, so focus is already held inside it by the
//: app's one implementation of that rule rather than by a second one.
document.addEventListener(
  "keydown",
  (event) => {
    if (!tourRun) return;
    const key = event.key;
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      tourClose(false);
    } else if (key === "ArrowRight" || key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      tourNext();
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      tourBack();
    } else if (key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
      // A focused button already turns Enter into a click of its own; this is
      // for the case where focus is on the card rather than on a control.
      event.preventDefault();
      tourNext();
    }
  },
  true
);

//: A window resized, or a surface scrolled under a step, moves the control the
//: card is pointing at, and a card left where it was is then pointing at
//: nothing. Captured on scroll so it hears scrolling inside a panel too, which
//: does not bubble.
function tourReflow() {
  if (!tourRun || !tourRun.el) return;
  if (!tourVisible(tourRun.el)) {
    // The control went away under the tour (a window narrowed past the width
    // that shows it). The step goes with it rather than the card hanging on.
    tourShow();
    return;
  }
  tourPosition();
}
window.addEventListener("resize", tourReflow);
window.addEventListener("scroll", tourReflow, true);

//: Settings, help and guide: one filled button for the whole tour and one
//: ghost per section, built from TOUR_SECTIONS so a section added to that
//: table arrives here on its own. The settings modal is closed first, because
//: the tour points at controls the modal is covering.
function renderTourReplay() {
  const box = document.getElementById("tour-replay-buttons");
  if (!box) return;
  box.replaceChildren();
  const start = (sectionId) => {
    if (typeof closeSettingsModal === "function") closeSettingsModal();
    // On the next frame, not in the same one as the close: the first step's
    // rectangle is measured against the page the modal was covering.
    requestAnimationFrame(() => openTour(sectionId));
  };
  const all = document.createElement("button");
  all.type = "button";
  all.className = "small";
  all.textContent = "Start the tour";
  all.addEventListener("click", () => start(null));
  box.appendChild(all);
  for (const section of TOUR_SECTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small";
    button.textContent = section.label;
    button.title = section.blurb;
    button.addEventListener("click", () => start(section.id));
    box.appendChild(button);
  }
}

//: The strip is built once, as soon as there is a document to build it into.
//: This file is the last script on the page, so the else branch is the branch
//: that runs in practice; the listener is for the case where a later change
//: moves the tag up into the head, where the box would not exist yet.
function tourWireReplay() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderTourReplay);
  } else {
    renderTourReplay();
  }
}

tourWireReplay();
