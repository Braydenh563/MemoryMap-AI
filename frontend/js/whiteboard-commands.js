// whiteboard-commands.js: every board action by name, in one table
// (2026-10-05, the features audit's controls redesign, section 9.2 item 1).
//
// **Why a table.** The audit found the same action under three names on
// three surfaces ("Bring forward" in the Arrange menu and the context bar,
// "Bring to front" on the right-click menu, all three doing the front), Group
// and Lock missing from the menu that names arranging, and no way to find a
// board action by typing its name (FEAT-07, FEAT-11, FEAT-19). One row per
// action, read by every surface that offers it, is what makes those three
// impossible rather than fixed once:
//
// - the Arrange and Edit menus' rows carry `data-wb-cmd` and the lint
//   (`tests/test_wb_commands.py`) holds each row's words and key to the row
//   here;
// - the right-click menu builds its shared rows through `wbCommandMenuRow`;
// - the command palette's "This board" group is `wbPaletteCommands`;
// - the shortcut sheet's whiteboard section is `renderWbShortcutSheet`.
//
// Standing order 13 made structural: a control renamed here is renamed on
// every surface, and the help (`ai/help_chat.py`'s whiteboard entry) is
// checked against the keys by `tests/test_help_controls.py`.
//
// **Loaded in the Library bundle after whiteboard.js** (`LAZY_MODULES`,
// app.js). Its top level declares the table and nothing else; every `run`
// and `when` reads whiteboard.js's functions at call time. The palette
// (palette.js) and the shortcut sheet (settings-wiring.js) reach in through
// `typeof` guards listed in `tests/test_lazy_bundle_calls.py`.

//: What a command needs to apply. `selection`: something is selected;
//: `two` / `three`: at least that many; `shape`: one closed shape or one
//: connector (the text in it, decisions 12 and 13); `one`: exactly one item.
function wbCommandSelectionCount() {
  if (wbMultiSelection.size) return wbMultiSelection.size;
  return wbSelectedItem ? 1 : 0;
}

function wbCommandOneSketch() {
  if (wbMultiSelection.size > 1 || wbSelectedItem?.kind !== "sketch") return null;
  return (wbState.sketches || []).find((s) => s.id === wbSelectedItem.id) || null;
}

//: The one selected shape or connector that can hold words, or null.
function wbCommandTextTarget() {
  const sketch = wbCommandOneSketch();
  if (!sketch) return null;
  if (wbShapeLabelKind(wbSketchParsedData(sketch))) return { sketch, kind: "shape" };
  let parsed = null;
  try {
    parsed = JSON.parse(sketch.data);
  } catch {
    parsed = null;
  }
  return wbLinkTakesLabel(sketch, parsed) ? { sketch, kind: "link" } : null;
}

const wbCommandNeeds = {
  selection: () => wbCommandSelectionCount() > 0,
  two: () => wbCommandSelectionCount() >= 2,
  three: () => wbCommandSelectionCount() >= 3,
  one: () => wbCommandSelectionCount() === 1,
  shape: () => Boolean(wbCommandTextTarget()),
  frame: () => {
    const item = wbSelectedItem && wbMultiSelection.size <= 1 ? wbFindItem(wbSelectedItem.kind, wbSelectedItem.id) : null;
    return wbSelectedItem?.kind === "object" && item?.kind === "frame";
  },
  comment: () => {
    if (wbMultiSelection.size > 1 || !wbSelectedItem) return false;
    return wbTakesComments(wbSelectedItem.kind, wbFindItem(wbSelectedItem.kind, wbSelectedItem.id));
  },
  locked: () => wbLockedItems().length > 0,
};

const wbClickId = (id) => () => document.getElementById(id)?.click();
const wbTool = (tool) => () => {
  if (typeof wbSelectToolRef === "function") wbSelectToolRef(tool);
};

//: The table. `keys` is what the board already listens for ("" where the
//: action has no key); `menu` is the shorter words a menu row uses where its
//: group heading says the rest ("Left edges" under "Align"); `surface` is
//: "board", "map" or "both"; `needs` names a `wbCommandNeeds` test.
const WB_COMMANDS = [
  // Edit
  { id: "undo", group: "Edit", icon: "ph:arrow-counter-clockwise", label: "Undo", keys: "Ctrl+Z", surface: "both", run: () => wbUndo() },
  { id: "redo", group: "Edit", icon: "ph:arrow-clockwise", label: "Redo", keys: "Ctrl+Y", surface: "both", run: () => wbRedo() },
  { id: "select-all", group: "Edit", icon: "ph:selection-all", label: "Select all", keys: "Ctrl+A", surface: "both", run: () => wbSelectAllItems() },
  { id: "copy", group: "Edit", icon: "ph:copy-simple", label: "Copy", keys: "Ctrl+C", surface: "board", needs: "selection", run: () => wbCopySelection() },
  { id: "cut", group: "Edit", icon: "ph:scissors", label: "Cut", keys: "Ctrl+X", surface: "board", needs: "selection", run: () => wbCutSelection() },
  { id: "paste", group: "Edit", icon: "ph:clipboard", label: "Paste", keys: "Ctrl+V", surface: "board", run: () => wbPasteClipboard() },
  { id: "duplicate", group: "Edit", icon: "ph:copy", label: "Duplicate", keys: "Ctrl+D", surface: "both", needs: "selection", run: () => wbDuplicateSelection() },
  { id: "delete", group: "Edit", icon: "ph:trash", label: "Delete", keys: "Del", surface: "both", needs: "selection", run: () => deleteWbSelection() },
  { id: "copy-style", group: "Edit", icon: "ph:eyedropper", label: "Copy style", keys: "Ctrl+Alt+C", surface: "board", needs: "one", run: () => wbCopySelectedStyle() },
  { id: "paste-style", group: "Edit", icon: "ph:paint-bucket", label: "Paste style", keys: "Ctrl+Alt+V", surface: "board", needs: "selection", run: () => wbPasteCopiedStyle() },
  { id: "find", group: "Edit", icon: "ph:magnifying-glass", label: "Find on this board", keys: "Ctrl+F", surface: "both", run: () => wbOpenBoardSearch() },
  // The item
  { id: "text", group: "Item", icon: "ph:text-aa", label: "Write in the shape or label the connector", keys: "Enter", surface: "board", needs: "shape",
    run: () => {
      const target = wbCommandTextTarget();
      if (target?.kind === "shape") wbEditShapeLabel(target.sketch);
      else if (target) wbEditLinkLabel(target.sketch);
    } },
  { id: "comment", group: "Item", icon: "ph:chat-teardrop-text", label: "Comment on the item", keys: "", surface: "board", needs: "comment",
    run: () => wbOpenComments(wbSelectedItem.kind, wbSelectedItem.id) },
  { id: "export-frame", group: "Item", icon: "ph:frame-corners", label: "Export this frame", keys: "", surface: "board", needs: "frame",
    run: () => wbExportFrame(wbFindItem("object", wbSelectedItem.id)) },
  // Arrange
  { id: "align-left", group: "Arrange", icon: "ph:align-left", label: "Align left edges", menu: "Left edges", keys: "", surface: "board", needs: "two", run: () => wbAlignSelection("left") },
  { id: "align-hcenter", group: "Arrange", icon: "ph:align-center-horizontal", label: "Align centres horizontally", menu: "Centres, horizontally", keys: "", surface: "board", needs: "two", run: () => wbAlignSelection("hcenter") },
  { id: "align-right", group: "Arrange", icon: "ph:align-right", label: "Align right edges", menu: "Right edges", keys: "", surface: "board", needs: "two", run: () => wbAlignSelection("right") },
  { id: "align-top", group: "Arrange", icon: "ph:align-top", label: "Align top edges", menu: "Top edges", keys: "", surface: "board", needs: "two", run: () => wbAlignSelection("top") },
  { id: "align-vcenter", group: "Arrange", icon: "ph:align-center-vertical", label: "Align centres vertically", menu: "Centres, vertically", keys: "", surface: "board", needs: "two", run: () => wbAlignSelection("vcenter") },
  { id: "align-bottom", group: "Arrange", icon: "ph:align-bottom", label: "Align bottom edges", menu: "Bottom edges", keys: "", surface: "board", needs: "two", run: () => wbAlignSelection("bottom") },
  { id: "distribute-h", group: "Arrange", icon: "ph:columns", label: "Distribute evenly, left to right", menu: "Evenly, left to right", keys: "", surface: "board", needs: "three", run: () => wbDistributeSelection("horizontal") },
  { id: "distribute-v", group: "Arrange", icon: "ph:rows", label: "Distribute evenly, top to bottom", menu: "Evenly, top to bottom", keys: "", surface: "board", needs: "three", run: () => wbDistributeSelection("vertical") },
  { id: "same-width", group: "Arrange", icon: "ph:arrows-out-line-horizontal", label: "Same width as the widest", menu: "Same width", keys: "", surface: "board", needs: "two", run: () => wbSameSizeSelection("width") },
  { id: "same-height", group: "Arrange", icon: "ph:arrows-out-line-vertical", label: "Same height as the tallest", menu: "Same height", keys: "", surface: "board", needs: "two", run: () => wbSameSizeSelection("height") },
  { id: "group", group: "Arrange", icon: "ph:link", label: "Group", keys: "Ctrl+G", surface: "board", needs: "two", run: () => wbGroupSelection() },
  { id: "ungroup", group: "Arrange", icon: "ph:link-break", label: "Ungroup", keys: "Ctrl+Shift+G", surface: "board", needs: "selection", run: () => wbUngroupSelection() },
  { id: "order-forward", group: "Arrange", icon: "ph:arrow-up", label: "Bring forward", keys: "]", surface: "board", needs: "selection", run: () => wbStepSelectionZOrder(1) },
  { id: "order-backward", group: "Arrange", icon: "ph:arrow-down", label: "Send backward", keys: "[", surface: "board", needs: "selection", run: () => wbStepSelectionZOrder(-1) },
  { id: "order-front", group: "Arrange", icon: "ph:arrow-line-up", label: "Bring to front", keys: "Ctrl+]", surface: "board", needs: "selection", run: () => wbSendSelectionZOrder(true) },
  { id: "order-back", group: "Arrange", icon: "ph:arrow-line-down", label: "Send to back", keys: "Ctrl+[", surface: "board", needs: "selection", run: () => wbSendSelectionZOrder(false) },
  { id: "lock", group: "Arrange", icon: "ph:lock-simple", label: "Lock", keys: "Ctrl+Shift+L", surface: "board", needs: "selection", run: () => wbLockSelection() },
  { id: "unlock-all", group: "Arrange", icon: "ph:lock-simple-open", label: "Unlock every locked item", menu: "Unlock all", keys: "", surface: "board", needs: "locked", run: () => wbUnlockAll() },
  // Insert
  { id: "insert-sticky", group: "Insert", icon: "ph:note", label: "Sticky note", keys: "N", surface: "board", run: wbTool("sticky") },
  { id: "insert-text", group: "Insert", icon: "ph:text-t", label: "Text box", keys: "T", surface: "board", run: wbTool("text") },
  { id: "insert-frame", group: "Insert", icon: "ph:frame-corners", label: "Frame", keys: "F", surface: "board", run: wbTool("frame") },
  { id: "insert-image", group: "Insert", icon: "ph:image", label: "Image from a file", keys: "I", surface: "board", run: wbClickId("wb-add-image") },
  { id: "insert-note", group: "Insert", icon: "ph:note-pencil", label: "A note from the library", keys: "", surface: "both", run: wbClickId("wb-add-note") },
  // Tools
  { id: "tool-select", group: "Tools", icon: "ph:cursor", label: "Select tool", keys: "V", surface: "both", run: wbTool("select") },
  { id: "tool-pan", group: "Tools", icon: "ph:hand", label: "Hand tool", keys: "H", surface: "both", run: wbTool("pan") },
  { id: "tool-lasso", group: "Tools", icon: "ph:lasso", label: "Lasso", keys: "K", surface: "board", run: wbTool("lasso") },
  { id: "tool-pen", group: "Tools", icon: "ph:pen", label: "Pen", keys: "P", surface: "board", run: wbTool("draw") },
  { id: "tool-highlighter", group: "Tools", icon: "ph:highlighter", label: "Highlighter", keys: "M", surface: "board", run: wbTool("highlighter") },
  { id: "tool-eraser", group: "Tools", icon: "ph:eraser", label: "Eraser", keys: "E", surface: "board", run: wbTool("eraser") },
  { id: "tool-fill", group: "Tools", icon: "ph:paint-bucket", label: "Fill", keys: "B", surface: "board", run: wbTool("bucket") },
  { id: "tool-line", group: "Tools", icon: "ph:line-segment", label: "Line", keys: "L", surface: "board", run: wbTool("line") },
  { id: "tool-arrow", group: "Tools", icon: "ph:arrow-up-right", label: "Arrow", keys: "A", surface: "board", run: wbTool("arrow") },
  { id: "tool-rect", group: "Tools", icon: "ph:square", label: "Rectangle", keys: "R", surface: "board", run: wbTool("rect") },
  { id: "tool-circle", group: "Tools", icon: "ph:circle", label: "Circle", keys: "O", surface: "board", run: wbTool("circle") },
  { id: "tool-triangle", group: "Tools", icon: "ph:triangle", label: "Triangle", keys: "G", surface: "board", run: wbTool("triangle") },
  { id: "tool-diamond", group: "Tools", icon: "ph:diamond", label: "Diamond", keys: "D", surface: "board", run: wbTool("diamond") },
  { id: "tool-connector", group: "Tools", icon: "ph:line-segment", label: "Connector", keys: "C", surface: "both", run: wbTool("link-straight") },
  { id: "tool-connector-curved", group: "Tools", icon: "ph:bezier-curve", label: "Curved connector", keys: "Shift+C", surface: "both", run: wbTool("link-curved") },
  { id: "tool-delete", group: "Tools", icon: "ph:trash", label: "Delete tool", keys: "X", surface: "board", run: wbTool("delete") },
  // View
  { id: "zoom-in", group: "View", icon: "ph:magnifying-glass-plus", label: "Zoom in", keys: "Ctrl+=", surface: "both", run: wbClickId("wb-zoom-in") },
  { id: "zoom-out", group: "View", icon: "ph:magnifying-glass-minus", label: "Zoom out", keys: "Ctrl+-", surface: "both", run: wbClickId("wb-zoom-out") },
  { id: "zoom-100", group: "View", icon: "ph:magnifying-glass", label: "Zoom to 100%", keys: "Ctrl+0", surface: "both", run: wbClickId("wb-zoom-actual") },
  { id: "zoom-fit", group: "View", icon: "ph:frame-corners", label: "Fit everything", keys: "Shift+1", surface: "both", run: () => wbZoomToFit() },
  { id: "overview", group: "View", icon: "ph:map-trifold", label: "Board overview", keys: "Shift+N", surface: "both", run: () => wbToggleNavigator() },
  { id: "fullscreen", group: "View", icon: "ph:arrows-out", label: "Full screen", keys: "", surface: "both", run: () => toggleWhiteboardFullscreen() },
  { id: "present", group: "View", icon: "ph:presentation", label: "Present frames", keys: "", surface: "board", run: () => wbStartPresenting() },
  // The board
  { id: "export", group: "Board", icon: "ph:download-simple", label: "Export this board", keys: "", surface: "both", run: wbClickId("wb-export") },
  { id: "rename", group: "Board", icon: "ph:pencil-simple", label: "Rename this board", keys: "", surface: "both", run: wbClickId("wb-rename-board") },
  { id: "new-board", group: "Board", icon: "ph:plus", label: "New board", keys: "", surface: "both", run: wbClickId("wb-new-board") },
  { id: "switch-kind", group: "Board", icon: "ph:tree-structure", label: "Switch between a whiteboard and a mind map", keys: "", surface: "both", run: wbClickId("wb-board-kind") },
  { id: "clear", group: "Board", icon: "ph:eraser", label: "Clear this board", keys: "", surface: "both", run: wbClickId("wb-clear-board") },
];

const WB_COMMAND_BY_ID = new Map(WB_COMMANDS.map((c) => [c.id, c]));

//: Whether a command applies on the board as it is now.
function wbCommandApplies(command) {
  if (!command) return false;
  const map = typeof wbIsMap === "function" && wbIsMap();
  if (command.surface === "board" && map) return false;
  if (command.surface === "map" && !map) return false;
  return !command.needs || Boolean(wbCommandNeeds[command.needs]?.());
}

//: Runs a command by id, saying why when it does not apply rather than doing
//: nothing (a menu row is pressed on purpose).
function wbRunCommand(id) {
  const command = WB_COMMAND_BY_ID.get(id);
  if (!command) return false;
  if (!wbCommandApplies(command)) {
    const why = {
      selection: "Select something first.",
      one: "Select one item first.",
      two: "Select two or more items first.",
      three: "Select three or more items first.",
      shape: "Select one closed shape or one connector first.",
      frame: "Select a frame first.",
      comment: "Select one item first.",
      locked: "Nothing on this board is locked.",
    }[command.needs];
    toast(why || "That is not on a mind map.");
    return false;
  }
  command.run();
  return true;
}

//: A right-click menu row from the table: the same words and the same key
//: as the Arrange menu's row and the palette's.
function wbCommandMenuRow(id) {
  const command = WB_COMMAND_BY_ID.get(id);
  if (!command || !wbCommandApplies(command)) return null;
  return [command.label, command.keys || "", () => command.run()];
}

//: Whether the board is the thing on screen, with a board in it: the
//: palette's "This board" group shows only then.
function wbCommandsLive() {
  const view = document.getElementById("library-view-whiteboard");
  const canvas = document.getElementById("wb-canvas-view");
  return Boolean(view && !view.classList.contains("hidden") && canvas && !canvas.classList.contains("hidden"));
}

//: The command palette's rows (palette.js, through `paletteCommands` in
//: settings-panes.js), in the documents editor's group shape: a group, a
//: label with its icon, the keys, a `run`. Only what applies now.
function wbPaletteCommands() {
  if (!wbCommandsLive()) return [];
  const later = (fn) => () => setTimeout(fn);
  return WB_COMMANDS.filter((command) => wbCommandApplies(command)).map((command) => ({
    group: wbIsMap() ? "This map" : "This board",
    label: `${command.icon} ${command.label}`,
    keys: command.keys,
    run: later(() => command.run()),
  }));
}

//: The shortcut sheet's whiteboard section, from the same table, so the two
//: cannot disagree. Called by `openShortcuts` (settings-wiring.js).
function renderWbShortcutSheet(list) {
  if (!list) return;
  list.replaceChildren();
  for (const command of WB_COMMANDS) {
    if (!command.keys) continue;
    const li = document.createElement("li");
    const keys = document.createElement("span");
    keys.className = "shortcut-keys";
    for (const part of command.keys.split(/\s*\+\s*/)) {
      if (keys.childNodes.length) keys.append(" ");
      const kbd = document.createElement("kbd");
      kbd.textContent = part;
      keys.append(kbd);
    }
    const what = document.createElement("span");
    what.textContent = command.label;
    li.append(keys, what);
    list.append(li);
  }
}

//: Menu rows that name a command run it (`data-wb-cmd`), and grey out while
//: it does not apply, refreshed as the menu opens.
function wbSyncCommandRows(menu) {
  for (const row of menu.querySelectorAll("[data-wb-cmd]")) {
    const applies = wbCommandApplies(WB_COMMAND_BY_ID.get(row.dataset.wbCmd));
    row.setAttribute("aria-disabled", applies ? "false" : "true");
    row.classList.toggle("is-muted", !applies);
  }
}
