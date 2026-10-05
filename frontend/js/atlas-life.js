// atlas-life.js: Atlas's living tail and its rings' loops. Moved out of
// atlas.js on 2026-10-05 (the boot-script gzip budget, tests/test_boot_budget.py):
// the figure draws whole without either, its tail in its drawn shape and its
// rings at rest, so nothing here is needed for the first frame. Loaded by
// `LAZY_MODULES.atlasLife` (app.js) when a layered figure is first made
// (`atlasFigure`, which then calls `atlasTailAttach` and `atlasRingLoops`);
// `atlasTailWake` stays in atlas.js, since the rig calls it on every wake and
// a figure only has a tail to wake once this file has attached one.

//: The rings' and the planets' loops for a figure, as Web Animations (the
//: boot stylesheets are at their budget): each ring's sway, shared by its
//: two halves and its planets' frame so they stay one ring; its dust's
//: turn, the next ring the other way; each planet's glow and swirl. Every
//: one starts at a random point of its own clock. Paused and played with
//: the tail's loop (`atlasTailFrame`), which knows when the figure is off
//: screen, hidden or still by setting.
function atlasRingLoops(box) {
  if (!box.animate) return [];
  const { cx, cy, flat, tilt } = ATLAS_GEO.ringFrame;
  const loops = [];
  const loop = (el, frames, ms, delay, opts = {}) => loops.push(el.animate(frames, { duration: ms, delay: -delay * ms, iterations: Infinity, direction: "alternate", easing: "ease-in-out", ...opts }));
  ATLAS_GEO.rings.forEach((ring, k) => {
    const [secs, deg, squash] = ATLAS_RING_SWAY[k];
    const at = (d, f) => ({ transform: `translate(${cx}px, ${cy}px) rotate(${tilt + d}deg) scale(1, ${+(flat * f).toFixed(4)})` });
    const sway = Math.random();
    for (const el of box.querySelectorAll(`.atl-ring-frame-${k}, .atl-orbit-${k}`)) loop(el, [at(-deg, 1 - squash), at(deg, 1 + squash)], secs * 1000, sway);
    const spin = Math.random();
    for (const el of box.querySelectorAll(`.atl-ring-frame-${k} .atl-ring-spin`)) loop(el, [{ rotate: "0deg" }, { rotate: `${k % 2 ? -360 : 360}deg` }], (34 + 9 * k) * 1000, spin, { direction: "normal", easing: "linear" });
  });
  for (const el of box.querySelectorAll(".atl-orbiter-glow")) loop(el, [{ scale: 0.8, opacity: 0.35 }, { scale: 1.2, opacity: 0.9 }], 2200 + Math.random() * 2400, Math.random());
  box.querySelectorAll(".atl-orbiter-swirl").forEach((el, i) => loop(el, [{ rotate: "0deg", opacity: 0.45 }, { rotate: `${i % 2 ? -180 : 180}deg`, opacity: 0.9 }, { rotate: `${i % 2 ? -360 : 360}deg`, opacity: 0.45 }], 6000 + Math.random() * 5000, Math.random(), { direction: "normal", easing: "linear" }));
  return loops;
}

//: **A living tail** (INBOX 601, the owner: "make it smooth and biological.
//: also add more movement and variation to the tail position, behaviour,
//: movement"). Before, the tail was one fixed drawing turned a degree or
//: three about its root by CSS loops, with its tip half turned about a
//: joint a beat behind (`tailWave`): a stiff flame swinging, every cycle
//: the same. Now its centreline bends along its whole length, every frame,
//: as a spine does: the rest centreline sampled at `ATLAS_TAIL_N` points,
//: each step between them turned by the angle the tail has bent through
//: by then (`atlasTailBend`), so the root never moves, the bend grows
//: toward the tip and the outline stays one smooth tapered stem (the same
//: `atlasStem` and widths the drawing has). The angle is a curl along the
//: length (the tail held up, held down, wrapped round) plus a wave that
//: travels from root to tip, and a second, slower one out of step with it.
//: What it does is a behaviour, `ATLAS_TAIL_ACTS`: a lazy sway, a curl
//: (its tip up like a question), a wrap (round toward its feet), a flick
//: (a quick ripple, a second and a half), a wag (pleased), a trail (on the
//: move), a droop (low, asleep) and a stiff hold (startled). The state the
//: rig reads (`atlasLowerState`) picks one by weight (`ATLAS_TAIL_BY_STATE`)
//: and holds it 4 to 9 seconds at random, never the same twice running, so
//: it never repeats; every number eases to the next on a critically damped
//: spring and the wave's phase is carried across a change of speed, so no
//: change is a jump. A slow drift on two clocks that never line up (11.3s,
//: 17.9s) bends it a little more or less all the time. It draws 30 times
//: a second while the figure is on screen and motion is on; off screen,
//: on a hidden tab, with Avatar animation off or under Reduce motion, it
//: rests in its drawn shape and costs nothing. It is the tail's own layer
//: that repaints (one small svg), nothing is laid out.
const ATLAS_TAIL_N = 32;
const ATLAS_TAIL_ACTS = {
  //: curl: radians the tail bends through root to tip (+ is clockwise on
  //: screen: down and round under; - lifts it); amp: the wave's swing,
  //: radians at the tip; period: seconds a wave; k: radians of phase from
  //: root to tip (how many bends it shows at once).
  sway: { curl: 0.15, amp: 0.34, period: 3.9, k: 3.4 },
  curl: { curl: -1.3, amp: 0.19, period: 4.6, k: 2.4 },
  wrap: { curl: 1.1, amp: 0.17, period: 4.9, k: 2.2 },
  flick: { curl: -0.25, amp: 0.62, period: 0.95, k: 4.6, ms: 1500 },
  wag: { curl: -0.4, amp: 0.46, period: 0.66, k: 2.4 },
  trail: { curl: 0.4, amp: 0.22, period: 1.6, k: 3.8 },
  droop: { curl: 0.6, amp: 0.11, period: 5.6, k: 1.8 },
  stiff: { curl: -0.12, amp: 0.08, period: 2.1, k: 2 },
};
const ATLAS_TAIL_BY_STATE = {
  idle: [["sway", 3], ["curl", 2], ["wrap", 1.4], ["flick", 1]],
  walk: [["trail", 1]],
  sit: [["wrap", 2], ["sway", 1], ["curl", 1]],
  lie: [["wrap", 2], ["droop", 1]],
  gesture: [["sway", 2], ["flick", 1]],
  think: [["curl", 2], ["sway", 1]],
  happy: [["wag", 3], ["flick", 1]],
  sad: [["droop", 1]],
  startle: [["stiff", 1]],
};
//: The angle the tail has turned through at `s` (0 at the root, 1 at the
//: tip), in radians, for its state `p` at phase `ph` (`ph2` the second
//: wave's) and the slow drift `drift`. Zero at the root, so the root and
//: its direction never move; the wave's envelope grows along the length.
function atlasTailBend(s, p, ph, ph2, drift) {
  const e = s ** 1.5;
  return (p.curl + drift) * s * s + p.amp * e * Math.sin(ph - p.k * s) + Math.max(0.13, 0.35 * p.amp) * e * Math.sin(ph2 - 1.7 * p.k * s + 0.7);
}
//: The tail's centreline bent as `bend(s)` says, as a run of cubics
//: through the bent points (Catmull-Rom), each an equal share of the
//: length as `atlasStemSides` samples them; and each sample's turn, for
//: what rides on the tail.
function atlasTailShape(rest, bend) {
  const n = rest.length - 1;
  const pts = [rest[0].slice()];
  const turn = [0];
  for (let i = 0; i < n; i += 1) {
    const a = bend((i + 0.5) / n);
    const dx = rest[i + 1][0] - rest[i][0];
    const dy = rest[i + 1][1] - rest[i][1];
    const [x, y] = pts[i];
    pts.push([x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)]);
    turn.push(bend((i + 1) / n));
  }
  const segs = [];
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n, i + 2)];
    segs.push([p1[0], p1[1], p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]]);
  }
  return { pts, turn, segs };
}
//: The paths the tail is drawn with, for a centreline (the same recipe as
//: `atlasBuild`'s, sampled finer per curve since there are more of them).
function atlasTailPaths(spec, segs) {
  const w = spec.tailWidth;
  const s = 2;
  return {
    body: atlasStem(segs, w, { samples: s, round: !!spec.tailRound }),
    stream: atlasStem(segs, (t) => w(t) * 0.26, { samples: s, shift: (t) => w(t) * 0.22 * Math.sin(Math.PI * 2.6 * t) }),
    silk: atlasStem(segs, (t) => w(t) * 0.24, { samples: s, shift: (t) => -w(t) * 0.3 * Math.sin(Math.PI * 2.6 * t + 1.1) }),
    filaments: (spec.tailFilaments || []).map((k) => {
      const pts = atlasStemSides(segs, () => 0, s, (t) => (w(t) / 2) * k).left;
      const run = pts.slice(Math.round(pts.length * 0.18), Math.round(pts.length * 0.92));
      return `M${atlasFix(run[0][0])} ${atlasFix(run[0][1])}${atlasSmooth(run)}`;
    }).join(""),
  };
}
function atlasTailAttach(box) {
  const spec = ATLAS_LOOKS[box.dataset.atlasLook];
  const svg = box.querySelector("svg.atl-layer-tail:not(.atl-layer-tail-tip)");
  if (!spec?.tailSegsNow || !svg || box.atlasTail) return;
  const id = `atl-${box.dataset.atlasLook}`;
  const segs = spec.tailSegsNow;
  const rest = Array.from({ length: ATLAS_TAIL_N + 1 }, (_, i) => atlasSegsAt(segs, i / ATLAS_TAIL_N));
  const near = (x, y) => {
    let best = 0;
    rest.forEach(([px, py], i) => {
      if (Math.hypot(px - x, py - y) < Math.hypot(rest[best][0] - x, rest[best][1] - y)) best = i;
    });
    return best;
  };
  //: The whole tail in one layer: the tip half's own layer (the old wave)
  //: is hidden, and the root half's masks give way to the root's fade.
  //: The layer's swish and wag give way to the bend (the box's slow flow
  //: and the rig's pose for the state still turn it about its root), and a
  //: mood's or a pose's lift (`--atl-tail`) eases over 1.1s, in and out, as
  //: a tail moves, not the face's 0.2s (INBOX 600: a poke's lift moved its
  //: stars 11px in a frame in the large view). Inline, from here: the boot
  //: stylesheets are at their budget.
  box.querySelector(".atl-lw-tip")?.style.setProperty("display", "none");
  svg.style.setProperty("animation", "none", "important");
  for (const g of svg.querySelectorAll(".atl-tail")) g.style.transition = "transform 1.1s cubic-bezier(0.45, 0, 0.55, 1)";
  const fade = `url(#${id}-tailroot)`;
  for (const el of svg.querySelectorAll(".atl-tail-swish > *")) {
    if (el.matches(".atl-fills .atl-skin")) el.removeAttribute("mask");
    else if (el.tagName === "path") el.setAttribute("mask", fade);
    else el.removeAttribute("mask");
  }
  const fills = svg.querySelector(".atl-fills .atl-tail-swish");
  const core = fills?.querySelector(".atl-tail-core");
  //: What sits at the tip (its glow, its core, its sparks) rides it as one.
  const tipG = core ? atlasMake("g", { class: "atl-tail-tipg" }, core) : null;
  if (core) for (const el of [...core.children]) if (el !== tipG && !el.classList.contains("atl-speck")) tipG.appendChild(el);
  const specks = core?.querySelector(".atl-speck");
  const tail = {
    box,
    spec,
    rest,
    paths: {
      edge: svg.querySelector(".atl-edges .atl-tail-swish > .atl-edge"),
      body: fills ? [...fills.querySelectorAll(":scope > :is(.atl-tail-glow, .atl-skin, .atl-tail-galaxy, .atl-tail-edge)")] : [],
      silk: fills?.querySelector(".atl-tail-silk"),
      stream: fills?.querySelector(".atl-tail-stream"),
      filaments: fills?.querySelector(".atl-tail-filament"),
    },
    specks,
    stars: (spec.tailStarsNow || []).map(([x, y, r]) => ({ x, y, r, i: near(x, y) })),
    tipG,
    tipAt: rest[ATLAS_TAIL_N],
    p: Object.fromEntries(Object.entries(ATLAS_TAIL_ACTS.sway).map(([k, v]) => [k, { x: v, v: 0 }])),
    act: "",
    state: "",
    until: 0,
    ph: Math.random() * 6.28,
    ph2: Math.random() * 6.28,
    t0: performance.now() - Math.random() * 20000,
    at: 0,
    raf: 0,
    tick: 0,
    drawn: false,
  };
  box.atlasTail = tail;
  box.dataset.atlTail = "live";
  atlasTailWake(box);
}
function atlasTailPick(tail, state, now) {
  const list = ATLAS_TAIL_BY_STATE[state] || ATLAS_TAIL_BY_STATE.idle;
  const choices = list.length > 1 ? list.filter(([name]) => name !== tail.act) : list;
  let r = Math.random() * choices.reduce((sum, [, w]) => sum + w, 0);
  let act = choices[0][0];
  for (const [name, w] of choices) {
    r -= w;
    if (r <= 0) {
      act = name;
      break;
    }
  }
  tail.act = act;
  tail.state = state;
  tail.until = now + (ATLAS_TAIL_ACTS[act].ms || 4000 + Math.random() * 5000);
}
function atlasTailFrame(tail, now) {
  tail.raf = 0;
  const { box, spec } = tail;
  if (!box.isConnected) return;
  const live = atlasMotionOK(box) && !box.classList.contains("atl-off") && !document.hidden;
  //: The rings' and the planets' loops run and rest with it (`atlasRingLoops`).
  for (const anim of box.atlasLoops || []) if (live !== (anim.playState === "running")) live ? anim.play() : anim.pause();
  //: Thirty a second: each draw repaints the tail's layer.
  tail.tick += 1;
  if (live && tail.tick % 2 && tail.drawn) {
    tail.raf = requestAnimationFrame((t) => atlasTailFrame(tail, t));
    return;
  }
  const dt = tail.at ? Math.min(0.1, (now - tail.at) / 1000) : 1 / 30;
  tail.at = now;
  if (live) {
    const buddy = box.closest("#nm-buddy");
    const state = atlasLowerState(buddy, box);
    if (state !== tail.state || now >= tail.until) atlasTailPick(tail, state, now);
    const goal = ATLAS_TAIL_ACTS[tail.act];
    //: Critically damped springs: a flick comes in fast, the rest ease.
    const w = tail.act === "flick" || tail.act === "stiff" ? 7 : 2.6;
    for (const [k, j] of Object.entries(tail.p)) {
      if (!(k in goal) || k === "ms") continue;
      j.v += (w * w * (goal[k] - j.x) - 2 * w * j.v) * dt;
      j.x += j.v * dt;
    }
    tail.ph += (2 * Math.PI * dt) / tail.p.period.x;
    //: The second wave keeps its own steady clock (2.9s), whatever the first
    //: does, so the tip is never still at both waves' turning points.
    tail.ph2 += (2 * Math.PI * dt) / 2.9;
  }
  const secs = (now - tail.t0) / 1000;
  const p = Object.fromEntries(Object.entries(tail.p).map(([k, j]) => [k, live ? j.x : k === "curl" || k === "amp" ? 0 : j.x]));
  const drift = live ? 0.13 * Math.sin((2 * Math.PI * secs) / 11.3) + 0.08 * Math.sin((2 * Math.PI * secs) / 17.9 + 1.3) : 0;
  atlasTailDraw(tail, (s) => atlasTailBend(s, p, live ? tail.ph : 0, live ? tail.ph2 : 0, drift));
  tail.drawn = true;
  if (live) tail.raf = requestAnimationFrame((t) => atlasTailFrame(tail, t));
  else tail.at = 0;
}
function atlasTailDraw(tail, bend) {
  const { pts, turn, segs } = atlasTailShape(tail.rest, bend);
  const d = atlasTailPaths(tail.spec, segs);
  const { paths } = tail;
  paths.edge?.setAttribute("d", d.body);
  for (const el of paths.body) el.setAttribute("d", d.body);
  paths.silk?.setAttribute("d", d.silk);
  paths.stream?.setAttribute("d", d.stream);
  if (paths.filaments) paths.filaments.setAttribute("d", d.filaments);
  const f = atlasFix;
  //: Each star rides the sample nearest it, turned with it.
  if (tail.specks) {
    tail.specks.setAttribute("d", tail.stars.map(({ x, y, r, i }) => {
      const a = turn[i];
      const ox = x - tail.rest[i][0];
      const oy = y - tail.rest[i][1];
      const sx = pts[i][0] + ox * Math.cos(a) - oy * Math.sin(a);
      const sy = pts[i][1] + ox * Math.sin(a) + oy * Math.cos(a);
      return `M${f(sx - r)} ${f(sy)}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0`;
    }).join(""));
  }
  if (tail.tipG) {
    const [tx, ty] = tail.tipAt;
    const [ex, ey] = pts[pts.length - 1];
    tail.tipG.setAttribute("transform", `translate(${f(ex - tx)} ${f(ey - ty)}) rotate(${f((turn[turn.length - 1] * 180) / Math.PI)} ${f(tx)} ${f(ty)})`);
  }
  tail.shape = { pts, turn };
}
