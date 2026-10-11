"""Brief 100, the graph's feel (INBOX 802, 864, 865, and the owner
2026-10-11: "there is still no smooth transition loading up the app nd
viewing the graph, it kinda just appears after the page loads").

Measured with `scratchpad/ui-sweeps/graph100.js` (200 and 2,000 notes); these
tests hold the pure pieces by running them in node, and read the source for
the wiring a canvas hides from the lints."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CANVAS = (ROOT / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")

needs_node = pytest.mark.skipif(not shutil.which("node"), reason="needs node")


def _fn(name: str) -> str:
    found = re.search(rf"^(?:async )?function {name}\(.*?^\}}", CANVAS, re.S | re.M)
    assert found, name
    return found.group(0)


def _const(name: str) -> str:
    found = re.search(rf"^const {name} = .*?;$", CANVAS, re.M)
    assert found, name
    return found.group(0)


def _node(script: str) -> dict:
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True, timeout=30).stdout
    return json.loads(out)


@needs_node
def test_the_settled_map_is_kept_and_a_fresh_page_starts_from_it():
    script = "\n".join(
        [
            _const("GC_POS_KEY"),
            _const("GC_POS_MAX"),
            _fn("gcPositionsSig"),
            _fn("gcSavePositions"),
            _fn("gcCachedPositions"),
            """
let graphFocusModeId = null;
let shape = "organic";
const gcWorkerParams = () => ({ shape });
const store = new Map();
let blocked = false;
const localStorage = {
  getItem(k) { if (blocked) throw new Error("blocked"); return store.has(k) ? store.get(k) : null; },
  setItem(k, v) { if (blocked) throw new Error("blocked"); store.set(k, v); },
};
const s = { size: "full", tree: null, layoutSeed: 0, nodes: [{ id: 7, x: 10.4, y: -3.6 }, { id: 9, x: NaN, y: 1 }] };
gcSavePositions(s);
const back = gcCachedPositions(s);
shape = "clusters";
const otherShape = gcCachedPositions(s);
shape = "organic";
const pane = gcCachedPositions({ ...s, size: "pane" });
graphFocusModeId = 7;
const focused = gcCachedPositions(s);
graphFocusModeId = null;
blocked = true;
let threw = false;
try { gcSavePositions(s); gcCachedPositions(s); } catch (e) { threw = true; }
console.log(JSON.stringify({ back, otherShape, pane, focused, threw, blockedRead: gcCachedPositions(s) }));
""",
        ]
    )
    out = _node(script)
    assert out["back"] == {"7": {"x": 10, "y": -4}}, "a settled note is kept, a note with no place is not"
    assert out["otherShape"] is None, "positions settled under other forces are not reused"
    assert out["pane"] is None and out["focused"] is None, "only the tab's whole map is kept"
    assert out["threw"] is False and out["blockedRead"] is None, "a blocked store costs the head start, nothing else"


def test_the_cache_is_read_on_a_first_draw_and_written_at_rest():
    render = _fn("renderGraphCanvas")
    assert (
        'graphPendingViewPositions || (s.layoutKind === "force" && !prior.size ? gcCachedPositions(s) : null);'
        in render
    ), "a page's first force draw starts from the kept positions, through the saved-view path"
    end = CANVAS[CANVAS.index('} else if (message.type === "end") {') :]
    assert "gcSavePositions(s);" in end[:600], "the positions are kept when the layout comes to rest"


def test_the_map_arrives_over_a_fade_the_reader_can_see():
    reveal = _fn("gcReveal")
    assert 'opacity calc(var(--ui-slow) * 2) var(--ease-out)' in reveal


@needs_node
def test_the_hover_eases_over_the_motion_tokens_and_cuts_with_less_motion():
    script = "\n".join(
        [
            _const("GC_FADE_MS"),
            _fn("gcMs"),
            _fn("gcStill"),
            _fn("gcFadeStep"),
            """
let reduce = false, appMotion = "auto";
const window = { matchMedia: () => ({ matches: reduce }) };
const document = { documentElement: { dataset: { get motion() { return appMotion; } } } };
let gcTokens = { fadeMs: gcMs("0.2s") };
let t = 1000;
const performance = { now: () => t };
const s = {};
gcFadeStep(s, false);
t += 16.7;
const step = gcFadeStep(s, gcStill());
appMotion = "reduced";
const appStill = gcStill();
appMotion = "auto"; reduce = true;
const osStill = gcStill();
reduce = false;
gcTokens = { fadeMs: gcMs("0s") };
t += 16.7;
const off = gcFadeStep(s, gcStill());
console.log(JSON.stringify({ ms: [gcMs("0.2s"), gcMs("120ms"), gcMs("0s"), gcMs("")], step, appStill, osStill, off }));
""",
        ]
    )
    out = _node(script)
    assert out["ms"] == [200, 120, 0, 0]
    assert abs(out["step"] - 16.7 / 200) < 1e-9, "a frame moves a 200 ms fade by its share"
    assert out["appStill"] is True and out["osStill"] is True, "the app's Reduce motion counts, not only the system's"
    assert out["off"] == 1, "interface animations off (a 0s token) lands the fade at once"


@needs_node
def test_a_new_note_starts_beside_its_neighbours_not_on_the_centre_spiral():
    script = "\n".join(
        [
            _fn("gcSeedBesideNeighbours"),
            """
const nodes = [
  { id: 1, x: 100, y: 100, category: "A" },
  { id: 2, x: 300, y: 100, category: "A" },
  { id: 3, category: "A" },
  { id: 4, category: "A" },
  { id: 5, category: "B" },
];
const s = { adj: new Map([[1, new Set([3])], [2, new Set([3])], [3, new Set([1, 2])], [4, new Set()], [5, new Set()]]),
  byId: new Map(nodes.map((n) => [n.id, n])) };
gcSeedBesideNeighbours(s, nodes);
console.log(JSON.stringify(nodes.map((n) => [n.x ?? null, n.y ?? null])));
""",
        ]
    )
    out = _node(script)
    assert abs(out[2][0] - 200) <= 12.5 and abs(out[2][1] - 100) <= 12.5, "beside the middle of its linked notes"
    assert abs(out[3][0] - 200) <= 12.5 and abs(out[3][1] - 100) <= 12.5, "unlinked: beside its category"
    assert out[4] == [None, None], "nothing placed to stand beside: left for the spiral"


def test_an_update_reheats_like_a_drag_and_leaving_notes_keep_their_look():
    start = _fn("gcStartWorker")
    assert _const("GC_UPDATE_ALPHA") == "const GC_UPDATE_ALPHA = 0.3;"
    assert "if (init.alpha === 1 && viewSeed?.holdIfSettled && s.lastForces === forces) init.alpha = GC_UPDATE_ALPHA;" in start
    mark = _fn("gcMarkLeaving")
    assert "sprite: n._sprite || null," in mark and "lines.lineTo(b.x, b.y);" in mark
    assert _const("GC_LEAVING_MAX") == "const GC_LEAVING_MAX = 2500;", "a category of hundreds fades too"
    draw = _fn("gcDraw")
    assert draw.index("gcDrawLeavingLines(ctx, s, performance.now());") < draw.index("gcDrawLeaving(ctx, s, bornAt);")


def test_a_frame_of_a_hover_fade_builds_no_style_objects_or_keys():
    draw = _fn("gcDraw")
    assert "{ ...style" not in draw, "an edge's look is worked out once per render (gcEdgeLook)"
    assert "edge._keys[slot] ||" in draw
    assert "gcBowPoint(a, b, gcBowScratch, edge._side)" in draw
    assert "node._spritePx !== px" in draw


#: The bloom block exactly as it stood before Brief 100: the owner said "keep
#: the glow the same", so its text is pinned (the pixel check, glow.js against
#: the base sprite, measured a 0 difference on the glow ring).
GLOW = """  if (gcHexToRgb(colour)) {
    const bloom = c.createRadialGradient(half, half, r * 0.9, half, half, half);
    const rgb = gcHexToRgb(colour).join(", ");
    bloom.addColorStop(0, `rgba(${rgb}, ${hub ? 0.15 : 0.09})`);
    bloom.addColorStop(1, `rgba(${rgb}, 0)`);"""


@needs_node
def test_the_node_gets_a_shaded_core_and_a_rim_and_the_glow_is_unchanged():
    sprite = _fn("gcNodeSprite")
    assert GLOW in sprite
    assert "const glow = hub ? Math.round(r * 0.8) + 3 : Math.round(r * 0.45) + 2;" in sprite
    assert sprite.index(GLOW) < sprite.index("gcPaintCore(c, half, r, colour);")
    core = _fn("gcPaintCore")
    assert "createRadialGradient" in core and "c.stroke()" in core
    out = _node(
        _fn("gcHexToRgb")
        + _fn("gcMixRgb")
        + """
        console.log(JSON.stringify([gcMixRgb([100, 200, 0], 255, 0.08), gcMixRgb([100, 200, 0], 0, 0.25)]));
        """
    )
    assert out == ["rgb(112, 204, 20)", "rgb(75, 150, 0)"]


def test_the_note_whose_card_is_open_wears_the_focus_ring():
    draw = _fn("gcDraw")
    assert 'const openId = s.size === "full" && typeof graphPopupId !== "undefined" ? graphPopupId : null;' in draw
    assert "node.id === gcKeyboardId(s) || node.id === openId" in draw
    graph = (ROOT / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")
    for fn in ("openGraphPopup", "closeGraphPopup"):
        body = re.search(rf"(?:async )?function {fn}\(.*?\n}}\n", graph, re.S).group(0)
        assert "gcRequestDraw(gcTab)" in body
