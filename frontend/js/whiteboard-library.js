// whiteboard-library.js: the board's left sidebar and its object library
// (2026-10-05; WHITEBOARD_PLAN decisions 25 and 26; INBOX 557, 558).
//
// The owner: "an object or elements library would be really good like with
// what draw.io has", "take everything from draw.io", and "the ability to save
// custom elements and stuff as well". One sidebar on the board's left edge,
// collapsible to a rail of tabs:
//
// - **Library**: Favourites, Recent, the built-in sets (General, Flowchart,
//   Arrows, Frames, Icons; static files in `frontend/board-library/`) and the
//   person's own libraries ("Yours", and any made or imported). A search
//   field over names and tags. A tile places by a click (the middle of the
//   view, fanning out on repeats), a drag (under the pointer), Enter (the
//   same as a click, announced) or Shift+Enter (joined to the selected item
//   by a connector, draw.io's clone-and-connect). Its menu (right-click,
//   Shift+F10) has the rest.
// - **Notes**: the note list that used to be its own panel on the right,
//   for dragging a note onto the board as a card.
// - **Layers**: the board as a tree in paint order (`wbRenderLayers`).
//
// Saving goes the other way (`wbSaveToLibrary*`): a selection, one shape, a
// style, a palette, a sticky or text preset, a map branch, or the whole board
// as a template, all into "Yours". Placing is one request
// (`POST /whiteboard/boards/{id}/place`), one event and, through
// `wbRecordGesture`, one undo step.
//
// **Loaded in the Library bundle after whiteboard-commands.js**
// (`LAZY_MODULES`, app.js): its top level declares and wires; everything it
// calls in whiteboard.js is read at call time.

//: The library as the server last listed it (`GET /board-library`).
//: Built-in sets read from their static files, by key; icons apart.
const wbLibSets = new Map();
//: Which sidebar tab is showing, and whether the panel is open, per device.
const WB_SIDE_KEY = "wb-sidebar";
//: How many icons a group draws before "Show more".
const WB_ICON_PAGE = 120;
//: The group folds the person opened or closed, by key.
const wbLibFolds = new Map();
//: The entry a tile drag carries, for the canvas's drop.

//: The library and sidebar's state, one name in the shared scope.
const wbLibState = { lib: null, libIcons: null, libIconShown: WB_ICON_PAGE, libPlaceFan: 0, libPlaceFanAt: 0, libDragging: null, layersDrag: null, pagesDrag: null, sideRefreshTimer: 0 };

function wbSideState() {
  const saved = prefs.json(WB_SIDE_KEY, {});
  return { open: saved.open === true, tab: saved.tab || "library" };
}

function wbSaveSideState(state) {
  try {
    localStorage.setItem(WB_SIDE_KEY, JSON.stringify(state));
  } catch {
    // Private mode: the panel opens closed next time.
  }
}

//: Opens the sidebar on `tab`, or closes it when `tab` is already showing
//: and `toggle` is set (a rail tab pressed twice).
function wbOpenSidebar(tab = null, { toggle = false, focus = true } = {}) {
  const side = document.getElementById("wb-sidebar");
  const panel = document.getElementById("wb-sidebar-panel");
  if (!side || !panel) return;
  const state = wbSideState();
  const want = tab || state.tab || "library";
  const isMapTab = want === "outline" || want === "map";
  //: A map has no frames, so no pages, and no paint order or note cards
  //: (INBOX 596): its order is its outline, and a note joins it as a topic.
  if (["pages", "layers", "notes"].includes(want) && wbIsMap()) return wbOpenSidebar("library", { focus });
  const showing = !panel.classList.contains("hidden");
  if (toggle && showing && state.tab === want) {
    wbCloseSidebar();
    return;
  }
  if (isMapTab && !wbIsMap()) return wbOpenSidebar("library", { focus });
  panel.classList.remove("hidden");
  side.classList.add("is-open");
  for (const button of side.querySelectorAll("[data-side-tab]")) {
    const on = button.dataset.sideTab === want;
    button.setAttribute("aria-selected", on ? "true" : "false");
    button.tabIndex = on ? 0 : -1;
  }
  for (const section of panel.querySelectorAll("[data-side-panel]")) {
    section.hidden = section.dataset.sidePanel !== want;
  }
  for (const only of panel.querySelectorAll("[data-side-only]")) only.hidden = only.dataset.sideOnly !== want;
  const title = document.getElementById("wb-sidebar-title");
  if (title) title.textContent = { library: "Library", notes: "Notes", layers: "Layers", pages: "Pages", outline: "Outline", map: "This map" }[want] || "Library";
  document.getElementById("wb-add-note")?.classList.add("is-on");
  wbSaveSideState({ open: true, tab: want });
  if (want === "library") {
    wbLoadLibrary().then(() => {
      if (focus) document.getElementById("wb-lib-search")?.focus({ preventScroll: true });
    });
  } else if (want === "notes") {
    renderWbLibrary();
  } else if (want === "layers") {
    wbRenderLayers();
    if (focus) document.querySelector("#wb-layers-tree [tabindex='0']")?.focus({ preventScroll: true });
  } else if (want === "pages") {
    wbRenderPages();
    if (focus) document.querySelector("#wb-pages-list [tabindex='0']")?.focus({ preventScroll: true });
  } else if (want === "map") {
    wbRenderSideMap();
  } else if (want === "outline") {
    wbRenderOutline();
    if (focus) document.querySelector("#wb-outline-tree [tabindex='0']")?.focus({ preventScroll: true });
  }
}

function wbCloseSidebar() {
  document.getElementById("wb-sidebar-panel")?.classList.add("hidden");
  document.getElementById("wb-sidebar")?.classList.remove("is-open");
  document.getElementById("wb-add-note")?.classList.remove("is-on");
  for (const button of document.querySelectorAll("#wb-sidebar [data-side-tab]")) {
    button.setAttribute("aria-selected", "false");
  }
  const state = wbSideState();
  wbSaveSideState({ ...state, open: false });
}

//: Which tabs a board of this kind shows: a map's library is its branches
//: and templates, and only a map has an outline.
//: **A map's rail is the map's** (INBOX 596, the owner: half of it "is empty
//: when on the mind map as it isnt applicable like with layers"): This map
//: and Outline in place of Notes, Layers and Pages.
const WB_SIDE_TABS_BY_KIND = { map: ["library", "map", "outline"], board: ["library", "notes", "layers", "pages"] };

function wbSyncSidebarKind() {
  const map = wbIsMap();
  const shown = WB_SIDE_TABS_BY_KIND[map ? "map" : "board"];
  for (const tab of document.querySelectorAll("#wb-sidebar [data-side-tab]")) tab.hidden = !shown.includes(tab.dataset.sideTab);
  const state = wbSideState();
  if (!shown.includes(state.tab)) wbSaveSideState({ ...state, tab: "library" });
  if (!document.getElementById("wb-sidebar-panel")?.classList.contains("hidden")) {
    const tab = wbSideState().tab;
    if (tab === "library") wbRenderLibrary();
    else if (tab === "layers") wbRenderLayers();
    else if (tab === "pages") wbRenderPages();
    else if (tab === "outline") wbRenderOutline();
    else if (tab === "map") wbRenderSideMap();
  }
}

//: **This map** (INBOX 596): what the map is made of, the stats dialog's own
//: list, kept current while the tab is open (`wbSideRefreshSoon` redraws the
//: open tab after a change), and the three map-wide actions beside it.
function wbRenderSideMap() {
  const host = document.getElementById("wb-side-map-facts");
  if (!host || !wbIsMap()) return;
  host.replaceChildren(wbMapStatsList(wbMapStats(wbMapIndex())));
}

// --- loading -------------------------------------------------------------------

async function wbLoadLibrary({ force = false } = {}) {
  if (!wbLibState.lib || force) {
    try {
      wbLibState.lib = await apiJson("/board-library");
    } catch (err) {
      const list = document.getElementById("wb-lib-list");
      if (list) surfaceFailed(list, "the library", () => wbLoadLibrary({ force: true }));
      return;
    }
  }
  const sets = (wbLibState.lib.sets || []).filter((s) => s.key !== "icons");
  await Promise.all(sets.filter((s) => !wbLibSets.has(s.key)).map(async (s) => {
    try {
      const res = await api(`/board-library/${s.key}.json${lazyAssetStamp()}`, { silent: true });
      wbLibSets.set(s.key, await res.json());
    } catch {
      // A set that does not load is left out; the rest still show.
    }
  }));
  wbRenderLibrary();
}

async function wbLoadIcons() {
  if (wbLibState.libIcons) return wbLibState.libIcons;
  try {
    const res = await api(`/board-library/icons.json${lazyAssetStamp()}`, { silent: true });
    wbLibState.libIcons = (await res.json()).icons || {};
  } catch {
    wbLibState.libIcons = {};
  }
  return wbLibState.libIcons;
}

//: Every entry the panel can show, as `{ref, name, tags, kind, set, payload,
//: favourite, item}`. `ref` is `builtin:<set>/<key>` or `item:<id>`.
function wbLibEntries() {
  const out = [];
  const marks = wbLibState.lib?.marks || {};
  for (const [key, set] of wbLibSets) {
    for (const entry of set.items || []) {
      const ref = `builtin:${key}/${entry.key}`;
      out.push({
        ref, name: entry.name, tags: entry.tags || [], kind: entry.kind || "element", set: set.name,
        group: `set:${key}`, payload: entry.payload, favourite: Boolean(marks[`${key}/${entry.key}`]?.favourite),
        template: entry.template || null,
      });
    }
  }
  for (const item of wbLibState.lib?.items || []) {
    out.push({
      ref: `item:${item.id}`, name: item.name, tags: item.tags || [], kind: item.kind,
      set: (wbLibState.lib.libraries || []).find((l) => l.id === item.library_id)?.name || "Yours",
      group: `lib:${item.library_id}`, payload: item.payload, favourite: item.favourite, item,
    });
  }
  return out;
}

function wbLibIconEntry(name) {
  const d = wbLibState.libIcons?.[name];
  if (!d) return null;
  return {
    ref: `builtin:icons/${name}`, name: name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
    tags: ["icon"], kind: "element", set: "Icons", group: "set:icons",
    favourite: Boolean(wbLibState.lib?.marks?.[`icons/${name}`]?.favourite),
    payload: { box: { w: 96, h: 96 }, items: [{ key: "i", kind: "sketch", data: { d, fill: "ink", noStroke: true, icon: name } }] },
  };
}

//: What a map's library shows: branches and templates; a board's: the rest.
function wbLibFits(entry) {
  const map = wbIsMap();
  if (map) return entry.kind === "branch" || entry.kind === "template";
  return entry.kind !== "branch";
}

// --- drawing the panel ----------------------------------------------------------

//: A thumbnail drawn from the payload itself, with DOM calls: nothing is
//: stored or uploaded for it, so nothing needs sanitising.
function wbLibThumb(entry) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "wb-lib-thumb");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const payload = entry.payload || {};
  if (entry.kind === "palette") {
    svg.setAttribute("viewBox", "0 0 64 40");
    const colours = (payload.colours || []).slice(0, 8);
    colours.forEach((c, i) => {
      const r = document.createElementNS(NS, "rect");
      const w = 64 / Math.max(1, colours.length);
      r.setAttribute("x", String(i * w));
      r.setAttribute("y", "6");
      r.setAttribute("width", String(w));
      r.setAttribute("height", "28");
      r.setAttribute("fill", c);
      svg.appendChild(r);
    });
    return svg;
  }
  if (entry.kind === "style") {
    svg.setAttribute("viewBox", "0 0 64 40");
    const s = payload.style || {};
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", "8");
    r.setAttribute("y", "6");
    r.setAttribute("width", "48");
    r.setAttribute("height", "28");
    r.setAttribute("rx", "4");
    r.setAttribute("fill", s.fill || s.bg || "none");
    r.setAttribute("stroke", s.color || s.border_color || "currentColor");
    r.setAttribute("stroke-width", String(Math.min(6, s.width || 2)));
    svg.appendChild(r);
    return svg;
  }
  if (entry.kind === "branch") {
    svg.setAttribute("viewBox", "0 0 64 40");
    for (const [x1, y1, x2, y2] of [[14, 20, 44, 8], [14, 20, 44, 20], [14, 20, 44, 32]]) {
      const l = document.createElementNS(NS, "path");
      l.setAttribute("d", `M ${x1} ${y1} C 30 ${y1} 30 ${y2} ${x2} ${y2}`);
      l.setAttribute("fill", "none");
      l.setAttribute("stroke", "currentColor");
      l.setAttribute("stroke-width", "2");
      svg.appendChild(l);
    }
    for (const [x, y, w] of [[2, 15, 18], [44, 4, 18], [44, 16, 18], [44, 28, 18]]) {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", String(w));
      r.setAttribute("height", "9");
      r.setAttribute("rx", "4");
      r.setAttribute("fill", "var(--accent-soft, #dde)");
      r.setAttribute("stroke", "currentColor");
      svg.appendChild(r);
    }
    return svg;
  }
  const element = entry.kind === "template" ? payload.element || {} : payload;
  const box = element.box || { w: 100, h: 100 };
  const pad = Math.max(box.w, box.h) * 0.06;
  svg.setAttribute("viewBox", `${-pad} ${-pad} ${box.w + pad * 2} ${box.h + pad * 2}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  //: A line one fortieth of a small shape, a hundred and twentieth of a board.
  const strokeW = Math.max(box.w, box.h) / (Math.max(box.w, box.h) > 400 ? 120 : 40);
  for (const item of (element.items || []).slice(0, 60)) {
    if (item.kind === "sketch") {
      const data = typeof item.data === "string" ? (() => { try { return JSON.parse(item.data); } catch { return {}; } })() : item.data || {};
      if (!data.d) continue;
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", data.d);
      const ink = !data.color || data.color === "ink" ? "currentColor" : data.color;
      const fill = data.fill === "ink" ? "currentColor" : data.fill;
      p.setAttribute("fill", fill || "none");
      if (fill && data.fillOpacity != null) p.setAttribute("fill-opacity", String(data.fill === "ink" && data.fillOpacity < 1 ? Math.max(0.18, data.fillOpacity) : data.fillOpacity));
      if (data.noStroke) p.setAttribute("stroke", "none");
      else {
        p.setAttribute("stroke", ink);
        p.setAttribute("stroke-width", String(strokeW));
      }
      p.setAttribute("stroke-linejoin", "round");
      svg.appendChild(p);
    } else if (item.kind === "object") {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", String(item.x || 0));
      r.setAttribute("y", String(item.y || 0));
      r.setAttribute("width", String(item.w || 100));
      r.setAttribute("height", String(item.h || 60));
      r.setAttribute("rx", String(strokeW * 2));
      const d = item.data || {};
      if (item.type === "frame") {
        r.setAttribute("fill", "none");
        r.setAttribute("stroke", "currentColor");
        r.setAttribute("stroke-width", String(strokeW));
        r.setAttribute("stroke-dasharray", `${strokeW * 3} ${strokeW * 2}`);
      } else {
        r.setAttribute("fill", d.bg || "none");
        r.setAttribute("stroke", d.border_color || (d.bg ? "none" : "currentColor"));
        r.setAttribute("stroke-width", String(strokeW / 2));
        r.setAttribute("stroke-opacity", d.bg ? "1" : "0.4");
      }
      svg.appendChild(r);
      const words = (d.content || "").replace(/[#*_\[\]()>`]/g, "").trim().slice(0, 14);
      if (words && item.type !== "image") {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", String((item.x || 0) + (item.w || 100) / 2));
        t.setAttribute("y", String((item.y || 0) + (item.type === "frame" ? -strokeW : (item.h || 60) / 2)));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("dominant-baseline", item.type === "frame" ? "auto" : "central");
        t.setAttribute("font-size", String(Math.min(Math.max(box.w, box.h) / 9, (item.w || 100) / Math.max(4, words.length * 0.6))));
        t.setAttribute("fill", d.color || "currentColor");
        t.textContent = words;
        svg.appendChild(t);
      }
    }
  }
  return svg;
}

function wbLibTile(entry) {
  const tile = document.createElement("div");
  tile.className = "wb-lib-tile";
  tile.setAttribute("role", "option");
  tile.setAttribute("aria-selected", "false");
  tile.tabIndex = -1;
  tile.dataset.ref = entry.ref;
  tile.id = `wb-lib-${entry.ref.replace(/[^a-z0-9]+/gi, "-")}`;
  const kindWord = { element: "", shape: "shape", style: "style", palette: "palette", preset: "preset", branch: "branch", template: "template" }[entry.kind] || "";
  const said = [entry.name, kindWord, entry.set, entry.favourite ? "favourite" : ""].filter(Boolean).join(", ");
  tile.setAttribute("aria-label", said);
  tile.title = entry.tags?.length ? `${entry.name} (${entry.tags.join(", ")})` : entry.name;
  tile.append(wbLibThumb(entry));
  const name = document.createElement("span");
  name.className = "wb-lib-name";
  name.textContent = entry.name;
  tile.append(name);
  if (entry.favourite) {
    const star = document.createElement("i");
    star.className = "ph-fill ph-star wb-lib-star";
    star.setAttribute("aria-hidden", "true");
    tile.append(star);
  }
  tile.draggable = entry.kind !== "style" && entry.kind !== "palette";
  //: A built-in template says which kind of board it starts (INBOX 596).
  if (entry.template) tile.dataset.libTemplate = entry.template;
  tile._entry = entry;
  return tile;
}

function wbLibGroup(host, key, title, entries, { open = true, extra = null } = {}) {
  if (!entries.length && !extra) return;
  const details = document.createElement("details");
  details.className = "wb-lib-group";
  details.dataset.group = key;
  details.open = wbLibFolds.has(key) ? wbLibFolds.get(key) : open;
  const summary = document.createElement("summary");
  summary.className = "wb-lib-group-head";
  const caret = document.createElement("i");
  caret.className = "ph ph-caret-down wb-lib-caret";
  caret.setAttribute("aria-hidden", "true");
  const words = document.createElement("span");
  words.textContent = title;
  const count = document.createElement("span");
  count.className = "muted wb-lib-count";
  count.textContent = String(entries.length || "");
  summary.append(caret, words, count);
  details.append(summary);
  const grid = document.createElement("div");
  grid.className = "wb-lib-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", title);
  for (const entry of entries) grid.append(wbLibTile(entry));
  details.append(grid);
  if (extra) details.append(extra);
  details.addEventListener("toggle", () => {
    wbLibFolds.set(key, details.open);
    if (key === "set:icons" && details.open && !wbLibState.libIcons) wbLoadIcons().then(() => wbRenderLibrary());
  });
  host.append(details);
}

function wbRenderLibrary() {
  const list = document.getElementById("wb-lib-list");
  if (!list || !wbLibState.lib) return;
  const query = (document.getElementById("wb-lib-search")?.value || "").trim().toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  const all = wbLibEntries().filter(wbLibFits);
  const matches = (e) => {
    const text = `${e.name} ${(e.tags || []).join(" ")} ${e.set}`.toLowerCase();
    return words.every((w) => text.includes(w));
  };
  const active = list.querySelector(".wb-lib-tile.is-active")?.dataset.ref;
  const hadFocus = list.contains(document.activeElement);
  list.replaceChildren();
  const map = wbIsMap();
  if (words.length) {
    //: A name that starts with the words first, then a name that holds
    //: them, then a tag: "decision" finds Decision before the diamond whose
    //: tag says decision.
    const rank = (e) => {
      const name = e.name.toLowerCase();
      return name.startsWith(query) ? 0 : words.every((w) => name.includes(w)) ? 1 : 2;
    };
    let found = all.filter(matches).sort((a, b) => rank(a) - rank(b));
    if (!map && wbLibState.libIcons) {
      const icons = Object.keys(wbLibState.libIcons).filter((n) => words.every((w) => n.replace(/-/g, " ").includes(w))).slice(0, 60);
      found = found.concat(icons.map(wbLibIconEntry).filter(Boolean));
    }
    wbLibGroup(list, "search", found.length ? `Results for "${query}"` : "Nothing matches", found);
    if (!map && !wbLibState.libIcons) wbLoadIcons().then(() => wbRenderLibrary());
  } else {
    const byRef = new Map(all.map((e) => [e.ref, e]));
    const favourites = all.filter((e) => e.favourite);
    wbLibGroup(list, "favourites", "Favourites", favourites);
    const recent = (wbLibState.lib.recent || []).map((r) => byRef.get(r.replace(/^builtin:/, "builtin:")) || (r.startsWith("builtin:icons/") ? wbLibIconEntry(r.slice(14)) : null)).filter(Boolean);
    wbLibGroup(list, "recent", "Recent", recent);
    //: In the index's order (Templates first), not the order the files
    //: happened to arrive in. On a map too (INBOX 596): `wbLibFits` leaves a
    //: map the one built-in set that applies there, its templates, which are
    //: branches; an empty set draws nothing.
    const order = (wbLibState.lib.sets || []).map((x) => x.key);
    const sets = [...wbLibSets].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    for (const [key, set] of sets) {
      wbLibGroup(list, `set:${key}`, set.name, all.filter((e) => e.group === `set:${key}`), { open: ["templates", "maps", "general", "flowchart"].includes(key) });
    }
    if (!map) {
      const iconsOpen = wbLibFolds.get("set:icons") === true;
      const iconEntries = iconsOpen && wbLibState.libIcons ? Object.keys(wbLibState.libIcons).slice(0, wbLibState.libIconShown).map(wbLibIconEntry).filter(Boolean) : [];
      let more = null;
      if (iconsOpen && wbLibState.libIcons && Object.keys(wbLibState.libIcons).length > wbLibState.libIconShown) {
        more = document.createElement("button");
        more.type = "button";
        more.className = "ghost small wb-lib-more";
        more.textContent = `Show more icons (${Object.keys(wbLibState.libIcons).length - wbLibState.libIconShown} left)`;
        more.addEventListener("click", () => {
          wbLibState.libIconShown += WB_ICON_PAGE * 2;
          wbRenderLibrary();
        });
      } else if (!iconsOpen || !wbLibState.libIcons) {
        more = document.createElement("p");
        more.className = "muted wb-lib-note";
        more.textContent = "1,530 icons, drawn as shapes. Search finds one by name.";
      }
      wbLibGroup(list, "set:icons", "Icons", iconEntries, { open: false, extra: more });
    }
    for (const lib of wbLibState.lib.libraries || []) {
      const mine = all.filter((e) => e.group === `lib:${lib.id}`);
      if (!mine.length && lib.kind !== "yours") continue;
      const empty = mine.length ? null : wbLibEmptyYours(map);
      wbLibGroup(list, `lib:${lib.id}`, lib.name, mine, { extra: empty });
    }
  }
  const tiles = [...list.querySelectorAll(".wb-lib-tile")];
  const keep = tiles.find((t) => t.dataset.ref === active) || tiles[0];
  //: A redraw under the keyboard (a star, a rename) keeps the reader's place.
  if (keep) wbLibSetActive(keep, { focus: hadFocus });
  wbLibAnnounceCount(tiles.length, words.length > 0);
}

function wbLibEmptyYours(map) {
  const p = document.createElement("p");
  p.className = "muted wb-lib-note";
  p.textContent = map
    ? "Save a branch here from a topic's menu, or the whole map from Board, Save as a template."
    : "Select something and press Ctrl+Shift+S, or right-click it, Save to the library.";
  return p;
}

function wbLibAnnounceCount(n, searching) {
  const status = document.getElementById("wb-lib-status");
  if (status) status.textContent = searching ? `${n} ${n === 1 ? "match" : "matches"}` : "";
}

//: The roving focus: one tile is the list's tab stop.
function wbLibSetActive(tile, { focus = true } = {}) {
  const list = document.getElementById("wb-lib-list");
  for (const t of list.querySelectorAll(".wb-lib-tile.is-active")) {
    t.classList.remove("is-active");
    t.tabIndex = -1;
    t.setAttribute("aria-selected", "false");
  }
  tile.classList.add("is-active");
  tile.tabIndex = 0;
  tile.setAttribute("aria-selected", "true");
  list.setAttribute("aria-activedescendant", tile.id);
  if (focus) tile.focus({ preventScroll: false });
}

function wbLibVisibleTiles() {
  return [...document.querySelectorAll("#wb-lib-list .wb-lib-tile")].filter((t) => t.offsetParent !== null);
}

// --- placing ---------------------------------------------------------------------

function wbLibInk() {
  const value = document.getElementById("wb-rail-ink")?.value || window.currentStrokeColor || "#3355ff";
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#3355ff";
}

//: Where a click places: the middle of the view, each repeat within a few
//: seconds 24 further down and right so they fan out instead of stacking.
function wbLibCentre() {
  const now = Date.now();
  wbLibState.libPlaceFan = now - wbLibState.libPlaceFanAt < 4000 ? wbLibState.libPlaceFan + 1 : 0;
  wbLibState.libPlaceFanAt = now;
  const [x, y] = wbViewCentre();
  return [x + wbLibState.libPlaceFan * 24, y + wbLibState.libPlaceFan * 24];
}

function wbLibRefBody(ref) {
  return ref.startsWith("item:") ? { item_id: Number(ref.slice(5)) } : { builtin: ref.slice(8) };
}

//: Places an entry at `at` (board units), selects what it made, announces it
//: and records it as one undo step. `connect`: join the item that was
//: selected before to what was placed, on its right (Shift+Enter).
async function wbLibPlace(entry, at = null, { connect = false, onto = null } = {}) {
  if (!entry) return;
  if (entry.kind === "style") return wbLibApplyStyle(entry);
  if (entry.kind === "palette") return wbLibApplyPalette(entry, entry.payload?.colours?.[0]);
  if (entry.kind === "template") return wbLibNewBoardFrom(entry);
  const map = wbIsMap();
  const was = wbSelectedItem ? { ...wbSelectedItem } : null;
  const wasItem = was ? wbFindItem(was.kind, was.id) : null;
  let point = at;
  if (!point && connect && wasItem) {
    const box = wbItemBBox(was.kind, wasItem);
    const w = entry.payload?.box?.w || 160;
    if (box) point = [box.maxX + 120 + w / 2, (box.minY + box.maxY) / 2];
  }
  point = point || wbLibCentre();
  const body = { ...wbLibRefBody(entry.ref), x: point[0], y: point[1], ink: wbLibInk() };
  //: A branch goes under the topic it was dropped on, else the selected
  //: one; a map template with neither goes under the root, since a
  //: template is the map's first branches rather than a second trunk.
  if (map && entry.kind === "branch") {
    const dropped = onto != null ? wbFindItem("object", onto) : null;
    const topic = (dropped && WB_MAP_KINDS.has(dropped.kind) ? dropped : null) || wbSelectedMapNode()
      || (entry.template === "map" ? wbMapIndex().roots[0] : null);
    if (topic) body.parent_id = topic.id;
  }
  const boardId = window.currentBoardId ?? 0;
  let made = null;
  await wbRecordGesture(async () => {
    try {
      made = await apiJson(`/whiteboard/boards/${boardId}/place`, { method: "POST", body: JSON.stringify(body) });
    } catch (err) {
      toast(err.message || "Couldn't place that.", true);
      return;
    }
    wbState.sketches = [...(wbState.sketches || []), ...made.sketches];
    wbState.objects = [...(wbState.objects || []), ...made.objects];
    if (connect && wasItem && !map) {
      const first = made.objects.find((o) => o.kind !== "frame") || made.sketches.find((s) => !/"type"\s*:\s*"link-/.test(s.data));
      if (first) {
        const targetKind = made.objects.includes(first) ? "object" : "sketch";
        try {
          const link = await apiJson("/whiteboard/sketches", {
            method: "POST",
            body: JSON.stringify({
              data: JSON.stringify({ type: "link-straight", sourceId: was.id, sourceKind: was.kind, targetId: first.id, targetKind, color: wbLibInk(), endCap: "arrow" }),
              x: 0, y: 0, z: 1, board_id: window.currentBoardId ?? null,
            }),
          });
          wbState.sketches.push(link);
        } catch {
          // The shape is placed either way; the join is a convenience.
        }
      }
    }
  });
  if (!made) return;
  if (map) await wbRefreshMapState();
  renderWhiteboardNow();
  if (map) await wbMapTidy({ quiet: true });
  clearWbSelection();
  const keys = [
    ...made.sketches.filter((s) => !/"type"\s*:\s*"link-/.test(s.data)).map((s) => wbMultiKey("sketch", s.id)),
    ...made.objects.map((o) => wbMultiKey("object", o.id)),
  ];
  if (keys.length === 1) {
    const [kind, id] = keys[0].split(":");
    wbSelectedItem = { kind, id: Number(id) };
  } else {
    for (const key of keys) wbMultiSelection.add(key);
  }
  wbApplySelectionHighlight();
  wbUpdateSelectionBar();
  wbAnnounce(`Placed ${entry.name}${connect && wasItem ? ", joined to the selected item" : ""}.`);
  wbLibState.lib = null; // Recent moved.
}

async function wbLibNewBoardFrom(entry) {
  const name = await promptDialog("Name the new board", entry.name, { confirmLabel: "Create" });
  if (!name || !name.trim()) return;
  try {
    const board = await apiJson("/board-library/new-board", {
      method: "POST",
      body: JSON.stringify({ ...wbLibRefBody(entry.ref), name: name.trim(), ink: wbLibInk() }),
    });
    await openWhiteboardBoard(board.id);
    toast(`Started "${board.title}" from ${entry.name}.`);
  } catch (err) {
    toast(err.message || "Couldn't start a board from that.", true);
  }
}

//: A saved style onto the selection, through the board's own Paste style.
async function wbLibApplyStyle(entry) {
  const { target, style } = entry.payload || {};
  if (!style) return;
  if (!wbSelectedItem && !wbMultiSelection.size) {
    toast("Select something to give it this style.");
    return;
  }
  const keep = typeof wbCopiedStyle !== "undefined" ? wbCopiedStyle : null;
  wbCopiedStyle = { kind: target === "text" ? "object" : "sketch", style };
  await wbRecordGesture(() => wbPasteCopiedStyle());
  wbCopiedStyle = keep;
}

//: One colour of a palette: onto the selection (a shape's fill, a line's
//: colour, a box's ground), or into the pen when nothing is selected.
async function wbLibApplyPalette(entry, colour) {
  if (!colour) return;
  if (!wbSelectedItem && !wbMultiSelection.size) {
    const ink = document.getElementById("wb-rail-ink");
    if (ink) {
      ink.value = colour;
      ink.dispatchEvent(new Event("input", { bubbles: true }));
      ink.dispatchEvent(new Event("change", { bubbles: true }));
    }
    wbAnnounce(`Pen colour ${colour}.`);
    return;
  }
  const entries = wbMultiSelection.size ? wbSelectionEntries() : [{ ...wbSelectedItem, item: wbFindItem(wbSelectedItem.kind, wbSelectedItem.id) }];
  await wbRecordGesture(async () => {
    for (const e of entries) {
      const item = e.item;
      if (!item) continue;
      if (e.kind === "sketch") {
        const parsed = wbSketchParsedData(item);
        const shape = parsed && WB_FILLABLE_SHAPES.has(parsed.shape);
        await wbSaveSketchProps(item, shape ? { fill: colour, fillOpacity: parsed.fillOpacity ?? 1 } : { color: colour });
      } else if (e.kind === "object" && item.kind === "text") {
        item.data = { ...item.data, [item.data?.bg ? "bg" : "color"]: colour };
        await wbSaveObject(item);
      }
    }
  });
  wbScheduleRender();
  wbAnnounce(`Coloured ${colour}.`);
}

// --- the tile's menu --------------------------------------------------------------

function wbLibMenuItems(entry) {
  const items = [];
  const own = entry.ref.startsWith("item:");
  if (entry.kind === "palette") {
    for (const colour of entry.payload?.colours || []) {
      items.push({ label: `ph:circle ${colour}`, title: "Use this colour", run: () => wbLibApplyPalette(entry, colour), group: "colours" });
    }
  } else if (entry.kind === "style") {
    items.push({ label: "ph:paint-brush Apply to the selection", title: "Enter", run: () => wbLibApplyStyle(entry), group: "use" });
  } else if (entry.kind === "template") {
    items.push({ label: "ph:plus New board from this", title: "Enter", run: () => wbLibNewBoardFrom(entry), group: "use" });
  } else {
    items.push({ label: "ph:plus Place in the middle", title: "Enter", run: () => wbLibPlace(entry), group: "use" });
    if (entry.kind !== "branch") {
      items.push({ label: "ph:flow-arrow Place joined to the selection", title: "Shift+Enter", run: () => wbLibPlace(entry, null, { connect: true }), group: "use" });
    }
    if (entry.kind === "element" && /^builtin:(frames)\//.test(entry.ref)) {
      items.push({ label: "ph:squares-four New board from this", title: "A board that starts with it", run: () => wbLibNewBoardFrom(entry), group: "use" });
    }
  }
  items.push({
    label: entry.favourite ? "ph:star Remove from favourites" : "ph:star Add to favourites",
    title: "F", run: () => wbLibToggleFavourite(entry), group: "mark",
  });
  if (own) {
    items.push({ label: "ph:pencil-simple Rename…", title: "F2", run: () => wbLibRename(entry), group: "edit" });
    items.push({ label: "ph:tag Tags…", title: "Words search finds it by", run: () => wbLibTags(entry), group: "edit" });
    if (["element", "shape", "preset"].includes(entry.kind)) {
      items.push({ label: "ph:arrows-clockwise Replace with the selection", title: "Saves what is selected now in its place; copies already placed keep their look", run: () => wbLibReplace(entry), group: "edit" });
    }
    items.push({ label: "ph:copy Duplicate", title: "A second copy to change", run: () => wbLibDuplicate(entry), group: "edit" });
    const others = (wbLibState.lib?.libraries || []).filter((l) => l.id !== entry.item.library_id);
    for (const lib of others) {
      items.push({ label: `ph:folder-simple Move to ${lib.name}`, title: "Move it to another library", run: () => wbLibMove(entry, lib.id), group: "move" });
    }
    items.push({ label: "ph:trash Delete", title: "Delete (Ctrl+Z or the toast's Undo brings it back)", run: () => wbLibDelete(entry), group: "delete" });
  }
  return items;
}

function wbLibOpenMenu(tile, x = null, y = null) {
  const entry = tile?._entry;
  if (!entry) return;
  const r = tile.getBoundingClientRect();
  openMenuAtPoint(wbLibMenuItems(entry), `${entry.name}: actions`, x ?? r.right - 8, y ?? r.bottom - 8);
}

async function wbLibToggleFavourite(entry) {
  try {
    if (entry.ref.startsWith("item:")) {
      await apiJson(`/board-library/${entry.ref.slice(5)}`, { method: "PUT", body: JSON.stringify({ favourite: !entry.favourite }) });
    } else {
      await apiJson("/board-library/marks", { method: "POST", body: JSON.stringify({ key: entry.ref.slice(8), favourite: !entry.favourite }) });
    }
    wbAnnounce(entry.favourite ? `${entry.name} removed from favourites.` : `${entry.name} added to favourites.`);
    await wbLoadLibrary({ force: true });
  } catch (err) {
    toast(err.message || "Couldn't change that.", true);
  }
}

async function wbLibRename(entry) {
  const name = await promptDialog("Rename this library item", entry.name, { confirmLabel: "Rename" });
  if (!name || !name.trim() || name.trim() === entry.name) return;
  await apiJson(`/board-library/${entry.ref.slice(5)}`, { method: "PUT", body: JSON.stringify({ name: name.trim() }) });
  await wbLoadLibrary({ force: true });
}

async function wbLibTags(entry) {
  const tags = await promptDialog("Tags, separated by commas", (entry.tags || []).join(", "), { confirmLabel: "Save" });
  if (tags === null || tags === undefined) return;
  await apiJson(`/board-library/${entry.ref.slice(5)}`, {
    method: "PUT",
    body: JSON.stringify({ tags: String(tags).split(",").map((t) => t.trim()).filter(Boolean) }),
  });
  await wbLoadLibrary({ force: true });
}

async function wbLibDuplicate(entry) {
  await apiJson(`/board-library/${entry.ref.slice(5)}/duplicate`, { method: "POST" });
  await wbLoadLibrary({ force: true });
  wbAnnounce(`${entry.name} duplicated.`);
}

async function wbLibMove(entry, libraryId) {
  await apiJson(`/board-library/${entry.ref.slice(5)}`, { method: "PUT", body: JSON.stringify({ library_id: libraryId }) });
  await wbLoadLibrary({ force: true });
}

async function wbLibDelete(entry) {
  const id = entry.ref.slice(5);
  await apiJson(`/board-library/${id}`, { method: "DELETE" });
  await wbLoadLibrary({ force: true });
  toastAction(`Deleted ${entry.name} from the library.`, "Undo", async () => {
    await apiJson(`/board-library/${id}/restore`, { method: "POST" });
    await wbLoadLibrary({ force: true });
  });
}

async function wbLibReplace(entry) {
  const payload = wbLibSelectionPayload();
  if (!payload) return;
  await apiJson(`/board-library/${entry.ref.slice(5)}`, { method: "PUT", body: JSON.stringify({ payload }) });
  await wbLoadLibrary({ force: true });
  toast(`${entry.name} now holds the selection. Copies already on boards keep their look.`);
}

// --- saving ------------------------------------------------------------------------

//: The selection as an element payload: positions from its box's top left,
//: the links whose two ends are both in it, group ids kept (the server makes
//: them new on every placement), comments left behind.
function wbLibSelectionPayload({ quiet = false } = {}) {
  const copied = wbCopyableSelection({ quiet });
  if (!copied) {
    if (!quiet) toast("Select the things to save first. A note card stays a card: drop the note again instead.");
    return null;
  }
  const { box } = copied;
  const keyOf = new Map();
  const items = [];
  const entries = wbMultiSelection.size ? wbSelectionEntries() : [{ ...wbSelectedItem, item: wbFindItem(wbSelectedItem.kind, wbSelectedItem.id) }];
  for (const e of entries) {
    const item = e.item;
    if (!item || e.kind === "node") continue;
    if (e.kind === "sketch") {
      const parsed = wbSketchParsedData(item);
      if (!parsed) continue;
      const key = `s${item.id}`;
      keyOf.set(`sketch:${item.id}`, key);
      const data = { ...parsed, d: wbTransformPathD(parsed.d, { dx: -box.minX, dy: -box.minY }) };
      delete data.comments;
      delete data.library_ref;
      delete data.locked;
      items.push({ key, kind: "sketch", data, z: item.z || 0, group: item.group_id || undefined });
    } else if (e.kind === "object") {
      if (WB_MAP_KINDS?.has?.(item.kind)) continue;
      const key = `o${item.id}`;
      keyOf.set(`object:${item.id}`, key);
      const data = { ...(item.data || {}) };
      delete data.comments;
      delete data.library_ref;
      delete data.locked;
      items.push({
        key, kind: "object", type: item.kind, data,
        x: item.x - box.minX, y: item.y - box.minY, w: item.width, h: item.height,
        rotation: item.rotation ?? undefined, z: item.z || 0, group: item.group_id || undefined,
      });
    }
  }
  const links = [];
  for (const s of wbState.sketches || []) {
    let data = null;
    try {
      data = JSON.parse(s.data);
    } catch {
      continue;
    }
    if (!String(data?.type || "").startsWith("link-")) continue;
    const from = keyOf.get(`${data.sourceKind || "node"}:${data.sourceId}`);
    const to = keyOf.get(`${data.targetKind || "node"}:${data.targetId}`);
    if (!from || !to) continue;
    const linkData = { ...data };
    for (const k of ["sourceId", "targetId", "sourceKind", "targetKind", "library_ref"]) delete linkData[k];
    //: An elbow's bends are board points: kept from the saved box's corner,
    //: as the items are, so a placed copy bends where the original did.
    if (Array.isArray(linkData.points)) linkData.points = linkData.points.map((p) => ({ x: p.x - box.minX, y: p.y - box.minY }));
    links.push({ from, to, data: linkData });
  }
  if (!items.length) {
    if (!quiet) toast("Nothing in this selection can be saved: a note card stays a card.");
    return null;
  }
  return { box: { w: Math.max(1, box.maxX - box.minX), h: Math.max(1, box.maxY - box.minY) }, items, links };
}

async function wbLibCreate(kind, name, payload, tags = []) {
  try {
    const made = await apiJson("/board-library", { method: "POST", body: JSON.stringify({ kind, name, payload, tags }) });
    wbLibState.lib = null;
    toastAction(`Saved "${made.name}" to your library.`, "Show", () => wbOpenSidebar("library"));
    if (!document.getElementById("wb-sidebar-panel")?.classList.contains("hidden")) await wbLoadLibrary({ force: true });
    wbAnnounce(`Saved ${made.name} to the library.`);
    return made;
  } catch (err) {
    toast(err.message || "Couldn't save that to the library.", true);
    return null;
  }
}

//: Kind 1: the selection.
async function wbSaveSelectionToLibrary() {
  const map = wbIsMap();
  if (map) return wbSaveBranchToLibrary();
  const payload = wbLibSelectionPayload();
  if (!payload) return;
  const one = payload.items.length === 1 ? payload.items[0] : null;
  const guess = one?.data?.label || one?.data?.content?.split("\n")[0]?.slice(0, 40) || `${payload.items.length} items`;
  const name = await promptDialog("Save to the library as", guess, { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  return wbLibCreate("element", name.trim(), payload);
}

//: Kind 2: one drawn path kept as a shape, which then fills, takes text and
//: scales like the built-in shapes.
async function wbSaveShapeToLibrary() {
  const sketch = wbSelectedItem?.kind === "sketch" && wbMultiSelection.size <= 1 ? wbFindItem("sketch", wbSelectedItem.id) : null;
  const parsed = sketch && wbSketchParsedData(sketch);
  if (!parsed?.d) {
    toast("Select one drawn shape or pen stroke first.");
    return;
  }
  const box = wbPathBBox(parsed.d);
  const closed = /[Zz]\s*$/.test(parsed.d.trim());
  const data = {
    d: wbTransformPathD(parsed.d, { dx: -box.minX, dy: -box.minY }),
    shape: closed ? "custom" : parsed.shape || "draw",
    color: parsed.color || "ink",
    width: parsed.width || 2,
  };
  if (parsed.fill) {
    data.fill = parsed.fill;
    data.fillOpacity = parsed.fillOpacity ?? 1;
  }
  if (parsed.dash) data.dash = parsed.dash;
  const name = await promptDialog("Save as a shape named", parsed.label || "My shape", { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  return wbLibCreate("shape", name.trim(), { box: { w: Math.max(1, box.width), h: Math.max(1, box.height) }, items: [{ key: "s", kind: "sketch", data, z: 5 }], links: [] }, ["shape"]);
}

//: Kind 3: one item's look.
async function wbSaveStyleToLibrary() {
  const sel = wbMultiSelection.size <= 1 ? wbSelectedItem : null;
  const item = sel && wbFindItem(sel.kind, sel.id);
  if (!item || sel.kind === "node") {
    toast("Select one shape, line or text box first.");
    return;
  }
  let target, style;
  if (sel.kind === "sketch") {
    const parsed = wbSketchParsedData(item) || {};
    style = wbPickStyle(parsed, WB_SKETCH_STYLE_KEYS);
    target = WB_FILLABLE_SHAPES.has(parsed.shape) ? "shape" : "line";
  } else {
    style = wbPickStyle(item.data, [...WB_OBJECT_STYLE_KEYS, "bold", "italic", "align"]);
    target = "text";
  }
  const name = await promptDialog("Save this style as", `${target[0].toUpperCase()}${target.slice(1)} style`, { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  return wbLibCreate("style", name.trim(), { target, style }, ["style", target]);
}

//: Kind 3b: the colours of the selection (up to sixteen).
async function wbSavePaletteToLibrary() {
  const entries = wbMultiSelection.size ? wbSelectionEntries() : wbSelectedItem ? [{ ...wbSelectedItem, item: wbFindItem(wbSelectedItem.kind, wbSelectedItem.id) }] : [];
  const colours = [];
  for (const e of entries) {
    const src = e.kind === "sketch" ? wbSketchParsedData(e.item) || {} : e.item?.data || {};
    for (const key of ["color", "fill", "bg", "border_color"]) {
      const c = src[key];
      if (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) && !colours.includes(c.toLowerCase())) colours.push(c.toLowerCase());
    }
  }
  if (!colours.length) {
    toast("Select a few coloured things first: their colours become the palette.");
    return;
  }
  const name = await promptDialog("Save these colours as a palette named", "My palette", { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  return wbLibCreate("palette", name.trim(), { colours: colours.slice(0, 16) }, ["palette", "colours"]);
}

//: Kind 4: a sticky or a text box, its look and its words.
async function wbSavePresetToLibrary() {
  const sel = wbMultiSelection.size <= 1 ? wbSelectedItem : null;
  const item = sel?.kind === "object" ? wbFindItem("object", sel.id) : null;
  if (!item || item.kind !== "text") {
    toast("Select one sticky or text box first.");
    return;
  }
  const sticky = Boolean(item.data?.bg);
  const name = await promptDialog(`Save as a ${sticky ? "sticky" : "text"} preset named`, sticky ? "My sticky" : "My text box", { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  const data = { ...item.data };
  delete data.comments;
  delete data.library_ref;
  delete data.locked;
  return wbLibCreate("preset", name.trim(), {
    box: { w: item.width, h: item.height },
    items: [{ key: "t", kind: "object", type: "text", data, x: 0, y: 0, w: item.width, h: item.height, z: 1 }],
    links: [],
  }, ["preset", sticky ? "sticky" : "text"]);
}

//: Kind 5: a map topic and everything under it.
function wbLibBranchOf(rootId) {
  const index = wbMapIndex();
  const walk = (id, depth) => {
    const node = index.byId.get(id);
    if (!node || depth > 30) return null;
    const data = { ...(node.data || {}) };
    for (const k of ["content", "comments", "library_ref", "order", "pinned", "collapsed", "ref_id"]) delete data[k];
    //: Already in sibling order (`wbMapIndex` sorts every child list).
    const kids = index.childrenOf.get(id) || [];
    return { text: String(wbMapLabel(node) || ""), data, children: kids.map((k) => walk(k.id, depth + 1)).filter(Boolean) };
  };
  return walk(rootId, 0);
}

async function wbSaveBranchToLibrary(topic = null) {
  const node = topic || wbSelectedMapNode();
  if (!node) {
    toast("Select a topic first: it and everything under it is saved.");
    return;
  }
  const branch = wbLibBranchOf(node.id);
  if (!branch) return;
  const name = await promptDialog("Save this branch as", branch.text.slice(0, 60) || "My branch", { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  return wbLibCreate("branch", name.trim(), { nodes: [branch] }, ["branch"]);
}

//: Kind 6: the whole board or map, its settings and what is on it.
async function wbSaveBoardAsTemplate() {
  const map = wbIsMap();
  const settings = { type: map ? "map" : "board" };
  if (map && window.wbMapState) {
    settings.layout = window.wbMapState.layout || null;
    if (window.wbMapState.theme && Object.keys(window.wbMapState.theme).length) settings.theme = window.wbMapState.theme;
  }
  const bg = wbBoardBackground();
  if (bg && (bg.color || bg.image)) settings.background = bg;
  const payload = { board: settings };
  if (map) {
    const index = wbMapIndex();
    const roots = index.nodes.filter((n) => n.parent_id == null || !index.byId.has(n.parent_id));
    const nodes = roots.map((r) => wbLibBranchOf(r.id)).filter(Boolean);
    if (!nodes.length) return toast("This map is empty: add a topic first.");
    payload.branch = { nodes };
  } else {
    const keep = { multi: new Set(wbMultiSelection), one: wbSelectedItem };
    wbMultiSelection.clear();
    for (const s of wbState.sketches || []) wbMultiSelection.add(wbMultiKey("sketch", s.id));
    for (const o of wbState.objects || []) wbMultiSelection.add(wbMultiKey("object", o.id));
    wbSelectedItem = null;
    payload.element = wbLibSelectionPayload({ quiet: true });
    wbMultiSelection.clear();
    for (const k of keep.multi) wbMultiSelection.add(k);
    wbSelectedItem = keep.one;
    if (!payload.element) return toast("This board has nothing a template can hold yet: shapes, text, stickies and frames.");
  }
  const title = wbBoardTitleForExport();
  const name = await promptDialog("Save this board as a template named", title || "My template", { confirmLabel: "Save" });
  if (!name || !name.trim()) return;
  return wbLibCreate("template", name.trim(), payload, ["template", map ? "map" : "board"]);
}

// --- import and export --------------------------------------------------------------

async function wbLibExport(libraryId) {
  try {
    const res = await api(`/board-library/export?library_id=${libraryId}`);
    const blob = await res.blob();
    const named = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "library.memorymap-library.json";
    await saveFile(named, blob);
  } catch (err) {
    toast(err.message || "Couldn't export that library.", true);
  }
}

async function wbLibImportFile(file) {
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) return toast("That file is too large to be a library (8 MB at most).", true);
  let body;
  try {
    body = JSON.parse(await file.text());
  } catch {
    return toast("That file is not a MemoryMap library.", true);
  }
  try {
    const out = await apiJson("/board-library/import", { method: "POST", body: JSON.stringify(body) });
    await wbLoadLibrary({ force: true });
    const extra = [out.skipped ? `${out.skipped} skipped` : "", out.dropped_media ? `${out.dropped_media} picture${out.dropped_media === 1 ? "" : "s"} not in this notebook left out` : ""].filter(Boolean).join(", ");
    toast(`Imported ${out.items} into "${out.library.name}"${extra ? ` (${extra})` : ""}.`);
  } catch (err) {
    toast(err.message || "Couldn't import that library.", true);
  }
}

async function wbLibNewLibrary() {
  const name = await promptDialog("Name the new library", "My library", { confirmLabel: "Create" });
  if (!name || !name.trim()) return;
  await apiJson("/board-library/libraries", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
  await wbLoadLibrary({ force: true });
}

function wbLibPanelMenu() {
  const libs = wbLibState.lib?.libraries || [];
  const items = [
    { label: "ph:folder-plus New library…", title: "A library of your own to save into", run: () => wbLibNewLibrary(), group: "lib" },
    { label: "ph:upload-simple Import a library file…", title: "A .memorymap-library.json file", run: () => document.getElementById("wb-lib-import")?.click(), group: "file" },
  ];
  for (const lib of libs) {
    items.push({ label: `ph:download-simple Export ${lib.name}`, title: "Save it as a file to share or keep", run: () => wbLibExport(lib.id), group: "file" });
  }
  for (const lib of libs.filter((l) => l.kind !== "yours")) {
    items.push({
      label: `ph:trash Delete the ${lib.name} library`, title: "What it holds moves to Yours", group: "delete",
      run: async () => {
        await apiJson(`/board-library/libraries/${lib.id}`, { method: "DELETE" });
        await wbLoadLibrary({ force: true });
      },
    });
  }
  return items;
}

// --- wiring --------------------------------------------------------------------------

onDomReady(() => {
  const side = document.getElementById("wb-sidebar");
  if (!side) return;
  for (const button of side.querySelectorAll("[data-side-tab]")) {
    button.addEventListener("click", () => wbOpenSidebar(button.dataset.sideTab, { toggle: true }));
  }
  //: The rail is one tab stop; Up and Down walk it (a vertical tablist).
  side.querySelector(".wb-sidebar-rail")?.addEventListener("keydown", (e) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    const tabs = [...side.querySelectorAll("[data-side-tab]")].filter((t) => !t.hidden);
    const at = tabs.indexOf(document.activeElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault();
    for (const t of tabs) t.tabIndex = -1;
    tabs[next].tabIndex = 0;
    tabs[next].focus();
  });
  document.getElementById("wb-sidebar-close")?.addEventListener("click", () => wbCloseSidebar());
  const search = document.getElementById("wb-lib-search");
  search?.addEventListener("input", () => wbRenderLibrary());
  search?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      const first = wbLibVisibleTiles()[0];
      if (first) {
        e.preventDefault();
        wbLibSetActive(first);
        if (e.key === "Enter") wbLibPlace(first._entry, null, { connect: e.shiftKey });
      }
    } else if (e.key === "Escape" && search.value) {
      e.preventDefault();
      e.stopPropagation();
      search.value = "";
      wbRenderLibrary();
    }
  });
  const list = document.getElementById("wb-lib-list");
  //: Every key in the panel is the panel's: the board's single-letter tools
  //: stay out of a search and a list.
  document.getElementById("wb-sidebar-panel")?.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") e.stopPropagation();
  });
  list?.addEventListener("click", (e) => {
    const tile = e.target.closest(".wb-lib-tile");
    if (!tile) return;
    wbLibSetActive(tile, { focus: false });
    wbLibPlace(tile._entry, null, { connect: e.shiftKey });
  });
  list?.addEventListener("contextmenu", (e) => {
    const tile = e.target.closest(".wb-lib-tile");
    if (!tile) return;
    e.preventDefault();
    wbLibSetActive(tile, { focus: false });
    wbLibOpenMenu(tile, e.clientX, e.clientY);
  });
  //: The list's keys: arrows walk the grid (left and right one, up and down
  //: a row), Enter places, Shift+Enter places joined, F stars, Shift+F10 or
  //: the menu key opens the tile's menu, letters search.
  list?.addEventListener("keydown", (e) => {
    const tile = e.target.closest(".wb-lib-tile");
    if (!tile) return;
    const tiles = wbLibVisibleTiles();
    const at = tiles.indexOf(tile);
    const perRow = Math.max(1, Math.round((tile.parentElement.clientWidth || 1) / (tile.offsetWidth || 1)));
    const go = (i) => {
      const t = tiles[Math.max(0, Math.min(tiles.length - 1, i))];
      if (t) wbLibSetActive(t);
    };
    if (e.key === "ArrowRight") go(at + 1);
    else if (e.key === "ArrowLeft") go(at - 1);
    else if (e.key === "ArrowDown") go(at + perRow);
    else if (e.key === "ArrowUp") {
      if (at - perRow < 0) document.getElementById("wb-lib-search")?.focus();
      else go(at - perRow);
    } else if (e.key === "Home") go(0);
    else if (e.key === "End") go(tiles.length - 1);
    else if (e.key === "Enter") wbLibPlace(tile._entry, null, { connect: e.shiftKey });
    else if ((e.key === "F10" && e.shiftKey) || e.key === "ContextMenu") wbLibOpenMenu(tile);
    else if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey) wbLibToggleFavourite(tile._entry);
    else if (e.key === "F2" && tile._entry.ref.startsWith("item:")) wbLibRename(tile._entry);
    else if (e.key === "Delete" && tile._entry.ref.startsWith("item:")) wbLibDelete(tile._entry);
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && search) {
      search.focus();
      return;
    } else return;
    e.preventDefault();
  });
  list?.addEventListener("dragstart", (e) => {
    const tile = e.target.closest(".wb-lib-tile");
    if (!tile?._entry) return;
    e.dataTransfer.setData("application/x-memorymap-library", tile._entry.ref);
    e.dataTransfer.effectAllowed = "copy";
    wbLibState.libDragging = tile._entry;
  });
  list?.addEventListener("dragend", () => {
    wbLibState.libDragging = null;
  });
  const canvas = document.getElementById("whiteboard-container");
  canvas?.addEventListener("dragover", (e) => {
    if (e.dataTransfer?.types?.includes("application/x-memorymap-library")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });
  canvas?.addEventListener("drop", (e) => {
    if (!e.dataTransfer?.types?.includes("application/x-memorymap-library") || !wbLibState.libDragging) return;
    e.preventDefault();
    e.stopPropagation();
    const t = d3.zoomTransform(canvas);
    const o = wbCanvasOriginRect();
    const onto = Number(e.target.closest?.(".wb-object[data-id]")?.dataset.id) || null;
    wbLibPlace(wbLibState.libDragging, [(e.clientX - o.left - t.x) / t.k, (e.clientY - o.top - t.y) / t.k], { onto });
    wbLibState.libDragging = null;
  }, true);
  document.getElementById("wb-lib-more")?.addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    //: **Hung from the button's right edge, 4px under it**, as every ⋯
    //: menu opens (INBOX 596: from its left edge it sat 20px left of the
    //: button and 15px low). The pointer recipe parks its host at a point and
    //: hangs the menu from a 1px anchor there, which lands a few pixels off
    //: a button's corner; so set, measured and corrected by the difference
    //: (DESIGN.md, a popup in the window's own coordinates).
    //: It escapes to <body> on the next frame (the sidebar clips), so it is
    //: the menu that is moved then, by its own `left` and `top`.
    openMenuAtPoint(wbLibPanelMenu(), "Library actions", r.right, r.bottom);
    requestAnimationFrame(() => {
      const menu = document.querySelector("body > .action-menu-escaped:not(.hidden)");
      if (!menu) return;
      const got = menu.getBoundingClientRect();
      menu.style.left = `${parseFloat(menu.style.left) + r.right - got.right}px`;
      menu.style.top = `${parseFloat(menu.style.top) + r.bottom + 4 - got.top}px`;
    });
  });
  document.getElementById("wb-side-map-look")?.addEventListener("click", () => wbMapThemeDialog());
  document.getElementById("wb-side-map-expand")?.addEventListener("click", () => wbMapExpandAll());
  document.getElementById("wb-side-map-tidy")?.addEventListener("click", async () => {
    const moved = await wbMapTidy({ quiet: true });
    toast(moved ? `Tidied ${moved} node${moved === 1 ? "" : "s"}.` : "Everything is already where this layout puts it.");
  });
  const importInput = document.getElementById("wb-lib-import");
  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    wbLibImportFile(file);
  });
  //: The top bar's Library button opens the sidebar where it was left.
  const state = wbSideState();
  if (state.open && !window.matchMedia("(max-width: 600px)").matches) wbOpenSidebar(state.tab, { focus: false });
});

// --- New board from a template (BACKLOG 4b, answered by decision 25) ---------
//
// "New board" opens a gallery: Blank, the built-in frames (Kanban, a
// retrospective, SWOT, a timeline lane), then the person's own templates; a
// mind map's: Blank, then its own. DESIGN.md's recipe for "a dialog of
// choices that each make something": quiet radio rows beside a preview of
// what the chosen row makes, drawn by the same thumbnail the library tile
// uses; choosing is not making (only Create, Enter or a double click makes).

function wbTemplateChoices(kind) {
  const out = [{ ref: null, name: "Blank", hint: kind === "map" ? "One central topic named after the map" : "An empty board" }];
  if (kind === "board") {
    const frames = wbLibSets.get("frames");
    for (const entry of frames?.items || []) {
      if (entry.key === "frame") continue;
      out.push({ ref: `builtin:frames/${entry.key}`, name: entry.name, hint: "Built in", entry: { ...entry, kind: "element", ref: `builtin:frames/${entry.key}` } });
    }
  }
  for (const item of wbLibState.lib?.items || []) {
    if (item.kind !== "template") continue;
    const type = item.payload?.board?.type === "map" ? "map" : "board";
    if (type !== kind) continue;
    out.push({ ref: `item:${item.id}`, name: item.name, hint: "Yours", entry: { ...item, ref: `item:${item.id}`, payload: item.payload } });
  }
  return out;
}

//: Resolves `{name, kind, ref}` (ref null for blank) or null when cancelled.
async function wbOpenTemplateGallery(kind = "board") {
  const dialog = document.getElementById("wb-template-dialog");
  const list = document.getElementById("wb-template-list");
  const preview = document.getElementById("wb-template-preview");
  const nameField = document.getElementById("wb-template-name");
  const kindSeg = document.getElementById("wb-template-kind");
  if (!dialog || !list || !preview || !nameField) return null;
  await wbLoadLibrary();
  let chosen = null;
  const choose = (choice, { focus = false } = {}) => {
    chosen = choice;
    for (const row of list.querySelectorAll(".doc-template-choice")) {
      const on = row.dataset.ref === String(choice.ref);
      row.setAttribute("aria-checked", on ? "true" : "false");
      row.tabIndex = on ? 0 : -1;
      if (on && focus) row.focus();
    }
    preview.replaceChildren();
    if (choice.entry) preview.append(wbLibThumb(choice.entry));
    else {
      const blank = document.createElement("p");
      blank.className = "muted doc-template-empty";
      blank.textContent = choice.hint;
      preview.append(blank);
    }
    if (!nameField.dataset.typed) nameField.value = choice.ref ? choice.name : "";
  };
  const fill = () => {
    list.replaceChildren();
    for (const btn of kindSeg?.querySelectorAll("button") || []) {
      const on = btn.dataset.value === kind;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    for (const choice of wbTemplateChoices(kind)) {
      const li = document.createElement("li");
      li.setAttribute("role", "presentation");
      const row = document.createElement("button");
      row.type = "button";
      row.className = "ghost doc-template-choice";
      row.setAttribute("role", "radio");
      row.setAttribute("aria-checked", "false");
      row.dataset.ref = String(choice.ref);
      const name = document.createElement("strong");
      name.textContent = choice.name;
      const hint = document.createElement("span");
      hint.className = "muted text-sm";
      hint.textContent = choice.hint;
      const check = document.createElement("i");
      check.className = "ph ph-check doc-template-check";
      check.setAttribute("aria-hidden", "true");
      row.append(name, hint, check);
      row.addEventListener("click", () => choose(choice));
      row.addEventListener("dblclick", () => finish(true));
      li.append(row);
      list.append(li);
    }
    choose(wbTemplateChoices(kind)[0]);
  };
  let settle;
  const done = new Promise((resolve) => {
    settle = resolve;
  });
  const finish = (make) => {
    const name = nameField.value.trim();
    if (make && !name) {
      nameField.focus();
      toast("Give the board a name first.");
      return;
    }
    dialog.close();
    settle(make ? { name, kind, ref: chosen?.ref || null } : null);
  };
  nameField.value = "";
  delete nameField.dataset.typed;
  nameField.oninput = () => {
    nameField.dataset.typed = "1";
  };
  nameField.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    }
  };
  list.onkeydown = (e) => {
    const rows = [...list.querySelectorAll(".doc-template-choice")];
    const at = rows.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = rows[(at + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length];
      next?.click();
      next?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    }
  };
  if (kindSeg) {
    for (const btn of kindSeg.querySelectorAll("button")) {
      btn.onclick = () => {
        kind = btn.dataset.value;
        fill();
      };
    }
  }
  document.getElementById("wb-template-create").onclick = () => finish(true);
  for (const btn of dialog.querySelectorAll("[data-close-dialog='wb-template-dialog']")) btn.onclick = () => finish(false);
  dialog.oncancel = (e) => {
    e.preventDefault();
    finish(false);
  };
  fill();
  dialog.showModal();
  nameField.focus();
  return done;
}

// --- Layers (WHITEBOARD_PLAN decision 27; INBOX 557b) ------------------------
//
// The board as a tree in paint order, front first: what is drawn in the card
// layer (cards, text, stickies, pictures), the frames under them, then the
// drawing layer (shapes, lines, ink, connectors), which this app always
// paints under the cards. A group is a row with its members under it. Each
// row: the eye (hide, show), the lock (decision 15's flag) and its name; a
// press selects the item and brings it on screen; a drag, or Alt+Up and
// Alt+Down, restacks it within its layer; F2 renames; Delete deletes.
// `role="tree"` with `aria-level`, so every item on the board is reachable
// and named without a pointer.


function wbLayerName(kind, item) {
  const own = kind === "sketch" ? wbSketchData(item)?.name : kind === "object" ? item.data?.name : null;
  return own || wbItemSpokenName(kind, item);
}

function wbLayerRows() {
  const rows = [];
  const layer = (title, entries) => {
    entries.sort((a, b) => (b.item.z || 0) - (a.item.z || 0) || b.item.id - a.item.id);
    const groups = new Map();
    const top = [];
    for (const e of entries) {
      const g = e.item.group_id;
      if (g) {
        if (!groups.has(g)) {
          const head = { group: g, members: [] };
          groups.set(g, head);
          top.push(head);
        }
        groups.get(g).members.push(e);
      } else {
        top.push(e);
      }
    }
    rows.push({ head: title, count: entries.length });
    for (const t of top) {
      if (t.group && t.members.length > 1) {
        rows.push({ group: t.group, level: 2, name: `Group of ${t.members.length}` });
        for (const m of t.members) rows.push({ ...m, level: 3, name: wbLayerName(m.kind, m.item) });
      } else {
        const m = t.group ? t.members[0] : t;
        rows.push({ ...m, level: 2, name: wbLayerName(m.kind, m.item) });
      }
    }
  };
  const cards = [
    ...(wbState.nodes || []).map((item) => ({ kind: "node", item })),
    ...(wbState.objects || []).filter((o) => o.kind !== "frame").map((item) => ({ kind: "object", item })),
  ];
  const frames = (wbState.objects || []).filter((o) => o.kind === "frame").map((item) => ({ kind: "object", item }));
  const drawings = (wbState.sketches || []).filter((s) => wbSketchIsDrawable(s)).map((item) => ({ kind: "sketch", item }));
  layer("Cards, text and pictures", cards);
  if (frames.length) layer("Frames", frames);
  layer("Drawings, shapes and lines", drawings);
  return rows;
}

function wbLayerButton(className, icon, title) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ghost small icon-only ${className}`;
  button.tabIndex = -1;
  button.setAttribute("aria-hidden", "true");
  button.title = title;
  const glyph = document.createElement("i");
  glyph.className = `ph ${icon}`;
  button.append(glyph);
  return button;
}

function wbRenderLayers() {
  const tree = document.getElementById("wb-layers-tree");
  if (!tree || tree.closest("[hidden]")) return;
  const map = wbIsMap();
  const activeKey = tree.querySelector("[tabindex='0']")?.dataset.key;
  tree.replaceChildren();
  if (map) {
    const p = document.createElement("li");
    p.className = "muted wb-lib-note";
    p.setAttribute("role", "none");
    p.textContent = "A mind map's order is its outline.";
    tree.append(p);
    return;
  }
  const selected = new Set(wbMultiSelection);
  if (wbSelectedItem) selected.add(wbMultiKey(wbSelectedItem.kind, wbSelectedItem.id));
  for (const row of wbLayerRows()) {
    const li = document.createElement("li");
    if (row.head) {
      li.className = "wb-layer-head";
      li.setAttribute("role", "none");
      li.textContent = row.count ? row.head : `${row.head}: none`;
      tree.append(li);
      continue;
    }
    li.setAttribute("role", "treeitem");
    li.setAttribute("aria-level", String(row.level));
    li.className = `wb-layer-row wb-layer-depth-${row.level - 2}`;
    li.tabIndex = -1;
    const icon = document.createElement("i");
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "wb-layer-name";
    name.textContent = row.name;
    if (row.group) {
      li.dataset.group = row.group;
      li.dataset.key = `group:${row.group}`;
      li.setAttribute("aria-expanded", "true");
      li.classList.add("is-group");
      icon.className = "ph ph-link wb-layer-icon";
      li.append(icon, name);
      li.setAttribute("aria-label", row.name);
      tree.append(li);
      continue;
    }
    const key = wbMultiKey(row.kind, row.item.id);
    li.dataset.key = key;
    li.dataset.kind = row.kind;
    li.dataset.id = String(row.item.id);
    const hidden = wbItemHidden(row.kind, row.item);
    const locked = wbIsLocked(row.kind, row.item);
    li.draggable = true;
    li.setAttribute("aria-selected", selected.has(key) ? "true" : "false");
    icon.className = `ph ${wbLayerIcon(row.kind, row.item)} wb-layer-icon`;
    const eye = wbLayerButton("wb-layer-eye", hidden ? "ph-eye-slash" : "ph-eye", hidden ? "Show it (H)" : "Hide it (H)");
    const lock = wbLayerButton("wb-layer-lock", locked ? "ph-lock-simple" : "ph-lock-simple-open", locked ? "Unlock it (L)" : "Lock it (L)");
    li.classList.toggle("is-hidden", hidden);
    li.classList.toggle("is-locked", locked);
    li.append(icon, name, eye, lock);
    li.setAttribute("aria-label", `${row.name}${hidden ? ", hidden" : ""}${locked ? ", locked" : ""}`);
    tree.append(li);
  }
  const items = [...tree.querySelectorAll("[role='treeitem']")];
  const keep = items.find((r) => r.dataset.key === activeKey) || items.find((r) => r.getAttribute("aria-selected") === "true") || items[0];
  if (keep) keep.tabIndex = 0;
}

function wbLayerIcon(kind, item) {
  if (kind === "node") return "ph-note";
  if (kind === "sketch") {
    const parsed = wbSketchParsedData(item);
    if (!parsed) return "ph-flow-arrow";
    if (parsed.icon) return "ph-smiley";
    return WB_FILLABLE_SHAPES.has(parsed.shape) ? "ph-shapes" : "ph-scribble";
  }
  return { image: "ph-image", frame: "ph-frame-corners", text: item.data?.bg ? "ph-note-blank" : "ph-text-t" }[item.kind] || "ph-square";
}

function wbLayerEntry(li) {
  const kind = li?.dataset.kind;
  const item = kind ? wbFindItem(kind, Number(li.dataset.id)) : null;
  return item ? [kind, item] : null;
}

function wbLayerFocus(key) {
  const row = document.querySelector(`#wb-layers-tree [data-key="${key}"]`);
  if (!row) return;
  for (const r of document.querySelectorAll("#wb-layers-tree [tabindex='0']")) r.tabIndex = -1;
  row.tabIndex = 0;
  row.focus({ preventScroll: true });
}

function wbLayerSelect(li, { zoom = true } = {}) {
  if (li?.dataset.group) {
    clearWbSelection();
    for (const kind of ["node", "object", "sketch"]) {
      for (const item of wbState[WB_LIST_BY_KIND[kind]] || []) {
        if (item.group_id === li.dataset.group && !wbIsLocked(kind, item) && !wbItemHidden(kind, item)) wbMultiSelection.add(wbMultiKey(kind, item.id));
      }
    }
    wbApplySelectionHighlight();
    wbUpdateSelectionBar();
    wbRenderLayers();
    wbLayerFocus(li.dataset.key);
    return;
  }
  const entry = wbLayerEntry(li);
  if (!entry) return;
  const [kind, item] = entry;
  if (wbIsLocked(kind, item) || wbItemHidden(kind, item)) {
    wbAnnounce(`${wbLayerName(kind, item)} is ${wbIsLocked(kind, item) ? "locked: L unlocks it" : "hidden: H shows it"}.`);
    return;
  }
  selectWbItem(kind, item.id);
  if (zoom) {
    const box = wbItemBBox(kind, item);
    if (box) wbCenterOn(box, { animate: true });
  }
  wbAnnounce(wbLayerName(kind, item));
  wbRenderLayers();
  wbLayerFocus(wbMultiKey(kind, item.id));
}

async function wbLayerToggleHidden(li) {
  const entry = wbLayerEntry(li);
  if (!entry) return;
  const [kind, item] = entry;
  const on = !wbItemHidden(kind, item);
  if (on && wbSelectedItem?.kind === kind && wbSelectedItem.id === item.id) clearWbSelection();
  await wbSetHidden([[kind, item]], on);
  wbScheduleRender();
  wbAnnounce(`${wbLayerName(kind, item)} ${on ? "hidden" : "shown"}.`);
  wbRenderLayers();
  wbLayerFocus(li.dataset.key);
}

async function wbLayerToggleLock(li) {
  const entry = wbLayerEntry(li);
  if (!entry) return;
  const [kind, item] = entry;
  const on = !wbIsLocked(kind, item);
  if (on && wbSelectedItem?.kind === kind && wbSelectedItem.id === item.id) clearWbSelection();
  await wbSetLocked([[kind, item]], on);
  wbScheduleRender();
  wbAnnounce(`${wbLayerName(kind, item)} ${on ? "locked" : "unlocked"}.`);
  wbRenderLayers();
  wbLayerFocus(li.dataset.key);
}

async function wbLayerRename(li) {
  const entry = wbLayerEntry(li);
  if (!entry) return;
  const [kind, item] = entry;
  if (kind === "node") {
    toast("A card is named by its note's title: rename the note.");
    return;
  }
  const name = await promptDialog("Name it in the layers", wbLayerName(kind, item), { confirmLabel: "Rename" });
  if (name === null || name === undefined) return;
  const clean = String(name).trim().slice(0, 80);
  await wbRecordGesture(async () => {
    if (kind === "sketch") await wbSaveSketchProps(item, { name: clean || undefined });
    else {
      const data = { ...item.data };
      if (clean) data.name = clean;
      else delete data.name;
      item.data = data;
      await wbSaveObject(item);
    }
  });
  wbRenderLayers();
  wbLayerFocus(li.dataset.key);
}

//: Restacks `li`'s item to just in front of (`above`) or behind the row
//: `target`, within the same layer, through the order commands' z writes,
//: one undo step.
async function wbLayerRestack(li, target, above) {
  const a = wbLayerEntry(li);
  const b = wbLayerEntry(target);
  if (!a || !b || a[1] === b[1]) return;
  const [kind, item] = a;
  const sameLayer = (kind === "sketch") === (b[0] === "sketch") && (item.kind === "frame") === (b[1].kind === "frame");
  if (!sameLayer) {
    toast("Drawings stay under the cards, and frames under both: an item restacks within its own layer.");
    return;
  }
  const peers = wbZOrderStepPeers(kind, item);
  const order = peers.map((p) => p.row).sort((x, y) => (x.z || 0) - (y.z || 0) || x.id - y.id).filter((r) => r !== item);
  const at = order.indexOf(b[1]);
  if (at < 0) return;
  order.splice(above ? at + 1 : at, 0, item);
  const kindOf = new Map(peers.map((p) => [p.row, p.kind]));
  const entries = [];
  let z = Math.min(...order.map((r) => r.z || 0));
  for (const row of order) {
    if ((row.z || 0) !== z) {
      const entry = await wbWriteZ(kindOf.get(row), row, z);
      if (entry) entries.push(entry);
    }
    z += 1;
  }
  if (entries.length === 1) wbPushUndo(entries[0]);
  else if (entries.length > 1) wbPushUndo({ action: "batch", entries });
  wbScheduleRender();
  wbAnnounce(`${wbLayerName(kind, item)} moved ${above ? "in front of" : "behind"} ${wbLayerName(b[0], b[1])}.`);
  wbRenderLayers();
  wbLayerFocus(li.dataset.key);
}

onDomReady(() => {
  const tree = document.getElementById("wb-layers-tree");
  if (!tree) return;
  tree.addEventListener("click", (e) => {
    const li = e.target.closest("[role='treeitem']");
    if (!li) return;
    if (e.target.closest(".wb-layer-eye")) return wbLayerToggleHidden(li);
    if (e.target.closest(".wb-layer-lock")) return wbLayerToggleLock(li);
    wbLayerSelect(li);
  });
  tree.addEventListener("dblclick", (e) => {
    const li = e.target.closest("[role='treeitem']");
    if (li && !e.target.closest("button")) wbLayerRename(li);
  });
  tree.addEventListener("keydown", (e) => {
    const li = e.target.closest("[role='treeitem']");
    if (!li) return;
    const rows = [...tree.querySelectorAll("[role='treeitem']")];
    const at = rows.indexOf(li);
    const go = (i) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, i))];
      if (next) wbLayerFocus(next.dataset.key);
    };
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      let i = at + (e.key === "ArrowUp" ? -1 : 1);
      while (rows[i]?.dataset.group) i += e.key === "ArrowUp" ? -1 : 1;
      if (rows[i]) wbLayerRestack(li, rows[i], e.key === "ArrowUp");
    } else if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
    else if (e.key === "Enter" || e.key === " ") wbLayerSelect(li);
    else if (plain && e.key.toLowerCase() === "h") wbLayerToggleHidden(li);
    else if (plain && e.key.toLowerCase() === "l") wbLayerToggleLock(li);
    else if (e.key === "F2") wbLayerRename(li);
    else if (e.key === "Delete") {
      wbLayerSelect(li, { zoom: false });
      if (wbSelectedItem || wbMultiSelection.size) deleteWbSelection();
      setTimeout(() => wbRenderLayers(), 400);
    } else return;
    e.preventDefault();
  });
  tree.addEventListener("dragstart", (e) => {
    const li = e.target.closest("[role='treeitem']");
    if (!li || li.dataset.group) return;
    wbLibState.layersDrag = li;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/x-memorymap-layer", li.dataset.key);
  });
  const clearMarks = () => {
    for (const x of tree.querySelectorAll(".drop-above, .drop-below")) x.classList.remove("drop-above", "drop-below");
  };
  tree.addEventListener("dragover", (e) => {
    if (!wbLibState.layersDrag) return;
    const over = e.target.closest("[role='treeitem']");
    if (!over || over === wbLibState.layersDrag || over.dataset.group) return;
    e.preventDefault();
    const r = over.getBoundingClientRect();
    clearMarks();
    over.classList.add(e.clientY < r.top + r.height / 2 ? "drop-above" : "drop-below");
  });
  tree.addEventListener("drop", (e) => {
    if (!wbLibState.layersDrag) return;
    e.preventDefault();
    const over = e.target.closest("[role='treeitem']");
    const above = over?.classList.contains("drop-above");
    clearMarks();
    if (over && over !== wbLibState.layersDrag && !over.dataset.group) wbLayerRestack(wbLibState.layersDrag, over, above);
    wbLibState.layersDrag = null;
  });
  tree.addEventListener("dragend", () => {
    wbLibState.layersDrag = null;
    clearMarks();
  });
});

// --- Pages (WHITEBOARD_PLAN decision 22: frames are the pages) --------------
//
// draw.io has pages; a board here has frames, and decision 22 keeps one
// concept: the sidebar's Pages tab lists the board's frames in presentation
// order, and changing that order is changing the presentation. A frame's
// place is `page` in its data (1, 2, ...); a board whose frames have none is
// in reading order, top to bottom and left to right (`wbFramesInOrder`), and
// the first reorder writes every frame's number, one undo step.


function wbRenderPages() {
  const list = document.getElementById("wb-pages-list");
  if (!list || list.closest("[hidden]")) return;
  const active = list.querySelector("[tabindex='0']")?.dataset.id;
  list.replaceChildren();
  const frames = wbFramesInOrder();
  if (!frames.length) {
    const li = document.createElement("li");
    li.className = "muted wb-lib-note";
    li.setAttribute("role", "none");
    li.textContent = "No frames yet. Add one (F) and it becomes a page.";
    list.append(li);
    return;
  }
  const selected = wbSelectedItem?.kind === "object" ? wbSelectedItem.id : null;
  frames.forEach((frame, i) => {
    const li = document.createElement("li");
    li.className = "wb-layer-row wb-page-row";
    li.setAttribute("role", "treeitem");
    li.setAttribute("aria-level", "1");
    li.dataset.id = String(frame.id);
    li.tabIndex = -1;
    li.draggable = true;
    li.setAttribute("aria-selected", frame.id === selected ? "true" : "false");
    const number = document.createElement("span");
    number.className = "wb-page-number";
    number.textContent = String(i + 1);
    number.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "wb-layer-name";
    name.textContent = wbFrameTitle(frame);
    const present = wbLayerButton("wb-page-present", "ph-presentation", "Present from this page (P)");
    li.append(number, name, present);
    li.setAttribute("aria-label", `Page ${i + 1}: ${wbFrameTitle(frame)}`);
    list.append(li);
  });
  const focusRow = list.querySelector(`[data-id="${active}"]`) || list.querySelector("[role='treeitem']");
  if (focusRow) focusRow.tabIndex = 0;
}

function wbPageFocus(id) {
  const list = document.getElementById("wb-pages-list");
  const row = list?.querySelector(`[data-id="${id}"]`);
  if (!row) return;
  for (const r of list.querySelectorAll("[tabindex='0']")) r.tabIndex = -1;
  row.tabIndex = 0;
  row.focus({ preventScroll: false });
}

//: Brings the frame on screen and selects it.
function wbPageGo(id) {
  const frame = (wbState.objects || []).find((o) => o.id === id);
  if (!frame) return;
  clearWbSelection();
  selectWbItem("object", id);
  wbCenterOn({ minX: frame.x, minY: frame.y - 28, maxX: frame.x + frame.width, maxY: frame.y + frame.height });
  wbRenderPages();
  wbPageFocus(id);
}

//: Moves page `id` to `to` (0-based) and writes every frame's number, one
//: undo step.
async function wbPageMove(id, to) {
  const frames = wbFramesInOrder();
  const from = frames.findIndex((f) => f.id === id);
  if (from < 0 || to < 0 || to >= frames.length || from === to) return;
  const [moved] = frames.splice(from, 1);
  frames.splice(to, 0, moved);
  await wbRecordGesture(async () => {
    for (const [i, frame] of frames.entries()) {
      if (frame.data?.page === i + 1) continue;
      frame.data = { ...frame.data, page: i + 1 };
      await wbSaveObject(frame);
    }
  });
  wbRenderPages();
  wbPageFocus(id);
  wbAnnounce(`${wbFrameTitle(moved)} is page ${to + 1} of ${frames.length}.`);
}

function wbPagePresent(id) {
  const at = wbFramesInOrder().findIndex((f) => f.id === id);
  wbStartPresenting();
  if (at > 0 && wbPresent) requestAnimationFrame(() => requestAnimationFrame(() => wbPresentShow(at)));
}

onDomReady(() => {
  const list = document.getElementById("wb-pages-list");
  if (!list) return;
  const rowOf = (e) => e.target.closest("[role='treeitem']");
  list.addEventListener("click", (e) => {
    const li = rowOf(e);
    if (!li) return;
    if (e.target.closest(".wb-page-present")) return wbPagePresent(Number(li.dataset.id));
    wbPageGo(Number(li.dataset.id));
  });
  list.addEventListener("keydown", (e) => {
    const li = rowOf(e);
    if (!li) return;
    const rows = [...list.querySelectorAll("[role='treeitem']")];
    const at = rows.indexOf(li);
    const id = Number(li.dataset.id);
    const go = (i) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, i))];
      if (next) wbPageFocus(next.dataset.id);
    };
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) wbPageMove(id, at + (e.key === "ArrowUp" ? -1 : 1));
    else if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
    else if (e.key === "Enter" || e.key === " ") wbPageGo(id);
    else if (plain && e.key.toLowerCase() === "p") wbPagePresent(id);
    else return;
    e.preventDefault();
  });
  list.addEventListener("dragstart", (e) => {
    const li = rowOf(e);
    if (!li) return;
    wbLibState.pagesDrag = li;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/x-memorymap-page", li.dataset.id);
  });
  const clearMarks = () => {
    for (const x of list.querySelectorAll(".drop-above, .drop-below")) x.classList.remove("drop-above", "drop-below");
  };
  list.addEventListener("dragover", (e) => {
    if (!wbLibState.pagesDrag) return;
    const over = rowOf(e);
    if (!over || over === wbLibState.pagesDrag) return;
    e.preventDefault();
    const r = over.getBoundingClientRect();
    clearMarks();
    over.classList.add(e.clientY < r.top + r.height / 2 ? "drop-above" : "drop-below");
  });
  list.addEventListener("drop", (e) => {
    const over = rowOf(e);
    const dragged = wbLibState.pagesDrag;
    wbLibState.pagesDrag = null;
    if (!over || !dragged || over === dragged) return clearMarks();
    e.preventDefault();
    const rows = [...list.querySelectorAll("[role='treeitem']")];
    const from = rows.indexOf(dragged);
    let to = rows.indexOf(over) + (over.classList.contains("drop-below") ? 1 : 0);
    if (from < to) to -= 1;
    clearMarks();
    wbPageMove(Number(dragged.dataset.id), to);
  });
  list.addEventListener("dragend", () => {
    wbLibState.pagesDrag = null;
    clearMarks();
  });
});

// --- Outline (MINDMAP §12.2 item 8, the minimal first cut) ------------------
//
// A mind map's sidebar has an Outline tab: the map's topics as an indented
// tree in sibling order, the same order the map, its exports and the
// assistant's outline use (`wbMapIndex`). This cut reads and walks: Enter or
// a click selects the topic and brings it on screen, the arrows walk the
// rows, Left goes to the parent and Right to the first child. Editing in the
// outline (Tab and Shift+Tab to re-parent, typing to rename) is the mind map
// agent's M3, built on these rows.

function wbRenderOutline() {
  const tree = document.getElementById("wb-outline-tree");
  if (!tree || tree.closest("[hidden]")) return;
  const active = tree.querySelector("[tabindex='0']")?.dataset.id;
  tree.replaceChildren();
  if (typeof wbIsMap !== "function" || !wbIsMap() || typeof wbMapIndex !== "function") return;
  const { childrenOf, roots } = wbMapIndex();
  const selected = wbSelectedItem?.kind === "object" ? wbSelectedItem.id : null;
  const add = (obj, level, parentId) => {
    const li = document.createElement("li");
    li.className = "wb-layer-row wb-outline-row";
    li.setAttribute("role", "treeitem");
    li.setAttribute("aria-level", String(level));
    li.dataset.id = String(obj.id);
    if (parentId != null) li.dataset.parent = String(parentId);
    li.tabIndex = -1;
    li.style.paddingInlineStart = `calc(var(--space-1) + ${Math.min(level - 1, 8)} * var(--space-4))`;
    li.setAttribute("aria-selected", obj.id === selected ? "true" : "false");
    const kids = childrenOf.get(obj.id) || [];
    const icon = document.createElement("i");
    icon.className = `ph ${kids.length ? "ph-caret-down" : "ph-dot-outline"} wb-layer-icon`;
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "wb-layer-name";
    const label = wbMapLabel(obj).trim() || "Untitled topic";
    name.textContent = label;
    li.append(icon, name);
    li.setAttribute("aria-label", label);
    if (kids.length) li.setAttribute("aria-expanded", obj.data?.collapsed ? "false" : "true");
    tree.append(li);
    if (!obj.data?.collapsed) for (const kid of kids) add(kid, level + 1, obj.id);
  };
  for (const root of roots) add(root, 1, null);
  const row = tree.querySelector(`[data-id="${active}"]`) || tree.querySelector(`[data-id="${selected}"]`) || tree.querySelector("[role='treeitem']");
  if (row) row.tabIndex = 0;
}

function wbOutlineFocus(id) {
  const tree = document.getElementById("wb-outline-tree");
  const row = tree?.querySelector(`[data-id="${id}"]`);
  if (!row) return;
  for (const r of tree.querySelectorAll("[tabindex='0']")) r.tabIndex = -1;
  row.tabIndex = 0;
  row.focus({ preventScroll: false });
}

function wbOutlineGo(id) {
  const obj = (wbState.objects || []).find((o) => o.id === id);
  if (!obj) return;
  clearWbSelection();
  selectWbItem("object", id);
  const box = wbItemBBox("object", obj);
  if (box) wbCenterOn(box);
  for (const r of document.querySelectorAll("#wb-outline-tree [role='treeitem']")) r.setAttribute("aria-selected", r.dataset.id === String(id) ? "true" : "false");
}

onDomReady(() => {
  const tree = document.getElementById("wb-outline-tree");
  if (!tree) return;
  tree.addEventListener("click", (e) => {
    const li = e.target.closest("[role='treeitem']");
    if (li) wbOutlineGo(Number(li.dataset.id));
  });
  tree.addEventListener("keydown", (e) => {
    const li = e.target.closest("[role='treeitem']");
    if (!li) return;
    const rows = [...tree.querySelectorAll("[role='treeitem']")];
    const at = rows.indexOf(li);
    const go = (i) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, i))];
      if (next) wbOutlineFocus(next.dataset.id);
    };
    if (e.key === "ArrowDown") go(at + 1);
    else if (e.key === "ArrowUp") go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(rows.length - 1);
    else if (e.key === "ArrowLeft" && li.dataset.parent) wbOutlineFocus(li.dataset.parent);
    else if (e.key === "ArrowRight" && li.getAttribute("aria-expanded") === "true") go(at + 1);
    else if (e.key === "Enter" || e.key === " ") wbOutlineGo(Number(li.dataset.id));
    else return;
    e.preventDefault();
  });
});

//: **An open tab follows the board** (found with the Pages tab): Layers,
//: Pages and Outline were drawn when the tab opened and not again, so a shape
//: drawn with the Layers tab open was missing from it. After every render,
//: once things settle, the open tab is drawn again; a row that had the focus
//: keeps it.

function wbSideRefreshSoon() {
  const panel = document.getElementById("wb-sidebar-panel");
  if (!panel || panel.classList.contains("hidden")) return;
  clearTimeout(wbLibState.sideRefreshTimer);
  wbLibState.sideRefreshTimer = setTimeout(() => {
    const tab = wbSideState().tab;
    if (tab === "map") return wbRenderSideMap();
    const list = { layers: "wb-layers-tree", pages: "wb-pages-list", outline: "wb-outline-tree" }[tab];
    const host = list && document.getElementById(list);
    if (!host || host.closest("[hidden]")) return;
    const focused = host.contains(document.activeElement) ? document.activeElement : null;
    const key = focused?.dataset.key || focused?.dataset.id;
    if (tab === "layers") wbRenderLayers();
    else if (tab === "pages") wbRenderPages();
    else wbRenderOutline();
    if (key) {
      const row = host.querySelector(`[data-key="${key}"], [data-id="${key}"]`);
      if (row) {
        for (const r of host.querySelectorAll("[tabindex='0']")) r.tabIndex = -1;
        row.tabIndex = 0;
        row.focus({ preventScroll: true });
      }
    }
  }, 250);
}
