// atlas.js: Atlas, the assistant's own character. Loaded straight after
// avatars.js, whose `registerCharacter` it answers through; every other file
// reaches it by the old names (`atlasMark`, `setAtlasMood`,
// `atlasRestingMood`), so no call site changed when it moved here.
//
//: **The design note.** Atlas is a small celestial spirit built from two of
//: the owner's reference sheets, by their decision: the "conceptual art"
//: pose grid for the head's features (the flame ear tufts, the face, the
//: chest constellation, the comet tail, the nebula strand, the orbit rings
//: with their planets, the states) and the ghostly "base concept" sheet
//: for the head's oval, the lower body and the limbs (a torso that flows
//: as one outline into soft tendril legs with no feet, tendril arms, the
//: glossy head highlight, the bright chest star) and its "comet drifter"
//: for the mane. The owner's verdicts on the drafts before this one are
//: the rules: "cool and aura", "cute but not fat baby cute", "like a
//: pokemon or Rimuru", "the arms and legs aren't properly attached", "a
//: space onion", "too alien like", "too rigid ... no smooth organic flow",
//: "lego hands", "wizard cap", "very purple and a lot of the blue is
//: missing", "it doesn't need to be a large round head".
//:
//: - **Proportions** (the companion's 64 by 92 box, one unit is one px at
//:   the companion's size). The head is a soft oval a little taller than
//:   wide, 27 by 30, from 8 to 38.4: a third of the height. No neck: it
//:   sits straight on the body. The body is small and soft, 25 wide at the
//:   belly, narrowing at the waist to 73; the tendril legs run from inside
//:   the hips to the soles' line at 90; the arms are 18 long from a
//:   shoulder just under the chin. The eyes are 10 wide, 37% of the head,
//:   13 apart, set 63% down the head; the mouth 90% down.
//: - **One silhouette, all curves** (the owner: "no smooth organic flow or
//:   shape ... all too rigid"). Every shape is cubic Beziers with matching
//:   tangents at the joins, no straight segments and no corners. Every
//:   limb, lock, wisp and the tail is a tapered stem generated from a
//:   centreline (`atlasStem`): thick where it grows out of the body, fine
//:   and soft at the tip, its root well inside the body. All outlines are
//:   drawn first as one layer (`atl-edges`) and every fill on top
//:   (`atl-fills`), so where parts overlap the fills close the seams and
//:   the figure has one outer contour; the outline is thin, lighter than
//:   the fill's shade and low in contrast, so the gradients do the
//:   modelling, and the head's outline stops at the cheeks so there is no
//:   chin line: the head runs into the body. Each limb is in both layers
//:   under the same companion class, so a pose turns outline and fill
//:   together about a joint inside the body.
//: - **The ears, the wisps and the mane.** Two soft flame tufts, one each
//:   side of the crown, that sweep up and out with two small tongues
//:   flicked along the outer edge, an inner ear of galaxy and a star at
//:   the tip (the feminine ones longer, with a wisp trailing down beside
//:   the cheek); a small tuft of three wisps on the crown between them;
//:   and behind them a mane that starts as wide as the crown and streams
//:   back and down in layered, overlapping locks, each broad at the root
//:   and tapering to a soft point along a long S, never straight and
//:   never upward, translucent with speckle stars and a lighter leading
//:   edge (three locks for the masculine look, five longer ones flowing
//:   further down for the feminine).
//: - **The tail.** From the lower back, a flame: it thickens then tapers
//:   along an S, with small tongues flicked off its edge, the body's blue
//:   running into navy galaxy with star dots along it and a bright white
//:   comet glow at the tip. The feminine tail runs longer with a second
//:   curve. It is the companion's tail too: it lies along a ledge when
//:   Atlas sits, hangs when it hangs, curls when it sleeps and wags when
//:   it is pleased.
//: - **The signature.** A constellation of thin light lines and star points
//:   traced inside the chest and belly, with a brighter four-point star at
//:   the heart in a soft glow: the logo's hub and linked notes, worn
//:   inside. Three thin concentric rings of light orbit the head at cheek
//:   level, tilted, passing behind the head and in front of the chin, with
//:   a tiny planet or star glint on each. And the nebula strand: a band of
//:   deep navy with violet and pink clouds and star dots that sweeps
//:   diagonally behind the body from the upper right and crosses once in
//:   front of the legs, light and secondary. Restraint: nothing else.
//: - **Material.** Soft and painterly: one radial gradient in the drawing's
//:   own space (a sky-blue-white core at the forehead through periwinkle
//:   to a blue-violet shade and deep blue at the far rim) fills head,
//:   mane, body and limbs alike, so the light falls on the whole figure at
//:   once; a lighter belly, as if lit from inside; a rim shade per part (a
//:   radial gradient, clear in the middle and violet at the edge, so each
//:   part rounds off); a glossy specular on the head's upper left and a
//:   smaller one on the body (white through a radial fade); a few specks
//:   inside; a subtle aura. No filters anywhere: every glow is a radial
//:   gradient.
//: - **Palette, sampled** (k-means over the reference sheets' regions,
//:   `scratchpad/palette.py`; the owner: "they are very purple and a lot of
//:   the blue is missing"). The body is blue: a sky-blue-white core
//:   (#c8e1f7, the forehead's largest cluster), periwinkle (#a3bbea, the
//:   torso's), blue-violet shade (#7d91cf) and deep blue at the far side
//:   (#505aac, the legs'). Violet only where the references have it: the
//:   ear and hair tips (#413b94, the hero's crest) and the lilac nebula
//:   (#b098d6). Navy for the eyes (#081241) and the galaxy (#1c235a);
//:   white-blue for highlights and starlight (#e7f6fd). Fixed in the CSS;
//:   the live `--accent` tints only the aura, the rings' glow and the
//:   iris's foot, never the body.
//: - **Face.** Big rounded eyes, the iris deep navy-violet filling nearly
//:   the whole eye and lightening toward its foot, centred by default, two
//:   catchlights always at the upper left and one tiny sparkle; a fine
//:   lash line; soft lower lids; faint brows; a small closed smile at rest
//:   (open only pleased or laughing); soft cheeks with blush. Fifteen
//:   moods, each a combination of all of these plus head tilt, body
//:   squash, ear, hair, tail and ring lift and star brightness and one
//:   small extra (sparkles, hearts, a thought, a tear). The combinations
//:   are CSS (`[data-atlas-mood]` in 08-consistency.css); this file draws
//:   the parts and says which mood.
//: - **Life.** Breathing squash and stretch from the feet, blinks with an
//:   occasional double blink, the tail swaying (wagging when pleased) with
//:   its starlight glinting, the tendril tips drifting, dust drifting round
//:   the rings, a slow head sway and the glow pulsing. All of it is CSS
//:   transform and opacity on this one SVG, runs only while the mark is on
//:   screen and motion is on, slows under Reduce motion and stops under
//:   Avatar animation Off.
//: - **Sizes.** `full` (a figure with margins, 96px and up: the welcome,
//:   the large view), `figure` (the companion's 64 by 92 box, parts named
//:   for the companion's behaviours), `head` (the head, its ears and a
//:   shorter cut of the mane, 28 to 95px: the dashboard mark, chat heads,
//:   persona rows) and `tiny` (under 28px: head, ears and eyes, thicker
//:   lines, no lids, brows or motion).

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

//: **A tapered stem from a centreline** (the design note's "one
//: silhouette"): `segs` is a run of cubic segments, each [x0 y0 c1x c1y c2x
//: c2y x1 y1], and `width(t)` the stem's full width along it (t from 0 at
//: the root to 1 at the tip). The centreline is sampled, offset both ways
//: along its normal, and each side is smoothed through its samples
//: (Catmull-Rom made into cubics), so a limb is one smooth closed path with
//: a round tip (`cap`) or a soft point. Limbs, locks, wisps, the chin hand,
//: the tail and the nebula strand all come from here, which is why they
//: match.
function atlasStemSides(segs, width, samples, shift) {
  const at = (s, t) => {
    const u = 1 - t;
    const x = u * u * u * s[0] + 3 * u * u * t * s[2] + 3 * u * t * t * s[4] + t * t * t * s[6];
    const y = u * u * u * s[1] + 3 * u * u * t * s[3] + 3 * u * t * t * s[5] + t * t * t * s[7];
    const dx = 3 * u * u * (s[2] - s[0]) + 6 * u * t * (s[4] - s[2]) + 3 * t * t * (s[6] - s[4]);
    const dy = 3 * u * u * (s[3] - s[1]) + 6 * u * t * (s[5] - s[3]) + 3 * t * t * (s[7] - s[5]);
    return [x, y, dx, dy];
  };
  const left = [];
  const right = [];
  const total = segs.length * samples;
  for (let i = 0; i <= total; i += 1) {
    const k = Math.min(segs.length - 1, Math.floor(i / samples));
    const t = i / total;
    const [x, y, dx, dy] = at(segs[k], (i - k * samples) / samples);
    const len = Math.hypot(dx, dy) || 1;
    const hw = width(t) / 2;
    const sh = shift ? shift(t) : 0;
    const cx = x - (dy / len) * sh;
    const cy = y + (dx / len) * sh;
    left.push([cx - (dy / len) * hw, cy + (dx / len) * hw]);
    right.push([cx + (dy / len) * hw, cy - (dx / len) * hw]);
  }
  return { left, right };
}

const atlasFix = (v) => +v.toFixed(2);

function atlasSmooth(pts) {
  const f = atlasFix;
  let d = "";
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function atlasStem(segs, width, { samples = 10, cap = true, shift = null } = {}) {
  const { left, right } = atlasStemSides(segs, width, samples, shift);
  const f = atlasFix;
  const tip = left[left.length - 1];
  const tipR = right[right.length - 1];
  const r = Math.hypot(tip[0] - tipR[0], tip[1] - tipR[1]) / 2;
  const end = cap && r > 0.05 ? `A${f(r)} ${f(r)} 0 0 1 ${f(tipR[0])} ${f(tipR[1])}` : `L${f(tipR[0])} ${f(tipR[1])}`;
  return `M${f(left[0][0])} ${f(left[0][1])}${atlasSmooth(left)}${end}${atlasSmooth(right.slice().reverse())}Z`;
}

//: The stem's upper side alone, as an open path: the lighter leading edge
//: of a lock of the mane.
function atlasStemEdge(segs, width, samples) {
  const { right } = atlasStemSides(segs, width, samples);
  const f = atlasFix;
  return `M${f(right[0][0])} ${f(right[0][1])}${atlasSmooth(right)}`;
}

//: A width that eases from `a` at the root to `b` at the tip.
const atlasTaper = (a, b) => (t) => a + (b - a) * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

//: The drawing's landmarks, in the companion's 64 by 92 box: a soft build
//: with a rounded oval head a little taller than wide, a third of the
//: height, sitting on the body with no neck (the owner: "it doesn't need
//: to be a large round head"; the ghostly sheet's head), the head from 8
//: to 38.4, the body to 73, the tendril legs to the soles' line at 90, the
//: raised hands at -7.
const ATLAS_GEO = {
  eyes: [[24.4, 27, 1], [37.6, 27, -1]],
  brows: [[24.4, 20.6, 1], [37.6, 20.6, -1]],
  cheeks: [[19.6, 32.4], [42.4, 32.4]],
  mouth: [31, 35.2],
  ear: [[21, 14], [41, 14]],
  hair: [31, 10],
  wisps: [[[28.6, 10, 29.2, 7, 30.2, 4.6, 31.4, 2.2], 3, 0.6], [[31.6, 9.6, 33.2, 6.4, 35.6, 4.2, 38.2, 3.4], 3.2, 0.6], [[34.6, 10.4, 36.6, 8.6, 38.8, 7.6, 41.2, 7.6], 2.6, 0.5]],
  //: The rings of light: three concentric ellipses about the head at cheek
  //: level, tilted, each with a planet or a glint on it, at [angle, size,
  //: colour]. Placed as the reference has them, unevenly.
  rings: [
    { r: 22, glints: [[174, 1.1, "amber"], [332, 0.7, "star"]] },
    { r: 29, glints: [[158, 1.7, "amber"], [349, 1, "pale"]] },
    { r: 36, glints: [[190, 1.45, "lilac"], [300, 1.15, "teal"], [96, 0.75, "star"]] },
  ],
  ringFrame: { cx: 31, cy: 31, flat: 0.34, tilt: -5 },
  //: The constellation inside the body: the heart star first, then the
  //: linked points down the belly.
  constellation: [[31, 45.6], [28.2, 50.2], [33.2, 53.6], [28.8, 57.4], [33, 60.6]],
  neck: [31, 37],
  feet: [31, 90],
  chin: [31, 30],
  shoulders: [[24.6, 41], [37.4, 41]],
  hips: [[27.4, 63], [34.6, 63]],
  tail: [34, 60],
};

//: The head: a soft oval a little taller than wide, fuller at the cheeks
//: than at the crown, the chin one gentle curve that runs into the body
//: (its outline stops at the cheeks, `ATLAS_HEAD_EDGE`, so there is no
//: chin line).
const ATLAS_HEAD_PATH = "M31 38.4C24 38.4 17.6 33 17.6 24C17.6 14.6 23.4 8 31 8C38.6 8 44.4 14.6 44.4 24C44.4 33 38 38.4 31 38.4Z";
const ATLAS_HEAD_EDGE = "M18.4 30.4C16.6 20.2 22.6 8 31 8C39.4 8 45.4 20.2 43.6 30.4";
//: The left ear: a wisp of flame that leaves the crown's shoulder, leans
//: out and back, its outer edge flicked into two small tongues, its tip
//: soft; inside it the inner ear, the same shape inset, filled with
//: galaxy. Its base is a curve inside the head. The right ear is the
//: mirror.
const ATLAS_EAR_L = atlasScalePath("M19.2 17C16.6 15.6 14.6 13.4 13.6 11.4C13.1 10.4 11.8 10 12 9.2C12.2 8.5 13.4 8.8 13.9 8.2C13.3 6.6 12.5 4.8 13.1 3.2C13.4 2.4 14.5 2.7 15 2.1C15.2 0.9 15.6 -0.3 16.5 -0.4C17.5 -0.5 18.2 1.2 18.9 2.6C20.6 6 23.2 8.8 27.2 11.2C24 11.8 21 13.8 19.2 17Z", 1.08, 23, 15.6);
const ATLAS_EAR_IN_L = atlasScalePath("M20.2 14.2C18.2 12.6 16.6 10.4 16.2 7.8C16 6.4 16.6 5.2 17.4 5.2C18.2 5.2 18.6 6.2 19 7C20.4 9.4 22.2 10.8 24.8 11.8C23 12.4 21.4 13.2 20.2 14.2Z", 1.08, 23, 15.6);
const ATLAS_EAR_TIP_L = [15.9, 0.1];

//: Scales a hand-drawn path about a point (only M, C, L, Q and Z appear in
//: the paths this is used on).
function atlasScalePath(d, k, cx, cy) {
  return d.replace(/([MCLQ])([^MCLQZ]*)/g, (m, cmd, body) => {
    const n = body.trim().split(/[\s,]+/).map(Number);
    return cmd + n.map((v, i) => +(i % 2 ? cy + (v - cy) * k : cx + (v - cx) * k).toFixed(2)).join(" ");
  });
}

//: **Two looks of one character** (the design note). The ear tufts and
//: the tail are where they differ (the owner: "masculine: shorter ear
//: tufts and tail; feminine: longer, fuller ear tufts that flow down like
//: hair, a longer, more lustrous tail, lashes"). `ear` is the left tuft
//: (mirrored for the right), `earIn` its inner ear, `earTip` where its
//: star sits, `strand` a wisp that trails down beside the cheek; `tail`
//: the centreline of the tail's flame with its width, its tongues, its
//: stars and its tip. Brows and lashes complete the difference.
const ATLAS_LOOKS = {
  masculine: {
    ear: ATLAS_EAR_L,
    earIn: ATLAS_EAR_IN_L,
    earTip: ATLAS_EAR_TIP_L,
    strand: "",
    locks: [
      { seg: [[23, 12, 26, 0, 42, -3, 52, 6], [52, 6, 57, 10.6, 58, 16, 54.6, 19.4]], w: [6.2, 0.6] },
      { seg: [[28, 10, 36, 0.4, 50, 3, 58, 13], [58, 13, 63, 19.6, 62.6, 26, 58.4, 29]], w: [7, 0.7] },
      { seg: [[33, 9.6, 40, 3.6, 53, 7, 59, 19], [59, 19, 63.4, 27.4, 61.6, 34, 56.6, 37.4]], w: [6.4, 0.7] },
      { seg: [[37, 11, 43, 8, 52, 14, 55.6, 24], [55.6, 24, 58.4, 32, 57.2, 39, 52.4, 43]], w: [5, 0.6] },
    ],
    head: [
      { seg: [[23, 12, 28, 2, 44, 1, 52, 8], [52, 8, 55.6, 11.4, 56, 15.4, 53.4, 18]], w: [6.2, 0.6] },
      { seg: [[28, 10, 36, 0.4, 49, 3, 54.4, 12], [54.4, 12, 57.6, 17, 57.4, 22.4, 54, 25.4]], w: [7, 0.7] },
      { seg: [[33, 9.6, 40, 3.6, 51, 7, 55, 17], [55, 17, 58, 24, 57, 30, 52.6, 33.6]], w: [6.4, 0.7] },
      { seg: [[37, 11, 43, 8, 51, 13, 53.6, 22], [53.6, 22, 55.6, 29, 54.6, 35, 50.4, 39]], w: [5, 0.6] },
    ],
    brow: "straight",
    lashes: false,
    tail: [[33, 60, 44, 59.6, 52.4, 65.6, 50.4, 73.4], [50.4, 73.4, 48.2, 81, 52.4, 88.4, 62, 86]],
    tailWidth: (t) => 2.6 + 6 * Math.sin(Math.PI * Math.min(1, t * 1.08)) - 2 * t * t,
    tailStars: [[45.6, 63.6, 0.45], [51, 70.6, 0.35], [49.4, 79.4, 0.5], [53.2, 87, 0.35], [57.8, 88, 0.45]],
    tailTip: [62.4, 85.4],
  },
  feminine: {
    ear: "M19.2 17C15.6 15.8 12.6 13.8 10.8 11.4C9.8 10.2 8.2 9.8 8.4 8.8C8.6 8 10 8.2 10.6 7.6C9.6 5.8 8.4 3.6 9.2 1.6C9.6 0.7 10.8 1 11.4 0.4C11.8 -1.2 12.6 -2.8 13.9 -2.9C15.2 -3 16.2 -0.8 17.2 1.4C19.4 6 22.8 9 27.2 11.2C24 11.8 21 13.8 19.2 17Z",
    earIn: "M19.8 14.4C17.2 12.8 14.8 10.4 13.8 7.4C13.3 5.8 13.8 4.4 14.7 4.4C15.5 4.4 16 5.6 16.5 6.6C18.2 9.4 20.6 11 24.6 11.8C22.6 12.4 21 13.2 19.8 14.4Z",
    earTip: [14.4, -1.4],
    strand: "M12.2 12.6C9.8 15.8 8.6 20.4 9.4 25.2C9.6 26.4 9 28.4 7.8 28.2C6.4 28 6.2 25.8 6.4 24C6.8 19.2 8.4 15 12.2 12.6Z",
    locks: [
      { seg: [[21, 13, 22, 0, 42, -3, 54, 6], [54, 6, 62, 11, 64, 18, 59.6, 22]], w: [6.6, 0.6] },
      { seg: [[25, 11, 28, -1, 50, 0, 60, 10], [60, 10, 69, 17, 70.6, 27, 64.4, 31]], w: [7.4, 0.7] },
      { seg: [[30, 9.6, 34, -2, 56, 0.6, 65, 14], [65, 14, 74, 25, 73, 38, 65.6, 43]], w: [8, 0.8] },
      { seg: [[35, 10.4, 40, 1.6, 59, 5.4, 66, 20], [66, 20, 73, 33, 70, 48, 62, 54]], w: [7.4, 0.7] },
      { seg: [[39, 12, 44, 6.4, 59, 11, 63, 27], [63, 27, 67.6, 42, 64, 56, 56.6, 63]], w: [6.4, 0.6] },
      { seg: [[41, 14.6, 45, 11, 55, 18, 57, 32], [57, 32, 59.4, 46, 56.4, 58, 50.4, 65]], w: [5.2, 0.5] },
    ],
    head: [
      { seg: [[21, 13, 24, 3, 42, 1, 52, 8], [52, 8, 56.4, 11.6, 57.2, 16.6, 54.4, 19.6]], w: [6, 0.6] },
      { seg: [[25, 11, 30, 0, 47, 1.4, 54, 11], [54, 11, 58.4, 16, 58.6, 22, 55.4, 25.4]], w: [6.6, 0.7] },
      { seg: [[30, 9.6, 36, -1, 51, 1.6, 56, 14], [56, 14, 60, 21.6, 59.4, 29.6, 54.6, 34]], w: [7.2, 0.8] },
      { seg: [[35, 10.4, 42, 2.6, 54, 6.4, 57, 20], [57, 20, 60, 28, 58.6, 36, 53, 40.4]], w: [6.6, 0.7] },
    ],
    hairStars: [[50, 5], [59, 9.6], [67, 18], [70.6, 30], [68, 42], [63, 52], [56.6, 61]],
    brow: "arch",
    lashes: true,
    tail: [[33, 60, 46, 59.4, 55.4, 66.4, 52, 75], [52, 75, 47.8, 84, 52.6, 92.6, 63, 91], [63, 91, 69.6, 90, 71.6, 85.4, 69.6, 81.6]],
    tailWidth: (t) => 2.6 + 6.2 * Math.sin(Math.PI * Math.min(1, t * 1.12)) - 2.2 * t * t,
    tailStars: [[46.4, 63.2, 0.45], [53.4, 70.8, 0.35], [50, 80.6, 0.5], [53.6, 90, 0.35], [60.4, 92.4, 0.45], [67.6, 88.6, 0.35]],
    tailTip: [70, 82],
  },
};

//: Which look: Atlas's own setting when one is stored (Settings,
//: Appearance, Atlas look), otherwise it follows Face looks (the owner:
//: the male version is the main one; the feminine one is its own look).
function atlasLook() {
  let own = null;
  try {
    own = localStorage.getItem("atlas-look");
  } catch {
    own = null;
  }
  if (own === "feminine" || own === "masculine") return own;
  return typeof appearancePref === "function" && appearancePref("face-look", "mixed") === "feminine" ? "feminine" : "masculine";
}

function atlasMirror(d) {
  //: Mirrors a path about x = 31 by reflecting every x. Only the commands
  //: `atlasStem` and the hand-drawn paths use (M, C, A, L, Z) appear, so
  //: the arc's sweep flag is the one flag to flip.
  return d.replace(/([MCLA])([^MCLAZ]*)/g, (m, cmd, body) => {
    const n = body.trim().split(/[\s,]+/).map(Number);
    if (cmd === "A") return `A${n[0]} ${n[1]} 0 0 0 ${(62 - n[5]).toFixed(2)} ${n[6]}`;
    return cmd + n.map((v, i) => (i % 2 ? v : +(62 - v).toFixed(2))).join(" ");
  });
}

//: A soft swell toward the end of a limb: the mitten or the paw, rounder
//: than the limb above it, with no step where it starts.
const atlasPaw = (t, from, by) => (t <= from ? 0 : by * (1 - Math.cos(Math.PI * Math.min(1, (t - from) / (1 - from)))) / 2);
//: The limbs, each a soft tendril from a root inside the body (the second
//: reference sheet's ghostly base: "soft, tapering, tendril-like legs with
//: no feet ... arms the same soft tapered tendrils with rounded tips, and
//: the shoulders merge into the body"). Legs: from inside the hips, down
//: and drifting, curling a little at the tip. Arms: from the shoulder,
//: curving out and down to a rounded tip. The raised arms reach the
//: companion's hand line (-7) for hanging and cheering.
const ATLAS_LEG_R = atlasStem([[34.6, 61, 35.6, 69, 38, 77, 35.8, 84.6], [35.8, 84.6, 34.4, 88.4, 36.6, 90.6, 39.6, 88.8]], (t) => 6.4 - 5.2 * Math.min(1, t * 1.05) ** 1.1 + 0.2, { samples: 8 });
const ATLAS_ARM_R = atlasStem([[37.6, 40.6, 42.6, 43, 46, 48.6, 45.6, 55.6], [45.6, 55.6, 45.4, 58.4, 47, 60, 49, 59]], (t) => 4.8 - 3.4 * Math.min(1, t * 1.05) ** 1.2 + 0.2, { samples: 8 });
const ATLAS_HOLD_R = atlasStem([[37.8, 41.4, 47, 34, 54, 16, 53.6, -4.6]], (t) => 4.8 - 2.6 * t + atlasPaw(t, 0.8, 0.7), { samples: 16 });
const ATLAS_LIMBS = {
  legs: [["l", atlasMirror(ATLAS_LEG_R)], ["r", ATLAS_LEG_R]],
  arms: [["l", atlasMirror(ATLAS_ARM_R)], ["r", ATLAS_ARM_R]],
  holds: [["l", atlasMirror(ATLAS_HOLD_R)], ["r", ATLAS_HOLD_R]],
};
//: The body: one soft outline from under the chin, out round the belly,
//: in at the waist and flaring just enough at the hips for the tendril
//: legs to grow out of it.
const ATLAS_TORSO_PATH = "M25.4 35.6C22.2 41 21 47.4 21.4 53.4C21.8 59 23.4 63.2 26.2 65.8C28.8 68 33.2 68 35.8 65.8C38.6 63.2 40.2 59 40.6 53.4C41 47.4 39.8 41 36.6 35.6Z";
//: Thinking, a hand at the chin (the reference sheet): the right arm bent
//: up, drawn over the face in the head's own group.
const ATLAS_CHIN_HAND = atlasStem([[37.8, 42, 45.6, 45.4, 43.4, 36.8, 36, 37.2]], (t) => 4.8 - 2.6 * t + atlasPaw(t, 0.7, 0.5), { samples: 14 });

//: The paths generated per look: the tail's ribbon (the owner: "a stream
//: of cosmic water or a ribbon like pokemon tail ... not as furry but
//: kinda at the same time"): one continuous tapered stem, and inside it
//: two narrower streams, a pale one and a lilac one, whose centrelines
//: weave from side to side across it out of phase, so the ribbon reads as
//: twisted silk and water; the mane's locks; and, for both, the small
//: tuft of wisps on the crown.
for (const spec of Object.values(ATLAS_LOOKS)) {
  spec.tailPath = atlasStem(spec.tail, spec.tailWidth, { samples: 14 });
  spec.streamPath = atlasStem(spec.tail, (t) => spec.tailWidth(t) * 0.34, { samples: 14, shift: (t) => spec.tailWidth(t) * 0.28 * Math.sin(Math.PI * 2.6 * t) });
  spec.silkPath = atlasStem(spec.tail, (t) => spec.tailWidth(t) * 0.24, { samples: 14, shift: (t) => -spec.tailWidth(t) * 0.3 * Math.sin(Math.PI * 2.6 * t + 1.1) });
  const lock = (l) => ({ fill: atlasStem(l.seg, atlasTaper(l.w[0], l.w[1]), { samples: 10, cap: false }), light: atlasStemEdge(l.seg, atlasTaper(l.w[0], l.w[1]), 10) });
  spec.lockPaths = spec.locks.map(lock);
  spec.headPaths = spec.head.map(lock);
}
const ATLAS_WISPS = ATLAS_GEO.wisps.map(([seg, w0, w1]) => atlasStem([seg], atlasTaper(w0, w1), { samples: 8, cap: false }));

//: **The galaxy band** (the reference's nebula swirl; light and secondary):
//: a broad band of deep navy with violet and pink clouds and star dots
//: that sweeps diagonally behind the body from the upper right to the
//: lower left, and one short front segment of it crossing in front of the
//: thighs. One gradient path each.
const ATLAS_BAND_BACK = atlasStem([[64, 14, 64, 28, 46, 38, 26, 44], [26, 44, 8, 49, -4, 56, -4, 68]], (t) => 1.6 + 5.6 * Math.sin(Math.PI * Math.min(1, t * 1.02)), { samples: 12, cap: false });
const ATLAS_BAND_FRONT = atlasStem([[-4, 66, 2, 78, 26, 84, 54, 74]], (t) => 4.4 * Math.sin(Math.PI * Math.min(1, t)) + 0.8, { samples: 12, cap: false });
const ATLAS_BAND_STARS = [[62, 22, 0.5], [56, 32.6, 0.35], [40, 40.6, 0.55], [22, 45.6, 0.4], [4, 54, 0.35], [6, 73.6, 0.4], [22, 81, 0.5], [42, 79.2, 0.35]];

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

//: A big rounded eye, 37% of the head's width, its outer corner a touch
//: lifted. `side` is 1 for the eye on the viewer's left (its outer corner
//: is on the left).
function atlasAlmond(cx, cy, side) {
  const ox = cx - 5.1 * side;
  const ix = cx + 4.9 * side;
  return {
    d: `M${ox} ${cy - 0.8}Q${cx - 0.6 * side} ${cy - 8.2} ${ix} ${cy + 0.2}Q${cx + 0.2 * side} ${cy + 6.6} ${ox} ${cy - 0.8}Z`,
    upper: `M${ox} ${cy - 0.8}Q${cx - 0.6 * side} ${cy - 8.2} ${ix} ${cy + 0.2}`,
    lower: `M${ox + 0.8 * side} ${cy + 1.6}Q${cx + 0.2 * side} ${cy + 5.6} ${ix - 0.6 * side} ${cy + 1.4}`,
  };
}

//: One eye: the white, then (clipped to it) the iris that looks about and
//: the lids that slide over it, the fine lash line on its upper edge, a
//: soft lower lid, and outside the clip the three closed shapes a mood can
//: swap the open eye for. The iris is deep navy-violet, fills nearly the
//: whole eye and lightens toward its foot (a gradient), centred at rest,
//: with two catchlights always at the upper left and one tiny sparkle.
function atlasEye(parent, id, [cx, cy, side], tiny, lashes) {
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
    atlasMake("path", { class: "atl-ink", d: shape.d, transform: `translate(${cx} ${cy}) scale(1 1.15) translate(${-cx} ${-cy})` }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.4, cy: cy - 1.8, r: 1.5 }, iris);
  } else {
    atlasMake("ellipse", { class: "atl-iris-fill", cx, cy: cy - 0.3, rx: 4.6, ry: 5.2 }, iris);
    atlasMake("ellipse", { class: "atl-iris-foot", cx, cy: cy + 2.6, rx: 2.6, ry: 1.5 }, iris);
    atlasMake("ellipse", { class: "atl-ink", cx, cy: cy - 0.6, rx: 1.9, ry: 2.3 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.9, cy: cy - 2.4, r: 1.5 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx - 2.9, cy: cy + 0.4, r: 0.65 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx + 2.1, cy: cy + 2, r: 0.5 }, iris);
    const heart = atlasGroup(pupil, "atl-heart-eye");
    atlasHeart(heart, cx, cy + 0.5, 3.6, "atl-heart");
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.4, cy: cy - 1.2, r: 0.7 }, heart);
    //: The upper lid is the head's own skin sliding down over the white,
    //: with a lash line on its edge; the lower lid rises for a squint.
    const lid = atlasGroup(inner, "atl-lid", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 7} ${cy - 16}H${cx + 7}V${cy - 4.6}Q${cx} ${cy - 3.6} ${cx - 7} ${cy - 4.6}Z` }, lid);
    atlasMake("path", { class: "atl-lash", d: `M${cx - 7} ${cy - 4.6}Q${cx} ${cy - 3.6} ${cx + 7} ${cy - 4.6}` }, lid);
    const low = atlasGroup(inner, "atl-lid-low", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 7} ${cy + 12}H${cx + 7}V${cy + 3.8}Q${cx} ${cy + 2.8} ${cx - 7} ${cy + 3.8}Z` }, low);
    atlasMake("path", { class: "atl-liner", d: shape.upper }, blink);
    atlasMake("path", { class: "atl-liner atl-liner-low", d: shape.lower }, blink);
    if (lashes) {
      const ox = cx - 5.1 * side;
      atlasMake("path", { class: "atl-lashes", d: `M${ox} ${cy - 0.8}l${-1.6 * side} -0.9M${ox + 0.9 * side} ${cy - 2.6}l${-1.4 * side} -1.2M${ox + 2.3 * side} ${cy - 4}l${-1 * side} -1.4` }, blink);
    }
  }
  const w = tiny ? 2.6 : 1.8;
  atlasMake("path", { class: "atl-e-happy atl-stroke", "stroke-width": w, d: `M${cx - 4.6} ${cy + 1.2}Q${cx} ${cy - 5} ${cx + 4.6} ${cy + 1.2}` }, eye);
  atlasMake("path", { class: "atl-e-shut atl-stroke", "stroke-width": w, d: `M${cx - 4.8} ${cy - 0.4}Q${cx} ${cy + 3.6} ${cx + 4.8} ${cy - 0.4}M${cx - 4.8 * side} ${cy - 0.4}l${-1.3 * side} -1` }, eye);
  atlasMake("path", {
    class: "atl-e-squeeze atl-stroke",
    "stroke-width": w,
    d: `M${cx - 3.3 * side} ${cy - 3.2}L${cx + 2.8 * side} ${cy}L${cx - 3.3 * side} ${cy + 3.2}`,
  }, eye);
  return eye;
}

//: The small extras a mood can bring, each hidden until its mood asks.
//: Placed round the head, clear of the ears and the mane.
function atlasExtras(parent) {
  const fx = atlasGroup(parent, "atl-fx");
  const sparkle = atlasGroup(fx, "atl-fx-sparkle");
  atlasSpark(sparkle, 11, 20, 2.4, "atl-sparkle");
  atlasSpark(sparkle, 52, 24, 1.9, "atl-sparkle atl-late");
  atlasSpark(sparkle, 24, -2, 1.4, "atl-sparkle atl-later");
  const hearts = atlasGroup(fx, "atl-fx-hearts");
  atlasHeart(atlasGroup(hearts, "atl-float", [51, 20]), 51, 20, 2.6, "atl-heart");
  atlasHeart(atlasGroup(hearts, "atl-float atl-late", [12, 14]), 12, 14, 1.9, "atl-heart");
  const zz = atlasGroup(fx, "atl-fx-zz");
  atlasMake("path", { class: "atl-float atl-stroke atl-z", d: "M48.4 18.6h3l-3 3.2h3" }, zz);
  atlasMake("path", { class: "atl-float atl-late atl-stroke atl-z", d: "M53.4 12.6h2.2l-2.2 2.4h2.2" }, zz);
  const dots = atlasGroup(fx, "atl-fx-dots");
  for (const [i, x, y, r] of [[0, 14.4, 16.4, 1], [1, 10.8, 12, 1.4], [2, 6.4, 6.4, 2]]) {
    atlasMake("circle", { class: `atl-dot atl-dot-${i}`, cx: x, cy: y, r }, dots);
  }
  const q = atlasGroup(fx, "atl-fx-q", [10, 10]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M6.8 7.6Q6.8 4.2 10 4.2Q13.2 4.2 13.2 7Q13.2 9 11 10Q9.9 10.6 9.9 12.4" }, q);
  atlasMake("circle", { class: "atl-mark-dot", cx: 9.9, cy: 15.2, r: 1 }, q);
  const bang = atlasGroup(fx, "atl-fx-bang", [10, 10]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M9.4 4V11.4" }, bang);
  atlasMake("circle", { class: "atl-mark-dot", cx: 9.4, cy: 14.6, r: 1.1 }, bang);
  const tear = atlasGroup(fx, "atl-fx-tear");
  atlasDrop(atlasGroup(tear, "atl-fall", [20.4, 32]), 20.4, 32, 1.3, "atl-drop");
  const sweat = atlasGroup(fx, "atl-fx-sweat");
  atlasDrop(atlasGroup(sweat, "atl-fall atl-slow", [46.6, 18]), 46.6, 18, 1.3, "atl-drop");
  return fx;
}

//: The mane, the ears and the wisps. The mane is drawn behind the head
//: (its roots hidden under the crown), the ears and the wisps over it; all
//: of them perk up with a good mood and droop with a low one
//: (`--atl-crest`, the left ear mirrored). Drawn like the body: the edges
//: under every fill, then the fills. Each lock is translucent with a
//: lighter leading edge and speckle stars; each ear has its inner ear of
//: galaxy and a star at the tip; the feminine ears trail a wisp down
//: beside the cheek.
function atlasMane(parent, level, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  if (level === "tiny") return null;
  const locks = level === "head" ? spec.headPaths : spec.lockPaths;
  const mane = atlasGroup(parent, "atl-crest atl-mane", ATLAS_GEO.hair);
  //: The lower locks first, so the upper ones lie over them.
  locks.slice().reverse().forEach((lock) => {
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin atl-lock", d: lock.fill }, mane);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-hair-neb", d: lock.fill }, mane);
      atlasMake("path", { class: "atl-hair-light", d: lock.light }, mane);
    }
  });
  if (!edge) {
    for (const [cx, cy, r] of [[44, 9.6, 0.3], [50, 14, 0.24], [53, 22, 0.3], [49, 30, 0.2], [55, 36, 0.24]]) atlasMake("circle", { class: "atl-speck atl-speck-soft", cx, cy, r }, mane);
    //: The feminine look's hair carries a constellation (the reference's
    //: "long flowing hair with constellations"): star points along the
    //: locks, threaded.
    if (spec.hairStars && level !== "head") {
      atlasMake("path", { class: "atl-thread atl-hair-thread", d: spec.hairStars.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") }, mane);
      for (const [cx, cy] of spec.hairStars) atlasMake("circle", { class: "atl-node-dot", cx, cy, r: 0.6 }, mane);
    }
  }
  return mane;
}

function atlasEars(parent, level, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const tiny = level === "tiny";
  const out = {};
  for (const side of ["l", "r"]) {
    const m = (d) => (side === "l" ? d : atlasMirror(d));
    const g = atlasGroup(parent, `atl-crest atl-ear atl-ear-${side}`, ATLAS_GEO.ear[side === "l" ? 0 : 1]);
    if (spec.strand && !tiny) atlasMake("path", { class: edge ? "atl-edge" : "atl-skin atl-strand", d: m(spec.strand) }, g);
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: m(spec.ear) }, g);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-rim-limb", d: m(spec.ear) }, g);
      atlasMake("path", { class: "atl-ear-in", d: m(spec.earIn) }, g);
      if (!tiny) {
        for (const [x, y, r] of [[17.4, 6.2, 0.28], [19.6, 9.4, 0.2], [18.2, 4.4, 0.16]]) atlasMake("circle", { class: "atl-speck", cx: side === "l" ? x : 62 - x, cy: y, r }, g);
        const [tx, ty] = spec.earTip;
        atlasSpark(g, side === "l" ? tx : 62 - tx, ty, 1.1, "atl-glint atl-hair-star");
      }
    }
    out[side] = g;
  }
  const wisps = atlasGroup(parent, "atl-crest atl-wisps", ATLAS_GEO.hair);
  for (const d of ATLAS_WISPS) {
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, wisps);
    if (!edge && !tiny) atlasMake("path", { class: "atl-overlay atl-hair-neb", d }, wisps);
  }
  out.wisps = wisps;
  return out;
}

//: **The tail**, from the lower back: its root inside the hips, under the
//: body, so it grows out with no seam. `.atl-tail` takes the pose and the
//: mood (lying along a ledge, hanging, curled, lifted, drooping);
//: `.atl-tail-swish` inside it takes the loop (a slow sway at rest, a wag
//: when pleased). A ribbon of cosmic water: the body's blue runs into navy
//: galaxy along it (a gradient along its length), two narrower streams
//: weave inside it, star dots ride it, and the tip is a bright comet glow.
function atlasTail(layer, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const tail = atlasGroup(layer, "atl-tail", ATLAS_GEO.tail);
  const swish = atlasGroup(tail, "atl-tail-swish", ATLAS_GEO.tail);
  atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: spec.tailPath }, swish);
  if (edge) return tail;
  atlasMake("path", { class: "atl-overlay atl-tail-galaxy", d: spec.tailPath }, swish);
  atlasMake("path", { class: "atl-tail-silk", d: spec.silkPath }, swish);
  atlasMake("path", { class: "atl-tail-stream", d: spec.streamPath }, swish);
  atlasMake("path", { class: "atl-tail-edge", d: spec.tailPath }, swish);
  const stars = atlasGroup(swish, "atl-tail-core");
  for (const [x, y, r] of spec.tailStars) atlasMake("circle", { class: "atl-speck", cx: x, cy: y, r }, stars);
  const [tx, ty] = spec.tailTip;
  atlasMake("circle", { class: "atl-tip-glow", cx: tx, cy: ty, r: 8 }, stars);
  atlasMake("circle", { class: "atl-tip-core", cx: tx, cy: ty, r: 2.4 }, stars);
  atlasSpark(stars, tx, ty, 2.4, "atl-glint");
  atlasSpark(stars, tx - 4, ty - 3.4, 1, "atl-glint atl-ring-glint").style.setProperty("--atl-k", "7");
  atlasSpark(stars, tx + 2.6, ty + 3.8, 0.8, "atl-glint atl-ring-glint").style.setProperty("--atl-k", "8");
  return tail;
}

//: **The nebula strand** (the reference's galaxy band; light and
//: secondary): the back sweep under everything, the short front crossing
//: over the legs, each one gradient path with a pale glowing edge and a
//: few star dots.
function atlasBand(layer, front) {
  const g = atlasGroup(layer, `atl-band atl-band-${front ? "front" : "back"}`);
  const d = front ? ATLAS_BAND_FRONT : ATLAS_BAND_BACK;
  atlasMake("path", { class: "atl-band-glow", d }, g);
  atlasMake("path", { class: "atl-band-fill", d }, g);
  atlasMake("path", { class: "atl-overlay atl-band-neb", d }, g);
  atlasMake("path", { class: "atl-band-edge", d }, g);
  for (const [x, y, r] of ATLAS_BAND_STARS) {
    if ((y >= 62) === front) atlasMake("circle", { class: "atl-speck", cx: x, cy: y, r }, g);
  }
  return g;
}

// --- the companion's props, in Atlas's own language ---------------------------
//: The companion shows a prop slot (`.nmp-*`, the character interface in
//: avatars.js) while something is going on around it. Atlas answers each
//: in its own materials, light and notes: glowing cups for music (its
//: glints pulse to the beat, in the CSS), a crescent moon hung on its ear
//: at night, half-moon lenses of light for a long read, a bell of light
//: for a reminder, one of its own stars held up as a lantern, offline a
//: snapped link between two notes (and, in the CSS, the whole figure
//: goes dark navy with its constellation faint), and a translucent bubble
//: round it when it is startled. Drawn for the companion's figure only,
//: hidden until asked.
function atlasHeadProps(sway, ears, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const phones = atlasGroup(sway, "nmp nmp-headphones");
  atlasMake("path", { class: "atl-prop-band", d: "M18.6 26C17 9.4 45 9.4 43.4 26" }, phones);
  for (const x of [18.8, 43.2]) {
    atlasMake("rect", { class: "atl-prop-cup", x: x - 2.8, y: 21, width: 5.6, height: 10.4, rx: 2.8 }, phones);
    atlasMake("circle", { class: "atl-prop-cup-glow", cx: x, cy: 26.2, r: 1.3 }, phones);
  }
  const note = atlasGroup(phones, "atl-prop-note", [9, 14]);
  atlasMake("path", { class: "atl-prop-note-ink", d: "M9.6 15.6V8.4L14 7.2V14.4" }, note);
  for (const [x, y] of [[8.2, 15.8], [12.6, 14.6]]) atlasMake("ellipse", { class: "atl-prop-note-head", cx: x, cy: y, rx: 1.6, ry: 1.2 }, note);
  const moon = atlasGroup(ears.r, "nmp nmp-nightcap");
  const [mx, my] = [62 - spec.earTip[0] + 3, spec.earTip[1] + 3];
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: mx, cy: my, r: 5.5 }, moon);
  atlasMake("path", { class: "atl-prop-moon", d: `M${mx - 0.8} ${my - 4.6}A4.6 4.6 0 1 0 ${mx + 4} ${my + 2.6}A3.7 3.7 0 1 1 ${mx - 0.8} ${my - 4.6}Z` }, moon);
  atlasSpark(moon, mx - 5.6, my - 0.8, 1.2, "atl-sparkle");
  const glasses = atlasGroup(sway, "nmp nmp-glasses");
  for (const [cx, cy] of ATLAS_GEO.eyes) {
    atlasMake("path", { class: "atl-prop-lens", d: `M${cx - 5.6} ${cy + 0.2}Q${cx} ${cy + 7} ${cx + 5.6} ${cy + 0.2}Z` }, glasses);
  }
  atlasMake("path", { class: "atl-prop-rim", d: `M${ATLAS_GEO.eyes[0][0] + 5.6} ${ATLAS_GEO.eyes[0][1] + 0.2}Q31 ${ATLAS_GEO.eyes[0][1] - 1.2} ${ATLAS_GEO.eyes[1][0] - 5.6} ${ATLAS_GEO.eyes[1][1] + 0.2}` }, glasses);
}

//: Reading (the sprite grid's `reading` cell): an open book of light under
//: the figure, its pages lit from inside with a small constellation on
//: them, the tail sweeping under it. Drawn over the tail and under the
//: legs, so Atlas sits on it; the CSS shows it while a long answer is read.
function atlasBookProp(layer) {
  const book = atlasGroup(layer, "nmp nmp-book");
  atlasMake("ellipse", { class: "atl-prop-moon-glow", cx: 31, cy: 86, rx: 24, ry: 8 }, book);
  const pageL = "M31 80.6C24 78.4 16 78.8 8.6 81.4C8.2 84.6 8.4 87.8 9 91C16 88.4 24 88 31 90.2Z";
  const pageR = "M31 80.6C38 78.4 46 78.8 53.4 81.4C53.8 84.6 53.6 87.8 53 91C46 88.4 38 88 31 90.2Z";
  for (const d of [pageL, pageR]) atlasMake("path", { class: "atl-prop-page", d }, book);
  atlasMake("path", { class: "atl-prop-page-edge", d: "M9 91C16 88.4 24 88 31 90.2C38 88 46 88.4 53 91" }, book);
  atlasMake("path", { class: "atl-thread", d: "M14 84.6L19 82.8L23 85.4L27.6 83.2M35 83.2L40 85.2L44.6 82.6L49 84.8" }, book);
  for (const [x, y] of [[14, 84.6], [19, 82.8], [23, 85.4], [27.6, 83.2], [35, 83.2], [40, 85.2], [44.6, 82.6], [49, 84.8]]) {
    atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r: 0.55 }, book);
  }
  return book;
}

//: The hand slots. The companion raises the right arm (-100deg at the
//: shoulder, set in the CSS for Atlas's short arm) to hold a bell or a
//: lantern up, so each is drawn turned the other way about the hand and
//: comes out upright once the arm is up.
function atlasHandProps(armR, armL) {
  const hand = [48.2, 60];
  const upright = atlasMake("g", { transform: `rotate(100 ${hand[0]} ${hand[1]})` }, armR);
  const bell = atlasGroup(upright, "nmp nmp-bell");
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: 48.2, cy: 66.2, r: 6.5 }, bell);
  atlasMake("path", { class: "atl-prop-bell", d: "M44.2 68C44.2 61.6 52.2 61.6 52.2 68L53.6 69.8H42.8Z" }, bell);
  atlasMake("circle", { class: "atl-prop-bell-dot", cx: 48.2, cy: 71.1, r: 1.1 }, bell);
  const lantern = atlasGroup(upright, "nmp nmp-lantern");
  atlasMake("path", { class: "atl-prop-string", d: "M48.2 61V63.6" }, lantern);
  atlasMake("circle", { class: "nmp-lantern-glow atl-prop-moon-glow", cx: 48.2, cy: 67, r: 7.5 }, lantern);
  atlasMake("circle", { class: "atl-node-dot", cx: 48.2, cy: 67, r: 3.2 }, lantern);
  atlasSpark(lantern, 48.2, 67, 1.7, "atl-sparkle");
  const cable = atlasGroup(armL, "nmp nmp-cable");
  atlasMake("path", { class: "atl-prop-link", d: "M10.4 64.2L12 67.8M14 70.8L15.8 74.6" }, cable);
  atlasMake("path", { class: "atl-prop-zap", d: "M11.6 70.2L10.4 71.2M14.4 68L15.8 67.6" }, cable);
  for (const [x, y, r] of [[9.6, 62.8, 1.9], [16.4, 76, 1.9]]) atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r }, cable);
}

//: The head: mane, ears, wisps and skin in the edge layer; the mane's
//: fills (behind the head); the head's fill and rim shade; the ears and
//: wisps over it; the specular, blush, eyes, brows, mouths, then the
//: extras.
function atlasHead(parent, id, level, look) {
  const tiny = level === "tiny";
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const head = atlasGroup(parent, "atl-head", ATLAS_GEO.neck);
  const sway = atlasGroup(head, "atl-sway", ATLAS_GEO.neck);
  atlasMane(sway, level, true, look);
  atlasEars(sway, level, true, look);
  atlasMake("path", { class: "atl-edge", d: tiny ? ATLAS_HEAD_PATH : ATLAS_HEAD_EDGE }, sway);
  atlasMane(sway, level, false, look);
  atlasMake("path", { class: "atl-skin", d: ATLAS_HEAD_PATH }, sway);
  if (!tiny) atlasMake("path", { class: "atl-overlay atl-rim-head", d: ATLAS_HEAD_PATH }, sway);
  const ears = atlasEars(sway, level, false, look);
  if (!tiny) {
    for (const [cx, cy, r] of [[40.4, 15.4, 0.34], [42.2, 20.2, 0.26], [20.6, 28.4, 0.26]]) atlasMake("circle", { class: "atl-speck atl-speck-soft", cx, cy, r }, sway);
    atlasMake("ellipse", { class: "atl-sheen atl-sheen-head", cx: 25.4, cy: 14.6, rx: 5.6, ry: 3, transform: "rotate(-34 25.4 14.6)" }, sway);
    atlasMake("circle", { class: "atl-sheen atl-sheen-dot", cx: 20.8, cy: 19.6, r: 0.9 }, sway);
  }
  for (const [x, y] of ATLAS_GEO.cheeks) atlasMake("ellipse", { class: "atl-cheek", cx: x, cy: y, rx: tiny ? 3.2 : 3, ry: tiny ? 1.9 : 1.8 }, sway);
  for (const eye of ATLAS_GEO.eyes) atlasEye(sway, id, eye, tiny, spec.lashes);
  if (!tiny) {
    for (const [x, y, side] of ATLAS_GEO.brows) {
      const brow = atlasGroup(sway, `atl-brow atl-brow-${side > 0 ? "l" : "r"}`, [x, y]);
      const d = spec.brow === "straight"
        ? `M${x - 2.8 * side} ${y - 0.1}Q${x} ${y - 0.8} ${x + 2.8 * side} ${y + 0.5}`
        : `M${x - 2.6 * side} ${y - 0.2}Q${x - 0.3 * side} ${y - 1.9} ${x + 2.6 * side} ${y + 0.8}`;
      atlasMake("path", { class: `atl-stroke atl-brow-line atl-brow-${spec.brow}`, d }, brow);
    }
  }
  const [mx, my] = ATLAS_GEO.mouth;
  const place = atlasMake("g", { transform: tiny ? `translate(${mx} ${my - 1}) scale(0.72) translate(-32 -38)` : `translate(${mx} ${my}) scale(0.5) translate(-32 -38)` }, sway);
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
      atlasMake("path", { class: "atl-stroke", d: shape.d, "stroke-width": tiny ? 3.2 : 2.4 }, g);
    }
  }
  if (!tiny) atlasExtras(sway);
  //: Thinking, a hand at the chin (the reference sheet): drawn here, over
  //: the head, because the body's own arm is drawn under it; the CSS shows
  //: it and hides the resting right arm while Atlas thinks.
  if (level === "full" || level === "figure") {
    const hand = atlasGroup(sway, "atl-chin-hand");
    atlasMake("path", { class: "atl-edge", d: ATLAS_CHIN_HAND }, hand);
    atlasMake("path", { class: "atl-skin", d: ATLAS_CHIN_HAND }, hand);
    atlasMake("path", { class: "atl-overlay atl-rim-limb", d: ATLAS_CHIN_HAND }, hand);
  }
  if (level === "figure") atlasHeadProps(sway, ears, look);
  return head;
}

function atlasRing(parent, id, ring, k, front) {
  const { cx, cy, flat, tilt } = ATLAS_GEO.ringFrame;
  const { r, glints } = ring;
  const g = atlasGroup(parent, `atl-ring atl-ring-${k} atl-ring-${front ? "front" : "back"}`, [cx, cy]);
  const frame = atlasMake("g", { transform: `translate(${cx} ${cy}) rotate(${tilt}) scale(1 ${flat})` }, g);
  if (front) frame.setAttribute("clip-path", `url(#${id}-front)`);
  atlasMake("circle", { class: "atl-ring-glow", r }, frame);
  atlasMake("circle", { class: "atl-ring-line", r }, frame);
  const drift = atlasGroup(frame, "atl-ring-drift", [0, 0]);
  atlasMake("circle", { class: "atl-dust", r }, drift);
  const a = (tilt * Math.PI) / 180;
  glints.forEach(([deg, size, kind], i) => {
    const t = (deg * Math.PI) / 180;
    if (Math.sin(t) > 0 !== front) return;
    const fx = r * Math.cos(t);
    const fy = r * Math.sin(t) * flat;
    const x = +(cx + fx * Math.cos(a) - fy * Math.sin(a)).toFixed(2);
    const y = +(cy + fx * Math.sin(a) + fy * Math.cos(a)).toFixed(2);
    if (kind === "star") {
      atlasSpark(g, x, y, size * 1.6, "atl-ring-glint").style.setProperty("--atl-k", String(i + k * 3));
      return;
    }
    atlasMake("circle", { class: `atl-planet atl-planet-${kind}`, cx: x, cy: y, r: size }, g);
    atlasMake("circle", { class: "atl-planet-light", cx: x - size * 0.3, cy: y - size * 0.32, r: size * 0.36 }, g);
  });
  return g;
}

//: The body, in the companion's part names so its behaviours can act it
//: out: legs from the hips, the raised arms it hangs and cheers with, the
//: torso with the constellation in it, and the resting arms. Each part is
//: drawn in the edge layer and again in the fill layer (see the design
//: note), with the same classes, so the companion moves both copies. The
//: tail goes first in each layer, behind the legs and the torso.
//: The body, in the companion's part names so its behaviours can act it
//: out: legs from the hips, the raised arms it hangs and cheers with, the
//: torso with the constellation in it, and the resting arms. Each part is
//: drawn in the edge layer and again in the fill layer (see the design
//: note), with the same classes, so the companion moves both copies. The
//: nebula strand's back sweep goes first, then the tail, behind the legs
//: and the body; the strand's front crossing comes after the legs, under
//: the body; the arms last. Each leg holds its tendril in a group of its
//: own (`.atl-tendril`, pivoted at the hip) so the tip can drift.
function atlasBody(parent, id, props, look) {
  const layers = { edge: atlasGroup(parent, "atl-edges"), fill: atlasGroup(parent, "atl-fills") };
  const arms = {};
  atlasBand(layers.edge, false);
  for (const [kind, layer] of Object.entries(layers)) {
    const edge = kind === "edge";
    atlasTail(layer, edge, look);
    if (!edge && props) atlasBookProp(layer);
    ATLAS_LIMBS.legs.forEach(([side, d], i) => {
      const leg = atlasGroup(layer, `nmb-leg nmb-leg-${side} atl-leg`);
      const tendril = atlasGroup(leg, `atl-tendril atl-tendril-${side}`, ATLAS_GEO.hips[i]);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, tendril);
      if (!edge) atlasMake("path", { class: "atl-overlay atl-rim-limb", d }, tendril);
    });
    if (!edge) atlasBand(layer, true);
    for (const [side, d] of ATLAS_LIMBS.holds) {
      const hold = atlasGroup(layer, `nmb-hold nmb-hold-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, hold);
      if (!edge) atlasMake("path", { class: "atl-overlay atl-rim-limb", d }, hold);
    }
    const torso = atlasGroup(layer, "nmb-torso");
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: ATLAS_TORSO_PATH }, torso);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-belly", d: ATLAS_TORSO_PATH }, torso);
      atlasMake("path", { class: "atl-overlay atl-rim-body", d: ATLAS_TORSO_PATH }, torso);
      //: The constellation: the heart star in its glow, then the linked
      //: points down the belly, threads of light between them.
      const core = atlasGroup(torso, "atl-core", ATLAS_GEO.constellation[0]);
      const [hx, hy] = ATLAS_GEO.constellation[0];
      atlasMake("ellipse", { class: "atl-core-glow", cx: hx, cy: hy + 0.6, rx: 8.2, ry: 8.8 }, core);
      atlasMake("path", { class: "atl-thread", d: ATLAS_GEO.constellation.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") }, core);
      ATLAS_GEO.constellation.slice(1).forEach(([x, y], i) => {
        atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r: 0.75 }, core).style.setProperty("--atl-k", String(i));
      });
      //: The pulsar heart (the reference's Pulsar Heart cell): four long
      //: thin rays, four short ones between, the four-point star over
      //: them and a bright core.
      const star = atlasGroup(core, "atl-star", [hx, hy]);
      atlasMake("path", { class: "atl-core-rays", d: `M${hx} ${hy - 7.6}L${hx + 0.8} ${hy}L${hx} ${hy + 6.4}L${hx - 0.8} ${hy}ZM${hx - 6} ${hy}L${hx} ${hy - 0.7}L${hx + 6} ${hy}L${hx} ${hy + 0.7}Z` }, star);
      atlasMake("path", { class: "atl-core-rays atl-core-rays-x", d: `M${hx - 3.2} ${hy - 3.2}L${hx} ${hy - 0.5}L${hx + 3.2} ${hy + 3.2}L${hx} ${hy + 0.5}ZM${hx + 3.2} ${hy - 3.2}L${hx} ${hy - 0.5}L${hx - 3.2} ${hy + 3.2}L${hx} ${hy + 0.5}Z` }, star);
      atlasSpark(star, hx, hy, 3.6, "atl-chest-star");
      atlasMake("circle", { class: "atl-core-dot", cx: hx, cy: hy, r: 1 }, star);
      //: The gloss on the gel: one specular on the upper left of the body.
      atlasMake("ellipse", { class: "atl-sheen atl-sheen-body", cx: 25.6, cy: 42.6, rx: 1.1, ry: 2.8, transform: "rotate(14 25.6 42.6)" }, torso);
    }
    for (const [side, d] of ATLAS_LIMBS.arms) {
      const arm = atlasGroup(layer, `nmb-arm nmb-arm-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, arm);
      if (!edge) {
        atlasMake("path", { class: "atl-overlay atl-rim-limb", d }, arm);
        arms[side] = arm;
      }
    }
  }
  if (props) {
    atlasHandProps(arms.r, arms.l);
    //: Startled, a translucent bubble round the whole figure (the
    //: reference's `startle` cell); the CSS shows it.
    const bubble = atlasGroup(layers.fill, "nmp nmp-bubble");
    atlasMake("ellipse", { class: "atl-bubble", cx: 31, cy: 48, rx: 36, ry: 46 }, bubble);
    atlasMake("ellipse", { class: "atl-bubble-shine", cx: 14, cy: 20, rx: 6, ry: 3.2, transform: "rotate(-40 14 20)" }, bubble);
  }
}

//: The gradients, per drawing (ids are per drawing, so two on a page never
//: share one): the skin in the drawing's own space, so mane, head, arms
//: and body are one continuous surface; the lighter belly; the rim shades;
//: the specular; the iris; the constellation's glow; the tail's galaxy;
//: the inner ears; the strand's nebula; each eye's clip; and the rings'
//: front halves.
function atlasDefs(svg, id, level) {
  const defs = atlasMake("defs", {}, svg);
  const stops = (grad, list) => {
    for (const [offset, cls] of list) atlasMake("stop", { offset, class: cls }, grad);
  };
  const skin = atlasMake("radialGradient", { id: `${id}-skin`, gradientUnits: "userSpaceOnUse", cx: 26, cy: 16, r: 74, fx: 25, fy: 13 }, defs);
  stops(skin, [[0, "atl-st-hi"], [0.16, "atl-st-lt"], [0.42, "atl-st-md"], [0.78, "atl-st-dp"], [1, "atl-st-rim"]]);
  const belly = atlasMake("radialGradient", { id: `${id}-belly`, gradientUnits: "userSpaceOnUse", cx: 30, cy: 56, r: 14 }, defs);
  stops(belly, [[0, "atl-st-white-mid"], [1, "atl-st-white-0"]]);
  //: Rim shades: clear in the middle, violet at the edge. The head's and
  //: the body's are in the drawing's space (their light is where the
  //: specular is); a limb's is in its own box, centred toward its root so
  //: the joint stays clear and the tip rounds off.
  const rimHead = atlasMake("radialGradient", { id: `${id}-rimh`, gradientUnits: "userSpaceOnUse", cx: 27.5, cy: 19, r: 20 }, defs);
  stops(rimHead, [[0.62, "atl-st-clear"], [1, "atl-st-shade"]]);
  const rimBody = atlasMake("radialGradient", { id: `${id}-rimb`, gradientUnits: "userSpaceOnUse", cx: 29.5, cy: 50, r: 18 }, defs);
  stops(rimBody, [[0.5, "atl-st-clear"], [1, "atl-st-shade"]]);
  const rimLimb = atlasMake("radialGradient", { id: `${id}-riml`, cx: 0.5, cy: 0.15, r: 0.95 }, defs);
  stops(rimLimb, [[0.55, "atl-st-clear"], [1, "atl-st-shade"]]);
  const sheen = atlasMake("radialGradient", { id: `${id}-sheen` }, defs);
  stops(sheen, [[0, "atl-st-white"], [0.55, "atl-st-white-mid"], [1, "atl-st-white-0"]]);
  const aura = atlasMake("radialGradient", { id: `${id}-aura` }, defs);
  stops(aura, [[0, "atl-st-aura0"], [0.5, "atl-st-aura1"], [1, "atl-st-aura2"]]);
  const core = atlasMake("radialGradient", { id: `${id}-core` }, defs);
  stops(core, [[0, "atl-st-core0"], [1, "atl-st-core1"]]);
  const iris = atlasMake("linearGradient", { id: `${id}-iris`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  stops(iris, [[0, "atl-st-iris0"], [0.7, "atl-st-iris1"], [1, "atl-st-iris2"]]);
  //: The tail: the body's blue into navy galaxy along its length, with a
  //: lilac nebula on the way, and white starlight at its tip.
  const galaxy = atlasMake("radialGradient", { id: `${id}-galaxy`, gradientUnits: "userSpaceOnUse", cx: 36, cy: 64, r: 40 }, defs);
  stops(galaxy, [[0.12, "atl-st-galaxy0"], [0.5, "atl-st-galaxy1"], [0.8, "atl-st-galaxy2"], [1, "atl-st-galaxy3"]]);
  //: The inner ears and the mane's ends: navy through violet to lilac.
  const hairNeb = atlasMake("radialGradient", { id: `${id}-hneb`, cx: 0.7, cy: 0.1, r: 0.9 }, defs);
  stops(hairNeb, [[0, "atl-st-neb20"], [0.5, "atl-st-neb0"], [1, "atl-st-neb1"]]);
  const earIn = atlasMake("linearGradient", { id: `${id}-earin`, x1: 0, y1: 0, x2: 0.4, y2: 1 }, defs);
  stops(earIn, [[0, "atl-st-navy"], [0.55, "atl-st-neb20"], [1, "atl-st-neb0"]]);
  //: The nebula strand: pink and violet clouds along the band.
  const bandNeb = atlasMake("radialGradient", { id: `${id}-bneb`, gradientUnits: "userSpaceOnUse", cx: 28, cy: 50, r: 34 }, defs);
  stops(bandNeb, [[0, "atl-st-neb0"], [0.5, "atl-st-neb20"], [1, "atl-st-neb1"]]);
  const tip = atlasMake("radialGradient", { id: `${id}-tip` }, defs);
  stops(tip, [[0, "atl-st-white"], [0.4, "atl-st-white-mid"], [1, "atl-st-white-0"]]);
  if (level !== "tiny") {
    for (const [cx, cy, side] of ATLAS_GEO.eyes) {
      const clip = atlasMake("clipPath", { id: `${id}-e${side > 0 ? "l" : "r"}` }, defs);
      atlasMake("path", { d: atlasAlmond(cx, cy, side).d }, clip);
    }
  }
  //: The rings' front halves, in the ring frame.
  const front = atlasMake("clipPath", { id: `${id}-front` }, defs);
  atlasMake("rect", { x: -50, y: 0, width: 100, height: 50 }, front);
  //: The paints name their gradients through custom properties, so the CSS
  //: can say "skin" without knowing this drawing's id.
  for (const name of ["skin", "belly", "rimh", "rimb", "riml", "sheen", "aura", "core", "iris", "galaxy", "hneb", "earin", "bneb", "tip"]) {
    svg.style.setProperty(`--atl-${name}`, `url(#${id}-${name})`);
  }
}

//: What each level shows, and the box it is drawn in. `full` keeps margins
//: for the glow, the rings, the mane, the tail and a raised hand; `head` is
//: square round the head, its ears and a shorter cut of the mane; `tiny`
//: crops tighter because at 16px every unit counts.
const ATLAS_LEVELS = {
  full: { viewBox: [-12, -10, 88, 110], body: true },
  figure: { viewBox: [0, 0, 64, 92], body: true },
  //: Head and shoulders, square: the whole figure drawn and cropped at the
  //: chest star, so the rings, the mane and the strand's first sweep show.
  bust: { viewBox: [4, -8, 54, 54], body: true },
  head: { viewBox: [7, -6, 50, 50], body: false },
  tiny: { viewBox: [10, -4, 42, 44], body: false },
};

function atlasLevelFor(size) {
  if (size < 28) return "tiny";
  if (size < 96) return "head";
  return "full";
}

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
  const look = atlasLook();
  svg.dataset.atlasLook = look;
  svg.style.setProperty("--nm-delay", "-1.3s");
  atlasMake("title", {}, svg);
  atlasDefs(svg, id, level);
  const anchor = spec.body ? ATLAS_GEO.feet : ATLAS_GEO.chin;
  const pose = atlasGroup(svg, "atl-pose", anchor);
  if (level !== "tiny") {
    const aura = spec.body ? { cx: 31, cy: 44, rx: 40, ry: 52 } : { cx: 31, cy: 20, rx: 26, ry: 26 };
    atlasMake("ellipse", { class: "atl-aura", ...aura }, pose);
  }
  const moodLoop = atlasGroup(pose, "atl-mood", anchor);
  const rig = atlasGroup(moodLoop, "atl-rig", anchor);
  if (spec.body) {
    ATLAS_GEO.rings.forEach((ring, k) => atlasRing(rig, id, ring, k, false));
    atlasBody(rig, id, figure, look);
  }
  //: The companion turns the head where it sits on the body
  //: (`.nm-buddy-head`) and looks for its face (`.name-mark`, with
  //: `.nm-eyes` and `.nm-blinks` in it).
  let host = rig;
  if (figure) {
    host = atlasGroup(rig, "nm-buddy-head", ATLAS_GEO.neck);
    host = atlasGroup(host, "name-mark atl-face");
  }
  atlasHead(host, id, level, look);
  if (spec.body) ATLAS_GEO.rings.forEach((ring, k) => atlasRing(rig, id, ring, k, true));
  atlasApply(svg, mood);
  if (!figure) watchNameMark(svg);
  return svg;
}

//: **The avatar** (the owner: "maybe the atlas guide can have the atlas
//: avatar?? same with the popup agent and find anything search??"): head
//: and shoulders at any size. `atlasDressMarks` fills every
//: `[data-atlas-avatar="<px>"]` host on the page with one, once the
//: document is ready, so the markup keeps a plain icon as its fallback.
function atlasAvatar(size = 32, mood = atlasMoodNow) {
  return atlasDraw(size, mood, "bust");
}

function atlasDressMarks(root = document) {
  for (const host of root.querySelectorAll("[data-atlas-avatar]")) {
    const size = Number(host.dataset.atlasAvatar) || 32;
    host.replaceChildren(atlasAvatar(size));
  }
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
    const size = Number(svg.getAttribute("height")) || 20;
    svg.replaceWith(svg.classList.contains("atl-bust") ? atlasAvatar(size) : atlasDraw(size));
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

//: The avatar hosts in the markup are dressed once the page is parsed;
//: atlas.js loads at the end of the body, so the document is usually ready
//: already.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => atlasDressMarks());
else atlasDressMarks();
