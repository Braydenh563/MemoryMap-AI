// note-cards.js: map chips and previews, the board index, entryItem (the note
// card). Moved out of app.js on 2026-09-26 as one contiguous range (INBOX 426
// cc, docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- one map chip and one map preview, used everywhere ----------------------
//
//: MINDMAP_PLAN.md §5 item 12, and the sentence in it that is the whole
//: reason this exists: *"One `mapChip()` and one `mapPreview()`, used by all
//: of them: the app's recurring failure is the same object drawn five
//: ways."*
//:
//: It had already happened twice before this was written. The Library's board
//: card (`renderLibraryBoardsGallery`, whiteboard.js) drew the minimap with
//: edges, labels, a sketch squiggle and an edge-aware label side; the
//: dashboard's boards widget (`dashBoardThumb`, dashboard.js) drew the *same*
//: `preview_items` at a different scale with **no edges at all**, so the one
//: fact that distinguishes a map from a board was missing from one of the two
//: places a map appears. Neither was wrong on its own; they were two opinions
//: of one picture.
//:
//: Lives in app.js because five files draw these, whiteboard.js, dashboard.js,
//: the timeline and the note renderer here, and the chat transcript, and
//: app.js is the one loaded before all of them (see index.html's script
//: order).

//: The sizes a preview is ever drawn at. A named size rather than a pair of
//: numbers per call site: "the Library card's minimap" and "the dashboard
//: row's thumbnail" are the two real cases, and letting each caller pass its
//: own geometry is how the two drifted apart in the first place.
//:
//: `labels` is off at row size deliberately. Sixteen characters beside a 9×6
//: block is a legible texture in a 100×56 card; the same text in a 40×40
//: thumbnail is a smear.
//:
//: `w`/`h` are the *box the picture is letterboxed into*, not the viewBox:
//: since the drawing is now made at the board's own ratio, the two are the
//: same only for a board that happens to be shaped like the card. Everything
//: else here (`pad`, `blockW`, `blockH`, `font`) is a size in that box, and
//: `mapPreview` divides each of them by the scale the browser is about to
//: apply, so a node in a tall map is drawn the same number of pixels across
//: as a node in a wide one. Without that division the block sizes are in
//: viewBox units and a square board's nodes come out 44% smaller than a wide
//: board's, for no reason a reader could see.
const MAP_PREVIEW_SIZES = {
  card: { w: 100, h: 56, pad: 3, blockW: 9, blockH: 6, labels: true, font: 4.2 },
  row: { w: 40, h: 40, pad: 3, blockW: 4, blockH: 3, labels: false, font: 0 },
};

//: The long side of the board's own box, in viewBox units. Arbitrary: only
//: the *ratio* of the viewBox is meaningful, since `preserveAspectRatio`
//: scales it into the card either way. 100 keeps the numbers in the DOM
//: readable when someone inspects a thumbnail.
const MAP_PREVIEW_BASE = 100;

//: How round a node is, as a fraction of its short side. A node on the canvas
//: is a rounded card, not a dot and not a pill, and the miniature says the
//: same thing at a twentieth of the size.
//:
//: **Was 0.35, and 0.35 is a blob** (INBOX 164: "board previews need upgrading
//: and fixing", with a screenshot of a wash of rounded blobs). Measured on a
//: seeded board at 1440 (`scratchpad/ui-sweeps/boardpreview.js`): every block
//: came out 52.9x24.7 with a rendered corner radius of 8.66px, which is 35% of
//: its own short side. A rectangle whose corners eat a third of its height is
//: not a rounded rectangle, and nothing on the canvas looks like that: a note
//: card is `--radius`, 10px on a 150px side, which is 7%.
const MAP_PREVIEW_NODE_ROUNDING = 0.22;

//: And the ceiling that does the real work, in the nominal units
//: `MAP_PREVIEW_SIZES` is written in. A fraction of the short side alone cannot
//: be right at both sizes this preview draws at: the same 22% is a gentle
//: corner on a 25px-tall block in a Library card and a pill on a 4px one in a
//: dashboard row. It is divided back out by the box's own scale below, so the
//: corner is the same size whatever shape the board is, and the fraction is
//: left as the floor for a block too small to carry it.
//:
//: The nominal box is not pixels: a `card` is 100x56 here and measured 293.5px
//: wide in the Library, so one unit is about 2.9 rendered pixels, and 0.8 of one
//: is the 2px corner a note card has on the canvas.
const MAP_PREVIEW_CORNER_UNITS = 0.8;

//: The floor on a block's drawn size, as a multiple of the size every block
//: used to be. A small object on a large board is a fraction of a viewBox
//: unit once it is drawn to scale, and a preview whose smallest things are
//: invisible is a preview of the big ones only.
const MAP_PREVIEW_MIN_BLOCK = 0.5;

//: A character's width as a fraction of the type size. Still here as the
//: fallback for a browser that cannot measure (see `mapPreviewTextWidth`),
//: and as the unit the padding around a label is expressed in.
//:
//: **It is no longer what decides whether a label fits**, and the reason is a
//: measurement. An estimate that is 0.55 when the font draws wider puts the
//: text past the room it was budgeted, and the budget is what every later
//: decision is made from: measured on a seeded board, "body text" was
//: budgeted into a margin and painted 20.0 units wide starting at x=100.1 in
//: a 100-unit-wide viewBox, so the label began past the edge of the paper.
//: Reported as "the boards and maps previews are kinda a mess".
const MAP_PREVIEW_CHAR_WIDTH = 0.55;

//: **What a label really paints, at font-size 1, cached by string.**
//:
//: One hidden SVG for the whole page, carrying `.board-minimap` so the
//: stylesheet's own family and weight apply: measuring in a different font
//: than the one drawn is worse than not measuring, because it is wrong with
//: confidence. `getComputedTextLength` is the SVG text metric and needs the
//: element in a rendered tree, which a freshly built preview is not, hence a
//: measuring element rather than the label itself.
//:
//: Measured once per distinct string at size 100 and divided back out, so a
//: board's six titles cost six measurements however many previews of it are
//: on screen, and a title that appears in the dashboard widget and in the
//: Library is measured once for both. The cost this comment's predecessor
//: worried about ("laying out every thumbnail twice") is what the cache
//: removes: nothing is laid out twice, and nothing is laid out per preview.
const MAP_PREVIEW_TEXT_WIDTHS = new Map();
const MAP_PREVIEW_MEASURE_SIZE = 100;
let mapPreviewMeasureText = null;

function mapPreviewTextWidth(text, fontSize) {
  const body = String(text || "");
  if (!body) return 0;
  let perUnit = MAP_PREVIEW_TEXT_WIDTHS.get(body);
  if (perUnit === undefined) {
    perUnit = null;
    try {
      if (!mapPreviewMeasureText) {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        //: `board-minimap` for the font, `map-preview-measure` for the
        //: off-screen placement: the CSP refuses an inline `style=`, so both
        //: are classes (10-responsive.css holds the second).
        svg.setAttribute("class", "board-minimap map-preview-measure");
        svg.setAttribute("aria-hidden", "true");
        const node = document.createElementNS(NS, "text");
        node.setAttribute("font-size", String(MAP_PREVIEW_MEASURE_SIZE));
        svg.appendChild(node);
        document.body.appendChild(svg);
        mapPreviewMeasureText = node;
      }
      mapPreviewMeasureText.textContent = body;
      const measured = mapPreviewMeasureText.getComputedTextLength();
      if (measured > 0) perUnit = measured / MAP_PREVIEW_MEASURE_SIZE;
    } catch {
      //: A browser with no SVG text metrics, or a document that will not take
      //: the element: the estimate below is what this always used.
      perUnit = null;
    }
    MAP_PREVIEW_TEXT_WIDTHS.set(body, perUnit);
  }
  return perUnit === null
    ? body.length * MAP_PREVIEW_CHAR_WIDTH * fontSize
    : perUnit * fontSize;
}

//: Cut a label to the widest it may paint, measuring rather than counting
//: characters: "Illinois" and "WWWWWWWW" are eight characters and very
//: different widths, and the second is what runs off the paper. Returns null
//: when even one character and the ellipsis will not fit, which is the "draw
//: nothing" case the caller already had.
function mapPreviewFitText(text, fontSize, room) {
  const body = String(text || "");
  if (!body) return null;
  if (mapPreviewTextWidth(body, fontSize) <= room) return body;
  for (let cut = body.length - 1; cut >= 1; cut--) {
    const shown = `${body.slice(0, cut).trimEnd()}\u2026`;
    if (mapPreviewTextWidth(shown, fontSize) <= room) return shown;
  }
  return null;
}

//: Do two boxes share more than a hair? A shared edge is not a collision, and
//: floating point makes an exactly shared edge rare, so the threshold is a
//: fraction of a unit rather than zero.
//: Is a painted box wholly on the thumbnail's paper? The slack is one
//: hundredth of a unit, which is below what `round2` can express, so a box
//: that lands exactly on the border is inside rather than half a rounding
//: error outside it.
function mapPreviewOnPaper(box, vw, vh) {
  return (
    box.x >= -0.01 && box.y >= -0.01
    && box.x + box.w <= vw + 0.01 && box.y + box.h <= vh + 0.01
  );
}

function mapPreviewOverlaps(a, b, slack = 0.35) {
  return (
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > slack
    && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > slack
  );
}

//: **Which ink a label takes when it sits on a coloured node.** Measured
//: with `scratchpad/ui-sweeps/preview.js` the day inside labels landed: a
//: map's branch nodes are drawn at full strength in their branch colour, and
//: the app's own ink on a mid-tone blue is 3.82:1, under the 4.5 the rest of
//: the app is held to. White on that same blue is 4.9:1. The rule is the
//: usual one: pick whichever of the two the colour is further from, and
//: return the name of the class that paints it (see 10-responsive.css).
//:
//: Only for a label *inside* a coloured block. A label beside one sits on the
//: paper and keeps `--ink` from the stylesheet, which is where the theme
//: belongs.
function mapPreviewOnColour(colour) {
  const hex = String(colour || "").trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const value = parseInt(m[1], 16);
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255);
  // 0.18 is where white and black are equally far in WCAG terms.
  return luminance > 0.18 ? "dark" : "light";
}

//: The shortest label worth putting inside a shape. Below this the block is
//: too small to hold a word and the label goes beside it, where it has the
//: whole margin to run into: "M…" on a node says less than nothing.
const MAP_PREVIEW_MIN_INSIDE_CHARS = 5;

//: The shortest label worth drawing beside a shape. Under this the margin the
//: label would hang into holds "C…" and nothing more, which is texture with
//: a tooltip's worth of meaning and reads as a stray mark.
const MAP_PREVIEW_MIN_OUTSIDE_CHARS = 4;

//: How much of the card's width the letterboxed board has to fill before its
//: labels are worth drawing, as a fraction. See where it is used.
const MAP_PREVIEW_LABEL_FLOOR = 0.6;

//: Two decimals, as a number. Every coordinate in a thumbnail is now a
//: division by a scale factor, so without this the DOM fills with
//: `x="17.142857142857142"`: bytes, and unreadable when someone inspects a
//: card to work out what it drew.
function round2(value) {
  return Math.round(value * 100) / 100;
}

//: **One parent→child edge, as a curve.** Straight lines were what the first
//: version drew, and a tree of straight segments at thumbnail size reads as a
//: bar chart: the canvas draws cubic curves (`wbMapEdgePathD`), so the
//: miniature draws them too, and the two pictures of one map agree.
//:
//: The control points follow the dominant axis rather than the board's
//: `layout`: a `tree-right` map curves out sideways and a `tree-down` map
//: curves downward, and asking each segment which way it actually runs gets
//: both right, including the nodes someone dragged off the layout by hand.
//: The caller says how the curve is coloured, because the two ways of doing it
//: cannot both come from a class: an edge in its branch colour carries a
//: `stroke` *attribute*, and a presentation attribute loses to any class that
//: declares `stroke`. So `.board-minimap-edge` is geometry only, and an
//: uncoloured edge takes `.board-minimap-edge-accent` on top of it. The
//: alternative, `el.style.stroke`, writes a `style` attribute, which this
//: app's CSP drops and `mindmap3.js` asserts the absence of.
function mapPreviewEdge(NS, px, py, blockW, blockH, edge) {
  const curve = document.createElementNS(NS, "path");
  curve.setAttribute("class", "board-minimap-edge");
  // Half a block: a line should meet the centre of what it joins, and a block
  // is drawn from its top-left corner.
  const x1 = px(edge.x1) + blockW / 2;
  const y1 = py(edge.y1) + blockH / 2;
  const x2 = px(edge.x2) + blockW / 2;
  const y2 = py(edge.y2) + blockH / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.abs(dx) >= Math.abs(dy)
    ? `M${round2(x1)} ${round2(y1)} C${round2(x1 + dx / 2)} ${round2(y1)} ${round2(x2 - dx / 2)} ${round2(y2)} ${round2(x2)} ${round2(y2)}`
    : `M${round2(x1)} ${round2(y1)} C${round2(x1)} ${round2(y1 + dy / 2)} ${round2(x2)} ${round2(y2 - dy / 2)} ${round2(x2)} ${round2(y2)}`;
  curve.setAttribute("d", d);
  return curve;
}

//: **A drawn stroke, drawn as the shape it actually is.** INBOX 164's "one
//: squiggle": every sketch on a board used to come out as the same small wave
//: at the same place, because the server sent every sketch at the board's
//: origin at one default size (fixed in `_sketch_preview`) and this drew one
//: generic mark whatever had been drawn. A board of eight shapes previewed as a
//: single scribble in the corner.
//:
//: The stroke data itself is still not shipped, and deliberately: a path per
//: sketch on a twenty-board list is the payload of a board load, for a picture
//: 290px wide. What is shipped is the tool it was drawn with, which is enough
//: for the thumbnail to say the true thing about each one: a rectangle is a
//: rectangle, a circle is a circle, a line runs corner to corner, and a pen
//: stroke is a scribble that fills its own box. Everything is at the stroke's
//: real position and size, so eight shapes are eight marks where they were
//: drawn.
//:
//: `stroke-width` and `stroke` arrive as attributes and the stylesheet must not
//: declare either, which is the trap `mapPreviewEdge` carries the same note
//: about: a CSS declaration beats a presentation attribute however specific the
//: attribute looks. `.board-minimap-sketch` is geometry only; an uncoloured
//: stroke takes `.board-minimap-sketch-accent` on top of it.
function mapPreviewSketch(NS, x, y, w, h, shape, unit) {
  const r2 = round2;
  const make = (tag) => {
    const el = document.createElementNS(NS, tag);
    el.setAttribute("class", "board-minimap-sketch");
    //: One weight at every size, for the reason the corner cap is in nominal
    //: units: a constant in viewBox units rendered 3.5px in a Library card and
    //: 0.48px in a dashboard row, where it disappeared.
    el.setAttribute("stroke-width", String(r2(1.6 * unit)));
    return el;
  };
  if (shape === "rect") {
    const el = make("rect");
    el.setAttribute("x", String(r2(x)));
    el.setAttribute("y", String(r2(y)));
    el.setAttribute("width", String(r2(w)));
    el.setAttribute("height", String(r2(h)));
    return el;
  }
  if (shape === "circle") {
    const el = make("ellipse");
    el.setAttribute("cx", String(r2(x + w / 2)));
    el.setAttribute("cy", String(r2(y + h / 2)));
    el.setAttribute("rx", String(r2(w / 2)));
    el.setAttribute("ry", String(r2(h / 2)));
    return el;
  }
  if (shape === "triangle" || shape === "diamond") {
    const el = make("polygon");
    const points = shape === "triangle"
      ? [[x + w / 2, y], [x + w, y + h], [x, y + h]]
      : [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
    el.setAttribute("points", points.map(([px, py]) => `${r2(px)},${r2(py)}`).join(" "));
    return el;
  }
  if (shape === "line" || shape === "arrow") {
    //: Corner to corner, because that is the only thing the box knows: a
    //: line's box is its two ends, and which diagonal it runs along is not
    //: recoverable from a bounding box. The alternative, a horizontal rule
    //: through the middle, says "a line was drawn" while being a different
    //: line from the one on the board; this one is right for half of them and
    //: the right length for all of them.
    const el = make("line");
    el.setAttribute("x1", String(r2(x)));
    el.setAttribute("y1", String(r2(y)));
    el.setAttribute("x2", String(r2(x + w)));
    el.setAttribute("y2", String(r2(y + h)));
    return el;
  }
  //: A pen or highlighter stroke: a scribble that fills the box it was drawn
  //: in, rather than a fixed wave in the corner of the board. Three humps,
  //: because two read as a tick and four as a wave pattern.
  const el = make("path");
  el.setAttribute("d", [
    `M${r2(x)} ${r2(y + h)}`,
    `C${r2(x + w * 0.18)} ${r2(y)} ${r2(x + w * 0.38)} ${r2(y + h)} ${r2(x + w * 0.52)} ${r2(y + h * 0.5)}`,
    `S${r2(x + w * 0.82)} ${r2(y)} ${r2(x + w)} ${r2(y + h * 0.3)}`,
  ].join(" "));
  return el;
}

//: A miniature of what is actually on a board, from `preview_items` /
//: `preview_edges`, positions already normalised into 0..1 against the
//: board's own bounds by `routes_whiteboard._board_preview`, so this draws the
//: real layout without the client ever loading the board.
//:
//: **An empty board draws the empty state, not nothing.** It used to return
//: null and each caller improvised: the Library's card mode drew no picture
//: at all, its rows mode drew a dashed rail so the rows would still line up,
//: and the dashboard skipped the thumbnail, so three surfaces disagreed about
//: what an empty map looks like and two of them lost their left edge. The
//: empty state is drawn here, once, in the same language as a real preview: a
//: ghost of a three-node map on the same paper, which says "a map goes here"
//: where a blank box said nothing.
//:
//: Built with SVG attributes and never an inline `style` string: this app's
//: CSP drops those outright, and thirty-five of them once shipped as silently
//: dead markup (CLAUDE.md, "a policy silently refusing the work").
function mapPreview(board, { size = "card" } = {}) {
  const geo = MAP_PREVIEW_SIZES[size] || MAP_PREVIEW_SIZES.card;
  const items = Array.isArray(board?.preview_items) ? board.preview_items : [];
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", `board-minimap board-minimap-${size}`);
  svg.setAttribute("aria-hidden", "true");

  //: **The board's own shape, letterboxed into the card's box.** The viewBox
  //: is drawn at `preview_aspect` (the board's width/height, which
  //: normalising the positions into 0..1 threw away) and `meet` fits it
  //: inside the element rather than stretching it to fill: a map that runs
  //: down the page used to come back as the same wide rectangle as one that
  //: runs across, and every board in the Library was the same shape as every
  //: other, which is a picture of the card, not of the board.
  const aspect = Number(board?.preview_aspect) > 0 ? Number(board.preview_aspect) : 1;
  const vw = aspect >= 1 ? MAP_PREVIEW_BASE : MAP_PREVIEW_BASE * aspect;
  const vh = aspect >= 1 ? MAP_PREVIEW_BASE / aspect : MAP_PREVIEW_BASE;
  svg.setAttribute("viewBox", `0 0 ${round2(vw)} ${round2(vh)}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  // The scale `meet` is about to apply, so every fixed size below can be
  // expressed in the box's units and divided back out: see MAP_PREVIEW_SIZES.
  const scale = Math.min(geo.w / vw, geo.h / vh);
  const unit = 1 / scale;
  const pad = geo.pad * unit;
  const blockW = geo.blockW * unit;
  const blockH = geo.blockH * unit;
  // The drawable box, inset by the padding on both sides so an item at the
  // extreme edge of the board lands inside the thumbnail rather than half
  // outside it. Floored at zero: an extreme ratio can leave less room than
  // one block needs, and a negative span would mirror the whole picture.
  const spanX = Math.max(0, vw - pad * 2 - blockW);
  const spanY = Math.max(0, vh - pad * 2 - blockH);
  //: **Labels need width, and a letterboxed tall board has not got it.**
  //: Measured on the first run of the redesigned card: a board half as wide as
  //: it is tall draws its paper 82px across inside a 293px card, and the
  //: sixteen-character labels that read as a texture at 293px overlapped each
  //: other and the nodes they belonged to ("First branchRoot"). Below
  //: `MAP_PREVIEW_LABEL_FLOOR` of the box's width the labels come off and the
  //: shape carries the card, which is what the row size already does.
  const labels = geo.labels && vw * scale >= geo.w * MAP_PREVIEW_LABEL_FLOOR;
  const px = (x) => pad + (Number(x) || 0) * spanX;
  const py = (y) => pad + (Number(y) || 0) * spanY;

  //: **The paper.** The frame and fill used to belong to the `<svg>` element
  //: itself, which is the card's box, so the border said "this is the shape
  //: of the board" while being the shape of the card. Drawn as a rect inside
  //: the viewBox instead, it is the letterboxed board, and it is the thing a
  //: sweep can measure: its rendered width/height *is* `preview_aspect`.
  const paper = document.createElementNS(NS, "rect");
  paper.setAttribute("class", "board-minimap-paper");
  paper.setAttribute("x", "0");
  paper.setAttribute("y", "0");
  paper.setAttribute("width", String(round2(vw)));
  paper.setAttribute("height", String(round2(vh)));
  paper.setAttribute("rx", String(round2(2 * unit)));
  svg.appendChild(paper);

  if (!items.length) {
    // The one designed empty state, in the same language as a real preview:
    // three nodes and two curves, ghosted. See the header comment.
    paper.classList.add("board-minimap-paper-empty");
    const ghost = document.createElementNS(NS, "g");
    ghost.setAttribute("class", "board-minimap-ghost");
    const shape = [
      { x: 0.04, y: 0.5 },
      { x: 0.72, y: 0.16 },
      { x: 0.72, y: 0.84 },
    ];
    for (const child of shape.slice(1)) {
      ghost.appendChild(
        mapPreviewEdge(NS, px, py, blockW, blockH, {
          x1: shape[0].x,
          y1: shape[0].y,
          x2: child.x,
          y2: child.y,
        })
      );
    }
    for (const node of shape) {
      const block = document.createElementNS(NS, "rect");
      block.setAttribute("x", String(round2(px(node.x))));
      block.setAttribute("y", String(round2(py(node.y))));
      block.setAttribute("width", String(round2(blockW)));
      block.setAttribute("height", String(round2(blockH)));
      block.setAttribute("rx", String(round2(Math.min(blockW, blockH) * MAP_PREVIEW_NODE_ROUNDING)));
      ghost.appendChild(block);
    }
    svg.appendChild(ghost);
    return svg;
  }

  //: **The tree, drawn first so the lines sit under the blocks** rather than
  //: across their labels. `preview_edges` is the parent→child segments in the
  //: same normalised space as the items (§9.1); an ordinary board ships an
  //: empty list and this loop does nothing, which is exactly the difference
  //: between the two kinds that a scatter of dots cannot show.
  for (const edge of Array.isArray(board.preview_edges) ? board.preview_edges : []) {
    const curve = mapPreviewEdge(NS, px, py, blockW, blockH, edge);
    // The branch's colour, from the server (`_map_branch_colors`), so the
    // thumbnail is the same picture as the canvas rather than a grey diagram
    // of it.
    if (edge.color) curve.setAttribute("stroke", edge.color);
    else curve.classList.add("board-minimap-edge-accent");
    svg.appendChild(curve);
  }

  //: **How big this thing is on the board**, in the viewBox's units, from the
  //: `w`/`h` the server now ships as fractions of the same span `x` and `y`
  //: were normalised into (INBOX 68).
  //:
  //: This is the difference between a picture of the board and a picture of
  //: the renderer. Measured before it: every block in every preview came back
  //: at one size (29.1x21.8 in the dashboard, 26.4x17.6 in the Library), so a
  //: banner across the top of a board, the column beside it and a sticky note
  //: were three identical grey rectangles, which is the owner's "grey blobs"
  //: exactly. A board's own shapes are most of what tells two boards apart.
  //:
  //: Floors, not raw values: a small object on a large board is a fraction of
  //: a viewBox unit and would vanish, and something has to be visible for the
  //: preview to be a preview. The ceiling is the drawable span, so one huge
  //: object cannot spill outside the paper it is drawn on. An older payload
  //: (a cached list from before the server sent sizes) has no `w`, and falls
  //: back to the uniform block, which is what this drew for everything.
  const sizeOf = (item) => {
    const w = Number(item.w);
    const h = Number(item.h);
    if (!(w > 0) || !(h > 0)) return { w: blockW, h: blockH };
    return {
      w: Math.min(spanX + blockW, Math.max(blockW * MAP_PREVIEW_MIN_BLOCK, w * spanX)),
      h: Math.min(spanY + blockH, Math.max(blockH * MAP_PREVIEW_MIN_BLOCK, h * spanY)),
    };
  };

  //: **Every block's painted box, collected as they are drawn**, so the label
  //: pass below can ask whether a caption has landed on something that is not
  //: its own (INBOX 263: the previews "are kinda a mess"). A label beside a
  //: block used to be placed from that block alone, with no idea that the
  //: margin it hung into was already full: measured on a six-card board,
  //: "Retry budget" was drawn 10 units into a neighbouring card and 15.9
  //: units across "Ingest pipeline".
  const drawn = [];

  //: **Nothing is drawn past the paper's edge.** `px`/`py` place an item's
  //: *top-left corner* inside the drawable span, and the span is computed
  //: from the default block's width, while `sizeOf` returns the item's own,
  //: which can be many times larger. The server's `w` compounds it: it is a
  //: fraction of the span between the items' corners (`_preview_items`), and
  //: an item wider than the distance between the outermost two corners has a
  //: `w` above 1 quite legitimately. Measured on a six-card board: cards
  //: 39.06 units wide drawn at x=76.28 in a 100-unit-wide viewBox, so a third
  //: of every card in the right-hand column was outside the thumbnail, which
  //: is most of what "the boards and maps previews are kinda a mess" is
  //: looking at.
  //:
  //: The left edge is kept and the far edge trimmed, rather than the block
  //: being moved: where a thing starts is its position, which is information;
  //: where a clipped block ends is not. A thumbnail is a crop of a board, and
  //: a large item running to the edge should be drawn running to the edge.
  //: The floor is the same one `sizeOf` uses (a fraction of the default
  //: block), not a bare number: `MAP_PREVIEW_MIN_BLOCK` is a multiplier, and
  //: reading it as viewBox units would make the smallest allowed block half a
  //: unit, which is a dot.
  const onPaper = (at, extent, floor, from, to) =>
    Math.max(floor, Math.min(extent, to - Math.max(from, at)));

  for (const item of items) {
    const nx = px(item.x);
    const ny = py(item.y);
    const raw = sizeOf(item);
    const size = {
      w: onPaper(nx, raw.w, blockW * MAP_PREVIEW_MIN_BLOCK, pad, vw - pad),
      h: onPaper(ny, raw.h, blockH * MAP_PREVIEW_MIN_BLOCK, pad, vh - pad),
    };
    if (item.kind !== "sketch") drawn.push({ item, x: nx, y: ny, w: size.w, h: size.h });
    if (item.kind === "sketch") {
      // The shape it was drawn with, at the size and place it was drawn, in
      // its own ink: see `mapPreviewSketch`. The stroke data itself is still
      // not shipped, which is the one thing `preview_items` deliberately
      // leaves out.
      const mark = mapPreviewSketch(NS, nx, ny, size.w, size.h, item.shape, unit);
      if (item.color) mark.setAttribute("stroke", item.color);
      else mark.classList.add("board-minimap-sketch-accent");
      svg.appendChild(mark);
      continue;
    }
    const dot = document.createElementNS(NS, "rect");
    //: **A picture gets its own ink and its own mark.** An image object is the
    //: one thing on a board with no words of its own (the server sends no
    //: label for it, and a thumbnail of a thumbnail is a different feature),
    //: so in one flat accent wash it was indistinguishable from a text box
    //: holding a paragraph. Measured on the seeded board: twelve marks, one
    //: ink. It is a quieter grey block with the universal picture glyph over
    //: it, which says "a picture is here" in the language every other surface
    //: uses for one.
    const grey = item.kind === "card"
      ? "board-minimap-card"
      : item.kind === "image"
        ? "board-minimap-image"
        : "board-minimap-object";
    // A branch node takes its own class rather than the grey one, for the
    // reason on `mapPreviewEdge`: the fill arrives as an attribute, and the
    // grey classes declare `fill`, which would win.
    dot.setAttribute("class", item.color ? "board-minimap-branch" : grey);
    dot.setAttribute("x", String(round2(nx)));
    dot.setAttribute("y", String(round2(ny)));
    dot.setAttribute("width", String(round2(size.w)));
    dot.setAttribute("height", String(round2(size.h)));
    // Rounded like the node it stands for, and rounded by its own size rather
    // than by a fixed 1.5: the block is drawn at a different number of viewBox
    // units on every board shape now, so a constant radius was a sharp corner
    // on one card and a pill on the next. Capped at
    // `MAP_PREVIEW_CORNER_UNITS`, which is what stopped these reading as blobs
    // (INBOX 164): the fraction alone was 35% of a block's
    // short side, measured.
    dot.setAttribute("rx", String(round2(Math.min(
      MAP_PREVIEW_CORNER_UNITS * unit,
      Math.min(size.w, size.h) * MAP_PREVIEW_NODE_ROUNDING
    ))));
    // The grey blocks are faded because an unlabelled box is texture; a
    // coloured node is carrying which branch it belongs to, so it is drawn at
    // full strength (`.board-minimap-branch`).
    if (item.color) dot.setAttribute("fill", item.color);
    svg.appendChild(dot);
    if (item.kind === "image") {
      //: The glyph, inside the block and scaled to it: a horizon line with a
      //: sun over it, which is the picture icon everywhere else in the app.
      //: Skipped on a block too small to hold it, where it would be two
      //: smudges on a grey square.
      const short = Math.min(size.w, size.h);
      if (short > 6 * unit) {
        const mark = document.createElementNS(NS, "path");
        mark.setAttribute("class", "board-minimap-image-mark");
        mark.setAttribute("stroke-width", String(round2(1.2 * unit)));
        const x0 = nx + size.w * 0.18;
        const x1 = nx + size.w * 0.82;
        const base = ny + size.h * 0.72;
        mark.setAttribute("d", [
          `M${round2(x0)} ${round2(base)}`,
          `L${round2(nx + size.w * 0.42)} ${round2(ny + size.h * 0.42)}`,
          `L${round2(nx + size.w * 0.6)} ${round2(base)}`,
          `M${round2(nx + size.w * 0.62)} ${round2(base)}`,
          `L${round2(nx + size.w * 0.74)} ${round2(ny + size.h * 0.56)}`,
          `L${round2(x1)} ${round2(base)}`,
        ].join(" "));
        svg.appendChild(mark);
      }
      continue;
    }
  }

  //: **The labels, placed after every block is drawn and against all of
  //: them.** Reported as "the boards and maps previews are kinda a mess", and
  //: measured on a six-card board before this: "Retry budget" drawn 10 units
  //: into a neighbouring card and 15.9 across "Ingest pipeline", and a
  //: caption starting at x=100.1 in a 100-unit-wide viewBox.
  //:
  //: Three things were wrong and each needed the pass to know more than one
  //: item at a time. The width was estimated from a characters-times-0.55
  //: constant, and a budget that under-reports puts the text past the room it
  //: was granted; the margin a label hangs into was treated as empty when it
  //: often holds the next card; and nothing looked at the other labels at
  //: all. So: measure the text, test the box against the blocks and against
  //: the labels already kept, and drop a caption that has nowhere to go.
  //:
  //: **Dropping is the right answer when there is no room**, not shrinking or
  //: overlapping. A preview is a picture you read at a glance, and two
  //: captions across each other are less use than one caption and a block
  //: with no words on it: the block, its size, its place and its colour still
  //: say what is there.
  //:
  //: Biggest first, so when two want the same margin the one on the larger
  //: thing keeps it, which is also the one a reader's eye goes to.
  if (labels) {
    const kept = [];
    const ordered = drawn
      .filter((row) => row.item.label && row.item.kind !== "image")
      .sort((a, b) => b.w * b.h - a.w * a.h);
    for (const row of ordered) {
      const { item } = row;
      const fontUnits = geo.font * unit;
      const perChar = fontUnits * MAP_PREVIEW_CHAR_WIDTH;
      const gap = 1.5 * unit;
      //: The label's painted height. `getBBox` would give it exactly, and
      //: cannot be asked here (the preview is not in the document yet), but a
      //: cap height plus descender is a fixed fraction of the type size in
      //: any family, which is enough to test a box with.
      const lineH = fontUnits * 1.15;

      //: **Inside the shape when the shape can hold it**, beside it when it
      //: cannot. Reported as the text "sitting off its shapes": before a
      //: topic was drawn at its own size, a block was a fixed 9x6 units
      //: whatever it stood for and nothing could ever contain a word. A
      //: 200x56 node has room for its own name, which is where a person
      //: reading a map expects to find it.
      //:
      //: Nearly all of it, or none: the earlier version cut to fit and drew
      //: "Retr…", "Inge…" and "Open…" on three cards, which is three cards
      //: that cannot be told apart by the one thing meant to tell them apart.
      const insideRoom = row.w - perChar * 2;
      const tall = row.h >= fontUnits * 1.6;
      const full = mapPreviewTextWidth(item.label, fontUnits);
      const insideChars = Math.floor(insideRoom / perChar);
      const fits = tall && full <= insideRoom
        && insideChars >= MAP_PREVIEW_MIN_INSIDE_CHARS;

      let shown = null;
      let box = null;
      let anchor = "start";
      let x = 0;
      let y = 0;
      if (fits) {
        shown = item.label;
        x = row.x + row.w / 2;
        y = row.y + row.h / 2 + fontUnits * 0.36;
        anchor = "middle";
        box = { x: x - full / 2, y: y - fontUnits * 0.8, w: full, h: lineH };
      } else {
        //: Both margins measured from the block's own edges to the paper's,
        //: and the wider one tried first. `nx > vw / 2` was the old test and
        //: it reads the block's *left* edge, so a wide item just left of
        //: centre was labelled to its right at `nx + size.w + gap`, which on
        //: a 200-unit-wide topic is past the paper (INBOX 174).
        const roomRight = Math.max(0, vw - (row.x + row.w + gap));
        const roomLeft = Math.max(0, row.x - gap);
        const roomBelow = Math.max(0, vh - (row.y + row.h + gap));
        const roomAbove = Math.max(0, row.y - gap);
        //: **Four places, not two: beside, and under or over.** Under a
        //: thumbnail's block is where a caption goes in every file browser
        //: ever written, and it was not tried at all, so a board whose cards
        //: sit in a row lost every title but the outermost: the margin left
        //: and right is the next card, and there was nowhere else to look.
        //: Measured on a six-card board: 2 of 6 titles drawn before these two
        //: positions existed.
        //:
        //: The wider margin first, then the taller one, so the caption lands
        //: where there is most room and a board only falls back to stacking
        //: text under a block when its sides are genuinely full.
        const places = [
          { side: "left", room: roomLeft },
          { side: "right", room: roomRight },
          { side: "below", room: roomBelow },
          { side: "above", room: roomAbove },
        ].sort((a, b) => b.room - a.room);
        //: Each vertical position is tried three ways: centred under its
        //: block, then flushed to the block's left edge, then to its right.
        //: A centred caption is the one to want, and on a crowded board it is
        //: often the only one of the three that meets the neighbour: sliding
        //: it to an edge it already shares with its own block keeps it
        //: attached to the right thing while stepping out of the way.
        const alignments = ["centre", "start", "end"];
        const tries = [];
        for (const place of places) {
          if (place.side === "below" || place.side === "above") {
            for (const align of alignments) tries.push({ ...place, align });
          } else {
            tries.push({ ...place, align: "centre" });
          }
        }
        for (const place of tries) {
          const side = place.side;
          const vertical = side === "below" || side === "above";
          //: A caption under a block is bounded by the *paper's* width, not
          //: by the margin below it, which is what has to hold its height.
          if (vertical && place.room < lineH + gap) continue;
          const room = vertical
            ? Math.min(row.x + row.w, vw - row.x) * 2 - perChar
            : place.room - perChar;
          if (room < perChar * MAP_PREVIEW_MIN_OUTSIDE_CHARS) continue;
          const cut = mapPreviewFitText(item.label, fontUnits, room);
          if (!cut) continue;
          const width = mapPreviewTextWidth(cut, fontUnits);
          const centre = row.x + row.w / 2;
          const baseline = side === "below"
            ? row.y + row.h + gap + fontUnits * 0.8
            : side === "above"
              ? row.y - gap
              : row.y + row.h * 0.73;
          //: Where a vertical caption's own box starts, given the alignment
          //: this attempt is trying.
          const under = place.align === "start"
            ? row.x
            : place.align === "end"
              ? row.x + row.w - width
              : centre - width / 2;
          const left = side === "left"
            ? row.x - gap - width
            : side === "right"
              ? row.x + row.w + gap
              : under;
          const candidate = { x: left, y: baseline - fontUnits * 0.8, w: width, h: lineH };
          //: **Off the paper is a reason to try the next position, not a
          //: reason to give up on the label.** This test used to sit after
          //: the loop, which made the first candidate that missed the other
          //: blocks the last one considered: measured on the seeded board,
          //: "Retry budget" cleared every block centred under its own card,
          //: began at x=-1.21, and was then dropped without the two aligned
          //: positions beside it ever being tried, one of which fits. Two
          //: reasons to reject a place belong in the same list.
          if (!mapPreviewOnPaper(candidate, vw, vh)) continue;
          //: Its own block is not a clash: a caption beside a card may touch
          //: the card it names, and often has to on a crowded board.
          const clash = drawn.some((other) => other !== row && mapPreviewOverlaps(candidate, other))
            || kept.some((other) => mapPreviewOverlaps(candidate, other));
          if (clash) continue;
          shown = cut;
          //: The text anchor has to match the box that was just tested, or
          //: the collision test is about a rectangle the browser never draws.
          anchor = side === "left"
            ? "end"
            : side === "right"
              ? "start"
              : place.align === "start" ? "start" : place.align === "end" ? "end" : "middle";
          x = side === "left"
            ? row.x - gap
            : side === "right"
              ? row.x + row.w + gap
              : place.align === "start" ? row.x : place.align === "end" ? row.x + row.w : centre;
          y = baseline;
          box = candidate;
          break;
        }
      }
      if (!shown || !box) continue;
      //: **A label inside its own block is still checked against the labels
      //: already kept.** Blocks legitimately overlap on a board (a card
      //: dropped on another, a topic over a branch), so two captions drawn in
      //: the middle of two overlapping blocks land on top of each other
      //: however correct each one is on its own: measured on a board with
      //: stacked cards, six pairs of identical titles across each other. It
      //: is not checked against the *blocks*, because sitting on a block is
      //: what an inside label is for.
      if (fits && kept.some((other) => mapPreviewOverlaps(box, other))) continue;
      //: The paper's own edges for the inside case, which has only the one
      //: position to offer and so tests them here rather than in a loop. A
      //: caption sliced by the thumbnail's edge reads as a rendering fault,
      //: which is what it is.
      if (!mapPreviewOnPaper(box, vw, vh)) continue;

      const text = document.createElementNS(NS, "text");
      text.setAttribute("class", "board-minimap-label");
      text.setAttribute("x", String(round2(x)));
      text.setAttribute("y", String(round2(y)));
      if (anchor !== "start") text.setAttribute("text-anchor", anchor);
      // The type size, in the box's units divided back out, for the same
      // reason the blocks are: a fixed CSS `font-size` here is in viewBox
      // units, so the labels on a square board came out half the size of the
      // labels on a wide one. The stylesheet keeps the colour and the family.
      text.setAttribute("font-size", String(round2(fontUnits)));
      if (fits) {
        text.classList.add("board-minimap-label-inside");
        //: A class, not a `fill` attribute, and this is the trap the blocks
        //: above already carry a note about: `.board-minimap-label` declares
        //: `fill` in the stylesheet, and a CSS declaration beats a
        //: presentation attribute however specific the attribute looks.
        //: Setting the attribute changed nothing at all, measured: 3.82:1
        //: before and after.
        const onColour = item.color ? mapPreviewOnColour(item.color) : null;
        if (onColour) text.classList.add(`board-minimap-label-${onColour}`);
      }
      text.textContent = shown;
      svg.appendChild(text);
      kept.push(box);
    }
  }
  return svg;
}

//: How many things are on a board, as the sentence a person reads. On a map
//: the objects *are* the nodes, so calling them "images", which every surface
//: did before maps existed, is simply the wrong noun for the only thing on
//: the board.
function mapCountLabel(board) {
  const isMap = board?.type === "map";
  const nodes = board?.node_count || 0;
  const sketches = board?.sketch_count || 0;
  const objects = board?.object_count || 0;
  const parts = [];
  if (nodes) parts.push(`${nodes} card${nodes === 1 ? "" : "s"}`);
  if (sketches) parts.push(`${sketches} sketch${sketches === 1 ? "" : "es"}`);
  if (objects) {
    //: **"items", not "images", on a board.** `object_count` is
    //: `count(WhiteboardObject)` with no filter on `kind`
    //: (`routes_whiteboard.py`, the `/whiteboard/boards` listing), and a
    //: board's objects are text, images, notes, documents, files and links.
    //: A board seeded with five text boxes read "5 images" in the dashboard
    //: widget and in the Library, which is the same class of wrong noun §5
    //: item 12 fixed for a map's nodes and missed here.
    parts.push(isMap
      ? `${objects} node${objects === 1 ? "" : "s"}`
      : `${objects} item${objects === 1 ? "" : "s"}`);
  }
  return parts.length ? parts.join(" · ") : isMap ? "Empty map" : "Empty board";
}

//: **A map as a chip**: its icon, its title and how many nodes it holds, and
//: pressing it opens the map. The one control every surface uses to refer to a
//: map in passing: a note body, the timeline, a dashboard row, the chat
//: transcript.
//:
//: A `<button>`, not a link: opening a map is a tab switch plus a board load
//: (`openWhiteboardBoard` does both), not a navigation this app has a URL for.
//: `.map-chip` sits on `.chip`, the app's own recipe, so it inherits the chip
//: height, radius and hover state rather than inventing a fourth pill shape.
//:
//: `board` may be as little as `{id, title}`, the chat transcript has an id
//: and a label and nothing else. The count line is simply omitted then, rather
//: than the chip refusing to draw or claiming "0 nodes".
//:
//: **`interactive: false` draws the same chip as a `<span>` with no handler**,
//: for the one context where the thing around it is already the control: the
//: dashboard's board rows are `role="button"` list items, and a `<button>`
//: inside one is a nested interactive control, two tab stops that do the same
//: thing, which is worse for a keyboard user than no chip at all. The chip is
//: identical to look at either way; only the element and the listener differ.
function mapChip(board, { onOpen = null, count = true, interactive = true } = {}) {
  const chip = document.createElement(interactive ? "button" : "span");
  if (interactive) chip.type = "button";
  chip.className = "chip map-chip";
  const isMap = board?.type !== "board";
  const title = board?.title || "Untitled map";
  setLabel(chip, `${isMap ? "ph:tree-structure" : "ph:squares-four"} ${title}`);
  const known = board && (board.object_count != null || board.node_count != null);
  if (count && known) {
    const meta = document.createElement("span");
    meta.className = "map-chip-count";
    meta.textContent = mapCountLabel(board);
    chip.appendChild(meta);
  }
  chip.title = known
    ? `${title}: ${mapCountLabel(board)}${interactive ? ". Press to open it." : ""}`
    : interactive
      ? `Open “${title}”`
      : title;
  if (interactive) {
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      if (onOpen) onOpen(board);
      else if (typeof openWhiteboardBoard === "function") openWhiteboardBoard(board?.id ?? null);
    });
  }
  return chip;
}

//: Every board the notebook has, by id, for the surfaces that are handed an
//: *entry* id and have to find out whether it is a board.
//:
//: One shared cache rather than a fetch per surface: the timeline paints a
//: hundred dots and the note list paints a chip per wiki link, and neither can
//: afford a request each. `apiJson`'s own `cacheMs` does the de-duplication: 
//: this only holds the id→row index built from it, which is the part that
//: would otherwise be rebuilt per dot.
let mapBoardIndexCache = null;
//: When that cache was last filled. It used to be `apiJson`'s own `cacheMs`
//: doing this, and that stopped working when `GET /whiteboard/boards` became
//: paged: `apiPagedList` walks pages through `api`, which has no read cache,
//: and one first page is not an index of every board anyway. So the eight
//: seconds moved here, onto the thing it was really protecting, which is the
//: index rather than the response.
let mapBoardIndexAt = 0;
const MAP_BOARD_INDEX_MS = 8000;
//: The walk in flight, if there is one. The eight seconds above only help a
//: caller that arrives after an earlier one has *finished*, and at boot they
//: do not arrive like that: the note list and the agent panel both ask within
//: the same tick, both find an empty cache, and both walk every page of
//: `/whiteboard/boards` (WORLD_CLASS_PLAN A2, measured as the same request
//: twice). A second caller joins the first walk instead.
let mapBoardIndexWalk = null;

//: `force` skips the eight seconds. One caller passes it: a note's board
//: object that could not find its board (`boardEmbedElement`). Eight seconds
//: is the right answer for a chip that is merely decorating a row, and the
//: wrong one for a card that is about to tell somebody their board has been
//: deleted: a board made a moment ago is missing from an index built before
//: it existed, and nothing else ever rebuilds that index (every other caller
//: returns early while it is set). A walk already in flight is still joined
//: rather than doubled.
function loadMapBoardIndex(force = false) {
  if (!force && mapBoardIndexCache && Date.now() - mapBoardIndexAt < MAP_BOARD_INDEX_MS) {
    return Promise.resolve(mapBoardIndexCache);
  }
  if (mapBoardIndexWalk) return mapBoardIndexWalk;
  mapBoardIndexWalk = apiPagedList("/whiteboard/boards", 200, { silent: true })
    .catch(() => null)
    .then((rows) => {
      //: The walk failed. The stale index is better than none, and an empty
      //: Map keeps `mapBoardById` and friends synchronous for their callers.
      //: Deliberately not cached as an answer: `mapBoardIndexAt` is untouched,
      //: so the next caller tries again rather than waiting out the eight
      //: seconds on a failure.
      if (!rows) return mapBoardIndexCache || new Map();
      mapBoardIndexAt = Date.now();
      mapBoardIndexCache = new Map(rows.filter((b) => b.id != null).map((b) => [b.id, b]));
      return mapBoardIndexCache;
    })
    .finally(() => {
      mapBoardIndexWalk = null;
    });
  return mapBoardIndexWalk;
}

//: The board behind an entry id, or null, synchronous, because the callers
//: are inside a render loop. Returns null until `loadMapBoardIndex` has run
//: once, which is a surface that has not asked for boards yet rather than an
//: error: it degrades to the plain note rendering it had before.
function mapBoardById(id) {
  return mapBoardIndexCache?.get(id) || null;
}

//: The board whose title is `needle` (already lower-cased), or null.
//:
//: One matcher for the `[[wiki]]` resolver and the editor's `@` picker, so
//: the link the picker inserts and the link the renderer resolves cannot
//: drift apart. A board's own row carries `title` with the `# ` already
//: stripped; the raw `# My map` form is matched too, because that is what
//: the picker inserted before it learned better and those links are in real
//: notes now.
function mapBoardTitled(needle) {
  if (!needle || !mapBoardIndexCache) return null;
  for (const board of mapBoardIndexCache.values()) {
    const title = String(board.title || "").trim().toLowerCase();
    if (!title) continue;
    if (title === needle || `# ${title}` === needle) return board;
  }
  return null;
}

//: Every board the notebook has, newest-looking order preserved from
//: `/whiteboard/boards`, the editor's `@`/`[[` picker's own source. Empty
//: until `loadMapBoardIndex` has run once, which is the same "a surface that
//: has not asked for boards yet" degradation `mapBoardById` documents.
function mapBoardRows() {
  return mapBoardIndexCache ? [...mapBoardIndexCache.values()] : [];
}

//: ---------------------------------------------------------------------------
//: **Shared by surfaces that are not loaded yet** (WORLD_CLASS_PLAN A1). Five
//: files now arrive on first use rather than at boot (`ensureModule` below),
//: and a `const` in one of them is a *lexical* global: a bare read of it from
//: here throws ReferenceError until that file has run, which no `typeof`
//: guard and no `window.` stub can paper over. Everything in this block was
//: read by app.js's own boot path (the note list) or by `editor.js`, both of
//: which run with no tab open at all, so each one moved here, to the file
//: that is always present, rather than pinning its whole module to boot.
//:
//: None of it is graph, library or document logic: the clamp is the note
//: list's, the size formatter is read by four files, and the page sizes are
//: the paging contract the backend publishes. They were in those files only
//: because that is where the app.js split happened to leave them.

// How much of a linked note's text a link chip shows. Long enough to know
// which note it is, short enough that four of them are a row rather than a
// paragraph: a chip is a signpost, and a signpost with a sentence on it is
// not a signpost. The full text is the chip's tooltip.
//: Raised from 28 (the owner, 2026-09-21: "note text gets cut off at like
//: 2/3 through the note width, I think it should have a bit more width"). A
//: character count rather than a width is what made it look arbitrary: the
//: chip was cut at the same word whether it sat in a 400px column or across
//: a 1900px card, so on a wide card it stopped two thirds of the way along a
//: row that had room to spare. The chips wrap, so a longer label costs a row
//: at worst, never an overflow.
const LINK_CHIP_CHARS = 48;

// How much of a note the list shows before clamping it. Roughly ten lines at
// a comfortable reading width, long enough that a normal note is never
// clipped, short enough that one essay can't take the whole screen.
const LONG_NOTE_CHARS = 500;
const LONG_NOTE_LINES = 10;
// Which notes the user has opened out, for this session. Not persisted: it is
// a reading position, not a preference.
const expandedNotes = new Set();

// The character count decides which notes *might* be too tall; only a
// measurement can say whether one actually is, because that depends on the
// width it is rendered at. So the clamp goes on optimistically and this takes
// it back off wherever the note fits after all, a "Show more" on a note that
// is fully visible is worse than no clamping at all.
//
// It bails when the list is off screen: this renders inside a `display: none`
// sub-tab, where every measurement is 0. `showNotesSection` calls it again on
// the way in, which is the moment the numbers become real.
function settleNoteClamps() {
  const list = $("entry-list");
  if (!list || !list.offsetParent) return;
  for (const content of list.querySelectorAll(".entry-content.entry-clamped")) {
    const toggle = content.parentElement?.querySelector(".entry-more");
    if (content.scrollHeight <= content.clientHeight + 4) {
      content.classList.remove("entry-clamped");
      toggle?.remove();
    }
  }
}


//: **The facts about a file, as facts.** Asked for directly with the Files
//: sub-tab redesign: "the card format is difficult with files as they can be
//: quite long and large, a single image or ocr caption doesnt fit them. there
//: should be details on the name, a generated description that cna happen,
//: file details such as the type, size, topic/category, linked notes and
//: other features."
//:
//: A tile could show a thumbnail, a name and a caption; everything else a
//: person actually brings to a file list, how big is it, how many pages,
//: when did it arrive, has it been read, was either absent or buried. These
//: are the ones the row can state in one line.
function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) return ""; // unknown, or the file is gone, say nothing
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // One decimal below 10 (2.4 MB reads better than 2 MB), none above it.
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}


//: The page size each of those lists is asked for, matching the server's own
//: default (routes_documents.DOCUMENTS_PAGE_SIZE and routes_files
//: .MEDIA_PAGE_SIZE): one request for any realistic notebook, more only when
//: there genuinely is more.
const DOCUMENTS_PAGE_SIZE = 200;
const MEDIA_PAGE_SIZE = 200;

//: **The star that says a note is a favourite, in both states.**
//:
//: Reported with a screenshot: the active one rendered as an **empty circle**
//:, no glyph at all. The cause is worth stating because it is a whole class
//: of bug, not one icon: the off state asked for `ph:star` and the on state
//: for `ph:star-slash`, and **`star-slash` is not in this app's vendored
//: Phosphor subset.** A missing glyph in an icon font is not an error, the
//: character simply has nothing to draw, so it fails silently, looks like a
//: styling problem, and nothing in the suite could see it. One icon name out
//: of 176 was wrong and there was no way to know. `tests/test_icon_names.py`
//: now checks every one against the font.
//:
//: The fix is also the better design. A slashed star means "remove", which is
//: a *verb* on a control whose job is to show *state*; every app the user has
//: ever used shows a favourite as a star that has changed colour. So both
//: states draw `ph:star` and the difference is `is-favourite`, plus
//: `aria-pressed`, which is what makes the state readable without the colour.
function favouriteButton(entry) {
  //: `.favourite-btn` names the control for the phone's swipe (`initRowSwipe`),
  //: which presses it rather than carrying a second copy of the toggle.
  const button = smallButton(
    "ph:star",
    entry.pinned ? "Remove from Favourites" : "Add to Favourites (also floats it to the top)",
    async () => {
      const was = Boolean(entry.pinned);
      await api(`/entries/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ pinned: !was }),
      });
      //: On the global stack, because a mis-click here is silent: the star
      //: changes shape and the note moves to the top of the list, and there
      //: was nothing that put it back. Reported as the undo stack being
      //: "significantly outdated and dont register a lot of actions".
      pushEntryPutUndo(
        entry.id,
        was ? "Removed a favourite" : "Added a favourite",
        { pinned: was },
        { pinned: !was }
      );
      await loadEntries();
    }
  );
  button.classList.add("favourite-btn");
  button.classList.toggle("is-favourite", Boolean(entry.pinned));
  button.setAttribute("aria-pressed", String(Boolean(entry.pinned)));
  return button;
}

// One entry card, shared by the browse list, chat results, and the bin.
// "2 hours ago" style, with the exact date kept for the hover tooltip
// (Wave J). Anything older than a week just shows the date.

// The row menu's "Move to bin", as one function, because the phone's swipe
// (`initRowSwipe`) is the same action from a different gesture and must not
// carry a second copy of it. Instant + one-click Undo, soft delete
// underneath (Wave J). Also on the global undo stack (status bar / Ctrl+Z),
// so it survives past the toast's own timeout.
async function binNoteWithUndo(entry) {
  await api(`/entries/${entry.id}`, { method: "DELETE" });
  await loadEntries();
  const restoreIt = async () => {
    await api(`/entries/${entry.id}/restore`, { method: "POST" });
    await loadEntries();
  };
  const binIt = async () => {
    await api(`/entries/${entry.id}`, { method: "DELETE" });
    await loadEntries();
  };
  const action = pushUndo("Moved a note to the bin", restoreIt, binIt);
  toastAction("Moved to the recycle bin.", "Undo", async () => {
    settleUndoFromToast(action);
    await restoreIt();
    toast("Note restored.");
  });
}

function entryItem(entry, options = {}) {
  const li = document.createElement("li");
  li.dataset.id = entry.id;
  if (entry.id === linkSource) li.classList.add("link-source");
  // The phone's swipe underlays read their words from the row (`initRowSwipe`,
  // 10-responsive.css): what a swipe right and a swipe left will do to it.
  if (entry.pinned) li.classList.add("is-favourite-row");
  if (!entry.is_board && !entry.is_draft && options.actions) {
    li.dataset.swipeRight = entry.pinned ? "Unfavourite" : "Favourite";
    li.dataset.swipeLeft = "Bin";
  }
  // An opened-out row renders as the full card, see `expandedRows`. The
  // class does nothing in card view, where every note is already this shape.
  if (expandedRows.has(entry.id)) li.classList.add("row-expanded");

  if (editingId === entry.id && options.actions) {
    renderEditForm(li, entry);
    return li;
  }

  // The row's own open/close control. Rendered always but only *shown* in
  // rows view (CSS), rather than branched on `notesViewMode` here: the
  // view can change without a re-render, and a control that exists only in
  // the mode it was rendered in would go missing on the toggle.
  //
  // A direct child of `<li>` now, not of `.entry-meta`, direct instruction:
  // *"move the note collapse button on the compact rows view to the
  // permanent left, make sure the button keeps its position even when
  // expanded."* `.entry-meta` sits in the row's third grid column while
  // collapsed (title/content/meta side by side) and becomes a bottom-of-card
  // block once expanded (`li.row-expanded` drops the grid for `block`), so a
  // button living inside it visibly jumped from the row's right edge to the
  // card's bottom on every expand. Pinned absolutely to the card's own
  // top-left corner instead (`.row-expand` in 01-forms-settings.css), which
  // neither of those two layouts moves, it is positioned against `<li>`
  // itself, not against whichever of its children currently holds it.
  {
    const open = expandedRows.has(entry.id);
    const expand = document.createElement("button");
    expand.type = "button";
    expand.className = "ghost small icon-only row-expand";
    setLabel(expand, open ? "ph:caret-up" : "ph:caret-down");
    expand.title = open ? "Show less of this note" : "Show the whole note here";
    expand.setAttribute("aria-label", expand.title);
    expand.setAttribute("aria-expanded", String(open));
    expand.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleRowExpanded(entry.id);
    });
    li.appendChild(expand);
  }

  // Click anywhere on a collapsed/expanded row's own body to toggle it,
  // same as the button, direct instruction: "if the user clicks on the
  // main body of the note and not an element on the collapsed row view, it
  // will expand or collapse without the user having to click the button."
  // Scoped to rows view only (`.entry-list.is-rows`, checked live rather
  // than cached: the view can change after this card was built) and
  // skipped whenever the click landed on something that already has its
  // own job: a link, a button, an image, selectable text, the checkbox.
  // `closest("a, button, input, .chip, img")` is the same "don't swallow a
  // click meant for something else" guard the rest of this file already
  // uses for row-level handlers.
  li.addEventListener("click", (event) => {
    if (event.target.closest("a, button, input, textarea, .chip, img, .unlink")) return;
    if (window.getSelection()?.toString()) return; // a text selection, not a click
    // **In select mode the whole card is the checkbox.** Direct instruction:
    // "when I have selected on the 'select' button in the notes tab, I want
    // to be able to click on the whole body of the note to select it, not
    // the select radiobutton in the corner." Asking someone to hit a 16px
    // box in the corner of a card they are already pointing at is the
    // slowest possible way to tick twenty notes, and every list that has a
    // batch mode (Finder, Gmail, Photos) lets the row itself carry it.
    //
    // Checked before the rows-view guard below, and in every view: the
    // expand-on-click behaviour is a *rows* affordance, but selecting is
    // what the card means while this mode is on, so it takes precedence
    // wherever it is shown.
    if (selectMode && options.actions) {
      const check = li.querySelector(".select-check");
      if (check) {
        check.checked = !check.checked;
        // `change` does not fire for a programmatic `.checked`, and the
        // checkbox's own listener is the single place that owns the set.
        check.dispatchEvent(new Event("change", { bubbles: true }));
        li.classList.toggle("is-selected", check.checked);
      }
      return;
    }
    if (!li.closest(".entry-list.is-rows")) return;
    toggleRowExpanded(entry.id);
  });

  // Batch select mode (Wave M): a checkbox leads each card.
  if (options.actions && selectMode) {
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "select-check";
    check.checked = selectedIds.has(entry.id);
    check.setAttribute("aria-label", "Select this note");
    check.addEventListener("change", () => {
      if (check.checked) selectedIds.add(entry.id);
      else selectedIds.delete(entry.id);
      // The card carries the selected look, so it has to follow the box
      // whichever of the two was actually clicked.
      li.classList.toggle("is-selected", check.checked);
      updateBatchCount();
    });
    li.appendChild(check);
    li.classList.add("selectable");
    li.classList.toggle("is-selected", check.checked);
  }

  // A note's own leading `# Heading` becomes its title (asked for directly).
  // Not a separate field to edit, the body below is shown with that line
  // taken out, so the title isn't just the same text shown twice.
  if (entry.title) {
    // A <p>, not <h3>, `.card h3` is this app's small-caps *section label*
    // treatment (DESIGN.md's hierarchy), which is the wrong voice for a
    // note's own title: it read as a muted, uppercase eyebrow instead of
    // the prominent heading a title should be. `.entry-title` below defines
    // its own look rather than inheriting one built for a different job.
    const titleEl = document.createElement("p");
    titleEl.className = "entry-title";
    titleEl.textContent = entry.title;
    li.appendChild(titleEl);
  }

  const content = document.createElement("p");
  content.className = "entry-content";
  // One long note used to push everything else off the screen, so the list
  // stopped being a list. Anything past this is clamped with a "Show more".
  //
  // The trigger is the character count, not a measured height: this list
  // renders inside a `display: none` sub-tab, where every measurement comes
  // back 0: the trap that has caught four separate features here already.
  const isLong =
    entry.content.length > LONG_NOTE_CHARS ||
    entry.content.split("\n").length > LONG_NOTE_LINES;
  if (isLong && !expandedNotes.has(entry.id)) content.classList.add("entry-clamped");
  // Mark the matched words while filtering, so it's obvious WHY a note is in
  // the list. Built with createElement/textContent rather than innerHTML, 
  // note text is user content and must never be parsed as markup.
  renderNoteText(
    content,
    entry.title ? bodyWithoutTitleLine(entry.content) : entry.content,
    searchHighlightTerms()
  );
  content.addEventListener("remove-inline-image", async (e) => {
    e.stopPropagation();
    if (!(await confirmDialog("Remove this image from the note?"))) return;
    entry.content = entry.content.replace(e.detail.originalText, "").replace(/\n{3,}/g, "\n\n").trim();
    try {
      await apiJson(`/entries/${entry.id}`, { method: "PUT", body: JSON.stringify({ content: entry.content }) });
      await loadEntries();
      flashEntry(entry.id);
      toast("Image removed.");
    } catch(err) {
      toast(err.message || "Failed to remove image", true);
    }
  });
  li.appendChild(content);
  if (isLong) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "entry-more";
    const label = () =>
      expandedNotes.has(entry.id) ? "Show less" : "Show more";
    toggle.textContent = label();
    toggle.addEventListener("click", () => {
      if (expandedNotes.has(entry.id)) expandedNotes.delete(entry.id);
      else expandedNotes.add(entry.id);
      content.classList.toggle("entry-clamped", !expandedNotes.has(entry.id));
      toggle.textContent = label();
    });
    li.appendChild(toggle);
    // **Then check whether it was actually needed.** Reported: "a show
    // more/less button appears when it isnt needed sometimes", and
    // "notes shouldnt be truncated".
    //
    // `isLong` above is a character and line count, not a measurement, and
    // the comment there explains why: this list renders inside a
    // `display: none` sub-tab where every measured height comes back 0, 
    // the trap that has caught four features in this codebase. But a count
    // is a guess, and it is wrong in both directions: a note of 700 short
    // words wrapped narrow really is long, while 700 characters of one
    // paragraph in a wide card is three lines that fit with room to spare,
    // and gets a "Show more" that expands nothing.
    //
    // So: guess first so the markup is right when it cannot be measured,
    // then measure on the next frame and take the control back off when the
    // text was never clipped. `requestAnimationFrame` is after layout, and
    // `clientHeight` of 0 (still hidden) fails the comparison and changes
    // nothing: which is exactly the conservative behaviour that trap
    // wants.
    requestAnimationFrame(() => {
      if (!content.isConnected || expandedNotes.has(entry.id)) return;
      if (content.clientHeight > 0 && content.scrollHeight <= content.clientHeight + 2) {
        content.classList.remove("entry-clamped");
        toggle.remove();
      }
    });
  }

  const meta = document.createElement("div");
  //: `note-meta` scopes the one-line facts styling (08-consistency.css) to a
  //: note card: `.entry-meta` alone is also the chip row of the skills, the
  //: personas and the extras in Settings, which that styling flattened.
  meta.className = "entry-meta note-meta";
  // A note saved with filing deferred is in its holding category, not its
  // real one, and saying "Uncategorised" for the second or two before the
  // background pass lands reads as the AI having failed. Say what is
  // actually happening instead.
  if (entry.filing_state === "pending") {
    const filing = chip("ph:circle-notch Filing…", "filing");
    filing.title = "Atlas is deciding where this note goes. It's already saved.";
    meta.appendChild(filing);
  } else {
    //: `category` names the chip for the meta line's own styles (08-
    //: consistency.css, "one line of facts"): before it had a class, the
    //: category rule was "a chip with none of these variants", which caught
    //: every variant added after it and drew "No tags yet" and "Linked by 5
    //: notes" as accent pills too.
    const categoryEl = chip(entry.category, "category");
    categoryEl.style.setProperty("--category-dot", categoryDotColour(entry.category));
    meta.appendChild(categoryEl);
  }
  //: `hashtag` marks a real tag: `tag` alone is also the quiet look the
  //: documents, the source and the space borrow, and only a tag gets the #.
  for (const tag of entry.tags) meta.appendChild(chip(tag, "tag hashtag"));
  //: **A note with no tags says so, where the tags would be** (INBOX 162:
  //: "notes with no tags or other things arent highlighted"). Only on a real
  //: note in a list that offers actions: a board is not filed by tag and a
  //: draft has not been filed at all. The chip is the fix as well as the
  //: flag: it opens the edit form with the cursor in the tags field, where
  //: the AI's suggestions appear as you type, so the person is one click
  //: from tagged rather than being told and left there.
  if (!entry.tags.length && !entry.is_board && !entry.is_draft
      && (options.actions || options.facts)) {
    //: On a read-only row the flag is a **fact and nothing more**: the
    //: handler below opens the edit form in the note list, which is not the
    //: surface a search result is being read on, so wiring it here would be a
    //: chip that looks pressable and does nothing visible (INBOX 297).
    const untagged = options.actions
      ? chip("ph:tag Add tags", "untagged", (event) => {
        event.stopPropagation();
        editingId = entry.id;
        focusTagsAfterRender = entry.id;
        renderEntries();
        requestAnimationFrame(() => scrollEditingEntryIntoView(entry.id));
      })
      : chip("ph:tag No tags yet", "untagged");
    untagged.title = options.actions
      ? "Add tags to this note"
      : "This note has no tags yet";
    meta.appendChild(untagged);
    //: **And the offer to have them written for you, in the one place a
    //: person is thinking about tags** (INBOX 292, the owner: "half the time
    //: when there are no tags on a note, i want the ai to generate them for
    //: me ... i want it to be more evident that it is an option and to be
    //: offered to the user"). The action already existed, one row deep in
    //: this note's menu under a name that did not mention tags, which is
    //: exactly the kind of thing nobody finds.
    //:
    //: Rendered rather than gated, because a chip is a `<span role="button">`
    //: and `syncModelGatedControls` closes controls by setting `disabled`,
    //: which does nothing to a span. An offer that cannot be honoured is
    //: worse than no offer, so with no model answering there is simply the
    //: flag above and the manual route it already opens.
    //: `options.actions` again: the offer is a model call, which is an
    //: action, so it stays off a read-only row even though the flag above it
    //: is now drawn on one.
    if (options.actions && (!modelStatus || modelStatus.ollama_running !== false)) {
      const askAtlas = chip("ph:sparkle Tag with Atlas", "untagged-ai", (event) => {
        event.stopPropagation();
        reevaluateEntry(entry);
      });
      askAtlas.title = "Atlas reads the note and suggests tags for you to approve";
      meta.appendChild(askAtlas);
    }
  }
  //: **What points at this note, on the card** (INBOX 246's third gap).
  //: Only when the counts for this page have landed; `ensureCardCounts`
  //: patches the chip in afterwards for cards rendered before they had.
  const refs = referenceCountChip(entry, options);
  if (refs) meta.appendChild(refs);
  //: **And what it made you promise to do** (INBOX 309). Same cache, same
  //: patch-in, same line: a reminder that came out of this note is a fact
  //: about the note in exactly the way "on 1 board" is.
  const alarms = reminderCountChip(entry, options);
  if (alarms) meta.appendChild(alarms);

  // "AI 0%: check this" is a warning about the AI's filing, and it only makes
  // sense when the AI actually did some. On a note you filed yourself, or one
  // saved while no AI was running, it accused a perfectly good note of being
  // suspect: which is most notes if you don't run Ollama.
  const aiDidFile = entry.ai_confidence > 0 && !entry.user_filed;
  // Plain-language explanation on hover, "confidence" is jargon otherwise,
  // and the number alone doesn't say what it's confident *about*.
  const confidenceHint = "How sure Atlas was when it picked this note's category.";
  //: **Confident filing is a fact about the category, not a line item.**
  //: A score above the review line asks nothing of anyone, and as its own
  //: pill it was one more badge on every card (owner: "a better ui/ux and
  //: more modern and professional way to ... display all the metadata,
  //: links, badges"). It rides on the category's tooltip instead; the low
  //: score keeps its own mark, because that one is a request to check.
  const categoryChip = meta.querySelector(".chip.category");
  if (aiDidFile && categoryChip && entry.ai_confidence >= REVIEW_THRESHOLD) {
    categoryChip.title = `Filed by Atlas, ${entry.ai_confidence}% sure`;
  }
  const confidenceChip = aiDidFile && entry.ai_confidence < REVIEW_THRESHOLD
    ? // Low confidence from a real attempt, worth a human look (Phase 3).
      chip(`AI ${entry.ai_confidence}%: check this`, "review")
    : null;
  if (confidenceChip) confidenceChip.title = confidenceHint;
  // Flash the badge once when this note's confidence just changed, so the
  // update after a re-evaluation is actually noticeable (user request).
  //: The category flashes when the score went to its tooltip, since the
  //: category is what a re-evaluation actually answered.
  const flashed = confidenceChip || categoryChip;
  if (flashed && entry.id === flashConfidenceId) {
    flashed.classList.add("badge-flash");
    flashConfidenceId = null;
  }
  if (confidenceChip) meta.appendChild(confidenceChip);

  // The documents this note feeds. Notes and documents are separate things
  // on purpose; this is the one place that says they are about the same one.
  for (const doc of entry.documents || []) {
    const mark = chip(`ph:file-text ${doc.title}`, "tag", () => openDocumentFromNote(doc.id));
    mark.title = `Open “${doc.title}”`;
    if (options.actions) {
      // Detach from the note's side too. The document editor has had this
      // since the link existed; from here it took going and finding the
      // document first, which is the wrong way round when the note is what
      // you are already looking at.
      const unlink = document.createElement("span");
      unlink.className = "unlink";
      setLabel(unlink, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
      unlink.title = `Detach from “${doc.title}”: the note stays`;
      unlink.addEventListener("click", async (event) => {
        event.stopPropagation(); // the chip itself opens the document
        await api(`/documents/${doc.id}/notes/${entry.id}`, { method: "DELETE" });
        await loadEntries();
        toast(`Detached from “${doc.title}”.`);
      });
      makeUnlinkAccessible(unlink);
      mark.appendChild(unlink);
    }
    meta.appendChild(mark);
  }

  // Where a web-reader clipping came from (BACKLOG §65's "source as
  // metadata"). Opens the real page, the note's own body already has the
  // same link inline, this is the at-a-glance version.
  if (entry.source_url) {
    const sourceChip = chip(
      `ph:globe ${entry.source_title || entry.source_url}`,
      "tag",
      () => window.open(entry.source_url, "_blank", "noopener,noreferrer")
    );
    sourceChip.title = `Open the source: ${entry.source_url}`;
    meta.appendChild(sourceChip);
  }

  // What this note's own "tomorrow" meant on the day it was written (§10A).
  // A chip rather than a mark inside the text: `renderNoteText` already
  // layers wiki links, inline markdown and filter highlighting through each
  // other, and a fourth pass over the same string is where that breaks.
  //: **The dates a note mentions, said as mentions** (owner: the meta row is
  //: "a bit hard to read, especially in regards to the date parsing"). Two
  //: calendar chips beside "3 days ago" read as three dates of the same kind;
  //: they are different facts: when the note was written is at the card's
  //: corner, and the days its words point at are one labelled item here.
  const mentioned = [];
  for (const when of entry.dates || []) {
    const day = new Date(`${when.at}T00:00:00`);
    const label =
      when.precision === "day"
        ? day.toLocaleDateString(undefined, { day: "numeric", month: "short" })
        : `${when.precision} of ${day.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    //: The date alone, the phrase on hover (owner, with a screenshot of
    //: "Tonight → 21 Sept on Friday → 25 Sept" in one meta line: "clean up
    //: the notes metadata and badges a bit more"). What a reader scans for is
    //: the day; the words the note used for it are the explanation.
    mentioned.push({
      label,
      title: `“${when.phrase}” meant ${day.toLocaleDateString(undefined, {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })}`,
    });
  }
  if (mentioned.length) {
    const shown = mentioned.slice(0, 3).map((m) => m.label).join(", ");
    const more = mentioned.length > 3 ? ` +${mentioned.length - 3}` : "";
    const mark = chip(`ph:calendar-blank Mentions ${shown}${more}`, "when");
    mark.title = `${mentioned.map((m) => m.title).join("; ")}. Worked out from the day this note was written.`;
    meta.appendChild(mark);
  }

  //: **Which space this note is actually filed in (INBOX 1a/38).** "Notes
  //: from a deleted space appear in All spaces" turned out to be
  //: unanswerable without this: there was no way to tell a survivor's real
  //: space apart from a note that always lived in Default Space, so a
  //: report and a non-bug looked identical. Shown whenever the picker at
  //: the top of the tab does not already say it: every card while "All
  //: spaces" is selected, or a card whose own space differs from the one
  //: picked. `spacesCache` is the same list the switcher menu reads, so a
  //: name/icon here can never disagree with the one shown there.
  //: **`spacesCache.length` is not decoration: an empty cache means "not
  //: loaded yet", not "there are no spaces".** `loadSpaces()` fills it from
  //: `GET /spaces` after boot, and the note list renders before that lands, so
  //: without this guard every card drew the chip below with the name it falls
  //: back to and said, of an ordinary note in the Default Space, that it was
  //: "filed in a space that no longer exists". Caught in a README screenshot,
  //: where fifty-seven cards said it at once. Saying nothing until the answer
  //: is known is the honest state; `loadSpaces` re-renders the list once it
  //: has it (see its own comment), so the chip appears a moment later rather
  //: than never.
  //: Only when there is more than one space: with one, "Default Space" on
  //: every note said nothing (owner's screenshots).
  if (entry.workspace_id && spacesCache.length > 1) {
    const active = activeSpaceId();
    if (active === SPACE_ALL || entry.workspace_id !== active) {
      const space = spacesCache.find((s) => s.id === entry.workspace_id);
      // Stored as "ph-house" (a full class name, see the switcher's own
      // `iconEl.className`), not the "ph:house" `setLabel` shorthand
      // expects; stripping the prefix once here is cheaper than a second
      // icon convention.
      const iconName = (space?.icon || "ph-circles-four").replace(/^ph-/, "");
      const spaceName = space ? space.name : "a space that no longer exists";
      const spaceChip = chip(`ph:${iconName} ${spaceName}`, "tag", () =>
        setActiveSpace(entry.workspace_id)
      );
      spaceChip.title = `Filed in ${spaceName}. Click to switch there.`;
      meta.appendChild(spaceChip);
    }
  }

  // While the AI is re-evaluating this note, show a live spinner chip so
  // it's obvious something is running on this specific card.
  if (entry.id === busyEntryId) {
    li.classList.add("entry-busy");
    const busy = chip("Atlas is reading…", "busy");
    busy.classList.add("chip-busy");
    // The shared spinner (ROADMAP Priority 0 #14) replaces this chip's own
    // one-off ring: .chip's own `gap` handles the spacing and vertical
    // centring, so no extra margin is needed.
    busy.prepend(spinnerEl());
    meta.appendChild(busy);
  }

  // The date and the action buttons share one right-aligned group. They used
  // to carry a `margin-left: auto` each, and two auto margins in a flex row
  // split the free space between them, which put the timestamp at a
  // different x on every card, depending on how wide its chips were.
  const metaEnd = document.createElement("span");
  metaEnd.className = "entry-meta-end";

  const date = document.createElement("span");
  date.className = "entry-date";
  const stamp = entry.created_at;
  date.textContent = relativeTime(stamp);
  date.title = `Written ${new Date(stamp).toLocaleString()}`; // exact on hover
  metaEnd.appendChild(date);
  meta.appendChild(metaEnd);

  if (options.actions) {
    // Wave L rework: two everyday actions stay visible; the rest live in
    // one ⋯ menu: the old row of nine icons was unscannable noise.
    const actions = document.createElement("span");
    actions.className = "entry-actions";
    actions.appendChild(
      //: **Star, not pin, and "Favourites", not "pinned".** The flag does two
      //: things: floats a note to the top of a list *and* collects it into
      //: the Favourites row in the sidebar, and it was named for only the
      //: first, so the app showed one concept under two names with two icons.
      //: Asked for: "make sure the favourites feature is actually integrated
      //: everywhere." The tooltip keeps the sort behaviour, since that is the
      //: half a star does not imply on its own.
      favouriteButton(entry)
    );
    actions.appendChild(
      smallButton("ph:clipboard", "Copy this note's text", async () => {
        if (await copyToClipboard(entry.content)) toast("Note copied.");
      })
    );
    actions.appendChild(
      smallButton("ph:pencil-simple", "Edit this entry", () => {
        editingId = entry.id;
        renderEntries();
        //: Scroll the edit form into view after renderEntries rebuilds the
        //: list, otherwise the list resets to the top and the editing note
        //: may be off screen. Nearest scroller, not scrollIntoView: DESIGN.md
        //: rule, scrollIntoView walks every ancestor to the page.
        requestAnimationFrame(() => scrollEditingEntryIntoView(entry.id));
      })
    );
    // Publishing already worked via the "draft" chip below (click it to
    // clear is_draft): reported again anyway ("needs to be...a button for
    // editing a draft and publishing"), so the chip alone wasn't read as an
    // action. An explicit, always-visible button next to Edit for drafts
    // only (a published note has nothing to publish) says the same thing
    // the chip's tooltip already did, just as a button instead of a tag.
    if (entry.is_draft) {
      actions.appendChild(
        smallButton("ph:check-circle", "Publish this draft as a proper note", async () => {
          try {
            await apiJson(`/entries/${entry.id}`, {
              method: "PUT",
              body: JSON.stringify({ is_draft: false }),
            });
            entry.is_draft = false;
            await loadEntries();
            toast("Published.");
          } catch (error) {
            toast(error.message || "Couldn't publish that draft.", true);
          }
        })
      );
    }
    actions.appendChild(entryOverflowMenu(entry));
    metaEnd.appendChild(actions);
  }
  if (entry.is_private) {
    // With the vault known to be locked (sign-in off, INBOX 426 aa), the
    // chip is the way in: it asks for the password and redraws the list.
    const lockedChip = vaultOpen === false
      ? chip("ph:lock-key unlock to read", "", () => unlockPrivateNotes())
      : chip("ph:lock private");
    meta.insertBefore(lockedChip, meta.firstChild);
  }
  if (entry.pinned) meta.insertBefore(chip("ph:star favourite"), meta.firstChild);
  // Set either by the text-selection popup's "Save as draft note" (not yet
  // looked at) or by the Writing Room's "Save as note" (drafted with the AI,
  // however much it was edited before saving), asked for directly: both
  // should be findable as drafts, not just marked in passing. The note stays
  // in its normal place in the list either way; the sidebar/Library Drafts
  // filter (renderSidebar, and the Library's Drafts chip: the old
  // `library-view-drafts` sub-tab it used to name is gone) is what makes them
  // findable as a group.
  //
  // **The chip is also how a draft becomes a real note**, and saying so is the
  // fix: it was labelled "draft" with the tooltip "click to clear the label",
  // which describes the mechanism and not the outcome, reported as "there is
  // no way to edit and finalise drafts, or to publish one as a proper note",
  // when publishing was one click away the whole time and simply unlabelled.
  if (entry.is_draft) {
    const draftChip = chip("ph:pencil-simple-line draft", "draft", async (event) => {
      event.stopPropagation();
      try {
        await apiJson(`/entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({ is_draft: false }),
        });
        entry.is_draft = false;
        await loadEntries();
      } catch (error) {
        toast(error.message || "Couldn't update that note.", true);
      }
    });
    draftChip.title =
      "This is a draft, click to publish it as a proper note. It stays where it is either way; only the Drafts filter changes.";
    meta.insertBefore(draftChip, meta.firstChild);
  }
  //: **Where an imported note came from.** A vault file has a name, the
  //: thing its `[[wiki links]]` use: and this app has no title field to put
  //: it in, so without this the name is invisible: the note shows its opening
  //: words like every other note, and nothing on screen says it is one of a
  //: thousand files someone imported from a folder.
  //:
  //: A chip rather than a heading written into the note: the importer must
  //: not rewrite the file it imported (see `_run_directory_import`, an
  //: earlier attempt did, and three tests caught it).
  if (entry.source_path) {
    const fileChip = chip(`ph:file-md ${entry.source_path.split("/").pop()}`, "source-path");
    fileChip.title = `Imported from ${entry.source_path}`;
    meta.appendChild(fileChip);
  }
  li.appendChild(meta);

  // "Why this result" is its own line under the note, not another chip in
  // the meta lane. Measured: in the compact rows view that lane is a
  // `fit-content(26rem)` track with `overflow-x: auto`, and a chip naming
  // two signals pushed the date and the actions strip out of the visible
  // box (57 to 84px past its right edge, `scratchpad/ui-sweeps/searchwhy.js`),
  // which is the exact crowding `.entry-meta`'s own comment says that track
  // was rebuilt to stop. A row of its own also says what it is: a reason for
  // this note being in *this* list, which appears with a query and goes with
  // it, rather than a permanent fact about the note like its category.
  const why = whyThisResultChip(entry);
  if (why) {
    const line = document.createElement("div");
    line.className = "entry-why";
    line.appendChild(why);
    li.appendChild(line);
  }

  // Attachments (Wave B; images become thumbnails in Wave M).
  if (entry.attachments.length > 0) {
    const fileRow = document.createElement("div");
    fileRow.className = "entry-links";
    for (const attachment of entry.attachments) {
      const removeButton = () => {
        const remove = document.createElement("span");
        remove.className = "unlink";
        setLabel(remove, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
        remove.title = "Remove this file";
        remove.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!(await confirmDialog(`Remove ${attachment.filename}?`))) return;
          await api(`/files/${attachment.id}`, { method: "DELETE" });
          await loadEntries();
        });
        makeUnlinkAccessible(remove);
        return remove;
      };

      if (attachment.is_image) {
        // Show the picture itself, not a chip, click for full size.
        const wrap = document.createElement("span");
        wrap.className = "thumb-wrap";
        const img = document.createElement("img");
        img.className = "attachment-thumb";
        img.alt = attachment.filename;
        img.title = `${attachment.filename}: click to view full size`;
        attachmentObjectUrl(attachment)
          .then((url) => (img.src = url))
          .catch(() => wrap.remove());
        img.addEventListener("click", () => {
          const images = entry.attachments.filter((a) => a.is_image);
          openLightbox(
            images.map((a) => ({ filename: a.filename, getUrl: () => attachmentObjectUrl(a) })),
            images.indexOf(attachment)
          );
        });
        wrap.appendChild(img);
        if (options.actions) wrap.appendChild(removeButton());
        fileRow.appendChild(wrap);
      } else {
        // Opens the lightbox's document viewer, not a download, this used
        // to go straight to `downloadAttachment`, the one file surface that
        // never got the fileCard treatment §... unified everywhere else.
        // Reported directly: "I tried to open and view a file i attached to
        // a note, instead it just downloaded it." `mediaSrc()` already knows
        // how to token-gate a `/files/{id}` url the same way it does
        // `/media/{name}`; `show()` below is what learned to read one.
        const fileChip = chip(`ph:file-text ${attachment.filename}`, "link", () =>
          openLightbox(
            [{ filename: attachment.filename, getUrl: () => mediaSrc(`/files/${attachment.id}`) }],
            0
          )
        );
        fileChip.title = `${attachment.filename}: ${Math.max(1, Math.round(attachment.size / 1024))} KB`;
        const downloadBtn = document.createElement("span");
        downloadBtn.className = "unlink";
        setLabel(downloadBtn, "ph:download-simple");
        downloadBtn.title = `Save “${attachment.filename}” to disk`;
        downloadBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          downloadAttachment(attachment);
        });
        makeUnlinkAccessible(downloadBtn);
        fileChip.appendChild(downloadBtn);
        if (options.actions) fileChip.appendChild(removeButton());
        fileRow.appendChild(fileChip);
      }
    }
    // Before `meta` (the category/date/pin/actions footer), not after, 
    // reported directly: a sketch or attached image sat below the note's
    // own metadata row, sandwiched between the footer and whatever came
    // after it, rather than reading as part of the note's own content.
    li.insertBefore(fileRow, meta);
  }

  // Inline add-context / continue-thought forms (Wave B).
  if (options.actions && inlineAction && inlineAction.id === entry.id) {
    li.appendChild(renderInlineAction(entry));
  }

  if (entry.links.length > 0) {
    const linkRow = document.createElement("div");
    linkRow.className = "entry-links";
    for (const link of entry.links) {
      // **A link is navigation, not content.** Measured on the busiest screen
      // in the app: a card was 25px of its own note, 23px of metadata and 21px
      // of link chips: and the chips were the loudest thing on it, filled and
      // bold, each carrying the *whole first line of another note*. On a
      // well-linked note the links were wider than the note and read first,
      // which is §36B.3's "everything at equal weight" with the weights
      // actually inverted.
      //
      // Clipped to a glanceable length, quiet by default, with the full text
      // on hover for when the clip is not enough.
      //: An image in the other note's first line is markdown a chip cannot
      //: draw, and it showed as its raw `![...](...)` (owner's screenshot:
      //: "Gary The Moss Monster :D ![Gary The Moss Monst..."). The picture
      //: is dropped from the label; the words around it stay.
      //: The preview is clipped by the server, so an image can arrive cut
      //: in half (`![WallpaperEngineOverride_rand`, owner's screenshot) and
      //: a heading with its `#`: both go, whole or truncated.
      const label = (link.preview || "")
        .replace(/!\[[^\]]*(?:\](?:\([^)]*\)?)?)?/g, "")
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      const short = label.length > LINK_CHIP_CHARS
        ? `${label.slice(0, LINK_CHIP_CHARS - 1).trimEnd()}…`
        : label;
      // chip() sets plain textContent, right for a tag or category name but
      // not here: `link.preview` is a clip of the *other* note's own text,
      // which can carry the same **bold**/`code` a reader would expect to
      // see rendered, the way the note's own body already does.
      //
      // The click handler is built first and passed into chip()'s own
      // onClick param: every sibling chip() call site in this file does
      // the same and gets keyboard support (Enter/Space, role="button",
      // tabindex) for free. This one used to build a bare chip and attach a
      // plain `click` listener after the fact instead, which quietly opted
      // this specific "Go to note" chip out of keyboard operability while
      // every other chip stayed reachable (Web Interface Guidelines pass).
      const goToLinkedNote = (e) => {
        if (e.target.classList.contains("unlink")) return;
        flashEntry(link.entry_id);
      };
      const linkChip = chip("", "link", goToLinkedNote);
      // **Which way the link points.** Every link used to draw the same
      // bidirectional glyph, because the API merged both directions into one
      // list and never said which was which, so a note could show what it
      // was connected to and never whether it had reached out or been
      // reached for. Those are different facts, and telling them apart is
      // most of what a Connections list is for (asked for by way of
      // Kortex's own, which arrows every row).
      const outgoing = link.direction !== "in";
      linkChip.classList.add(outgoing ? "link-out" : "link-in");
      linkChip.appendChild(
        setLabel(
          document.createElement("span"),
          outgoing ? "ph:arrow-up-right" : "ph:arrow-down-left"
        )
      );
    linkChip.appendChild(document.createTextNode(" "));
      const linkPreview = document.createElement("span");
      renderInlineMarkdown(linkPreview, short, [], true);
      linkChip.appendChild(linkPreview);
      const reasonNote = link.reason
        ? link.reason_confidence != null
          ? `${link.reason} (${Math.round(link.reason_confidence * 100)}% confidence, deduced)`
          : link.reason
        : null;
      const wayRound = outgoing ? "This note links to" : "Links to this note";
      linkChip.title = reasonNote
        ? `${wayRound}: ${label}\nReason: ${reasonNote}`
        : `${wayRound}: ${label}`;
      //: **One chip and one menu per connection** (INBOX 319, the owner: "the
      //: buttons in these connections in notes need a redesign and look").
      //: Edit reason, clear reason and unlink were three round buttons of one
      //: size inside every chip, so three connections were nine identical
      //: circles with the labels reading as captions between them. They are
      //: the `kebabMenu` recipe now (DESIGN.md, standing order 11), which also
      //: gives the label the width the buttons took.
      const editReason = async () => {
        const next = await promptDialog("Why are these notes connected?", link.reason || "");
        if (!next) return;
        await api(`/entries/${entry.id}/links/${link.link_id}/reason`, {
          method: "PUT",
          body: JSON.stringify({ reason: next }),
        });
        await loadEntries();
      };
      const clearReason = async () => {
        await api(`/entries/${entry.id}/links/${link.link_id}/reason`, {
          method: "PUT",
          body: JSON.stringify({ reason: null }),
        });
        await loadEntries();
      };
      const unlink = async () => {
        const otherId = link.entry_id;
        const reason = link.reason;
        let liveLinkId = link.link_id;
        await api(`/entries/${entry.id}/links/${liveLinkId}`, { method: "DELETE" });
        await loadEntries();
        pushUndo(
          "Removed a link between notes",
          async () => {
            const updated = await apiJson(`/entries/${entry.id}/links`, {
              method: "POST",
              body: JSON.stringify({ target_id: otherId, reason }),
            });
            liveLinkId = updated.links.find((l) => l.entry_id === otherId)?.link_id ?? liveLinkId;
            await loadEntries();
          },
          async () => {
            await api(`/entries/${entry.id}/links/${liveLinkId}`, { method: "DELETE" });
            await loadEntries();
          }
        );
      };
      const connection = document.createElement("span");
      connection.className = "link-connection";
      connection.appendChild(linkChip);
      if (options.actions) {
        const items = [
          {
            label: link.reason ? "ph:pencil-simple Edit the reason" : "ph:pencil-simple Add a reason",
            title: link.reason ? "Edit why these notes are connected" : "Say why these notes are connected",
            run: editReason,
            group: "reason",
          },
        ];
        if (link.reason) {
          items.push({ label: "ph:eraser Clear the reason", title: "Keep the link, drop its reason", run: clearReason, group: "reason" });
        }
        items.push({ label: "ph:link-break Remove the link", title: "Remove this link (undoable)", run: unlink, group: "remove" });
        connection.appendChild(kebabMenu(items, `Actions for the link to ${label}`));
      }
      linkRow.appendChild(connection);
    }
    //: **Three links, then a count** (INBOX 424 q): a well-linked note drew
    //: every connection as a chip, measured at 109 controls on the Notes tab
    //: with 19 under 24px, and the chips outweighed the note. The first
    //: three show; the rest wait behind "+N more links", which opens them
    //: in place (and stays open for this render).
    const LINKS_SHOWN = 3;
    const connections = [...linkRow.children];
    if (connections.length > LINKS_SHOWN + 1) {
      for (const extra of connections.slice(LINKS_SHOWN)) extra.classList.add("entry-link-extra");
      const more = document.createElement("button");
      more.type = "button";
      more.className = "ghost small entry-links-more";
      const hidden = connections.length - LINKS_SHOWN;
      more.textContent = `+${hidden} more link${hidden === 1 ? "" : "s"}`;
      more.setAttribute("aria-expanded", "false");
      more.addEventListener("click", (event) => {
        event.stopPropagation();
        linkRow.classList.add("show-all");
        more.remove();
      });
      linkRow.appendChild(more);
    }
    li.appendChild(linkRow);
  }
  return li;
}

//: Take a note to the graph and put it in the middle, lit. The graph is its
//: own lazy bundle and lays itself out after the tab opens, so this waits for
//: the node to exist and to have a position rather than guessing a delay.
async function showNoteInGraph(id) {
  await switchTab("graph");
  const deadline = Date.now() + 4000;
  let node = null;
  while (Date.now() < deadline) {
    node = graphNodeById(id);
    if (node && Number.isFinite(node.x)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!node || !Number.isFinite(node.x)) {
    toast("That note is not on the graph right now: a filter or the view may be hiding it.", true);
    return;
  }
  focusGraphNode(node);
  if (typeof graphSvg !== "undefined" && graphSvg && typeof graphZoom !== "undefined" && graphZoom) {
    graphSvg.transition().duration(400).call(graphZoom.translateTo, node.x, node.y);
  }
}

//: Start a chat about one note. Named by its title in the words a person
//: would use, so the agent's own search tools find it, rather than pasting the
//: whole note into the box.
function askAtlasAboutNote(entry) {
  const name = (entry.title || String(entry.content || "").split("\n")[0] || "this note").trim();
  askAtlasAboutThing("note", name);
}

//: One door into the chat for any object: a note, a document, a board, a
//: file. Named, so the agent's own tools find it.
function askAtlasAboutThing(kind, name) {
  const label = String(name || "").trim().slice(0, 80) || `this ${kind}`;
  switchTab("chat");
  const input = $("chat-input");
  if (!input) return;
  input.value = `Tell me about my ${kind} "${label}" and what it connects to.`;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}
