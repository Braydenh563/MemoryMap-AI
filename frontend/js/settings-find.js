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
const SETTING_ROW_SELECTOR = "h3, h4, label, .setting-check, .check-row, .checkbox-label, legend, .setting-label";

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
      if (el.closest(".help-body, .settings-index, .settings-pane-title, [aria-hidden='true'], .skeleton")) continue;
      //: Outermost only: a label inside a `.setting-check` is the same row.
      const outer = el.parentElement?.closest(SETTING_ROW_SELECTOR);
      if (outer && pane.contains(outer) && !outer.matches("h3, h4")) continue;
      const hiddenBy = el.closest(".hidden");
      if (hiddenBy && hiddenBy !== pane && pane.contains(hiddenBy)) continue;
      const text = settingRowText(el);
      if (text.length < 3 || text.length > 110) continue;
      const group = el.closest(".settings-group, details.settings-fold");
      const head = el.matches("h3, h4") ? null : group?.querySelector("h3, h4, summary h3");
      const where = head ? head.textContent.replace(/\s+/g, " ").trim() : "";
      const haystack = `${text} ${el.getAttribute("title") || ""} ${el.querySelector("input, select, textarea")?.getAttribute("aria-label") || ""}`.toLowerCase();
      rows.push({ section: name, sectionLabel, where, text, haystack, el, isHead: el.matches("h3, h4") });
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
    scored.push({ row, score });
  }
  scored.sort((a, b) => b.score - a.score);
  //: One line per text and section: "Models" is a head and also the first
  //: word of a label, and the same words twice is not two settings.
  const seen = new Set();
  const out = [];
  for (const { row } of scored) {
    const key = `${row.section}|${row.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
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

// --- the index of one section ------------------------------------------------------

const settingsIndexScrollers = new WeakSet();
let settingsIndexWatch = null;

//: The heads an index would list: the pane's group heads in order, not the
//: pane's own title, not the ones in a popover or a hidden group.
function settingsIndexHeads(pane) {
  const heads = [];
  for (const h of pane.querySelectorAll("h3")) {
    if (h.closest(".help-body, .settings-pane-title, .settings-index")) continue;
    if (!h.getClientRects().length) continue;
    const label = (h.dataset.indexLabel || h.textContent).replace(/\s+/g, " ").trim();
    if (!label || h === pane.querySelector(":scope > .help-head > h3")) continue;
    heads.push({ el: h, label });
  }
  return heads;
}

function settingsIndexOffset(nav) {
  return (nav ? nav.getBoundingClientRect().height : 0) + 8;
}

//: Where the scroller should stop for a head: its top just under the sticky
//: strip. The box's own `scrollTop`, never `scrollIntoView`, which walks every
//: scrollable ancestor (DESIGN.md, the outline recipe).
function settingsIndexGo(name, head) {
  const scroller = settingsScroller(name);
  const nav = $(`settings-${name}`)?.querySelector(":scope > .settings-index");
  if (!scroller) return;
  const delta = head.getBoundingClientRect().top - scroller.getBoundingClientRect().top - settingsIndexOffset(nav);
  scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: typeof reducedMotionWanted === "function" && reducedMotionWanted() ? "auto" : "smooth" });
  head.tabIndex = -1;
  head.focus({ preventScroll: true });
}

//: Mark the head the pane is scrolled to. `aria-current="location"` is the
//: whole state; the paint is the stylesheet's.
function settingsIndexMark(name) {
  const pane = $(`settings-${name}`);
  const nav = pane?.querySelector(":scope > .settings-index");
  const scroller = settingsScroller(name);
  if (!nav || !scroller) return;
  const line = scroller.getBoundingClientRect().top + settingsIndexOffset(nav) + 24;
  let current = 0;
  const links = [...nav.querySelectorAll(".settings-index-link")];
  links.forEach((link, i) => {
    const head = link._head;
    if (head?.isConnected && head.getBoundingClientRect().top <= line) current = i;
  });
  //: At the very bottom the last head may never reach the line.
  if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) current = links.length - 1;
  links.forEach((link, i) => {
    if (i === current) {
      if (link.getAttribute("aria-current") !== "location") link.setAttribute("aria-current", "location");
    } else if (link.hasAttribute("aria-current")) {
      link.removeAttribute("aria-current");
    }
  });
  //: Keep the marked link in the strip on a narrow window, by the strip's
  //: own scrollLeft.
  const on = links[current];
  if (on && nav.scrollWidth > nav.clientWidth) {
    const over = on.offsetLeft - nav.scrollLeft;
    if (over < 0 || over + on.offsetWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2;
  }
}

//: Build, refresh or remove the index for the section on screen. Cheap when
//: nothing changed (a signature of the heads), so it can run on every change
//: to the pane without looping on its own insertion.
function settingsIndexBuild(name) {
  const pane = $(`settings-${name}`);
  if (!pane || pane.classList.contains("hidden")) return;
  const scroller = settingsScroller(name);
  const existing = pane.querySelector(":scope > .settings-index");
  const heads = settingsIndexHeads(pane);
  const long = scroller && pane.scrollHeight > scroller.clientHeight * 1.5;
  if (heads.length < 4 || !long) {
    existing?.remove();
    return;
  }
  const signature = heads.map((h) => h.label).join("|");
  if (existing && existing.dataset.signature === signature) {
    existing.querySelectorAll(".settings-index-link").forEach((link, i) => {
      link._head = heads[i].el;
    });
    settingsIndexMark(name);
    return;
  }
  existing?.remove();
  const nav = document.createElement("nav");
  nav.className = "settings-index";
  nav.setAttribute("aria-label", "In this section");
  nav.dataset.signature = signature;
  for (const { el, label } of heads) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "settings-index-link";
    link.textContent = label;
    link._head = el;
    link.addEventListener("click", () => settingsIndexGo(name, link._head));
    nav.appendChild(link);
  }
  const anchor = pane.querySelector(":scope > .settings-pane-title, :scope > .help-head");
  if (anchor) anchor.after(nav);
  else pane.prepend(nav);
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
  if (pane.querySelectorAll("h3").length < 4) return;
  let timer = null;
  settingsIndexWatch = new MutationObserver((records) => {
    if (records.every((r) => r.target.closest?.(".settings-index"))) return;
    clearTimeout(timer);
    timer = setTimeout(build, 250);
  });
  settingsIndexWatch.observe(pane, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "open"] });
}
