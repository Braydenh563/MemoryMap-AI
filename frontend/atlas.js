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
//: - **Who.** A small star spirit that keeps your map: warm, curious, a
//:   little proud of you. Not a robot, not a librarian: no glasses, no
//:   screens, no antenna with a bulb. Its reference points are the
//:   companions people keep (Finch's bird, Headspace's blobs, Duolingo's
//:   owl): one simple shape, very readable eyes, and emotion carried by the
//:   whole body, not only the face.
//: - **Silhouette.** One continuous gumdrop: a big round head that flows
//:   into a small bell of a body, with a single flame-like wisp on the
//:   crown leaning right. Head and body share one gradient in the drawing's
//:   own space (the favicon's trick), so there is no seam where a head was
//:   stuck on. Chibi proportions: the head is about half the height, the
//:   eyes sit just under its middle (mass low in the face reads as young),
//:   stubby arms and legs that exist mostly to sit, hang and wave.
//: - **The signature is the logo, worn.** The logo is a bright hub with five
//:   linked notes around it. Atlas's head is the hub, and the five notes
//:   orbit its crown as a tilted halo, linked by faint chords: a
//:   constellation, drawn in perspective (the nodes swell as they pass in
//:   front and fade behind). The hub's bright point also glows softly in its
//:   chest. At 16 to 24px the halo is three static beads on the front arc,
//:   which is still the logo's read.
//: - **Aura.** One radial gradient glow behind it (no filters), a rim light
//:   on its right edge, a gloss on the crown, and three motes of light
//:   drifting up through the glow. The glow is stronger in dark mode, where
//:   it has something to glow against.
//: - **Palette.** Everything comes from the live `--accent` through CSS, so
//:   it follows the look and the theme without a redraw. The body's
//:   lightness is fixed and only the hue and some chroma come from the
//:   accent (`oklch(from var(--accent) ...)`), so a dark accent (Graphite)
//:   or a pale one (Lagoon's dark set) still draws the same readable
//:   character; a browser without relative colours gets a `color-mix`
//:   version. Eyes are near-black ink tinted with the accent, blush is one
//:   fixed pink.
//: - **Face.** Big eyes with whites, an iris with a coloured lower glow and
//:   two catchlights; upper and lower lids that slide and tilt; brows that
//:   rise, knit and slant; eleven mouths; cheeks that blush. Fifteen moods,
//:   each a combination of all of these plus head tilt, body squash, halo
//:   lift and brightness and one small extra (sparkles, hearts, a thought, a
//:   tear). The combinations are CSS (`[data-atlas-mood]` in
//:   08-consistency.css); this file draws the parts and says which mood.
//: - **Life.** Breathing squash and stretch from the feet, blinks with an
//:   occasional double blink, the halo orbiting, a slow head sway, the glow
//:   pulsing and the motes drifting. Expressions ease between each other in
//:   `--motion-slow`. All of it is CSS transform and opacity on this one SVG,
//:   runs only while the mark is on screen and motion is on, slows under
//:   Reduce motion and stops under Avatar animation Off.
//: - **Sizes.** `full` (a figure with margins, 96px and up: the welcome, the
//:   large view), `figure` (the companion's 64 by 92 box, parts named for
//:   the companion's behaviours), `head` (the head and its halo, 28 to 95px:
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
//: at the companion's size). Everything else is drawn relative to these.
const ATLAS_GEO = {
  eyes: [[22.4, 28.2, 1], [41.6, 28.2, -1]],
  eyeRx: 5.3,
  eyeRy: 6.3,
  brows: [[21.8, 18.6, 1], [42.2, 18.6, -1]],
  cheeks: [[15.2, 34.8], [48.8, 34.8]],
  halo: { cx: 32, cy: 5.6, r: 23.5, flat: 0.3, tilt: -8 },
  neck: [32, 44],
  feet: [32, 90],
  chin: [32, 46],
};

const ATLAS_HEAD_PATH = "M32 3C45.8 3 55.2 12.2 55.2 24.6C55.2 37.2 45.2 46 32 46C18.8 46 8.8 37.2 8.8 24.6C8.8 12.2 18.2 3 32 3Z";
const ATLAS_WISP_PATH = "M27.8 4.8C26 -1.2 30.8 -5.6 37.8 -4.6C34.2 -2.8 33.4 0.4 35.4 4Z";
const ATLAS_TORSO_PATH = "M21 40.5C19 49 14.5 58 15 66.5C15.5 73.5 23.5 75.5 32 75.5C40.5 75.5 48.5 73.5 49 66.5C49.5 58 45 49 43 40.5Z";

//: Eleven mouths, all centred under the eyes at x 32. `fill` shapes are
//: open mouths (with a tongue where it shows); the rest are one stroke.
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

//: One eye: the white, then (clipped to it) the iris that looks about, the
//: lids that slide over it, and outside the clip the three closed shapes a
//: mood can swap the open eye for.
function atlasEye(parent, id, [cx, cy, side], tiny) {
  const eye = atlasGroup(parent, `atl-eye atl-eye-${side > 0 ? "l" : "r"}`, [cx, cy]);
  const open = atlasGroup(eye, "atl-eye-open");
  const blink = atlasGroup(open, "nm-blinks atl-blink", [cx, cy]);
  const { eyeRx: rx, eyeRy: ry } = ATLAS_GEO;
  if (!tiny) atlasMake("ellipse", { class: "atl-sclera", cx, cy, rx, ry }, blink);
  const clipId = `${id}-e${side > 0 ? "l" : "r"}`;
  const inner = atlasMake("g", tiny ? {} : { "clip-path": `url(#${clipId})` }, blink);
  const look = atlasGroup(inner, "nm-eyes");
  const pupil = atlasGroup(look, "atl-pupil", [cx, cy]);
  const iris = atlasGroup(pupil, "atl-iris");
  atlasMake("ellipse", { class: "atl-ink", cx, cy: cy + 0.5, rx: tiny ? 4.6 : 4.3, ry: tiny ? 5.6 : 5.1 }, iris);
  if (!tiny) atlasMake("ellipse", { class: "atl-iris-glow", cx, cy: cy + 2.9, rx: 3, ry: 1.8 }, iris);
  atlasMake("ellipse", { class: "atl-catch", cx: cx + 1.5, cy: cy - 1.8, rx: tiny ? 1.9 : 1.75, ry: tiny ? 2.1 : 2 }, iris);
  if (!tiny) atlasMake("circle", { class: "atl-catch", cx: cx - 1.7, cy: cy + 2.5, r: 0.85 }, iris);
  if (!tiny) {
    const heart = atlasGroup(pupil, "atl-heart-eye");
    atlasHeart(heart, cx, cy + 0.2, 4.6, "atl-heart");
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.9, cy: cy - 2, r: 1 }, heart);
    //: The upper lid is the head's own skin sliding down over the white,
    //: with a lash line on its edge; the lower lid rises for a squint.
    const lid = atlasGroup(inner, "atl-lid", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 7} ${cy - 20}H${cx + 7}V${cy - ry}Q${cx} ${cy - ry + 1.4} ${cx - 7} ${cy - ry}Z` }, lid);
    atlasMake("path", { class: "atl-lash", d: `M${cx - 7} ${cy - ry}Q${cx} ${cy - ry + 1.4} ${cx + 7} ${cy - ry}` }, lid);
    const low = atlasGroup(inner, "atl-lid-low", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 7} ${cy + 20}H${cx + 7}V${cy + ry}Q${cx} ${cy + ry - 1.6} ${cx - 7} ${cy + ry}Z` }, low);
    atlasMake("ellipse", { class: "atl-eye-edge", cx, cy, rx, ry }, blink);
  }
  const w = tiny ? 2.9 : 2.3;
  atlasMake("path", { class: "atl-e-happy atl-stroke", "stroke-width": w, d: `M${cx - 4.4} ${cy + 1.8}Q${cx} ${cy - 5.2} ${cx + 4.4} ${cy + 1.8}` }, eye);
  atlasMake("path", { class: "atl-e-shut atl-stroke", "stroke-width": w, d: `M${cx - 4.4} ${cy + 0.4}Q${cx} ${cy + 4.6} ${cx + 4.4} ${cy + 0.4}` }, eye);
  atlasMake("path", {
    class: "atl-e-squeeze atl-stroke",
    "stroke-width": w,
    d: `M${cx - 3.4 * side} ${cy - 3.6}L${cx + 3 * side} ${cy}L${cx - 3.4 * side} ${cy + 3.6}`,
  }, eye);
  return eye;
}

//: The halo: the logo's five notes on a tilted ring round the crown. The
//: ring's frame is flattened to 0.3 of its height; the orbit group turns
//: inside it, and each note turns back and un-flattens itself so it stays a
//: round bead, with its own phase (a negative delay) so it knows when it is
//: in front and swells, or behind and fades (`atl-node` in the CSS).
function atlasHalo(parent, level) {
  const { cx, cy, r, flat, tilt } = ATLAS_GEO.halo;
  const halo = atlasGroup(parent, "atl-halo", [cx, cy]);
  const frame = atlasMake("g", { transform: `translate(${cx} ${cy}) rotate(${tilt}) scale(1 ${flat})` }, halo);
  atlasMake("circle", { class: "atl-ring", r, "stroke-width": level === "tiny" ? 3.4 : 1.4 }, frame);
  if (level === "tiny") {
    //: Three static beads on the front arc: the logo's read at 16px.
    for (const angle of [40, 90, 140]) {
      const a = (angle * Math.PI) / 180;
      atlasMake("ellipse", { class: "atl-node-dot", cx: r * Math.cos(a), cy: r * Math.sin(a), rx: 3.4, ry: 3.4 / flat }, frame);
    }
    return halo;
  }
  const orbit = atlasGroup(frame, "atl-orbit", [0, 0]);
  const points = [0, 1, 2, 3, 4].map((k) => [r * Math.cos((k * 2 * Math.PI) / 5), r * Math.sin((k * 2 * Math.PI) / 5)]);
  atlasMake("path", { class: "atl-links", d: `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z` }, orbit);
  for (let k = 0; k < 5; k += 1) {
    const slot = atlasMake("g", { transform: `rotate(${k * 72})` }, orbit);
    const node = atlasGroup(slot, `atl-node atl-node-${k}`, [r, 0]);
    node.style.setProperty("--atl-k", String(k));
    atlasMake("circle", { class: "atl-node-glow", cx: r, cy: 0, r: 4.4 }, node);
    atlasMake("circle", { class: "atl-node-dot", cx: r, cy: 0, r: 2.7 }, node);
  }
  return halo;
}

//: The small extras a mood can bring, each hidden until its mood asks.
function atlasExtras(parent) {
  const fx = atlasGroup(parent, "atl-fx");
  const sparkle = atlasGroup(fx, "atl-fx-sparkle");
  atlasSpark(sparkle, 6.4, 12, 2.8, "atl-sparkle");
  atlasSpark(sparkle, 58, 17, 2.2, "atl-sparkle atl-late");
  atlasSpark(sparkle, 52.5, 2, 1.5, "atl-sparkle atl-later");
  const hearts = atlasGroup(fx, "atl-fx-hearts");
  atlasHeart(atlasGroup(hearts, "atl-float", [55, 12]), 55, 12, 3, "atl-heart");
  atlasHeart(atlasGroup(hearts, "atl-float atl-late", [8.5, 8]), 8.5, 8, 2.2, "atl-heart");
  const zz = atlasGroup(fx, "atl-fx-zz");
  atlasMake("path", { class: "atl-float atl-stroke atl-z", d: "M48.4 7.6h3.2l-3.2 3.4h3.2" }, zz);
  atlasMake("path", { class: "atl-float atl-late atl-stroke atl-z", d: "M54.2 0.6h2.4l-2.4 2.6h2.4" }, zz);
  const dots = atlasGroup(fx, "atl-fx-dots");
  for (const [i, x, y, r] of [[0, 51.5, 12.5, 1.1], [1, 55, 7.6, 1.6], [2, 59.2, 1.8, 2.2]]) {
    atlasMake("circle", { class: `atl-dot atl-dot-${i}`, cx: x, cy: y, r }, dots);
  }
  const q = atlasGroup(fx, "atl-fx-q", [57, 6]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M53.8 3.6Q53.8 0.2 57 0.2Q60.2 0.2 60.2 3Q60.2 5 58 6Q56.9 6.6 56.9 8.4" }, q);
  atlasMake("circle", { class: "atl-mark-dot", cx: 56.9, cy: 11.2, r: 1 }, q);
  const bang = atlasGroup(fx, "atl-fx-bang", [57, 6]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M57.4 0V7.4" }, bang);
  atlasMake("circle", { class: "atl-mark-dot", cx: 57.4, cy: 10.6, r: 1.1 }, bang);
  const tear = atlasGroup(fx, "atl-fx-tear");
  atlasDrop(atlasGroup(tear, "atl-fall", [16.4, 37]), 16.4, 37, 1.9, "atl-drop");
  const sweat = atlasGroup(fx, "atl-fx-sweat");
  atlasDrop(atlasGroup(sweat, "atl-fall atl-slow", [53.6, 16]), 53.6, 16, 1.7, "atl-drop");
  return fx;
}

//: The head: skin, gloss and rim light, blush, eyes, brows, mouths, then
//: the halo in front (its back arc passes above the crown, never across
//: the face, so one ring drawn once reads in depth) and the wisp over it.
function atlasHead(parent, id, level) {
  const tiny = level === "tiny";
  const head = atlasGroup(parent, "atl-head", ATLAS_GEO.neck);
  const sway = atlasGroup(head, "atl-sway", ATLAS_GEO.neck);
  atlasMake("path", { class: "atl-skin atl-outline", d: ATLAS_HEAD_PATH, "stroke-width": tiny ? 2.2 : 1.1 }, sway);
  if (!tiny) {
    atlasMake("ellipse", { class: "atl-sheen", cx: 22.5, cy: 11.6, rx: 7.6, ry: 3.6, transform: "rotate(-28 22.5 11.6)" }, sway);
    atlasMake("path", { class: "atl-rim", d: "M50.8 14.6C54.2 20.2 54.4 28.6 51 35.2C48.4 40.2 44 43.4 38.8 44.8" }, sway);
  }
  for (const [x, y] of ATLAS_GEO.cheeks) atlasMake("ellipse", { class: "atl-cheek", cx: x, cy: y, rx: tiny ? 4.4 : 3.8, ry: tiny ? 2.6 : 2.2 }, sway);
  for (const spec of ATLAS_GEO.eyes) atlasEye(sway, id, spec, tiny);
  if (!tiny) {
    for (const [x, y, side] of ATLAS_GEO.brows) {
      const brow = atlasGroup(sway, `atl-brow atl-brow-${side > 0 ? "l" : "r"}`, [x, y]);
      atlasMake("path", { class: "atl-stroke atl-brow-line", d: `M${x - 3.8} ${y + 1}Q${x} ${y - 1.5} ${x + 3.8} ${y + 1}` }, brow);
    }
  }
  const mouth = atlasGroup(sway, "atl-mouth", [32, 38.4]);
  for (const [name, shape] of Object.entries(ATLAS_MOUTHS)) {
    const g = atlasGroup(mouth, `atl-m atl-m-${name}`);
    if (shape.ellipse) {
      const [cx, cy, rx, ry] = shape.ellipse;
      atlasMake("ellipse", { class: "atl-ink", cx, cy, rx: tiny ? rx + 0.5 : rx, ry: tiny ? ry + 0.5 : ry }, g);
    } else if (shape.fill) {
      atlasMake("path", { class: "atl-ink", d: shape.d }, g);
      if (!tiny) atlasMake("path", { class: "atl-tongue", d: shape.tongue }, g);
    } else {
      atlasMake("path", { class: "atl-stroke", d: shape.d, "stroke-width": tiny ? 2.6 : 1.7 }, g);
    }
  }
  atlasHalo(sway, level);
  atlasMake("path", { class: "atl-skin atl-outline", d: ATLAS_WISP_PATH, "stroke-width": tiny ? 2 : 1 }, sway);
  if (!tiny) atlasExtras(sway);
  return head;
}

//: The body, in the companion's part names so its behaviours can act it
//: out: legs from the hips, the raised arms it hangs and cheers with, the
//: torso with the hub's light in its chest, and the resting arms.
function atlasBody(parent) {
  const legs = [["l", 26, 25.2, 24.6], ["r", 38, 38.8, 39.4]];
  for (const [side, hip, ankle, foot] of legs) {
    const leg = atlasGroup(parent, `nmb-leg nmb-leg-${side} atl-leg`);
    atlasMake("path", { class: "atl-limb-edge", d: `M${hip} 68L${ankle} 84` }, leg);
    atlasMake("path", { class: "atl-limb", d: `M${hip} 68L${ankle} 84` }, leg);
    atlasMake("ellipse", { class: "atl-foot", cx: foot, cy: 86.6, rx: 6, ry: 3.4 }, leg);
  }
  for (const [side, d, hx] of [["l", "M22 53C8 50 1 22 6 -4", 6], ["r", "M42 53C56 50 63 22 58 -4", 58]]) {
    const hold = atlasGroup(parent, `nmb-hold nmb-hold-${side}`);
    atlasMake("path", { class: "atl-limb-edge atl-arm-up", d }, hold);
    atlasMake("path", { class: "atl-limb atl-arm-up", d }, hold);
    atlasMake("circle", { class: "atl-hand", cx: hx, cy: -7, r: 3.8 }, hold);
  }
  const torso = atlasGroup(parent, "nmb-torso");
  atlasMake("path", { class: "atl-skin atl-outline", d: ATLAS_TORSO_PATH, "stroke-width": 1.1 }, torso);
  atlasMake("ellipse", { class: "atl-belly", cx: 32, cy: 62.5, rx: 10.4, ry: 9.6 }, torso);
  atlasMake("path", { class: "atl-rim", d: "M46 50.6C47.8 56.4 48.6 62.4 47.2 68" }, torso);
  const core = atlasGroup(torso, "atl-core", [32, 56.5]);
  atlasMake("circle", { class: "atl-core-glow", cx: 32, cy: 56.5, r: 5.6 }, core);
  atlasMake("circle", { class: "atl-core-ring", cx: 32, cy: 56.5, r: 2.5 }, core);
  atlasMake("circle", { class: "atl-core-dot", cx: 32, cy: 56.5, r: 1.3 }, core);
  const arms = [
    ["l", "M23 49.5C18.6 51 14.2 56.4 12.6 61.8C11.6 65.2 14.8 67.4 17.4 65C20 62.4 22.6 58 24.4 54.6Z"],
    ["r", "M41 49.5C45.4 51 49.8 56.4 51.4 61.8C52.4 65.2 49.2 67.4 46.6 65C44 62.4 41.4 58 39.6 54.6Z"],
  ];
  for (const [side, d] of arms) {
    const arm = atlasGroup(parent, `nmb-arm nmb-arm-${side}`);
    atlasMake("path", { class: "atl-skin atl-outline", d, "stroke-width": 1 }, arm);
  }
}

//: Motes of light drifting up through the glow.
function atlasMotes(parent, spots) {
  const motes = atlasGroup(parent, "atl-motes");
  spots.forEach(([x, y, r], i) => atlasMake("circle", { class: `atl-mote atl-mote-${i}`, cx: x, cy: y, r }, motes));
}

//: The gradients, per drawing (ids are per drawing, so two on a page never
//: share one): the skin in the drawing's own space, so head, wisp, arms and
//: body are one continuous surface; the aura; the chest light; and each
//: eye's clip.
function atlasDefs(svg, id, level) {
  const defs = atlasMake("defs", {}, svg);
  const skin = atlasMake("radialGradient", { id: `${id}-skin`, gradientUnits: "userSpaceOnUse", cx: 24, cy: 14, r: 80, fx: 22, fy: 10 }, defs);
  for (const [offset, cls] of [[0, "atl-st-hi"], [0.26, "atl-st-lt"], [0.6, "atl-st-md"], [1, "atl-st-dp"]]) {
    atlasMake("stop", { offset, class: cls }, skin);
  }
  const aura = atlasMake("radialGradient", { id: `${id}-aura` }, defs);
  for (const [offset, cls] of [[0, "atl-st-aura0"], [0.5, "atl-st-aura1"], [1, "atl-st-aura2"]]) atlasMake("stop", { offset, class: cls }, aura);
  const core = atlasMake("radialGradient", { id: `${id}-core` }, defs);
  for (const [offset, cls] of [[0, "atl-st-core0"], [1, "atl-st-core1"]]) atlasMake("stop", { offset, class: cls }, core);
  if (level !== "tiny") {
    for (const [cx, cy, side] of ATLAS_GEO.eyes) {
      const clip = atlasMake("clipPath", { id: `${id}-e${side > 0 ? "l" : "r"}` }, defs);
      atlasMake("ellipse", { cx, cy, rx: ATLAS_GEO.eyeRx, ry: ATLAS_GEO.eyeRy }, clip);
    }
  }
  //: The paints name their gradients through custom properties, so the CSS
  //: can say "skin" without knowing this drawing's id.
  svg.style.setProperty("--atl-skin", `url(#${id}-skin)`);
  svg.style.setProperty("--atl-aura", `url(#${id}-aura)`);
  svg.style.setProperty("--atl-core", `url(#${id}-core)`);
}

//: What each level shows, and the box it is drawn in. `full` keeps margins
//: for the glow and the raised hand; `head` is square round the head and
//: its halo; `tiny` crops tighter because at 16px every unit counts.
const ATLAS_LEVELS = {
  full: { viewBox: [-8, -12, 80, 106], body: true },
  figure: { viewBox: [0, 0, 64, 92], body: true },
  head: { viewBox: [2, -8, 60, 60], body: false },
  tiny: { viewBox: [5, -4, 54, 54], body: false },
};

function atlasLevelFor(size) {
  if (size < 28) return "tiny";
  if (size < 96) return "head";
  return "full";
}

//: Draws Atlas at a level in a mood. `size` is the drawn height in px.
function atlasDraw(size = 20, mood = atlasMoodNow, level = atlasLevelFor(size)) {
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
  const pose = atlasGroup(svg, "atl-pose", spec.body ? ATLAS_GEO.feet : ATLAS_GEO.chin);
  if (level !== "tiny") {
    const aura = spec.body
      ? { cx: 32, cy: 44, rx: 40, ry: 50 }
      : { cx: 32, cy: 24, rx: 31, ry: 31 };
    atlasMake("ellipse", { class: "atl-aura", ...aura }, pose);
    atlasMotes(pose, spec.body ? [[5, 50, 1], [59, 40, 1.2], [9, 74, 0.8]] : [[6, 36, 1.1], [58, 30, 1.2]]);
  }
  const moodLoop = atlasGroup(pose, "atl-mood", spec.body ? ATLAS_GEO.feet : ATLAS_GEO.chin);
  const rig = atlasGroup(moodLoop, "atl-rig", spec.body ? ATLAS_GEO.feet : ATLAS_GEO.chin);
  if (spec.body) atlasBody(rig);
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
  for (const svg of document.querySelectorAll(".nm-atlas")) atlasApply(svg, next);
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
