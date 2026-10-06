// settings-find.js: finding your way about inside Settings (INBOX 444).
//
// Loaded on the first open of Settings (`LAZY_MODULES.settingsUi`, app.js), not
// at boot, so none of this is in the gzip budget `test_static_compression.py`
// counts. Everything here is called from settings.js behind a `typeof` guard,
// so a page that never loaded this file still has the nav, the section filter
// and the arrow keys.
//
// Two things, both measured against a pane that is 4,700px long at 1440x900
// with nothing to say where you are in it (scratchpad/ui-sweeps/settingsia.js):
//
// 1. **A setting is found, not only the section that mentions it.** The nav
//    search already hid the sections whose text did not contain the word.
//    Typing "similarity" then left one section and a person reading it for
//    the field. The results list below the search field names each matching
//    setting (a group head or a control's label) with the section and group
//    it is in, and a press opens the section, scrolls to the setting and
//    rings it the way a catalogue row's deep link does (`flashRevealed`).
//
// 2. **A long section has an index.** A strip of the section's own group
//    heads, sticky at the top of the pane, the one you are in marked from
//    `aria-current` (DESIGN.md, "A list that says where you are"). It exists
//    only where it earns its place: four group heads or more and a pane at
//    least one and a half windows tall.

//: The elements a person would call "a setting": a group head, or the label of
//: a control. The outermost match wins (a `label.setting-check` contains its
//: own `span`), and a label inside a help popover, the nav or a hidden group is
//: not one.
const SETTING_ROW_SELECTOR = "h3, h4, label, .setting-check, .check-row, .checkbox-label, legend, .setting-label, #help-topics summary";

//: A row's visible words: its text without the helper copy beside it.
function settingRowText(el) {
  const clone = el.cloneNode(true);
  for (const extra of clone.querySelectorAll("small, .muted, .help-body, .chip, button, select, input, textarea, .fold-help-slot, .status")) {
    extra.remove();
  }
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

//: Every findable setting in the Settings panes, read live from the DOM (the
//: panes are filled by JS after their first paint, so an index built at start
//: would be searching empty panes) and skipping what a person cannot see:
//: a pane's own hidden state does not count, a hidden group inside it does.
function settingRows() {
  const rows = [];
  for (const pane of document.querySelectorAll("#settings-modal .settings-section")) {
    const name = pane.id.slice("settings-".length);
    const nav = document.querySelector(`#settings-nav [data-section="${name}"]`);
    const sectionLabel = nav ? nav.textContent.trim() : name;
    for (const el of pane.querySelectorAll(SETTING_ROW_SELECTOR)) {
      if (el.closest(".help-body, .settings-pane-title, [aria-hidden='true'], .skeleton")) continue;
      //: Outermost only: a label inside a `.setting-check` is the same row.
      const outer = el.parentElement?.closest(SETTING_ROW_SELECTOR);
      if (outer && pane.contains(outer) && !outer.matches("h3, h4")) continue;
      const hiddenBy = el.closest(".hidden");
      if (hiddenBy && hiddenBy !== pane && pane.contains(hiddenBy)) continue;
      const text = settingRowText(el);
      if (text.length < 3 || text.length > 110) continue;
      const group = el.closest(".settings-group, details.settings-fold");
      const head = el.matches("h3, h4") ? null : group?.querySelector("h3, h4, summary h3");
      //: A help topic says which group of topics it is in (INBOX 448).
      const where = head ? head.textContent.replace(/\s+/g, " ").trim() : el.closest("[data-help-group]")?.dataset.helpGroup || "";
      //: `data-keys` and `data-find`: a help topic's keywords and text, so it is found by
      //: the words a person types, not only by its title.
      const haystack = `${text} ${el.getAttribute("title") || ""} ${el.querySelector("input, select, textarea")?.getAttribute("aria-label") || ""} ${el.dataset.keys || ""} ${el.dataset.find || ""}`.toLowerCase();
      rows.push({ section: name, sectionLabel, where, text, haystack, keys: el.dataset.keys || "", el, isHead: el.matches("h3, h4") });
    }
  }
  return rows;
}

//: Matching settings for a typed query: every word must appear, a row that
//: starts with the word or has it at a word start ranks above one that merely
//: contains it, and a group head above a control. Capped, because a list of
//: forty is the section filter over again.
function findSettings(query, limit = 8) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const row of settingRows()) {
    if (!words.every((w) => row.haystack.includes(w))) continue;
    const lower = row.text.toLowerCase();
    let score = row.isHead ? 1 : 0;
    for (const w of words) {
      if (lower.startsWith(w)) score += 3;
      else if (lower.includes(` ${w}`)) score += 2;
      else if (lower.includes(w)) score += 1;
    }
    //: Among help topics, one whose keywords hold the words as typed
    //: outranks one whose text merely contains them somewhere ("suggested
    //: downloads" is the model topic's phrase, and only scattered words in the
    //: editor's). Settings rows have no keywords, and are listed first anyway.
    const phrase = words.join(" ");
    if (row.keys.includes(phrase)) score += 3;
    else if (row.haystack.includes(phrase)) score += 1;
    scored.push({ row, score });
  }
  scored.sort((a, b) => b.score - a.score);
  //: One line per text and section: "Models" is a head and also the first
  //: word of a label, and the same words twice is not two settings.
  const seen = new Set();
  const settings = [];
  const topics = [];
  for (const { row } of scored) {
    const key = `${row.section}|${row.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (row.keys ? topics : settings).push(row);
  }
  //: **Settings first, then help topics** (INBOX 448): "password" is a
  //: question about the password settings before it is one about the help
  //: entry on passwords, so a topic never outranks a setting. Two places are
  //: kept for topics when both match, so a word that names a setting still
  //: shows where its help is.
  const room = topics.length ? Math.max(limit - 2, limit - topics.length) : limit;
  const out = settings.slice(0, room);
  return out.concat(topics.slice(0, limit - out.length));
}

//: Open the section and bring the setting into view. `flashRevealed` scrolls
//: only when it is not already in the window and draws the same ring every
//: catalogue deep link draws.
function openSettingRow(row) {
  showSettingsSection(row.section);
  requestAnimationFrame(() => {
    const el = row.el;
    if (!el.isConnected) return;
    for (let fold = el.closest("details"); fold; fold = fold.parentElement?.closest("details")) {
      fold.open = true;
    }
    if (!el.getClientRects().length) return;
    flashRevealed(el);
    const control = el.matches("label") ? el.control || el.querySelector("input, select, textarea") : el.querySelector?.("input, select, textarea");
    if (control && control.getClientRects().length) {
      (typeof focusSelect === "function" && control.tagName === "SELECT" ? focusSelect : (c) => c.focus({ preventScroll: true }))(control);
    } else {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
    }
  });
}

//: Draw the results under the search field. Returns how many there were.
function renderSettingResults(query) {
  const list = $("settings-results");
  if (!list) return 0;
  list.replaceChildren();
  const found = query.trim().length >= 2 ? findSettings(query) : [];
  for (const row of found) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-result";
    const name = document.createElement("span");
    name.className = "settings-result-name";
    name.textContent = row.text;
    const where = document.createElement("span");
    where.className = "settings-result-where";
    where.textContent = row.where && row.where !== row.text ? `${row.sectionLabel} · ${row.where}` : row.sectionLabel;
    button.append(name, where);
    button.addEventListener("click", () => openSettingRow(row));
    item.appendChild(button);
    list.appendChild(item);
  }
  list.classList.toggle("hidden", !found.length);
  return found.length;
}

//: Arrow keys inside the results, and from the search field into them.
function settingResultsKey(event) {
  const buttons = [...document.querySelectorAll("#settings-results .settings-result")];
  if (!buttons.length) return false;
  const at = buttons.indexOf(document.activeElement);
  if (event.key === "ArrowDown") {
    buttons[Math.min(buttons.length - 1, at + 1)].focus();
    return true;
  }
  if (event.key === "ArrowUp") {
    if (at <= 0) $("settings-search")?.focus();
    else buttons[at - 1].focus();
    return true;
  }
  return false;
}

// --- the index of one section: its groups, nested in the sidebar (INBOX 622) -------
//
// The owner, of the strip this replaced: "in settings idk if this navigation
// is the right way to go about it". It was a row of the pane's group heads
// in the pane's dock that scrolled sideways, with a scrollbar and the last
// label clipped (Tools it can use). The groups are the sidebar's second level
// now, under the pane they belong to, as VS Code and Linear draw settings: a
// press scrolls the pane to the group, and the group you are reading is
// marked as you scroll. On a phone the sidebar is the jump list, which gains
// the same groups under its pane's option.

const settingsIndexScrollers = new WeakSet();
let settingsIndexWatch = null;

//: The heads an index would list: the pane's group heads in order, not the
//: pane's own title, not the ones in a popover or a hidden group.
function settingsIndexHeads(pane) {
  const heads = [];
  const title = settingsPaneTitleHead(pane);
  for (const h of pane.querySelectorAll("h3")) {
    if (h.closest(".help-body, .settings-pane-title")) continue;
    if (!h.getClientRects().length) continue;
    const label = (h.dataset.indexLabel || h.textContent).replace(/\s+/g, " ").trim();
    if (!label || (title && h === title.querySelector("h3"))) continue;
    heads.push({ el: h, label });
  }
  return heads;
}

//: The pane's own title: a `.settings-pane-title`, or a `.help-head` only
//: when it opens the pane. A `.help-head` further down is a group's head
//: (Tasks ends with "Quit MemoryMap" as one), and anchoring the strip after
//: it put the strip at the bottom of the pane (INBOX 541).
function settingsPaneTitleHead(pane) {
  const title = pane.querySelector(":scope > .settings-pane-title");
  if (title) return title;
  const first = [...pane.children].find((c) => c.getClientRects().length);
  return first?.matches(".help-head, .dock") ? first : null;
}

//: A head stops just under the pane's sticky dock (INBOX 599).
function settingsIndexOffset(pane) {
  const bar = pane && settingsPaneTitleHead(pane);
  return (bar?.matches(".dock") ? bar.getBoundingClientRect().height : 0) + 8;
}

//: The sidebar's group list, when it belongs to this pane.
function settingsIndexList(name) {
  const list = document.querySelector("#settings-nav .settings-nav-groups");
  return list && list.dataset.section === name ? list : null;
}

//: Where the scroller should stop for a head: its top just under the sticky
//: dock. The box's own `scrollTop`, never `scrollIntoView`, which walks every
//: scrollable ancestor (DESIGN.md, the outline recipe).
function settingsIndexGo(name, head) {
  const scroller = settingsScroller(name);
  if (!scroller) return;
  const delta = head.getBoundingClientRect().top - scroller.getBoundingClientRect().top - settingsIndexOffset($(`settings-${name}`));
  //: **The head clicked is the head marked** (INBOX 459, the owner: on
  //: Personas the strip "only goes on the first or last one"). Heads near a
  //: short pane's end can never reach the line, so the scroll position
  //: alone marked the last; the choice holds until the reader scrolls by
  //: hand (wheel, touch, keys), which `_indexUnpin` listens for.
  scroller._indexPinned = head;
  if (!scroller._indexUnpin) {
    scroller._indexUnpin = () => { scroller._indexPinned = null; };
    for (const type of ["wheel", "touchstart", "keydown"]) scroller.addEventListener(type, scroller._indexUnpin, { passive: true });
  }
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: typeof reducedMotionWanted === "function" && reducedMotionWanted() ? "auto" : "smooth" });
  settingsIndexMark(name);
  head.tabIndex = -1;
  head.focus({ preventScroll: true });
}

//: Mark the head the pane is scrolled to. `aria-current="location"` is the
//: whole state; the paint is the stylesheet's.
function settingsIndexMark(name) {
  const nav = settingsIndexList(name);
  const scroller = settingsScroller(name);
  if (!nav || !scroller) return;
  const line = scroller.getBoundingClientRect().top + settingsIndexOffset($(`settings-${name}`)) + 24;
  let current = 0;
  const links = [...nav.querySelectorAll(".settings-nav-group")];
  links.forEach((link, i) => {
    const head = link._head;
    if (head?.isConnected && head.getBoundingClientRect().top <= line) current = i;
  });
  const pinned = links.findIndex((link) => scroller._indexPinned && link._head === scroller._indexPinned);
  if (pinned >= 0) current = pinned;
  //: At the very bottom the last head may never reach the line.
  else if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) current = links.length - 1;
  links.forEach((link, i) => {
    if (i === current) {
      if (link.getAttribute("aria-current") !== "location") link.setAttribute("aria-current", "location");
    } else if (link.hasAttribute("aria-current")) {
      link.removeAttribute("aria-current");
    }
  });
  //: The phone's jump list follows the group you are reading.
  const jump = document.querySelector(".settings-jump");
  const value = `${name}#${current}`;
  if (jump && jump.value !== value && jump.querySelector(`option[value="${CSS.escape(value)}"]`)) jump.value = value;
}

//: Take the groups out of the sidebar and the jump list.
function settingsIndexClear() {
  document.querySelector("#settings-nav .settings-nav-groups")?.remove();
  document.querySelectorAll(".settings-jump option[data-group]").forEach((o) => o.remove());
}

//: The jump list's group options (a native `<select>` on a phone, built by
//: phone-shell.js): indented under their pane's option, `pane#index`. The
//: jump list's own handler clicks `button[data-section="pane#index"]`, which
//: matches nothing, so a group is this file's to answer.
function settingsIndexJump(name, heads) {
  const jump = document.querySelector(".settings-jump");
  const option = jump?.querySelector(`option[value="${CSS.escape(name)}"]`);
  if (!option) return;
  let at = option;
  heads.forEach(({ label }, i) => {
    const row = document.createElement("option");
    row.value = `${name}#${i}`;
    row.textContent = ` ${label}`;
    row.dataset.group = "";
    at.after(row);
    at = row;
  });
  if (jump._groupsWired) return;
  jump._groupsWired = true;
  jump.addEventListener("change", () => {
    const [pane, at] = jump.value.split("#");
    const link = settingsIndexList(pane)?.querySelectorAll(".settings-nav-group")[Number(at)];
    if (link) settingsIndexGo(pane, link._head);
  });
}

//: Build, refresh or remove the index for the section on screen. Cheap when
//: nothing changed (a signature of the heads), so it can run on every change
//: to the pane without looping on its own insertion.
function settingsIndexBuild(name) {
  const pane = $(`settings-${name}`);
  if (!pane || pane.classList.contains("hidden")) return;
  const scroller = settingsScroller(name);
  const existing = settingsIndexList(name);
  const heads = settingsIndexHeads(pane);
  //: **Every section with three or more groups has one** (INBOX 541, the
  //: owner: "some dont have any at all"). It used to need four heads and a
  //: pane half again as tall as the window, so whether a section had a strip
  //: changed with the window's height.
  if (heads.length < 3 || !scroller) {
    settingsIndexClear();
    return;
  }
  const signature = heads.map((h) => h.label).join("|");
  if (existing && existing.dataset.signature === signature) {
    existing.querySelectorAll(".settings-nav-group").forEach((link, i) => {
      link._head = heads[i].el;
    });
    settingsIndexMark(name);
    return;
  }
  settingsIndexClear();
  const list = document.createElement("div");
  list.className = "settings-nav-groups";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "In this section");
  list.dataset.section = name;
  list.dataset.signature = signature;
  for (const { el, label } of heads) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "settings-nav-group";
    link.textContent = label;
    link._head = el;
    link.addEventListener("click", () => settingsIndexGo(name, link._head));
    list.appendChild(link);
  }
  //: Under the pane's own link: the sidebar's second level.
  $("settings-nav")?.querySelector(`button[data-section="${CSS.escape(name)}"]`)?.after(list);
  glideStrip(list); // its rail slides as you scroll the pane (shell-reminders.js)
  settingsIndexJump(name, heads);
  if (scroller && !settingsIndexScrollers.has(scroller)) {
    settingsIndexScrollers.add(scroller);
    let queued = false;
    scroller.addEventListener(
      "scroll",
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          settingsIndexMark(currentSettingsSection);
        });
      },
      { passive: true }
    );
  }
  settingsIndexMark(name);
}

//: Called when a section opens: build now, again once its async content has
//: arrived, and keep it current while the pane changes.
function settingsIndexWatchSection(name) {
  settingsIndexWatch?.disconnect();
  settingsIndexWatch = null;
  const pane = $(`settings-${name}`);
  if (!pane) return;
  const build = () => {
    if (currentSettingsSection === name) settingsIndexBuild(name);
  };
  requestAnimationFrame(build);
  setTimeout(build, 700);
  if (pane.querySelectorAll("h3").length < 3) return;
  let timer = null;
  settingsIndexWatch = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(build, 250);
  });
  settingsIndexWatch.observe(pane, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "open"] });
}

// --- the help topics (INBOX 448 (1)) ----------------------------------------------
//
// Settings, Help lists every entry the Guide reads (`GET /help/topics`, from
// `help_chat.HELP_TOPICS`), grouped, instead of thirteen hand-copied topics
// that had drifted from it. Each group is a head and a `.help-accordion`, the
// recipe the page already used; a topic is a `details` whose summary carries
// the entry's keywords in `data-keys` and its text in `data-find`, so the
// search above finds "percentage"
// or "bookmarks" as a row and a press opens that topic. Fetched once per page
// load; a failed fetch is tried again on the next open.

let helpTopicsLoad = null;

function helpTopicLink(link) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "linklike";
  if (link.tab) button.dataset.gotoTab = link.tab;
  if (link.section) button.dataset.gotoSection = link.section;
  if (link.target) button.dataset.gotoTarget = link.target;
  button.textContent = `Open ${link.label}`;
  return button;
}

// --- emphasis (INBOX 520) -----------------------------------------------------------
//
// The topics are the Guide's facts, so they stay plain text; the page decorates
// its own copy: a hotkey is a `kbd`, a place (`Settings, Models`, `Library tab,
// Contents`) a `strong`, a control or a quoted phrase a `code` chip. Names come
// from the page's own nav and tabs, so a rename cannot leave this behind.

const HELP_NAME_ESCAPE = /[.*+?^${}()|[\]\\]/g;
const HELP_NAMED_KEYS = String.raw`Ctrl|Alt|Shift|Enter|Esc|Tab|Space|Delete|F\d{1,2}|Up|Down|Left|Right|Home|End|PageUp|PageDown`;
const HELP_KEYS = [
  String.raw`(?:Ctrl|Cmd|Alt|Shift|Option)(?:\/(?:Cmd|Ctrl))?(?:\+(?:${HELP_NAMED_KEYS}|[A-Za-z0-9](?![A-Za-z])|[\[\]\\/.,=-]))+`,
  String.raw`\b(?:Escape|Esc|Enter|Tab|Space|F\d{1,2}|Delete(?= (?:removes|deletes)))\b`,
  //: "Press m then r": the two letters are keys.
  String.raw`(?<=\b[Pp]ress )[a-z](?= then [a-z](?![\w']))|(?<=\b[Pp]ress [a-z] then )[a-z](?![\w']| letter)`,
].join("|");
const HELP_PLACE = String.raw`[A-Z][A-Za-z]*(?: (?:and|&) [A-Z][A-Za-z]*)?(?![A-Za-z]| [a-z])`;
let helpEmphasisKey = "";
let helpEmphasisRx = null;
let helpNameLists = null;

function helpAlternation(names) {
  const list = names.map((n) => n.replace(HELP_NAME_ESCAPE, "\\$&")).sort((a, b) => b.length - a.length);
  return list.length ? list.join("|") : "(?!)";
}

//: `text` as [tag, piece] pairs: tag is "kbd", "strong", "code" or "" (plain).
function helpEmphasis(text, places, tabs) {
  const key = `${places.join("|")}#${tabs.join("|")}`;
  if (key !== helpEmphasisKey) {
    helpEmphasisKey = key;
    const place = `Settings(?:, then|,| ->| →) (?:${helpAlternation(places)})(?![A-Za-z])|Settings(?: ->| →) [A-Z][a-z]+`;
    const tab = `(?:${helpAlternation(tabs)})(?: tab(?:, ${HELP_PLACE})?|, ${HELP_PLACE})`;
    const control = String.raw`(?<=\b[Pp]ress )([A-Z][A-Za-z]*(?: [a-z]+){0,2})(?=[:,.;)]| to\b| and\b| or\b)`;
    helpEmphasisRx = new RegExp(`(${HELP_KEYS})|(${place}|${tab})|${control}|"([^"\\n]{2,60})"`, "g");
  }
  const out = [];
  let at = 0;
  for (const m of text.matchAll(helpEmphasisRx)) {
    if (m.index > at) out.push(["", text.slice(at, m.index)]);
    out.push([m[1] ? "kbd" : m[2] ? "strong" : "code", m[1] || m[2] || m[3] || m[4]]);
    at = m.index + m[0].length;
  }
  if (at < text.length || !out.length) out.push(["", text.slice(at)]);
  return out;
}

//: The text in `parent`: emphasis as elements, the typed words marked inside.
function helpFill(parent, text, rx) {
  helpNameLists ||= [
    [...document.querySelectorAll("#settings-nav button[data-section]")].map((b) => b.textContent.trim()),
    [...document.querySelectorAll("#tab-bar [data-tab] .tab-label")].map((b) => b.textContent.trim()),
  ];
  for (const [tag, piece] of helpEmphasis(text, ...helpNameLists)) {
    const host = tag ? document.createElement(tag) : parent;
    helpMarks(host, piece, rx);
    if (tag) parent.append(host);
  }
}

//: Text into `parent`, the typed words wrapped in `<mark>` (DOM nodes only).
function helpMarks(parent, text, rx) {
  let at = 0;
  for (const m of rx ? text.matchAll(rx) : []) {
    parent.append(text.slice(at, m.index));
    const mark = document.createElement("mark");
    mark.className = "help-hit";
    mark.textContent = m[0];
    parent.append(mark);
    at = m.index + m[0].length;
  }
  parent.append(text.slice(at));
}

//: Draw (or redraw, with the words marked) a topic's title, text and place.
function helpTopicPaint(details, rx) {
  const topic = details._topic;
  const [summary, body, where] = details.children;
  summary.replaceChildren();
  helpMarks(summary, topic.title, rx);
  body.replaceChildren();
  helpFill(body, topic.body, rx);
  const path = where?.firstChild;
  if (topic.path && path) {
    path.replaceChildren("Where: ");
    helpFill(path, topic.path, rx);
  }
}

function helpTopicRow(topic) {
  const details = document.createElement("details");
  details.dataset.topic = topic.id;
  details._topic = topic;
  const summary = document.createElement("summary");
  summary.dataset.keys = topic.find.toLowerCase();
  summary.dataset.find = topic.body.toLowerCase();
  details._help = [topic.title, topic.find, topic.body, topic.path].join(" ").toLowerCase();
  details.append(summary, document.createElement("p"));
  //: A link to Help from inside Help goes nowhere.
  const link = topic.link && topic.link.section !== "help" ? topic.link : null;
  if (topic.path || link) {
    const where = document.createElement("p");
    where.className = "help-topic-links muted";
    where.appendChild(document.createElement("span"));
    if (topic.path && link) where.append(" · ");
    if (link) where.appendChild(helpTopicLink(link));
    details.appendChild(where);
  }
  helpTopicPaint(details, null);
  return details;
}

// --- search (INBOX 520) -------------------------------------------------------------

//: The typed words, lower-cased; a topic must hold every one.
function helpQueryTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function helpMatches(terms, text) {
  return terms.every((term) => text.includes(term));
}

let helpOpenBefore = null;

//: Hide what does not match, open what does with the words marked, hide a
//: group head whose topics are all gone, and say so when nothing is left.
//: Clearing puts every fold back as it was.
function helpApplySearch(query) {
  const box = $("help-topics");
  if (!box) return;
  const terms = helpQueryTerms(query);
  const searching = terms.length > 0;
  const escaped = terms.map((t) => t.replace(HELP_NAME_ESCAPE, "\\$&")).sort((a, b) => b.length - a.length);
  const rx = searching ? new RegExp(escaped.join("|"), "gi") : null;
  if (searching && !helpOpenBefore) helpOpenBefore = new Map([...box.querySelectorAll("details")].map((d) => [d, d.open]));
  let shown = 0;
  let total = 0;
  for (const list of box.querySelectorAll(".help-accordion")) {
    let any = false;
    for (const details of list.children) {
      total += 1;
      const hit = helpMatches(terms, details._help);
      details.classList.toggle("hidden", !hit);
      if (!hit) continue;
      any = true;
      shown += 1;
      details.open = searching || (helpOpenBefore?.get(details) ?? details.open);
      helpTopicPaint(details, rx);
    }
    list.classList.toggle("hidden", !any);
    list.previousElementSibling?.classList.toggle("hidden", !any);
  }
  //: The tours and the Atlas row are sections of the page too.
  let others = 0;
  for (const group of document.querySelectorAll("#settings-help > .settings-group")) {
    const hit = helpMatches(terms, group.textContent.toLowerCase());
    group.classList.toggle("hidden", !hit);
    if (hit) others += 1;
  }
  if (!searching) helpOpenBefore = null;
  $("help-empty")?.classList.toggle("hidden", !searching || shown + others > 0);
  const status = $("help-search-status");
  if (status) {
    status.textContent = searching ? `${shown} of ${total} topics` : "";
    status.classList.toggle("hidden", !searching);
  }
}

function helpSearchBind() {
  const input = $("help-search");
  if (!input || input._bound) return;
  input._bound = true;
  input.addEventListener("input", () => helpApplySearch(input.value));
  input.addEventListener("keydown", (e) => {
    //: Escape clears the query before it closes the window.
    if (e.key !== "Escape" || !input.value) return;
    e.stopPropagation();
    e.preventDefault();
    input.value = "";
    helpApplySearch("");
  });
}

function renderHelpTopics() {
  helpSearchBind();
  const box = $("help-topics");
  if (!box || helpTopicsLoad) return helpTopicsLoad;
  helpTopicsLoad = apiJson("/help/topics")
    .then((data) => {
      const parts = [];
      for (const group of data.groups || []) {
        const head = document.createElement("h3");
        head.textContent = group.title;
        const list = document.createElement("div");
        list.className = "help-accordion";
        list.dataset.helpGroup = group.title;
        for (const topic of group.topics) list.appendChild(helpTopicRow(topic));
        parts.push(head, list);
      }
      box.replaceChildren(...parts);
      box.removeAttribute("aria-busy");
      if ($("help-search")?.value) helpApplySearch($("help-search").value);
      if (typeof currentSettingsSection !== "undefined" && currentSettingsSection === "help") settingsIndexBuild("help");
    })
    .catch(() => {
      helpTopicsLoad = null;
      const line = document.createElement("p");
      line.className = "muted";
      line.textContent = "The help topics did not load. Ask Atlas below, or reopen Settings to try again.";
      box.replaceChildren(line);
      box.removeAttribute("aria-busy");
    });
  return helpTopicsLoad;
}
