// atlas.js: Atlas, the assistant's own character. Loaded straight after
// avatars.js, whose `registerCharacter` it answers through; every other file
// reaches it by the old names (`atlasMark`, `setAtlasMood`,
// `atlasRestingMood`), so no call site changed when it moved here.
//
//: **The design note.** Atlas is a small celestial spirit: the owner's
//: reference sheets (the "conceptual art" pose sheet first, then the glossy
//: gel sheets for the material) draw a round-headed creature of soft
//: lavender light with two flame tufts, a constellation traced inside its
//: body, thin orbit rings with tiny planets, and a galaxy ribbon that wraps
//: round it and streams away as a comet tail. The owner's verdicts on the
//: drafts before this one set the constraints: "cool and aura", "cute but
//: not fat baby cute", "like a pokemon or Rimuru", "better hands and feet",
//: "the arms and legs aren't properly attached", and of the last draft,
//: "they look like a space onion". That one had a small head on a neck
//: under a layered spike, heavy dark outlines, opaque fills and too many
//: bands; each of those is a rule below.
//:
//: - **Proportions** (the companion's 64 by 92 box, one unit is one px at
//:   the companion's size). The head is a soft round, 41 wide and 43 tall,
//:   from y 4.8 to 47.6: 47% of the box, and with the tufts above it the
//:   head reads as more than half the figure. There is no neck: the head
//:   sits straight on the body, whose top is hidden under the chin. The
//:   body is short and slim (18 wide at the shoulders, the seat at 72),
//:   the legs are short soft stems with rounded feet (72 to 90), the arms
//:   tapered nubs with rounded tips. The eyes are large, each a third of
//:   the head's width, set low, at y 30.
//: - **One silhouette.** Every limb is a tapered stem generated from a
//:   centreline (`atlasStem`): thick where it grows out of the body, fine
//:   and round at the tip, its root well inside the torso. All outlines are
//:   drawn first as one layer (`atl-edges`) and every fill on top
//:   (`atl-fills`), so where parts overlap the fills close the seams and
//:   the figure has one outer contour. Each limb is in both layers under
//:   the same companion class, so a pose turns outline and fill together
//:   about a joint inside the torso. The tufts are drawn the same way, so
//:   head and tufts are one shape.
//: - **Material.** Soft translucent gel of light: one radial gradient in
//:   the drawing's own space (a near-white core at the upper left of the
//:   head, through lavender and periwinkle to violet at the far rim) fills
//:   head, tufts, body and limbs alike, so the light falls on the whole
//:   figure at once. On top: a rim shade per part (a radial gradient that
//:   is clear in the middle and violet at the edge, so each part rounds
//:   off), a soft specular on the head's upper left and a smaller one on
//:   the body (white through a radial fade, no hard edge), a few specks
//:   inside, and one thin soft outline in deep lavender, half the width of
//:   a cartoon line. No filters anywhere: every glow is a radial gradient.
//: - **The signature.** A constellation of thin light lines and star points
//:   traced inside the chest and belly, with a brighter four-point star at
//:   the heart in a soft glow: the logo's hub and linked notes, worn
//:   inside. Three thin concentric rings of light orbit the shoulders at a
//:   tilt, passing behind the head and in front of the chest, each with a
//:   tiny planet or star glint on it. One galaxy ribbon, a band of deep
//:   navy full of violet and pink nebula and star dots with a glowing pale
//:   edge, comes from behind the body on the right, wraps behind and
//:   round to the left, crosses in front of the legs and streams out to
//:   the right as a comet tail that tapers to a bright tip. It is one
//:   path in two layers (whole, under the body; whole again over it,
//:   clipped to everything outside head and torso), so it wraps in depth
//:   with no seam. Restraint: nothing else is added to the body.
//: - **Two looks of one character** (Settings, Appearance, Atlas look,
//:   `atlasLook`): the same head, face, body, rings and ribbon. Feminine:
//:   longer flowing tufts that end in a curl, lashes, arched brows.
//:   Masculine: shorter swept tufts, straighter brows, no lashes.
//: - **Palette.** Everything comes from the live `--accent` through CSS
//:   (`oklch(from var(--accent) ...)` with fixed lightness, `color-mix`
//:   where relative colours are missing), so it follows the theme and any
//:   accent: the body is the accent lifted to lavender, the ribbon the
//:   accent taken down to navy, the nebula the accent turned sixty degrees
//:   round the hue (pink beside blue, gold beside a warm accent), the eyes
//:   the accent's own deep navy. The planets keep four fixed colours, the
//:   blush one fixed pink.
//: - **Face.** Big almond eyes, outer corners lifted, a deep iris that
//:   lightens toward its foot, a large catchlight and a small one; lids
//:   that slide and tilt; brows that rise, knit and slant; twelve mouths;
//:   cheeks that blush. Fifteen moods, each a combination of all of these
//:   plus head tilt, body squash, tuft and ring lift and star brightness
//:   and one small extra (sparkles, hearts, a thought, a tear). The
//:   combinations are CSS (`[data-atlas-mood]` in 08-consistency.css); this
//:   file draws the parts and says which mood.
//: - **Life.** Breathing squash and stretch from the feet, blinks with an
//:   occasional double blink, the ribbon swaying with its stars glinting,
//:   the planets' dust drifting round the rings, a slow head sway and the
//:   glow pulsing. All of it is CSS transform and opacity on this one SVG,
//:   runs only while the mark is on screen and motion is on, slows under
//:   Reduce motion and stops under Avatar animation Off.
//: - **Sizes.** `full` (a figure with margins, 96px and up: the welcome,
//:   the large view), `figure` (the companion's 64 by 92 box, parts named
//:   for the companion's behaviours), `head` (the head and its tufts, 28 to
//:   95px: the dashboard mark, chat heads, persona rows) and `tiny` (under
//:   28px: head, tufts and eyes, thicker lines, no lids, brows or motion).

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
//: a round tip (`cap`) or a point (the comet tail). Limbs, tufts, the chin
//: hand and the ribbon all come from here, which is why they match.
function atlasStem(segs, width, { samples = 10, cap = true } = {}) {
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
    left.push([x - (dy / len) * hw, y + (dx / len) * hw]);
    right.push([x + (dy / len) * hw, y - (dx / len) * hw]);
  }
  const f = (v) => +v.toFixed(2);
  const smooth = (pts) => {
    let d = "";
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
  };
  const tip = left[left.length - 1];
  const tipR = right[right.length - 1];
  const r = Math.hypot(tip[0] - tipR[0], tip[1] - tipR[1]) / 2;
  const end = cap && r > 0.05 ? `A${f(r)} ${f(r)} 0 0 1 ${f(tipR[0])} ${f(tipR[1])}` : `L${f(tipR[0])} ${f(tipR[1])}`;
  return `M${f(left[0][0])} ${f(left[0][1])}${smooth(left)}${end}${smooth(right.slice().reverse())}Z`;
}

//: A width that eases from `a` at the root to `b` at the tip.
const atlasTaper = (a, b) => (t) => a + (b - a) * (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

//: The drawing's landmarks, in the companion's 64 by 92 box: the head from
//: 4.8 to 47.6, the seat at 72, the soles at 90, the raised hands at -7.
const ATLAS_GEO = {
  eyes: [[22.6, 30.4, 1], [39.4, 30.4, -1]],
  brows: [[22.4, 20.6, 1], [39.6, 20.6, -1]],
  cheeks: [[14.6, 37.4], [47.4, 37.4]],
  mouth: [31, 43.2],
  tuft: [[16, 8], [46, 8]],
  //: The rings of light: three concentric ellipses about the shoulders,
  //: tilted, each with a planet or a glint on it, at [angle, radius,
  //: colour]. Unevenly placed on purpose, so they read as an orrery and not
  //: as beads.
  rings: [
    { r: 20.5, glints: [[300, 1.3, "pink"]] },
    { r: 25.5, glints: [[208, 1.9, "amber"], [28, 0.8, "star"]] },
    { r: 30.5, glints: [[72, 1.55, "teal"], [246, 0.95, "star"], [332, 1.3, "pale"]] },
  ],
  ringFrame: { cx: 31, cy: 45, flat: 0.34, tilt: -7 },
  //: The constellation inside the body: the heart star first, then the
  //: linked points down the belly.
  constellation: [[31, 55.5], [26.4, 60.2], [33.4, 63.4], [28.2, 67.6], [35.4, 70.2]],
  neck: [31, 46],
  feet: [31, 90],
  chin: [31, 40],
  shoulders: [[24.6, 52.4], [37.4, 52.4]],
  hips: [[27.4, 72], [34.6, 72]],
  ribbon: [31, 66],
};

//: The head: a soft round, widest at the eyes, the crown a little flatter.
const ATLAS_HEAD_PATH = "M31 47.6C21.2 47.6 10.4 41 10.4 28.6C10.4 15.4 18.8 4.8 31 4.8C43.2 4.8 51.6 15.4 51.6 28.6C51.6 41 40.8 47.6 31 47.6Z";

//: **Two looks of one character** (the design note). Each tuft is a stem
//: whose root lies inside the crown and whose tip sweeps up and out; the
//: feminine one runs longer and curls at the end. Drawn for the right side
//: and mirrored (x to 62 - x) for the left.
const ATLAS_LOOKS = {
  masculine: {
    tuft: [[40.6, 9.4, 44.6, 6.6, 46.2, 1.6, 50.8, -4.6]],
    tuftWidth: atlasTaper(8.6, 1.8),
    tip: [51, -4.8],
    brow: "straight",
    lashes: false,
  },
  feminine: {
    tuft: [[40.6, 9.4, 44.8, 6.2, 46.6, 0.6, 51.2, -6], [51.2, -6, 54.4, -10.6, 59.6, -10.2, 57.6, -6.4]],
    tuftWidth: (t) => (t < 0.5 ? 8.6 - 6.2 * (t / 0.5) : 2.4 - 1.2 * ((t - 0.5) / 0.5)),
    tip: [57.8, -6.8],
    brow: "arch",
    lashes: true,
  },
};
//: At 16 to 24px the tufts are short and plain: two little flames over the
//: head are what make the icon Atlas.
const ATLAS_TINY_TUFT = [[40.6, 9, 44.8, 6, 46.6, 1.4, 50.2, -4]];

function atlasLook() {
  return typeof appearancePref === "function" && appearancePref("atlas-look", "masculine") === "feminine" ? "feminine" : "masculine";
}

function atlasMirror(d) {
  //: Mirrors a path about x = 31 by negating every x. Only the commands
  //: `atlasStem` emits (M, C, A, L, Z) appear, so the arc's sweep flag is
  //: the one flag to flip.
  return d.replace(/([MCLA])([^MCLAZ]*)/g, (m, cmd, body) => {
    const n = body.trim().split(/[\s,]+/).map(Number);
    if (cmd === "A") return `A${n[0]} ${n[1]} 0 0 0 ${(62 - n[5]).toFixed(2)} ${n[6]}`;
    return cmd + n.map((v, i) => (i % 2 ? v : +(62 - v).toFixed(2))).join(" ");
  });
}

//: The limbs, each a stem from a root inside the torso. Legs: short soft
//: stems that swell a touch into a rounded foot. Arms: tapered nubs, angled
//: out so there is air between arm and waist. The raised arms reach the
//: companion's hand line (-7) for hanging and cheering.
const ATLAS_LEG_R = atlasStem([[34.8, 68.4, 35.4, 76, 36.2, 84, 35.6, 88.2]], (t) => 7.2 - 2.4 * t + 1.4 * Math.max(0, t - 0.7) / 0.3);
const ATLAS_ARM_R = atlasStem([[36.6, 51, 41.4, 55, 44.6, 60.4, 46.8, 66.6]], atlasTaper(5.8, 3.8));
const ATLAS_HOLD_R = atlasStem([[37.2, 52, 48, 40, 56, 20, 55.6, -4.8]], atlasTaper(5.6, 3.6), { samples: 16 });
const ATLAS_LIMBS = {
  legs: [["l", atlasMirror(ATLAS_LEG_R)], ["r", ATLAS_LEG_R]],
  arms: [["l", atlasMirror(ATLAS_ARM_R)], ["r", ATLAS_ARM_R]],
  holds: [["l", atlasMirror(ATLAS_HOLD_R)], ["r", ATLAS_HOLD_R]],
};
//: The torso: narrow shoulders under the chin, a slight waist, a rounded
//: seat that covers the legs' roots.
const ATLAS_TORSO_PATH = "M22.4 42C20.8 48.6 20.6 55 21.6 61.6C22.2 66 21.4 69.6 22.8 72.6C25.2 75.6 36.8 75.6 39.2 72.6C40.6 69.6 39.8 66 40.4 61.6C41.4 55 41.2 48.6 39.6 42Z";
//: Thinking, a hand at the chin (the reference sheet): the right arm bent
//: up, drawn over the face in the head's own group.
const ATLAS_CHIN_HAND = atlasStem([[38.6, 53, 47.4, 58, 45.6, 45.4, 37.6, 46.6]], atlasTaper(5.4, 3.6), { samples: 14 });

//: **The galaxy ribbon.** One centreline: it starts behind the body's right
//: side, wraps behind and round to the left, crosses in front of the legs
//: and streams out to the right as the comet tail, widening across the
//: front and tapering to a point.
const ATLAS_RIBBON_SEGS = [
  [42, 52, 30, 54, 6, 54, 6, 63],
  [6, 63, 6, 71, 20, 77, 34, 79],
  [34, 79, 48, 81, 58, 76, 62, 66],
  [62, 66, 66, 58, 67, 50, 65, 44],
];
const ATLAS_RIBBON_PATH = atlasStem(ATLAS_RIBBON_SEGS, (t) => {
  if (t < 0.25) return 0.8 + 5 * (t / 0.25);
  if (t < 0.55) return 5.8;
  return 5.8 * (1 - (t - 0.55) / 0.45) ** 1.25;
}, { samples: 10, cap: false });
//: Star dots along the ribbon, [x, y, r], and the two glints on it.
const ATLAS_RIBBON_STARS = [[9.6, 67, 0.5], [16, 73.8, 0.35], [25, 77.4, 0.55], [34.5, 79.2, 0.35], [45, 78.6, 0.5], [55.4, 73.6, 0.4], [61.6, 63.6, 0.5], [64.4, 53, 0.35], [8.4, 58.6, 0.35]];
const ATLAS_RIBBON_GLINTS = [[20.4, 76, 1.1], [51, 77.4, 0.9]];
const ATLAS_RIBBON_TIP = [65.2, 44.2];

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

//: A large almond eye, its outer corner lifted: the reference's confident,
//: open look. `side` is 1 for the eye on the viewer's left (its outer
//: corner is on the left). About a third of the head's width.
function atlasAlmond(cx, cy, side) {
  const ox = cx - 6.6 * side;
  const ix = cx + 6.1 * side;
  return {
    d: `M${ox} ${cy - 1.8}Q${cx - 1.2 * side} ${cy - 12.4} ${ix} ${cy + 0.4}Q${cx + 0.4 * side} ${cy + 9.8} ${ox} ${cy - 1.8}Z`,
    upper: `M${ox} ${cy - 1.8}Q${cx - 1.2 * side} ${cy - 12.4} ${ix} ${cy + 0.4}`,
  };
}

//: One eye: the white, then (clipped to it) the iris that looks about and
//: the lids that slide over it, the liner on its upper edge, and outside
//: the clip the three closed shapes a mood can swap the open eye for. The
//: iris is deep at the top and lit at its foot (a gradient), with a large
//: catchlight and a small one.
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
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.6, cy: cy - 2.6, r: 2 }, iris);
  } else {
    atlasMake("ellipse", { class: "atl-iris-fill", cx: cx + 0.3 * side, cy: cy - 0.4, rx: 5.6, ry: 6.6 }, iris);
    atlasMake("ellipse", { class: "atl-iris-foot", cx: cx + 0.2 * side, cy: cy + 3.2, rx: 3.2, ry: 1.9 }, iris);
    atlasMake("ellipse", { class: "atl-ink", cx: cx + 0.2 * side, cy: cy - 0.8, rx: 2.5, ry: 3.1 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx - 2.1, cy: cy - 3.2, r: 1.9 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx + 2.2, cy: cy + 2.4, r: 0.8 }, iris);
    const heart = atlasGroup(pupil, "atl-heart-eye");
    atlasHeart(heart, cx, cy + 0.6, 4.6, "atl-heart");
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.8, cy: cy - 1.6, r: 0.9 }, heart);
    //: The upper lid is the head's own skin sliding down over the white,
    //: with a lash line on its edge; the lower lid rises for a squint.
    const lid = atlasGroup(inner, "atl-lid", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 8} ${cy - 20}H${cx + 8}V${cy - 6.6}Q${cx} ${cy - 5.2} ${cx - 8} ${cy - 6.6}Z` }, lid);
    atlasMake("path", { class: "atl-lash", d: `M${cx - 8} ${cy - 6.6}Q${cx} ${cy - 5.2} ${cx + 8} ${cy - 6.6}` }, lid);
    const low = atlasGroup(inner, "atl-lid-low", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 8} ${cy + 16}H${cx + 8}V${cy + 5.6}Q${cx} ${cy + 4.2} ${cx - 8} ${cy + 5.6}Z` }, low);
    atlasMake("path", { class: "atl-liner", d: shape.upper }, blink);
    if (lashes) {
      const ox = cx - 6.6 * side;
      atlasMake("path", { class: "atl-lashes", d: `M${ox} ${cy - 1.8}l${-2 * side} -1.2M${ox + 1.2 * side} ${cy - 4}l${-1.8 * side} -1.6M${ox + 3 * side} ${cy - 5.8}l${-1.2 * side} -1.8` }, blink);
    }
  }
  const w = tiny ? 3 : 2.1;
  atlasMake("path", { class: "atl-e-happy atl-stroke", "stroke-width": w, d: `M${cx - 5.6} ${cy + 1.6}Q${cx} ${cy - 6.6} ${cx + 5.6} ${cy + 1.6}` }, eye);
  atlasMake("path", { class: "atl-e-shut atl-stroke", "stroke-width": w, d: `M${cx - 5.8} ${cy - 0.6}Q${cx} ${cy + 4.6} ${cx + 5.8} ${cy - 0.6}M${cx - 5.8 * side} ${cy - 0.6}l${-1.6 * side} -1.2` }, eye);
  atlasMake("path", {
    class: "atl-e-squeeze atl-stroke",
    "stroke-width": w,
    d: `M${cx - 4 * side} ${cy - 4}L${cx + 3.4 * side} ${cy}L${cx - 4 * side} ${cy + 4}`,
  }, eye);
  return eye;
}

//: The small extras a mood can bring, each hidden until its mood asks.
//: Placed round the head, clear of the tufts.
function atlasExtras(parent) {
  const fx = atlasGroup(parent, "atl-fx");
  const sparkle = atlasGroup(fx, "atl-fx-sparkle");
  atlasSpark(sparkle, 5, 18, 2.6, "atl-sparkle");
  atlasSpark(sparkle, 58, 22, 2.1, "atl-sparkle atl-late");
  atlasSpark(sparkle, 30, -6, 1.5, "atl-sparkle atl-later");
  const hearts = atlasGroup(fx, "atl-fx-hearts");
  atlasHeart(atlasGroup(hearts, "atl-float", [57, 20]), 57, 20, 2.8, "atl-heart");
  atlasHeart(atlasGroup(hearts, "atl-float atl-late", [6, 14]), 6, 14, 2.1, "atl-heart");
  const zz = atlasGroup(fx, "atl-fx-zz");
  atlasMake("path", { class: "atl-float atl-stroke atl-z", d: "M54.4 16.6h3.2l-3.2 3.4h3.2" }, zz);
  atlasMake("path", { class: "atl-float atl-late atl-stroke atl-z", d: "M59.6 10.2h2.4l-2.4 2.6h2.4" }, zz);
  const dots = atlasGroup(fx, "atl-fx-dots");
  for (const [i, x, y, r] of [[0, 9.6, 14.8, 1.1], [1, 5.6, 10, 1.5], [2, 1, 4, 2.1]]) {
    atlasMake("circle", { class: `atl-dot atl-dot-${i}`, cx: x, cy: y, r }, dots);
  }
  const q = atlasGroup(fx, "atl-fx-q", [5, 9]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M1.8 6.6Q1.8 3.2 5 3.2Q8.2 3.2 8.2 6Q8.2 8 6 9Q4.9 9.6 4.9 11.4" }, q);
  atlasMake("circle", { class: "atl-mark-dot", cx: 4.9, cy: 14.2, r: 1 }, q);
  const bang = atlasGroup(fx, "atl-fx-bang", [5, 9]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M4.4 3V10.4" }, bang);
  atlasMake("circle", { class: "atl-mark-dot", cx: 4.4, cy: 13.6, r: 1.1 }, bang);
  const tear = atlasGroup(fx, "atl-fx-tear");
  atlasDrop(atlasGroup(tear, "atl-fall", [16.4, 38]), 16.4, 38, 1.5, "atl-drop");
  const sweat = atlasGroup(fx, "atl-fx-sweat");
  atlasDrop(atlasGroup(sweat, "atl-fall atl-slow", [54.6, 22]), 54.6, 22, 1.5, "atl-drop");
  return fx;
}

//: The two tufts, flames of light swept up from the crown. They perk up
//: with a good mood and droop with a low one (`--atl-crest`, mirrored for
//: the left). Drawn like the body: edge under every fill, then the fill,
//: then the nebula toward the tip and a star at it.
function atlasTufts(parent, tiny, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const d = tiny ? atlasStem(ATLAS_TINY_TUFT, atlasTaper(9, 2.6)) : atlasStem(spec.tuft, spec.tuftWidth, { samples: 12 });
  const out = [];
  for (const side of ["l", "r"]) {
    const tuft = atlasGroup(parent, `atl-crest atl-tuft-${side}`, ATLAS_GEO.tuft[side === "l" ? 0 : 1]);
    const path = side === "l" ? atlasMirror(d) : d;
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: path }, tuft);
    if (!edge && !tiny) {
      atlasMake("path", { class: "atl-overlay atl-tuft-neb", d: path }, tuft);
      const [tx, ty] = spec.tip;
      atlasSpark(tuft, side === "l" ? 62 - tx : tx, ty, 1.5, "atl-glint atl-tuft-star");
    }
    out.push(tuft);
  }
  return out;
}

//: **The galaxy ribbon**, once under the body and once over it (see the
//: design note). `front` clips the over copy to everything outside head
//: and torso, so the band shows only where it really passes in front. The
//: whole ribbon takes the pose and the mood (`--atl-tail`, scaled down in
//: the CSS: it is a band round the body, not a tail to wag) and sways
//: (`.atl-tail-swish`).
function atlasRibbon(layer, id, front) {
  const host = front ? atlasMake("g", { "clip-path": `url(#${id}-out)` }, layer) : layer;
  const tail = atlasGroup(host, `atl-tail atl-ribbon-${front ? "front" : "back"}`, ATLAS_GEO.ribbon);
  const swish = atlasGroup(tail, "atl-tail-swish", ATLAS_GEO.ribbon);
  atlasMake("path", { class: "atl-ribbon-glow", d: ATLAS_RIBBON_PATH }, swish);
  atlasMake("path", { class: "atl-ribbon", d: ATLAS_RIBBON_PATH }, swish);
  atlasMake("path", { class: "atl-overlay atl-ribbon-neb", d: ATLAS_RIBBON_PATH }, swish);
  atlasMake("path", { class: "atl-overlay atl-ribbon-neb2", d: ATLAS_RIBBON_PATH }, swish);
  atlasMake("path", { class: "atl-ribbon-edge", d: ATLAS_RIBBON_PATH }, swish);
  const stars = atlasGroup(swish, "atl-tail-core");
  for (const [x, y, r] of ATLAS_RIBBON_STARS) atlasMake("circle", { class: "atl-speck", cx: x, cy: y, r }, stars);
  ATLAS_RIBBON_GLINTS.forEach(([x, y, s], i) => atlasSpark(stars, x, y, s, "atl-glint atl-ring-glint").style.setProperty("--atl-k", String(i + 7)));
  const [tx, ty] = ATLAS_RIBBON_TIP;
  atlasMake("circle", { class: "atl-tip-glow", cx: tx, cy: ty, r: 5.5 }, stars);
  atlasSpark(stars, tx, ty, 1.6, "atl-glint");
  return tail;
}

// --- the companion's props, in Atlas's own language ---------------------------
//: The companion shows a prop slot (`.nmp-*`, the character interface in
//: avatars.js) while something is going on around it. Atlas answers each
//: in its own materials, light and notes: glowing cups for music (its
//: glints pulse to the beat, in the CSS), a crescent moon hung on a tuft at
//: night, half-moon lenses of light for a long read, a bell of light for a
//: reminder, one of its own stars held up as a lantern, and, offline, a
//: snapped link between two notes. Drawn for the companion's figure only,
//: hidden until asked.
function atlasHeadProps(sway, tufts) {
  const phones = atlasGroup(sway, "nmp nmp-headphones");
  atlasMake("path", { class: "atl-prop-band", d: "M11.6 30C9.4 8.6 52.6 8.6 50.4 30" }, phones);
  for (const x of [11.8, 50.2]) {
    atlasMake("rect", { class: "atl-prop-cup", x: x - 3.4, y: 23.6, width: 6.8, height: 12.4, rx: 3.4 }, phones);
    atlasMake("circle", { class: "atl-prop-cup-glow", cx: x, cy: 29.8, r: 1.6 }, phones);
  }
  const note = atlasGroup(phones, "atl-prop-note", [3, 14]);
  atlasMake("path", { class: "atl-prop-note-ink", d: "M3.6 15.6V8.4L8 7.2V14.4" }, note);
  for (const [x, y] of [[2.2, 15.8], [6.6, 14.6]]) atlasMake("ellipse", { class: "atl-prop-note-head", cx: x, cy: y, rx: 1.6, ry: 1.2 }, note);
  const moon = atlasGroup(tufts[1], "nmp nmp-nightcap");
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: 57.6, cy: -3.6, r: 6 }, moon);
  atlasMake("path", { class: "atl-prop-moon", d: "M56.8 -8.6A5 5 0 1 0 62 -0.8A4 4 0 1 1 56.8 -8.6Z" }, moon);
  atlasSpark(moon, 51.4, -4.4, 1.3, "atl-sparkle");
  const glasses = atlasGroup(sway, "nmp nmp-glasses");
  for (const [cx, cy] of ATLAS_GEO.eyes) {
    atlasMake("path", { class: "atl-prop-lens", d: `M${cx - 7} ${cy + 0.4}Q${cx} ${cy + 9} ${cx + 7} ${cy + 0.4}Z` }, glasses);
  }
  atlasMake("path", { class: "atl-prop-rim", d: `M${ATLAS_GEO.eyes[0][0] + 7} ${ATLAS_GEO.eyes[0][1] + 0.4}Q31 ${ATLAS_GEO.eyes[0][1] - 1.4} ${ATLAS_GEO.eyes[1][0] - 7} ${ATLAS_GEO.eyes[1][1] + 0.4}` }, glasses);
}

//: The hand slots. The companion raises the right arm (`--atl-raise` at
//: the shoulder, set in the CSS for Atlas's short arm) to hold a bell or a
//: lantern up, so each is drawn turned the other way about the hand and
//: comes out upright once the arm is up.
function atlasHandProps(armR, armL) {
  const hand = [46.8, 66.6];
  const upright = atlasMake("g", { transform: `rotate(100 ${hand[0]} ${hand[1]})` }, armR);
  const bell = atlasGroup(upright, "nmp nmp-bell");
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: 46.8, cy: 72.8, r: 7 }, bell);
  atlasMake("path", { class: "atl-prop-bell", d: "M42.6 74.6C42.6 67.8 51 67.8 51 74.6L52.4 76.4H41.2Z" }, bell);
  atlasMake("circle", { class: "atl-prop-bell-dot", cx: 46.8, cy: 77.8, r: 1.2 }, bell);
  const lantern = atlasGroup(upright, "nmp nmp-lantern");
  atlasMake("path", { class: "atl-prop-string", d: "M46.8 67.6V70.2" }, lantern);
  atlasMake("circle", { class: "nmp-lantern-glow atl-prop-moon-glow", cx: 46.8, cy: 73.6, r: 8 }, lantern);
  atlasMake("circle", { class: "atl-node-dot", cx: 46.8, cy: 73.6, r: 3.4 }, lantern);
  atlasSpark(lantern, 46.8, 73.6, 1.8, "atl-sparkle");
  const cable = atlasGroup(armL, "nmp nmp-cable");
  atlasMake("path", { class: "atl-prop-link", d: "M12 70.6L13.6 74.2M15.6 77.2L17.4 81" }, cable);
  atlasMake("path", { class: "atl-prop-zap", d: "M13.2 76.6L12 77.6M16 74.4L17.4 74" }, cable);
  for (const [x, y, r] of [[11.2, 69.2, 2], [18, 82.4, 2]]) atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r }, cable);
}

//: The head: tufts and skin in the edge layer, then their fills, the rim
//: shade, the specular, blush, eyes, brows, mouths, then the extras.
function atlasHead(parent, id, level, look) {
  const tiny = level === "tiny";
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const head = atlasGroup(parent, "atl-head", ATLAS_GEO.neck);
  const sway = atlasGroup(head, "atl-sway", ATLAS_GEO.neck);
  atlasTufts(sway, tiny, true, look);
  atlasMake("path", { class: "atl-edge", d: ATLAS_HEAD_PATH }, sway);
  const tufts = atlasTufts(sway, tiny, false, look);
  atlasMake("path", { class: "atl-skin", d: ATLAS_HEAD_PATH }, sway);
  if (!tiny) {
    atlasMake("path", { class: "atl-overlay atl-rim-head", d: ATLAS_HEAD_PATH }, sway);
    for (const [cx, cy, r] of [[44.6, 12.4, 0.5], [47.8, 18.2, 0.32], [40.4, 8.6, 0.28], [13.6, 34, 0.3]]) atlasMake("circle", { class: "atl-speck atl-speck-soft", cx, cy, r }, sway);
    atlasMake("ellipse", { class: "atl-sheen atl-sheen-head", cx: 21.4, cy: 12.6, rx: 8.2, ry: 4.4, transform: "rotate(-34 21.4 12.6)" }, sway);
    atlasMake("circle", { class: "atl-sheen atl-sheen-dot", cx: 14.6, cy: 20.6, r: 1.3 }, sway);
  }
  for (const [x, y] of ATLAS_GEO.cheeks) atlasMake("ellipse", { class: "atl-cheek", cx: x, cy: y, rx: tiny ? 4.2 : 3.9, ry: tiny ? 2.4 : 2.3 }, sway);
  for (const eye of ATLAS_GEO.eyes) atlasEye(sway, id, eye, tiny, spec.lashes);
  if (!tiny) {
    for (const [x, y, side] of ATLAS_GEO.brows) {
      const brow = atlasGroup(sway, `atl-brow atl-brow-${side > 0 ? "l" : "r"}`, [x, y]);
      const d = spec.brow === "straight"
        ? `M${x - 3.6 * side} ${y - 0.1}Q${x} ${y - 0.9} ${x + 3.6 * side} ${y + 0.6}`
        : `M${x - 3.4 * side} ${y - 0.2}Q${x - 0.3 * side} ${y - 2.2} ${x + 3.4 * side} ${y + 0.9}`;
      atlasMake("path", { class: `atl-stroke atl-brow-line atl-brow-${spec.brow}`, d }, brow);
    }
  }
  const [mx, my] = ATLAS_GEO.mouth;
  const place = atlasMake("g", { transform: tiny ? `translate(${mx} ${my - 1}) scale(0.9) translate(-32 -38)` : `translate(${mx} ${my}) scale(0.64) translate(-32 -38)` }, sway);
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
  //: Thinking, a hand at the chin (the reference sheet): drawn here, over
  //: the head, because the body's own arm is drawn under it; the CSS shows
  //: it and hides the resting right arm while Atlas thinks.
  if (level === "full" || level === "figure") {
    const hand = atlasGroup(sway, "atl-chin-hand");
    atlasMake("path", { class: "atl-edge", d: ATLAS_CHIN_HAND }, hand);
    atlasMake("path", { class: "atl-skin", d: ATLAS_CHIN_HAND }, hand);
    atlasMake("path", { class: "atl-overlay atl-rim-limb", d: ATLAS_CHIN_HAND }, hand);
  }
  if (level === "figure") atlasHeadProps(sway, tufts);
  return head;
}

//: **The rings of light** (the owner, of a first ring: "I like the ring it
//: made, maybe there can be more than one?? and it could be like a rope or
//: string of stars around him"; the reference sheet: an orrery of thin
//: rings with small planets). Three concentric ellipses about the
//: shoulders in one tilted frame flattened to a third of its height, each
//: a faint glow under a fine line, with a little dust drifting round it
//: (a sparse dash in a group that turns) and a planet or a glint set on it
//: in the drawing's own space, so a dot stays round. Each ring is drawn in
//: two halves: the whole of it under the body, its front half again over
//: the body (clipped in the frame), so it wraps in depth.
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
//: ribbon goes under everything first and over legs and torso after, and
//: the arms last of all.
function atlasBody(parent, id, props) {
  const layers = { edge: atlasGroup(parent, "atl-edges"), fill: atlasGroup(parent, "atl-fills") };
  const arms = {};
  atlasRibbon(layers.edge, id, false);
  for (const [kind, layer] of Object.entries(layers)) {
    const edge = kind === "edge";
    for (const [side, d] of ATLAS_LIMBS.legs) {
      const leg = atlasGroup(layer, `nmb-leg nmb-leg-${side} atl-leg`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, leg);
      if (!edge) atlasMake("path", { class: "atl-overlay atl-rim-limb", d }, leg);
    }
    for (const [side, d] of ATLAS_LIMBS.holds) {
      const hold = atlasGroup(layer, `nmb-hold nmb-hold-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, hold);
      if (!edge) atlasMake("path", { class: "atl-overlay atl-rim-limb", d }, hold);
    }
    const torso = atlasGroup(layer, "nmb-torso");
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: ATLAS_TORSO_PATH }, torso);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-rim-body", d: ATLAS_TORSO_PATH }, torso);
      //: The constellation: the heart star in its glow, then the linked
      //: points down the belly, threads of light between them.
      const core = atlasGroup(torso, "atl-core", ATLAS_GEO.constellation[0]);
      const [hx, hy] = ATLAS_GEO.constellation[0];
      atlasMake("ellipse", { class: "atl-core-glow", cx: hx, cy: hy + 1, rx: 8.6, ry: 9.4 }, core);
      atlasMake("path", { class: "atl-thread", d: ATLAS_GEO.constellation.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") }, core);
      ATLAS_GEO.constellation.slice(1).forEach(([x, y], i) => {
        atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r: 0.85 }, core).style.setProperty("--atl-k", String(i));
      });
      const star = atlasGroup(core, "atl-star", [hx, hy]);
      atlasSpark(star, hx, hy, 3.4, "atl-chest-star");
      //: The gloss on the gel: one specular on the upper left of the body.
      atlasMake("ellipse", { class: "atl-sheen atl-sheen-body", cx: 24.6, cy: 50.4, rx: 1.4, ry: 3.6, transform: "rotate(14 24.6 50.4)" }, torso);
    }
    if (!edge) atlasRibbon(layer, id, true);
    for (const [side, d] of ATLAS_LIMBS.arms) {
      const arm = atlasGroup(layer, `nmb-arm nmb-arm-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, arm);
      if (!edge) {
        atlasMake("path", { class: "atl-overlay atl-rim-limb", d }, arm);
        arms[side] = arm;
      }
    }
  }
  if (props) atlasHandProps(arms.r, arms.l);
}

//: The gradients, per drawing (ids are per drawing, so two on a page never
//: share one): the skin in the drawing's own space, so tufts, head, arms
//: and body are one continuous surface; the rim shades; the specular; the
//: iris; the constellation's glow; the ribbon's nebulae and tip; each eye's
//: clip; the rings' front halves; and the ribbon's "outside the body" clip.
function atlasDefs(svg, id, level) {
  const defs = atlasMake("defs", {}, svg);
  const stops = (grad, list) => {
    for (const [offset, cls] of list) atlasMake("stop", { offset, class: cls }, grad);
  };
  const skin = atlasMake("radialGradient", { id: `${id}-skin`, gradientUnits: "userSpaceOnUse", cx: 22, cy: 18, r: 82, fx: 20, fy: 14 }, defs);
  stops(skin, [[0, "atl-st-hi"], [0.22, "atl-st-lt"], [0.56, "atl-st-md"], [0.86, "atl-st-dp"], [1, "atl-st-rim"]]);
  //: Rim shades: clear in the middle, violet at the edge. The head's and
  //: the body's are in the drawing's space (their light is where the
  //: specular is); a limb's is in its own box, centred toward its root so
  //: the joint stays clear and the tip rounds off.
  const rimHead = atlasMake("radialGradient", { id: `${id}-rimh`, gradientUnits: "userSpaceOnUse", cx: 26, cy: 22, r: 27 }, defs);
  stops(rimHead, [[0.62, "atl-st-clear"], [1, "atl-st-shade"]]);
  const rimBody = atlasMake("radialGradient", { id: `${id}-rimb`, gradientUnits: "userSpaceOnUse", cx: 29, cy: 54, r: 19 }, defs);
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
  stops(iris, [[0, "atl-st-iris0"], [1, "atl-st-iris1"]]);
  const neb = atlasMake("radialGradient", { id: `${id}-neb`, gradientUnits: "userSpaceOnUse", cx: 24, cy: 76, r: 22 }, defs);
  stops(neb, [[0, "atl-st-neb0"], [1, "atl-st-neb1"]]);
  const neb2 = atlasMake("radialGradient", { id: `${id}-neb2`, gradientUnits: "userSpaceOnUse", cx: 60, cy: 64, r: 16 }, defs);
  stops(neb2, [[0, "atl-st-neb20"], [1, "atl-st-neb21"]]);
  const tuftNeb = atlasMake("radialGradient", { id: `${id}-tneb`, cx: 0.7, cy: 0.2, r: 0.7 }, defs);
  stops(tuftNeb, [[0, "atl-st-neb0"], [1, "atl-st-neb1"]]);
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
  atlasMake("rect", { x: -40, y: 0, width: 80, height: 40 }, front);
  //: Everything outside head and torso, for the ribbon's over copy: a
  //: page-sized rect with the two shapes cut out of it (even-odd).
  const out = atlasMake("clipPath", { id: `${id}-out` }, defs);
  atlasMake("path", { "clip-rule": "evenodd", d: `M-60 -60H140V160H-60Z${ATLAS_HEAD_PATH}${ATLAS_TORSO_PATH}` }, out);
  //: The paints name their gradients through custom properties, so the CSS
  //: can say "skin" without knowing this drawing's id.
  for (const [name, ref] of [["skin", "skin"], ["rimh", "rimh"], ["rimb", "rimb"], ["riml", "riml"], ["sheen", "sheen"], ["aura", "aura"], ["core", "core"], ["iris", "iris"], ["neb", "neb"], ["neb2", "neb2"], ["tneb", "tneb"], ["tip", "tip"]]) {
    svg.style.setProperty(`--atl-${name}`, `url(#${id}-${ref})`);
  }
}

//: What each level shows, and the box it is drawn in. `full` keeps margins
//: for the glow, the tufts and a raised hand; `head` is square round the
//: head and its tufts; `tiny` crops tighter because at 16px every unit
//: counts.
const ATLAS_LEVELS = {
  full: { viewBox: [-8, -18, 84, 112], body: true },
  figure: { viewBox: [0, 0, 64, 92], body: true },
  head: { viewBox: [1, -13, 60, 62], body: false },
  tiny: { viewBox: [3, -10, 56, 59], body: false },
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
  const look = atlasLook();
  svg.dataset.atlasLook = look;
  svg.style.setProperty("--nm-delay", "-1.3s");
  atlasMake("title", {}, svg);
  atlasDefs(svg, id, level);
  const anchor = spec.body ? ATLAS_GEO.feet : ATLAS_GEO.chin;
  const pose = atlasGroup(svg, "atl-pose", anchor);
  if (level !== "tiny") {
    const aura = spec.body ? { cx: 31, cy: 44, rx: 40, ry: 52 } : { cx: 31, cy: 22, rx: 32, ry: 32 };
    atlasMake("ellipse", { class: "atl-aura", ...aura }, pose);
  }
  const moodLoop = atlasGroup(pose, "atl-mood", anchor);
  const rig = atlasGroup(moodLoop, "atl-rig", anchor);
  if (spec.body) {
    ATLAS_GEO.rings.forEach((ring, k) => atlasRing(rig, id, ring, k, false));
    atlasBody(rig, id, figure);
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
