// atlas-motion.js: Atlas's motion, out of the boot (WORLD_CLASS_PLAN F3's
// boot budget, tests/test_boot_budget.py). The drawing (atlas.js) is what the
// first paint needs; this is what makes it move: the blink clock and the arm
// rig with the lower body's poses. Loaded by `LAZY_MODULES.atlasMotion`
// (app.js), whose stand-ins for `atlasBlinkStart`, `atlasRigAttach` and
// `atlasRigWake` fetch it the first time a figure mounts and then call the
// real ones. Until it arrives a figure stands in its CSS pose, which is where
// the rig would have put it, so nothing that is drawn moves when it lands.
// Its top level only declares; every name it reads from atlas.js is read
// inside a function.

//: **One blink of a layered figure** (INBOX 540): the lid a third down,
//: two thirds down, then shut, held, and back up through the same frames:
//: 120ms down, 40 held, 160 up, or a drowsy 380, 520 and 520 (`slow`).
//: Each frame is a root of its own (`lidf-1`, `lidf-2`, the lids), drawn
//: whole, so only their opacity changes, by a CSS animation the class
//: `atl-blinking` starts (`atl-blink-f1` and the rest, the CSS): the
//: compositor runs it, and nothing is laid out or painted for a blink. A
//: later frame lies over an earlier one and its skin covers the earlier
//: lid's edge, so the frames stack as the lid comes down. Strokes never
//: change width.
function atlasBlink(box, slow = false) {
  const roots = box.querySelectorAll(".atl-layer-lids");
  if (!roots.length) return;
  const cls = slow ? "atl-blinking-slow" : "atl-blinking";
  for (const el of roots) el.classList.add(cls);
  setTimeout(() => {
    for (const el of roots) el.classList.remove(cls);
  }, slow ? 1460 : 360);
}

//: **When the figures blink.** One clock for every layered figure on the
//: page: every 3.4 to 7.6 seconds each one that is on screen, has its eyes
//: open and may move blinks once, now and then twice; a drowsy companion
//: blinks slowly and stays shut a moment. Avatar animation Off, the app's
//: Reduce motion or the system's (unless the companion is set to Always)
//: and a hidden tab hold the eyes still: no idle loop runs there.
//: The blink's pending timer, and the rig's trace when a sweep records one
//: (`atlasluster.js` sets `rigTrace` to an array and reads it back).
const atlasState = { blinkTimer: 0, rigTrace: null };
const atlasBlinkOpen = new Map();
function atlasBlinkMay(box) {
  const root = document.documentElement;
  if (!box.isConnected || box.classList.contains("atl-off") || root.hasAttribute("data-atlas-hidden")) return false;
  //: The same motion settings every Atlas loop answers to (`atlasMotionOK`).
  if (!atlasMotionOK(box)) return false;
  const lids = box.querySelector(".atl-layer-lids:not(.atl-layer-lidf)");
  const buddy = box.closest("#nm-buddy");
  if (!lids || box.querySelector(".atl-blinking, .atl-blinking-slow") || box.hasAttribute("data-atl-moving") || buddy?.classList.contains("nmb-act-hide")) return false;
  //: A closed-eye mood, or an act that moves the head, sets the layer's
  //: scale to 0 (the CSS): nothing to blink. Read once per mood and set
  //: of classes, not every blink (each read makes the page restyle).
  const key = `${box.dataset.atlasLook}|${box.dataset.atlasMood}|${buddy?.className || ""}`;
  if (!atlasBlinkOpen.has(key)) atlasBlinkOpen.set(key, getComputedStyle(lids).scale !== "0");
  return atlasBlinkOpen.get(key);
}
function atlasBlinkTick() {
  atlasState.blinkTimer = 0;
  const boxes = [...document.querySelectorAll(".atl-figure-box")];
  for (const box of boxes) {
    if (!atlasBlinkMay(box)) continue;
    if (box.closest(".nmb-drowsy")) atlasBlink(box, true);
    else {
      atlasBlink(box);
      if (Math.random() < 0.15) setTimeout(() => atlasBlinkMay(box) && atlasBlink(box), 420);
    }
  }
  if (boxes.length) atlasState.blinkTimer = setTimeout(atlasBlinkTick, 3400 + Math.random() * 4200);
}
function atlasBlinkStart() {
  if (!atlasState.blinkTimer) atlasState.blinkTimer = setTimeout(atlasBlinkTick, 1800);
}

//: **The rig: limbs that move like limbs** (INBOX 554, 564; the owner: "fix
//: how the arms connect to the atlas bodies and how they are used in
//: transitions between places and positions ... animate everything to be
//: smooth and boilogically lifelike", "dynamic and organic movement ...
//: like an azur lane character"). Each arm of a layered figure is a chain:
//: shoulder (its group's turn), elbow and wrist (`atlasArmPath`). Where an
//: arm should be is still the CSS's, every pose, act and mood rule and
//: every gesture as written, read off the arm's probe (`atl-arm-probe`);
//: the rig gets it there:
//: - each joint follows its target on a damped spring whose time is the
//:   move's size, 250ms for a nudge to 500ms for a half turn, so a move
//:   eases in and out and a target that moves mid-way is joined smoothly,
//:   never a jump; a move of over 40 degrees first draws back a little
//:   (anticipation) and settles past its mark (follow-through);
//: - the body leads and the limbs follow: the shoulder answers 30ms after
//:   the pose changes, the elbow 80ms, the wrist 130ms, and the hand
//:   trails a fast swing (overlapping action);
//: - gestures are joint targets: a wave lifts the forearm, pointing and
//:   reaching straighten the arm, an arm brought across the body folds at
//:   the elbow, a lifted arm bends a little; the elbow keeps to 0 to 135
//:   degrees, the wrist to 35 either way;
//: - while it travels the arms swing in counter-phase, the elbows easing
//:   on the back swing;
//: - the head steadies itself through a change of pose: it lags the body
//:   by a spring and catches up (`atl-head-lag`).
//: It runs only while something is moving (a pose or mood change, a
//: gesture, a walk) and stops when every joint has settled, so a figure at
//: rest costs nothing. With motion off or reduced it sets each pose at
//: once, in one frame.
const ATLAS_RIG_DELAY = { sh: 30, el: 80, wr: 130 };
const ATLAS_RIG_ZETA = { sh: 0.8, el: 0.74, wr: 0.62, sy: 0.9 };
//: **The lower body by what it is doing** (INBOX 575, the owner: "have the
//: lower body of both atlas avatars change around in position and how it
//: is sitting ect with different variations and changes based off the
//: current action or behaviour"). Her dress and his cloak (with her wisps,
//: which wrap the dress) and both tails take a pose per state, on top of
//: the pose's own CSS: each variant is [turn about the hips, width, length,
//: lean (skew), the tail's turn], in degrees and scales; `ms` and `ease`
//: are the change's time and curve (a curve past 1 overshoots and settles,
//: a flick or a snap; an ease in and out is a slow curl). A walk's turns and lean take
//: the way it goes (it trails behind and stretches). One variant is picked
//: at random as a state begins, and at rest a new one every 8 to 14
//: seconds, so no two repeats look alike.
const ATLAS_LOWER_STATES = {
  idle: { ms: 900, ease: "cubic-bezier(0.45, 0, 0.35, 1)", v: [[-2.5, 1, 1, 2, -5], [2, 1, 1.02, -2, 4], [3.5, 0.98, 1, 1, 7], [-1, 1.02, 0.99, -3, -2]] },
  walk: { ms: 450, ease: "cubic-bezier(0.34, 1.3, 0.64, 1)", v: [[-9, 0.94, 1.08, 6, -12], [-7, 0.95, 1.1, 8, -9], [-11, 0.93, 1.06, 4, -15]] },
  sit: { ms: 550, ease: "cubic-bezier(0.34, 1.25, 0.6, 1)", v: [[8, 1.1, 0.86, -6, -14], [-8, 1.08, 0.88, 6, 14], [5, 1.12, 0.84, -4, -10]] },
  lie: { ms: 600, ease: "cubic-bezier(0.4, 1.15, 0.6, 1)", v: [[16, 1, 0.86, -8, 24], [12, 1.02, 0.9, -6, 30]] },
  gesture: { ms: 350, ease: "cubic-bezier(0.3, 1.6, 0.6, 1)", v: [[-5, 0.98, 0.95, 4, 9], [-3, 1, 0.94, 6, 12], [-6, 0.97, 0.96, 3, 7]] },
  think: { ms: 900, ease: "cubic-bezier(0.45, 0, 0.55, 1)", v: [[6, 1, 0.97, -4, 12], [4, 0.99, 0.96, -6, 16]] },
  happy: { ms: 380, ease: "cubic-bezier(0.25, 1.8, 0.5, 1)", v: [[-6, 1.02, 0.94, 5, -10], [5, 1.02, 0.95, -5, -14], [-4, 1.03, 0.93, 3, -8]] },
  sad: { ms: 800, ease: "cubic-bezier(0.5, 0, 0.6, 1)", v: [[1.5, 0.96, 1.07, -1, 16], [-1.5, 0.97, 1.06, 1, 20]] },
  startle: { ms: 260, ease: "cubic-bezier(0.2, 2, 0.4, 1)", v: [[-10, 0.94, 0.9, 8, -18], [-8, 0.95, 0.92, 10, -22]] },
};
//: The hair's turn about the crown and the nebula stream's [turn, width,
//: height] about the figure's middle, per state (INBOX 575, the owner:
//: "both atlas avatars have a tail as well, same with the hair, and the
//: nebular stream ... dynamically animated and changed"), a variant each
//: as the lower body's; a walk's turn takes the way it goes.
const ATLAS_HAIR_STATES = { idle: [0, 1.6, -1.4, 0.8], walk: [-5, -4, -6], sit: [2, 1], lie: [4, 5], gesture: [-3, -2], think: [2.5, 1.5], happy: [-3.5, -2.5, -4], sad: [4, 5], startle: [-6, -7] };
const ATLAS_NEB_STATES = {
  idle: [[0, 1, 1], [2, 1.02, 0.98], [-2, 0.98, 1.02], [1, 1.01, 1]],
  walk: [[-4, 1.05, 0.95], [-3, 1.06, 0.94], [-5, 1.04, 0.96]],
  sit: [[3, 1.06, 0.9], [-3, 1.08, 0.88]],
  lie: [[6, 1.04, 0.86], [4, 1.06, 0.84]],
  gesture: [[-2, 1.03, 1.03], [-3, 1.02, 1.04]],
  think: [[5, 0.97, 1], [7, 0.96, 1.01]],
  happy: [[-3, 1.04, 1.04], [3, 1.05, 1.03], [-2, 1.03, 1.05]],
  sad: [[2, 0.97, 0.94], [-1, 0.96, 0.95]],
  startle: [[-6, 1.08, 1.08], [-5, 1.1, 1.06]],
};
function atlasLowerState(buddy, box) {
  const has = (c) => !!buddy && buddy.classList.contains(c);
  const pose = buddy?.dataset.pose || "";
  const mood = box.dataset.atlasMood || "calm";
  if (has("nmb-act-startle") || mood === "surprised") return "startle";
  if (/^(lie|curl)/.test(pose) || has("nmb-sleep") || has("nmb-act-nap") || has("nmb-act-lie")) return "lie";
  if (has("nmb-walking") || has("nm-buddy-dragging") || buddy?.dataset.travel) return "walk";
  if (pose === "sit" || has("nmb-act-chair") || has("nmb-act-beanbag") || has("nmb-act-meditate")) return "sit";
  if (["wave", "map", "shrug", "bell", "lantern", "carry", "juggle", "scratch", "facepalm", "cheer"].some((a) => has(`nmb-act-${a}`))) return "gesture";
  if (has("nmb-think") || mood === "thinking" || mood === "determined") return "think";
  if (["happy", "delighted", "laughing", "love", "proud"].includes(mood)) return "happy";
  if (["sad", "sleepy", "worried"].includes(mood) || has("nmb-drowsy")) return "sad";
  return "idle";
}
function atlasMotionOK(box) {
  const root = document.documentElement;
  if (root.dataset.avatarMotion === "off") return false;
  const reduced = root.dataset.motion === "reduced" || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  return !reduced || (root.dataset.buddyMotion === "full" && !!box.closest("#nm-buddy"));
}
function atlasRigAttach(box) {
  const spec = ATLAS_LOOKS[box.dataset.atlasLook];
  const body = box.querySelector(".atl-layer-body");
  if (!spec?.armRig || !body || box.atlasRig) return;
  const joint = () => ({ x: 0, v: 0, w: 14, t: null });
  const rig = { box, body, look: box.dataset.atlasLook, arms: [], raf: 0, at: 0, still: 0, host: null, observer: null, pose: body.querySelector(".atl-pose"), heads: [...box.querySelectorAll(".atl-head-lag")], lag: { x: 0, v: 0, w: 9, t: null }, fresh: true };
  for (const side of ["l", "r"]) {
    const groups = [...body.querySelectorAll(`.nmb-arm-${side}:not(.atl-arm-probe)`)];
    for (const g of groups) {
      g.classList.add("atl-rigged");
      g.style.setProperty("rotate", "none", "important");
    }
    rig.arms.push({
      side,
      //: Inward (toward the body) is clockwise on screen for the right arm.
      sgn: side === "r" ? 1 : -1,
      probe: body.querySelector(`.atl-arm-probe.nmb-arm-${side}`),
      hold: body.querySelector(`.nmb-hold-${side}`),
      groups,
      paths: [...body.querySelectorAll(`.nmb-arm-${side}.atl-rigged > path`)],
      hand: body.querySelector(`.nmb-arm-${side}.atl-rigged > .atl-hand`),
      geo: spec.armRig[side],
      j: { sh: joint(), el: joint(), wr: joint(), sy: { x: 1, v: 0, w: 14, t: null } },
      hist: [],
      drawn: [0, 0],
      shown: "",
      antic: null,
    });
  }
  rig.lower = {
    boxes: [...box.querySelectorAll(".atl-lw-pose-lower")],
    wisps: [...box.querySelectorAll(".atl-lw-pose-wisps, .atl-lw-pose-wisps-back, .atl-lw-pose-glint-a, .atl-lw-pose-glint-b")],
    tails: [...box.querySelectorAll(".atl-lw-pose-tail")],
    hair: [...box.querySelectorAll(".atl-lw-pose-hair")],
    neb: [...box.querySelectorAll(".atl-lw-pose-neb, .atl-lw-pose-neb-front")],
    state: "",
    variant: 0,
    at: 0,
    shown: "",
    timer: 0,
  };
  box.atlasRig = rig;
  atlasRigWake(box);
}
//: The lower body's pose for the state: its variant (a new one as the
//: state begins, and every 8 to 14 seconds at rest, on a timer), and the
//: way a walk goes. Each part is a box of its own, and the change is a CSS
//: transition on it, run by the compositor: the state's own time and
//: curve, the tail and the hair a beat later and longer (follow-through).
//: A change mid-way is taken up from where the part is, so nothing snaps.
function atlasRigLower(rig, now, live, buddy) {
  const low = rig.lower;
  if (!low || !(low.boxes.length || low.tails.length || low.hair.length)) return;
  const state = atlasLowerState(buddy, rig.box);
  const spec = ATLAS_LOWER_STATES[state];
  const fresh = state !== low.state;
  if (fresh || (live && state === "idle" && now >= low.at)) {
    //: Reduced motion keeps each state's first pose and no idle variation.
    const pick = live ? Math.floor(Math.random() * spec.v.length) : 0;
    low.variant = !fresh && spec.v.length > 1 && pick === low.variant ? (pick + 1) % spec.v.length : pick;
    low.state = state;
    low.at = now + 8000 + Math.random() * 6000;
  }
  clearTimeout(low.timer);
  //: The next idle variant, unless the tab is hidden or the figure gone or
  //: off screen then (it waits, and does nothing meanwhile).
  const next = () => {
    if (!rig.box.isConnected) return;
    if (document.hidden || rig.box.classList.contains("atl-off")) low.timer = setTimeout(next, 4000);
    else atlasRigLower(rig, performance.now(), atlasMotionOK(rig.box), buddy);
  };
  if (live && state === "idle") low.timer = setTimeout(next, low.at - now + 10);
  const way = state === "walk" ? (parseFloat(buddy?.style.getPropertyValue("--nmb-lean")) < 0 ? -1 : 1) : 1;
  const [rot, sx, sy, skew, tail] = spec.v[low.variant] || spec.v[0];
  const hairs = ATLAS_HAIR_STATES[state];
  const [neb, nsx, nsy] = ATLAS_NEB_STATES[state][low.variant % ATLAS_NEB_STATES[state].length];
  const hair = hairs[low.variant % hairs.length] * way;
  const pose = (k) => `rotate(${atlasFix(rot * way * k)}deg) skewX(${atlasFix(skew * way * k)}deg) scale(${(1 + (sx - 1) * k).toFixed(3)}, ${(1 + (sy - 1) * k).toFixed(3)})`;
  const key = `${state} ${low.variant} ${way} ${live}`;
  if (key === low.shown) return;
  low.shown = key;
  const go = (el, transform, lag = 0) => {
    el.style.transition = live ? `transform ${spec.ms + lag * 2}ms ${spec.ease} ${lag}ms` : "none";
    el.style.transform = transform;
  };
  for (const el of low.boxes) go(el, pose(1));
  for (const el of low.wisps) go(el, pose(0.7), 40);
  for (const el of low.tails) go(el, `rotate(${atlasFix(tail * way)}deg)`, 70);
  for (const el of low.hair) go(el, `rotate(${atlasFix(hair)}deg)`, 90);
  //: The stream's two halves move as one ribbon.
  for (const el of low.neb) go(el, `rotate(${atlasFix(neb * way)}deg) scale(${nsx}, ${nsy})`, 120);
}
//: Where the CSS has the arm: the probe's turn (its transform's and any
//: gesture's `rotate`) and its vertical scale (a meditating arm's).
function atlasRigRead(arm) {
  const cs = getComputedStyle(arm.probe);
  let ang = 0;
  let sy = 1;
  const m = /matrix\(([^)]+)\)/.exec(cs.transform);
  if (m) {
    const [a, b, c, d] = m[1].split(",").map(Number);
    ang = (Math.atan2(b, a) * 180) / Math.PI;
    sy = (a * d - b * c) / (Math.hypot(a, b) || 1);
  }
  const r = parseFloat(cs.rotate);
  if (Number.isFinite(r)) ang += r;
  //: The raised arms of a hang, a carry or a cheer are their own drawing
  //: (`nmb-hold`), crossfaded with these; as this arm fades out it rises
  //: toward the held one's line, so the swap reads as one arm lifting.
  if (+cs.opacity < 0.5 && arm.hold && +getComputedStyle(arm.hold).opacity > 0.5) ang = -158 * arm.sgn;
  return { ang, sy };
}
function atlasRigGesture(arm, raise, buddy) {
  const has = (c) => !!buddy && buddy.classList.contains(c);
  let el = raise < -8 ? Math.min(80, 0.9 * (-raise - 8)) : 14 * Math.sin((Math.min(raise, 180) * Math.PI) / 180);
  let wr = 0;
  if (arm.side === "r" && has("nmb-act-wave")) [el, wr] = [40, 12];
  else if (arm.side === "r" && has("nmb-act-map")) [el, wr] = [-10, -8];
  else if (arm.side === "r" && (has("nmb-act-bell") || has("nmb-act-lantern") || has("nmb-act-carry"))) [el, wr] = [-8, 0];
  return [Math.max(-14, Math.min(135, el)), wr];
}
//: A damped spring toward `target`; a jump in the target sets its time.
function atlasRigSpring(j, target, dt, zeta) {
  if (j.t === null) j.t = target;
  const jump = Math.abs(target - j.t);
  if (jump > 3) j.w = 5 / Math.min(0.5, 0.25 + (0.25 * jump) / 120);
  j.t = target;
  const n = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / n;
  for (let i = 0; i < n; i += 1) {
    j.v += (j.w * j.w * (target - j.x) - 2 * zeta * j.w * j.v) * h;
    j.x += j.v * h;
  }
}
function atlasRigWake(host) {
  const box = host?.classList?.contains("atl-figure-box") ? host : host?.querySelector?.(".atl-figure-box");
  const rig = box?.atlasRig;
  if (!rig) return;
  if (!rig.observer && typeof MutationObserver === "function" && box.isConnected) {
    rig.host = box.closest("#nm-buddy") || box;
    rig.observer = new MutationObserver(() => atlasRigWake(box));
    const attributes = { attributes: true, attributeFilter: ["class", "data-pose", "data-atlas-variant", "data-atlas-mood", "data-travel", "data-side"] };
    for (const el of new Set([rig.host, box, rig.body])) rig.observer.observe(el, attributes);
  }
  rig.still = 0;
  if (!rig.raf) rig.raf = requestAnimationFrame((now) => atlasRigFrame(rig, now));
}
function atlasRigFrame(rig, now) {
  rig.raf = 0;
  const { box } = rig;
  if (!box.isConnected) {
    rig.observer?.disconnect();
    rig.observer = null;
    return;
  }
  const live = atlasMotionOK(box) && !box.classList.contains("atl-off") && !rig.fresh;
  rig.fresh = false;
  const dt = rig.at ? Math.min(0.05, (now - rig.at) / 1000) : 1 / 60;
  rig.at = now;
  const buddy = rig.host && rig.host.id === "nm-buddy" ? rig.host : null;
  const walking = live && !!buddy && buddy.classList.contains("nmb-walking");
  let busy = walking;
  //: A walk's swing is drawn every other frame (30 a second), as the walk's
  //: own steps are paced (`nameMarkBuddyTempo`): each one repaints the body
  //: layer. A change of pose is drawn every frame; it is over in half a second.
  rig.tick = (rig.tick || 0) + 1;
  const write = !walking || rig.tick % 2 === 0;
  for (const arm of rig.arms) {
    const got = atlasRigRead(arm);
    //: Unwrap the angle against the last target so a turn past 180
    //: degrees does not spin the long way round.
    const prev = arm.hist.length ? arm.hist[arm.hist.length - 1][1] : got.ang;
    while (got.ang - prev > 180) got.ang -= 360;
    while (got.ang - prev < -180) got.ang += 360;
    //: Anticipation: a big new target first draws the arm back a little.
    if (live && Math.abs(got.ang - prev) > 40) arm.antic = { until: now + 90, to: arm.j.sh.x - 0.08 * (got.ang - prev) };
    arm.hist.push([now, got.ang, got.sy]);
    while (arm.hist.length > 2 && arm.hist[1][0] <= now - 200) arm.hist.shift();
    const at = (ms) => {
      for (let i = arm.hist.length - 1; i >= 0; i -= 1) if (arm.hist[i][0] <= now - ms) return arm.hist[i];
      return arm.hist[0];
    };
    const [, shT, syT] = live ? at(ATLAS_RIG_DELAY.sh) : arm.hist[arm.hist.length - 1];
    const raise = -shT * arm.sgn;
    let [elT] = atlasRigGesture(arm, live ? -at(ATLAS_RIG_DELAY.el)[1] * arm.sgn : raise, buddy);
    let [, wrT] = atlasRigGesture(arm, raise, buddy);
    let sh = shT;
    if (walking && Math.abs(raise) < 35) {
      //: Counter-phase: the right arm forward while the left is back.
      const ph = (now / 1000) * 2 * Math.PI * 1.3 + (arm.side === "r" ? 0 : Math.PI);
      const amp = rig.look === "masculine" ? 9 : 6;
      sh += amp * Math.sin(ph);
      elT += amp * 0.6 * (1 + Math.sin(ph - 0.8)) * 0.5;
    }
    if (arm.antic && now < arm.antic.until) sh = arm.antic.to;
    //: The hand trails a fast swing of the arm.
    wrT = Math.max(-35, Math.min(35, wrT - 0.03 * arm.j.sh.v));
    const j = arm.j;
    if (!live) {
      for (const [k, v] of [["sh", sh], ["el", elT], ["wr", wrT], ["sy", syT]]) Object.assign(j[k], { x: v, v: 0, t: v });
    } else {
      atlasRigSpring(j.sh, sh, dt, ATLAS_RIG_ZETA.sh);
      atlasRigSpring(j.el, elT, dt, ATLAS_RIG_ZETA.el);
      atlasRigSpring(j.wr, wrT, dt, ATLAS_RIG_ZETA.wr);
      atlasRigSpring(j.sy, syT, dt, ATLAS_RIG_ZETA.sy);
      j.el.x = Math.max(-14, Math.min(135, j.el.x));
      j.wr.x = Math.max(-35, Math.min(35, j.wr.x));
    }
    //: Within 0.15 degrees and slower than 3 a second, a joint has
    //: arrived: it is set on its mark (a step no eye sees at this size)
    //: rather than drawn for another half second of spring tail.
    let moving = false;
    for (const k of ["sh", "el", "wr"]) if (Math.abs(j[k].x - j[k].t) > 0.15 || Math.abs(j[k].v) > 3) moving = true;
    if (!moving && live) for (const k of ["sh", "el", "wr", "sy"]) Object.assign(j[k], { x: j[k].t, v: 0 });
    if (moving) busy = true;
    if (live && (arm.probe.getAnimations().length || (arm.antic && now < arm.antic.until))) busy = true;
    const t = `rotate(${atlasFix(j.sh.x)}deg)${Math.abs(j.sy.x - 1) > 0.002 ? ` scale(1, ${j.sy.x.toFixed(3)})` : ""}`;
    if (write && t !== arm.shown) {
      for (const g of arm.groups) g.style.setProperty("transform", t, "important");
      arm.shown = t;
    }
    const bend = j.el.x * arm.sgn;
    const wrist = j.wr.x * arm.sgn;
    if (write && (Math.abs(bend - arm.drawn[0]) > 0.1 || Math.abs(wrist - arm.drawn[1]) > 0.1 || (!moving && (bend !== arm.drawn[0] || wrist !== arm.drawn[1])))) {
      const d = atlasArmPath(arm.geo, bend, wrist);
      for (const p of arm.paths) p.setAttribute("d", d);
      arm.hand?.setAttribute("transform", atlasArmHand(arm.geo, bend, wrist));
      arm.drawn = [bend, wrist];
    }
    if (atlasState.rigTrace) atlasState.rigTrace.push([now, rig.look, arm.side, +j.sh.x.toFixed(2), +j.el.x.toFixed(2), +j.wr.x.toFixed(2)]);
  }
  //: The head steadies itself: the body's turn (its pose group's), lagged
  //: by a spring, less the turn itself, is how far the head is left behind.
  if (rig.pose && rig.heads.length) {
    const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(rig.pose).transform);
    const turn = m ? (Math.atan2(+m[1].split(",")[1], +m[1].split(",")[0]) * 180) / Math.PI : 0;
    if (live) atlasRigSpring(rig.lag, turn, dt, 0.9);
    else Object.assign(rig.lag, { x: turn, v: 0, t: turn });
    const off = Math.max(-10, Math.min(10, rig.lag.x - turn));
    //: The hair's layer swings a third further, its follow-through.
    for (const el of rig.heads) {
      const k = el.closest(".atl-layer-hair") ? 1.3 : 1;
      const rot = Math.abs(off) > 0.05 ? `${atlasFix(off * k)}deg` : "";
      if (el.style.rotate !== rot) el.style.rotate = rot;
    }
    if (Math.abs(off) > 0.05 || Math.abs(rig.lag.v) > 1) busy = true;
    if (atlasState.rigTrace) atlasState.rigTrace.push([now, rig.look, "head", +off.toFixed(2), +turn.toFixed(2), 0]);
  }
  atlasRigLower(rig, now, live, buddy);
  box.toggleAttribute("data-atl-moving", busy);
  //: Six quiet frames in a row and it sleeps until the next change.
  rig.still = busy ? 0 : rig.still + 1;
  if (live && rig.still < 6) rig.raf = requestAnimationFrame((t) => atlasRigFrame(rig, t));
  else rig.at = 0;
}
