// atlas.js: Atlas, the assistant's own character. Loaded straight after
// avatars.js, whose `registerCharacter` it answers through; every other file
// reaches it by the old names (`atlasMark`, `setAtlasMood`,
// `atlasRestingMood`), so no call site changed when it moved here.
//
//: **The design note.** Atlas is a small celestial spirit, traced from the
//: owner's chosen reference sheet (the "conceptual art" pose sheet, its
//: `stand` and `float` cells measured pixel by pixel and mapped into the
//: companion's box; the hero sheets for the material and the long crest).
//: The owner's verdicts on the drafts before this one are the rules:
//: "cool and aura", "cute but not fat baby cute", "like a pokemon or
//: Rimuru", "better hands and feet", "the arms and legs aren't properly
//: attached", "they look like a space onion", "too alien like ... should
//: be celestial pokemon like", "dont stray from the blue, black, purple
//: colour scheme the references use", "make the hair wider and more
//: flowy, not like an onion sprout or garden gnome hat like an alien".
//:
//: - **Proportions, measured** (the companion's 64 by 92 box, one unit is
//:   one px at the companion's size; the reference's `stand` cell is 148px
//:   from the tufts' tips to the soles, so one reference px is 0.608
//:   units). In reference px, then units: head bulb 48 wide by 47 tall
//:   (29 by 29), 32% of the height; the tufts add 13 above it (8), so head
//:   and hair are 40%; the chin at 72 (36.5); torso to the crotch at 118
//:   (64.4), 31%; legs to the soles at 160 (90), 28%; shoulders 30 wide
//:   (18.2), 62% of the head; arms 30 long (18), 63% of the head, 9 thick
//:   (5.5); legs 11 wide (6.8) with soft feet 13 wide (7.9); eyes 17 wide
//:   by 12 tall (10.4 by 7.3), 35% of the head's width each, centres 23
//:   apart (14), set 66% down the head; mouth 91% down; blush level with
//:   the eyes' feet; the orbit rings centred at cheek level, 2.7, 2.1 and
//:   1.6 heads wide, a third as tall as wide; the tail 12 thick at its root (7.3),
//:   a quarter of the head. No neck: the head sits straight on the body.
//: - **One silhouette, all curves** (the owner, of the draft before this:
//:   "no smooth organic flow or shape ... all too rigid"). Every shape is
//:   cubic Beziers with matching tangents at the joins, no straight
//:   segments and no corners: a bean head fuller at the cheeks than the
//:   crown, a pear torso, limbs that are tapered stems generated from a
//:   centreline (`atlasStem`), chubby where they grow out of the body and
//:   swelling into a soft round paw or foot, their roots well inside the
//:   torso. All outlines are drawn first as one layer (`atl-edges`) and
//:   every fill on top (`atl-fills`), so where parts overlap the fills
//:   close the seams and the figure has one outer contour; the outline is
//:   thin and low in contrast, the gradients do the modelling. Each limb is
//:   in both layers under the same companion class, so a pose turns
//:   outline and fill together about a joint inside the torso.
//: - **The ears and the hair.** Two soft fluffy ears, rounded at the tip
//:   and leaning outward, each with an inner ear of galaxy (navy through
//:   violet to lilac) inside a lighter rim and a star at the tip; over the
//:   crown a soft fringe swept back to the right, rounded at its end. The
//:   feminine look has a mane instead of the fringe: three flowing locks,
//:   wide at the head, the longest trailing past the head and curling (the
//:   owner: "the female ones have longer hair ... more like flowy
//:   sprites"). Nothing on the head ends in a point.
//: - **The tail.** From the lower back, a tapered S that flows out to the
//:   right, down and back up, the body's blue running into navy galaxy
//:   along it with star dots, ending in a soft tuft of white starlight.
//:   The feminine tail runs longer with a second curve. It is the
//:   companion's tail too: it lies along a ledge when Atlas sits, hangs
//:   when it hangs, curls when it sleeps and wags when it is pleased.
//: - **Material.** Soft translucent gel of light: one radial gradient in
//:   the drawing's own space (a near-white core at the upper left of the
//:   head, through lavender and periwinkle to violet at the far rim) fills
//:   head, hair, body and limbs alike, so the light falls on the whole
//:   figure at once. On top: a rim shade per part (a radial gradient that
//:   is clear in the middle and violet at the edge, so each part rounds
//:   off), a soft specular on the head's upper left and a smaller one on
//:   the body (white through a radial fade, no hard edge), a few specks
//:   inside, and one thin soft outline in deep lavender, half the width of
//:   a cartoon line. No filters anywhere: every glow is a radial gradient.
//: - **The signature.** A constellation of thin light lines and star points
//:   traced inside the chest and belly, with a brighter four-point star at
//:   the heart in a soft glow: the logo's hub and linked notes, worn
//:   inside. Three thin concentric rings of light orbit the head at cheek
//:   level, tilted, passing behind the head and in front of the chin, with
//:   a tiny planet or star glint on each. Restraint: nothing else is added.
//: - **Palette, sampled** (k-means over the reference sheets' regions,
//:   `scratchpad/palette.py`; the owner: "they are very purple and a lot of
//:   the blue is missing"). The body is blue: a sky-blue-white core
//:   (#c8e1f7, the forehead's largest cluster), periwinkle (#a3bbea, the
//:   torso's), blue-violet shade (#7d91cf) and deep blue at the far side
//:   (#505aac, the legs'). Violet only where the references have it: the
//:   ear and crest tips (#413b94, the hero's crest) and the lilac nebula
//:   (#b098d6). Navy for the eyes (#081241) and the galaxy (#1c235a);
//:   white-blue for highlights and starlight (#e7f6fd). Fixed in the CSS;
//:   the live `--accent` tints only the aura, the rings' glow and the
//:   iris's foot, never the body.
//: - **Face.** Big rounded almond eyes, outer corners a touch lifted, a
//:   deep navy iris filling nearly the whole eye and lightening toward its
//:   foot, a large catchlight and a small one; lids that slide and tilt;
//:   faint brows that rise, knit and slant; twelve mouths; cheeks that
//:   blush. Fifteen moods, each a combination of all of these plus head
//:   tilt, body squash, ear, hair, tail and ring lift and star brightness and one
//:   small extra (sparkles, hearts, a thought, a tear). The combinations
//:   are CSS (`[data-atlas-mood]` in 08-consistency.css); this file draws
//:   the parts and says which mood.
//: - **Life.** Breathing squash and stretch from the feet, blinks with an
//:   occasional double blink, the tail swaying (wagging when pleased) with
//:   its starlight glinting, dust drifting round the rings, a slow head
//:   sway and the glow pulsing.
//:   All of it is CSS transform and opacity on this one SVG, runs only
//:   while the mark is on screen and motion is on, slows under Reduce
//:   motion and stops under Avatar animation Off.
//: - **Sizes.** `full` (a figure with margins, 96px and up: the welcome,
//:   the large view), `figure` (the companion's 64 by 92 box, parts named
//:   for the companion's behaviours), `head` (the head and its hair, 28 to
//:   95px: the dashboard mark, chat heads, persona rows; the feminine lock
//:   is cut shorter to fit the square) and `tiny` (under 28px: head, tufts
//:   and eyes, thicker lines, no lids, brows or motion).

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
//: a round tip (`cap`) or a point. Limbs, the chin hand and the tail all
//: come from here, which is why they match.
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

//: The drawing's landmarks, in the companion's 64 by 92 box (the measured
//: table in the design note): the head bulb from 7.9 to 36.5, the crotch
//: at 64.4, the soles at 90, the raised hands at -7.
const ATLAS_GEO = {
  eyes: [[24.6, 26.6, 1], [37.4, 26.6, -1]],
  brows: [[24.5, 20.4, 1], [37.5, 20.4, -1]],
  cheeks: [[19.6, 31.2], [42.4, 31.2]],
  mouth: [31, 33.6],
  ear: [[21, 13], [41, 13]],
  hair: [27, 10],
  //: The rings of light: three concentric ellipses about the head at cheek
  //: level, tilted, each with a planet or a glint on it, at [angle, size,
  //: colour]. Placed as the reference has them, unevenly.
  rings: [
    { r: 23, glints: [[174, 1.1, "amber"], [332, 0.7, "star"]] },
    { r: 30.5, glints: [[158, 1.7, "amber"], [349, 1, "pale"]] },
    { r: 39, glints: [[190, 1.45, "lilac"], [300, 1.15, "teal"], [96, 0.75, "star"]] },
  ],
  ringFrame: { cx: 31, cy: 30.4, flat: 0.34, tilt: -5 },
  //: The constellation inside the body: the heart star first, then the
  //: linked points down the belly.
  constellation: [[31, 46], [27.6, 50.2], [33.6, 53.2], [29.2, 57], [34, 60.4]],
  neck: [31, 35],
  feet: [31, 90],
  chin: [31, 30],
  shoulders: [[22.4, 42.6], [39.6, 42.6]],
  hips: [[24.6, 66], [37.4, 66]],
  tail: [36, 61],
};

//: The head: a soft bean, fuller at the cheeks than at the crown, the chin
//: one gentle curve.
const ATLAS_HEAD_PATH = "M31 37.6C24.6 37.6 15.4 33.4 15.4 24.4C15.4 15 21.6 7.8 31 7.8C40.4 7.8 46.6 15 46.6 24.4C46.6 33.4 37.4 37.6 31 37.6Z";
//: The left ear: it leaves the crown's shoulder, leans out, rounds off at
//: the tip and comes back down its inner edge; its base is a curve inside
//: the head. Inside it, the inner ear, the same shape inset. The right ear
//: is the mirror.
const ATLAS_EAR_L = "M19.8 16.4C15.4 13.6 12.4 8.4 13.4 3.4C13.8 1.4 14.8 0.2 16.2 0.2C17.6 0.2 18.4 1.4 19.2 2.8C21.2 6 23.8 8.4 27.6 10.4C24.2 10.8 21.6 13 19.8 16.4Z";
const ATLAS_EAR_IN_L = "M20.6 13.6C18 11.4 16.2 8.4 16.4 5.2C16.5 4 17 3.4 17.6 3.6C18.2 3.8 18.6 4.6 19 5.4C20.6 7.8 22.6 9.4 25.2 10.6C23.4 11.2 21.8 12.2 20.6 13.6Z";
const ATLAS_EAR_TIP_L = [16.2, 1.6];

//: **Two looks of one character** (the design note). The hair and the
//: tail are where they differ. `locks` are the hair's paths, drawn in
//: order over the ears (the full set for the figure and the large view,
//: `head` the set cut to fit a square mark); `light` the highlight along
//: the first lock; `tip` where its star sits; `tail` the centreline of the
//: tail's S with its stars and its tip. Brows and lashes complete the
//: difference.
const ATLAS_LOOKS = {
  masculine: {
    locks: ["M22.4 12.8C25.6 6.6 32.8 3.4 40.6 4.4C45 5 49.2 4.4 52.8 2.4C53.8 1.8 54.8 2.6 54.2 3.6C51.8 7 48.8 9.6 45.2 11.4C42.6 12.6 40 13.6 37.6 14.4C34 12.2 29.6 11.2 25.2 11.8C24.2 12 23.2 12.4 22.4 12.8Z"],
    head: ["M22.4 12.8C25.6 6.6 32.8 3.4 40.6 4.4C45 5 49.2 4.4 52.8 2.4C53.8 1.8 54.8 2.6 54.2 3.6C51.8 7 48.8 9.6 45.2 11.4C42.6 12.6 40 13.6 37.6 14.4C34 12.2 29.6 11.2 25.2 11.8C24.2 12 23.2 12.4 22.4 12.8Z"],
    light: "M25.4 10.2C29.2 6.4 34.8 5 40.6 5.8C44.8 6.4 48.6 5.8 52 4",
    tip: [53.2, 3],
    brow: "straight",
    lashes: false,
    tail: [[35, 61, 47, 61.6, 54, 68.6, 50.2, 77], [50.2, 77, 46.4, 85.4, 51.6, 93.6, 61, 90.4]],
    tailWidth: (t) => 7 - 4.6 * t * t,
    tailStars: [[46.6, 66.4, 0.45], [51.4, 73.4, 0.35], [48.4, 82, 0.5], [51.2, 89.4, 0.35], [56.6, 92.2, 0.45]],
    tailTip: [61.6, 90],
  },
  feminine: {
    locks: [
      "M22.4 12.8C26 5.2 34.6 1.4 44 2.6C51.2 3.6 58 1.8 63.6 -2.6C66.6 -5 69.8 -3.8 69.4 -0.6C69.1 1.8 66.8 2.6 65.4 1C64.6 0.1 64.8 -1.2 65.8 -1.6C61.6 -0.2 57.6 2.8 53.6 6.2C50 9.2 46.4 11.8 42.6 14C38.6 12.2 34 11.2 29 11.8C26.6 12.1 24.4 12.4 22.4 12.8Z",
      "M40 13.6C45 11 50.6 10 56.4 10.8C59.2 11.2 61.6 12.8 63.4 15.2C63.9 15.9 63.2 16.6 62.4 16.2C59.6 14.8 56.6 14.4 53.4 15C50 15.6 47 17.2 44.4 19.4C43.4 17.2 41.8 15.2 40 13.6Z",
      "M24 11.6C26 9 29 7.4 32.4 7C33.6 6.9 34.4 7.8 33.8 8.8C32.4 10.8 30.6 12.2 28.4 13.2C27 12.4 25.6 11.8 24 11.6Z",
    ],
    head: [
      "M22.4 12.8C26 5.2 34.6 1.4 44 2.6C48.6 3.2 52.6 2.4 56 0.2C57.6 -0.8 59.4 0.2 58.6 2C58.1 3.2 56.6 3.4 55.8 2.4C55.4 1.8 55.6 1 56.2 0.8C53.4 2.4 51 4.8 48.6 7.6C46.6 10 44.6 12.2 42.6 14C38.6 12.2 34 11.2 29 11.8C26.6 12.1 24.4 12.4 22.4 12.8Z",
      "M40 13.6C44.4 11.2 49 10.4 53.6 11C55.6 11.3 57.2 12.4 58.4 14C58.8 14.6 58.2 15.2 57.6 14.9C55.4 13.8 53 13.6 50.4 14.2C47.8 14.8 45.6 16.2 44.4 19.4C43.4 17.2 41.8 15.2 40 13.6Z",
      "M24 11.6C26 9 29 7.4 32.4 7C33.6 6.9 34.4 7.8 33.8 8.8C32.4 10.8 30.6 12.2 28.4 13.2C27 12.4 25.6 11.8 24 11.6Z",
    ],
    light: "M25.6 10C30 5.2 37.2 3.2 44.6 4.2C50.8 5 56.8 3.6 62 0",
    tip: [57.4, 5.6],
    brow: "arch",
    lashes: true,
    tail: [[35, 61, 49, 61, 57, 69.6, 52.4, 79], [52.4, 79, 46.6, 88.4, 53.4, 98, 64.6, 95.4], [64.6, 95.4, 70.2, 94, 71.6, 89.4, 69.6, 85.4]],
    tailWidth: (t) => 7 - 5 * t * t,
    tailStars: [[48, 66, 0.45], [54, 73.4, 0.35], [50.4, 83.6, 0.5], [53.2, 93, 0.35], [60.4, 96.4, 0.45], [67.8, 92.2, 0.35]],
    tailTip: [70, 85.8],
  },
};
//: At 16 to 24px the fringe is a short soft curl over the crown; the round
//: head, the two ears and the two eyes are what make the icon Atlas.
const ATLAS_TINY_LOCK = "M22.4 12.8C25.6 6.6 32.8 3.4 40.6 4.4C45 5 49.2 4.4 52.8 2.4C53.8 1.8 54.8 2.6 54.2 3.6C51.8 7 48.8 9.6 45.2 11.4C42.6 12.6 40 13.6 37.6 14.4C34 12.2 29.6 11.2 25.2 11.8C24.2 12 23.2 12.4 22.4 12.8Z";

function atlasLook() {
  return typeof appearancePref === "function" && appearancePref("atlas-look", "masculine") === "feminine" ? "feminine" : "masculine";
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

//: The limbs, each a stem from a root inside the torso, at the measured
//: lengths and thicknesses. Legs: short soft stems that swell a touch into
//: a rounded foot. Arms: nubs that end in a soft round hand, angled out so
//: there is air between arm and waist. The raised arms reach the
//: companion's hand line (-7) for hanging and cheering.
//: A soft swell toward the end of a limb: the paw or the foot, rounder
//: than the leg above it, with no step where it starts.
const atlasPaw = (t, from, by) => (t <= from ? 0 : by * (1 - Math.cos(Math.PI * Math.min(1, (t - from) / (1 - from)))) / 2);
const ATLAS_LEG_R = atlasStem([[37, 62, 37.6, 70.4, 38.6, 80.4, 37.8, 87.4]], (t) => 7.4 - 2 * t + atlasPaw(t, 0.55, 2.2), { samples: 12 });
const ATLAS_ARM_R = atlasStem([[38.6, 41.2, 43, 44.6, 47.4, 50.6, 49.4, 57.4]], (t) => 6 - 2 * t + atlasPaw(t, 0.6, 1.8), { samples: 12 });
const ATLAS_HOLD_R = atlasStem([[38.8, 42, 48, 34, 56, 16, 55.6, -4.6]], (t) => 5.8 - 1.8 * t + atlasPaw(t, 0.8, 1.4), { samples: 16 });
const ATLAS_LIMBS = {
  legs: [["l", atlasMirror(ATLAS_LEG_R)], ["r", ATLAS_LEG_R]],
  arms: [["l", atlasMirror(ATLAS_ARM_R)], ["r", ATLAS_ARM_R]],
  holds: [["l", atlasMirror(ATLAS_HOLD_R)], ["r", ATLAS_HOLD_R]],
};
//: The torso: a soft pear, narrow under the chin, fullest at the belly,
//: one rounded curve under the hips that covers the legs' roots.
const ATLAS_TORSO_PATH = "M23.4 34.4C21.4 39 20.4 44.2 20.4 49.8C20.4 56.6 20 63.2 24.2 67.8C27.4 71.4 34.6 71.4 37.8 67.8C42 63.2 41.6 56.6 41.6 49.8C41.6 44.2 40.6 39 38.6 34.4Z";
//: Thinking, a hand at the chin (the reference sheet): the right arm bent
//: up, drawn over the face in the head's own group.
const ATLAS_CHIN_HAND = atlasStem([[38.6, 42.6, 46, 46.4, 43.6, 35.4, 36.2, 36.4]], atlasTaper(5.2, 4.2), { samples: 14 });

//: The tail's path, per look: a stem along its S, thick at the root inside
//: the hips and fine at the tip.
for (const spec of Object.values(ATLAS_LOOKS)) {
  spec.tailPath = atlasStem(spec.tail, spec.tailWidth, { samples: 12 });
}

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

//: A large rounded almond eye, 35% of the head's width, its outer corner a
//: touch lifted. `side` is 1 for the eye on the viewer's left (its outer
//: corner is on the left).
function atlasAlmond(cx, cy, side) {
  const ox = cx - 5.3 * side;
  const ix = cx + 5 * side;
  return {
    d: `M${ox} ${cy - 0.9}Q${cx - 0.8 * side} ${cy - 8.2} ${ix} ${cy + 0.3}Q${cx + 0.3 * side} ${cy + 6.4} ${ox} ${cy - 0.9}Z`,
    upper: `M${ox} ${cy - 0.9}Q${cx - 0.8 * side} ${cy - 8.2} ${ix} ${cy + 0.3}`,
  };
}

//: One eye: the white, then (clipped to it) the iris that looks about and
//: the lids that slide over it, the liner on its upper edge, and outside
//: the clip the three closed shapes a mood can swap the open eye for. The
//: iris is deep navy, fills nearly the whole eye, and lightens toward its
//: foot (a gradient), with a large catchlight and a small one.
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
    atlasMake("ellipse", { class: "atl-iris-fill", cx: cx + 0.2 * side, cy: cy - 0.2, rx: 4.7, ry: 5.2 }, iris);
    atlasMake("ellipse", { class: "atl-iris-foot", cx: cx + 0.2 * side, cy: cy + 2.4, rx: 2.5, ry: 1.4 }, iris);
    atlasMake("ellipse", { class: "atl-ink", cx: cx + 0.1 * side, cy: cy - 0.5, rx: 1.9, ry: 2.3 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.6, cy: cy - 2.1, r: 1.45 }, iris);
    atlasMake("circle", { class: "atl-catch", cx: cx + 1.7, cy: cy + 1.7, r: 0.62 }, iris);
    const heart = atlasGroup(pupil, "atl-heart-eye");
    atlasHeart(heart, cx, cy + 0.5, 3.6, "atl-heart");
    atlasMake("circle", { class: "atl-catch", cx: cx - 1.4, cy: cy - 1.2, r: 0.7 }, heart);
    //: The upper lid is the head's own skin sliding down over the white,
    //: with a lash line on its edge; the lower lid rises for a squint.
    const lid = atlasGroup(inner, "atl-lid", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 7} ${cy - 16}H${cx + 7}V${cy - 4.4}Q${cx} ${cy - 3.4} ${cx - 7} ${cy - 4.4}Z` }, lid);
    atlasMake("path", { class: "atl-lash", d: `M${cx - 7} ${cy - 4.4}Q${cx} ${cy - 3.4} ${cx + 7} ${cy - 4.4}` }, lid);
    const low = atlasGroup(inner, "atl-lid-low", [cx, cy]);
    atlasMake("path", { class: "atl-skin", d: `M${cx - 7} ${cy + 12}H${cx + 7}V${cy + 3.6}Q${cx} ${cy + 2.6} ${cx - 7} ${cy + 3.6}Z` }, low);
    atlasMake("path", { class: "atl-liner", d: shape.upper }, blink);
    if (lashes) {
      const ox = cx - 5.3 * side;
      atlasMake("path", { class: "atl-lashes", d: `M${ox} ${cy - 0.9}l${-1.6 * side} -0.9M${ox + 0.9 * side} ${cy - 2.6}l${-1.4 * side} -1.2M${ox + 2.3 * side} ${cy - 3.9}l${-1 * side} -1.4` }, blink);
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
//: Placed round the head, clear of the hair.
function atlasExtras(parent) {
  const fx = atlasGroup(parent, "atl-fx");
  const sparkle = atlasGroup(fx, "atl-fx-sparkle");
  atlasSpark(sparkle, 9, 20, 2.4, "atl-sparkle");
  atlasSpark(sparkle, 53, 22, 1.9, "atl-sparkle atl-late");
  atlasSpark(sparkle, 33, -3, 1.4, "atl-sparkle atl-later");
  const hearts = atlasGroup(fx, "atl-fx-hearts");
  atlasHeart(atlasGroup(hearts, "atl-float", [52, 18]), 52, 18, 2.6, "atl-heart");
  atlasHeart(atlasGroup(hearts, "atl-float atl-late", [10, 12]), 10, 12, 1.9, "atl-heart");
  const zz = atlasGroup(fx, "atl-fx-zz");
  atlasMake("path", { class: "atl-float atl-stroke atl-z", d: "M49.4 14.6h3l-3 3.2h3" }, zz);
  atlasMake("path", { class: "atl-float atl-late atl-stroke atl-z", d: "M54.4 8.6h2.2l-2.2 2.4h2.2" }, zz);
  const dots = atlasGroup(fx, "atl-fx-dots");
  for (const [i, x, y, r] of [[0, 13.4, 14.4, 1], [1, 9.8, 10, 1.4], [2, 5.4, 4.4, 2]]) {
    atlasMake("circle", { class: `atl-dot atl-dot-${i}`, cx: x, cy: y, r }, dots);
  }
  const q = atlasGroup(fx, "atl-fx-q", [9, 8]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M5.8 5.6Q5.8 2.2 9 2.2Q12.2 2.2 12.2 5Q12.2 7 10 8Q8.9 8.6 8.9 10.4" }, q);
  atlasMake("circle", { class: "atl-mark-dot", cx: 8.9, cy: 13.2, r: 1 }, q);
  const bang = atlasGroup(fx, "atl-fx-bang", [9, 8]);
  atlasMake("path", { class: "atl-stroke atl-mark-ink", d: "M8.4 2V9.4" }, bang);
  atlasMake("circle", { class: "atl-mark-dot", cx: 8.4, cy: 12.6, r: 1.1 }, bang);
  const tear = atlasGroup(fx, "atl-fx-tear");
  atlasDrop(atlasGroup(tear, "atl-fall", [20.6, 32]), 20.6, 32, 1.3, "atl-drop");
  const sweat = atlasGroup(fx, "atl-fx-sweat");
  atlasDrop(atlasGroup(sweat, "atl-fall atl-slow", [48.6, 18]), 48.6, 18, 1.3, "atl-drop");
  return fx;
}

//: The ears and the hair. They perk up with a good mood and droop with a
//: low one (`--atl-crest`, the left ear mirrored). Drawn like the body:
//: the edges under every fill, then the fills over the head's; each ear
//: gets its inner ear of galaxy and a star at the tip, the hair its
//: galaxy toward the ends, a highlight along the first lock and a star.
function atlasHair(parent, level, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const tiny = level === "tiny";
  const locks = tiny ? [ATLAS_TINY_LOCK] : level === "head" ? spec.head : spec.locks;
  const out = {};
  for (const side of ["l", "r"]) {
    const g = atlasGroup(parent, `atl-crest atl-ear atl-ear-${side}`, ATLAS_GEO.ear[side === "l" ? 0 : 1]);
    const m = (d) => (side === "l" ? d : atlasMirror(d));
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: m(ATLAS_EAR_L) }, g);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-rim-limb", d: m(ATLAS_EAR_L) }, g);
      atlasMake("path", { class: "atl-ear-in", d: m(ATLAS_EAR_IN_L) }, g);
      if (!tiny) {
        for (const [x, y, r] of [[17.4, 6.2, 0.28], [19.6, 9.4, 0.2], [18.2, 4.4, 0.16]]) atlasMake("circle", { class: "atl-speck", cx: side === "l" ? x : 62 - x, cy: y, r }, g);
        const [tx, ty] = ATLAS_EAR_TIP_L;
        atlasSpark(g, side === "l" ? tx : 62 - tx, ty, 1.1, "atl-glint atl-hair-star");
      }
    }
    out[side] = g;
  }
  const hair = atlasGroup(parent, "atl-crest atl-lock", ATLAS_GEO.hair);
  locks.forEach((d, i) => {
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, hair);
    if (!edge && !tiny) {
      atlasMake("path", { class: "atl-overlay atl-hair-neb", d }, hair);
      if (i === 0) atlasMake("path", { class: "atl-hair-light", d: spec.light }, hair);
    }
  });
  if (!edge && !tiny && level !== "head") atlasSpark(hair, spec.tip[0], spec.tip[1], 1.2, "atl-glint atl-hair-star");
  out.lock = hair;
  return out;
}

//: **The tail**, from the lower back: its root inside the hips, under the
//: torso, so it grows out of the body with no seam. `.atl-tail` takes the
//: pose and the mood (lying along a ledge, hanging, curled, lifted,
//: drooping); `.atl-tail-swish` inside it takes the loop (a slow sway at
//: rest, a wag when pleased). The body's blue runs into navy galaxy along
//: it (a gradient along its length), star dots ride it, and the tip is a
//: soft tuft of white starlight.
function atlasTail(layer, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const tail = atlasGroup(layer, "atl-tail", ATLAS_GEO.tail);
  const swish = atlasGroup(tail, "atl-tail-swish", ATLAS_GEO.tail);
  atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: spec.tailPath }, swish);
  if (edge) return tail;
  atlasMake("path", { class: "atl-overlay atl-tail-galaxy", d: spec.tailPath }, swish);
  atlasMake("path", { class: "atl-tail-edge", d: spec.tailPath }, swish);
  const stars = atlasGroup(swish, "atl-tail-core");
  for (const [x, y, r] of spec.tailStars) atlasMake("circle", { class: "atl-speck", cx: x, cy: y, r }, stars);
  const [tx, ty] = spec.tailTip;
  atlasMake("circle", { class: "atl-tip-glow", cx: tx, cy: ty, r: 6.5 }, stars);
  atlasSpark(stars, tx, ty, 1.9, "atl-glint");
  atlasSpark(stars, tx - 3.6, ty - 2.8, 1, "atl-glint atl-ring-glint").style.setProperty("--atl-k", "7");
  atlasSpark(stars, tx + 2.2, ty + 3.4, 0.8, "atl-glint atl-ring-glint").style.setProperty("--atl-k", "8");
  return tail;
}

// --- the companion's props, in Atlas's own language ---------------------------
//: The companion shows a prop slot (`.nmp-*`, the character interface in
//: avatars.js) while something is going on around it. Atlas answers each
//: in its own materials, light and notes: glowing cups for music (its
//: glints pulse to the beat, in the CSS), a crescent moon hung on its lock
//: at night, half-moon lenses of light for a long read, a bell of light
//: for a reminder, one of its own stars held up as a lantern, and,
//: offline, a snapped link between two notes. Drawn for the companion's
//: figure only, hidden until asked.
function atlasHeadProps(sway, hair, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const phones = atlasGroup(sway, "nmp nmp-headphones");
  atlasMake("path", { class: "atl-prop-band", d: "M17.2 25C15.6 7.6 46.4 7.6 44.8 25" }, phones);
  for (const x of [17.4, 44.6]) {
    atlasMake("rect", { class: "atl-prop-cup", x: x - 2.8, y: 20, width: 5.6, height: 10.4, rx: 2.8 }, phones);
    atlasMake("circle", { class: "atl-prop-cup-glow", cx: x, cy: 25.2, r: 1.3 }, phones);
  }
  const note = atlasGroup(phones, "atl-prop-note", [9, 14]);
  atlasMake("path", { class: "atl-prop-note-ink", d: "M9.6 15.6V8.4L14 7.2V14.4" }, note);
  for (const [x, y] of [[8.2, 15.8], [12.6, 14.6]]) atlasMake("ellipse", { class: "atl-prop-note-head", cx: x, cy: y, rx: 1.6, ry: 1.2 }, note);
  const moon = atlasGroup(hair.lock, "nmp nmp-nightcap");
  const [mx, my] = [spec.tip[0] + 2, spec.tip[1] + 5];
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: mx, cy: my, r: 5.5 }, moon);
  atlasMake("path", { class: "atl-prop-moon", d: `M${mx - 0.8} ${my - 4.6}A4.6 4.6 0 1 0 ${mx + 4} ${my + 2.6}A3.7 3.7 0 1 1 ${mx - 0.8} ${my - 4.6}Z` }, moon);
  atlasSpark(moon, mx - 5.6, my - 0.8, 1.2, "atl-sparkle");
  const glasses = atlasGroup(sway, "nmp nmp-glasses");
  for (const [cx, cy] of ATLAS_GEO.eyes) {
    atlasMake("path", { class: "atl-prop-lens", d: `M${cx - 5.8} ${cy + 0.2}Q${cx} ${cy + 7} ${cx + 5.8} ${cy + 0.2}Z` }, glasses);
  }
  atlasMake("path", { class: "atl-prop-rim", d: `M${ATLAS_GEO.eyes[0][0] + 5.8} ${ATLAS_GEO.eyes[0][1] + 0.2}Q31 ${ATLAS_GEO.eyes[0][1] - 1.2} ${ATLAS_GEO.eyes[1][0] - 5.8} ${ATLAS_GEO.eyes[1][1] + 0.2}` }, glasses);
}

//: The hand slots. The companion raises the right arm (-100deg at the
//: shoulder, set in the CSS for Atlas's short arm) to hold a bell or a
//: lantern up, so each is drawn turned the other way about the hand and
//: comes out upright once the arm is up.
function atlasHandProps(armR, armL) {
  const hand = [49.4, 58.4];
  const upright = atlasMake("g", { transform: `rotate(100 ${hand[0]} ${hand[1]})` }, armR);
  const bell = atlasGroup(upright, "nmp nmp-bell");
  atlasMake("circle", { class: "atl-prop-moon-glow", cx: 49.4, cy: 64.6, r: 6.5 }, bell);
  atlasMake("path", { class: "atl-prop-bell", d: "M45.4 66.4C45.4 60 53.4 60 53.4 66.4L54.8 68.2H44Z" }, bell);
  atlasMake("circle", { class: "atl-prop-bell-dot", cx: 49.4, cy: 69.5, r: 1.1 }, bell);
  const lantern = atlasGroup(upright, "nmp nmp-lantern");
  atlasMake("path", { class: "atl-prop-string", d: "M49.4 59.4V62" }, lantern);
  atlasMake("circle", { class: "nmp-lantern-glow atl-prop-moon-glow", cx: 49.4, cy: 65.4, r: 7.5 }, lantern);
  atlasMake("circle", { class: "atl-node-dot", cx: 49.4, cy: 65.4, r: 3.2 }, lantern);
  atlasSpark(lantern, 49.4, 65.4, 1.7, "atl-sparkle");
  const cable = atlasGroup(armL, "nmp nmp-cable");
  atlasMake("path", { class: "atl-prop-link", d: "M9.4 62.6L11 66.2M13 69.2L14.8 73" }, cable);
  atlasMake("path", { class: "atl-prop-zap", d: "M10.6 68.6L9.4 69.6M13.4 66.4L14.8 66" }, cable);
  for (const [x, y, r] of [[8.6, 61.2, 1.9], [15.4, 74.4, 1.9]]) atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r }, cable);
}

//: The head: hair and skin in the edge layer; the head's fill and rim
//: shade; the hair's fills over it (one surface); the specular, blush,
//: eyes, brows, mouths, then the extras.
function atlasHead(parent, id, level, look) {
  const tiny = level === "tiny";
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const head = atlasGroup(parent, "atl-head", ATLAS_GEO.neck);
  const sway = atlasGroup(head, "atl-sway", ATLAS_GEO.neck);
  atlasHair(sway, level, true, look);
  atlasMake("path", { class: "atl-edge", d: ATLAS_HEAD_PATH }, sway);
  atlasMake("path", { class: "atl-skin", d: ATLAS_HEAD_PATH }, sway);
  if (!tiny) atlasMake("path", { class: "atl-overlay atl-rim-head", d: ATLAS_HEAD_PATH }, sway);
  const hair = atlasHair(sway, level, false, look);
  if (!tiny) {
    for (const [cx, cy, r] of [[41.4, 14.6, 0.34], [43.6, 19.2, 0.26], [19.2, 29, 0.26]]) atlasMake("circle", { class: "atl-speck atl-speck-soft", cx, cy, r }, sway);
    atlasMake("ellipse", { class: "atl-sheen atl-sheen-head", cx: 24.6, cy: 13.8, rx: 5.2, ry: 2.8, transform: "rotate(-32 24.6 13.8)" }, sway);
    atlasMake("circle", { class: "atl-sheen atl-sheen-dot", cx: 19.6, cy: 19, r: 0.9 }, sway);
  }
  for (const [x, y] of ATLAS_GEO.cheeks) atlasMake("ellipse", { class: "atl-cheek", cx: x, cy: y, rx: tiny ? 3.2 : 3, ry: tiny ? 1.9 : 1.8 }, sway);
  for (const eye of ATLAS_GEO.eyes) atlasEye(sway, id, eye, tiny, spec.lashes);
  if (!tiny) {
    for (const [x, y, side] of ATLAS_GEO.brows) {
      const brow = atlasGroup(sway, `atl-brow atl-brow-${side > 0 ? "l" : "r"}`, [x, y]);
      const d = spec.brow === "straight"
        ? `M${x - 3 * side} ${y - 0.1}Q${x} ${y - 0.8} ${x + 3 * side} ${y + 0.5}`
        : `M${x - 2.8 * side} ${y - 0.2}Q${x - 0.3 * side} ${y - 1.9} ${x + 2.8 * side} ${y + 0.8}`;
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
  if (level === "figure") atlasHeadProps(sway, hair, look);
  return head;
}

//: **The rings of light** (the owner, of a first ring: "I like the ring it
//: made, maybe there can be more than one?? and it could be like a rope or
//: string of stars around him"; the reference: an orrery of thin rings
//: with small planets about the head). Three concentric ellipses in one
//: tilted frame flattened to a third of its height, each a faint glow under
//: a fine line with a little dust drifting round it (a sparse dash in a
//: group that turns), and a planet or a glint set on it in the drawing's
//: own space, so a dot stays round. Each ring is drawn in two halves: the
//: whole of it under the body, its front half again over the body
//: (clipped in the frame), so it wraps in depth.
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
function atlasBody(parent, id, props, look) {
  const layers = { edge: atlasGroup(parent, "atl-edges"), fill: atlasGroup(parent, "atl-fills") };
  const arms = {};
  for (const [kind, layer] of Object.entries(layers)) {
    const edge = kind === "edge";
    atlasTail(layer, edge, look);
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
      atlasMake("ellipse", { class: "atl-core-glow", cx: hx, cy: hy + 1, rx: 7, ry: 7.6 }, core);
      atlasMake("path", { class: "atl-thread", d: ATLAS_GEO.constellation.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") }, core);
      ATLAS_GEO.constellation.slice(1).forEach(([x, y], i) => {
        atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r: 0.75 }, core).style.setProperty("--atl-k", String(i));
      });
      const star = atlasGroup(core, "atl-star", [hx, hy]);
      atlasSpark(star, hx, hy, 2.8, "atl-chest-star");
      //: The gloss on the gel: one specular on the upper left of the body.
      atlasMake("ellipse", { class: "atl-sheen atl-sheen-body", cx: 24.8, cy: 41.4, rx: 1.2, ry: 3, transform: "rotate(14 24.8 41.4)" }, torso);
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
  if (props) atlasHandProps(arms.r, arms.l);
}

//: The gradients, per drawing (ids are per drawing, so two on a page never
//: share one): the skin in the drawing's own space, so hair, head, arms
//: and body are one continuous surface; the rim shades; the specular; the
//: iris; the constellation's glow; the tail's galaxy; the inner ears; each
//: eye's clip; and the rings' front halves.
function atlasDefs(svg, id, level) {
  const defs = atlasMake("defs", {}, svg);
  const stops = (grad, list) => {
    for (const [offset, cls] of list) atlasMake("stop", { offset, class: cls }, grad);
  };
  const skin = atlasMake("radialGradient", { id: `${id}-skin`, gradientUnits: "userSpaceOnUse", cx: 26, cy: 18, r: 74, fx: 25, fy: 15 }, defs);
  stops(skin, [[0, "atl-st-hi"], [0.16, "atl-st-lt"], [0.42, "atl-st-md"], [0.78, "atl-st-dp"], [1, "atl-st-rim"]]);
  //: Rim shades: clear in the middle, violet at the edge. The head's and
  //: the body's are in the drawing's space (their light is where the
  //: specular is); a limb's is in its own box, centred toward its root so
  //: the joint stays clear and the tip rounds off.
  const rimHead = atlasMake("radialGradient", { id: `${id}-rimh`, gradientUnits: "userSpaceOnUse", cx: 27.5, cy: 19, r: 19 }, defs);
  stops(rimHead, [[0.62, "atl-st-clear"], [1, "atl-st-shade"]]);
  const rimBody = atlasMake("radialGradient", { id: `${id}-rimb`, gradientUnits: "userSpaceOnUse", cx: 29.5, cy: 46, r: 17 }, defs);
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
  //: The tail: the body's blue into navy galaxy along its length, with a
  //: lilac nebula on the way, and white starlight at its tip.
  const galaxy = atlasMake("radialGradient", { id: `${id}-galaxy`, gradientUnits: "userSpaceOnUse", cx: 36, cy: 61, r: 40 }, defs);
  stops(galaxy, [[0.12, "atl-st-galaxy0"], [0.5, "atl-st-galaxy1"], [0.8, "atl-st-galaxy2"], [1, "atl-st-galaxy3"]]);
  //: The inner ears and the hair's ends: navy through violet to lilac.
  const hairNeb = atlasMake("radialGradient", { id: `${id}-hneb`, cx: 0.7, cy: 0.1, r: 0.9 }, defs);
  stops(hairNeb, [[0, "atl-st-neb20"], [0.5, "atl-st-neb0"], [1, "atl-st-neb1"]]);
  const earIn = atlasMake("linearGradient", { id: `${id}-earin`, x1: 0, y1: 0, x2: 0.4, y2: 1 }, defs);
  stops(earIn, [[0, "atl-st-navy"], [0.55, "atl-st-neb20"], [1, "atl-st-neb0"]]);
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
  for (const name of ["skin", "rimh", "rimb", "riml", "sheen", "aura", "core", "iris", "galaxy", "hneb", "earin", "tip"]) {
    svg.style.setProperty(`--atl-${name}`, `url(#${id}-${name})`);
  }
}

//: What each level shows, and the box it is drawn in. `full` keeps margins
//: for the glow, the rings, the tail and a raised hand; `head` is square
//: round the head and its hair; `tiny` crops tighter because at 16px every
//: unit counts.
const ATLAS_LEVELS = {
  full: { viewBox: [-12, -8, 88, 112], body: true },
  figure: { viewBox: [0, 0, 64, 92], body: true },
  head: { viewBox: [8, -6, 48, 48], body: false },
  tiny: { viewBox: [10, -3, 42, 43], body: false },
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
