// The sketch pad's wiring, loaded by the first `openSketch` (`lazyScript`,
// media.js; INBOX 839): its tool, size, paper, image, undo and ink handlers,
// the ink chip's palette and the Ctrl+Z keys. Nothing here can be pressed
// before the pad is open, and the pad's drawing code stays in media.js.

function sketchShowInk(color) {
  const dot = document.querySelector(".sketch-ink-dot");
  if (dot) dot.style.background = color;
}

$("sketch-clear").addEventListener("click", () => {
  // Clears strokes only: the background layer (§37G's uploaded image, or
  // blank white) is untouched, so Clear can't lose the photo being annotated.
  const canvas = $("sketch-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
});
$("sketch-upload-image").addEventListener("click", () => $("sketch-image-input").click());
$("sketch-image-input").addEventListener("change", () => {
  const file = $("sketch-image-input").files[0];
  $("sketch-image-input").value = ""; // lets the same file be picked again
  sketchUploadImage(file);
});
$("sketch-size").addEventListener("input", () => {
  sketchPen.size = Number($("sketch-size").value);
  syncSketchSizeReadout();
});
// `input` previews live while dragging the swatch; `change` (fires once, on
// release) is what persists, dragging across ten hues shouldn't write ten
// times, same reasoning as the whiteboard's own background picker.
$("sketch-bg-color-picker").addEventListener("input", (e) => {
  sketchBgColor = e.target.value;
  sketchDrawBackground();
  sketchDirty = true; // a background colour is as much a change as a stroke
});
$("sketch-bg-color-picker").addEventListener("change", (e) => {
  prefs.set(SKETCH_BG_KEY, e.target.value);
});
for (const button of document.querySelectorAll(".sketch-color")) {
  button.addEventListener("click", () => {
    sketchPen.color = button.dataset.color;
    // Picking a colour means you want to draw, not erase. The eraser button
    // was renamed `sketch-tool-eraser` when the toolbar became icons, and this
    // one call kept the old `sketch-eraser` id: so the optional-chain
    // swallowed it and the eraser stayed lit while the pen drew, which reads
    // as the colour swatches not working.
    //
    // **It does not mean you want the pen**, which is what this did until it
    // was measured: "highlighter, then yellow" left `sketchTool` at "pen" and
    // drew an opaque yellow line (one pass at 176.0 luminance on a 255.0
    // paper, which is the ink's own value, so no translucency at all). The
    // highlighter, the shapes and the text tool all take the ink too, so only
    // the eraser is switched away from here.
    const wasErasing = sketchPen.eraser;
    sketchPen.eraser = false;
    if (wasErasing) {
      sketchTool = "pen";
      $("sketch-tool-eraser")?.classList.remove("active");
      $("sketch-tool-pen")?.classList.add("active");
    }
    document
      .querySelectorAll(".sketch-color")
      .forEach((b) => b.classList.toggle("active", b === button));
    sketchShowInk(button.dataset.color);
    sketchTogglePalette(false);
    $("sketch-ink-chip")?.focus();
  });
}
$("sketch-ink-chip")?.addEventListener("click", () => sketchTogglePalette());
const sketchCanvas = $("sketch-canvas");
sketchCanvas.addEventListener("pointerdown", sketchStart);
sketchCanvas.addEventListener("pointermove", sketchMove);
sketchCanvas.addEventListener("pointerup", sketchEnd);
sketchCanvas.addEventListener("pointerleave", sketchEnd);

$("sketch-undo").addEventListener("click", () => {
  if (sketchHistory.length === 0) return;
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchRedoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  const last = sketchHistory.pop();
  ctx.putImageData(last, 0, 0);
  sketchDirty = true;
});
$("sketch-redo").addEventListener("click", () => {
  if (sketchRedoStack.length === 0) return;
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  const next = sketchRedoStack.pop();
  ctx.putImageData(next, 0, 0);
  sketchDirty = true;
});

const sketchToolsList = ["pen", "highlighter", "eraser", "line", "rect", "circ", "arrow", "text"];
for (const tool of sketchToolsList) {
  const btn = $(`sketch-tool-${tool}`);
  if (btn) {
    btn.addEventListener("click", () => {
      sketchTool = tool === "eraser" ? "pen" : tool;
      sketchPen.eraser = (tool === "eraser");
      for (const t of sketchToolsList) {
        const tBtn = $(`sketch-tool-${t}`);
        if (tBtn) tBtn.classList.toggle("active", t === tool);
      }
    });
  }
}

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && !$("sketch-overlay").classList.contains("hidden")) {
    if (e.key === "z") {
      if (e.shiftKey) $("sketch-redo").click();
      else $("sketch-undo").click();
      e.preventDefault();
    } else if (e.key === "y") {
      $("sketch-redo").click();
      e.preventDefault();
    }
  }
});

function sketchTogglePalette(open) {
  const palette = $("sketch-palette");
  const chip = $("sketch-ink-chip");
  if (!palette || !chip) return;
  const willOpen = open === undefined ? palette.classList.contains("hidden") : open;
  palette.classList.toggle("hidden", !willOpen);
  chip.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) palette.querySelector(".sketch-color.active, .sketch-color")?.focus();
}

// Closes on a press elsewhere, and on Escape without closing the dialog.
document.addEventListener("click", (event) => {
  if (!event.target.closest?.(".sketch-ink")) sketchTogglePalette(false);
});
document.addEventListener(
  "keydown",
  (event) => {
    const palette = $("sketch-palette");
    if (event.key !== "Escape" || !palette || palette.classList.contains("hidden")) return;
    event.stopPropagation();
    sketchTogglePalette(false);
    $("sketch-ink-chip").focus();
  },
  true
);
