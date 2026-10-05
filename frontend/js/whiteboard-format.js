// whiteboard-format.js: the board's Format panel (2026-10-05, the features
// audit's controls redesign, section 9.2 item 3; WHITEBOARD_PLAN decision 19).
//
// **Why a panel.** The context bar is the quick bar: at most seven controls
// per kind (decision 11), the ones a person reaches for while working. The
// long tail (a number for where a thing is and how big, its angle, a flip,
// how see-through it is, a shadow, the text in a shape, where a connector's
// label sits) had nowhere to go but more popovers. draw.io keeps all of it
// in one docked Format panel with three tabs, and so does this: Style, Text
// and Arrange, on the board's right edge, hidden until asked for (the "..."
// row on the bar, the View menu, Ctrl+Shift+P, the palette).
//
// **One change, one undo step.** Every field writes through `wbFmtApply`,
// which runs the edit inside `wbRecordGesture`, so a change to five selected
// shapes is one Ctrl+Z.
//
// **The arrange buttons are the command table's** (`WB_COMMANDS`,
// whiteboard-commands.js): order, align, distribute, same size, group and
// lock are built from the table's rows, so their names, icons and keys are
// the menus' and cannot drift.
//
// Loaded in the Library bundle after whiteboard-commands.js (`LAZY_MODULES`,
// app.js); its top level declares and wires, everything else is read at call
// time.

const WB_FMT_KEY = "wb-format";
const WB_FMT_TABS = ["style", "text", "arrange"];
const WB_FMT_SHADOW = "drop-shadow(0 0.15rem 0.3rem rgb(0 0 0 / 0.28))";

//: What is selected, as `{kind, id, item, bbox}` rows: the multi-selection
//: when there is one, else the one selected item.
//: The Format panel's open tab and its queued sync.
const wbFmtState = { fmtTab: "style", fmtSyncQueued: false };

function wbFmtEntries() {
  if (wbMultiSelection.size) return wbSelectionEntries();
  if (!wbSelectedItem) return [];
  const item = wbFindItem(wbSelectedItem.kind, wbSelectedItem.id);
  //: A connector has no box of its own (its path is worked out from its
  //: ends), so it comes with none, and the geometry rows skip it.
  return item ? [{ kind: wbSelectedItem.kind, id: wbSelectedItem.id, item, bbox: wbItemBBox(wbSelectedItem.kind, item) }] : [];
}

//: What one entry is, for the panel: which fields it shows.
function wbFmtKind(entry) {
  if (entry.kind === "node") return "note";
  if (entry.kind === "object") {
    const k = entry.item.kind;
    if (WB_MAP_KINDS.has(k)) return "topic";
    return k === "text" || k === "image" || k === "frame" ? k : null;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(entry.item.data);
  } catch {
    return null;
  }
  if (String(parsed?.type || "").startsWith("link-")) return wbLinkTakesLabel(entry.item, parsed) ? "link" : null;
  if (typeof parsed?.d !== "string") return null;
  return wbShapeLabelKind(parsed) ? "shape" : "line";
}

//: The fields each kind takes, by the `data-fmt` names in index.html.
const WB_FMT_FIELDS = {
  shape: ["stroke", "width", "dash", "fill", "alpha", "shadow", "text", "geometry", "flip", "style-lib"],
  line: ["stroke", "width", "dash", "alpha", "shadow", "geometry", "flip", "style-lib"],
  link: ["stroke", "width", "dash", "alpha", "route", "jumps", "caps", "label-t"],
  text: ["stroke", "fill", "alpha", "shadow", "text", "geometry", "angle", "style-lib"],
  image: ["alpha", "shadow", "geometry", "angle"],
  frame: ["geometry"],
  note: ["geometry", "angle"],
};

function wbFmtSketch(entry) {
  try {
    return JSON.parse(entry.item.data) || {};
  } catch {
    return {};
  }
}

//: A value read off the first entry that has it: what the field shows.
function wbFmtValue(entry, field) {
  const kind = wbFmtKind(entry);
  const s = entry.kind === "sketch" ? wbFmtSketch(entry) : null;
  const o = entry.kind === "object" ? entry.item.data || {} : null;
  switch (field) {
    case "stroke": return s ? s.color || "#888888" : (o.border_color && o.border_color !== "transparent" ? o.border_color : "#8888aa");
    case "width": return s?.width || 3;
    case "dash": return s?.dash || "solid";
    case "fill-on": return s ? Boolean(s.fill) : Boolean(o.bg && o.bg !== "transparent");
    case "fill": return s ? s.fill || "#3355ff" : (o.bg && o.bg !== "transparent" ? o.bg : "#ffffff");
    case "alpha": return Math.round(((s ? s.alpha : o?.alpha) ?? 1) * 100);
    case "shadow": return Boolean(s ? s.shadow : o?.shadow);
    case "route": return wbLinkRouteName(s);
    case "jumps": return WB_JUMP_STYLES.includes(s?.jumps) ? s.jumps : "none";
    case "startcap": return wbLinkCaps(s).startCap;
    case "endcap": return wbLinkCaps(s).endCap;
    case "label-t": return Math.round(wbLinkLabelT(s) * 100);
    case "size": return kind === "shape" ? s.label_size || 16 : o.font_size || 16;
    case "bold": return Boolean(kind === "shape" ? s.label_bold : o.bold);
    case "italic": return Boolean(kind === "shape" ? s.label_italic : o.italic);
    case "align": return (kind === "shape" ? s.label_align : o.align) || (kind === "shape" ? "center" : "left");
    case "ink": return (kind === "shape" ? s.label_color : o.color) || "#1f2430";
    default: return null;
  }
}

//: **One edit to every selected item that takes it, as one undo step.**
//: `patch(entry, kind)` returns a partial for a sketch's data, an object's
//: data, or `{row: {...}}` for a row's own columns; null skips the entry.
async function wbFmtApply(field, patch, said) {
  const entries = wbFmtEntries().filter((e) => !wbIsLocked(e.kind, e.item));
  if (!entries.length) return;
  await wbRecordGesture(async () => {
    for (const entry of entries) {
      const kind = wbFmtKind(entry);
      if (!kind || !(WB_FMT_FIELDS[kind] || []).includes(field)) continue;
      const partial = patch(entry, kind);
      if (!partial) continue;
      if (entry.kind === "sketch") {
        await wbSaveSketchProps(entry.item, partial);
      } else if (partial.row) {
        Object.assign(entry.item, partial.row);
        if (entry.kind === "node") await wbSaveNode(entry.item);
        else await wbSaveObject(entry.item);
      } else if (entry.kind === "object") {
        entry.item.data = { ...entry.item.data, ...partial };
        for (const [key, value] of Object.entries(partial)) if (value === undefined) delete entry.item.data[key];
        await wbSaveObject(entry.item);
      }
    }
  });
  wbScheduleRender();
  if (said) wbAnnounce(said);
  wbFormatSyncSoon();
}

//: The selection's box, in board units: one item's, or the whole set's.
function wbFmtBox(entries) {
  entries = entries.filter((e) => e.bbox);
  if (!entries.length) return null;
  return {
    minX: Math.min(...entries.map((e) => e.bbox.minX)),
    minY: Math.min(...entries.map((e) => e.bbox.minY)),
    maxX: Math.max(...entries.map((e) => e.bbox.maxX)),
    maxY: Math.max(...entries.map((e) => e.bbox.maxY)),
  };
}

//: X and Y move the selection to the number; W and H size one item to it.
async function wbFmtGeometry(axis, value) {
  const entries = wbFmtEntries().filter((e) => !wbIsLocked(e.kind, e.item));
  if (!entries.length || !Number.isFinite(value)) return;
  const box = wbFmtBox(entries);
  if (!box) return;
  await wbRecordGesture(async () => {
    if (axis === "x" || axis === "y") {
      const dx = axis === "x" ? value - box.minX : 0;
      const dy = axis === "y" ? value - box.minY : 0;
      if (!dx && !dy) return;
      for (const e of entries) {
        if (wbFmtKind(e) === "link") continue;
        await wbMoveItemBy(e.kind, e.id, e.item, dx, dy);
      }
      return;
    }
    if (entries.length !== 1) return;
    const [e] = entries;
    const dim = axis === "w" ? "width" : "height";
    const size = axis === "w" ? e.bbox.maxX - e.bbox.minX : e.bbox.maxY - e.bbox.minY;
    const target = Math.max(8, value);
    if (size > 0 && Math.abs(size - target) >= 0.5) await wbSizeItemTo(e, dim, target, target / size);
  });
  wbScheduleRender();
  wbAnnounce(`${{ x: "X", y: "Y", w: "Width", h: "Height" }[axis]} ${Math.round(value)}.`);
  wbFormatSyncSoon();
}

//: A card, text box or picture turns about its centre (`rotation`). A drawn
//: shape has its turn baked into its path and keeps its rotate grip.
async function wbFmtAngle(value) {
  const angle = ((Math.round(value) % 360) + 360) % 360;
  await wbFmtApply("angle", () => ({ row: { rotation: angle || null } }), `Angle ${angle} degrees.`);
}

//: A flip mirrors a drawn path about its own centre.
async function wbFmtFlip(axis) {
  const entries = wbFmtEntries().filter((e) => e.kind === "sketch" && !wbIsLocked(e.kind, e.item));
  if (!entries.length) return;
  await wbRecordGesture(async () => {
    for (const e of entries) {
      const parsed = wbSketchParsedData(e.item);
      if (!parsed) continue;
      const d = wbTransformPathD(parsed.d, {
        sx: axis === "h" ? -1 : 1,
        sy: axis === "v" ? -1 : 1,
        anchorX: (e.bbox.minX + e.bbox.maxX) / 2,
        anchorY: (e.bbox.minY + e.bbox.maxY) / 2,
      });
      await wbSaveSketchD(e.item, d);
    }
  });
  wbScheduleRender();
  wbAnnounce(axis === "h" ? "Flipped left to right." : "Flipped top to bottom.");
}

//: A connector's line shape: curved, straight, or elbow (a straight link
//: with `route: "elbow"`, see `wbLinkRouteName`). Its bends go with it, as
//: draw.io keeps an edge's waypoints across styles: every style takes them
//: (wb-phase2 step 1), and an old link's single `bend` becomes one.
async function wbSetLinkRoute(value) {
  await wbFmtApply("route", (entry) => {
    const parsed = wbFmtSketch(entry);
    if (wbLinkRouteName(parsed) === value) return null;
    const points = wbLinkWaypoints(parsed, wbResolveLinkEndpoints(parsed));
    return {
      type: value === "curved" ? "link-curved" : "link-straight",
      route: value === "elbow" ? "elbow" : undefined,
      points: points.length ? points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })) : undefined,
      bend: undefined,
    };
  }, `Line shape: ${value}.`);
}

function wbFormatPanel() {
  return document.getElementById("wb-format");
}

function wbFormatIsOpen() {
  const panel = wbFormatPanel();
  return Boolean(panel && !panel.classList.contains("hidden"));
}

function wbFormatOpen(tab = null, { focus = true } = {}) {
  const panel = wbFormatPanel();
  if (!panel) return;
  if (tab && WB_FMT_TABS.includes(tab)) wbFmtState.fmtTab = tab;
  panel.classList.remove("hidden");
  try {
    localStorage.setItem(WB_FMT_KEY, "1");
  } catch {
    /* a private window: the panel still opens, it is just not remembered */
  }
  wbFormatSync();
  if (focus) panel.querySelector(`[data-format-tab="${wbFmtState.fmtTab}"]`)?.focus();
}

function wbFormatClose({ restoreFocus = true } = {}) {
  const panel = wbFormatPanel();
  if (!panel || panel.classList.contains("hidden")) return;
  const hadFocus = panel.contains(document.activeElement);
  panel.classList.add("hidden");
  try {
    localStorage.removeItem(WB_FMT_KEY);
  } catch {
    /* nothing to forget */
  }
  if (restoreFocus && hadFocus) document.getElementById("whiteboard-container")?.focus({ preventScroll: true });
}

function wbFormatToggle(tab = null) {
  if (wbFormatIsOpen() && (!tab || tab === wbFmtState.fmtTab)) wbFormatClose();
  else wbFormatOpen(tab);
}

//: Coalesced: a selection change fires the context bar several times in a
//: frame, and the panel is read once.
function wbFormatSyncSoon() {
  if (wbFmtState.fmtSyncQueued || !wbFormatIsOpen()) return;
  wbFmtState.fmtSyncQueued = true;
  requestAnimationFrame(() => {
    wbFmtState.fmtSyncQueued = false;
    wbFormatSync();
  });
}

//: The panel, read off the selection: which tab, which rows, what values.
function wbFormatSync() {
  const panel = wbFormatPanel();
  if (!panel || panel.classList.contains("hidden")) return;
  for (const tab of panel.querySelectorAll("[data-format-tab]")) {
    const on = tab.dataset.formatTab === wbFmtState.fmtTab;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
  }
  const body = document.getElementById("wb-format-body");
  body?.setAttribute("aria-labelledby", `wb-format-tab-${wbFmtState.fmtTab}`);
  for (const section of panel.querySelectorAll("[data-format-panel]")) section.hidden = section.dataset.formatPanel !== wbFmtState.fmtTab;
  const entries = wbFmtEntries();
  const kinds = new Set(entries.map(wbFmtKind).filter(Boolean));
  const fields = new Set();
  for (const k of kinds) for (const f of WB_FMT_FIELDS[k] || []) fields.add(f);
  const empty = document.getElementById("wb-format-empty");
  const map = kinds.has("topic");
  if (empty) {
    empty.hidden = Boolean(entries.length) && !map;
    empty.textContent = map
      ? "A topic is styled from its ring: right-click it, or press Shift+F10."
      : "Select something on the board to format it.";
  }
  const section = panel.querySelector(`[data-format-panel="${wbFmtState.fmtTab}"]`);
  let shown = 0;
  for (const row of panel.querySelectorAll("[data-fmt]")) {
    const on = fields.has(row.dataset.fmt) && !map;
    row.hidden = !on;
    if (on && section?.contains(row)) shown += 1;
  }
  const none = document.getElementById("wb-format-none");
  if (none) none.hidden = !entries.length || map || shown > 0;
  const arrange = document.getElementById("wb-format-commands");
  if (arrange) arrange.hidden = !entries.length || map;
  wbSyncCommandRows(arrange);
  const first = entries.find((e) => wbFmtKind(e) && wbFmtKind(e) !== "topic");
  if (!first) return;
  const set = (id, value, prop = "value") => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el[prop] = value;
  };
  const takes = new Set(WB_FMT_FIELDS[wbFmtKind(first)] || []);
  for (const [id, field, row] of [
    ["wb-fmt-stroke", "stroke", "stroke"], ["wb-fmt-width", "width", "width"], ["wb-fmt-dash", "dash", "dash"],
    ["wb-fmt-fill", "fill", "fill"], ["wb-fmt-route", "route", "route"], ["wb-fmt-jumps", "jumps", "jumps"], ["wb-fmt-startcap", "startcap", "caps"],
    ["wb-fmt-endcap", "endcap", "caps"], ["wb-fmt-label-t", "label-t", "label-t"], ["wb-fmt-size", "size", "text"],
    ["wb-fmt-ink", "ink", "text"], ["wb-fmt-alpha", "alpha", "alpha"],
  ]) {
    if (takes.has(row)) set(id, wbFmtValue(first, field));
  }
  if (takes.has("fill")) {
    set("wb-fmt-fill-on", wbFmtValue(first, "fill-on"), "checked");
    const fillField = document.getElementById("wb-fmt-fill");
    if (fillField) fillField.disabled = !wbFmtValue(first, "fill-on");
  }
  if (takes.has("shadow")) set("wb-fmt-shadow", wbFmtValue(first, "shadow"), "checked");
  const alphaOut = document.getElementById("wb-fmt-alpha-out");
  if (alphaOut && takes.has("alpha")) alphaOut.textContent = `${wbFmtValue(first, "alpha")}%`;
  if (["shape", "text"].includes(wbFmtKind(first))) {
    for (const button of panel.querySelectorAll("#wb-fmt-align [data-align]")) {
      button.setAttribute("aria-pressed", String(button.dataset.align === wbFmtValue(first, "align")));
    }
    document.getElementById("wb-fmt-bold")?.setAttribute("aria-pressed", String(wbFmtValue(first, "bold")));
    document.getElementById("wb-fmt-italic")?.setAttribute("aria-pressed", String(wbFmtValue(first, "italic")));
  }
  const box = wbFmtBox(entries);
  if (!box) return;
  set("wb-fmt-x", Math.round(box.minX));
  set("wb-fmt-y", Math.round(box.minY));
  set("wb-fmt-w", Math.round(box.maxX - box.minX));
  set("wb-fmt-h", Math.round(box.maxY - box.minY));
  for (const id of ["wb-fmt-w", "wb-fmt-h"]) {
    const el = document.getElementById(id);
    if (el) el.disabled = entries.length !== 1;
  }
  set("wb-fmt-angle", Math.round(first.item.rotation || 0));
}

//: The arrange buttons, from the command table: icon-only, named by the
//: table's label and key, greyed (`aria-disabled`) by `wbSyncCommandRows`
//: when they do not apply.
function wbFormatCommandButtons() {
  const host = document.getElementById("wb-format-commands");
  if (!host || host.childElementCount) return;
  const groups = [
    ["Order", ["order-front", "order-forward", "order-backward", "order-back"]],
    ["Align", ["align-left", "align-hcenter", "align-right", "align-top", "align-vcenter", "align-bottom"]],
    ["Space and size", ["distribute-h", "distribute-v", "same-width", "same-height"]],
    ["Group and lock", ["group", "ungroup", "lock"]],
  ];
  for (const [name, ids] of groups) {
    const row = document.createElement("div");
    row.className = "wb-fmt-row";
    const label = document.createElement("span");
    label.className = "wb-fmt-label";
    label.textContent = name;
    const buttons = document.createElement("span");
    buttons.className = "wb-fmt-buttons";
    buttons.setAttribute("role", "group");
    buttons.setAttribute("aria-label", name);
    for (const id of ids) {
      const command = WB_COMMAND_BY_ID.get(id);
      if (!command) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ghost small icon-only";
      button.dataset.wbCmd = id;
      const words = command.keys ? `${command.label} (${command.keys})` : command.label;
      button.title = words;
      button.setAttribute("aria-label", command.label);
      if (command.keys) button.setAttribute("aria-keyshortcuts", command.keys.replace(/Ctrl/g, "Control"));
      const icon = document.createElement("i");
      icon.className = `ph ph-${command.icon.replace(/^ph:/, "")}`;
      icon.setAttribute("aria-hidden", "true");
      button.append(icon);
      buttons.append(button);
    }
    row.append(label, buttons);
    host.append(row);
  }
}

onDomReady(() => {
  const panel = wbFormatPanel();
  if (!panel) return;
  wbFormatCommandButtons();
  //: The panel's two end lists are the bar's, word for word, without the
  //: bar's "Start:" and "End:" (the panel's row label says which end).
  for (const which of ["start", "end"]) {
    const from = document.getElementById(`wb-prop-${which}cap`);
    const to = document.getElementById(`wb-fmt-${which}cap`);
    if (!from || !to || to.options.length) continue;
    for (const option of from.options) {
      const words = option.textContent.replace(/^(Start|End): /, "");
      to.add(new Option(words.charAt(0).toUpperCase() + words.slice(1), option.value));
    }
  }
  const on = (id, type, fn) => document.getElementById(id)?.addEventListener(type, fn);
  on("wb-format-close", "click", () => wbFormatClose());
  panel.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-format-tab]");
    if (tab) {
      wbFmtState.fmtTab = tab.dataset.formatTab;
      wbFormatSync();
      return;
    }
    const cmd = e.target.closest("[data-wb-cmd]");
    //: A greyed button still runs, so the table's toast says why it did not.
    if (cmd && panel.contains(cmd)) Promise.resolve(wbRunCommand(cmd.dataset.wbCmd)).then(() => wbFormatSyncSoon());
  });
  //: The tabs are one Tab stop; Left and Right (and Home, End) walk them.
  panel.querySelector(".wb-format-tabs")?.addEventListener("keydown", (e) => {
    const i = WB_FMT_TABS.indexOf(wbFmtState.fmtTab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: WB_FMT_TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    wbFmtState.fmtTab = WB_FMT_TABS[(next + WB_FMT_TABS.length) % WB_FMT_TABS.length];
    wbFormatSync();
    panel.querySelector(`[data-format-tab="${wbFmtState.fmtTab}"]`)?.focus();
  });
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      wbFormatClose();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      e.stopPropagation();
      wbFormatClose();
    }
  });

  on("wb-fmt-stroke", "change", (e) => wbFmtApply("stroke", (entry) => (entry.kind === "sketch" ? { color: e.target.value } : { border_color: e.target.value }), "Line colour changed."));
  on("wb-fmt-width", "change", (e) => {
    const width = Math.max(1, Math.min(40, Number(e.target.value) || 3));
    wbFmtApply("width", () => ({ width }), `Line width ${width}.`);
  });
  on("wb-fmt-dash", "change", (e) => wbFmtApply("dash", () => ({ dash: e.target.value === "solid" ? undefined : e.target.value }), `Line ${e.target.value}.`));
  on("wb-fmt-fill-on", "change", (e) => {
    const colour = document.getElementById("wb-fmt-fill")?.value || "#3355ff";
    wbFmtApply("fill", (entry) => (entry.kind === "sketch"
      ? { fill: e.target.checked ? colour : undefined, fillOpacity: e.target.checked ? 1 : undefined }
      : { bg: e.target.checked ? colour : "transparent" }), e.target.checked ? "Filled." : "Fill taken off.");
  });
  on("wb-fmt-fill", "change", (e) => wbFmtApply("fill", (entry) => (entry.kind === "sketch" ? { fill: e.target.value, fillOpacity: 1 } : { bg: e.target.value }), "Fill colour changed."));
  on("wb-fmt-alpha", "input", (e) => {
    const out = document.getElementById("wb-fmt-alpha-out");
    if (out) out.textContent = `${e.target.value}%`;
  });
  on("wb-fmt-alpha", "change", (e) => {
    const pct = Math.max(10, Math.min(100, Number(e.target.value) || 100));
    wbFmtApply("alpha", () => ({ alpha: pct >= 100 ? undefined : pct / 100 }), `Opacity ${pct}%.`);
  });
  on("wb-fmt-shadow", "change", (e) => wbFmtApply("shadow", () => ({ shadow: e.target.checked || undefined }), e.target.checked ? "Shadow on." : "Shadow off."));
  on("wb-fmt-route", "change", (e) => wbSetLinkRoute(e.target.value));
  on("wb-fmt-jumps", "change", (e) => {
    const style = WB_JUMP_STYLES.includes(e.target.value) ? e.target.value : "none";
    wbFmtApply("jumps", () => ({ jumps: style === "none" ? undefined : style }), `Line jumps: ${e.target.selectedOptions[0]?.textContent || style}.`);
  });
  for (const which of ["start", "end"]) {
    on(`wb-fmt-${which}cap`, "change", (e) => wbFmtApply("caps", (entry) => {
      const caps = wbLinkCaps(wbFmtSketch(entry));
      caps[`${which}Cap`] = e.target.value;
      return { startCap: caps.startCap, endCap: caps.endCap, endStyle: undefined };
    }, `${which === "start" ? "Start" : "End"}: ${e.target.selectedOptions[0]?.textContent || e.target.value}.`));
  }
  on("wb-fmt-label-t", "change", (e) => {
    const pct = Math.max(5, Math.min(95, Number(e.target.value) || 50));
    wbFmtApply("label-t", () => ({ label_t: pct === 50 ? undefined : pct / 100 }), `Label at ${pct}% along the line.`);
  });
  const textPatch = (shapeKey, objectKey, value) => (entry, kind) => (kind === "shape" ? { [shapeKey]: value } : { [objectKey]: value });
  on("wb-fmt-size", "change", (e) => {
    const size = Math.max(8, Math.min(200, Math.round(Number(e.target.value) || 16)));
    wbFmtApply("text", textPatch("label_size", "font_size", size), `Text size ${size}.`);
  });
  on("wb-fmt-ink", "change", (e) => wbFmtApply("text", textPatch("label_color", "color", e.target.value), "Text colour changed."));
  for (const [id, shapeKey, objectKey, word] of [["wb-fmt-bold", "label_bold", "bold", "Bold"], ["wb-fmt-italic", "label_italic", "italic", "Italic"]]) {
    on(id, "click", (e) => {
      const next = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", String(next));
      wbFmtApply("text", textPatch(shapeKey, objectKey, next || undefined), `${word} ${next ? "on" : "off"}.`);
    });
  }
  on("wb-fmt-align", "click", (e) => {
    const button = e.target.closest("[data-align]");
    if (!button) return;
    wbFmtApply("text", textPatch("label_align", "align", button.dataset.align), `Text aligned ${button.dataset.align}.`);
  });
  for (const axis of ["x", "y", "w", "h"]) {
    on(`wb-fmt-${axis}`, "change", (e) => wbFmtGeometry(axis, Number(e.target.value)));
  }
  on("wb-fmt-angle", "change", (e) => wbFmtAngle(Number(e.target.value) || 0));
  on("wb-fmt-flip-h", "click", () => wbFmtFlip("h"));
  on("wb-fmt-flip-v", "click", () => wbFmtFlip("v"));
  on("wb-fmt-save-style", "click", () => wbRunCommand("save-style"));
  on("wb-fmt-copy-style", "click", () => document.getElementById("wb-copy-style")?.click());
  on("wb-fmt-paste-style", "click", () => document.getElementById("wb-paste-style")?.click());
});
