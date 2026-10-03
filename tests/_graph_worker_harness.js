// Runs frontend/js/graph-worker.js outside a browser, for tests/test_graph_look.py.
//
// The worker is a classic script that talks through `self.onmessage` and
// `postMessage`, schedules itself with `setTimeout` and loads the vendored d3
// with `importScripts`. A `vm` context with those four stubbed runs it for
// real: the same file, the same d3, a fixed number of ticks, no browser.
//
//   node tests/_graph_worker_harness.js <scenario.json>   (JSON on stdin also works)
//
// The scenario is {nodes:[{id,group,r}], edges:[{source,target,kind,reason}],
// params:{}, world:{...}, ticks:N}; the answer is {positions:{id:[x,y]}} after
// N ticks. Deterministic: d3's initial layout is a phyllotaxis spiral and the
// forces use no random source here.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "frontend");
const scenario = JSON.parse(fs.readFileSync(process.argv[2] || 0, "utf8"));

const timers = [];
const sent = [];
const sandbox = {
  console,
  Math,
  Date,
  Float32Array,
  Map,
  Set,
  setTimeout: (fn) => {
    timers.push(fn);
    return timers.length;
  },
  clearTimeout: () => {},
  // d3-timer arms these when a simulation is built; the worker stops that
  // timer at once and drives every tick itself, so they never need to fire.
  setInterval: () => 0,
  clearInterval: () => {},
  performance: { now: () => Date.now() },
  postMessage: (message) => sent.push(message),
};
sandbox.self = sandbox;
vm.createContext(sandbox);
sandbox.importScripts = (url) => {
  const file = path.join(root, url.replace(/^\//, ""));
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
};
vm.runInContext(fs.readFileSync(path.join(root, "js", "graph-worker.js"), "utf8"), sandbox, {
  filename: "graph-worker.js",
});

process.on("uncaughtException", (error) => {
  // d3 is one minified line, so the default report is a screenful of it.
  process.stderr.write(`${error.name}: ${error.message}\n`);
  process.exit(1);
});

const world = scenario.world || { left: -900, top: -900, right: 900, bottom: 900, aspect: 0.5 };
sandbox.onmessage({
  data: {
    type: "init",
    epoch: 1,
    nodes: scenario.nodes.map((n) => ({ id: n.id, r: n.r || 8, group: n.group || "" })),
    edges: scenario.edges,
    params: scenario.params || { gravity: 50, spread: 50, lengthByScore: true, groupBy: true, orbit: true },
    world,
    alpha: 1,
  },
});
let last = null;
for (let i = 0; i < (scenario.ticks || 300) && timers.length; i++) {
  timers.shift()();
  const tick = sent.filter((m) => m.type === "tick").pop();
  if (tick) last = Array.from(tick.positions);
  // the main thread hands each buffer back; do the same so the pool never starves
  sent.length = 0;
  sandbox.onmessage({ data: { type: "recycle", buffer: new Float32Array(scenario.nodes.length * 2).buffer } });
}
const positions = {};
scenario.nodes.forEach((n, i) => {
  positions[n.id] = [last[i * 2], last[i * 2 + 1]];
});
process.stdout.write(JSON.stringify({ positions }));
