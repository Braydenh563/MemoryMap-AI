// app-palette.js: the Ctrl/Cmd-K palette's window, that is opening and closing
// it, matching what is typed against the app's commands and places (never its
// content: that is Find anything's, INBOX 666), drawing the rows and the
// preview, and its keyboard. Moved out of
// settings-panes.js on 2026-10-05 (the boot-script gzip budget, ratchet in
// tests/test_static_compression.py): it opens only by a person's chord or a
// click on "Commands", so none of it is needed to draw the first screen.
// Loaded on first use by `LAZY_MODULES.appPalette` (app.js), whose stand-in
// for `openPalette` fetches this file and then calls the real one.
//
// **What stayed at boot, and why.** `paletteCommands` (the registry of rows),
// `catalogueRun`, `paletteKeys`, `paletteAbouts` and `paletteRowParts` are
// read synchronously by other surfaces that are not the palette: Quick access
// on the dashboard, Find anything's action rows, and the Tools and features
// dialog. A stand-in returns a promise, so those could not be lazy without
// making their callers asynchronous. `closePalette` and `renderPalette` are
// called from boot code only behind a "the palette is open" check, and only
// `openPalette` opens it, so the file is always in by then.
//
// The palette's three listeners (the input, its keys, the backdrop) were
// top-level wiring in settings-wiring.js; they are the last lines here, and
// run when the file loads, which is before `openPalette` shows the overlay.

let paletteIndex = 0;

//: The usage ledger's counts (core/usage.py, WORLD_CLASS_PLAN H9): with
//: nothing typed, the commands this person runs most come first.
const paletteUsage = new Map();

//: A command's name in the ledger (`usageFeatureName`, navigation.js).
function paletteFeature(match) {
  return usageFeatureName(match.label);
}

//: Every run goes through here, so a command run by click and by Enter is
//: counted once either way. The handoff row ("Search everything for") is a
//: way into another surface, not a feature, and is not counted.
function paletteRun(match) {
  closePalette();
  if (!match.handoff) {
    const name = paletteFeature(match);
    if (name) usageCount(name);
  }
  match.run();
}

async function openPalette() {
  //: Opened early by settings-wiring.js's wrapper while this file loaded: what was typed
  //: meanwhile stays, and an Enter pressed meanwhile runs the first row.
  const early = window.paletteEarly;
  window.paletteEarly = null;
  if (early) $("palette-input").removeEventListener("keydown", early.onKey);
  overlayReturnFocus = early ? early.returnFocus : document.activeElement;
  const typed = early ? $("palette-input").value : "";
  $("palette-overlay").classList.remove("hidden");
  $("palette-input").value = typed;
  paletteIndex = 0;
  renderPalette(typed);
  quickAddAttach($("palette-input"), "palette");
  $("palette-input").focus();
  const first = early?.enter && paletteMatches(typed)[0];
  if (first) return paletteRun(first);

  apiJson("/usage/summary", { method: "POST", body: JSON.stringify({ known: [] }), silent: true })
    .then((res) => {
      paletteUsage.clear();
      for (const f of res.features || []) paletteUsage.set(f.name, f.count);
      if (!$("palette-input").value) renderPalette("");
    })
    .catch(() => {});
}

function closePalette() {
  $("palette-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

//: Read a field that is *supposed* to be a string, without letting one bad
//: record throw the whole palette away (a command's label and keywords are the
//: fields read now, and a row built from a name the person typed, a category,
//: may not be a string).
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
  //: The notes rows (`notesPaletteCommands`, below, INBOX 432): a
  //: category to go to, a #tag to show, Move for the note in hand.
  const commands = [...paletteCommands(), ...notesPaletteCommands(lowered)]
    //: UX-08: `keywords`, other words for a row ("trash", "theme").
    .filter((c) => paletteText(`${c.label} ${c.keywords || ""}`).includes(lowered))
    .map((c) => (c.group ? c : { ...c, group: "Everywhere" }));
  if (!lowered) {
    //: Most used first, within each group, so a group's heading still
    //: comes once; ties keep the registry's own order (a stable sort).
    const used = (c) => paletteUsage.get(paletteFeature(c)) || 0;
    const groups = [...new Set(commands.map((c) => c.group))];
    return groups.flatMap((g) => commands.filter((c) => c.group === g).sort((a, b) => used(b) - used(a)));
  }

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

  //: **The palette does not search what you keep** (INBOX 666). Notes,
  //: documents, files, boards, reminders and conversations are Find anything's:
  //: the palette is commands and places in the app (tabs, sub-tabs, Settings
  //: pages, actions, a category, a tag). Typed text always ends with one row
  //: that carries it to Find anything, searched at once; when no command
  //: matched it is the only row, so it is the lit one and Enter takes it.
  const typed = query.trim();
  const handoff = {
    group: "Search",
    label: `ph:magnifying-glass Search everything for \u201c${typed}\u201d`,
    about: "Find anything searches your notes, documents, files and the app.",
    handoff: true,
    run: () => openFinder(typed),
  };
  //: The act the words describe, first (quickadd.js, CHAT_PLAN decision 50):
  //: "remind me friday 9 dentist" is a reminder, its chips under the box.
  //: Over a board, a sentence that arranges it (whiteboard-commands.js).
  const act = (typeof quickAddPaletteRow === "function" ? quickAddPaletteRow(query) : null)
    || (typeof wbPaletteActRow === "function" ? wbPaletteActRow(query) : null);
  return [...(act ? [act] : []), ...commands, handoff];
}

//: **The rich picker** (rich-picker.js, DESIGN.md's recipe index): the "/"
//: menu's rows, group headings and preview, so the palette and the block
//: menu are one object. The keyboard is unchanged: `paletteKeydown` moves
//: `paletteIndex` and redraws; the pointer lights the row it is over, so
//: Enter and a click always mean the same row.
function renderPalette(query) {
  const list = $("palette-list");
  const matches = paletteMatches(query);
  const needle = query.trim().toLowerCase();
  const abouts = paletteAbouts();
  paletteIndex = Math.min(paletteIndex, Math.max(0, matches.length - 1));
  list.replaceChildren();
  let lastGroup = null;
  const rows = [];
  matches.forEach((match, index) => {
    // A heading whenever the group changes; not an option, so the keys skip it.
    if (match.group && match.group !== lastGroup) {
      list.appendChild(richPickerGroup(match.group, { className: "palette-group-header" }));
      lastGroup = match.group;
    }
    const parts = paletteRowParts(match, abouts);
    const row = richPickerRow({
      ...parts,
      //: The letters marked only where the label is what matched: a note
      //: found by its body would otherwise light letters scattered over a
      //: title that never contained the query.
      query: needle && parts.label.toLowerCase().includes(needle) ? needle : "",
      id: `palette-row-${index}`,
    });
    row.addEventListener("click", () => paletteRun(match));
    row.addEventListener("mousemove", () => {
      if (paletteIndex === index) return;
      paletteIndex = index;
      paletteLight(rows, matches, abouts);
    });
    list.appendChild(row);
    rows.push(row);
  });
  if (!matches.length) {
    const li = document.createElement("li");
    li.className = "muted palette-empty";
    li.textContent = "Run a command or go to a place. Type to see matches.";
    list.appendChild(li);
  }
  paletteLight(rows, matches, abouts);
}

//: Light the chosen row, tell the input which it is (the input keeps the
//: focus, so it carries `aria-activedescendant`), and show the row in the
//: pane beside the list: what it does and its key.
//: The pane hides itself below 44rem (the stylesheet).
function paletteLight(rows, matches, abouts) {
  const lit = richPickerSetActive($("palette-list"), rows, paletteIndex);
  const input = $("palette-input");
  if (lit) input.setAttribute("aria-activedescendant", lit.id);
  else input.removeAttribute("aria-activedescendant");
  const pane = $("palette-preview");
  const match = matches[paletteIndex];
  pane.classList.toggle("hidden", !match);
  if (!match) return;
  const parts = paletteRowParts(match, abouts);
  richPickerPreview(pane, {
    ...parts,
    keys: parts.keys.replace(/^M (\w)$/, "M then $1"),
    keysLead: "Press",
    keysTail: "to do it without the palette.",
  });
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
    //: The row may focus an editor (New note), and the Enter went on into
    //: it: measured, every note started from here began with a blank line.
    event.preventDefault();
    paletteRun(matches[paletteIndex]);
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

// Wired here, not at boot: see the header.
$("palette-input").addEventListener("input", () => {
  paletteIndex = 0;
  renderPalette($("palette-input").value);
});
$("palette-input").addEventListener("keydown", paletteKeydown);
wireBackdropClose($("palette-overlay"), () => closePalette());

// ---- from palette.js (search-boot-1005): notesPaletteCommands ----
// Moved whole. Every use is in this file, so it is not needed before this file loads.

function notesPaletteCommands(query = "") {
  const rows = [];
  const ids = paletteNotesInHand();
  if (ids.length) {
    const one = ids.length === 1 ? allEntries.find((e) => e.id === ids[0]) : null;
    rows.push({
      group: "This note",
      label: `ph:folder-open Move ${one ? "note" : "notes"} to category`,
      about: one ? `Now in ${one.category}.` : `${ids.length} selected notes.`,
      run: paletteLater(() => chooseNoteCategory(ids, one?.category || "")),
    });
    rows.push({
      group: "This note",
      label: `ph:tag Add or remove tags on ${one ? "this note" : "these notes"}`,
      about: one ? `${one.tags.length ? one.tags.map((t) => `#${t}`).join(" ") : "No tags yet."}` : `${ids.length} selected notes.`,
      run: paletteLater(() => openBulkTags(ids)),
    });
  }
  //: Tidy (INBOX 691): the reviews, and two of them by name.
  rows.push({
    group: "Notes",
    label: "ph:broom Tidy notes, links and tags",
    about: "Weak links, stray tags, notes without a category, duplicates, old reminders. No AI needed.",
    run: paletteLater(() => openTidySheet()),
  });
  rows.push({
    group: "Notes",
    label: "ph:link Name link reasons",
    about: "Say what two linked notes share instead of “similar in meaning”.",
    run: paletteLater(() => openTidySheet("link-reasons")),
  });
  rows.push({
    group: "Notes",
    label: "ph:copy-simple Find duplicate notes",
    about: "Notes that say much the same thing, merged into one.",
    run: paletteLater(() => openTidySheet("duplicates")),
  });
  rows.push({
    group: "Tags",
    label: "ph:hash Manage tags",
    about: "Rename, merge or remove tags across every note.",
    run: paletteLater(() => openTagsSheet()),
  });
  rows.push({
    group: "Categories",
    label: "ph:sliders-horizontal Manage categories",
    about: "Rename, merge, split or delete categories.",
    run: paletteLater(() => openManageCategories()),
  });
  if (!query) return rows;
  const counts = new Map();
  for (const e of allEntries) if (!e.is_draft) counts.set(e.category, (counts.get(e.category) || 0) + 1);
  for (const [name, n] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
    rows.push({
      group: "Categories",
      label: `ph:folder Go to category: ${name}`,
      about: `${n} ${n === 1 ? "note" : "notes"}`,
      run: paletteLater(() => paletteGoToCategory(name)),
    });
  }
  if (query.startsWith("#")) {
    const typed = query.slice(1).trim();
    const tags = [...new Set(allEntries.flatMap((e) => e.tags || []))]
      .filter((t) => !/\s/.test(t) && t.toLowerCase().startsWith(typed))
      .sort()
      .slice(0, 6);
    if (typed && !/\s/.test(typed) && !tags.some((t) => t.toLowerCase() === typed)) tags.push(typed);
    for (const tag of tags) {
      rows.push({ group: "Tags", label: `ph:tag Show notes tagged #${tag}`, run: paletteLater(() => filterNotesByTag(tag)) });
    }
  }
  return rows;
}
