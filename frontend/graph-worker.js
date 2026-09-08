// MemoryMap AI — the graph's force simulation, off the main thread.
//
// GRAPH_PLAN.md §4 ("Simulation off the main thread") and §5 Phase 1. The SVG
// renderer this replaces ran `d3.forceSimulation` on the main thread and wrote
// thousands of DOM attributes per tick, so the simulation and the pointer
// fought for the same thread and a drag stuttered. Here the simulation owns a
// worker, and the main thread only ever paints what this posts.
//
// **d3 is vendored, and `importScripts` is what a classic worker has.** The
// app ships `/vendor/d3.v7.min.js` (no CDN — the offline rule), it is a UMD
// bundle, so `importScripts` puts `d3` on this worker's own global. The CSP
// already allows it: `worker-src 'self'` is set in
// `src/memorymap/core/security.py` (checked before writing this, not assumed —
// a directive missing there fails silently, which is the "policy silently
// refusing the work" shape CLAUDE.md names).
//
// ---------------------------------------------------------------------------
// The protocol, in both directions. Kept small on purpose: every message is
// structured-cloned, so anything that travels per frame has to be a buffer.
//
// In:
//   {type:"init", nodes:[{id,x,y,fx,fy,r}], edges:[{source,target,kind}],
//    params:{gravity,spread}, world:{left,top,right,bottom}, alpha}
//       Replace the whole simulation. `id` is only used to map the drag/pin
//       messages below onto array indices; positions travel by index alone.
//   {type:"params", params:{gravity,spread}}      re-tune without a rebuild
//   {type:"drag", phase:"start"|"move"|"end", id, x, y, keep}
//       start -> alphaTarget(0.3) and pin; move -> move the pin; end ->
//       alphaTarget(0) and, unless `keep`, release the pin.
//   {type:"freeze", ids:[...]} / {type:"thaw"}
//       Hold everything else still for the length of a drag — the same
//       "aiming at a moving target is not a gesture" fix the SVG renderer
//       carried, kept because drag-to-link still depends on it.
//   {type:"pin", id, x, y} / {type:"unpin", id}   double-click hold / release
//   {type:"reheat", alpha}                        nudge a settled layout
//   {type:"stop"}                                 leave the tab
//   {type:"recycle", buffer}                      hand a position buffer back
//
// Out:
//   {type:"tick", positions:Float32Array (transferred), alpha, running}
//       x,y interleaved, one pair per node, in the order `init` supplied.
//   {type:"end", alpha}   the layout has settled; no further ticks are coming
//                         until something reheats it.
// ---------------------------------------------------------------------------

importScripts("/vendor/d3.v7.min.js");

let simulation = null;
let nodes = [];
let indexById = new Map();
let world = null;
let timer = null;
let dragging = false;
let ticks = 0;

//: Buffers handed back by the main thread after it has painted them. A
//: transfer neuters the sender's copy, so without this every frame allocates a
//: fresh Float32Array — 2,000 nodes is 16 KB a frame, 60 times a second, which
//: is a megabyte of garbage a second for nothing. The main thread returns each
//: buffer in a `recycle` message; if the pool is empty (it has fallen behind)
//: we allocate rather than block.
const pool = [];

//: How many posted frames the main thread has not yet recycled. Ticking is
//: cheap and posting is not, so when it is behind we keep simulating and skip
//: the paint — the next frame it does receive is the current truth anyway.
let inFlight = 0;
const MAX_IN_FLIGHT = 2;

//: The physics, and why each number is this number.
//:
//: `velocityDecay 0.4` is the plan's (§5 Phase 1). d3's default is 0.6, which
//: is molasses: a dragged node's neighbours barely move before the step is
//: over, which is exactly the "the physics is tuned for a demo" complaint in
//: §2. 0.4 lets a neighbourhood follow a drag and still settle.
//:
//: `alphaDecay 0.0228` is d3's own default, restored deliberately — the SVG
//: renderer used 0.05 (settle in ~90 ticks) *because* every tick cost it
//: thousands of DOM writes on the main thread. Off the main thread that
//: trade is gone, and a slower decay is what makes the layout look alive.
const VELOCITY_DECAY = 0.4;
const ALPHA_DECAY = 0.0228;
//: The alphaTarget a drag raises the simulation to, and the plan's number.
//: High enough that the neighbourhood reorganises around where you put the
//: node, low enough that the rest of the map is not thrown into the air.
const DRAG_ALPHA = 0.3;
//: Collide radius = the node's drawn radius + this. The SVG renderer used
//: +24, which on a 2,000-note map is a collision field an order of magnitude
//: wider than the node and pushes the layout into a lattice against its own
//: world walls. Six is "labels do not sit on top of each other".
const COLLIDE_PAD = 6;

//: Slider (0-100, default 50) -> force. Kept here rather than on the main
//: thread so the whole physics story is in one file: `gravity` is repulsion
//: (more gravity -> weaker repulsion -> tighter clusters) and `spread` is the
//: link's rest length. Both are 1x at 50, so an untouched notebook lays out
//: exactly as the tuned defaults intend.
function tuning(params) {
  const gravity = Number(params && params.gravity != null ? params.gravity : 50);
  const spread = Number(params && params.spread != null ? params.spread : 50);
  const gravityScale = 0.4 + gravity / 41.7; // 0.4x-2.8x
  const spreadScale = 0.5 + spread / 50; // 0.5x-2.5x
  return {
    charge: -340 / gravityScale,
    linkDistance: (edge) => (edge.kind === "similar" ? 130 : 80) * spreadScale,
  };
}

function applyForces(params) {
  if (!simulation) return;
  const tuned = tuning(params);
  simulation.force("charge").strength(tuned.charge);
  simulation.force("link").distance(tuned.linkDistance);
}

//: Keep the layout inside its own world. Carried over from the SVG tick
//: handler, and it exists for a reported bug: every drag reheats the
//: simulation, a reheated repulsion pushes the outermost notes further out,
//: and nothing ever pulls them back — after a few drags the edge of the map
//: was off the edge of the box with no way to know it was there. The world is
//: a square sized by the note count (see the main thread's `gcWorldFor`), not
//: the viewport, so the forces and not the walls decide the arrangement.
function clampToWorld() {
  if (!world) return;
  for (const node of nodes) {
    const pad = (node.r || 8) + 12;
    node.x = Math.max(world.left + pad, Math.min(world.right - pad, node.x));
    node.y = Math.max(world.top + pad, Math.min(world.bottom - pad, node.y));
  }
}

function post(final) {
  if (inFlight > MAX_IN_FLIGHT && !final) return;
  const wanted = nodes.length * 2;
  let buffer = pool.pop();
  if (!buffer || buffer.length !== wanted) buffer = new Float32Array(wanted);
  for (let i = 0; i < nodes.length; i++) {
    buffer[i * 2] = nodes[i].x;
    buffer[i * 2 + 1] = nodes[i].y;
  }
  inFlight += 1;
  self.postMessage(
    {
      type: "tick",
      positions: buffer,
      alpha: simulation ? simulation.alpha() : 0,
      // How many times the simulation has stepped since `init`. Posted because
      // a frame the main thread paints and a step the worker takes are no
      // longer the same event, and a slow layout could otherwise be either
      // "the simulation is crawling" or "the paint is dropping frames" with no
      // way to tell which from the outside. It is one integer per frame.
      ticks,
      running: !final,
    },
    [buffer.buffer]
  );
}

function stopLoop() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

//: One tick per frame, self-scheduled. A dedicated worker has no
//: `requestAnimationFrame` (that lives on the window and, for a worker, only
//: inside an OffscreenCanvas context), so the 60 Hz cadence the plan asks for
//: is a timeout that subtracts the time the tick itself took.
function loop() {
  timer = null;
  if (!simulation) return;
  const started = Date.now();
  simulation.tick();
  ticks += 1;
  clampToWorld();
  const settled = !dragging && simulation.alpha() < simulation.alphaMin();
  if (settled) {
    post(true);
    self.postMessage({ type: "end", alpha: simulation.alpha() });
    return;
  }
  post(false);
  timer = setTimeout(loop, Math.max(0, 16 - (Date.now() - started)));
}

function run() {
  if (timer === null && simulation) timer = setTimeout(loop, 0);
}

self.onmessage = (event) => {
  const message = event.data || {};
  switch (message.type) {
    case "init": {
      stopLoop();
      dragging = false;
      ticks = 0;
      inFlight = 0;
      pool.length = 0;
      nodes = (message.nodes || []).map((n) => ({
        id: n.id,
        x: Number.isFinite(n.x) ? n.x : undefined,
        y: Number.isFinite(n.y) ? n.y : undefined,
        vx: 0,
        vy: 0,
        fx: n.fx == null ? null : n.fx,
        fy: n.fy == null ? null : n.fy,
        r: n.r || 8,
      }));
      indexById = new Map(nodes.map((n, i) => [n.id, i]));
      world = message.world || null;
      const edges = (message.edges || [])
        .filter((e) => indexById.has(e.source) && indexById.has(e.target))
        .map((e) => ({ source: e.source, target: e.target, kind: e.kind }));
      const tuned = tuning(message.params);
      simulation = d3
        .forceSimulation(nodes)
        .velocityDecay(VELOCITY_DECAY)
        .alphaDecay(ALPHA_DECAY)
        .force(
          "link",
          d3
            .forceLink(edges)
            .id((d) => d.id)
            .distance(tuned.linkDistance)
        )
        .force("charge", d3.forceManyBody().strength(tuned.charge))
        // **A weak centre, not a strong one.** §2's complaint is "gravity that
        // pulls everything into one clump": a strong centring force flattens
        // the structure the repulsion just produced. These two are strong
        // enough that a detached cluster drifts back into frame eventually and
        // weak enough that clusters keep their shape.
        .force("x", d3.forceX(0).strength(0.015))
        .force("y", d3.forceY(0).strength(0.02))
        .force(
          "collide",
          d3.forceCollide().radius((d) => (d.r || 8) + COLLIDE_PAD)
        )
        // d3 starts its own timer on construction; every tick here is driven
        // by `loop` instead, so that one is turned off immediately.
        .stop();
      if (world) {
        const cx = (world.left + world.right) / 2;
        const cy = (world.top + world.bottom) / 2;
        simulation.force("x").x(cx);
        simulation.force("y").y(cy);
      }
      simulation.alpha(message.alpha == null ? 1 : message.alpha);
      run();
      break;
    }
    case "params":
      applyForces(message.params);
      if (simulation) simulation.alpha(Math.max(simulation.alpha(), 0.3));
      run();
      break;
    case "drag": {
      if (!simulation) break;
      const index = indexById.get(message.id);
      if (index === undefined) break;
      const node = nodes[index];
      if (message.phase === "start") {
        dragging = true;
        simulation.alphaTarget(DRAG_ALPHA).alpha(Math.max(simulation.alpha(), DRAG_ALPHA));
        node.fx = message.x;
        node.fy = message.y;
      } else if (message.phase === "move") {
        node.fx = message.x;
        node.fy = message.y;
      } else {
        dragging = false;
        // alphaTarget(0) rather than a stop: the release is meant to *decay*,
        // which is what makes the neighbourhood settle after you let go
        // instead of freezing mid-rearrangement.
        simulation.alphaTarget(0);
        if (!message.keep) {
          node.fx = null;
          node.fy = null;
        }
      }
      run();
      break;
    }
    case "freeze":
      for (const id of message.ids || []) {
        const index = indexById.get(id);
        if (index === undefined) continue;
        const node = nodes[index];
        if (node.fx != null) continue; // already held by the user
        node.fx = node.x;
        node.fy = node.y;
        node.frozenByDrag = true;
      }
      run();
      break;
    case "thaw":
      for (const node of nodes) {
        if (!node.frozenByDrag) continue;
        node.fx = null;
        node.fy = null;
        node.frozenByDrag = false;
      }
      run();
      break;
    case "pin": {
      const index = indexById.get(message.id);
      if (index === undefined) break;
      nodes[index].fx = message.x;
      nodes[index].fy = message.y;
      run();
      break;
    }
    case "unpin": {
      const index = indexById.get(message.id);
      if (index === undefined) break;
      nodes[index].fx = null;
      nodes[index].fy = null;
      if (simulation) simulation.alpha(Math.max(simulation.alpha(), 0.2));
      run();
      break;
    }
    case "reheat":
      if (!simulation) break;
      simulation.alpha(Math.max(simulation.alpha(), message.alpha || 0.3));
      run();
      break;
    case "stop":
      stopLoop();
      dragging = false;
      break;
    case "recycle":
      inFlight = Math.max(0, inFlight - 1);
      if (message.buffer && pool.length < 3) pool.push(new Float32Array(message.buffer));
      break;
    default:
      break;
  }
};
