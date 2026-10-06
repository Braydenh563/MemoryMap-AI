"""INBOX 692 and 693: a more intentional force layout, and a Reshuffle.

The owner, with a screenshot of a link passing behind other notes' dots:
"bit of overlap"; and "is there a way to get the graph to sit in ways that
are more visually appealing and understandable and profesional ...
intentional"; and "can you add a resuffle button". The decisions (693's
entry): clusters by category with clear space between them, hubs central,
labels never over dots or lines, links routed round the notes they do not
join, nodes never touching, a Reshuffle (new seed, animated) and a fit.

These run the real worker in node (d3 vendored, `self` and `importScripts`
stubbed), step it to rest on a fixture shaped like the showcase notebook
(seven categories, hubs, chains, bridges, loose notes), and measure the
settled geometry. The browser half is `scratchpad/ui-sweeps/graph692.js`.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "frontend" / "js"
WORKER = (JS / "graph-worker.js").read_text(encoding="utf-8")

HARNESS = r"""
const vm = require("vm");
const fs = require("fs");
const [workerPath, d3Path, optsJson] = process.argv.slice(1);
const opts = JSON.parse(optsJson);
const out = [];
// The loop is stepped by hand below, so no timer ever fires.
const ctx = { console, setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {} };
ctx.self = ctx;
// The main thread hands every frame's buffer back (`recycle`), or the worker
// stops posting frames once two are in flight.
ctx.postMessage = (m) => {
  out.push(m);
  if (m.type === "tick") ctx.onmessage({ data: { type: "recycle" } });
};
ctx.importScripts = () => vm.runInContext(fs.readFileSync(d3Path, "utf8"), ctx);
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(workerPath, "utf8"), ctx);
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cats = ["Work", "Travel", "Cooking", "Reading", "Health", "Home", "Ideas"];
const sizes = [14, 11, 10, 9, 8, 7, 9];
const nodes = [];
const edges = [];
const byCat = {};
cats.forEach((cat, c) => {
  byCat[cat] = [];
  for (let i = 0; i < sizes[c]; i++) {
    const id = `${cat}-${i}`;
    byCat[cat].push(id);
    nodes.push({ id, r: 6, group: cat });
  }
});
const link = (a, b, kind = "link") => edges.push({ source: a, target: b, kind });
// Work and Travel: a hub and a dense web; Cooking: two hubs; Reading: a
// chain; Health: a star; Home: mostly loose; Ideas: bridges between them.
for (const cat of ["Work", "Travel"]) {
  const ids = byCat[cat];
  for (let i = 1; i < ids.length - 1; i++) link(ids[0], ids[i]);
  for (let i = 2; i < ids.length - 1; i++) link(ids[i], ids[1 + Math.floor(rnd() * (i - 1))]);
}
const cook = byCat.Cooking;
for (let i = 2; i < cook.length; i++) link(cook[i % 2], cook[i]);
link(cook[0], cook[1]);
const read = byCat.Reading;
for (let i = 1; i < read.length - 1; i++) link(read[i - 1], read[i]);
const health = byCat.Health;
for (let i = 1; i < health.length; i++) link(health[0], health[i]);
link(byCat.Home[0], byCat.Home[1]);
const ideas = byCat.Ideas;
const hubs = ["Work-0", "Travel-0", "Cooking-0", "Reading-3", "Health-0"];
ideas.slice(0, 6).forEach((id, i) => { link(id, hubs[i % hubs.length]); link(id, hubs[(i + 2) % hubs.length]); });
link(ideas[6], ideas[7]);
const pinned = opts.pin ? { id: "Home-4", x: 40, y: 40 } : null;
const world = { left: -1200, top: -900, right: 1200, bottom: 900, aspect: 900 / 1440 };
const init = {
  type: "init", epoch: 1, nodes: nodes.map((n) => (pinned && n.id === pinned.id ? { ...n, fx: pinned.x, fy: pinned.y, x: pinned.x, y: pinned.y } : n)),
  edges, world, alpha: 1,
  params: { gravity: 50, spread: 50, linkForce: 50, lengthByScore: true, groupBy: true, orbit: true, curved: opts.curved !== false, shape: opts.shape || "organic" },
};
// Place as the main thread does (the phyllotaxis spiral), so the run is the
// app's own start.
const golden = Math.PI * (3 - Math.sqrt(5));
init.nodes.forEach((n, i) => {
  if (n.x != null) return;
  n.x = 10 * Math.sqrt(0.5 + i) * Math.cos(i * golden);
  n.y = 10 * Math.sqrt(0.5 + i) * Math.sin(i * golden);
});
const send = (m) => ctx.onmessage({ data: m });
const settle = () => {
  for (let i = 0; i < 4000; i++) {
    const ends = out.filter((m) => m.type === "end").length;
    vm.runInContext("timer = null; loop();", ctx);
    if (out.filter((m) => m.type === "end").length > ends) return i;
  }
  return -1;
};
send(init);
const firstTicks = settle();
const snap = () => vm.runInContext("nodes.map((n) => [n.id, n.x, n.y, n.r, n.group])", ctx);
const result = { firstTicks, first: snap() };
if (opts.reshuffle) {
  out.length = 0;
  send({ type: "reshuffle", seed: opts.reshuffle, animate: true });
  // The animated move posts frames before the layout restarts.
  vm.runInContext("timer = null; loop();", ctx);
  result.firstFrameAlpha = out.find((m) => m.type === "tick").alpha;
  result.shuffleTicks = settle();
  result.after = snap();
}
result.edges = edges.map((e) => [e.source, e.target]);
console.log(JSON.stringify(result));
"""


def _run(**opts) -> dict:
    out = subprocess.run(
        [
            "node",
            "-e",
            HARNESS,
            str(JS / "graph-worker.js"),
            str(ROOT / "frontend" / "vendor" / "d3.v7.min.js"),
            json.dumps(opts),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def _bow(a, b):
    """The renderer's own curve (`gcBowPoint`, graph-canvas.js)."""
    dx, dy = b[1] - a[1], b[2] - a[2]
    length = (dx * dx + dy * dy) ** 0.5 or 1
    side = 1 if str(a[0]) < str(b[0]) else -1
    bow = min(length * 0.14, 48) * side
    return ((a[1] + b[1]) / 2 - dy / length * bow, (a[2] + b[2]) / 2 + dx / length * bow)


def _seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    length = dx * dx + dy * dy or 1
    u = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length))
    return ((px - ax - u * dx) ** 2 + (py - ay - u * dy) ** 2) ** 0.5


def _geometry(positions, edges, curved=True):
    at = {p[0]: p for p in positions}
    touching = 0
    for i, a in enumerate(positions):
        for b in positions[i + 1 :]:
            gap = ((a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5 - a[3] - b[3]
            if gap < 2:
                touching += 1
    through = 0
    for s, t in edges:
        a, b = at[s], at[t]
        if curved:
            c = _bow(a, b)
            pts = [
                (
                    (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[0] + u * u * b[1],
                    (1 - u) ** 2 * a[2] + 2 * (1 - u) * u * c[1] + u * u * b[2],
                )
                for u in (i / 16 for i in range(17))
            ]
        else:
            pts = [(a[1], a[2]), (b[1], b[2])]
        for n in positions:
            if n[0] in (s, t):
                continue
            d = min(_seg_dist(n[1], n[2], *pts[i - 1], *pts[i]) for i in range(1, len(pts)))
            if d < n[3]:
                through += 1
    return touching, through


def _hub_central(positions, edges):
    """Each category's best-connected note within it (four or more lines to
    its own category, so a chain has no hub): its distance from the middle
    of the category's linked notes, over their mean distance from it."""
    group_of = {p[0]: p[4] for p in positions}
    degree: dict = {}
    for s, t in edges:
        if group_of[s] != group_of[t]:
            continue
        degree[s] = degree.get(s, 0) + 1
        degree[t] = degree.get(t, 0) + 1
    ratios = []
    for group in {p[4] for p in positions}:
        # The cluster is its linked notes: a loose note sits on the orbit
        # round the whole map (INBOX 443), not in its category's middle.
        members = [p for p in positions if p[4] == group and degree.get(p[0], 0)]
        top = max(members, key=lambda p: degree.get(p[0], 0))
        if degree.get(top[0], 0) < 4:
            continue
        cx = sum(p[1] for p in members) / len(members)
        cy = sum(p[2] for p in members) / len(members)
        mean = sum(((p[1] - cx) ** 2 + (p[2] - cy) ** 2) ** 0.5 for p in members) / len(members)
        ratios.append((((top[1] - cx) ** 2 + (top[2] - cy) ** 2) ** 0.5) / mean)
    return sum(ratios) / len(ratios)


def _moat(positions, edges):
    """The 10th percentile, over notes, of the gap to the nearest note of
    another category that it is not linked to: the narrow end of the space
    between clusters."""
    linked = {(s, t) for s, t in edges} | {(t, s) for s, t in edges}
    gaps = []
    for a in positions:
        best = min(
            (
                ((a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5 - a[3] - b[3]
                for b in positions
                if b[4] != a[4] and (a[0], b[0]) not in linked
            ),
            default=None,
        )
        if best is not None:
            gaps.append(best)
    gaps.sort()
    return gaps[len(gaps) // 10]


node_only = pytest.mark.skipif(shutil.which("node") is None, reason="node is not installed")


@node_only
@pytest.mark.parametrize(
    "shape,curved",
    [("organic", True), ("organic", False), ("clusters", True), ("galaxy", True)],
)
def test_no_link_runs_through_a_note_it_does_not_join_and_no_two_notes_touch(shape, curved):
    """In every Shape (the owner, 693: "all shapes keep 0 overlap")."""
    run = _run(curved=curved, shape=shape)
    assert run["firstTicks"] > 0
    # Only Organic draws its lines curved (`_straight`, `clearCurve`).
    touching, through = _geometry(run["first"], run["edges"], curved and shape == "organic")
    assert touching == 0
    assert through == 0


@node_only
def test_hubs_sit_at_the_heart_of_their_category_with_space_between_categories():
    run = _run(shape="clusters")
    assert _hub_central(run["first"], run["edges"]) < 0.4
    assert _moat(run["first"], run["edges"]) >= 24


@node_only
def test_reshuffle_reseeds_the_unpinned_notes_animates_and_settles_clean():
    run = _run(reshuffle=12345, pin=True, shape="clusters")
    before = {p[0]: p for p in run["first"]}
    after = {p[0]: p for p in run["after"]}
    moved = sum(
        1
        for key, p in before.items()
        if ((p[1] - after[key][1]) ** 2 + (p[2] - after[key][2]) ** 2) ** 0.5 > 20
    )
    assert moved > len(before) * 0.6
    # A pinned note is where it was pinned.
    assert after["Home-4"][1:3] == [40, 40]
    # The first frame is the start of a glide, not the jump to the new seed,
    # and it reports a hot layout so the main thread's fit waits for it.
    assert run["firstFrameAlpha"] >= 0.9
    assert run["shuffleTicks"] > 20
    touching, through = _geometry(run["after"], run["edges"], curved=False)
    assert (touching, through) == (0, 0)
    # The same seed lays the same map out: a reshuffle is a choice, not noise.
    again = _run(reshuffle=12345, pin=True, shape="clusters")
    assert again["after"] == run["after"]


def test_the_reshuffle_control_sits_beside_unpin_all_and_is_explained():
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    physics = html[html.index('id="graph-physics"') :]
    physics = physics[: physics.index("</details>")]
    assert 'id="graph-reshuffle"' in physics
    assert physics.index('id="graph-unpin-all"') < physics.index('id="graph-reshuffle"')
    wiring = (JS / "graph.js").read_text(encoding="utf-8")
    assert '$("graph-reshuffle")' in wiring
    canvas = (JS / "graph-canvas.js").read_text(encoding="utf-8")
    assert "function gcReshuffle(" in canvas
    assert 'type: "reshuffle"' in canvas
    assert 'case "reshuffle"' in WORKER
    help_text = (ROOT / "src" / "memorymap" / "ai" / "help_chat.py").read_text(encoding="utf-8")
    assert "Reshuffle layout" in help_text


@node_only
def test_loose_notes_sit_together_and_the_bridging_category_in_the_middle():
    """The owner's second pass (693): "orphans gathered into a tidy group per
    category or at their cluster's rim", and no note "floating between
    clusters with no clear home"."""
    run = _run(shape="clusters")
    positions, edges = run["first"], run["edges"]
    linked = {s for s, _ in edges} | {t for _, t in edges}
    loose = [p for p in positions if p[4] == "Home" and p[0] not in linked]
    spread = max(
        ((a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5 for a in loose for b in loose
    )
    assert len(loose) >= 4 and spread < 160
    # Ideas links to five other categories and hardly to itself: it stands in
    # the middle, so its lines run one ring-radius rather than across the map.
    cx = sum(p[1] for p in positions) / len(positions)
    cy = sum(p[2] for p in positions) / len(positions)
    middle = {}
    for group in {p[4] for p in positions}:
        members = [p for p in positions if p[4] == group and p[0] in linked]
        if members:
            gx = sum(p[1] for p in members) / len(members)
            gy = sum(p[2] for p in members) / len(members)
            middle[group] = ((gx - cx) ** 2 + (gy - cy) ** 2) ** 0.5
    assert min(middle, key=middle.get) == "Ideas"


def test_the_shape_control_is_saved_and_reaches_the_worker():
    """INBOX 693: "different preferred shapes or ways of structuring the
    force graph", one control, Organic (the layout the notebook had) first
    and the default."""
    html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    view = html[html.index('id="graph-view-section"') :]
    view = view[: view.index("</div>\n            <!-- GRAPH_PLAN Phase 3")]
    assert 'id="graph-shape"' in view
    options = view[view.index('id="graph-shape"') :]
    options = options[: options.index("</select>")]
    assert [part.split('"')[0] for part in options.split('value="')[1:]] == ["organic", "clusters", "galaxy"]
    graph = (JS / "graph.js").read_text(encoding="utf-8")
    assert 'localStorage.setItem("graph-shape", shape.value)' in graph
    canvas = (JS / "graph-canvas.js").read_text(encoding="utf-8")
    assert "shape: gcShape(s)," in canvas
    assert 'const SHAPES = new Set(["organic", "clusters", "galaxy"]);' in WORKER
    help_text = (ROOT / "src" / "memorymap" / "ai" / "help_chat.py").read_text(encoding="utf-8")
    assert "Shape (Organic, Clusters or Galaxy)" in help_text
