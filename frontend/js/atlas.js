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
//:   belly, narrowing at the waist to 73; the main look's legs run from
//:   inside the hips to the soles' line at 90, and the feminine look has
//:   none, only a skirt of ribbons from the waist (round 6); the arms are
//:   18 long from a shoulder inside the chest, just under the chin. The eyes are 10 wide, 37% of the head,
//:   13 apart, set 63% down the head; the mouth 90% down.
//: - **One silhouette, all curves** (the owner: "no smooth organic flow or
//:   shape ... all too rigid"). Every shape is cubic Beziers with matching
//:   tangents at the joins, no straight segments and no corners. Every
//:   limb, lock, wisp and the tail is a tapered stem generated from a
//:   centreline (`atlasStem`): thick where it grows out of the body, fine
//:   and soft at the tip, its root well inside the body. All outlines are
//:   drawn first as one layer (`atl-edges`) and every fill on top
//:   (`atl-fills`), so where parts overlap the fills close the seams and
//:   the figure has one outer contour; the "outline" is a soft, wide
//:   glow in the sky-blue light colour at low opacity (the owner: "not
//:   organic and more like a doll or puppet"), a subsurface light round
//:   the whole silhouette rather than a drawn line, so the gradients do
//:   the modelling; only the tiny icon keeps a real line. Each limb is in both layers
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
//: - **The signature.** A faded constellation inside the chest and belly:
//:   a few small dim stars joined by hairlines, each in a soft glow, the
//:   heart among them only a little brighter (round 6: "they should be
//:   faded constelations"; the four-point star is gone). Three thin
//:   concentric rings of light orbit the head at cheek level, tilted,
//:   passing behind the head and in front of the chin, with a tiny planet
//:   or star glint on each. And the nebula: one ribbon of deep navy with
//:   violet and pink clouds and star dots that sweeps behind the body from
//:   the upper right and curls round under it, in a haze of soft clouds,
//:   all of it behind the figure, light and secondary (round 6; it used to
//:   cross once in front of the legs). Restraint: nothing else.
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

//: The point `t` of the way along a run of cubic segments, each segment an
//: equal share of `t`, as `atlasStemSides` samples them: where a speck sits
//: on a wisp, and what the shape test measures.
function atlasSegsAt(segs, t) {
  const k = Math.min(segs.length - 1, Math.floor(t * segs.length));
  const s = segs[k];
  const v = t * segs.length - k;
  const u = 1 - v;
  return [0, 1].map((i) => u * u * u * s[i] + 3 * u * u * v * s[2 + i] + 3 * u * v * v * s[4 + i] + v * v * v * s[6 + i]);
}

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

function atlasStem(segs, width, { samples = 10, cap = true, shift = null, tip = null } = {}) {
  const { left, right } = atlasStemSides(segs, width, samples, shift);
  const f = atlasFix;
  const tipL = left[left.length - 1];
  const tipR = right[right.length - 1];
  const r = Math.hypot(tipL[0] - tipR[0], tipL[1] - tipR[1]) / 2;
  let end;
  if (tip) {
    //: The stem's direction at its end, from its last two centre points,
    //: and its left-hand normal (the side `left` is offset to), the frame
    //: a hand or a foot is drawn in.
    const n = left.length - 1;
    const cx = (tipL[0] + tipR[0]) / 2;
    const cy = (tipL[1] + tipR[1]) / 2;
    const px = (left[n - 1][0] + right[n - 1][0]) / 2;
    const py = (left[n - 1][1] + right[n - 1][1]) / 2;
    const len = Math.hypot(cx - px, cy - py) || 1;
    const d = [(cx - px) / len, (cy - py) / len];
    end = tip(tipL, tipR, d, [-d[1], d[0]]);
  } else {
    end = cap && r > 0.05 ? `A${f(r)} ${f(r)} 0 0 1 ${f(tipR[0])} ${f(tipR[1])}` : `L${f(tipR[0])} ${f(tipR[1])}`;
  }
  return `M${f(left[0][0])} ${f(left[0][1])}${atlasSmooth(left)}${end}${atlasSmooth(right.slice().reverse())}Z`;
}

//: **Hands and feet** (the owner's read of rounds 3 and 4, INBOX 427:
//: "hands and feet"; the sprite sheet's small mittens with a thumb and its
//: little turned-out feet). Each is the end of its limb's own path, drawn
//: in place of the round cap from the stem's left tip round to its right,
//: so the limb stays one outline with no seam at the wrist or the ankle:
//: the edge layer strokes it once and the fill fills it once. Points are
//: in the stem's frame (forward along the limb, sideways along its left
//: normal), scaled by `k`, and `thumb` or `toe` says which side (+1 the
//: left normal, -1 the right) the thumb sticks out on, or the toes point
//: to. The hand: a palm a little wider than the wrist, two soft finger
//: swells at the end, and a thumb leaving the palm's inner side at a
//: third of its length. The foot: a sole at ankle height plus three, toes
//: out to one side and a small heel to the other.
function atlasTipShape(points, k) {
  return (tipL, tipR, d, L) => {
    const hw = Math.hypot(tipL[0] - tipR[0], tipL[1] - tipR[1]) / 2;
    const mx = (tipL[0] + tipR[0]) / 2;
    const my = (tipL[1] + tipR[1]) / 2;
    const at = ([fwd, side]) => {
      const sd = side > 0 ? hw + (side - 1) * k : side < 0 ? -hw + (side + 1) * k : 0;
      return [mx + d[0] * fwd * k + L[0] * sd, my + d[1] * fwd * k + L[1] * sd];
    };
    return atlasSmooth([tipL, ...points.map(at), tipR]);
  };
}
//: The side values: 1 and -1 are the wrist's own edges, more is out past
//: them (in units of `k`), and 0 the centre line.
//:
//: **Round 6, the owner: "fix and improve the arms".** At every size the
//: old hand read as a claw: its fingertips had a notch in them (two
//: swells, `[4.1, 0.5] [3.9, -0.2] [4.2, -0.9]`), and at 64 to 120px that
//: notch is two pixels and looks like a pincer. The hand is a mitten now:
//: the palm widens a little past the wrist, the fingers are one soft round
//: end, and the thumb leaves the palm's inner side clearly, a third of the
//: way along, so the shape says "hand" by its outline alone.
//:
//: **Round 8 (the owner's close-ups: "mitten blobs ... they should read as
//: small, shaped hands (a thumb, a slight finger split, tapered from the
//: wrist)").** The mitten was 4.45 long and 4.75 across at a 2.6 wrist, a
//: paddle twice the wrist's width. Now the palm leaves the wrist with no
//: step and widens only a little (to 0.4 past it), the fingers end in two
//: soft lobes with a split between them (0.45 deep: a crease, not the
//: claw's notch round 6 took out), and the thumb leaves the inner side at
//: a third of the length and ends in its own rounded tip, 4 long in all.
const ATLAS_HAND_POINTS = [
  [0.9, 1.15], [1.9, 1.3], [2.8, 1.2], [3.5, 1.0], [3.95, 0.6], [4.0, 0.22], [3.55, 0.02],
  [3.9, -0.22], [3.85, -0.62], [3.45, -0.9], [2.8, -1.0], [2.35, -1.15], [2.1, -1.75],
  [1.7, -2.15], [1.3, -2.05], [1.15, -1.55], [0.7, -1.05],
];
//: Round 7 (INBOX 430, the owner: "redesign the masculine limbs"): the
//: foot was a flat paddle, a sole three units deep with the toes five out
//: to the side, which read as a dark oval stuck under a stick. Now it is a
//: small soft foot that leaves the ankle with no step: the instep slopes
//: down and out to a rounded toe a little past the ankle, the sole is
//: shallow and the heel only a rounding of the ankle's back.
//: **Round 8** (the owner: "clumpy flat feet ... feet with a clear heel and
//: toe"): the instep slopes from the ankle to a rounded toe that tips up a
//: little at its end, the sole rises into an arch between the ball and the
//: heel, and the heel is its own rounded bump behind the ankle, so the
//: outline reads heel, arch, ball, toe.
//:
//: **Round 8, again** (the owner, of the sheet above: "the feet look like
//: they are facing the opposite direction"): a foot in profile, its toe
//: five units out to the side, read as pointing away from the body. The
//: figure faces us, so the foot does too: the toe comes forward (down the
//: drawing) and a little out, under the ankle, and the heel is the rounded
//: bump behind it on the inner side; the foot is 3.3 long and reaches 2.6
//: out, where it reached 4.75.
const ATLAS_FOOT_POINTS = [
  [0.8, 1.5], [1.6, 2.1], [2.4, 2.6], [3.0, 2.5], [3.25, 1.8], [3.3, 0.9], [3.15, 0.0],
  [2.9, -0.7], [2.6, -1.15], [2.35, -1.5], [1.9, -1.75], [1.35, -1.6], [0.8, -1.2],
];
//: Mirrored **and walked the other way round**: a tip is drawn from the
//: stem's left edge round to its right (`atlasTipShape`), so a mirror that
//: kept the order started on the wrong side, crossed the ankle and came
//: back, which drew the right foot apart from its leg (the owner: "the foot
//: on the right ... looks disconnected from the leg") and the left hand's
//: thumb the same way.
const atlasMirrorPoints = (pts) => pts.map(([fwd, side]) => [fwd, -side]).reverse();
const atlasHand = (thumb, k = 1) => atlasTipShape(thumb < 0 ? ATLAS_HAND_POINTS : atlasMirrorPoints(ATLAS_HAND_POINTS), k);
const atlasFoot = (toe, k = 1) => atlasTipShape(toe > 0 ? ATLAS_FOOT_POINTS : atlasMirrorPoints(ATLAS_FOOT_POINTS), k);
//: A limb that ends in a hand or a foot tapers to the wrist or ankle and
//: stops there; the shape takes over. No paw swell.
const atlasLimbTo = (root, end) => (t) => root - (root - end) * Math.min(1, t * 1.15) ** 0.9;
//: **A shaped limb** (round 7): the taper with a muscle's swell on it, a
//: calf or a forearm, `swell` units at `at` of the way down and gone either
//: side of it, so the limb narrows to a knee or an elbow and fills again
//: before the ankle or the wrist. A straight taper read as a tube.
const atlasLimbShaped = (root, end, at, swell) => (t) => root - (root - end) * t ** 0.8 + swell * Math.exp(-(((t - at) / 0.16) ** 2));

//: The stem's upper side alone, as an open path: the lighter leading edge
//: of a lock of the mane.
function atlasStemEdge(segs, width, samples) {
  const { right } = atlasStemSides(segs, width, samples);
  const f = atlasFix;
  return `M${f(right[0][0])} ${f(right[0][1])}${atlasSmooth(right)}`;
}

//: Star specks as one path: each a circle of two arcs, so a sky of them is
//: one node rather than thirty (the companion's figure pays per node).
function atlasSpecks(parent, list, cls = "atl-speck") {
  const f = atlasFix;
  const d = list.map(([x, y, r]) => `M${f(x - r)} ${f(y)}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0`).join("");
  return atlasMake("path", { class: cls, d }, parent);
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
  //: Tilted a little further (round 7, the owner: "tilt the celestial
  //: rings a little"): -11 degrees, where -5 read as level.
  ringFrame: { cx: 31, cy: 31, flat: 0.34, tilt: -11 },
  //: The constellation inside the body (round 6, the owner: "refine the
  //: atlas character chest stars, they should be faded constelations"): a
  //: small asterism across the chest and down the belly, the heart first
  //: (the mood's star), then the stars in the order the line visits them,
  //: [x, y, r, brightness]. Uneven, as a real one is: a short arc over the
  //: heart and a tail running down to the left, one branch to the right.
  constellation: [[31.2, 46.2, 0.72, 0.85], [27, 44.6, 0.5, 0.55], [24.8, 48.6, 0.42, 0.45], [34.6, 50.2, 0.55, 0.6], [32.4, 54.4, 0.5, 0.5], [28.6, 57, 0.42, 0.42], [36.4, 57.4, 0.38, 0.38]],
  //: The hairlines between them, by index: the arc over the heart, the
  //: tail and the branch. Not every star is joined to the heart, which is
  //: what made the old one read as a badge rather than a constellation.
  constellationLines: [[2, 1], [1, 0], [0, 3], [3, 4], [4, 5], [4, 6]],
  neck: [31, 37],
  feet: [31, 90],
  chin: [31, 30],
  shoulders: [[24.6, 41], [37.4, 41]],
  hips: [[27.2, 60], [34.8, 60]],
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
    //: The crest: four locks swept back, a quarter fuller than drawn (the
    //: owner, round 5: "flowing, voluminous"), over a soft mass that fills
    //: the gaps between them so the crest reads as hair, not streaks.
    locks: [
      { seg: [[23, 12, 26, 0, 42, -3, 52, 6], [52, 6, 57, 10.6, 58, 16, 54.6, 19.4]], w: [7.8, 0.7] },
      { seg: [[28, 10, 36, 0.4, 50, 3, 58, 13], [58, 13, 63, 19.6, 62.6, 26, 58.4, 29]], w: [8.8, 0.8] },
      { seg: [[33, 9.6, 40, 3.6, 53, 7, 59, 19], [59, 19, 63.4, 27.4, 61.6, 34, 56.6, 37.4]], w: [8, 0.8] },
      { seg: [[37, 11, 43, 8, 52, 14, 55.6, 24], [55.6, 24, 58.4, 32, 57.2, 39, 52.4, 43]], w: [6.2, 0.7] },
      { seg: [[27, 11, 34, 0, 48, 0, 57, 12]], w: [12, 2.4], mass: true },
    ],
    head: [
      { seg: [[23, 12, 28, 2, 44, 1, 52, 8], [52, 8, 55.6, 11.4, 56, 15.4, 53.4, 18]], w: [7.8, 0.7] },
      { seg: [[28, 10, 36, 0.4, 49, 3, 54.4, 12], [54.4, 12, 57.6, 17, 57.4, 22.4, 54, 25.4]], w: [8.8, 0.8] },
      { seg: [[33, 9.6, 40, 3.6, 51, 7, 55, 17], [55, 17, 58, 24, 57, 30, 52.6, 33.6]], w: [8, 0.8] },
      { seg: [[37, 11, 43, 8, 51, 13, 53.6, 22], [53.6, 22, 55.6, 29, 54.6, 35, 50.4, 39]], w: [6.2, 0.7] },
      { seg: [[27, 11, 34, 0, 47, 0, 54, 11]], w: [12, 2.4], mass: true },
    ],
    brow: "straight",
    lashes: false,
    tail: [[33, 60, 45, 57.6, 56, 62.6, 53.6, 71], [53.6, 71, 50.6, 80, 53, 89, 62, 90.4], [62, 90.4, 69.6, 91.4, 72.4, 84.4, 66.6, 80.4]],
    tailWidth: (t) => 3.6 + 5.8 * Math.sin(Math.PI * Math.min(1, t * 1.06)) - 1.8 * t * t,
    tailStars: [[46.6, 61.4, 0.45], [54.2, 68.6, 0.35], [51.4, 78.4, 0.5], [55.6, 88.4, 0.35], [65.4, 89.4, 0.45]],
    tailTip: [67, 80.2],
    //: **A star-being, not an animatronic** (round 9, the owner: "it still
    //: looks like a fnaf character"). What read as mechanical: two stiff
    //: pillar legs with round feet, a blocky egg of a torso, straight tube
    //: arms with round paws, a wide fixed stare. Now the torso tapers from
    //: sloped shoulders to a waist and melts (the `waist` fade) into a trail
    //: of nebula wisps, no legs; the arms are slimmer, bend softly at
    //: the elbow and end in small relaxed mittens; the eyes are a size
    //: smaller under a relaxed lid (the CSS); and the body sways gently at
    //: rest. His trail is one thick wisp with thin strands off it (`lowers`,
    //: below): a comet's trail rather than her gown.
    //: **Hair on the head** (round 9, the owner: "have the hair start a
    //: little on the head, not have it look like a bald head with lots of
    //: hair coming from the back"): a short cap swept to his right over the
    //: crown, its hairline cut into two small points; the crest and the
    //: ears rise from it (`atlasHairCap`).
    cap: "M18.4 20.6C17.8 12.6 23.4 6.8 31 6.8C38.6 6.8 44.2 12.6 43.8 20C42.6 16.2 40.2 13.4 37 12.2C36.4 13.6 35 14.6 33.6 14.8C33.8 13.8 33.6 13 33 12.4C31.6 14 29.6 15 27.6 15.2C28 14.4 28 13.6 27.6 13C25 14.4 22 16.8 18.4 20.6Z",
    legs: false,
    lowerPivot: [31, 58],
    //: **One snake of a wisp, sub-wisps branching off it** (INBOX 435 (3),
    //: wrapup-0927 item 7; the owner: "on the masculine atlas lower body
    //: looks like a tripod and very straight pencil-y, I was thinking like a
    //: thicker main whispy tail in the middle like a snake and then the
    //: smaller ones on the side", at release "too straight and pointy and
    //: not flowy", then "the side whisps should be thicker and more like
    //: proper sub whisps", "properly and cleanly integrated with the body
    //: and not obviously separate shapes", "the subwhisps look like spider
    //: or centipede legs" and "the bottom body whisps need to fit better to
    //: the full width of the main body and also the middle isnt now really
    //: bigger than the subwhisps"). Round 9 drew three near-straight
    //: streams of one width over a veil cut into two points: five parallel
    //: spikes. Now (`lowerTaper: "wisp"`):
    //: - the main wisp (`main`) leaves the torso as wide as the hips
    //:   (`hip`), flush with the body's flanks, narrows to a trunk (`w`)
    //:   by y 70, swings left, back right and curls in at the tip in one S,
    //:   and ends round, 1.6 across, not in a point;
    //: - two sub-wisps (`side`, -1 the viewer's left), not a mirrored pair:
    //:   each branches from inside the trunk at its own height (y 71 and
    //:   82), half the trunk's width there, and flows down and a little
    //:   out in one arc with no knee to a round tip, the two of different
    //:   lengths, like curls peeling off a plume of smoke, not legs.
    //: All of it is drawn as one silhouette (`spec.trail`, atlasBuild), so
    //: no join shows. Specks are placed along each centreline as [t, r].
    lowerTaper: "wisp",
    lowers: [
      { main: true, seg: [[31, 56, 31, 63.5, 26, 68, 26.4, 75], [26.4, 75, 26.8, 82, 35.6, 83, 35.8, 90], [35.8, 90, 36, 95, 32.4, 98.2, 30.2, 96.2]], w: 11, hip: 16, specks: [[0.3, 0.34], [0.52, 0.3], [0.7, 0.32], [0.86, 0.26]] },
      { side: -1, seg: [[26.4, 71, 25.4, 77.4, 22.6, 82.6, 18.6, 84.4]], w: 3.8, specks: [[0.45, 0.24], [0.8, 0.2]] },
      { side: 1, seg: [[31.6, 82, 34.4, 85.6, 38.4, 90.6, 42.4, 98.6]], w: 2.9, specks: [[0.55, 0.22]] },
    ],
    torso: "M25.6 35.4C22.2 38.6 21.4 43.4 22 47.8C22.6 52.4 24.4 57.4 27.2 61C29.2 63.4 32.8 63.4 34.8 61C37.6 57.4 39.4 52.4 40 47.8C40.6 43.4 39.8 38.6 36.4 35.4Z",
    //: Arms hanging relaxed with a soft bend at the elbow, the forearm
    //: angling back in; slimmer (4.4 at the shoulder to 1.8 at the wrist)
    //: with a smaller mitten (0.9).
    armL: [[26.6, 40.6, 22.2, 42.6, 19.6, 47, 18.8, 51.4], [18.8, 51.4, 18.2, 54.6, 18.6, 57, 19.4, 59]],
    arm: [[35.4, 40.6, 39.8, 42.6, 42.4, 47, 43.2, 51.4], [43.2, 51.4, 43.8, 54.6, 43.4, 57, 42.6, 59]],
    armWidth: [4.4, 1.8],
    armHands: [-1, 1],
    handScale: 0.9,
    //: Where the right mitten grips a bell or a lantern (`atlasHandProps`).
    propHand: [42.2, 60.4],
  },
  //: **The feminine look** (the owner: "the female designs I gave you are
  //: quite different"): no ear tufts, only a small fin swept back at each
  //: temple; long hair streaming back and down with a constellation
  //: threaded through it; a slender figure that flows, from the hips down,
  //: into a skirt of wispy ribbons, with no legs and no feet (round 6, the
  //: owner: "it still has feet and legs. it shouldnt and its lower body
  //: should be the feminie flowing whispy ribbons"); the right hand held
  //: out sowing star seeds; a paler, lilac skin (the CSS).
  feminine: {
    //: **Angel's-wing ears** (round 9, the owner: "improve the feminine
    //: ears, make them angelic and fluffy"). Round 6's fins were thin
    //: points that read as horns, and at icon size as two spikes on a
    //: blob. Now each is a small wing swept up and back from the temple:
    //: a smooth leading edge, a trailing edge of four rounded feather tips,
    //: three pale feather lines inside and a soft glow behind, so it reads
    //: as down and light, rounded at every size.
    ear: atlasScalePath("M22.8 11.6C19.8 8.2 15.2 4.4 9.8 3.4C7.6 3 7 6.4 9.2 7.6C6.8 8.6 7.4 11.8 10.4 11.6C8.8 13.6 10.8 15.6 13.8 14.6C13.4 16.8 16.6 18.2 19.4 17C20.4 16.6 20.8 16.2 21.2 15.6L22.8 11.6Z", 0.86, 21.6, 14),
    earFeathers: atlasScalePath("M20.6 13.4C17.4 10.4 14 7.6 10.6 5.6M20.2 14.8C17 13 14 11.6 11.2 10.2M20 15.8C18 15.6 16.2 15.2 14.6 14.2", 0.86, 21.6, 14),
    earGlow: [14.8, 9.6, 8, 7],
    earIn: "",
    earTip: [11.6, 5],
    fin: true,
    //: At icon size (the `tiny` level, under 28px) the mane is not drawn,
    //: and without it the feminine face was a pale blob with two points
    //: (the owner: "make the mini atlas avatar on the atlas feminine
    //: version look better"). One lilac silhouette of hair behind the
    //: head instead: a rim over the crown and the left temple, falling
    //: fuller past the right cheek, inside the tiny crop (x 13 to 49).
    //: and a side-swept fringe over the crown, so the top of the head is
    //: hair rather than a bald dome between the wings.
    tinyFringe: "M18.4 22C18.6 13.4 24 8.2 31 8.2C37.6 8.2 43 12.6 44.2 19.4C41.4 15.4 37 13 32 13.2C26.6 13.4 21.8 16.6 18.4 22Z",
    tinyHair: "M17.6 33.6C14.2 29.6 13.4 23.4 14.8 17.8C16.8 9.6 23.2 3.6 31.2 3.4C40 3.2 46.4 9.4 47.4 18.4C48.2 25 47.8 32.2 46 37.4C45.2 34 44.2 31.4 42.4 29.4L31 22L20 29.6Z",
    strand: "",
    //: **No legs** (`legs: false`: the figure draws none, and the companion
    //: builds no leg layers for this look).
    legs: false,
    //: **The skirt of ribbons** (round 6). A veil flares from the waist,
    //: inside the torso, so the body flows into it with no seam, out over
    //: the hips and down to a hem cut into soft points; over it five
    //: ribbons fall from the waist in long S curves out of step with each
    //: other and run on past the hem into hair-fine wisps. The hem is
    //: ragged, not a bell: the points and the ribbons end at different
    //: heights, and the outer two ribbons flick outward at their tips. The
    //: whole skirt is translucent, fading toward the hem (a gradient in the
    //: drawing's space, `skirt`), with a pale stream along each ribbon and a
    //: lit edge on two. In the companion it is the `lower` layer, which
    //: sways on its root; each pose shapes it from the group inside
    //: (`.atl-lower`, the CSS), which turns about the waist (`lowerPivot`).
    lowerPivot: [31, 56],
    //: **A gown with a train** (INBOX 480, the owner: "a better and more
    //: majestic and attractive female atlas lower body"). INBOX 443's A-line
    //: was one pale veil fading to nothing by its hem, with four straight
    //: folds fanned over it, which read as a lamp shade, or a jellyfish
    //: again. Now three layers, back to front, each one soft curve. A train
    //: behind, in the nebula's own deeper colours, sweeps out past the hem
    //: on her left (the viewer's right) and curls up where the comet tail
    //: runs, so the gown flows into the nebula. The gown itself is close at
    //: the waist and flares low, a trumpet line, its hem two slow waves
    //: that drop toward the train. A sheer overskirt over it ends higher,
    //: its hem dipping toward the train and lit (`skirtDrape`, a second
    //: tier, which is the depth). The colour deepens from her
    //: skin's light at the waist to the nebula's violet at the hem
    //: (`--atl-gown`), so the hem has weight instead of dissolving; a lit
    //: line runs along it (`skirtHem`), stars are scattered over the lower
    //: gown and the train (`skirtStars`), and ribbon tails flow over it
    //: (`lowers`, below).
    skirt: "M25.2 50C24 55 23.2 60 23.4 64.6C23.6 69 24.2 71.4 23.6 75C22.4 81 17.6 86.8 11.4 90.6C15.8 93 20.4 93.8 24.8 93.2C29 92.6 32 95 36.4 95.6C41.6 96.2 47.2 94.4 52.4 92.4C46 88.8 41 82.6 39.6 76C39 72.4 38.6 69.4 38.8 64.6C39 60 38.4 55 37.4 50C33.6 48.4 29 48.4 25.2 50Z",
    skirtTrain: "M27 56C26 68 22 80 13.4 88.6C20 95.4 30 98.4 40 98.8C48.6 99.2 56 97.8 61.2 95C64.6 93 65.6 89.8 63.8 87.8C62.2 90 58.6 91.2 54.6 90.8C48.4 90.2 43.2 85 40.6 78C38.6 71.6 37.6 63 36 56Z",
    skirtDrape: "M25.6 52C24.6 56 23.8 61 24 65C24.2 69 24.6 71.6 24 75C23.2 79 21 82 18.6 84.2C22.6 86.2 26.8 86 31 85.4C36 84.8 41.4 86.8 46.2 88.2C42.4 84 40.4 80 39.4 75.6C38.6 72 38.2 69 38.4 65C38.6 61 37.8 56 37 52C33.4 50.6 29.2 50.6 25.6 52Z",
    skirtDrapeEdge: "M18.6 84.2C22.6 86.2 26.8 86 31 85.4C36 84.8 41.4 86.8 46.2 88.2",
    skirtHem: "M11.4 90.6C15.8 93 20.4 93.8 24.8 93.2C29 92.6 32 95 36.4 95.6C41.6 96.2 47.2 94.4 52.4 92.4M13.4 88.6C20 95.4 30 98.4 40 98.8C48.6 99.2 56 97.8 61.2 95C64.6 93 65.6 89.8 63.8 87.8",
    skirtStars: [[17.6, 87.4, 0.28], [23.4, 90.6, 0.22], [28.8, 88.4, 0.3], [35.2, 92, 0.26], [41.2, 89.8, 0.32], [46.4, 91.6, 0.22], [44, 85, 0.2], [26.2, 84.4, 0.18], [52.6, 95.6, 0.3], [57.8, 93.8, 0.24], [61.4, 90.4, 0.28], [36.4, 80.2, 0.18]],
    //: Round 8 (the owner: "make the middle strands thicker and longer
    //: (reaching lower), keeping the outer ones as they are, so it reads
    //: as a trail rather than tentacles"): the three middle ribbons are a
    //: fifth to a third wider (7.2, 7.8, 7.2, where they were 5.8, 5.6,
    //: 5.8) and run on 5 to 6 units further down, the centre one longest,
    //: so the skirt tapers to a trail below the figure. The outer two are
    //: unchanged.
    //: **An astral crown, not a fringe** (the owner after 0bcfd1a: "I dont
    //: like the forehead hair part. it gives off school girl vibes and not
    //: astral cosmic beauty vibes", and "a bit more texture to the start of
    //: the long hair"). Round 9's cap was parted right of centre with three
    //: soft locks curving down out of the parting over the brow: a centre
    //: parting and two rounded curtains, which is the schoolgirl. Now the
    //: hair is swept back off the brow: the cap's lower edge is one high,
    //: smooth arc (the hairline, no parting), and fine strands rise from it
    //: up and back over the crown into the mass that streams behind.
    //: **Hair, not a night cap** (INBOX 480, the owner of a smooth dome with
    //: one star: "it still looks like she's wearing a night cap :("). A
    //: dome of hair whose lower edge runs in one smooth arc across the
    //: forehead is a cap, whatever is drawn on it. Now the hair parts off
    //: centre, over her right eye (the viewer's right, x 37.4), and sweeps
    //: across the brow to her left in three soft locks of different
    //: lengths, each ending in a point (17, 18.4, then down past the temple
    //: at 21), with the forehead's skin showing in the notches between
    //: them (up to 12.8 and 14.2): a side-swept fringe that flows into the
    //: hair behind, not the parted curtains of round 9. A fine shade runs
    //: up each notch so the locks read as separate (`fringeShade`), and
    //: the star is a small ornament pinned at the parting (`browStar`),
    //: off centre, not a badge in the middle of a cap.
    cap: "M17.8 21C17.4 12.4 23.4 6.6 31 6.6C38.8 6.6 44.6 12.4 44.4 20.6C43.2 16.6 40.8 13 37.4 11.4C36.2 13.6 35 15.6 33 17C32.6 15.2 31.8 13.8 30.4 12.8C29.4 15.2 27.8 17.2 25.4 18.4C25.6 16.6 25.4 15.2 24.6 14.2C22.8 16.6 20.4 18.6 17.8 21Z",
    fringeShade: "M37.2 11.8C35.8 10.6 33.6 10.2 31.4 10.6M30.6 13.2C30.2 11.6 29 10.6 27.4 10.4M24.8 14.6C24.2 13.2 23 12.4 21.4 12.4",
    browStar: [39.6, 10.2, 1],
    //: **Ribbon tails, not a tripod** (INBOX 480, the owner: "make the
    //: feminine atlas's whispy lower body limbs less like a tripod and more
    //: like whispy ribbony/flowy tails", and "i like the dress as well";
    //: then, of thin tails from the waist: "too thin and stick like and they
    //: dont fit the lower body fully and seem like they sprout from th
    //: emiddle bottom of the main body"). Five broad ribbons, rooted across
    //: the whole width of the dress's lower half (x 22 to 41) and overlapping
    //: it, so the dress flows into them: each fades in over its root (the
    //: `tailin` mask, 74 to 86), is widest there (7.4 to 9 across), and
    //: sweeps out and down past the hem in one long curve, its wisp lifting
    //: a little as cloth does in a breeze (no curl back, which read as a
    //: claw), with a twist in it (the width pinches where the ribbon turns
    //: edge-on, `tail` in `atlasTune`). Two tiers: `back`, three in the
    //: nebula's lilac, one sweeping out to each side and one spilling under
    //: the hem; the front two sheer, in her light. `op` is each ribbon's
    //: own opacity. Each tier is its own layer in the companion, drifting on
    //: its own clock out of step with the gown and the other.
    lowers: [
      { seg: [[22, 74, 17, 83, 9.6, 89.4, 1.6, 92.2], [1.6, 92.2, -2, 93.4, -5, 93, -7.4, 91.6]], w: 9, op: 0.66, back: true, specks: [[7.4, 90.4, 0.32], [-2.6, 92.8, 0.26]] },
      { seg: [[41, 74, 46.4, 83, 54, 89, 62, 91.6], [62, 91.6, 65.6, 92.8, 68.6, 92.4, 71, 91]], w: 9, op: 0.7, back: true, specks: [[56, 89.8, 0.32], [66.4, 92.4, 0.26]] },
      { seg: [[31, 78, 30.6, 88, 28.6, 94.6, 24, 98.2]], w: 7.4, op: 0.5, back: true, specks: [[27.8, 95.4, 0.28]] },
      { seg: [[26, 76, 24.6, 85, 19.8, 91.6, 12.4, 95], [12.4, 95, 9.4, 96.4, 6.4, 96.6, 4, 95.8]], w: 7.4, op: 0.52, specks: [[16.6, 93.4, 0.26]] },
      { seg: [[36.4, 76, 39, 85, 44.8, 92, 52.4, 95.6], [52.4, 95.6, 55.6, 97, 58.6, 97.4, 61.4, 96.6]], w: 7.6, op: 0.56, specks: [[47.6, 94, 0.28]] },
    ],
    arm: [[35.6, 40.4, 41, 41.8, 46.2, 41.2, 50.2, 39.4]],
    armL: [[26.4, 40.4, 21.6, 41.8, 18.6, 46.6, 18.2, 53.6]],
    //: Her held-out arm ends at (50.2, 39.4): the bell and the lantern
    //: hang from there, where they floated 23 units off (`atlasHandProps`).
    propHand: [51.2, 39.6],
    seeds: [[53.6, 36.4, 0.5], [55.8, 33, 0.4], [58.4, 30.4, 0.6], [56.6, 27, 0.35], [60.6, 27.4, 0.45], [62.2, 23.6, 0.35], [59, 34.8, 0.3]],
    //: **The hair, drawn full** (the owner, round 5: "flowing, voluminous";
    //: the definitive stand, 63.png, where the hair is a mass the size of
    //: the head rising from the crown and streaming back in thick wavy
    //: locks, and one lock falls forward over the shoulder). Seven locks
    //: fan from the crown, up and back, straight back and down and back,
    //: each with a wave in it, their roots wide enough to overlap; a soft
    //: mass behind them fills what is left; the eighth falls forward past
    //: the left cheek to the shoulder. Nothing streams past x 78, so the
    //: companion's 64px box is overrun by the same margin as the tail.
    //: Round 9 (the owner: "there's a little gap between the large hair
    //: and the ears ... should the hair on the edge there be better
    //: connected to the head and not look like a separate shape"): every
    //: lock's root now starts inside the head, under its outline, so no
    //: lock's flat root end shows as a straight edge beside a wing; the
    //: mass grows from the middle of the head, up over the crown; and each
    //: lock is shaded darker at the scalp fading to its light ends
    //: (`atl-hair-root`), so the whole reads as one mass growing from the
    //: head rather than a slab laid behind it.
    locks: [
      { seg: [[27, 14, 30, -5, 50, -9, 62, 2], [62, 2, 72, 10, 74, 22, 66, 28]], w: [9, 1] },
      { seg: [[28.6, 12, 36, -7, 56, -3, 66, 10], [66, 10, 77, 22, 77, 38, 68, 46]], w: [10, 1.2] },
      { seg: [[33, 12, 43, 0, 60, 5, 69, 20], [69, 20, 78, 38, 75, 54, 64, 60]], w: [10.5, 1.2] },
      { seg: [[36.4, 13.4, 45, 6, 58, 13, 63, 28], [63, 28, 69, 46, 66, 60, 56, 68]], w: [9, 1] },
      { seg: [[38.6, 16, 45, 15, 52, 24, 54, 38], [54, 38, 56, 52, 52, 62, 44, 68]], w: [7, 0.8] },
      { seg: [[24.6, 17, 18.4, 20, 14, 32, 17, 44], [17, 44, 19, 52, 15, 58, 11, 62]], w: [6.5, 0.8] },
      { seg: [[31, 21, 28.8, 4, 42, -4.6, 56, -2.2], [56, -2.2, 65, 0.8, 69.4, 9, 67.4, 17]], w: [20, 3], mass: true },
    ],
    head: [
      { seg: [[25.4, 15, 26, 2, 44, -1, 54, 6], [54, 6, 59, 10, 60, 16, 56, 19.6]], w: [8, 0.8] },
      { seg: [[26.6, 12.4, 32, -1, 49, 0, 56, 10], [56, 10, 61, 15.6, 61, 22, 57, 26]], w: [8.8, 0.9] },
      { seg: [[31, 11.4, 38, -2, 53, 1, 58, 14], [58, 14, 62, 22, 61, 30, 56, 35]], w: [9.4, 1] },
      { seg: [[35.6, 12.6, 43, 2.6, 55, 6.4, 58, 20], [58, 20, 61, 28, 59.6, 36, 54, 41]], w: [8.6, 0.9] },
      { seg: [[24.6, 17, 18.6, 20, 15, 30, 18, 40]], w: [6, 0.8] },
      { seg: [[31, 20, 29, 2, 42, -6.8, 53, -3.6], [53, -3.6, 58.6, -1.4, 60.6, 5, 59, 12]], w: [18, 3], mass: true },
    ],
    hairStars: [[50, -2], [62, 4], [72, 18], [77, 36], [72, 52], [62, 62], [52, 67]],
    //: Round 9 (the owner: "a bit more of a feminine chest but don't
    //: overdo it, just really subtle", then, of two drawn arcs of shade:
    //: "less ... like atlas is wearing cup bikinis ... make it attractive
    //: and smooth"). No line anywhere: the flanks swell in one continuous
    //: curve to 22.6 and 39.4 at y 45 and draw in to a waist below it, and
    //: the form is carried by light alone (`chestLight`): a soft radial
    //: glow over each side of the chest and a softer shade under it, each
    //: fading to nothing at its edge, blended into the skin. The five
    //: curves keep their roles (two per flank, one hem), which
    //: `atlasTorsoEdge` counts on.
    torso: "M26 35.6C23.4 38.2 22.3 41.8 22.6 45C22.9 48.8 23.6 57.6 27.4 61.4C29.2 63.8 32.8 63.8 34.6 61.4C38.4 57.6 39.1 48.8 39.4 45C39.7 41.8 38.6 38.2 36 35.6Z",
    //: [cx, cy, rx, ry] of the glow on each side and of the shade under it.
    chestLight: { glow: [[27.4, 43.8, 4.4, 3.6], [34.6, 43.8, 4.4, 3.6]], shade: [[27.6, 47.4, 4.2, 2.2], [34.4, 47.4, 4.2, 2.2]] },
    brow: "arch",
    lashes: true,
    tail: [[32, 61, 45, 58.4, 57, 64.4, 53.6, 74], [53.6, 74, 49.4, 83.4, 53, 92, 62, 92.4], [62, 92.4, 69.6, 92.6, 72, 86, 66.6, 82.6]],
    tailWidth: (t) => 5 + 5 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - 3.4 * t * t,
    tailStars: [[46.4, 62.4, 0.45], [54.4, 70, 0.35], [50.4, 80.6, 0.5], [54, 90, 0.35], [62.4, 92, 0.45], [69, 87.6, 0.35]],
    tailTip: [67, 82.4],
  },
};

//: Which look: Atlas's own setting when it is Masculine or Feminine
//: (Settings, Appearance, Atlas look). On Auto (the default) or with
//: nothing stored, it follows Face looks when that says Masculine or
//: Feminine; when that is Neutral it follows the look the person chose for
//: their own face (Profile, Your look), the one thing on the page that
//: says how they like a figure drawn; with neither it is the main look
//: (the owner: the male version is the main one; the feminine one is its
//: own look). `atlasLookReason()` says which of the four decided, for
//: Settings and the lab.
function atlasLook() {
  return atlasLookReason().look;
}

function atlasLookReason() {
  let own = null;
  try {
    own = localStorage.getItem("atlas-look");
  } catch {
    own = null;
  }
  if (own === "feminine" || own === "masculine") return { look: own, reason: "chosen" };
  const faces = typeof appearancePref === "function" ? appearancePref("face-look", "mixed") : "mixed";
  if (faces === "feminine" || faces === "masculine") return { look: faces, reason: "face-looks" };
  let mine = null;
  try {
    mine = typeof ownNameMarkStyle === "function" ? ownNameMarkStyle().look : null;
  } catch {
    mine = null;
  }
  if (mine === "feminine" || mine === "masculine") return { look: mine, reason: "your-look" };
  return { look: "masculine", reason: "default" };
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
//: A limb's width: a taper from the root to a narrow ankle or wrist, then
//: the small rounded paw (the owner, of the curled tendril tips: "the
//: feet and hands are inverted weird").
const atlasLimbWidth = (root, paw) => (t) => root - (root - 1.4) * Math.min(1, t * 1.15) ** 0.9 + atlasPaw(t, 0.72, paw);
//: The legs differ: the left carries the weight, straight, the right
//: rests a little out and forward (a slight contrapposto), so the stance
//: is not a doll's.
//: The legs leave the hips at 58, inside the torso, and reach the ankle
//: at 87 with the foot's sole on the soles' line: a third of the height
//: is leg, as the sprite sheet's Stand has it (the torso used to run to 68
//: over legs that began at 61, so a fifth of the height showed as leg).
//: **Round 7, the legs redrawn** (the owner: "redesign the masculine limbs
//: (arms, hands, legs, feet)"; "less obviously built from separate
//: shapes"). They were two straight tubes, 6.2 wide at the hip and 2.6 at
//: the ankle, rooted at 58 just inside the torso's hem, whose round bottom
//: then sat across their tops like a lid. Now each leaves the hip higher,
//: at 54, deep in the torso, fuller (7), so the hip is one slope out of the
//: body; runs in a slight S, the knee a touch inward, the calf filling
//: again below it (`atlasLimbShaped`), to a slim 2.2 ankle; and ends in the
//: smaller foot above.
const ATLAS_LEG_L = atlasStem([[27.3, 54, 26, 66.4, 27.4, 76.4, 26.5, 87]], atlasLimbShaped(7, 2.2, 0.66, 0.55), { samples: 16, tip: atlasFoot(1, 1) });
const ATLAS_LEG_R = atlasStem([[34.7, 54, 36.8, 66.4, 37.4, 77, 38.3, 86.6]], atlasLimbShaped(7, 2.2, 0.66, 0.55), { samples: 16, tip: atlasFoot(-1, 1) });
//: The right arm hangs with its inner side toward the body, the viewer's
//: left, which is the stem's left normal: the thumb is on +1. The left
//: arm is this one mirrored, thumb and all.
//:
//: **The arm, rebuilt (round 6).** Measured on the full drawing: the old
//: arm's root was the torso's own edge (37.6, 40.6), so the shoulder showed
//: as a notch between the chin and the arm, and a 4.8 to 2.2 taper over 14
//: units made a thin tube with a knob on it. Now the root is inside the
//: chest (35.8), under the chin, so the shoulder is one slope out of the
//: body; the arm is fuller at the shoulder (5.8) and tapers to a 2.6 wrist
//: along a gentle outward curve with the elbow's bend in it, so it hangs a
//: little away from the belly rather than stuck to it; and the hand is 15%
//: larger, enough to read as a hand in the 64px companion.
//: Round 7: the shoulder fuller still (6.6) and deeper in the chest, so
//: no seam shows where it leaves the body; a forearm's swell below the
//: elbow and a slimmer wrist (2.3); the hand a little smaller (1.05), the
//: mitten in proportion to the wrist rather than a paddle on a stick.
const ATLAS_ARM_R = atlasStem([[35.2, 40.6, 40.6, 41.4, 44, 46.4, 45, 54]], atlasLimbShaped(6.6, 2.3, 0.62, 0.4), { samples: 16, tip: atlasHand(1, 1.05) });
//: Raised, the inner side is the right normal.
const ATLAS_HOLD_R = atlasStem([[35.6, 41, 46.4, 34.4, 53, 16.6, 53, -2.2]], atlasLimbShaped(6.6, 2.3, 0.62, 0.4), { samples: 18, tip: atlasHand(-1, 1.05) });
const ATLAS_LIMBS = {
  legs: [["l", ATLAS_LEG_L], ["r", ATLAS_LEG_R]],
  arms: [["l", atlasMirror(ATLAS_ARM_R)], ["r", ATLAS_ARM_R]],
  holds: [["l", atlasMirror(ATLAS_HOLD_R)], ["r", ATLAS_HOLD_R]],
};
//: The body: one soft outline from under the chin, out round the belly,
//: in at the waist and flaring just enough at the hips for the tendril
//: legs to grow out of it.
const ATLAS_TORSO_PATH = "M25.4 35.6C22 41 20.8 47.4 21.6 53.4C22.4 57.4 24 60.6 26.8 62.6C29.4 64.4 33.8 64.4 36.4 62.6C39.2 60.6 40.8 57.4 41 53.4C41.2 47.4 39.8 41 36.6 35.6Z";
//: The torso's outline without its hem: the path's first two curves (down
//: the left flank to the hem's corner) and its last two (from the other
//: corner up the right flank), as two open strokes. Both torsos are drawn
//: the same way, five curves from the left shoulder round to the right.
function atlasTorsoEdge(d) {
  const start = d.match(/^M[^C]+/)[0];
  const curves = d.match(/C[^CZ]+/g);
  const at = (c) => c.trim().split(/[\s,]+/).slice(-2).join(" ");
  return `${start}${curves[0]}${curves[1]}M${at(curves[curves.length - 3])}${curves[curves.length - 2]}${curves[curves.length - 1]}`;
}

//: Thinking, a hand at the chin (the reference sheet): the right arm bent
//: up, drawn over the face in the head's own group.
const ATLAS_CHIN_HAND = atlasStem([[37.8, 42, 45.6, 45.4, 43.4, 36.8, 36, 37.2]], atlasLimbWidth(4.8, 1.3), { samples: 14 });

//: The paths generated per look: the tail's ribbon (the owner: "a stream
//: of cosmic water or a ribbon like pokemon tail ... not as furry but
//: kinda at the same time"): one continuous tapered stem, and inside it
//: two narrower streams, a pale one and a lilac one, whose centrelines
//: weave from side to side across it out of phase, so the ribbon reads as
//: twisted silk and water; the mane's locks; and, for both, the small
//: tuft of wisps on the crown.
//: **Tuning** (the avatar lab, `tools/avatar-lab.html`): a page may set
//: `window.ATLAS_TUNE` before atlas.js loads, or call `atlasRetune(next)`
//: afterwards, to try values without editing this file. Every key is
//: optional; the defaults are the drawing as designed:
//:
//:   bodyWidth      1     the torso's width about its centre line
//:   headSize       1     the head, ears and mane about the neck
//:   tailLength     1     the tail's reach from its root
//:   tailCurl       0     degrees the tail's last sweep turns (+ is up)
//:   strandOpacity  1     the galaxy strand and its coil
//:   starSize       1     the chest constellation's heart star
//:   lockCount      0     the mane's locks (0 is the look's own count)
//:   colours        {}    CSS palette overrides on the drawing:
//:                        hi, lt, md, dp, rim, navy, glow, line, blush
//:
//: The geometry that depends on these is built by `atlasBuild`, once at
//: load and again on every retune; the rest are custom properties set on
//: each drawing (`atlasDraw`). `atlasRetune` returns the tune in force.
const ATLAS_TUNE_DEFAULTS = { bodyWidth: 1, headSize: 1, tailLength: 1, tailCurl: 0, strandOpacity: 1, starSize: 1, lockCount: 0, colours: {} };
const ATLAS_TUNE_COLOURS = ["hi", "lt", "md", "dp", "rim", "navy", "glow", "line", "blush"];

function atlasTune() {
  const given = (typeof window !== "undefined" && window.ATLAS_TUNE && typeof window.ATLAS_TUNE === "object") ? window.ATLAS_TUNE : {};
  const tune = { ...ATLAS_TUNE_DEFAULTS };
  for (const key of Object.keys(ATLAS_TUNE_DEFAULTS)) {
    if (key === "colours") continue;
    const v = Number(given[key]);
    if (given[key] !== undefined && Number.isFinite(v)) tune[key] = v;
  }
  tune.colours = {};
  for (const key of ATLAS_TUNE_COLOURS) if (typeof given.colours?.[key] === "string") tune.colours[key] = given.colours[key];
  return tune;
}

//: A run of cubic segments scaled about a root and, from `from` on, turned
//: about that segment's start: the tail's length and curl.
function atlasTuneSegs(segs, root, k, curlDeg, from) {
  const [rx, ry] = root;
  const out = segs.map((seg) => seg.map((v, i) => (i % 2 ? ry + (v - ry) * k : rx + (v - rx) * k)));
  if (curlDeg && out.length > from) {
    const a = (-curlDeg * Math.PI) / 180;
    const [px, py] = [out[from][0], out[from][1]];
    const turn = (x, y) => [px + (x - px) * Math.cos(a) - (y - py) * Math.sin(a), py + (x - px) * Math.sin(a) + (y - py) * Math.cos(a)];
    for (let i = from; i < out.length; i += 1) {
      for (let j = i === from ? 2 : 0; j < 8; j += 2) [out[i][j], out[i][j + 1]] = turn(out[i][j], out[i][j + 1]);
    }
  }
  return out.map((seg) => seg.map((v) => +v.toFixed(2)));
}

function atlasBuild() {
  const tune = atlasTune();
  const lock = (l) => ({ fill: atlasStem(l.seg, atlasTaper(l.w[0], l.w[1]), { samples: 10, cap: false }), light: atlasStemEdge(l.seg, atlasTaper(l.w[0], l.w[1]), 10), mass: !!l.mass });
  for (const spec of Object.values(ATLAS_LOOKS)) {
    const root = [spec.tail[0][0], spec.tail[0][1]];
    const tail = atlasTuneSegs(spec.tail, root, tune.tailLength, tune.tailCurl, spec.tail.length - 1);
    spec.tailPath = atlasStem(tail, spec.tailWidth, { samples: 14 });
    spec.streamPath = atlasStem(tail, (t) => spec.tailWidth(t) * 0.26, { samples: 14, shift: (t) => spec.tailWidth(t) * 0.22 * Math.sin(Math.PI * 2.6 * t) });
    spec.silkPath = atlasStem(tail, (t) => spec.tailWidth(t) * 0.24, { samples: 14, shift: (t) => -spec.tailWidth(t) * 0.3 * Math.sin(Math.PI * 2.6 * t + 1.1) });
    //: The stars ride the tail's scale; the tip is the tuned tail's end.
    spec.tailStarsNow = spec.tailStars.map(([x, y, r]) => [+(root[0] + (x - root[0]) * tune.tailLength).toFixed(2), +(root[1] + (y - root[1]) * tune.tailLength).toFixed(2), r]);
    const last = tail[tail.length - 1];
    spec.tailTipNow = [last[6], last[7]];
    const n = tune.lockCount > 0 ? Math.round(tune.lockCount) : spec.locks.length;
    spec.lockPaths = spec.locks.slice(0, n).map(lock);
    spec.headPaths = spec.head.slice(0, n).map(lock);
    //: A front lock is thin at its root, swells, and ends in a rounded tip:
    //: no square end at either end to show as a seam on the cap.
    if (spec.frontLocks) {
      spec.frontPaths = spec.frontLocks.map(({ seg, w }) => atlasStem(seg, (t) => 0.35 + w * Math.sin(Math.PI * Math.min(1, t * 1.02)) ** 0.8, { samples: 10, cap: true }));
    }
    spec.torsoNow = atlasScalePathX(spec.torso || ATLAS_TORSO_PATH, tune.bodyWidth, 31);
    spec.torsoEdgeNow = atlasScalePathX(atlasTorsoEdge(spec.torso || ATLAS_TORSO_PATH), tune.bodyWidth, 31);
    if (spec.lowers) {
      //: Every wisp starts 6 units higher, straight up inside the torso,
      //: so its root is under the body's fade (the `lowerin` mask) rather
      //: than a flat end showing through it at the waist.
      const rooted = (seg) => {
        const [x, y] = seg[0];
        return [[x, y - 6, x, y - 4, x, y - 2, x, y], ...seg];
      };
      if (spec.lowerTaper === "wisp") {
        //: The masculine trail (`lowers`, above). The main wisp leaves the
        //: torso as wide as the body is at the hips (`hip`, 16 inside the
        //: torso, 14.3 at y 56 where the torso's flanks are 14.4 apart), so
        //: its outline carries straight on from the body's with no pinch at
        //: the waist (the owner: "the bottom body whisps need to fit better
        //: to the full width of the main body"); the flare goes by a
        //: quarter of the way down (y 70), and from there it is a trunk `w`
        //: across tapering evenly to a round tip 1.6 across, twice the width
        //: of each sub-wisp where that one branches ("the middle isnt now
        //: really bigger than the subwhisps"). A sub-wisp is built the same
        //: way at its own width: full where it leaves the main wisp,
        //: tapering evenly to a round tip 0.9 across, from inside the main
        //: wisp so its root is part of the trunk.
        const ease = (a, b, t) => {
          const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
          return k * k * (3 - 2 * k);
        };
        const main = (w, hip) => (t) => 1.6 + (w - 1.6) * (1 - t) ** 0.8 + (hip - w) * (1 - ease(0.28, 0.48, t));
        const sub = (w) => (t) => 0.9 + (w - 0.9) * (1 - t) ** 0.95;
        const parts = spec.lowers.map(({ main: isMain, side, seg: drawn, w, hip, specks }) => {
          const seg = drawn[0][1] < 62 ? rooted(drawn) : drawn;
          const width = isMain ? main(w, hip) : sub(w);
          return {
            side: side || 0,
            seg,
            width,
            fill: atlasStem(seg, width, { samples: 14, cap: true }),
            stream: atlasStem(seg, (t) => width(t) * 0.26, { samples: 14, cap: true, shift: (t) => width(t) * 0.2 * Math.sin(Math.PI * 2.4 * t + 0.4) }),
            //: Specks ride the drawn centreline, at [t, r].
            specks: specks.map(([t, r]) => [...atlasSegsAt(drawn, t).map(atlasFix), r]),
          };
        });
        spec.lowerPaths = parts;
        //: **One silhouette** (the owner: "make sure that they are properly
        //: and cleanly integrated with the body and not obviously separate
        //: shapes"). Each translucent paint is one path holding every
        //: wisp as a subpath: every stem is walked the same way round, so
        //: the nonzero fill paints where they overlap once, and a sub-wisp
        //: grows out of the main wisp with no brighter band, no line and no
        //: change of opacity at the join; drawn as separate paths, the
        //: overlap of two translucent fills showed as a lighter patch where
        //: each branch left the trunk. No veil: a haze round the trail drawn
        //: as a wider shape showed its own edge a unit outside the wisps, a
        //: second outline; and no lit edge is stroked along the main wisp
        //: (it ran across the roots of the branches).
        const join = (key) => parts.map((p) => p[key]).join("");
        spec.trail = { fill: join("fill"), stream: join("stream"), specks: parts.flatMap((p) => p.specks) };
        spec.skirt = "";
      } else {
        //: A ribbon tail (INBOX 480): full at its root, tapering to a wisp
        //: 0.22 across, and pinched to 58% twice along its run where it
        //: turns edge-on, which is what makes a band read as a ribbon and
        //: not as a limb. A pale stream weaves down its middle and its
        //: edge is lit.
        const tail = (w) => (t) => (0.22 + (w - 0.22) * (1 - t) ** 0.85) * (0.58 + 0.42 * Math.abs(Math.cos(Math.PI * (t * 1.6 + 0.15))));
        spec.lowerPaths = spec.lowers.map(({ seg, w, specks, op, back }) => {
          const width = tail(w);
          return {
            side: 0,
            fill: atlasStem(seg, width, { samples: 18, cap: true }),
            stream: atlasStem(seg, (t) => width(t) * 0.24, { samples: 18, cap: true, shift: (t) => width(t) * 0.22 * Math.sin(Math.PI * 2.2 * t + 0.4) }),
            edge: atlasStemEdge(seg, width, 18),
            specks,
            op,
            back: !!back,
          };
        });
      }
    }
    if (spec.arm) {
      //: The left arm hangs with the body on its right normal; the right
      //: arm is held out, palm down, the thumb along its upper edge.
      //: Round 6: the same shoulder inside the chest and the same mitten
      //: as the main look, a little slighter (5 to 2.3), not the 3.9 to 1.9
      //: stick with a small knob that the owner's screenshot showed.
      //: Round 9: a look may name its arms' widths, each hand's thumb side
      //: and the mitten's size (the masculine arms hang, both thumbs in).
      const [w0, w1] = spec.armWidth || [5, 2.3];
      const [thumbL, thumbR] = spec.armHands || [-1, -1];
      const k = spec.handScale || 1.05;
      spec.armPaths = [["l", atlasStem(spec.armL, atlasLimbTo(w0, w1), { samples: 14, tip: atlasHand(thumbL, k) })], ["r", atlasStem(spec.arm, atlasLimbTo(w0, w1), { samples: 14, tip: atlasHand(thumbR, k) })]];
    }
    if (spec.legs === false) spec.legPaths = [];
  }
  return tune;
}

//: Scales a hand-drawn path's x about a centre line (the torso's width).
function atlasScalePathX(d, k, cx) {
  return d.replace(/([MCLQ])([^MCLQZ]*)/g, (m, cmd, body) => {
    const n = body.trim().split(/[\s,]+/).map(Number);
    return cmd + n.map((v, i) => +(i % 2 ? v : cx + (v - cx) * k).toFixed(2)).join(" ");
  });
}

function atlasRetune(next) {
  if (typeof window !== "undefined") window.ATLAS_TUNE = { ...(window.ATLAS_TUNE || {}), ...(next || {}), colours: { ...(window.ATLAS_TUNE?.colours || {}), ...(next?.colours || {}) } };
  const tune = atlasBuild();
  //: A gradient's colours resolve on the shared defs, not on the drawing.
  for (const host of document.querySelectorAll("svg.atl-defs")) {
    for (const key of ATLAS_TUNE_COLOURS) host.style.setProperty(`--atl-${key}`, tune.colours[key] || "");
  }
  if (typeof atlasRepaint === "function") atlasRepaint();
  return tune;
}

atlasBuild();
const ATLAS_WISPS = ATLAS_GEO.wisps.map(([seg, w0, w1]) => atlasStem([seg], atlasTaper(w0, w1), { samples: 8, cap: false }));

//: **The galaxy strand** (the reference's nebula swirl): a ribbon of deep
//: indigo running to violet along its length, with a lit edge, star
//: specks and pink and blue nebula clouds inside and a haze of larger
//: clouds round it (`ATLAS_BAND`, below). Its width swells and thins
//: along the way, so it turns edge-on and reads as a ribbon rather than a
//: stripe, and a pale stream weaves inside it as in the tail.
//: **One orbit round the whole figure** (the owner, round 9: "can the
//: nebular stream ... go around the whole figure including the hair and
//: not be mostly hidden by the hair and cosmic rings"). Rounds 6 to 8 drew
//: it all behind, so on the feminine look the mane and the rings covered
//: its upper half and it read as a loop round the legs. Now it is a helix
//: of one and a third turns about the figure's axis (x 31), seen from a
//: little above: it starts thin at the lower right, passes in front under
//: the feet, rises up the left side, goes behind the body and the head,
//: comes out at the right over the mane, crosses in front over the crown
//: and trails off thin past the left ear. `atlasHelixAt` is the centre
//: line at an angle round the axis (90 is nearest the viewer, 270 the far
//: side), so which half is near is a fact of the geometry, not a guess:
//: the near spans are one path drawn over the figure, the hair and the
//: rings (`part` "front" in `atlasBand`), the far span one path under
//: everything, and the two meet end to end where the orbit turns at the
//: sides (seams under a speck each). The near half is wider and carries a
//: brighter stream, the far half narrower and quieter, so it has depth.
//: Round 6's objection to a front crossing ("cut across the legs") is
//: kept: the near spans pass under the feet and over the crown, clear of
//: the face, the torso and the legs.
//: Y at each quarter turn from 0 to 540 degrees (Catmull-Rom between), and
//: the tilt `e` that lowers the near side, fading from 8 to 3 up the turn.
const ATLAS_HELIX_Y = [92, 87, 77, 56, 16, -7, -12];
const ATLAS_HELIX = { from: 38, to: 505, r: 37, near: [196, 334] };
function atlasHelixAt(deg) {
  const u = Math.max(0, Math.min(5.999, deg / 90));
  const k = Math.floor(u);
  const f = u - k;
  const Y = ATLAS_HELIX_Y;
  const p0 = Y[Math.max(0, k - 1)], p1 = Y[k], p2 = Y[k + 1], p3 = Y[Math.min(Y.length - 1, k + 2)];
  const y = 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
  const rad = (deg * Math.PI) / 180;
  const e = 8 - 5 * (deg / 540);
  return [31 + ATLAS_HELIX.r * Math.cos(rad), y + e * Math.sin(rad)];
}
//: The helix from `a` to `b` degrees as cubics a quarter of a right angle
//: apart (Hermite tangents by a central difference), in `atlasStem`'s form.
function atlasHelixSegs(a, b) {
  const n = Math.max(1, Math.round((b - a) / 22.5));
  const h = (b - a) / n;
  const tan = (d) => {
    const [x0, y0] = atlasHelixAt(d - 0.5);
    const [x1, y1] = atlasHelixAt(d + 0.5);
    return [(x1 - x0) * (h / 3), (y1 - y0) * (h / 3)];
  };
  const segs = [];
  for (let i = 0; i < n; i += 1) {
    const d0 = a + i * h;
    const d1 = d0 + h;
    const [x0, y0] = atlasHelixAt(d0);
    const [x1, y1] = atlasHelixAt(d1);
    const [tx0, ty0] = tan(d0);
    const [tx1, ty1] = tan(d1);
    segs.push([x0, y0, x0 + tx0, y0 + ty0, x1 - tx1, y1 - ty1, x1, y1]);
  }
  return segs;
}
//: Width at an angle: a taper from a thin start to a thin end; depth, the
//: near side (sin > 0) a third wider than the far; and a twist that turns
//: the ribbon edge-on exactly where the halves meet, so neither seam is a
//: square end: the near half comes out of the mane as a ribbon turning
//: towards the viewer, not a cut (the first draft's, measured on the
//: feminine look). A gentler turn between keeps it reading as a ribbon.
function atlasHelixWidth(deg) {
  const t = (deg - ATLAS_HELIX.from) / (ATLAS_HELIX.to - ATLAS_HELIX.from);
  const base = 0.5 + 8.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.7;
  const near = (1 + Math.sin((deg * Math.PI) / 180)) / 2;
  const pinch = ATLAS_HELIX.near.reduce((w, at) => w - 0.86 * Math.exp(-(((deg - at) / 20) ** 2)), 1);
  const twist = 0.78 + 0.22 * Math.abs(Math.cos(Math.PI * 2.4 * t + 0.35));
  return base * pinch * twist * (0.66 + 0.34 * near);
}
//: One span's fill, lit edge and stream. The stream is the near side's
//: light: a third of the ribbon at the front, a sliver at the back.
function atlasHelixSpan(a, b) {
  const segs = atlasHelixSegs(a, b);
  const at = (t) => a + (b - a) * t;
  const width = (t) => atlasHelixWidth(at(t));
  const near = (t) => (1 + Math.sin((at(t) * Math.PI) / 180)) / 2;
  return {
    fill: atlasStem(segs, width, { samples: 5, cap: false }),
    edge: atlasStemEdge(segs, width, 5),
    stream: atlasStem(segs, (t) => width(t) * (0.12 + 0.24 * near(t)), { samples: 5, cap: false, shift: (t) => width(t) * 0.22 * Math.sin(Math.PI * 0.011 * at(t)) }),
  };
}
function atlasBandPaths() {
  const { from, to, near } = ATLAS_HELIX;
  const spans = { back: [[near[0], near[1]]], front: [[from, near[0]], [near[1], to]] };
  const out = {};
  for (const [part, list] of Object.entries(spans)) {
    const paths = list.map(([a, b]) => atlasHelixSpan(a, b));
    out[part] = { fill: paths.map((p) => p.fill).join(""), edge: paths.map((p) => p.edge).join(""), stream: paths.map((p) => p.stream).join("") };
  }
  return out;
}
const ATLAS_BAND = atlasBandPaths();
//: Specks, clouds and haze, placed by angle round the orbit so they stay on
//: it: [angle, radius] for a speck, [angle, rx, ry, colour] for a cloud;
//: `atlasBandSplit` turns them into points and sorts them into the half
//: their angle is in. The seams get a speck each.
const ATLAS_BAND_STARS = [[50, 0.3], [72, 0.42], [110, 0.34], [150, 0.4], [196, 0.5], [214, 0.34], [240, 0.3], [300, 0.36], [334, 0.5], [352, 0.4], [378, 0.34], [404, 0.42], [428, 0.3], [452, 0.36], [476, 0.3], [496, 0.24]];
const ATLAS_BAND_CLOUDS = [[68, 12, 5, "pink"], [132, 11, 7, "blue"], [210, 8, 10, "pink"], [300, 10, 7, "blue"], [372, 9, 9, "pink"], [420, 11, 6, "blue"], [470, 9, 5, "pink"]];
//: The haze round it, unclipped and faint: larger clouds that the ribbon
//: runs through, so its edges dissolve into light. Round 8 widened the
//: ribbon to 8.8 and the haze a third; the near half keeps both.
const ATLAS_BAND_HAZE = [[80, 18, 5, "blue"], [160, 6, 14, "pink"], [220, 10, 16, "blue"], [300, 14, 11, "pink"], [376, 7, 13, "blue"], [436, 16, 6, "pink"]];
function atlasBandSplit(list, part) {
  const [n0, n1] = ATLAS_HELIX.near;
  return list.filter(([deg]) => (deg >= n0 && deg <= n1) === (part === "back")).map(([deg, ...rest]) => [...atlasHelixAt(deg), ...rest]);
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
  //: Round 9: the doze's mouth, a small relaxed curve narrower and flatter
  //: than `smile`, where sleepy wore `tinyo`, which read as a pout or a kiss
  //: (the owner: "also what is this face").
  rest: { d: "M29.4 37.4Q32 39.3 34.6 37.4" },
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
    atlasMake("path", { class: "atl-skin atl-lid-flat", d: `M${cx - 7} ${cy - 16}H${cx + 7}V${cy - 4.6}Q${cx} ${cy - 3.6} ${cx - 7} ${cy - 4.6}Z` }, lid);
    atlasMake("path", { class: "atl-lash atl-lid-flat", d: `M${cx - 7} ${cy - 4.6}Q${cx} ${cy - 3.6} ${cx + 7} ${cy - 4.6}` }, lid);
    //: **The drowsy lid** (round 9, the owner: "the half lidded eyes look a
    //: little creepy"): a lid whose edge droops in a soft arc over the eye,
    //: so a half-closed eye reads as heavy and sleepy, never as a flat line
    //: across a stare. Shown by `--atl-softlid` instead of the flat edge.
    atlasMake("path", { class: "atl-skin atl-lid-soft", d: `M${cx - 7} ${cy - 16}H${cx + 7}V${cy - 5.2}Q${cx} ${cy - 0.2} ${cx - 7} ${cy - 5.2}Z` }, lid);
    atlasMake("path", { class: "atl-lash atl-lid-soft", d: `M${cx - 6.2} ${cy - 4.4}Q${cx} ${cy - 0.2} ${cx + 6.2} ${cy - 4.4}` }, lid);
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
  //: **Dozing** (round 9): a lid at rest rather than a shut squeeze: a
  //: thinner, softer, lower curve in the lash colour, and on the feminine
  //: look two short lashes resting down from it, where `atl-e-shut` (a
  //: heavy ink arc with a flick) read as screwed tight.
  const doze = atlasGroup(eye, "atl-e-doze");
  atlasMake("path", { class: "atl-doze-line", "stroke-width": tiny ? 2.2 : 1.15, d: `M${cx - 4.4} ${cy + 0.8}Q${cx} ${cy + 3.4} ${cx + 4.4} ${cy + 0.8}` }, doze);
  if (lashes && !tiny) {
    atlasMake("path", { class: "atl-doze-lash", d: `M${cx - 3.3 * side} ${cy + 2}l${-0.6 * side} 1.1M${cx - 1.5 * side} ${cy + 2.6}l${-0.3 * side} 1.2` }, doze);
  }
  atlasMake("path", {
    class: "atl-e-squeeze atl-stroke",
    "stroke-width": w,
    d: `M${cx - 3.3 * side} ${cy - 3.2}L${cx + 2.8 * side} ${cy}L${cx - 3.3 * side} ${cy + 3.2}`,
  }, eye);
  return eye;
}

//: The small extras a mood can bring, each hidden until its mood asks.
//: Placed round the head, clear of the ears and the mane.
//: **The night cap** (round 9, the owner: "wearing a night cap"): a soft
//: cap of night sky over the crown, flopping to the right, a pale fluffy
//: brim, three small stars on it and a star at the tip. Drawn over the
//: ears and the crown's wisps (under them it read as a dark patch in the
//: hair), and hidden until the doze asks for it (`--atl-nightcap`), when it
//: fades in with the mood's other parts.
function atlasNightcap(parent) {
  const cap = atlasGroup(parent, "atl-nightcap");
  atlasMake("path", { class: "atl-cap", d: "M21.6 12.8C22 4.6 29.6 -0.8 37.6 0C43.8 0.6 48.4 4.8 50.6 10.6C48.6 8.6 46 7.6 43.4 7.8C42.6 9.2 42 10.8 41.6 12.2Q31.4 7.6 21.6 12.8Z" }, cap);
  atlasMake("path", { class: "atl-cap-sheen", d: "M25.4 8.6C27.6 4.2 32 1.8 36.8 1.8" }, cap);
  atlasMake("path", { class: "atl-cap-brim", d: "M20.4 13.4Q31 5.8 42.2 12Q43.4 14.2 41.4 14.8Q31 9.6 21.8 15.6Q19.6 15.4 20.4 13.4Z" }, cap);
  atlasSpecks(cap, [[29, 5.6, 0.45], [35.4, 3.8, 0.35], [41.4, 5.4, 0.4]], "atl-cap-star");
  atlasMake("circle", { class: "atl-cap-tip-glow", cx: 50.8, cy: 11, r: 2.6 }, cap);
  atlasSpark(cap, 50.8, 11, 1.5, "atl-cap-tip");
  return cap;
}

function atlasExtras(parent) {
  const fx = atlasGroup(parent, "atl-fx");
  const sparkle = atlasGroup(fx, "atl-fx-sparkle");
  atlasSpark(sparkle, 11, 20, 2.4, "atl-sparkle");
  atlasSpark(sparkle, 52, 24, 1.9, "atl-sparkle atl-late");
  atlasSpark(sparkle, 24, -2, 1.4, "atl-sparkle atl-later");
  const hearts = atlasGroup(fx, "atl-fx-hearts");
  atlasHeart(atlasGroup(hearts, "atl-float", [51, 20]), 51, 20, 2.6, "atl-heart");
  atlasHeart(atlasGroup(hearts, "atl-float atl-late", [12, 14]), 12, 14, 1.9, "atl-heart");
  //: **The doze's Zs** (round 9, the owner: "more emotes like zzzz coming
  //: off it for sleeping"): three, largest nearest the head, each in a
  //: group of its own that rises, sways and fades on a slow loop, a third
  //: of the loop apart (`atl-z-drift`, the CSS). Drawn as soft rounded
  //: strokes in the lash colour, not ink, so they read as breath rather
  //: than a comic's caption.
  const zz = atlasGroup(fx, "atl-fx-zz");
  [[47.6, 18.2, 3.2, ""], [52.4, 11.6, 2.4, " atl-late"], [55.6, 5.8, 1.8, " atl-later"]].forEach(([x, y, s, late], k) => {
    const z = atlasGroup(zz, `atl-float atl-zf atl-zf-${k}${late}`, [x + s / 2, y + s / 2]);
    atlasMake("path", { class: "atl-stroke atl-z", d: `M${x} ${y}h${s}l${-s} ${+(s * 1.05).toFixed(2)}h${s}` }, z);
  });
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
  if (level === "tiny") {
    if (!spec.tinyHair) return null;
    const hair = atlasGroup(parent, "atl-crest atl-mane atl-tiny-hair", ATLAS_GEO.hair);
    atlasMake("path", { class: edge ? "atl-edge" : "atl-lock atl-tiny-lock", d: spec.tinyHair }, hair);
    return hair;
  }
  const locks = level === "head" ? spec.headPaths : spec.lockPaths;
  const mane = atlasGroup(parent, "atl-crest atl-mane", ATLAS_GEO.hair);
  //: The lower locks first, so the upper ones lie over them; a lock
  //: marked `mass` is the soft body of the hair under all of them, with no
  //: leading edge of its own.
  locks.slice().reverse().forEach((lock) => {
    atlasMake("path", { class: edge ? "atl-edge" : `atl-skin atl-lock${lock.mass ? " atl-hair-mass" : ""}`, d: lock.fill }, mane);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-hair-neb", d: lock.fill }, mane);
      atlasMake("path", { class: "atl-overlay atl-hair-root", d: lock.fill }, mane);
      if (!lock.mass) atlasMake("path", { class: "atl-hair-light", d: lock.light }, mane);
    }
  });
  if (!edge) {
    atlasSpecks(mane, [[44, 9.6, 0.3], [50, 14, 0.24], [53, 22, 0.3], [49, 30, 0.2], [55, 36, 0.24]], "atl-speck atl-speck-soft");
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

//: **The hair's cap** (round 9): the hair drawn over the top of the skull
//: in the locks' own paint, down to a soft hairline, so the hair grows from
//: the scalp and flows back into the mass behind as one shape; shaded
//: deeper at the roots like every lock, with a faint parting where the look
//: has one. Drawn over the head and under the ears, so the ears and wings
//: rise out of it. It replaces round 8's scalp, a cap faded out towards the
//: brow by a mask, which left the crown reading bald; like it, it carries no
//: strands over the forehead (the owner, round 8: "get rid of the feminine
//: fringe").
function atlasHairCap(parent, spec) {
  const g = atlasGroup(parent, "atl-hair-cap");
  atlasMake("path", { class: "atl-skin atl-lock atl-cap-fill", d: spec.cap }, g);
  atlasMake("path", { class: "atl-overlay atl-hair-neb", d: spec.cap }, g);
  atlasMake("path", { class: "atl-overlay atl-hair-root", d: spec.cap }, g);
  return g;
}

function atlasEars(parent, level, edge, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const tiny = level === "tiny";
  const out = {};
  for (const side of ["l", "r"]) {
    const m = (d) => (side === "l" ? d : atlasMirror(d));
    const g = atlasGroup(parent, `atl-crest atl-ear atl-ear-${side}`, ATLAS_GEO.ear[side === "l" ? 0 : 1]);
    if (spec.strand && !tiny) atlasMake("path", { class: edge ? "atl-edge" : "atl-skin atl-strand", d: m(spec.strand) }, g);
    if (spec.earGlow && !edge && !tiny) {
      const [cx, cy, rx, ry] = spec.earGlow;
      atlasMake("ellipse", { class: "atl-ear-glow", cx: side === "l" ? cx : 62 - cx, cy, rx, ry }, g);
    }
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: m(spec.ear) }, g);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-rim-limb", d: m(spec.ear) }, g);
      if (spec.earIn) atlasMake("path", { class: "atl-ear-in", d: m(spec.earIn) }, g);
      if (spec.earFeathers) atlasMake("path", { class: "atl-ear-feather", d: m(spec.earFeathers) }, g);
      if (!tiny) {
        if (!spec.fin) {
          atlasSpecks(g, [[17.4, 6.2, 0.28], [19.6, 9.4, 0.2], [18.2, 4.4, 0.16]].map(([x, y, r]) => [side === "l" ? x : 62 - x, y, r]));
        }
        const [tx, ty] = spec.earTip;
        atlasSpark(g, side === "l" ? tx : 62 - tx, ty, spec.fin ? 0.9 : 1.1, "atl-glint atl-hair-star");
      }
    }
    out[side] = g;
  }
  const wisps = atlasGroup(parent, "atl-crest atl-wisps", ATLAS_GEO.hair);
  if ((spec.frontPaths || spec.fringeShade) && !tiny) {
    //: The feminine front locks, if a look has them: the cap's paint, no
    //: outline in the edge layer (a glow round a lock over the cap is a seam).
    if (!edge) {
      for (const d of spec.frontPaths || []) {
        atlasMake("path", { class: "atl-skin atl-lock atl-front-lock", d }, wisps);
        atlasMake("path", { class: "atl-overlay atl-hair-neb", d }, wisps);
        atlasMake("path", { class: "atl-overlay atl-hair-root", d }, wisps);
      }
      //: The fringe's locks parted by a fine shade up each notch, then the
      //: one star pinned at the parting (INBOX 480).
      if (spec.fringeShade) atlasMake("path", { class: "atl-fringe-shade", d: spec.fringeShade }, wisps);
      if (spec.browStar) {
        const [x, y, k] = spec.browStar;
        atlasMake("circle", { class: "atl-brow-halo", cx: x, cy: y, r: k * 1.8 }, wisps);
        atlasSpark(wisps, x, y, k, "atl-glint atl-brow-star");
      }
    }
    out.wisps = wisps;
    return out;
  }
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
  if (!edge) atlasMake("path", { class: "atl-tail-glow", d: spec.tailPath }, swish);
  atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: spec.tailPath }, swish);
  if (edge) return tail;
  atlasMake("path", { class: "atl-overlay atl-tail-galaxy", d: spec.tailPath }, swish);
  atlasMake("path", { class: "atl-tail-silk", d: spec.silkPath }, swish);
  atlasMake("path", { class: "atl-tail-stream", d: spec.streamPath }, swish);
  atlasMake("path", { class: "atl-tail-edge", d: spec.tailPath }, swish);
  const stars = atlasGroup(swish, "atl-tail-core");
  atlasSpecks(stars, spec.tailStarsNow);
  const [tx, ty] = spec.tailTipNow;
  atlasMake("circle", { class: "atl-tip-glow", cx: tx, cy: ty, r: 8 }, stars);
  atlasMake("circle", { class: "atl-tip-core", cx: tx, cy: ty, r: 2.4 }, stars);
  atlasSpark(stars, tx, ty, 2.4, "atl-glint");
  atlasSpark(stars, tx - 4, ty - 3.4, 1, "atl-glint atl-ring-glint").style.setProperty("--atl-k", "7");
  atlasSpark(stars, tx + 2.6, ty + 3.8, 0.8, "atl-glint atl-ring-glint").style.setProperty("--atl-k", "8");
  return tail;
}

//: **The nebula** (the reference's galaxy band; light and secondary): the
//: haze first, then the ribbon through it, with its nebula, the clouds
//: clipped to it, a pale stream, a faint lit edge and a few star dots.
//: `part` is the orbit's half (`ATLAS_BAND`): "back" under the whole
//: figure, "front" over the hair and the rings' near halves.
function atlasBand(layer, id, part = "back") {
  const band = ATLAS_BAND[part];
  const g = atlasGroup(layer, `atl-band atl-band-${part}`, [31, 52]);
  const haze = atlasGroup(g, "atl-band-haze");
  for (const [cx, cy, rx, ry, colour] of atlasBandSplit(ATLAS_BAND_HAZE, part)) atlasMake("ellipse", { class: `atl-band-cloud atl-band-cloud-${colour}`, cx, cy, rx, ry }, haze);
  atlasMake("path", { class: "atl-band-fill", d: band.fill }, g);
  atlasMake("path", { class: "atl-overlay atl-band-neb", d: band.fill }, g);
  const clouds = atlasMake("g", { "clip-path": `url(#${id}-band${part === "front" ? "f" : ""})` }, g);
  for (const [cx, cy, rx, ry, colour] of atlasBandSplit(ATLAS_BAND_CLOUDS, part)) atlasMake("ellipse", { class: `atl-band-cloud atl-band-cloud-${colour}`, cx, cy, rx, ry }, clouds);
  atlasMake("path", { class: "atl-band-stream", d: band.stream }, g);
  atlasMake("path", { class: "atl-band-edge atl-band-edge-soft", d: band.edge }, g);
  atlasSpecks(g, atlasBandSplit(ATLAS_BAND_STARS, part));
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

//: Juggling (the grid's `Juggling Stars` cell): three stars on an arc over
//: the raised hands, drawn over the head so the arc passes in front of
//: the ears; the CSS shows them and, with motion on, sends them round.
function atlasStarsProp(parent) {
  const stars = atlasGroup(parent, "nmp nmp-stars");
  atlasMake("path", { class: "atl-thread atl-juggle-arc", d: "M10 17Q31 -9 52 17" }, stars);
  [[10, 17, 2], [31, 4, 2.4], [52, 17, 2]].forEach(([x, y, r], k) => {
    const star = atlasGroup(stars, `atl-juggle atl-juggle-${k}`, [31, 17]);
    atlasMake("circle", { class: "atl-prop-moon-glow", cx: x, cy: y, r: r * 2.2 }, star);
    atlasSpark(star, x, y, r, "atl-juggle-star");
  });
  return stars;
}

//: Sitting (the grid's `Sit` cell): the strand coils under the figure and
//: Atlas sits inside it. One turn of the ribbon round the hips, drawn as a
//: stem along an ellipse whose width swells and thins twice on the way
//: round, so the coil turns edge-on at its sides; the same paint as the
//: strand. The companion's `data-pose="sit"` shows it.
function atlasCoilProp(layer) {
  const coil = atlasGroup(layer, "nmp nmp-coil");
  const k = 0.5523;
  const [cx, cy, rx, ry] = [31, 72, 27, 7.5];
  const segs = [
    [cx, cy + ry, cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy],
    [cx - rx, cy, cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry],
    [cx, cy - ry, cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy],
    [cx + rx, cy, cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry],
  ];
  const width = (t) => 2.2 + 4.2 * Math.abs(Math.sin(Math.PI * 2 * t + 0.5));
  const d = atlasStem(segs, width, { samples: 8, cap: false });
  atlasMake("path", { class: "atl-band-glow", d }, coil);
  atlasMake("path", { class: "atl-band-fill", d }, coil);
  atlasMake("path", { class: "atl-overlay atl-band-neb", d }, coil);
  atlasMake("path", { class: "atl-band-stream", d: atlasStem(segs, (t) => width(t) * 0.3, { samples: 8, cap: false, shift: (t) => width(t) * 0.24 * Math.sin(Math.PI * 3 * t) }) }, coil);
  atlasMake("path", { class: "atl-band-edge", d: atlasStemEdge(segs, width, 8) }, coil);
  atlasSpecks(coil, [[8, 74, 0.45], [20, 78.6, 0.35], [44, 78, 0.5], [54, 72, 0.35], [36, 65.6, 0.3]]);
  return coil;
}

//: The starry map (the grid's `Starry Map` cell): a small panel of night
//: sky with a constellation on it, at Atlas's right, that it leans on. The
//: companion's `nmb-act-map` shows it and turns the arm onto it.
function atlasMapProp(layer) {
  const map = atlasGroup(layer, "nmp nmp-map");
  atlasMake("ellipse", { class: "atl-prop-moon-glow", cx: 57, cy: 74, rx: 20, ry: 16 }, map);
  atlasMake("path", { class: "atl-prop-map", d: "M43 62.4Q42.6 60.4 44.6 60L70 54.4Q72 54 72 56L70.6 86Q70.5 88 68.5 88.4L44 92.4Q42 92.8 42 90.8Z" }, map);
  atlasMake("path", { class: "atl-thread", d: "M47.4 70L53.6 64.4L59.4 71.8L65.4 62.6M50 82L56.6 78.4L62.4 84" }, map);
  for (const [x, y] of [[47.4, 70], [53.6, 64.4], [59.4, 71.8], [65.4, 62.6], [50, 82], [56.6, 78.4], [62.4, 84]]) atlasMake("circle", { class: "atl-node-dot", cx: x, cy: y, r: 0.6 }, map);
  return map;
}

//: The hand slots. The companion holds the right arm out (-70deg at the
//: shoulder, set in the CSS for Atlas's short arm) to hold a bell or a
//: lantern, so each is drawn turned the other way about the hand and
//: comes out upright once the arm is out.
//: The props are drawn about the old arm's hand (48.2, 60); a look whose
//: arm ends elsewhere names its grip (`propHand`) and they move there. The
//: masculine arm hangs to a mitten at about (42.2, 60.4), and without this
//: the bell and the lantern floated about 6 units off his hand.
function atlasHandProps(armR, armL, look) {
  const hand = [48.2, 60];
  const grip = (ATLAS_LOOKS[look] || {}).propHand || hand;
  const shift = `translate(${+(grip[0] - hand[0]).toFixed(2)} ${+(grip[1] - hand[1]).toFixed(2)}) `;
  const upright = atlasMake("g", { transform: `${shift}rotate(70 ${hand[0]} ${hand[1]})` }, armR);
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
  if (tiny && spec.tinyFringe) atlasMake("path", { class: "atl-lock atl-tiny-lock", d: spec.tinyFringe }, sway);
  if (!tiny && spec.cap) atlasHairCap(sway, spec);
  const ears = atlasEars(sway, level, false, look);
  if (!tiny) atlasNightcap(sway);
  if (!tiny) {
    atlasSpecks(sway, [[40.4, 15.4, 0.34], [42.2, 20.2, 0.26], [20.6, 28.4, 0.26]], "atl-speck atl-speck-soft");
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

//: `orbit` (the companion's layered figure) leaves the planets out: they
//: are drawn outside the svg by `atlasOrbits`, which moves them round.
function atlasRing(parent, id, ring, k, front, orbit = false) {
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
    if (orbit) return;
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
//: `route`, for the companion's layered figure (`atlasDrawFigure`), names
//: the groups the strand's back sweep and the props (`back`), the tail
//: (`tail`), the sash (`lower`), each leg (`legs.l`, `legs.r`) and the
//: bubble (`front`) go to; without it everything is drawn into `parent`, in
//: the same order. A routed leg's group carries no `nmb-leg` class: its
//: layer's root does, so the companion's steps, kicks and poses turn the
//: root (the compositor) and not a group inside the svg (a repaint).
function atlasBody(parent, id, props, look, route = null) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const pair = (host) => ({ edge: atlasGroup(host, "atl-edges"), fill: atlasGroup(host, "atl-fills") });
  const layers = pair(parent);
  const back = route ? pair(route.back) : layers;
  const tailAt = route ? pair(route.tail) : layers;
  const lowerAt = route && route.lower ? pair(route.lower) : layers;
  const ribbonAt = {
    back: route && route.lowerBack ? pair(route.lowerBack) : lowerAt,
    front: route && route.lowerFront ? pair(route.lowerFront) : lowerAt,
  };
  const legAt = route && route.legs ? { l: pair(route.legs.l), r: pair(route.legs.r) } : null;
  const frontAt = route ? { fill: route.front } : layers;
  const arms = {};
  atlasBand(route && route.neb ? route.neb : back.edge, id);
  for (const [kind, layer] of Object.entries(layers)) {
    const edge = kind === "edge";
    atlasTail(tailAt[kind], edge, look);
    if (!edge && props) {
      atlasBookProp(back.fill);
      atlasCoilProp(back.fill);
      atlasMapProp(back.fill);
    }
    //: The mermaid lower body (the feminine look): one ribbon from the
    //: hips sweeping down to the left and curling, in the tail's paint,
    //: before the torso so it grows out of it. It is not a leg: the
    //: companion's leg groups stay, empty, so its behaviours find them.
    //: Its pivot is the ribbon's root at the hips (the first point of
    //: `spec.lower`). In the companion the sway is on the layer's root
    //: (`.atl-layer-lower`, 08-consistency.css) with the same point as its
    //: origin, so the group's own pivot is for the lab and the avatar
    //: levels, where there is no layer; the same point in every layer
    //: keeps edge and fill as one.
    //: The skirt (round 6): translucent, so it has no outline in the edge
    //: layer (a glow round a wisp thickens it back into a leg): the veil,
    //: then the ribbons over it, each the skirt's fading light over a haze
    //: of the tail's galaxy, a pale stream, a lit edge on two of them and a
    //: few star specks.
    if (spec.lowers && !edge) {
      const ribbon = (host, part) => {
        const g = atlasGroup(host, "atl-ribbon");
        atlasMake("path", { class: "atl-ribbon-veil", d: part.fill }, g);
        atlasMake("path", { class: "atl-overlay atl-ribbon-galaxy", d: part.fill }, g);
        if (part.stream) atlasMake("path", { class: "atl-ribbon-stream", d: part.stream }, g);
        if (part.edge) atlasMake("path", { class: "atl-ribbon-edge", d: part.edge }, g);
        atlasSpecks(g, part.specks);
      };
      //: Every tier is shaped by the pose from a group like this one (the
      //: same class and pivot), and fades in under the torso the same way.
      //: The tails fade in over their roots on the dress (`tailin`), so
      //: the dress flows into them rather than a ribbon starting at a line.
      const tier = (host) => {
        const g = atlasGroup(host, "atl-lower", spec.lowerPivot);
        g.setAttribute("mask", `url(#${id}-tailin)`);
        return g;
      };
      //: The ribbon tails (INBOX 480), over the gown: the back tier, then
      //: the front. In the companion each tier is a layer of its own
      //: (`lower-back`, `lower-front`), so it sways out of step.
      const tails = (host, back) => {
        const parts = (spec.lowerPaths || []).filter((part) => part.back === back);
        if (!spec.skirt || !parts.length) return;
        const g = tier(host);
        for (const part of parts) {
          const r = atlasMake("g", { class: `atl-tail-ribbon${back ? " atl-tail-ribbon-back" : ""}`, opacity: part.op }, g);
          atlasMake("path", { class: "atl-tail-ribbon-fill", d: part.fill }, r);
          atlasMake("path", { class: "atl-tail-ribbon-stream", d: part.stream }, r);
          atlasMake("path", { class: "atl-tail-ribbon-edge", d: part.edge }, r);
          if (part.specks.length) atlasSpecks(r, part.specks);
        }
      };
      const lower = atlasGroup(lowerAt[kind], "atl-lower", spec.lowerPivot);
      //: **No seam at the waist** (the owner: "smoothen and blend the line
      //: between the main body and the lower body whisps"). The torso fades
      //: out over 54 to 63 (`waist`); the wisps fade in under it over 52 to
      //: 60 (`lowerin`), so they emerge from beneath the body rather than
      //: starting at a line: before this their square roots at y 56 and the
      //: skirt veil's top edge at 49 showed through the fading torso as a
      //: band across the hips. The mask is in the group's own space, so it
      //: turns and sways with the wisps in every pose.
      lower.setAttribute("mask", `url(#${id}-lowerin)`);
      //: The gown (INBOX 480), back to front: the train in the nebula's
      //: colours with the galaxy's haze over it, the gown, the sheer
      //: overskirt and its lit hem, the gown's lit hem, the stars.
      if (spec.skirt) {
        const gown = atlasGroup(lower, "atl-skirt");
        if (spec.skirtTrain) {
          atlasMake("path", { class: "atl-gown-train", d: spec.skirtTrain }, gown);
          atlasMake("path", { class: "atl-overlay atl-ribbon-galaxy atl-gown-train-haze", d: spec.skirtTrain }, gown);
        }
        atlasMake("path", { class: "atl-skirt-veil", d: spec.skirt }, gown);
        atlasMake("path", { class: "atl-overlay atl-ribbon-galaxy", d: spec.skirt }, gown);
        if (spec.skirtDrape) {
          atlasMake("path", { class: "atl-gown-drape", d: spec.skirtDrape }, gown);
          atlasMake("path", { class: "atl-gown-drape-edge", d: spec.skirtDrapeEdge }, gown);
        }
        if (spec.skirtHem) {
          atlasMake("path", { class: "atl-gown-hem-glow", d: spec.skirtHem }, gown);
          atlasMake("path", { class: "atl-gown-hem", d: spec.skirtHem }, gown);
        }
        atlasSpecks(gown, spec.skirtStars || []);
      }
      tails(ribbonAt.back[kind], true);
      tails(ribbonAt.front[kind], false);
      //: The masculine trail is one silhouette (`spec.trail`, atlasBuild).
      if (spec.trail) ribbon(lower, spec.trail);
    }
    (spec.legPaths || ATLAS_LIMBS.legs).forEach(([side, d], i) => {
      const leg = atlasGroup(legAt ? legAt[side][kind] : layer, legAt ? "atl-leg" : `nmb-leg nmb-leg-${side} atl-leg`);
      const tendril = atlasGroup(leg, `atl-tendril atl-tendril-${side}`, ATLAS_GEO.hips[i]);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, tendril);
      if (!edge) atlasMake("path", { class: "atl-overlay atl-rim-body", d }, tendril);
    });
    for (const [side, d] of ATLAS_LIMBS.holds) {
      const hold = atlasGroup(layer, `nmb-hold nmb-hold-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, hold);
      if (!edge) atlasMake("path", { class: "atl-overlay atl-rim-body", d }, hold);
    }
    const torso = atlasGroup(layer, "nmb-torso");
    //: The look that flows into a skirt has no hem: the torso fades out
    //: over the skirt's top (round 8, the `waist` mask).
    if (spec.lowers) torso.setAttribute("mask", `url(#${id}-waist)`);
    const torsoPath = spec.torsoNow;
    //: The torso's glow edge is its flanks and shoulders only (round 7).
    //: In the companion the legs and the skirt are layers under the body's,
    //: so a full outline drew its hem over them: a pale line across the
    //: tops of the legs, the lid of an egg sitting on two tubes. The hem is
    //: inside the legs or the skirt, so it needs no edge.
    atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d: edge ? spec.torsoEdgeNow || torsoPath : torsoPath }, torso);
    if (!edge) {
      atlasMake("path", { class: "atl-overlay atl-belly", d: torsoPath }, torso);
      atlasMake("path", { class: "atl-overlay atl-rim-body", d: torsoPath }, torso);
      if (spec.chestLight) {
        const k = atlasTune().bodyWidth;
        for (const [part, list] of Object.entries(spec.chestLight)) {
          for (const [cx, cy, rx, ry] of list) atlasMake("ellipse", { class: `atl-chest-${part}`, cx: +(31 + (cx - 31) * k).toFixed(2), cy, rx: +(rx * k).toFixed(2), ry }, torso);
        }
      }
      //: **The constellation, faded** (round 6). The owner's screenshot:
      //: "a bright four-point star with lines" on the chest, read as a
      //: badge. It was a white four-point star 7.6 units across with four
      //: long rays and a glow, three bright minor stars and full-strength
      //: threads. Now it is starlight seen through the skin: a few small dim
      //: stars, the heart only a little brighter than the rest, joined by
      //: hairlines at a fifth of the opacity the threads had, each star in
      //: a soft glow of its own, and one faint glow over the whole of it.
      //: No rays, no four points. `.atl-core` still takes the mood's
      //: brightness (`--atl-star`) and `.atl-star` its scale, on the heart.
      const stars = ATLAS_GEO.constellation;
      const [hx, hy] = stars[0];
      const core = atlasGroup(torso, "atl-core", [hx, hy]);
      atlasMake("ellipse", { class: "atl-core-glow", cx: hx - 0.6, cy: hy + 4.2, rx: 9, ry: 11 }, core);
      atlasMake("path", { class: "atl-const-line", d: ATLAS_GEO.constellationLines.map(([a, b]) => `M${stars[a][0]} ${stars[a][1]}L${stars[b][0]} ${stars[b][1]}`).join("") }, core);
      stars.slice(1).forEach(([x, y, r, b], i) => {
        const dot = atlasMake("circle", { class: "atl-const-glow", cx: x, cy: y, r: r * 2.6 }, core);
        dot.style.setProperty("--atl-b", String(b));
        atlasMake("circle", { class: "atl-const-dot", cx: x, cy: y, r }, core).style.setProperty("--atl-b", String(b));
        void i;
      });
      const star = atlasGroup(core, "atl-star", [hx, hy]);
      atlasMake("circle", { class: "atl-const-glow atl-const-heart", cx: hx, cy: hy, r: stars[0][2] * 3 }, star);
      atlasMake("circle", { class: "atl-const-dot atl-const-heart", cx: hx, cy: hy, r: stars[0][2] }, star);
      //: The gloss on the gel: one specular on the upper left of the body.
      atlasMake("ellipse", { class: "atl-sheen atl-sheen-body", cx: 25.6, cy: 42.6, rx: 1.1, ry: 2.8, transform: "rotate(14 25.6 42.6)" }, torso);
    }
    for (const [side, d] of spec.armPaths || ATLAS_LIMBS.arms) {
      const arm = atlasGroup(layer, `nmb-arm nmb-arm-${side}`);
      atlasMake("path", { class: edge ? "atl-edge" : "atl-skin", d }, arm);
      if (!edge) {
        atlasMake("path", { class: "atl-overlay atl-rim-body", d }, arm);
        arms[side] = arm;
        //: The galaxy-seed gesture (the female sheets' Seed Sower): star
        //: seeds drifting up from the open hand.
        if (side === "r" && spec.seeds) {
          const seeds = atlasGroup(arm, "atl-seeds");
          spec.seeds.forEach(([x, y, r], k) => {
            atlasMake("circle", { class: "atl-seed", cx: x, cy: y, r }, seeds).style.setProperty("--atl-k", String(k));
          });
          atlasSpark(seeds, 58.4, 30.4, 1.4, "atl-glint atl-seed-star");
          atlasSpark(seeds, 62.2, 23.6, 1, "atl-glint atl-seed-star");
        }
      }
    }
    //: **The shoulders belong to the body** (round 9, the owner: "the part
    //: where the arms of feminine atlas attach to her main body look
    //: disconnected"). The arms are drawn over the torso, and the part of
    //: each arm's root that lies inside the torso wore the arm's paint,
    //: without the belly's light or the chest's glow the torso has there,
    //: so every root read as a darker patch with an edge. The torso's own
    //: paint is laid again over the two joints, faded out from each
    //: shoulder by a soft radial mask (`shoulders`), so an arm grows out of
    //: the body's surface with no line across the join, in every pose (the
    //: roots pivot there) and both looks.
    if (!edge) {
      const cap = atlasMake("g", { class: "atl-shoulders", mask: `url(#${id}-shoulders)` }, layer);
      const torsoPath = spec.torsoNow;
      atlasMake("path", { class: "atl-skin", d: torsoPath }, cap);
      atlasMake("path", { class: "atl-overlay atl-belly", d: torsoPath }, cap);
      atlasMake("path", { class: "atl-overlay atl-rim-body", d: torsoPath }, cap);
      //: The torso's light (the constellation's glow, the chest's light,
      //: the gloss) moves above the joins, so the patch never covers it
      //: and the arms' roots lie under the same light as the body.
      const light = atlasGroup(layer, "atl-torso-light");
      if (spec.lowers) light.setAttribute("mask", `url(#${id}-waist)`);
      for (const el of [...torso.querySelectorAll(":scope > :is(.atl-core, .atl-sheen-body, .atl-chest-glow, .atl-chest-shade)")]) light.appendChild(el);
    }
  }
  if (props) {
    atlasHandProps(arms.r, arms.l, look);
    //: Startled, a translucent bubble round the whole figure (the
    //: reference's `startle` cell); the CSS shows it.
    const bubble = atlasGroup(frontAt.fill, "nmp nmp-bubble");
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
//: **Shared defs** (round 4, the companion's cost): the gradients and
//: clips are drawn once per look into a hidden `<svg class="atl-defs">`
//: at the end of the body, and every drawing refers to them by id
//: (`atl-<look>-<name>`), which cuts 74 nodes from each drawing. A
//: gradient's colours resolve where it lives, so there is one set per
//: look (the feminine palette differs), the set carries the look's data
//: attribute, and the lab's tuned colours are set on the sets as well as
//: on each drawing (`atlasRetune`). The pages that copy a drawing's
//: markup elsewhere (the sheet scripts) copy the sets with it.
function atlasDefs(svg, look) {
  const id = `atl-${look}`;
  let host = document.getElementById(`${id}-defs`);
  if (!host) {
    host = atlasMake("svg", { id: `${id}-defs`, class: "nm-atlas atl-defs", width: 0, height: 0, "aria-hidden": "true", focusable: "false" });
    host.dataset.atlasLook = look;
    atlasBuildDefs(host, id);
    (document.body || document.documentElement).appendChild(host);
  }
  //: The paints name their gradients through custom properties, so the CSS
  //: can say "skin" without knowing the look.
  for (const name of ATLAS_DEF_NAMES) svg.style.setProperty(`--atl-${name}`, `url(#${id}-${name})`);
  return id;
}

const ATLAS_DEF_NAMES = ["skin", "belly", "rimh", "rimb", "riml", "sheen", "aura", "core", "iris", "galaxy", "hneb", "earin", "bneb", "bandg", "cloudp", "cloudb", "tip", "skirt", "gown", "chestglow", "chestshade", "hroot"];

function atlasBuildDefs(svg, id) {
  const defs = atlasMake("defs", {}, svg);
  const stops = (grad, list) => {
    for (const [offset, cls] of list) atlasMake("stop", { offset, class: cls }, grad);
  };
  const skin = atlasMake("radialGradient", { id: `${id}-skin`, gradientUnits: "userSpaceOnUse", cx: 26, cy: 16, r: 74, fx: 25, fy: 13 }, defs);
  stops(skin, [[0, "atl-st-hi"], [0.16, "atl-st-lt"], [0.42, "atl-st-md"], [0.78, "atl-st-dp"], [1, "atl-st-rim"]]);
  //: Round 7: the belly's light and the body's rim shade are shaped so
  //: that neither reaches the torso's hem, where the legs leave it: the
  //: light is higher and smaller (it was at 56, radius 14, and lit the hem
  //: paler than the legs under it), the shade an upright ellipse (radius
  //: 12.5 across, twice that down), so it rounds the flanks and leaves the
  //: hips the skin's own colour, the same as the legs' tops. The seam where
  //: the egg of the body sat on two tubes was that difference in colour.
  const belly = atlasMake("radialGradient", { id: `${id}-belly`, gradientUnits: "userSpaceOnUse", cx: 30, cy: 51, r: 12 }, defs);
  stops(belly, [[0, "atl-st-white-mid"], [1, "atl-st-white-0"]]);
  //: Rim shades: clear in the middle, violet at the edge. The head's and
  //: the body's are in the drawing's space (their light is where the
  //: specular is); a limb's is in its own box, centred toward its root so
  //: the joint stays clear and the tip rounds off.
  const rimHead = atlasMake("radialGradient", { id: `${id}-rimh`, gradientUnits: "userSpaceOnUse", cx: 27.5, cy: 19, r: 20 }, defs);
  stops(rimHead, [[0.62, "atl-st-clear"], [1, "atl-st-shade"]]);
  //: **One shade for the body and the limbs** (round 7, the owner: "less
  //: obviously built from separate shapes"). Each limb had its own rim, in
  //: its own box, and the body another about its middle, so where a limb
  //: overlapped the body the two shades differed and drew the join: the
  //: egg of the torso sat on two tubes with a tube at each shoulder. Now
  //: the body and every limb take the same shade, in the drawing's space:
  //: an upright ellipse about the belly (15 across, 2.6 times that down),
  //: clear in the middle and deepening toward the hands and the feet, so a
  //: point has one colour whichever part it belongs to and only the
  //: outline of the whole figure shows.
  //: (The ears and the thinking hand keep a rim of their own, `riml`.)
  const rimBody = atlasMake("radialGradient", { id: `${id}-rimb`, gradientUnits: "userSpaceOnUse", cx: 30.5, cy: 50, r: 15, gradientTransform: "translate(30.5 50) scale(1 2.6) translate(-30.5 -50)" }, defs);
  stops(rimBody, [[0.4, "atl-st-clear"], [1, "atl-st-shade"]]);
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
  //: The strand's own run: indigo to violet and back up its orbit, from
  //: the feet to above the crown (round 9, where it ran from the upper
  //: right to the lower left). The top fades in from nothing
  //: (`band-fade`) through violet, so the ribbon's upper tip reads as
  //: nebula thinning out, not a dark whip over the hair.
  const bandRun = atlasMake("linearGradient", { id: `${id}-bandg`, gradientUnits: "userSpaceOnUse", x1: 31, y1: -11, x2: 31, y2: 99 }, defs);
  stops(bandRun, [[0, "atl-st-band-fade"], [0.1, "atl-st-band1"], [0.3, "atl-st-band0"], [0.52, "atl-st-band1"], [0.74, "atl-st-band0"], [1, "atl-st-band2"]]);
  for (const [name, cls] of [["cloudp", "atl-st-cloud-pink"], ["cloudb", "atl-st-cloud-blue"]]) {
    const cloud = atlasMake("radialGradient", { id: `${id}-${name}` }, defs);
    stops(cloud, [[0, cls], [1, "atl-st-clear"]]);
  }
  //: The skirt (the feminine look, round 6): the skin's light at the
  //: waist, fading to nothing by the hem, so the ribbons end in wisps.
  //: The feminine chest's light (round 9, `chestLight`): a glow lit from
  //: above and a shade, each fading to nothing at its rim, so neither has
  //: an edge to read as a line.
  //: The hair's roots (round 9, `atl-hair-root`): deeper at the scalp,
  //: gone by the ends, in the drawing's space, so every lock shades as one
  //: mass growing from the head.
  const hairRoot = atlasMake("radialGradient", { id: `${id}-hroot`, gradientUnits: "userSpaceOnUse", cx: 31, cy: 16, r: 30 }, defs);
  stops(hairRoot, [[0, "atl-st-hroot"], [0.35, "atl-st-hroot-mid"], [1, "atl-st-clear"]]);
  const chestGlow = atlasMake("radialGradient", { id: `${id}-chestglow`, cx: 0.45, cy: 0.35, r: 0.6 }, defs);
  stops(chestGlow, [[0, "atl-st-chest-glow"], [1, "atl-st-chest-clear"]]);
  const chestShade = atlasMake("radialGradient", { id: `${id}-chestshade`, cx: 0.5, cy: 0.4, r: 0.6 }, defs);
  stops(chestShade, [[0, "atl-st-chest-shade"], [1, "atl-st-clear"]]);
  //: The masculine trail fades over a longer run (to 108, not 96), so the
  //: main wisp's curled tip at 98 still shows rather than vanishing a few
  //: units before its end (INBOX 435 (3)).
  const skirt = atlasMake("linearGradient", { id: `${id}-skirt`, gradientUnits: "userSpaceOnUse", x1: 0, y1: 52, x2: 0, y2: id.endsWith("masculine") ? 108 : 96 }, defs);
  stops(skirt, [[0, "atl-st-skirt0"], [0.45, "atl-st-skirt1"], [1, "atl-st-skirt2"]]);
  //: The feminine gown (INBOX 480): her skin's light at the waist, deepening
  //: through lilac to the nebula's violet at the hem and the train, so the
  //: hem has weight rather than fading out.
  const gownPaint = atlasMake("linearGradient", { id: `${id}-gown`, gradientUnits: "userSpaceOnUse", x1: 0, y1: 54, x2: 0, y2: 99 }, defs);
  stops(gownPaint, [[0, "atl-st-gown0"], [0.42, "atl-st-gown1"], [0.78, "atl-st-gown2"], [1, "atl-st-gown3"]]);
  //: **Round 8, two fades** (the owner, of the feminine look: "the massive
  //: hair strands look separate from the head" and "the torso should flow
  //: smoothly into the wispy lower body, not read as an egg sitting on the
  //: ribbons"). Masks in the drawing's space: `waist` shows everything above
  //: 54 and nothing below 63, so the torso dissolves into the skirt under
  //: it instead of ending in a round hem; `scalp` shows the hair's roots
  //: drawn over the crown (`atlasScalp`) at full strength over the crown and
  //: fades them out down to the brow, so the hair grows out of the head.
  const fade = (name, y1, y2) => {
    const grad = atlasMake("linearGradient", { id: `${id}-${name}g`, gradientUnits: "userSpaceOnUse", x1: 0, y1, x2: 0, y2 }, defs);
    stops(grad, [[0, "atl-st-white"], [1, "atl-st-white-0"]]);
    const mask = atlasMake("mask", { id: `${id}-${name}`, maskUnits: "userSpaceOnUse", x: -30, y: -30, width: 124, height: 150 }, defs);
    atlasMake("rect", { x: -30, y: -30, width: 124, height: 150, fill: `url(#${id}-${name}g)` }, mask);
  };
  fade("waist", 54, 63);
  fade("lowerin", 60, 52);
  fade("tailin", 86, 74);
  const tip = atlasMake("radialGradient", { id: `${id}-tip` }, defs);
  stops(tip, [[0, "atl-st-white"], [0.4, "atl-st-white-mid"], [1, "atl-st-white-0"]]);
  //: The shoulder joins (round 9, `atl-shoulders` in `atlasBody`): the
  //: torso's paint over each arm root, full at the joint and gone by the
  //: ellipse's rim. One placing fits both looks' roots (35.2 and 35.6).
  const shoulderFade = atlasMake("radialGradient", { id: `${id}-shoulderg` }, defs);
  stops(shoulderFade, [[0, "atl-st-white"], [0.55, "atl-st-white"], [1, "atl-st-white-0"]]);
  const shoulders = atlasMake("mask", { id: `${id}-shoulders`, maskUnits: "userSpaceOnUse", x: -30, y: -30, width: 124, height: 150 }, defs);
  for (const cx of [24.6, 37.4]) atlasMake("ellipse", { cx, cy: 40.8, rx: 4.4, ry: 5, fill: `url(#${id}-shoulderg)` }, shoulders);
  for (const [cx, cy, side] of ATLAS_GEO.eyes) {
    const clip = atlasMake("clipPath", { id: `${id}-e${side > 0 ? "l" : "r"}` }, defs);
    atlasMake("path", { d: atlasAlmond(cx, cy, side).d }, clip);
  }
  //: The rings' front halves, in the ring frame.
  const front = atlasMake("clipPath", { id: `${id}-front` }, defs);
  atlasMake("rect", { x: -50, y: 0, width: 100, height: 50 }, front);
  //: The nebula's clouds, clipped to its ribbon.
  const bandClip = atlasMake("clipPath", { id: `${id}-band` }, defs);
  atlasMake("path", { d: ATLAS_BAND.back.fill }, bandClip);
  const bandClipFront = atlasMake("clipPath", { id: `${id}-bandf` }, defs);
  atlasMake("path", { d: ATLAS_BAND.front.fill }, bandClipFront);
}

//: What each level shows, and the box it is drawn in. `full` keeps margins
//: for the glow, the rings, the mane, the tail and a raised hand; `head` is
//: square round the head, its ears and a shorter cut of the mane; `tiny`
//: crops to the face because at 16px every unit counts.
const ATLAS_LEVELS = {
  full: { viewBox: [-12, -10, 88, 110], body: true },
  figure: { viewBox: [0, 0, 64, 92], body: true },
  //: Head and shoulders, square: the whole figure drawn and cropped at the
  //: chest star, so the rings, the mane and the strand's first sweep show.
  bust: { viewBox: [4, -8, 54, 54], body: true },
  head: { viewBox: [7, -6, 50, 50], body: false },
  //: Under 28px the face is the icon: a crop just round the head, the ear
  //: tufts shrunk toward their base in the CSS, no wisps, mane or strand.
  tiny: { viewBox: [13, 0, 36, 38], body: false },
};

function atlasLevelFor(size) {
  if (size < 28) return "tiny";
  if (size < 96) return "head";
  return "full";
}

//: The tune's non-geometric parts, and the delay every drawing shares,
//: ride on custom properties of the drawing.
function atlasTuneStyle(svg) {
  svg.style.setProperty("--nm-delay", "-1.3s");
  const tune = atlasTune();
  if (tune.headSize !== 1) svg.style.setProperty("--atl-tune-head", String(tune.headSize));
  if (tune.starSize !== 1) svg.style.setProperty("--atl-tune-star", String(tune.starSize));
  if (tune.strandOpacity !== 1) svg.style.setProperty("--atl-tune-strand", String(tune.strandOpacity));
  for (const [key, value] of Object.entries(tune.colours)) svg.style.setProperty(`--atl-${key}`, value);
}

//: **The companion's figure as five layers** (round 4; the companion agent
//: measured Atlas repainting its 455-node drawing twenty times a second
//: at rest). A transform or opacity animated on an element inside an SVG
//: makes the browser lay out and repaint the whole drawing every frame;
//: on an SVG's root element, an HTML box, it runs on the compositor and
//: costs the main thread nothing. So the figure is five `<svg>` roots
//: stacked in its 64 by 92 box, in drawing order: `back` (the aura, the
//: rings' far halves, the strand's back sweep, the props it sits on),
//: `tail`, `body` (legs, the strand's front crossing, torso, arms, head),
//: `lids` (skin over the eyes and the closed-eye strokes, shown for a
//: blink) and `front` (the rings' near halves, the juggling stars, the
//: startle bubble). At rest the body breathes, the tail sways, the front
//: shimmers and the lids blink, each an animation on its own root; the
//: same loops inside a drawing are off in the layers (the CSS), and the
//: pose and mood transforms inside stay static, which costs nothing.
//: Every layer carries the mood and look attributes, so the CSS variables
//: agree across them, and the lids layer mirrors the head's tilt.
const ATLAS_ROOT_BOXES = ["body", "tail", "lower", "lower-back", "lower-front", "leg-l", "leg-r", "neb", "neb-front"];
function atlasDrawFigure(mood) {
  const look = atlasLook();
  const frag = document.createDocumentFragment();
  const layers = {};
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  //: The legs are two layers of their own, under the body as the drawing
  //: has them, and each root wears the companion's `nmb-leg-<side>` class:
  //: every step, kick, dangle and pose rule written for a leg group turns
  //: the root instead, on the compositor. Before this the walk's steps
  //: repainted the body layer every frame (atlaswalk.js, 2026-09-26).
  //: `fx-1` and `fx-2` carry the sleepy Zs and the love hearts (one of
  //: each per root, the second pair the late one), so their rise is the
  //: root's and no mood leaves an animation inside a drawing.
  //: A look with no legs (the feminine, round 6) builds no leg layers: two
  //: fewer composited roots, and nothing for a step to move.
  const legs = spec.legs !== false;
  //: `neb` (round 6) is the nebula alone, under everything, so it can
  //: drift on its own root: a slow turn and a breath of opacity on the
  //: compositor, no layout and no paint (`.atl-layer-neb`, the CSS).
  //: `neb-front` (round 9) is the orbit's near half, over the rings, on
  //: the same drift so the two halves move as one ribbon.
  //: The gown's ribbon tails (INBOX 480) are two more lower layers over
  //: the gown, a back tier and a front one, each also an `atl-layer-lower` (and
  //: its box an `atl-lw-lower`) so every pose, walk, carry and gesture the
  //: lower layer takes, they take; only their idle drift is their own.
  const tiers = spec.lowers ? (spec.skirt ? ["lower", "lower-back", "lower-front"] : ["lower"]) : [];
  const names = ["neb", "back", "tail", ...tiers, ...(legs ? ["leg-l", "leg-r"] : []), "body", "lids", "front", "neb-front", "fx-1", "fx-2"];
  for (const name of names) {
    const legSide = name.startsWith("leg-") ? name.slice(4) : "";
    const tierOf = name.startsWith("lower-") ? " atl-layer-lower" : "";
    const svg = atlasMake("svg", { viewBox: "0 0 64 92", width: 64, height: 92, class: `nm-atlas atl atl-figure atl-layer atl-layer-${name}${tierOf}${legSide ? ` nmb-leg nmb-leg-${legSide}` : ""}`, "aria-hidden": "true", focusable: "false" });
    svg.dataset.nmSeed = "Atlas";
    svg.dataset.atlasLook = look;
    svg.dataset.atlasLayer = name;
    atlasTuneStyle(svg);
    atlasDefs(svg, look);
    const pose = atlasGroup(svg, "atl-pose", ATLAS_GEO.feet);
    const rig = atlasGroup(atlasGroup(pose, "atl-mood", ATLAS_GEO.feet), "atl-rig", ATLAS_GEO.feet);
    layers[name] = { svg, pose, rig };
    //: **A `rotate` or `translate` loop goes on a box of its own.** The
    //: body's slow sway, the tail's and the nebula's flow, the skirt's and
    //: the legs' limb gestures (`nameMarkBuddyLimbs`, rotate and scale; a
    //: leg's step, kick and dangle are `transform`, which an svg root
    //: does run on the compositor): Chromium never runs those two
    //: properties on the compositor for an `<svg>` root, so each restyled
    //: the page every frame (140 to 500ms of every 2.6s). On a plain HTML
    //: box they do, so the root sits in one (`.atl-lw`).
    if (ATLAS_ROOT_BOXES.includes(name)) {
      const box = document.createElement("span");
      box.className = `atl-lw atl-lw-${name}${tierOf ? " atl-lw-lower" : ""}`;
      box.dataset.atlasLook = look;
      box.appendChild(svg);
      frag.appendChild(box);
    } else frag.appendChild(svg);
  }
  const id = `atl-${look}`;
  atlasMake("title", {}, layers.body.svg);
  atlasMake("ellipse", { class: "atl-aura", cx: 31, cy: 44, rx: 40, ry: 52 }, layers.back.pose);
  ATLAS_GEO.rings.forEach((ring, k) => atlasRing(layers.back.rig, id, ring, k, false, true));
  atlasBody(layers.body.rig, id, true, look, { neb: layers.neb.rig, back: layers.back.rig, tail: layers.tail.rig, lower: layers.lower?.rig, lowerBack: layers["lower-back"]?.rig, lowerFront: layers["lower-front"]?.rig, legs: legs ? { l: layers["leg-l"].rig, r: layers["leg-r"].rig } : null, front: layers.front.rig });
  const host = atlasGroup(atlasGroup(layers.body.rig, "nm-buddy-head", ATLAS_GEO.neck), "name-mark atl-face");
  atlasHead(host, id, "figure", look);
  atlasLids(layers.lids.rig, look);
  ATLAS_GEO.rings.forEach((ring, k) => atlasRing(layers.front.rig, id, ring, k, true, true));
  atlasBand(layers["neb-front"].rig, id, "front");
  //: The head drew its extras in the body layer; the two that rise (the
  //: Zs, the hearts) move to their roots, each pair under the wrappers the
  //: mood shows and hides (`.atl-fx-hearts`, `.atl-fx-zz`).
  const extras = layers.body.rig.querySelector(".atl-fx");
  if (extras) {
    for (const [name, late] of [["fx-1", false], ["fx-2", true]]) {
      const fx = atlasGroup(layers[name].rig, "atl-fx");
      for (const cls of ["atl-fx-hearts", "atl-fx-zz"]) {
        const wrap = atlasGroup(fx, cls);
        for (const el of [...extras.querySelectorAll(`.${cls} > .atl-float`)]) {
          if (el.classList.contains("atl-late") === late) wrap.appendChild(el);
        }
      }
    }
  }
  atlasStarsProp(layers.front.rig);
  for (const { svg } of Object.values(layers)) atlasApply(svg, mood);
  frag.appendChild(atlasOrbits());
  return frag;
}

//: **The planets go round their rings** (round 7, INBOX 430, the owner:
//: "the bodies on them slowly orbit, cheaply"). A planet drawn in a layer's
//: svg can only move by a change inside the svg, which lays the drawing
//: out and repaints it every frame; so each is a small element of its own
//: over the figure, moved on the compositor by three nested transforms:
//: the ring's frame (`.atl-orbit`, fixed: to the ring's centre, the ring's
//: tilt, flattened to its ellipse), an arm that turns (`.atl-orbit-arm`,
//: a `rotate` animation), and the planet at the arm's end (`translate`
//: the radius), turned back by the same angle and un-flattened (`scale`),
//: so it stays a round disc with its light on the upper left while its
//: centre runs round the ellipse. Behind the head it fades out (an
//: `opacity` keyframe on the same clock), which stands in for the layer
//: order a compositor animation cannot change. Every property animated is
//: one the compositor runs (`rotate`, `opacity`); nothing is laid out.
//: Each starts where the drawing puts it (`--atl-at`, a fraction of the
//: turn, as a negative delay), and a static figure shows them there.
function atlasOrbits() {
  const { cx, cy, flat, tilt } = ATLAS_GEO.ringFrame;
  const box = document.createElement("span");
  box.className = "atl-orbits";
  box.setAttribute("aria-hidden", "true");
  ATLAS_GEO.rings.forEach(({ r, glints }, k) => {
    const frame = document.createElement("span");
    frame.className = `atl-orbit atl-orbit-${k}`;
    frame.style.transform = `translate(${cx}px, ${cy}px) rotate(${tilt}deg) scale(1, ${flat})`;
    for (const [deg, size, kind] of glints) {
      if (kind === "star") continue;
      const arm = document.createElement("span");
      arm.className = "atl-orbit-arm";
      arm.style.setProperty("--atl-at", String(+(deg / 360).toFixed(4)));
      arm.style.rotate = `${deg}deg`;
      const body = document.createElement("span");
      body.className = `atl-orbiter atl-orbiter-${kind}`;
      const d = `${+(size * 2).toFixed(2)}px`;
      body.style.width = d;
      body.style.height = d;
      body.style.margin = `${-size}px 0 0 ${-size}px`;
      body.style.translate = `${r}px 0`;
      body.style.rotate = `${-deg}deg`;
      body.style.scale = `1 ${+(1 / flat).toFixed(4)}`;
      //: Where the animation is off, the same fade behind the head.
      const t = (deg * Math.PI) / 180;
      if (Math.sin(t) < 0 && Math.abs(Math.cos(t)) < 0.6) body.style.opacity = "0";
      arm.appendChild(body);
      frame.appendChild(arm);
    }
    box.appendChild(frame);
  });
  return box;
}

//: (`lower`, the feminine look's skirt of ribbons, sits between the tail
//: and the body and sways from the waist: always a little, and more when
//: the companion walks (a glide), is carried, kicks or dangles.)
//: The lids layer: over each eye, the head's own skin in the eye's
//: outline a little enlarged, and the closed eye's stroke on it (the
//: feminine look's lashes too). Shown for a blink by the layer's opacity;
//: scaled away while the eyes are drawn closed by a mood.
function atlasLids(parent, look) {
  const spec = ATLAS_LOOKS[look] || ATLAS_LOOKS.masculine;
  const head = atlasGroup(parent, "atl-head atl-lids", ATLAS_GEO.neck);
  for (const [cx, cy, side] of ATLAS_GEO.eyes) {
    atlasMake("path", { class: "atl-skin", d: atlasScalePath(atlasAlmond(cx, cy, side).d, 1.3, cx, cy) }, head);
    atlasMake("path", { class: "atl-lid-shut atl-stroke", "stroke-width": 1.8, d: `M${cx - 4.8} ${cy - 0.4}Q${cx} ${cy + 3.6} ${cx + 4.8} ${cy - 0.4}M${cx - 4.8 * side} ${cy - 0.4}l${-1.3 * side} -1` }, head);
    if (spec.lashes) {
      const ox = cx - 5.1 * side;
      atlasMake("path", { class: "atl-lashes", d: `M${ox} ${cy - 0.8}l${-1.6 * side} -0.9M${ox + 0.9 * side} ${cy - 2.6}l${-1.4 * side} -1.2` }, head);
    }
  }
  return head;
}

function atlasDraw(size = 20, mood = atlasMoodNow, level = atlasLevelFor(size)) {
  if (level === "figure") return atlasDrawFigure(mood);
  if (atlasStyle() === "classic") return atlasClassicMark(size, mood);
  const spec = ATLAS_LEVELS[level] || ATLAS_LEVELS.head;
  const [x, y, w, h] = spec.viewBox;
  const width = Math.round((size * w) / h);
  const figure = false;
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
  atlasTuneStyle(svg);
  atlasMake("title", {}, svg);
  const id = atlasDefs(svg, look);
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
  if (spec.body) {
    ATLAS_GEO.rings.forEach((ring, k) => atlasRing(rig, id, ring, k, true));
    atlasBand(rig, id, "front");
  }
  if (figure) atlasStarsProp(rig);
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
    //: Whichever face Appearance, Assistant avatar names (chat-agent.js).
    if (typeof paintAssistantAvatar === "function") paintAssistantAvatar(host, size);
    else host.replaceChildren(atlasAvatar(size));
  }
}

//: The companion's figure: the same drawing in its 64 by 92 box.
function atlasFigure() {
  if (atlasStyle() === "classic") return atlasClassicFigure();
  const figure = document.createElement("span");
  figure.className = "nm-figure nm-live atl-figure-box";
  figure.appendChild(atlasDrawFigure(atlasMoodNow));
  atlasWatchFigure(figure);
  return figure;
}

//: **Off screen, off** (round 4): a figure's loops pause while its box is
//: out of the viewport (`atl-off`, one observer for every figure) and
//: while the tab is hidden (`data-atlas-hidden` on the root); the CSS
//: pauses every animation under either.
let atlasFigureObserver = null;
function atlasWatchFigure(figure) {
  if (typeof IntersectionObserver !== "function") return;
  if (!atlasFigureObserver) {
    atlasFigureObserver = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("atl-off", !e.isIntersecting);
    });
  }
  atlasFigureObserver.observe(figure);
}
document.addEventListener("visibilitychange", () => {
  document.documentElement.toggleAttribute("data-atlas-hidden", document.hidden);
});

//: A mood is one attribute: the CSS turns it into brows, lids, eyes,
//: mouth, blush, tilt, squash and halo, and eases between them.
function atlasApply(svg, mood) {
  const next = ATLAS_MOODS[mood] ? mood : "calm";
  svg.dataset.atlasMood = next;
  //: The layered figure's box carries the mood too: a mood's body move
  //: (08-consistency.css, `.atl-figure-box[data-atlas-mood]`) runs on the
  //: box, one element on the compositor moving every layer together, not
  //: on the `.atl-mood` group inside each layer's svg.
  const box = svg.classList.contains("atl-layer") ? svg.closest(".atl-figure-box") : null;
  if (box && box.classList.contains("atl-figure-box")) box.dataset.atlasMood = next;
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
    //: Not the shared defs (`atlasDefs`): each look keeps its gradients in a
    //: hidden `svg.nm-atlas.atl-defs` under <body>, and redrawing it made a
    //: visible 20px head at the bottom left, one more per change of look
    //: (the owner's "column of four small Atlas heads"; strayheads.js).
    if (svg.closest("#nm-buddy") || !svg.isConnected || svg.classList.contains("atl-defs")) continue;
    //: A layer of a layered figure (the large view) is not a drawing of its
    //: own: redrawing it made a whole figure in place of each layer. The
    //: figure is redrawn once, whole (INBOX 430).
    if (svg.classList.contains("atl-layer")) {
      const box = svg.closest(".atl-figure-box");
      if (box && box.isConnected && typeof atlasFigure === "function") box.replaceWith(atlasFigure());
      continue;
    }
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
//: Woken by a poke, Atlas stays up this long before it may doze again, so a
//: wake is a wake and not a flicker back to sleep on the next minute's tick.
let atlasAwakeUntil = 0;
const ATLAS_WAKE_MS = 2400;
const ATLAS_AWAKE_HOLD_MS = 45 * 1000;
const ATLAS_DOZE_MS = 3000;
let atlasEaseTimer = 0;

function atlasRestingMood() {
  if (Date.now() < atlasAwakeUntil) return "calm";
  const hour = new Date().getHours();
  return Date.now() - atlasLastInput > 10 * 60 * 1000 || hour < 5 ? "sleepy" : "calm";
}

//: `easeMs` turns a mood change into a slow cross-fade (`.atl-easing`, the
//: face's custom properties transitioning over `--atl-ease`) rather than the
//: quick step every other change takes: waking and dozing are the two that
//: should never snap.
//: `backEaseMs` eases the return to the resting mood when `forMs` runs out,
//: for a mood that should settle rather than snap (a poke's reaction).
function setAtlasMood(mood, forMs = 0, { quiet = false, easeMs = 0, backEaseMs = 0 } = {}) {
  const next = ATLAS_MOODS[mood] ? mood : "calm";
  clearTimeout(atlasMoodTimer);
  atlasMoodTimer = 0;
  atlasMoodNow = next;
  if (!quiet && typeof nameMarkBuddyCue === "function") nameMarkBuddyCue(ATLAS_MOODS[next].cue);
  const marks = [...document.querySelectorAll(".nm-atlas")];
  clearTimeout(atlasEaseTimer);
  for (const svg of marks) {
    if (easeMs) {
      svg.style.setProperty("--atl-ease", `${easeMs}ms`);
      svg.classList.add("atl-easing");
    } else svg.classList.remove("atl-easing");
  }
  if (easeMs) {
    atlasEaseTimer = setTimeout(() => {
      for (const svg of document.querySelectorAll(".nm-atlas.atl-easing")) svg.classList.remove("atl-easing");
    }, easeMs + 100);
  }
  for (const svg of marks) {
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
    atlasMoodTimer = setTimeout(() => {
      const rest = atlasRestingMood();
      setAtlasMood(rest, 0, { easeMs: rest === "sleepy" ? ATLAS_DOZE_MS : backEaseMs });
    }, forMs);
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

//: **Input is only recorded, never reacted to.** This listener used to set
//: "surprised" for 700ms whenever Atlas was sleepy, so in the small hours
//: (sleepy is the resting mood before 5am) every click anywhere, and every
//: auto-repeat of a held Ctrl, startled every Atlas on the page and snapped
//: it back: three owner reports of a face that flickered for no reason
//: (measured: Ctrl held, 13 of 40 frames surprised). A held key's repeats
//: and a modifier on its own are not somebody coming back, so they do not
//: count as input either. Waking is `atlasWake`'s, on a poke of Atlas itself
//: or on the minute's tick once somebody is back.
const ATLAS_MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "AltGraph", "CapsLock", "Fn", "OS"]);
for (const type of ["pointerdown", "keydown"]) {
  document.addEventListener(type, (event) => {
    if (event.repeat || ATLAS_MODIFIER_KEYS.has(event.key)) return;
    atlasLastInput = Date.now();
  }, { passive: true, capture: true });
}

//: Sleepy to calm over `ATLAS_WAKE_MS`, then awake for at least
//: `ATLAS_AWAKE_HOLD_MS` before the resting mood may be sleepy again.
function atlasWake() {
  atlasLastInput = Date.now();
  atlasAwakeUntil = Date.now() + ATLAS_WAKE_MS + ATLAS_AWAKE_HOLD_MS;
  if (atlasMoodNow === "sleepy") setAtlasMood("calm", 0, { quiet: true, easeMs: ATLAS_WAKE_MS });
}

setInterval(() => {
  const rest = atlasRestingMood();
  if (atlasMoodNow === "calm" && rest === "sleepy") setAtlasMood("sleepy", 0, { easeMs: ATLAS_DOZE_MS });
  //: Back from away: input since it dozed, and not the small hours.
  else if (atlasMoodNow === "sleepy" && rest === "calm") atlasWake();
}, 60 * 1000);

//: A poke: a giggle, a blush, a heart or a delighted wiggle, for a moment.
const ATLAS_POKES = ["laughing", "shy", "love", "delighted", "curious"];
const ATLAS_POKE_HOLD_MS = 3800;
const ATLAS_POKE_BACK_MS = 1200;
let atlasPokeIndex = 0;
document.addEventListener("click", (event) => {
  const mark = event.target.closest?.(".nm-atlas");
  if (!mark || ["thinking", "determined"].includes(atlasMoodNow)) return;
  //: A sleeping Atlas poked wakes slowly; the giggle is for one already up.
  if (atlasMoodNow === "sleepy") {
    atlasWake();
    return;
  }
  atlasPokeIndex = (atlasPokeIndex + 1) % ATLAS_POKES.length;
  //: Held long enough to read (it snapped back after 1.8s, the companion's
  //: report), then eased back over 1.2s rather than cut.
  setAtlasMood(ATLAS_POKES[atlasPokeIndex], ATLAS_POKE_HOLD_MS, { quiet: true, backEaseMs: ATLAS_POKE_BACK_MS });
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
