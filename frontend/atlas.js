// atlas.js: Atlas, the assistant's own character. Loaded straight after
// avatars.js, whose `registerCharacter` it answers through; every other file
// reaches it by the old names (`atlasMark`, `setAtlasMood`,
// `atlasRestingMood`), so no call site changed when it moved here.
//
//: **The design note** (the owner: "a very very impressive avatar for Atlas
//: ... logo mixed in", "a bit more aura and less nerdy", "potentially cute as
//: well ... change in emotions or looks based on certain events", "one
//: designed character, not a disc face with a body stuck on", and "it needs
//: to be intentionally designed and rendered with lots more life and
//: emotions and versatile").
//:
//: - **Who.** A small star spirit that keeps your map: a guide, warm and a
//:   little proud of you, and cool rather than babyish (the owner, on the
//:   first draft: "cooler and aura and less like a teletubby. it can still
//:   be cute though, just not fat baby cute"). Its references are spirit
//:   guides (Ori, Navi, a legendary's small form): cute through expression
//:   and motion, not chubbiness. No glasses, screens or lab-coat cues.
//: - **Silhouette.** Lean and one piece, a creature with a clear outline
//:   (the owner: "he can be like a cool pokemon"): a head about 42% of the
//:   height with a softly tapered chin, a small plain crest swept back from
//:   the crown, narrow shoulders tapering to a tunic V on slim limbs, and a
//:   tail. Head, crest, arms, body and tail share one gradient in the
//:   drawing's own space (the favicon's trick).
//: - **Construction** (the owner, on the second draft: "it kinda looks like
//:   the arms and legs arent properly attached to the body, I want a cleaner
//:   and better design"). Every outline is drawn first, as one layer, and
//:   every fill on top of it: where torso, arms and legs overlap, the fills
//:   cover the inner outlines, so the body reads as one silhouette with one
//:   outer contour of one width, and a limb grows out of the shoulder or hip
//:   instead of lying on it. Each limb is in both layers under the same
//:   companion class, so a pose turns its outline and its fill together,
//:   about a joint inside the torso, and no rotation opens a seam. Crest and
//:   head are joined the same way.
//: - **The signature is the logo, worn, twice and no more.** The logo is a
//:   bright hub with linked notes round it. Atlas's tail is one tapering
//:   shape with two of those notes on thin bands round it and a bright
//:   tip, and the hub is light inside its chest: a soft glow with three
//:   faint linked points, glowing brighter when it is happy and dim when it
//:   sleeps, the points lighting in turn while it thinks. The tail
//:   was chosen over a ring round the body (the owner liked both; one node
//:   motif, not two): a tail has a pose of its own (tucked sitting, hanging
//:   when it hangs, curled asleep, wagging when pleased), joins the
//:   silhouette the same way the limbs do, and animates with one rotation,
//:   where a ring needs a front half and a back half round the body and the
//:   last one read as stray lines. No orbit, no motes, no nodes on the crest.
//: - **Aura.** One radial gradient glow behind it (no filters), a rim light
//:   on its right edge and a gloss on the crown. The glow is stronger in
//:   dark mode, where it has something to glow against.
//: - **Palette.** Everything comes from the live `--accent` through CSS, so
//:   it follows the look and the theme without a redraw. The body's
//:   lightness is fixed and only the hue and some chroma come from the
//:   accent (`oklch(from var(--accent) ...)`), so a dark accent (Graphite)
//:   or a pale one (Lagoon's dark set) still draws the same readable
//:   character; a browser without relative colours gets a `color-mix`
//:   version. Eyes are near-black ink tinted with the accent, blush is one
//:   fixed pink.
//: - **Face.** Almond eyes, the outer corners lifted and lined along the
//:   top, an iris with a coloured lower glow and a glint; upper and lower
//:   lids that slide and tilt; brows that rise, knit and slant; twelve
//:   mouths; cheeks that blush. Fifteen moods,
//:   each a combination of all of these plus head tilt, body squash, crest
//:   and orbit lift and brightness and one small extra (sparkles, hearts, a thought, a
//:   tear). The combinations are CSS (`[data-atlas-mood]` in
//:   08-consistency.css); this file draws the parts and says which mood.
//: - **Life.** Breathing squash and stretch from the feet, blinks with an
//:   occasional double blink, the tail swaying (wagging when pleased) with
//:   its notes glinting in turn, a slow head sway and the glow pulsing. Expressions ease between each other in
//:   `--motion-slow`. All of it is CSS transform and opacity on this one SVG,
//:   runs only while the mark is on screen and motion is on, slows under
//:   Reduce motion and stops under Avatar animation Off.
//: - **Sizes.** `full` (a figure with margins, 96px and up: the welcome, the
//:   large view), `figure` (the companion's 64 by 92 box, parts named for
//:   the companion's behaviours), `head` (the head and its crest, 28 to 95px:
//:   the dashboard mark, chat heads, persona rows) and `tiny` (under 28px:
//:   thicker lines, no lids, brows or motion).

//: The moods Atlas can show. `cue` is what the corner companion is told when
//: Atlas moves into it (think, cheer, startle or rest); the words are the
//: mark's tooltip.
const ATLAS_MOODS = {
  calm: { words: "", cue: "rest" },
  happy: { words: "pleased", cue: "cheer" },
  delighted: { words: "delighted", cue: "cheer" },
  laughing: { words: "laughing", cue: "cheer" },
  thinking: { words: "thinking", cue: "think" },
  curious: { words: "curious", cue: "rest" },
  surprised: { words: "surprised", cue: "startle" },
  confused: { words: "puzzled", cue: "rest" },
  sleepy: { words: "dozing", cue: "rest" },
  sad: { words: "a little sad", cue: "rest" },
  proud: { words: "proud of you", cue: "cheer" },
  shy: { words: "bashful", cue: "rest" },
  determined: { words: "on it", cue: "think" },
  love: { words: "fond of you", cue: "cheer" },
  worried: { words: "worried", cue: "rest" },
};

const ATLAS_SVG_NS = "http://www.w3.org/2000/svg";
let atlasSerial = 0;

function atlasMake(tag, attrs, parent) {
  const el = document.createElementNS(ATLAS_SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) el.setAttribute(key, String(value));
  if (parent) parent.appendChild(el);
  return el;
}

//: A group that turns, scales or slides about a point of the drawing: the
//: point goes on the element itself, in the drawing's units, because
//: `transform-box: view-box` reads it in the element's own user space
//: (measured in Chromium: the viewBox's offset and any parent transform do
//: not move it), so one origin serves every crop of the same drawing.
function atlasPivot(el, x, y) {
  el.classList.add("atl-o");
  el.style.transformOrigin = `${x}px ${y}px`;
  return el;
}

function atlasGroup(parent, cls, pivot) {
  const g = atlasMake("g", cls ? { class: cls } : {}, parent);
  if (pivot) atlasPivot(g, pivot[0], pivot[1]);
  return g;
}

//: The drawing's landmarks, in the companion's 64 by 92 box (1 unit is 1px
//: at the companion's size): the head from 3.6 to 38 (about 42% of the
//: height), the seat at 72, the soles at 90, the raised hands at -7.
const ATLAS_GEO = {
  eyes: [[25.2, 22.4, 1], [38.8, 22.4, -1]],
  brows: [[24.8, 15.4, 1], [39.2, 15.4, -1]],
  cheeks: [[19.6, 28.2], [44.4, 28.2]],
  crest: [31, 7],
  tail: [37, 67],
  neck: [32, 36],
  feet: [32, 90],
  chin: [32, 38],
};

const ATLAS_HEAD_PATH = "M32 3.6C42.4 3.6 49.2 10.6 49.2 20.2C49.2 28.2 44.4 34.8 37.6 37.4C35 38.4 29 38.4 26.4 37.4C19.6 34.8 14.8 28.2 14.8 20.2C14.8 10.6 21.6 3.6 32 3.6Z";
//: The crest: three swept locks, comet-like, the longest on top (the owner:
//: "better hair or smth??"), lit on their leading edges from the top left
//: like the rest of the drawing, with a glint at the tip.
const ATLAS_CREST_LOCKS = [
  "M33.6 9.2C35.6 5.6 40 4.6 43.8 5C46.4 5.3 48.8 4.4 50.8 2.2C50.6 6.2 48 9 44.4 10.2C41.8 11 39.6 11.4 38.2 12.6Z",
  "M25 9.4C23 6.6 22.4 3.8 23.4 1.2C24.6 3.8 26.6 5.2 29 6.2Z",
  "M25 8.8C24.4 3.4 29 0 35.4 -0.4C40 -0.7 43.6 -1.8 46.6 -4.6C45.8 0.2 42.8 3.6 39 5.4C37.8 6 37 7.2 36.6 8.8Z",
];
//: The body: shoulders a little wider than the hips, tapering to a tunic's
//: V at the front, so the silhouette has angles and not a belly.
const ATLAS_TORSO_PATH = "M27 34C27.2 38.6 25 40.4 22.2 41.6C19.6 42.8 19.4 46.6 20.6 50C22 54 24.2 58.6 24.8 63C25.2 66.4 25 69.4 25.4 71.6C27.6 72 29.6 72.8 32 75C34.4 72.8 36.4 72 38.6 71.6C39 69.4 38.8 66.4 39.2 63C39.8 58.6 42 54 43.4 50C44.6 46.6 44.4 42.8 41.8 41.6C39 40.4 36.8 38.6 37 34Z";
//: The tail: one tapering shape (the owner, of a row of beads: "the dotted
//: tail looks weird and needs a better look"), thick where it grows out
//: of the hip and fine at the tip, curving low past the hand and up. The
//: logo's notes sit on two thin bands round it, and its tip is bright. The path is generated (a centreline of two
//: cubics, a half-width easing from 3.6 to 0.45, offset both ways and
//: smoothed), so it is written out here rather than drawn by hand.
const ATLAS_TAIL_PATH = "M32.13 67.27C32.45 67.87 33.34 69.74 34.05 70.87C34.77 71.99 35.58 73.06 36.41 74.01C37.25 74.97 38.15 75.82 39.06 76.57C39.98 77.33 40.94 77.99 41.91 78.55C42.88 79.11 43.88 79.57 44.87 79.94C45.86 80.30 46.86 80.57 47.85 80.74C48.83 80.91 49.82 80.98 50.77 80.94C51.72 80.91 52.66 80.78 53.54 80.54C54.42 80.30 55.28 79.95 56.05 79.51C56.82 79.06 57.62 78.36 58.15 77.87C58.69 77.38 58.93 77.01 59.26 76.57C59.60 76.13 59.90 75.69 60.18 75.24C60.46 74.79 60.71 74.33 60.93 73.86C61.16 73.40 61.35 72.93 61.51 72.45C61.68 71.98 61.81 71.50 61.91 71.03C62.01 70.55 62.08 70.07 62.11 69.60C62.14 69.13 62.14 68.65 62.11 68.18C62.07 67.72 62.00 67.25 61.89 66.80C61.78 66.34 61.63 65.89 61.45 65.45C61.27 65.02 60.90 64.40 60.80 64.19C60.69 63.97 60.80 64.19 60.80 64.19A0.45 0.45 0 0 1 60.00 64.61C60.00 64.61 59.91 64.42 60.00 64.61C60.10 64.81 60.41 65.40 60.55 65.80C60.70 66.20 60.79 66.60 60.86 67.01C60.93 67.41 60.95 67.82 60.95 68.23C60.95 68.63 60.91 69.05 60.84 69.45C60.77 69.86 60.67 70.27 60.54 70.67C60.41 71.07 60.25 71.48 60.06 71.87C59.88 72.26 59.66 72.65 59.42 73.03C59.18 73.41 58.91 73.78 58.62 74.14C58.33 74.50 58.01 74.86 57.68 75.19C57.35 75.52 57.11 75.80 56.65 76.13C56.18 76.46 55.49 76.90 54.88 77.15C54.26 77.40 53.61 77.55 52.95 77.62C52.28 77.70 51.58 77.69 50.88 77.60C50.18 77.51 49.45 77.34 48.74 77.10C48.03 76.85 47.30 76.52 46.61 76.11C45.91 75.71 45.22 75.23 44.56 74.67C43.91 74.12 43.28 73.49 42.69 72.80C42.11 72.11 41.56 71.35 41.08 70.53C40.60 69.70 40.17 68.84 39.80 67.87C39.43 66.91 39.02 65.25 38.87 64.73Z";
//: Two bands round it (the celestial ring, worn), each carrying a note, and
//: a bright tip. The bands are the tail's own normals at 42% and 70% of its
//: length, bowed a little along it.
const ATLAS_TAIL_BANDS = [
  ["M47.73 81.22Q49.46 79.2 48.86 76.61", [49, 78.9, 1.15]],
  ["M59.64 76.89Q59.26 74.97 57.3 74.87", [59, 75.6, 0.9]],
];
const ATLAS_TAIL_TIP = [60.6, 64.9];

//: Twelve mouths, drawn at a larger scale round (32, 38) and set under the
//: eyes by one transform (`atlasHead`). `fill` shapes are open mouths, with
//: a tongue where it shows; the rest are one stroke.
const ATLAS_MOUTHS = {
  smile: { d: "M28.6 36.8Q32 39.8 35.4 36.8" },
  grin: { d: "M27.6 36.2Q32 37.1 36.4 36.2Q36 41.6 32 41.6Q28 41.6 27.6 36.2Z", fill: true, tongue: "M29.7 40.2Q32 38.5 34.3 40.2Q33.3 41.5 32 41.5Q30.7 41.5 29.7 40.2Z" },
  big: { d: "M26.6 35.6Q32 36.9 37.4 35.6Q37 43.6 32 43.6Q27 43.6 26.6 35.6Z", fill: true, tongue: "M28.9 41.7Q32 39.3 35.1 41.7Q33.8 43.5 32 43.5Q30.2 43.5 28.9 41.7Z" },
  laugh: { d: "M25.8 35.2Q32 37.8 38.2 35.2Q37.4 44.8 32 44.8Q26.6 44.8 25.8 35.2Z", fill: true, tongue: "M28.6 42.7Q32 40.1 35.4 42.7Q34 44.7 32 44.7Q30 44.7 28.6 42.7Z" },
  o: { ellipse: [32, 39.4, 2.5, 3.1] },
  tinyo: { ellipse: [32, 38.8, 1.4, 1.7] },
  hmm: { d: "M29.8 38.6Q32.4 37.4 35.2 38.1" },
  wavy: { d: "M27.8 38.4Q29.2 37 30.6 38.4Q32 39.8 33.4 38.4Q34.8 37 36.2 38.4" },
  frown: { d: "M28.8 39.8Q32 36.8 35.2 39.8" },
  smug: { d: "M28.2 37.6Q32.2 40.2 36.4 35.8" },
  cat: { d: "M28.4 37.2Q30.2 39.8 32 37.8Q33.8 39.8 35.6 37.2" },
  set: { d: "M28.8 38.6Q32 37.9 35.2 38.6" },
};

function atlasSpark(parent, x, y, s, cls) {
  return atlasMake("path", {
    class: cls,
    d: `M${x} ${y - s}Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y}Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s}Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y}Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`,
  }, parent);
}

function atlasHeart(parent, x, y, s, cls) {
  return atlasMake("path", {
    class: cls,
    d: `M${x} ${y + s * 0.9}C${x - s * 1.3} ${y} ${x - s * 1.1} ${y - s * 1} ${x - s * 0.5} ${y - s * 1}C${x - s * 0.15} ${y - s * 1} ${x} ${y - s * 0.7} ${x} ${y - s * 0.45}C${x} ${y - s * 0.7} ${x + s * 0.15} ${y - s * 1} ${x + s * 0.5} ${y - s * 1}C${x + s * 1.1} ${y - s * 1} ${x + s * 1.3} ${y} ${x} ${y + s * 0.9}Z`,
  }, parent);
}

function atlasDrop(parent, x, y, s, cls) {
  return atlasMake("path", {
    class: cls,
    d: `M${x} ${y - s * 1.6}Q${x - s} ${y - s * 0.2} ${x - s} ${y + s * 0.4}A${s} ${s} 0 0 0 ${x + s} ${y + s * 0.4}Q${x + s} ${y - s * 0.2} ${x} ${y - s * 1.6}Z`,
  }, parent);
}

//: An almond eye, its outer corner lifted: the confident read. `side` is 1
//: for the eye on the viewer's left (its outer corner is on the left).
function atlasAlmond(cx, cy, side) {
  const ox = cx - 5.5 * side;
  const ix = cx + 4.9 * side;
  return {
    d: `M${ox} ${cy - 1.1}Q${cx - 0.6 * side} ${cy - 8.4} ${ix} ${cy + 0.6}Q${cx + 0.2 * side} ${cy + 6.8} ${ox} ${cy - 1.1}Z`,
    upper: `M${ox} ${cy - 1.1}Q${cx - 0.6 * side} ${cy - 8.4} ${ix} ${cy + 0.6}`,
  };
}

//: One eye: the white, then (clipped to it) the iris that looks about and
//: the lids that slide over it, the liner on its upper edge, and outside
//: the clip the three closed shapes a mood can swap the open eye for.
function atlasEye(parent, id, [cx, cy, side], tiny) {
  const eye = atlasGroup(parent, `atl-eye atl-eye-${side > 0 ? "l" : "r"}`, [cx, cy]);
  const open = atlasGroup(eye, "atl-eye-open");
  const blink = atlasGroup(open, "nm-blinks atl-blink", [cx, cy]);
  const shape = atlasAlmond(cx, cy, side);
  if (!tiny) atlasMake("path", { class: "atl-sclera", d: shape.d }, blink);
  const inner = atlasMake("g", tiny ? {} : { "clip-path": `url(#${id}-e${side > 0 ? "l" : "r"})` }, blink);
  const look = atlasGroup(inner, "nm-eyes");
  const pupil = atlasGroup(look, "atl-pupil", [cx, cy]);
  const iris = atlasGroup(pupil, "atl-iris");
  if (tiny) {
    atlasMake("path", { class: "atl-ink", d: shape.d, transform: `translate(${cx} ${cy}) scale(0.95 1.25) translate(${-cx} ${-cy})` }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx + 1.2, cy: cy - 1, r: 1.3 }, iris);
  } else {
    atlasMake("ellipse", { class: "atl-ink", cx: cx + 0.2 * side, cy: cy - 0.4, rx: 3.7, ry: 4.3 }, iris);
    atlasMake("ellipse", { class: "atl-iris-glow", cx: cx + 0.2 * side, cy: cy + 1.9, rx: 2.1, ry: 1.1 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx + 1.1, cy: cy - 1.4, r: 1.05 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.1, cy: cy + 1.1, r: 0.5 }, iris);
    const heart = atlasGroup(pupil, "atl-heart-eye");
    atlasHeart(heart, cx, cy + 0.3, 3.4, "atl-heart");
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.3, cy: cy - 1.2, r: 0.7 }, heart);
    //: The upper lid is the head's own skin sliding down over the white,
    //: with a lash line on its edge; the lower lid rises for a squint.
    const lid = atlasGroup(inner, "atl-lid", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 6} ${cy - 14}H${cx + 6}V${cy - 4.2}Q${cx} ${cy - 3.4} ${cx - 6} ${cy - 4.2}Z` }, lid);
    atlasMake("path", { class: "atl-lash", d: `M${cx - 6} ${cy - 4.2}Q${cx} ${cy - 3.4} ${cx + 6} ${cy - 4.2}` }, lid);
    const low = atlasGroup(inner, "atl-lid-low", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 6} ${cy + 12}H${cx + 6}V${cy + 2.6}Q${cx} ${cy + 1.8} ${cx - 6} ${cy + 2.6}Z` }, low);
    atlasMake("path", { class: "atl-liner", d: shape.upper }, blink);
  }
  const w = tiny ? 2.8 : 1.9;
  atlasMake("path", { class: "atl-e-happy atl-stroke", "stroke-width": w, d: `M${cx - 4.2} ${cy + 1.4}Q${cx} ${cy - 4} ${cx + 4.2} ${cy + 1.4}` }, eye);
  atlasMake("path", { class: "atl-e-shut atl-stroke", "stroke-width": w, d: `M${cx - 4.4} ${cy - 0.4}Q${cx} ${cy + 3.4} ${cx + 4.4} ${cy - 0.4}M${cx - 4.4 * side} ${cy - 0.4}l${-1.4 * side} -0.9` }, eye);
  atlasMake("path", {
    class: "atl-e-squeeze atl-stroke",
    "stroke-width": w,
    d: `M${cx - 3 * side} ${cy - 3}L${cx + 2.6 * side} ${cy}L${cx - 3 * side} ${cy + 3}`,
  }, eye);
  return eye;
}

//: The small extras a mood can bring, each hidden until its mood asks.
function atlasExtras(parent) {
  const fx = atlasGroup(parent, "atl-fx");
  const sparkle = atlasGroup(fx, "atl-fx-sparkle");
  atlasSpark(sparkle, 9, 10, 2.6, "atl-sparkle");
  atlasSpark(sparkle, 55, 14, 2.1, "atl-sparkle atl-late");
  atlasSpark(sparkle, 13, 1, 1.5, "atl-sparkle atl-later");
  const hearts = atlasGroup(fx, "atl-fx-hearts");
  atlasHeart(atlasGroup(hearts, "atl-float", [53, 12]), 53, 12, 2.8, "atl-heart");
  atlasHeart(atlasGroup(hearts, "atl-float atl-late", [11, 7]), 11, 7, 2.1, "atl-heart");
  const zz = atlasGroup(fx, "atl-fx-zz");
  atlasMake("path", { class: "atl-float atl-stroke atl-z", d: "M48.4 9.6h3.2l-3.2 3.4h3.2" }, zz);
  atlasMake("path", { class: "atl-float atl-late atl-stroke atl-z", d: "M54.2 3.6h2.4l-2.4 2.6h2.4" }, zz);
  const dots = atlasGroup(fx, "atl-fx-dots");
  for (const [i, x, y, r] of [[0, 50.5, 12.5, 1.1], [1, 54, 8.2, 1.5], [2, 58.4, 3.4, 2.1]]) {
    atlasMake("circle", { class: `atl-dot atl-dot-${i}`, cx: x, cy: y, r }, dots);
  }
  const q = atlasGroup(fx, "atl-fx-q", [11, 6]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M7.8 3.6Q7.8 0.2 11 0.2Q14.2 0.2 14.2 3Q14.2 5 12 6Q10.9 6.6 10.9 8.4" }, q);
  atlasMake("circle", { class: "atl-mark-dot", cx: 10.9, cy: 11.2, r: 1 }, q);
  const bang = atlasGroup(fx, "atl-fx-bang", [11, 6]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M10.4 0V7.4" }, bang);
  atlasMake("circle", { class: "atl-mark-dot", cx: 10.4, cy: 10.6, r: 1.1 }, bang);
  const tear = atlasGroup(fx, "atl-fx-tear");
  atlasDrop(atlasGroup(tear, "atl-fall", [20.2, 28]), 20.2, 28, 1.5, "atl-drop");
  const sweat = atlasGroup(fx, "atl-fx-sweat");
  atlasDrop(atlasGroup(sweat, "atl-fall atl-slow", [47, 13]), 47, 13, 1.5, "atl-drop");
  return fx;
}

//: The crest, swept back from the crown. It perks up with a good mood and
//: droops with a low one (`--atl-crest`). Drawn twice, like the body: its
//: edge under every fill, then its fill.
function atlasCrest(parent, tiny, edge) {
  const crest = atlasGroup(parent, "atl-crest", ATLAS_GEO.crest);
  for (const d of ATLAS_CREST_LOCKS) atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, crest);
  if (edge || tiny) return crest;
  //: Where the top lock lies over the one behind it, a crease; on each
  //: lock's leading edge, the light.
  atlasMake("path", { class: "atl-crease", d: "M45.8 -1.2C44.4 2 42 4 39 5.4" }, crest);
  atlasMake("path", { class: "atl-crest-light", d: "M27.4 5.6C28.6 2 32.4 0.8 36.6 0.6" }, crest);
  atlasMake("path", { class: "atl-crest-light", d: "M38.4 8.6C40.4 6.4 43.2 6 46.4 5.8" }, crest);
  atlasSpark(crest, 46.8, -4.8, 1.7, "atl-glint");
  return crest;
}

//: The tail, in the edge layer and again in the fill layer like every other
//: part. `.atl-tail` takes the pose and the mood (tucked, hanging, curled,
//: lifted, drooping); `.atl-tail-swish` inside it takes the loop (a slow
//: sway at rest, a wag when pleased). In the fill copy the notes on its
//: bands glow, light in turn while Atlas thinks and pulse to music.
function atlasTail(layer, edge) {
  const tail = atlasGroup(layer, "atl-tail", ATLAS_GEO.tail);
  const swish = atlasGroup(tail, "atl-tail-swish", ATLAS_GEO.tail);
  atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: ATLAS_TAIL_PATH }, swish);
  if (edge) return tail;
  ATLAS_TAIL_BANDS.forEach(([band, [x, y, r]], i) => {
    const core = atlasGroup(swish, `atl-tail-core atl-tail-core-${i}`);
    core.style.setProperty("--atl-k", String(i));
    atlasMake("path", { class: "atl-band", d: band }, core);
    atlasMake("circle", { class: "atl-node-dot atl-band-node", cx: x, cy: y, r }, core);
  });
  const tip = atlasGroup(swish, "atl-tail-core atl-tail-core-2");
  tip.style.setProperty("--atl-k", "2");
  atlasMake("circle", { class: "atl-node-glow", cx: ATLAS_TAIL_TIP[0], cy: ATLAS_TAIL_TIP[1], r: 2.4 }, tip);
  atlasSpark(tip, ATLAS_TAIL_TIP[0], ATLAS_TAIL_TIP[1], 1.6, "atl-glint");
  return tail;
}

// --- the companion's props, in Atlas's own language ---------------------------
//: The companion shows a prop slot (`.nmp-*`, the character interface in
//: avatars.js) while something is going on around it. Atlas answers each
//: in its own materials, light and notes, rather than with a prop from a
//: shelf: glowing cups for music (and its tail's notes pulse to the beat,
//: in the CSS), a crescent moon hung on its crest's tip at night, half-moon
//: lenses of light for a long read, a bell of light for a reminder, one of
//: its own notes held up as a lantern, and, offline, a snapped link between
//: two notes. Drawn for the companion's figure only, hidden until asked.
function atlasHeadProps(sway, crest) {
  const phones = atlasGroup(sway, "nmp nmp-headphones");
  atlasMake("path", { class: "atl-prop-band", d: "M15.2 23C13.4 1.4 50.6 1.4 48.8 23" }, phones);
  for (const x of [15.4, 48.6]) {
    atlasMake("rect", { class: "atl-prop-cup", x: x - 3.4, y: 16.6, width: 6.8, height: 12.4, rx: 3.4 }, phones);
    atlasMake("circle", { class: "atl-prop-cup-glow", cx: x, cy: 22.8, r: 1.6 }, phones);
  }
  const note = atlasGroup(phones, "atl-prop-note", [55, 8]);
  atlasMake("path", { class: "atl-prop-note-ink", d: "M55.6 9.6V2.4L60 1.2V8.4" }, note);
  for (const [x, y] of [[54.2, 9.8], [58.6, 8.6]]) atlasMake("ellipse", { class: "atl-prop-note-head", cx: x, cy: y, rx: 1.6, ry: 1.2 }, note);
  const moon = atlasGroup(crest, "nmp nmp-nightcap");
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: 48.2, cy: -6.4, r: 6 }, moon);
  atlasMake("path", { class: "atl-prop-moon", d: "M47.4 -11.4A5 5 0 1 0 52.6 -3.6A4 4 0 1 1 47.4 -11.4Z" }, moon);
  atlasSpark(moon, 41.6, -7.6, 1.3, "atl-sparkle");
  const glasses = atlasGroup(sway, "nmp nmp-glasses");
  for (const [cx, cy] of ATLAS_GEO.eyes) {
    atlasMake("path", { class: "atl-prop-lens", d: `M${cx - 5.6} ${cy + 0.2}Q${cx} ${cy + 7} ${cx + 5.6} ${cy + 0.2}Z` }, glasses);
  }
  atlasMake("path", { class: "atl-prop-rim", d: `M${ATLAS_GEO.eyes[0][0] + 5.6} ${ATLAS_GEO.eyes[0][1] + 0.2}Q32 ${ATLAS_GEO.eyes[0][1] - 1.4} ${ATLAS_GEO.eyes[1][0] - 5.6} ${ATLAS_GEO.eyes[1][1] + 0.2}` }, glasses);
}

//: The hand slots. The companion raises the right arm (-125deg at the
//: shoulder) to hold a bell or a lantern up, so each is drawn turned the
//: other way about the hand and comes out upright once the arm is up.
function atlasHandProps(armR, armL) {
  const hand = [48.8, 62.6];
  const upright = atlasMake("g", { transform: `rotate(125 ${hand[0]} ${hand[1]})` }, armR);
  const bell = atlasGroup(upright, "nmp nmp-bell");
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: 48.8, cy: 68.8, r: 7 }, bell);
  atlasMake("path", { class: "atl-prop-bell", d: "M44.6 70.6C44.6 63.8 53 63.8 53 70.6L54.4 72.4H43.2Z" }, bell);
  atlasMake("circle", { class: "atl-prop-bell-dot", cx: 48.8, cy: 73.8, r: 1.2 }, bell);
  const lantern = atlasGroup(upright, "nmp nmp-lantern");
  atlasMake("path", { class: "atl-prop-string", d: "M48.8 63.6V66.2" }, lantern);
  atlasMake("circle", { class: "nmp-lantern-glow atl-prop-moon-glow", cx: 48.8, cy: 69.6, r: 8 }, lantern);
  atlasMake("circle", { class: "atl-node-dot", cx: 48.8, cy: 69.6, r: 3.4 }, lantern);
  atlasSpark(lantern, 48.8, 69.6, 1.8, "atl-sparkle");
  const cable = atlasGroup(armL, "nmp nmp-cable");
  atlasMake("path", { class: "atl-prop-link", d: "M14 68.6L15.6 72.2M17.6 75.2L19.4 79" }, cable);
  atlasMake("path", { class: "atl-prop-zap", d: "M15.2 74.6L14 75.6M18 72.4L19.4 72" }, cable);
  for (const [x, y, r] of [[13.2, 67.2, 2], [20, 80.4, 2]]) atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r }, cable);
}

//: The head: skin, gloss and rim light, blush, eyes, brows, mouths, the
//: crest, then the extras.
function atlasHead(parent, id, level) {
  const tiny = level === "tiny";
  const head = atlasGroup(parent, "atl-head", ATLAS_GEO.neck);
  const sway = atlasGroup(head, "atl-sway", ATLAS_GEO.neck);
  atlasCrest(sway, tiny, true);
  atlasMake("path", { class: "atl-edge", d: ATLAS_HEAD_PATH }, sway);
  const crest = atlasCrest(sway, tiny, false);
  atlasMake("path", { class: "atl-skin", d: ATLAS_HEAD_PATH }, sway);
  if (!tiny) {
    atlasMake("ellipse", { class: "atl-sheen", cx: 24.6, cy: 10.6, rx: 6, ry: 2.8, transform: "rotate(-28 24.6 10.6)" }, sway);
    atlasMake("circle", { class: "atl-sheen atl-sheen-dot", cx: 19.6, cy: 15.4, r: 1 }, sway);
    atlasMake("path", { class: "atl-rim", d: "M45.6 9.8C49 14 49.8 21 47.8 27C46.4 31.4 43.4 34.6 39.6 36.4" }, sway);
  }
  for (const [x, y] of ATLAS_GEO.cheeks) atlasMake("ellipse", { class: "atl-cheek", cx: x, cy: y, rx: tiny ? 3.8 : 3, ry: tiny ? 2.2 : 1.6 }, sway);
  for (const spec of ATLAS_GEO.eyes) atlasEye(sway, id, spec, tiny);
  if (!tiny) {
    for (const [x, y, side] of ATLAS_GEO.brows) {
      const brow = atlasGroup(sway, `atl-brow atl-brow-${side > 0 ? "l" : "r"}`, [x, y]);
      atlasMake("path", { class: "atl-stroke atl-brow-line", d: `M${x - 2.9 * side} ${y - 0.2}Q${x - 0.3 * side} ${y - 1.5} ${x + 2.9 * side} ${y + 0.8}` }, brow);
    }
  }
  const place = atlasMake("g", { transform: tiny ? "translate(32 30.2) scale(0.9) translate(-32 -38)" : "translate(32 30.4) scale(0.72) translate(-32 -38)" }, sway);
  const mouth = atlasGroup(place, "atl-mouth", [32, 38.4]);
  for (const [name, shape] of Object.entries(ATLAS_MOUTHS)) {
    const g = atlasGroup(mouth, `atl-m atl-m-${name}`);
    if (shape.ellipse) {
      const [cx, cy, rx, ry] = shape.ellipse;
      atlasMake("ellipse", { class: "atl-ink", cx, cy, rx: tiny ? rx + 0.5 : rx, ry: tiny ? ry + 0.5 : ry }, g);
    } else if (shape.fill) {
      atlasMake("path", { class: "atl-ink", d: shape.d }, g);
      if (!tiny) atlasMake("path", { class: "atl-tongue", d: shape.tongue }, g);
    } else {
      atlasMake("path", { class: "atl-stroke", d: shape.d, "stroke-width": tiny ? 3 : 2.2 }, g);
    }
  }
  if (!tiny) atlasExtras(sway);
  if (level === "figure") atlasHeadProps(sway, crest);
  return head;
}

//: The body, in the companion's part names so its behaviours can act it
//: out: legs from the hips, the raised arms it hangs and cheers with, the
//: torso with the hub's light in its chest, and the resting arms. Each part
//: is drawn in the edge layer and again in the fill layer (see the design
//: note), with the same classes, so the companion moves both copies. Limbs
//: taper from joints inside the torso; the arms angle out so there is air
//: between arm and waist and end in mittens with the thumb turned in, and
//: the legs end in small feet with a toe, a heel and a sole.
const ATLAS_LEGS = [
  ["l", "M26.6 66C26.4 72 26.8 78 27 84C24.8 84.8 22.9 86.4 23.1 88.3C23.2 89.5 24.1 90 25.3 90L29.8 90C30.9 90 31.3 89 31.1 87.8C30.9 86.7 30.7 85.8 30.7 84.6C30.7 78 30.9 72 31.2 66Z", "M24.2 89.2H30.3"],
  ["r", "M37.4 66C37.6 72 37.2 78 37 84C39.2 84.8 41.1 86.4 40.9 88.3C40.8 89.5 39.9 90 38.7 90L34.2 90C33.1 90 32.7 89 32.9 87.8C33.1 86.7 33.3 85.8 33.3 84.6C33.3 78 33.1 72 32.8 66Z", "M39.8 89.2H33.7"],
];
//: Mitten hands with the thumb turned in.
const ATLAS_ARMS = [
  ["l", "M20.2 42.4C17.6 47 15.2 53.2 13.5 58.4C12.1 61.2 12.4 64.6 15 65.2C16.8 65.6 18 64.6 18.5 63.4C19.5 63 20 61.6 19.3 60.9C18.8 60.4 18.2 60.6 17.8 60.4C19.8 55 22.2 49.4 24.8 45C25.4 43.4 24.6 41.6 23 41.2C21.8 41 20.8 41.4 20.2 42.4Z"],
  ["r", "M43.8 42.4C46.4 47 48.8 53.2 50.5 58.4C51.9 61.2 51.6 64.6 49 65.2C47.2 65.6 46 64.6 45.5 63.4C44.5 63 44 61.6 44.7 60.9C45.2 60.4 45.8 60.6 46.2 60.4C44.2 55 41.8 49.4 39.2 45C38.6 43.4 39.4 41.6 41 41.2C42.2 41 43.2 41.4 43.8 42.4Z"],
];
const ATLAS_HOLDS = [["l", "M23 44C10 40 3 18 6 -4", 6], ["r", "M41 44C54 40 61 18 58 -4", 58]];

function atlasBody(parent, props) {
  const layers = { edge: atlasGroup(parent, "atl-edges"), fill: atlasGroup(parent, "atl-fills") };
  const arms = {};
  for (const [kind, layer] of Object.entries(layers)) {
    const edge = kind === "edge";
    atlasTail(layer, edge);
    for (const [side, d, sole] of ATLAS_LEGS) {
      const leg = atlasGroup(layer, `nmb-leg nmb-leg-${side} atl-leg`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, leg);
      if (!edge) atlasMake("path", { class: "atl-sole", d: sole }, leg);
    }
    for (const [side, d, hx] of ATLAS_HOLDS) {
      const hold = atlasGroup(layer, `nmb-hold nmb-hold-${side}`);
      atlasMake("path", { class: edge ? "atl-edge atl-arm-up" : "atl-limb atl-arm-up", d }, hold);
      atlasMake("circle", { class: edge ? "atl-edge" : "atl-skin", cx: hx, cy: -7, r: 3 }, hold);
    }
    const torso = atlasGroup(layer, "nmb-torso");
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: ATLAS_TORSO_PATH }, torso);
    if (!edge) {
      //: The hub, the logo's centre, as light inside the body (the owner,
      //: of a star drawn on its chest: "looks fake"): a soft glow deep in
      //: the chest with three faint points linked by a thread, low
      //: contrast, like light inside a gem. It brightens and dims with the
      //: mood, and the points light in turn while Atlas thinks.
      const core = atlasGroup(torso, "atl-core", [32, 52]);
      atlasMake("ellipse", { class: "atl-core-glow", cx: 32, cy: 52, rx: 8.4, ry: 10.6 }, core);
      atlasMake("path", { class: "atl-inner-link", d: "M29.2 47.4L34.8 50.8L31.2 56.6" }, core);
      [[29.2, 47.4, 0.75], [34.8, 50.8, 0.95], [31.2, 56.6, 0.65]].forEach(([x, y, r], i) => {
        const point = atlasMake("circle", { class: "atl-inner-star", cx: x, cy: y, r }, core);
        point.style.setProperty("--atl-k", String(i));
      });
      //: The gloss on the gel: one specular on the upper left of the body.
      atlasMake("ellipse", { class: "atl-sheen", cx: 25.4, cy: 46.6, rx: 1.3, ry: 3.2, transform: "rotate(18 25.4 46.6)" }, torso);
    }
    for (const [side, d] of ATLAS_ARMS) {
      const arm = atlasGroup(layer, `nmb-arm nmb-arm-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, arm);
      if (!edge) arms[side] = arm;
    }
  }
  if (props) atlasHandProps(arms.r, arms.l);
}

//: The gradients, per drawing (ids are per drawing, so two on a page never
//: share one): the skin in the drawing's own space, so crest, head, arms and
//: body are one continuous surface; the aura; the chest light; and each
//: eye's clip.
function atlasDefs(svg, id, level) {
  const defs = atlasMake("defs", {}, svg);
  const skin = atlasMake("radialGradient", { id: `${id}-skin`, gradientUnits: "userSpaceOnUse", cx: 24, cy: 10, r: 84, fx: 23, fy: 8 }, defs);
  for (const [offset, cls] of [[0, "atl-st-hi"], [0.2, "atl-st-lt"], [0.52, "atl-st-md"], [1, "atl-st-dp"]]) {
    atlasMake("stop", { offset, class: cls }, skin);
  }
  const aura = atlasMake("radialGradient", { id: `${id}-aura` }, defs);
  for (const [offset, cls] of [[0, "atl-st-aura0"], [0.5, "atl-st-aura1"], [1, "atl-st-aura2"]]) atlasMake("stop", { offset, class: cls }, aura);
  const core = atlasMake("radialGradient", { id: `${id}-core` }, defs);
  for (const [offset, cls] of [[0, "atl-st-core0"], [1, "atl-st-core1"]]) atlasMake("stop", { offset, class: cls }, core);
  if (level !== "tiny") {
    for (const [cx, cy, side] of ATLAS_GEO.eyes) {
      const clip = atlasMake("clipPath", { id: `${id}-e${side > 0 ? "l" : "r"}` }, defs);
      atlasMake("path", { d: atlasAlmond(cx, cy, side).d }, clip);
    }
  }
  //: The paints name their gradients through custom properties, so the CSS
  //: can say "skin" without knowing this drawing's id.
  svg.style.setProperty("--atl-skin", `url(#${id}-skin)`);
  svg.style.setProperty("--atl-aura", `url(#${id}-aura)`);
  svg.style.setProperty("--atl-core", `url(#${id}-core)`);
}

//: What each level shows, and the box it is drawn in. `full` keeps margins
//: for the glow, the crest and a raised hand; `head` is square round the
//: head and its crest; `tiny` crops tighter because at 16px every unit
//: counts.
const ATLAS_LEVELS = {
  full: { viewBox: [-8, -14, 80, 106], body: true },
  figure: { viewBox: [0, 0, 64, 92], body: true },
  head: { viewBox: [5, -11, 56, 56], body: false },
  tiny: { viewBox: [11, -9, 48, 48], body: false },
};

function atlasLevelFor(size) {
  if (size < 28) return "tiny";
  if (size < 96) return "head";
  return "full";
}

//: Draws Atlas at a level in a mood. `size` is the drawn height in px.
function atlasDraw(size = 20, mood = atlasMoodNow, level = atlasLevelFor(size)) {
  if (level !== "figure" && atlasStyle() === "classic") return atlasClassicMark(size, mood);
  const spec = ATLAS_LEVELS[level] || ATLAS_LEVELS.head;
  const [x, y, w, h] = spec.viewBox;
  atlasSerial += 1;
  const id = `atl-${atlasSerial.toString(36)}`;
  const width = Math.round((size * w) / h);
  const figure = level === "figure";
  const svg = atlasMake("svg", {
    viewBox: `${x} ${y} ${w} ${h}`,
    width: figure ? 64 : width,
    height: figure ? 92 : size,
    class: `${figure ? "" : "name-mark "}nm-atlas atl atl-${level}`,
    "aria-hidden": "true",
    focusable: "false",
  });
  svg.dataset.nmSeed = "Atlas";
  svg.style.setProperty("--nm-delay", "-1.3s");
  atlasMake("title", {}, svg);
  atlasDefs(svg, id, level);
  const anchor = spec.body ? ATLAS_GEO.feet : ATLAS_GEO.chin;
  const pose = atlasGroup(svg, "atl-pose", anchor);
  if (level !== "tiny") {
    const aura = spec.body ? { cx: 32, cy: 42, rx: 38, ry: 50 } : { cx: 32, cy: 18, rx: 30, ry: 30 };
    atlasMake("ellipse", { class: "atl-aura", ...aura }, pose);
  }
  const moodLoop = atlasGroup(pose, "atl-mood", anchor);
  const rig = atlasGroup(moodLoop, "atl-rig", anchor);
  if (spec.body) {
    atlasBody(rig, figure);
  }
  //: The companion turns the head at the neck (`.nm-buddy-head`) and looks
  //: for its face (`.name-mark`, with `.nm-eyes` and `.nm-blinks` in it).
  let host = rig;
  if (figure) {
    host = atlasGroup(rig, "nm-buddy-head", ATLAS_GEO.neck);
    host = atlasGroup(host, "name-mark atl-face");
  }
  atlasHead(host, id, level);
  atlasApply(svg, mood);
  if (!figure) watchNameMark(svg);
  return svg;
}

//: The companion's figure: the same drawing in its 64 by 92 box.
function atlasFigure() {
  if (atlasStyle() === "classic") return atlasClassicFigure();
  const figure = document.createElement("span");
  figure.className = "nm-figure nm-live atl-figure-box";
  figure.appendChild(atlasDraw(92, atlasMoodNow, "figure"));
  return figure;
}

//: A mood is one attribute: the CSS turns it into brows, lids, eyes,
//: mouth, blush, tilt, squash and halo, and eases between them.
function atlasApply(svg, mood) {
  const next = ATLAS_MOODS[mood] ? mood : "calm";
  svg.dataset.atlasMood = next;
  const name = typeof aiNameNow === "function" ? aiNameNow() : "Atlas";
  const words = ATLAS_MOODS[next].words;
  const title = svg.querySelector(":scope > title");
  if (title) title.textContent = words ? `${name}, ${words}` : `${name}, the keeper of this notebook`;
}

// --- the classic globe ----------------------------------------------------------
//: **Atlas style: Classic globe** (the owner, of the first face: "i actually
//: dont mind atlas with the circle avatar and blurred out edges so maybe
//: that can be a toggle??"). Settings, Appearance, Atlas style chooses the
//: character (the default) or this: the globe in the accent colour glowing
//: in a night sky, the logo's ring of linked notes orbiting under its chin,
//: with its own five moods. The drawing below is the one Atlas had before
//: atlas.js, kept as it was; only its name changed, and its moods come from
//: Atlas's fifteen through the table.
const ATLAS_CLASSIC_MOODS = {
  calm: "calm", happy: "happy", delighted: "happy", laughing: "happy", proud: "happy", love: "happy", shy: "happy",
  thinking: "thinking", determined: "thinking", curious: "thinking", confused: "thinking",
  surprised: "surprised", worried: "surprised", sad: "sleepy", sleepy: "sleepy",
};

function atlasStyle() {
  return typeof appearancePref === "function" && appearancePref("atlas-style", "character") === "classic" ? "classic" : "character";
}

function atlasClassicMark(size = 20, mood = atlasMoodNow) {
  const svgNs = "http://www.w3.org/2000/svg";
  const make = (tag, attrs) => {
    const el = document.createElementNS(svgNs, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const accent = (typeof currentAccentHex === "function" && currentAccentHex()) || "#6d5dfc";
  const mix = (hex, other, t) => {
    const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const b = [1, 3, 5].map((i) => parseInt(other.slice(i, i + 2), 16));
    return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
  };
  const light = mix(accent, "#ffffff", 0.5);
  const deep = mix(accent, "#000000", 0.35);
  mood = ATLAS_CLASSIC_MOODS[mood] || "calm";
  nameMarkSerial += 1;
  const id = `nm-atlas-${nameMarkSerial.toString(36)}`;
  const moodClass = { calm: "nm-calm", thinking: "nm-confused", happy: "nm-happy", surprised: "nm-surprised", sleepy: "nm-sleepy" }[mood] || "nm-calm";
  const svg = make("svg", { viewBox: "0 0 36 36", width: size, height: size, class: `name-mark nm-atlas atl-classic ${moodClass}`, "aria-hidden": "true" });
  svg.dataset.nmSeed = "Atlas";
  svg.dataset.atlasMood = mood;
  svg.style.setProperty("--nm-delay", "-1.3s");
  const title = make("title", {});
  title.textContent = { thinking: "Atlas, thinking", happy: "Atlas, pleased", surprised: "Atlas, surprised", sleepy: "Atlas, dozing" }[mood] || "Atlas, the librarian of this notebook";
  svg.appendChild(title);
  const defs = make("defs", {});
  const clip = make("clipPath", { id: `${id}-c` });
  clip.appendChild(make("circle", { cx: 18, cy: 18, r: 18 }));
  const globe = make("radialGradient", { id: `${id}-g`, cx: "36%", cy: "30%", r: "75%" });
  for (const [offset, colour] of [[0, light], [0.55, accent], [1, deep]]) globe.appendChild(make("stop", { offset, "stop-color": colour }));
  const sky = make("radialGradient", { id: `${id}-s`, cx: "50%", cy: "45%", r: "70%" });
  for (const [offset, colour] of [[0, mix(accent, "#12142a", 0.72)], [1, "#0d0f22"]]) sky.appendChild(make("stop", { offset, "stop-color": colour }));
  //: The aura: the accent, glowing out from the globe and fading into the sky.
  const aura = make("radialGradient", { id: `${id}-a`, cx: "50%", cy: "50%", r: "50%" });
  for (const [offset, colour, opacity] of [[0.55, light, 0.75], [0.78, accent, 0.28], [1, accent, 0]]) {
    aura.appendChild(make("stop", { offset, "stop-color": colour, "stop-opacity": opacity }));
  }
  defs.append(clip, globe, sky, aura);
  const g = make("g", { "clip-path": `url(#${id}-c)` });
  g.appendChild(make("rect", { width: 36, height: 36, fill: `url(#${id}-s)` }));
  const stars = make("g", { class: "nm-starfield", fill: "#ffffff" });
  for (const [x, y, r] of [[5, 7, 0.5], [30, 6, 0.4], [8, 30, 0.35], [31, 29, 0.5], [26, 3.6, 0.3], [3.4, 17, 0.3], [33, 16, 0.35]]) {
    stars.appendChild(make("circle", { cx: x, cy: y, r, opacity: 0.8 }));
  }
  g.appendChild(stars);
  g.appendChild(make("circle", { cx: 18, cy: 18.6, r: 17, fill: `url(#${id}-a)`, class: "nm-aura" }));
  const body = make("g", { class: "nm-body" });
  const tilt = "translate(0 6.4) rotate(-14 18 19)";
  const nodes = [[3.4, 19], [8.4, 14.6], [27.6, 14.6], [32.6, 19], [27.6, 23.4], [8.4, 23.4]];
  const back = make("g", { transform: tilt });
  back.appendChild(make("path", { d: "M3.4 19A14.6 4.4 0 0 1 32.6 19", fill: "none", stroke: light, "stroke-width": 0.7, "stroke-opacity": 0.55 }));
  back.appendChild(make("path", { d: "M8.4 14.6L27.6 14.6M3.4 19L8.4 14.6M27.6 14.6L32.6 19", fill: "none", stroke: light, "stroke-width": 0.45, "stroke-opacity": 0.5 }));
  for (const [x, y] of nodes.slice(0, 4)) back.appendChild(make("circle", { cx: x, cy: y, r: 1.2, fill: light, class: "nm-spark" }));
  body.appendChild(back);
  body.appendChild(make("circle", { cx: 18, cy: 18.6, r: 11.2, fill: `url(#${id}-g)` }));
  body.appendChild(make("path", { d: "M18 7.4a5.2 11.2 0 0 1 0 22.4a5.2 11.2 0 0 1 0-22.4M7 15h22M7 22.2h22", fill: "none", stroke: "#ffffff", "stroke-width": 0.3, "stroke-opacity": 0.16 }));
  const ink = "#1c1c1a";
  const face = make("g", {});
  const stroke = (d, width, colour = ink) => make("path", { d, fill: "none", stroke: colour, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const eyes = make("g", { class: `nm-eyes${mood === "calm" || mood === "thinking" || mood === "surprised" ? " nm-blinks" : ""}`, fill: ink });
  for (const x of [14.2, 21.8]) {
    if (mood === "happy") {
      eyes.appendChild(stroke(`M${x - 1.8} 19.2q1.8-2.8 3.6 0`, 1.4));
    } else if (mood === "sleepy") {
      eyes.appendChild(stroke(`M${x - 1.8} 18.4q1.8 1.8 3.6 0`, 1.3));
    } else if (mood === "surprised") {
      eyes.appendChild(make("circle", { cx: x, cy: 18.2, r: 2.2, fill: "#ffffff", stroke: ink, "stroke-width": 0.6 }));
      eyes.appendChild(make("circle", { cx: x, cy: 18.4, r: 0.95 }));
    } else {
      //: Big glossy eyes with two catchlights: the cute. Thinking looks up.
      const up = mood === "thinking" ? -0.7 : 0;
      eyes.appendChild(make("ellipse", { cx: x, cy: 18.4, rx: 1.95, ry: 2.45 }));
      eyes.appendChild(make("ellipse", { cx: x + 0.6 + up * 0.2, cy: 17.4 + up, rx: 0.8, ry: 0.9, fill: "#ffffff" }));
      eyes.appendChild(make("circle", { cx: x - 0.6, cy: 19.5 + up, r: 0.38, fill: "#ffffff" }));
    }
  }
  face.appendChild(eyes);
  if (mood === "happy") {
    face.appendChild(make("path", { d: "M15.4 22.6h5.2a2.6 2.4 0 0 1-5.2 0z", fill: ink }));
    face.appendChild(make("path", { d: "M16.6 24.1q1.4-.9 2.8 0q-1.4.8-2.8 0z", fill: "#ff7aa0" }));
  } else if (mood === "surprised" || mood === "sleepy") {
    face.appendChild(make("ellipse", { cx: 18, cy: 23.4, rx: mood === "sleepy" ? 0.9 : 1.2, ry: mood === "sleepy" ? 1.1 : 1.5, fill: ink }));
  } else if (mood === "thinking") {
    face.appendChild(stroke("M16.4 23.2q1.2-.6 2.4 0t2 0", 1.1));
  } else {
    face.appendChild(stroke("M15.8 22.6q1.1 1.3 2.2 0q1.1 1.3 2.2 0", 1.1));
  }
  for (const x of [11.4, 24.6]) face.appendChild(make("ellipse", { cx: x, cy: 21.6, rx: 1.9, ry: 1.1, fill: "#ff7aa0", opacity: 0.55 }));
  body.appendChild(face);
  const front = make("g", { transform: tilt });
  front.appendChild(make("path", { d: "M3.4 19A14.6 4.4 0 0 0 32.6 19", fill: "none", stroke: light, "stroke-width": 0.8 }));
  front.appendChild(make("path", { d: "M3.4 19L8.4 23.4L27.6 23.4L32.6 19M8.4 23.4L18 23.4", fill: "none", stroke: light, "stroke-width": 0.5, "stroke-opacity": 0.75 }));
  for (const [i, [x, y]] of [...nodes.slice(4), [18, 23.4], [3.4, 19], [32.6, 19]].entries()) {
    front.appendChild(make("circle", { cx: x, cy: y, r: 1.35, fill: i % 2 ? light : "#ffffff", stroke: deep, "stroke-width": 0.35, class: `nm-spark${i % 2 ? " nm-spark-late" : ""}` }));
  }
  body.appendChild(front);
  //: Sparkles drifting in the aura, and the north star over the head.
  const spark = (x, y, s, fill, late) =>
    make("path", { d: `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}z`, fill, class: `nm-spark${late ? " nm-spark-late" : ""}` });
  body.appendChild(spark(18, 4.8, 2.4, "#ffd84a"));
  body.appendChild(spark(6.6, 11, 1.1, "#ffffff", true));
  body.appendChild(spark(29.8, 10, 1.3, "#ffffff"));
  body.appendChild(spark(28.4, 28.6, 0.9, light, true));
  if (mood === "thinking") {
    //: A thought bubble: three rising dots.
    for (const [x, y, r] of [[26.4, 11.6, 0.7], [28.4, 9.2, 1], [30.8, 6.4, 1.4]]) body.appendChild(make("circle", { cx: x, cy: y, r, fill: "#ffffff", opacity: 0.9, class: "nm-z" }));
  }
  if (mood === "sleepy") {
    body.appendChild(stroke("M25.4 9.6h2.2l-2.2 2.4h2.2", 0.8, "#ffffff")).classList.add("nm-z");
    body.appendChild(stroke("M28.6 5.8h1.6l-1.6 1.8h1.6", 0.7, "#ffffff")).classList.add("nm-z", "nm-z-late");
  }
  g.appendChild(body);
  svg.append(defs, g);
  watchNameMark(svg);
  return svg;
}


//: The classic globe as the companion: no limbs, it floats, and the props
//: that suit a head (headphones, reading glasses, a nightcap) sit on the
//: globe; asleep, its eyes close like any face's.
function atlasClassicFigure() {
  const figure = document.createElement("span");
  figure.className = "nm-figure nm-live atl-classic-box";
  const head = document.createElement("span");
  head.className = "nm-buddy-head";
  head.appendChild(atlasClassicMark(NMB_HEAD));
  const props = atlasMake("svg", { class: "atl-classic-props", viewBox: "0 0 36 36", width: NMB_HEAD, height: NMB_HEAD, "aria-hidden": "true", focusable: "false" });
  const phones = atlasGroup(props, "nmp nmp-headphones");
  atlasMake("path", { class: "atl-cl-band", d: "M7.2 20C6.4 4.4 29.6 4.4 28.8 20" }, phones);
  for (const x of [7.2, 28.8]) atlasMake("rect", { class: "atl-cl-cup", x: x - 2, y: 15.6, width: 4, height: 8, rx: 2 }, phones);
  const glasses = atlasGroup(props, "nmp nmp-glasses");
  for (const x of [14.2, 21.8]) atlasMake("circle", { class: "atl-cl-lens", cx: x, cy: 18.6, r: 3.1 }, glasses);
  atlasMake("path", { class: "atl-cl-rim", d: "M17.3 18.2Q18 17.2 18.7 18.2" }, glasses);
  const cap = atlasGroup(props, "nmp nmp-nightcap");
  atlasMake("path", { class: "atl-cl-cap", d: "M7.6 14C9 5 20 2.4 27 5.6C31 7.4 33.6 10 35 14.6L31.6 13.6C27 9.8 20 8.6 14 10.6C11.6 11.4 9.4 12.6 7.6 14Z" }, cap);
  atlasMake("path", { class: "atl-cl-brim", d: "M7.4 14.4C13 10.6 23 9.6 29.4 12.2" }, cap);
  atlasMake("circle", { class: "atl-cl-pom", cx: 35, cy: 15, r: 2 }, cap);
  head.appendChild(props);
  figure.appendChild(head);
  return figure;
}

//: A change of style redraws every Atlas on the page: the marks in place,
//: the companion through its own sync, the dashboard's mark and the
//: welcome's card if it is open.
function atlasRepaint() {
  for (const svg of document.querySelectorAll("svg.nm-atlas")) {
    if (svg.closest("#nm-buddy") || !svg.isConnected) continue;
    svg.replaceWith(atlasDraw(Number(svg.getAttribute("height")) || 20));
  }
  const buddy = document.getElementById("nm-buddy");
  if (buddy && typeof syncNameMarkBuddy === "function") {
    delete buddy.dataset.seed;
    syncNameMarkBuddy();
  }
  if (typeof paintDashEmblem === "function") paintDashEmblem();
}

// --- moods that follow the app ------------------------------------------------
//: Calm at rest; thinking while a chat turn runs, and determined if it runs
//: long; happy with a nod when it lands; surprised, then worried, when it
//: fails; proud when a note is saved; worried at an error; delighted with a
//: spin at a streak; sleepy after ten idle minutes or in the small hours;
//: a hello and a wave the first time the notebook is opened in a session;
//: and a poke gets a giggle, a blush or a heart. Every Atlas on the page
//: changes together, in place, so the change is an eased transition rather
//: than a redraw.
let atlasMoodNow = "calm";
let atlasMoodTimer = 0;
let atlasLastInput = Date.now();

function atlasRestingMood() {
  const hour = new Date().getHours();
  return Date.now() - atlasLastInput > 10 * 60 * 1000 || hour < 5 ? "sleepy" : "calm";
}

function setAtlasMood(mood, forMs = 0, { quiet = false } = {}) {
  const next = ATLAS_MOODS[mood] ? mood : "calm";
  clearTimeout(atlasMoodTimer);
  atlasMoodTimer = 0;
  atlasMoodNow = next;
  if (!quiet && typeof nameMarkBuddyCue === "function") nameMarkBuddyCue(ATLAS_MOODS[next].cue);
  for (const svg of document.querySelectorAll(".nm-atlas")) {
    //: The classic globe draws a mood rather than easing into one.
    if (svg.classList.contains("atl-classic")) svg.replaceWith(atlasClassicMark(Number(svg.getAttribute("width")) || 20, next));
    else atlasApply(svg, next);
  }
  if (next === "surprised" && forMs > 2000) {
    //: A failure startles first, then worries until it has passed.
    atlasMoodTimer = setTimeout(() => setAtlasMood("worried", forMs - 900, { quiet: true }), 900);
  } else if (next === "thinking") {
    //: A turn that runs long gets a set jaw.
    atlasMoodTimer = setTimeout(() => setAtlasMood("determined", 0, { quiet: true }), 9000);
  } else if (forMs) {
    atlasMoodTimer = setTimeout(() => setAtlasMood(atlasRestingMood()), forMs);
  }
  if (next === "happy" && forMs) atlasPlay("nod", 1000);
}

//: A one-off move on every Atlas on the page (a nod, a spin, a hop, a
//: wave): a class that comes off when it has played. All removed, one
//: read, all added, so a restart costs one style pass, not one per mark.
function atlasPlay(name, ms = 900) {
  const marks = [...document.querySelectorAll(".nm-atlas")];
  const cls = `atl-play-${name}`;
  for (const svg of marks) svg.classList.remove(cls);
  if (!marks.length) return;
  void marks[0].getBoundingClientRect();
  for (const svg of marks) svg.classList.add(cls);
  setTimeout(() => {
    for (const svg of marks) svg.classList.remove(cls);
  }, ms);
}

//: App events by name, for the callers that are not a chat turn.
function atlasOn(event) {
  if (event === "saved") {
    setAtlasMood("proud", 2600, { quiet: true });
    atlasPlay("hop", 800);
  } else if (event === "error") {
    setAtlasMood("worried", 4000, { quiet: true });
  } else if (event === "greet") {
    setAtlasMood("happy", 3600, { quiet: true });
    atlasPlay("wave", 1600);
    if (typeof nameMarkBuddyAct === "function" && document.getElementById("nm-buddy")) nameMarkBuddyAct("wave");
  } else if (event === "streak") {
    setAtlasMood("delighted", 3600);
    atlasPlay("spin", 900);
  }
}

//: A streak is celebrated once a day, from the dashboard's own count.
function atlasStreak(days) {
  if (!(days >= 3)) return;
  const today = new Date().toDateString();
  try {
    if (localStorage.getItem("atlas-streak-seen") === today) return;
    localStorage.setItem("atlas-streak-seen", today);
  } catch (e) {
    // Celebrated this once without remembering it.
  }
  atlasOn("streak");
}

for (const type of ["pointerdown", "keydown"]) {
  document.addEventListener(type, () => {
    atlasLastInput = Date.now();
    if (atlasMoodNow === "sleepy") {
      setAtlasMood("surprised", 700, { quiet: true });
    }
  }, { passive: true, capture: true });
}
setInterval(() => {
  if (atlasMoodNow === "calm" && atlasRestingMood() === "sleepy") setAtlasMood("sleepy");
}, 60 * 1000);

//: A poke: a giggle, a blush, a heart or a delighted wiggle, for a moment.
const ATLAS_POKES = ["laughing", "shy", "love", "delighted", "curious"];
let atlasPokeIndex = 0;
document.addEventListener("click", (event) => {
  const mark = event.target.closest?.(".nm-atlas");
  if (!mark || ["thinking", "determined"].includes(atlasMoodNow)) return;
  atlasPokeIndex = (atlasPokeIndex + 1) % ATLAS_POKES.length;
  setAtlasMood(ATLAS_POKES[atlasPokeIndex], 1800, { quiet: true });
});

//: Errors (an error toast) worry it; the first unlock of a session greets.
if (typeof MutationObserver === "function") {
  const toasts = document.getElementById("toast-box");
  if (toasts) {
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.classList?.contains("error")) atlasOn("error");
        }
      }
    }).observe(toasts, { childList: true });
  }
  const lock = document.getElementById("lock-overlay");
  if (lock) {
    let greeted = false;
    const watch = new MutationObserver(() => {
      if (greeted || !lock.classList.contains("hidden")) return;
      greeted = true;
      watch.disconnect();
      setTimeout(() => atlasOn("greet"), 900);
    });
    watch.observe(lock, { attributes: true, attributeFilter: ["class"] });
  }
}

//: A sentence in the chat's box: Atlas leans in to listen.
document.addEventListener("focusin", (event) => {
  if (event.target?.id === "chat-input" && atlasMoodNow === "calm") setAtlasMood("curious", 2400, { quiet: true });
});

// --- the character interface ---------------------------------------------------
if (typeof registerCharacter === "function") {
  registerCharacter({
    name: "atlas",
    matches: (seed) => (typeof isAtlasSeed === "function" ? isAtlasSeed(seed) : String(seed || "").trim().toLowerCase() === "atlas"),
    make: (seed) => ({
      kind: "atlas",
      seed,
      mark: (size) => atlasDraw(size),
      figure: () => atlasFigure(),
      poses: ["stand", "sit", "hang", "float", "lean"],
      moods: Object.keys(ATLAS_MOODS),
    }),
  });
}
