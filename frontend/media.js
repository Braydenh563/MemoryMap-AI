// media.js: the sketch pad, image annotation, voice capture, meeting notes,
// read-aloud. Moved out of app.js on 2026-09-26 as one contiguous range (INBOX
// 426 cc, docs/roadmap/agent-remaining/appjs-split.md). A classic script
// sharing app.js's globals, loaded in app.js's old order; nothing in an earlier
// file calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- Wave F: whiteboard-lite --------------------------------------------------------

// **One highlighter, two renderers** (WHITEBOARD_PLAN decision 7, the half
// decided 2026-09-20). This pad paints into a `<canvas>` and the whiteboard
// paints SVG paths; two rendering models is a reason for two *painters*, not
// for two answers to "what is a highlighter". Every number here used to be
// two numbers: the board was 0.4 with a multiply blend and a 12 to 24 clamp,
// the pad 0.35 with no blend and no clamp, so one tool covered the paper on
// one surface and tinted it on the other (measured: one pass read 176.0 on a
// 255.0 paper here, which is the ink's own luminance, against 229.6 on a
// 252.9 board).
//
// It lives in app.js rather than whiteboard.js because whiteboard.js is
// lazily loaded (the module map near the foot of this file): whiteboard.js
// can read app.js, never the other way round.
const HIGHLIGHTER_STYLE = {
  // The plan's figure. Reported at 0.05 before Phase 3, where a stroke needed
  // roughly twenty overlapping passes to show at all and read as the tool
  // doing nothing.
  alpha: 0.4,
  // A nib, not a scaled pen: both width sliders reach 24 and four times that
  // is a wall, so the product is clamped to the range a real marker has.
  widthMultiplier: 4,
  minWidth: 12,
  maxWidth: 24,
  // A flat end is what a marker leaves; a round join is what keeps a
  // scribbled corner from reading as chipped.
  lineCap: "square",
  lineJoin: "round",
  // Multiply is worth 20 luminance units a pass over a light backdrop and 3
  // over a dark one (measured, WHITEBOARD_PLAN decision 7), so over a dark
  // one the highlighter screens instead: the same "two passes of one pen"
  // signal, in the direction that surface can actually move.
  blendOnLight: "multiply",
  blendOnDark: "screen",
};

// The one width both renderers ask for. Takes the pen width rather than
// reading one: the board's `WB_STROKE_WIDTH` is a `let` inside
// `initWhiteboard`, and a module-level function that read it threw on the
// first stroke.
function highlighterWidth(penWidth) {
  return Math.min(
    HIGHLIGHTER_STYLE.maxWidth,
    Math.max(HIGHLIGHTER_STYLE.minWidth, (penWidth || 3) * HIGHLIGHTER_STYLE.widthMultiplier),
  );
}

// `backdropIsDark` is about what the stroke composites *against*, which is
// not the same question as which theme is on. The pad's strokes land in their
// own transparent canvas stacked over a separate paper canvas, so the
// backdrop a canvas blend sees is the other strokes and never the paper: the
// pad passes false in both themes. The board's paths blend against the board
// itself, so it passes the resolved mode.
function highlighterBlend(backdropIsDark) {
  return backdropIsDark ? HIGHLIGHTER_STYLE.blendOnDark : HIGHLIGHTER_STYLE.blendOnLight;
}

// The pad's one place for "what is the brush right now", so the drag path and
// the single-click dot cannot drift apart: the five lines that make a
// highlighter a highlighter were written out twice before this.
function sketchApplyBrush(context) {
  const isHighlighter = sketchTool === "highlighter";
  const erasing = sketchPen.eraser && sketchTool === "pen";
  context.lineCap = isHighlighter ? HIGHLIGHTER_STYLE.lineCap : "round";
  context.lineJoin = isHighlighter ? HIGHLIGHTER_STYLE.lineJoin : "round";
  context.globalCompositeOperation = erasing
    ? "destination-out"
    : isHighlighter
      ? highlighterBlend(false)
      : "source-over";
  context.globalAlpha = isHighlighter ? HIGHLIGHTER_STYLE.alpha : 1.0;
  context.strokeStyle = sketchPen.color;
  context.lineWidth = isHighlighter
    ? highlighterWidth(sketchPen.size)
    : (erasing ? sketchPen.size * 4 : sketchPen.size);
}

//: **A highlighter is one translucent band, so it is painted once.** Reported
//: three times now, most recently as "it doesnt act as it should and looks
//: messy", and the previous two fixes were both real and both incomplete
//: because they treated the alpha rather than the compositing.
//:
//: Each segment used to be its own `stroke()` at 0.35. That is correct for
//: one segment and wrong for a stroke: consecutive segments overlap at every
//: joint, a 16px band advancing 6px per pointer event covers each pixel about
//: three times, and 1-(1-0.35)^3 is 0.73. Measured on a straight drag against
//: white: coverage 0.80 where the tool asks for 0.35, running from 0.725 to
//: 0.824 down the band (the chain of darker lozenges that reads as "messy"),
//: and a stroke crossing its own line went 0.576 to 0.824.
//:
//: So the points are collected and the whole polyline is drawn on a layer of
//: its own at full opacity, then that layer is composited onto the canvas
//: once, at the stroke's alpha. Overlaps inside the layer are opaque-over-
//: opaque, which changes nothing, and the single composite is the only place
//: alpha is applied. This is what the whiteboard gets for free by drawing one
//: SVG path with `stroke-opacity`, and it is why the two look different.
//:
//: The in-progress stroke repaints from the snapshot each frame, which is the
//: same thing the rect, circle and arrow tools already do here.
let sketchStrokePoints = [];
let sketchLayerCanvas = null;

//: The layer, sized to the canvas it will be blitted onto. Kept between
//: strokes rather than allocated per pointerdown: it is one full-size buffer
//: and a sketch is a burst of strokes.
function sketchStrokeLayer(canvas) {
  if (!sketchLayerCanvas) sketchLayerCanvas = document.createElement("canvas");
  if (sketchLayerCanvas.width !== canvas.width) sketchLayerCanvas.width = canvas.width;
  if (sketchLayerCanvas.height !== canvas.height) sketchLayerCanvas.height = canvas.height;
  const layer = sketchLayerCanvas.getContext("2d");
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, sketchLayerCanvas.width, sketchLayerCanvas.height);
  return layer;
}

//: Draw the whole highlighter stroke as it stands: the snapshot back, the
//: polyline onto the layer at full opacity, the layer onto the canvas at the
//: stroke's alpha. Called from every move and once more on the release.
function sketchPaintHighlighter(context) {
  const canvas = context.canvas;
  const last = sketchHistory[sketchHistory.length - 1];
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  if (last) context.putImageData(last, 0, 0);
  else context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
  if (sketchStrokePoints.length === 0) return;

  const layer = sketchStrokeLayer(canvas);
  //: **No transform on the layer.** `sketchPointer` already returns canvas
  //: pixels, not CSS pixels: it divides by the element's own rect and
  //: multiplies by `canvas.width`. Scaling them again put every highlighter
  //: stroke away from the pointer by `(1 - width/rectWidth)` of its distance
  //: from the origin, which on the pad's 820px canvas in an 850px box was
  //: 15px left and 9px up at the middle of the board, and would overshoot the
  //: other way on any window that draws the canvas smaller than its buffer.
  //: Measured: the stroke's box came back at x 276 to 514 for a drag whose
  //: centre was canvas x 410.
  layer.lineCap = HIGHLIGHTER_STYLE.lineCap;
  layer.lineJoin = HIGHLIGHTER_STYLE.lineJoin;
  layer.globalAlpha = 1;
  layer.strokeStyle = sketchPen.color;
  layer.lineWidth = highlighterWidth(sketchPen.size);
  layer.beginPath();
  const [first, ...rest] = sketchStrokePoints;
  layer.moveTo(first.x, first.y);
  //: A single point is a dab, not a line, and `lineTo` to the same place
  //: draws nothing at all: the nudge is what every one-click mark in this
  //: file uses.
  if (rest.length === 0) layer.lineTo(first.x + 0.01, first.y);
  for (const point of rest) layer.lineTo(point.x, point.y);
  layer.stroke();

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  //: `highlighterBlend(false)`: the layer is blitted onto the strokes canvas,
  //: which sits over the paper canvas rather than holding it, so what this
  //: blend sees behind it is the other strokes and never the paper. See the
  //: table's own note.
  context.globalCompositeOperation = highlighterBlend(false);
  context.globalAlpha = HIGHLIGHTER_STYLE.alpha;
  context.drawImage(sketchLayerCanvas, 0, 0);
  context.restore();
}

let sketchPen = { color: "#3b82f6", size: 4, eraser: false };
let sketchDrawing = false;
let sketchDirty = false;
let sketchTool = "pen"; // "pen", "rect", "circ", "arrow", "text"
let sketchHistory = [];
let sketchRedoStack = [];
let sketchStartX = 0;
let sketchStartY = 0;

function sketchSaveSnapshot() {
  const canvas = $("sketch-canvas");
  const ctx = canvas.getContext("2d");
  sketchHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (sketchHistory.length > 30) sketchHistory.shift();
  sketchRedoStack = [];
}

// §37G: an image the user brought in to annotate over, an `ImageBitmap`, or
// null for a blank page. Lives on its own layer (`#sketch-bg-canvas`) below
// the pen strokes (`#sketch-canvas`), so Clear and the eraser can affect the
// strokes without touching it.
let sketchBackgroundImage = null;

function sketchContext() {
  return $("sketch-canvas").getContext("2d");
}

// Redraws the background layer from scratch: white, then the uploaded image
// (if any) scaled to fit inside the canvas without cropping or stretching.
// Called after every change to `sketchBackgroundImage`, rather than patched
// in place, because "fit inside and centre" isn't otherwise idempotent.
// A reachable background colour, asked for directly, the canvas painted a
// hardcoded white fill with nothing that could change it, and a CSS
// background on the canvas *element* would have done nothing either: this
// fill is opaque pixels drawn into the canvas's own bitmap, which sits in
// front of (and fully hides) whatever the element's CSS background is.
// Persisted the same way the whiteboard's own board colour is (a
// `localStorage` key, not a preference, a look, not notebook data).
const SKETCH_BG_KEY = "sketch-bg-color";
let sketchBgColor = localStorage.getItem(SKETCH_BG_KEY) || "#ffffff";

function sketchDrawBackground() {
  const canvas = $("sketch-bg-canvas");
  const context = canvas.getContext("2d");
  context.fillStyle = sketchBgColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const img = sketchBackgroundImage;
  if (!img) return;
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  context.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

function openSketch() {
  overlayReturnFocus = document.activeElement;
  $("sketch-overlay").classList.remove("hidden");
  $("sketch-close").focus();
  sketchBackgroundImage = null;
  $("sketch-bg-color-picker").value = sketchBgColor;
  sketchDrawBackground();
  const canvas = $("sketch-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  sketchDirty = false;
  sketchHistory = [];
  sketchRedoStack = [];
  sketchTool = "pen";
  // The tool state and the buttons that show it were reset separately, which
  // is to say the buttons were not reset at all: closing the pad with the
  // eraser held left `sketchPen.eraser` true and the eraser lit, and the next
  // open declared `sketchTool = "pen"` above while the eraser button kept its
  // `.active` ring and the eraser kept erasing. Both halves move together.
  sketchPen.eraser = false;
  for (const button of document.querySelectorAll("#sketch-toolbar .ghost.icon-button")) {
    button.classList.toggle("active", button.id === "sketch-tool-pen");
  }
  syncSketchSizeReadout();
  $("sketch-status").textContent = "";
}

// The number beside the width slider. It is written from the input's own value
// rather than from `sketchPen.size` so that it cannot drift from what the
// slider is showing, which is the one thing it exists to report.
function syncSketchSizeReadout() {
  const slider = $("sketch-size");
  $("sketch-size-value").textContent = slider.value;
}

async function sketchUploadImage(file) {
  if (!file) return;
  const status = $("sketch-status");
  try {
    sketchBackgroundImage = await createImageBitmap(file);
    sketchDrawBackground();
    sketchDirty = true; // an image is as much a change as a pen stroke
    status.textContent = "";
  } catch {
    status.textContent = "Couldn't load that image.";
  }
}

async function closeSketch() {
  if (sketchDirty && !(await confirmDialog("Close without saving your sketch?"))) return;
  $("sketch-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

function sketchPointer(event) {
  const canvas = $("sketch-canvas");
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let sketchMoved = false;

function sketchStart(event) {
  sketchDrawing = true;
  sketchDirty = true;
  sketchMoved = false;
  const { x, y } = sketchPointer(event);
  sketchStartX = x;
  sketchStartY = y;
  
  if (sketchTool === "text") {
    const text = prompt("Enter text:");
    if (text) {
      sketchSaveSnapshot();
      const context = sketchContext();
      context.font = `${sketchPen.size * 6}px sans-serif`;
      context.fillStyle = sketchPen.color;
      context.fillText(text, x, y);
    }
    sketchDrawing = false;
    return;
  }

  sketchSaveSnapshot();
  const context = sketchContext();
  // The highlighter keeps its own polyline (see `sketchPaintHighlighter`):
  // the points are this stroke's, so they are cleared at the start of every
  // stroke rather than when the tool changes.
  sketchStrokePoints = sketchTool === "highlighter" ? [{ x, y }] : [];
  if (sketchTool === "pen") {
    context.beginPath();
    context.moveTo(x, y);
  }
  event.target.setPointerCapture(event.pointerId);
}

function sketchMove(event) {
  if (!sketchDrawing) return;
  const { x, y } = sketchPointer(event);
  const context = sketchContext();
  if (x === sketchStartX && y === sketchStartY) return;
  sketchMoved = true;
  
  //: The highlighter is painted whole, from the snapshot up, every frame:
  //: see `sketchPaintHighlighter` for why it cannot be drawn a segment at a
  //: time. Everything below this is the per-segment path the pen and the
  //: shapes use.
  if (sketchTool === "highlighter") {
    sketchStrokePoints.push({ x, y });
    sketchPaintHighlighter(context);
    return;
  }

  if (sketchTool !== "pen") {
    const last = sketchHistory[sketchHistory.length - 1];
    if (last) context.putImageData(last, 0, 0);
    else context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }

  sketchApplyBrush(context);

  if (sketchTool === "pen") {
    context.lineTo(x, y);
    context.stroke();
    //: A fresh single-segment path per move, so a hundred-point stroke does
    //: not re-composite its first segment a hundred times. Harmless at the
    //: pen's full opacity and load-bearing for anything translucent, which
    //: is why the highlighter was here once and is not any more: one segment
    //: drawn once is still not one *stroke* drawn once, and the overlap at
    //: each joint is what `sketchPaintHighlighter` exists to remove.
    context.beginPath();
    context.moveTo(x, y);
  } else if (sketchTool === "line") {
    context.beginPath();
    context.moveTo(sketchStartX, sketchStartY);
    context.lineTo(x, y);
    context.stroke();
  } else if (sketchTool === "rect") {
    // Shift locks proportions: a square instead of whatever rectangle the
    // pointer happens to trace, the same convention every other drawing
    // tool uses, asked for directly. `circ` needs no equivalent: it has
    // always drawn from a single radius (`context.arc`), never width/height
    // independently, so it was already a perfect circle with no ellipse
    // mode to lock out of.
    let w = x - sketchStartX;
    let h = y - sketchStartY;
    if (event.shiftKey) {
      const side = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * side;
      h = Math.sign(h || 1) * side;
    }
    context.beginPath();
    context.rect(sketchStartX, sketchStartY, w, h);
    context.stroke();
  } else if (sketchTool === "circ") {
    context.beginPath();
    const r = Math.sqrt(Math.pow(x - sketchStartX, 2) + Math.pow(y - sketchStartY, 2));
    context.arc(sketchStartX, sketchStartY, r, 0, 2 * Math.PI);
    context.stroke();
  } else if (sketchTool === "arrow") {
    context.beginPath();
    context.moveTo(sketchStartX, sketchStartY);
    context.lineTo(x, y);
    context.stroke();
    const angle = Math.atan2(y - sketchStartY, x - sketchStartX);
    const headLen = sketchPen.size * 3 + 5;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
    context.moveTo(x, y);
    context.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
    context.stroke();
  }
}

function sketchEnd(event) {
  if (sketchDrawing && !sketchMoved && event && (event.type === "pointerup" || event.type === "click")) {
    const context = sketchContext();
    //: A dab with the highlighter goes through the same painter a drag does,
    //: so a press that never moved leaves exactly the alpha every other
    //: highlighter mark leaves.
    if (sketchTool === "highlighter") {
      sketchStrokePoints = [{ x: sketchStartX, y: sketchStartY }];
      sketchPaintHighlighter(context);
      sketchStrokePoints = [];
      sketchDrawing = false;
      return;
    }
    sketchApplyBrush(context);

    if (sketchTool === "pen") {
      context.beginPath();
      context.moveTo(sketchStartX, sketchStartY);
      context.lineTo(sketchStartX, sketchStartY + 0.1);
      context.stroke();
    } else if (sketchTool === "rect") {
      context.lineWidth = sketchPen.size;
      context.beginPath();
      const s = sketchPen.size * 10 + 20;
      context.rect(sketchStartX - s/2, sketchStartY - s/2, s, s);
      context.stroke();
    } else if (sketchTool === "circ") {
      context.lineWidth = sketchPen.size;
      context.beginPath();
      const r = sketchPen.size * 5 + 10;
      context.arc(sketchStartX, sketchStartY, r, 0, 2 * Math.PI);
      context.stroke();
    } else if (sketchTool === "arrow") {
      context.lineWidth = sketchPen.size;
      const len = sketchPen.size * 10 + 20;
      context.beginPath();
      context.moveTo(sketchStartX - len/2, sketchStartY);
      context.lineTo(sketchStartX + len/2, sketchStartY);
      context.stroke();
      const headLen = sketchPen.size * 3 + 5;
      context.beginPath();
      context.moveTo(sketchStartX + len/2, sketchStartY);
      context.lineTo(sketchStartX + len/2 - headLen * Math.cos(Math.PI / 6), sketchStartY - headLen * Math.sin(Math.PI / 6));
      context.moveTo(sketchStartX + len/2, sketchStartY);
      context.lineTo(sketchStartX + len/2 - headLen * Math.cos(-Math.PI / 6), sketchStartY - headLen * Math.sin(-Math.PI / 6));
      context.stroke();
    }
  }
  sketchDrawing = false;
}

async function saveSketch() {
  const status = $("sketch-status");
  status.textContent = "Saving…";
  const caption =
    $("sketch-caption").value.trim() ||
    `Sketch: ${new Date().toLocaleDateString()}`;
  try {
    // Strokes and any uploaded image live on separate canvases (§37G); the
    // saved PNG has to be both together, composited onto a throwaway canvas
    // rather than either layer alone.
    const composite = document.createElement("canvas");
    composite.width = $("sketch-canvas").width;
    composite.height = $("sketch-canvas").height;
    const compositeContext = composite.getContext("2d");
    compositeContext.drawImage($("sketch-bg-canvas"), 0, 0);
    compositeContext.drawImage($("sketch-canvas"), 0, 0);
    const blob = await new Promise((resolve) => composite.toBlob(resolve, "image/png"));

    // **Through `/media/upload`, not `/entries/{id}/files`.** A sketch used
    // to be saved as an *attachment*, which is a different table and a
    // different pipeline: attachments are files hanging off a note, and only
    // `MediaUpload` rows are captioned, OCR'd, read by a vision model, or
    // listed in the Library's gallery. So a drawing was the one image in this
    // app that none of that ever touched, reported directly: "add captioning
    // and vision and ocr for sketches the user draws and saves as well".
    //
    // Uploading first and referencing the result in the note's markdown is
    // exactly what dropping an image into the note editor already does, so
    // this is now the same path rather than a second one: the picture appears
    // inline in the note, in the gallery, and in `media_process`'s queue.
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const form = new FormData();
    form.append("file", blob, `sketch-${stamp}.png`);
    const uploaded = await apiJson("/media/upload", {
      method: "POST",
      headers: { "X-Auth-Token": authToken() },
      body: form,
    });
    // The caption stays the note's own first line, it is what the person
    // typed and what the note is called. The image follows it.
    const entry = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({
        content: `${caption}\n\n![${caption}](${uploaded.url})`,
        category: "Sketches",
      }),
    });
    if (!entry?.id) throw new Error("Couldn't save the sketch note.");
    sketchDirty = false;
    $("sketch-overlay").classList.add("hidden");
    $("sketch-caption").value = "";
    toast("Sketch saved to your notebook.");
    loadEntries().catch(() => {});
  } catch (error) {
    status.textContent = error.message;
  }
}

// --- Wave H: voice capture (local Whisper) ------------------------------------------

let voiceStatus = null; // cached /voice/status
let recorder = null; // the active MediaRecorder, if any
let recorderTarget = null; // which input gets the transcript

// Live mic-level ring on a recording button, driven off the same MediaStream
// the recorder already opened, no extra permission, no extra stream.
// Returns a stop() that tears down the AudioContext; callers must invoke it
// before the stream's tracks are stopped.
// A small scrolling bar meter, Voice-Memos-style: five bars, oldest sample on
// the left, newest on the right, each redrawn from the analyser at ~15fps, 
// full 60fps would reshuffle the bars faster than a glance can read as a
// wave. The plain ring this replaced was a single number's worth of signal
// and, worse, was drawn in --warn-soft: a token pre-mixed pale enough that on
// a near-white modal card it was measured, by screenshot, as functionally
// invisible: that's what "no animation" on the meeting recorder turned out
// to be. --recording-ring (a solid --warn mixed at capture time, defined
// alongside button.recording below) replaced it there and is reused here.
const MIC_BAR_COUNT = 5;
const MIC_BAR_SAMPLE_EVERY = 4; // frames between bar updates, ~15fps at 60fps rAF
// getByteFrequencyData's 128 bins (at fftSize=256) span the full 0-22kHz
// range, but speech energy sits almost entirely under ~5.5kHz. Averaging
// every bin, the previous behaviour, mixed a real voice signal with ~100
// near-silent high-frequency bins and diluted it to a fraction of what a
// human ear perceives as "there's sound". Restricting the average to the
// low bins reflects what's actually in a voice.
const MIC_BAR_SPEECH_BIN_FRACTION = 0.25;
// Reported live as "the bars don't show even at minimum sound pick-up":
// at a 0.12 floor, a 14px bar renders under 2px tall, not subtle, just
// below what's visible. 0.12 was chosen to read as "listening, not
// frozen" (see below) but never accounted for how few pixels that scale
// actually leaves. Raised so the resting state itself is visible.
const MIC_BAR_MIN_SCALE = 0.3;

function startMicLevelMeter(stream, button) {
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return () => {}; // no Web Audio support, recording still works, just no meter
  }
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const speechBinCount = Math.round(data.length * MIC_BAR_SPEECH_BIN_FRACTION);
  button.classList.add("live-level");

  const bars = document.createElement("span");
  bars.className = "mic-bars";
  bars.setAttribute("aria-hidden", "true");
  const barEls = Array.from({ length: MIC_BAR_COUNT }, () => {
    const bar = document.createElement("span");
    bar.className = "mic-bar";
    bars.appendChild(bar);
    return bar;
  });
  button.appendChild(bars);
  const history = new Array(MIC_BAR_COUNT).fill(0);

  let tickCount = 0;
  let frame = null;
  let stopped = false;

  function startLoop() {
    if (stopped) return;
    frame = requestAnimationFrame(function tick() {
      if (stopped) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < speechBinCount; i++) sum += data[i];
      const avg = sum / speechBinCount;
      if (tickCount % MIC_BAR_SAMPLE_EVERY === 0) {
        // sqrt, not linear: ordinary speaking volume sits low in the raw
        // 0-255 range, and a linear map leaves it barely above the resting
        // floor. The square root curve lifts quiet-to-moderate signal
        // (where a voice actually lives) without letting loud input clip.
        history.push(Math.sqrt(avg / 255));
        history.shift();
        history.forEach((level, i) => {
          // A silent bar never fully flattens, Voice Memos' own resting bars
          // read as "listening", a flat line reads as "frozen".
          barEls[i].style.setProperty("--bar-scale", Math.max(level, MIC_BAR_MIN_SCALE).toFixed(3));
        });
      }
      tickCount++;
      frame = requestAnimationFrame(tick);
    });
  }

  // Some browsers (including Chrome on Windows) create AudioContext suspended
  // even inside a click handler. The analyser returns all-zero until the
  // context is actually running. Wait for resume() to resolve rather than
  // firing the loop immediately and reading silence on the first N frames.
  // A small additional delay lets the OS audio stack fully open the device.
  ctx.resume().then(() => {
    setTimeout(startLoop, 150);
  }).catch(() => {
    // resume() failed: start anyway; if it's really suspended the bars just
    // stay at their floor scale, which is still visible and shows the button
    // is in recording state.
    setTimeout(startLoop, 150);
  });

  return () => {
    stopped = true;
    if (frame !== null) cancelAnimationFrame(frame);
    button.classList.remove("live-level");
    bars.remove();
    source.disconnect();
    ctx.close().catch(() => {});
  };
}

async function toggleDictation(button, targetInput) {
  if (recorder) {
    recorder.stop(); // second press = stop → transcribe
    return;
  }
  if (voiceStatus === null) {
    voiceStatus = await apiJson("/voice/status").catch(() => ({ available: false }));
  }
  if (!voiceStatus.available) {
    toast(voiceStatus.hint || "Voice capture isn't available.", true);
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    toast("Microphone access was blocked, allow it in your browser.", true);
    return;
  }
  //: **The button's resting label, read once and kept.** Reported: the word
  //: "Dictate" disappears the first time you record and never comes back.
  //: `setLabel` replaces every child of the button, so the two calls below
  //: were swapping the glyph and dropping the word with it; the stop handler
  //: then restored a bare microphone, which is the state the report describes.
  //:
  //: Read here rather than inside the stop handler because by then the only
  //: label on the button is "Stop", and kept on the element rather than in a
  //: closure because a second recording starts a new one. The chat mic
  //: (`#mic-chat`) is `icon-only` and has no `.ph-text` at all: it reads as an
  //: empty string and must stay that way, or it gains a word and stops being
  //: square.
  if (button.dataset.restLabel === undefined) {
    button.dataset.restLabel = button.querySelector(".ph-text")?.textContent?.trim() || "";
  }
  const resting = button.dataset.restLabel;
  const chunks = [];
  recorder = new MediaRecorder(stream);
  recorderTarget = targetInput;
  let stopLevelMeter = () => {};
  recorder.addEventListener("dataavailable", (e) => chunks.push(e.data));
  recorder.addEventListener("stop", async () => {
    stream.getTracks().forEach((t) => t.stop());
    stopLevelMeter();
    button.classList.remove("recording");
    setLabel(button, resting ? `ph:microphone ${resting}` : "ph:microphone");
    recorder = null;
    const blob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "clip.webm");
    toast("Transcribing…");
    try {
      const response = await fetch("/voice/transcribe", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Transcription failed");
      const box = recorderTarget;
      box.value = box.value ? `${box.value.trimEnd()} ${body.text}` : body.text;
      box.focus();
    } catch (error) {
      toast(error.message, true);
    }
  });
  recorder.start();
  button.classList.add("recording");
  setLabel(button, resting ? "ph:stop Stop" : "ph:stop");
  // Appended after setLabel, not before: setLabel's replaceChildren() wipes
  // every child on the button, and the bar meter startMicLevelMeter() builds
  // is one: appending it earlier just got it discarded a line later.
  stopLevelMeter = startMicLevelMeter(stream, button);
}

// --- meeting notes (§17) -------------------------------------------------------------
//
// The backlog's own "highest-value single addition still unbuilt": the quick
// microphone button above is sized for a spoken note (server caps it at 25MB,
// `routes_voice.py`'s own comment says "a spoken note, not a podcast"), a
// meeting or a lecture needs a separate flow with its own recording cap, a
// visible elapsed timer so a long recording doesn't feel stalled, and a
// review step before the transcript becomes a note, the same "you're in
// control before it's saved" shape the persona-peek and compression-summary
// features already use elsewhere.
//
// Action-item extraction (the other half of §17's ask, "extract action items
// into reminders") is deliberately not built here. It needs a real model
// call this sandbox cannot exercise, faster-whisper itself is not installed
// here either, so even the transcription step is untested past its request
// shape: and guessing at that prompt's behaviour without a way to check it
// is exactly what CLAUDE.md's standing caveat warns against. Recording it as
// open rather than quietly shipping an unverified guess.

let meetingRecorder = null;
let meetingStream = null;
let meetingChunks = [];
let meetingTimerHandle = null;
let meetingStartedAt = 0;

function meetingElapsedText() {
  const seconds = Math.max(0, Math.round((Date.now() - meetingStartedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

//: How many amplitude samples the waveform holds. About four seconds at the
//: sample rate below, which is enough to see the shape of a sentence without
//: the line becoming a texture.
const MEETING_WAVE_POINTS = 140;
//: Frames between samples. Every frame would fill the window in two seconds
//: and spend a redraw on a difference nobody can see.
const MEETING_WAVE_EVERY = 3;

//: Kept at module level so `closeMeetingRecorder` can stop a draw loop that
//: `toggleMeetingRecording` started: the two are different user actions and
//: neither can reach the other's locals.
let stopMeetingWave = () => {};

// The line that moves while you talk. See the note in index.html for why the
// six-bar meter on the Record button was not enough: a recording with no
// visible response to your voice is indistinguishable from a broken
// microphone, and that is what was actually being reported.
function startMeetingWave(stream) {
  const canvas = document.getElementById("meeting-wave");
  if (!canvas) return () => {};
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return () => {}; // no Web Audio: the recording itself is unaffected
  }
  const analyser = ctx.createAnalyser();
  // 2048 in the *time* domain: this draws a level line, and a bigger window
  // gives a steadier RMS than the 256-bin frequency analyser the button meter
  // uses. Both can run at once, they are separate nodes on the same stream.
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const levels = new Array(MEETING_WAVE_POINTS).fill(0);

  const paint = canvas.getContext("2d");
  canvas.classList.remove("hidden");
  // Size the backing store to the box it is actually drawn in, at the
  // device's own pixel density. The markup's 960×120 is a fallback for the
  // frame before layout; leaving it there stretches the line horizontally and
  // makes it soft on any HiDPI screen. Measured after `remove("hidden")`, 
  // a hidden element has no width to read.
  const box = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (box.width) {
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);
  }
  let frame = null;
  let ticks = 0;
  let stopped = false;

  function draw() {
    const { width, height } = canvas;
    const middle = height / 2;
    paint.clearRect(0, 0, width, height);
    // The accent, read from the live stylesheet rather than hard-coded, so
    // the line follows whatever theme is set, including a custom one.
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      "#4664f0";
    paint.strokeStyle = accent;
    paint.lineWidth = 2;
    paint.lineJoin = "round";
    paint.lineCap = "round";
    const step = width / (levels.length - 1);
    // Two mirrored strokes rather than one: a level line drawn only upward
    // reads as a graph, and the symmetrical pair reads as sound.
    for (const direction of [-1, 1]) {
      paint.beginPath();
      levels.forEach((level, i) => {
        const y = middle + direction * level * (middle - 4);
        if (i === 0) paint.moveTo(0, y);
        else paint.lineTo(i * step, y);
      });
      paint.stroke();
    }
  }

  function tick() {
    if (stopped) return;
    if (ticks % MEETING_WAVE_EVERY === 0) {
      analyser.getByteTimeDomainData(samples);
      // RMS around the 128 midpoint, the honest measure of loudness, and
      // steadier than a peak, which flickers on consonants.
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        const value = (samples[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / samples.length);
      // sqrt again for the same reason the bar meter gives: ordinary speech
      // sits low in the range and a linear map leaves it near the floor.
      levels.push(Math.min(1, Math.sqrt(rms) * 1.6));
      levels.shift();
      draw();
    }
    ticks++;
    frame = requestAnimationFrame(tick);
  }

  // Chrome creates an AudioContext suspended even inside a click handler, and
  // the analyser reads all-zero until it is running, the same trap the bar
  // meter documents. Start the loop after resume resolves.
  ctx.resume().then(tick, tick);

  return () => {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    ctx.close().catch(() => {});
    canvas.classList.add("hidden");
    paint.clearRect(0, 0, canvas.width, canvas.height);
  };
}

function stopMeetingTimer() {
  if (meetingTimerHandle) clearInterval(meetingTimerHandle);
  meetingTimerHandle = null;
}

// Resets the overlay to "ready to record", whether it's opening fresh or
// coming back after a discard, the same state either way.
function resetMeetingUI() {
  $("meeting-timer").textContent = "0:00";
  $("meeting-status").textContent = "";
  $("meeting-status").classList.remove("error");
  $("meeting-transcript").value = "";
  $("meeting-transcript").classList.add("hidden");
  $("meeting-save-row").classList.add("hidden");
  $("meeting-record").disabled = false;
  $("meeting-record").classList.remove("recording");
  setLabel($("meeting-record"), "ph:record Record");
  $("meeting-pause")?.classList.add("hidden");
  setLabel($("meeting-pause"), "ph:pause Pause");
  $("meeting-wave")?.classList.add("hidden");
}

async function openMeetingRecorder() {
  overlayReturnFocus = document.activeElement;
  resetMeetingUI();
  $("meeting-overlay").classList.remove("hidden");
  $("meeting-record").focus();
}

// Recording is stopped (discarded, not transcribed) rather than left running
// in the background: a MediaRecorder with no owner is a live microphone
// nobody is looking at.
function closeMeetingRecorder() {
  if (meetingRecorder && meetingRecorder.state !== "inactive") {
    meetingRecorder.onstop = null; // don't also try to transcribe a discard
    meetingRecorder.stop();
  }
  meetingStream?.getTracks().forEach((t) => t.stop());
  stopMeetingWave();
  stopMeetingWave = () => {};
  meetingRecorder = null;
  meetingStream = null;
  stopMeetingTimer();
  $("meeting-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

async function toggleMeetingRecording() {
  const button = $("meeting-record");
  if (meetingRecorder) {
    button.disabled = true; // one press, not a double-fire while it stops
    meetingRecorder.stop();
    return;
  }
  if (voiceStatus === null) {
    voiceStatus = await apiJson("/voice/status").catch(() => ({ available: false }));
  }
  if (!voiceStatus.available) {
    $("meeting-status").textContent = voiceStatus.hint || "Voice capture isn't available.";
    $("meeting-status").classList.add("error");
    return;
  }
  try {
    meetingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    $("meeting-status").textContent = "Microphone access was blocked, allow it in your browser.";
    $("meeting-status").classList.add("error");
    return;
  }
  meetingChunks = [];
  meetingRecorder = new MediaRecorder(meetingStream);
  let stopMeetingLevelMeter = () => {};
  meetingRecorder.addEventListener("dataavailable", (e) => meetingChunks.push(e.data));
  meetingRecorder.addEventListener("stop", async () => {
    meetingStream?.getTracks().forEach((t) => t.stop());
    stopMeetingLevelMeter();
    stopMeetingWave();
    stopMeetingWave = () => {};
    $("meeting-pause").classList.add("hidden");
    meetingStream = null;
    meetingRecorder = null;
    stopMeetingTimer();
    button.classList.remove("recording");
    setLabel(button, "ph:record Record");
    button.disabled = false;
    const blob = new Blob(meetingChunks, { type: meetingChunks[0]?.type || "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "meeting.webm");
    $("meeting-status").classList.remove("error");
    $("meeting-status").textContent =
      "Transcribing… a long recording can take a while on CPU.";
    try {
      const response = await fetch("/voice/transcribe-meeting", {
        method: "POST",
        headers: { "X-Auth-Token": authToken() },
        body: form,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Transcription failed");
      $("meeting-status").textContent = "Transcribed: review it below before saving.";
      $("meeting-transcript").value = body.text;
      $("meeting-transcript").classList.remove("hidden");
      $("meeting-save-row").classList.remove("hidden");
      $("meeting-transcript").focus();
    } catch (error) {
      $("meeting-status").textContent = error.message;
      $("meeting-status").classList.add("error");
    }
  });
  meetingRecorder.start();
  meetingStartedAt = Date.now();
  $("meeting-timer").textContent = meetingElapsedText();
  meetingTimerHandle = setInterval(() => {
    $("meeting-timer").textContent = meetingElapsedText();
  }, 1000);
  button.classList.add("recording");
  setLabel(button, "ph:stop Stop");
  // Appended after setLabel, not before: setLabel's replaceChildren() wipes
  // every child on the button, and the bar meter startMicLevelMeter() builds
  // is one: appending it earlier just got it discarded a line later.
  stopMeetingLevelMeter = startMicLevelMeter(meetingStream, button);
  stopMeetingWave = startMeetingWave(meetingStream);
  $("meeting-pause").classList.remove("hidden");
  $("meeting-status").textContent = "";
  $("meeting-status").classList.remove("error");
}

// Pause and resume, which a MediaRecorder supports directly, the chunks
// simply stop arriving and the recording continues where it left off. Asked
// for as part of "expanded as a proper feature with more capabilities", and
// it is the one a real meeting needs: someone leaves the room, a side
// conversation starts, and the alternative today is stopping and starting a
// second recording that transcribes as a separate transcript.
//
// The elapsed timer is corrected on resume rather than left running: it is
// showing how long the *recording* is, and a paused stretch is not in it.
let meetingPausedAt = 0;

function toggleMeetingPause() {
  if (!meetingRecorder) return;
  const button = $("meeting-pause");
  if (meetingRecorder.state === "recording") {
    meetingRecorder.pause();
    meetingPausedAt = Date.now();
    stopMeetingTimer();
    setLabel(button, "ph:play Resume");
    $("meeting-status").textContent = "Paused.";
  } else if (meetingRecorder.state === "paused") {
    meetingRecorder.resume();
    // Push the start forward by however long the pause lasted, so the timer
    // keeps reading as the length of the audio rather than of the sitting.
    meetingStartedAt += Date.now() - meetingPausedAt;
    meetingTimerHandle = setInterval(() => {
      $("meeting-timer").textContent = meetingElapsedText();
    }, 1000);
    setLabel(button, "ph:pause Pause");
    $("meeting-status").textContent = "";
  }
}

// An hour of transcript is not a note. In the Notes list it is one enormous
// card nobody can scroll past; as a document it is something you can open,
// edit, extract notes from and export, which is what the rest of this app
// already does well with long text.
async function saveMeetingDocument() {
  const content = $("meeting-transcript").value.trim();
  if (!content) return;
  const status = $("meeting-status");
  const button = $("meeting-save-doc");
  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Saving…";
  try {
    const title =
      ($("meeting-title")?.value || "").trim() ||
      `Recording: ${new Date().toLocaleString()}`;
    const document_ = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    closeMeetingRecorder();
    switchTab("documents");
    openDocument(document_.id);
    toast(`Saved “${title}” to your documents.`);
  } catch (error) {
    status.textContent = error.message || "Couldn't save that.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

async function saveMeetingNote() {
  const content = $("meeting-transcript").value.trim();
  if (!content) return;
  const status = $("meeting-status");
  const button = $("meeting-save");
  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Summarizing…";
  try {
    // Best-effort, same contract as suggest-tags: a model that's offline or
    // errors must never block filing the note, so any failure here just
    // means no summary block gets prepended, not a stalled save.
    let summary = "";
    try {
      const result = await apiJson("/voice/summarize", {
        method: "POST",
        body: JSON.stringify({ text: content }),
      });
      summary = (result?.summary || "").trim();
    } catch {
      summary = "";
    }

    status.textContent = "Filing…";
    // Tagged, not force-categorised: filing still goes through the same
    // AI-or-keyword pipeline as any other capture (routes_entries.py), so a
    // meeting about a specific project lands there rather than in a generic
    // "Meetings" bucket regardless of what it was actually about. The tag is
    // what makes every meeting findable as a class either way.
    // The title, when one was typed, becomes the note's first line: which is
    // what every list in this app shows as its name. Without it a saved
    // recording is titled by whatever word the transcript happens to open on.
    const title = ($("meeting-title")?.value || "").trim();
    const body = summary ? `${summary}\n\n---\n\n${content}` : content;
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({
        content: title ? `${title}\n\n${body}` : body,
        tags: ["meeting"],
      }),
    });
    toast(filedByText(saved));
    await loadEntries();
    // The overlay is about to close, so this jumps straight to the note
    // rather than leaving an "offer" button behind in a dialog nobody is
    // looking at anymore (`offerJumpToNewNote`'s pattern, used from the
    // Capture tab you're still sitting on), `flashEntry` handles its own
    // navigation to Notes → Browse.
    closeMeetingRecorder();
    flashEntry(saved.id);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// --- Wave H: read-aloud (the browser's local voices) --------------------------------

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    toast("This browser has no text-to-speech voices.", true);
    return;
  }
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel(); // acting as a stop button
    return;
  }
  if (!text.trim()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  //: Read aloud is sound this app makes, so the companion can hear it.
  if (typeof nameMarkBuddySound === "function") {
    utterance.addEventListener("start", () => nameMarkBuddySound("speech", true));
    for (const type of ["end", "error"]) utterance.addEventListener(type, () => nameMarkBuddySound("speech", false));
  }
  speechSynthesis.speak(utterance);
}
