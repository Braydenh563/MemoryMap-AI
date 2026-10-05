// app-palette.js: the Ctrl/Cmd-K palette's window, that is opening and closing
// it, matching what is typed against every kind of thing the app holds,
// drawing the rows and the preview, and its keyboard. Moved out of
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

let paletteReminders = [];
let paletteConversations = [];
//: Files and boards, so the palette resolves every kind of thing this app
//: holds rather than four of six. REDESIGN.md R7.3 asks for exactly this, 
//: "one universal picker... resolving notes, documents, files and maps
//: alike", and it is the difference between a jump-to-note box and the way
//: you actually move around the app.
let paletteMedia = [];
let paletteBoards = [];
//: The usage ledger's counts (core/usage.py, WORLD_CLASS_PLAN H9): with
//: nothing typed, the commands this person runs most come first.
const paletteUsage = new Map();

//: A command's name in the ledger (`usageFeatureName`, navigation.js).
function paletteFeature(match) {
  return usageFeatureName(match.label);
}

//: Every run goes through here, so a command run by click and by Enter is
//: counted once either way. Notes, documents and the other found things are
//: places, not features, and are not counted.
function paletteRun(match) {
  closePalette();
  if (!match.entry && !["Notes", "Documents", "Reminders", "Conversations", "Files", "Boards & maps"].includes(match.group)) {
    const name = paletteFeature(match);
    if (name) usageCount(name);
  }
  match.run();
}

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
  apiJson("/usage/summary", { method: "POST", body: JSON.stringify({ known: [] }), silent: true })
    .then((res) => {
      paletteUsage.clear();
      for (const f of res.features || []) paletteUsage.set(f.name, f.count);
      if (!$("palette-input").value) renderPalette("");
    })
    .catch(() => {});
}

function closePalette() {
  //: Whatever is still in the air is dropped with the window.
  window.clearTimeout(paletteEngine.timer);
  paletteEngine.run += 1;
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

//: The engine's last answer for the palette's text (`q` is that text, lower
//: case, trimmed), the notes and documents it found in its order, and the
//: pending ask. One object, not four `let`s (the global-scope ratchet).
const paletteEngine = { q: "", notes: [], docs: [], timer: null, run: 0 };

//: Ask `GET /search` for what is typed, on a pause, and redraw when it
//: answers. A reply for text that has since changed is dropped; a failed or
//: closed-over ask leaves the in-memory rows as they were.
function paletteAskEngine(query) {
  window.clearTimeout(paletteEngine.timer);
  const asked = query.trim();
  paletteEngine.run += 1;
  if (!asked) {
    Object.assign(paletteEngine, { q: "", notes: [], docs: [] });
    return;
  }
  const run = paletteEngine.run;
  paletteEngine.timer = window.setTimeout(async () => {
    const body = await apiJson(`/search?q=${encodeURIComponent(asked)}&kind=note,document&limit=20`, { silent: true }).catch(() => null);
    if (!body || run !== paletteEngine.run || $("palette-overlay").classList.contains("hidden")) return;
    const hits = body.hits || [];
    paletteEngine.q = asked.toLowerCase();
    paletteEngine.notes = hits.filter((hit) => hit.kind === "note");
    paletteEngine.docs = hits.filter((hit) => hit.kind === "document");
    renderPalette($("palette-input").value);
  }, 120);
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

  // Notes: match body or title.
  //: **The engine's answer comes first** (`paletteAskEngine`): `GET /search`
  //: ranks the whole notebook, the notes past the page the browser holds
  //: included, by words, meaning and typo; the in-memory match below is what
  //: shows before the answer lands and tops the group up with a title that
  //: only part-matches (the engine reads words, a jump list reads letters).
  const engineReady = paletteEngine.q === lowered;
  const heldNotes = engineReady && paletteEngine.notes.length ? new Map(allEntries.map((e) => [e.id, e])) : null;
  const engineNotes = engineReady
    ? paletteEngine.notes.map((hit) => heldNotes?.get(hit.id) || { id: hit.id, title: hit.title, content: hit.snippet, category: "" })
    : [];
  const localNotes = allEntries
    .filter((e) =>
      paletteText(e.content).includes(lowered) ||
      paletteText(e.title).includes(lowered)
    );
  const notes = [...new Map([...engineNotes, ...localNotes].map((e) => [e.id, e])).values()]
    .slice(0, 5)
    .map((e) => ({
      group: "Notes",
      label: `ph:file-text ${e.title || stripFrontmatter(e.content).trim().slice(0, 55)}${!e.title && stripFrontmatter(e.content).trim().length > 55 ? "…" : ""}`,
      about: e.category || "",
      entry: e,
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
  const localDocs = (typeof docs === "undefined" ? [] : docs).filter((d) => paletteText(d.title).includes(lowered));
  //: The engine reads a document's words too, and finds one before the
  //: Library's list has been opened at all.
  const engineDocs = engineReady ? paletteEngine.docs.map((hit) => ({ id: hit.id, title: hit.title || "Untitled document" })) : [];
  const docMatches = [...new Map([...engineDocs, ...localDocs].map((d) => [d.id, d])).values()]
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
      about: m.caption || "",
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
    li.textContent = "No matching command, note or document.";
    list.appendChild(li);
  }
  paletteLight(rows, matches, abouts);
}

//: Light the chosen row, tell the input which it is (the input keeps the
//: focus, so it carries `aria-activedescendant`), and show the row in the
//: pane beside the list: what it does and its key, or a note's first lines.
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
    sample: match.entry ? richPickerLines(match.entry.content) : null,
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
  paletteAskEngine($("palette-input").value);
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
