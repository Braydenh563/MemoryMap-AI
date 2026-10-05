"""The graph's computed layouts do not depend on the order `/graph` lists notes.

INBOX 579, the owner, verbatim: "switching the graph layout does nothing".
`layoutHierarchy` (graph.js) created a note's list of children only when the
loop reached that note, so it assumed every note came after the note it
answers. `/graph` now reads newest first (the query is planned on the ARCH-05
index), so on any notebook with a thread a reply came first, the push into its
parent's missing list threw, and Tree, Radial and Arc drew nothing: the picker
moved, the map stayed on Force. Measured before the fix with
scratchpad/ui-sweeps/gl1005-graphlayout.js on 133 notes: every pair of layouts
0 px apart, three TypeErrors.

The function is run here, under node, with the vendored d3, on the shapes a
real notebook has and a seeded one in id order does not.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
GRAPH = (ROOT / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")
D3 = ROOT / "frontend" / "vendor" / "d3.v7.min.js"


def _function(name: str) -> str:
    start = GRAPH.index(f"\nfunction {name}(") + 1
    return GRAPH[start : GRAPH.index("\n}\n", start) + 2]


def _const(name: str) -> str:
    return re.search(rf"^const {name} = [^\n]*", GRAPH, re.M).group(0)


SCRIPT = "\n".join(
    [
        f"const d3 = require({json.dumps(str(D3))});",
        *(_const(name) for name in ("TREE_ROW", "TREE_COL", "RADIAL_ARC", "RADIAL_LABEL", "RADIAL_GAP", "REPLY_RING", "ARC_STEP")),
        _function("graphGroupNode"),
        _function("radialRings"),
        _function("layoutHierarchy"),
        """
const n = (id, extra = {}) => ({ id, category: "A", preview: String(id), ...extra });
const cases = {
  replyFirst: [n(3, { parent_id: 2 }), n(2, { parent_id: 1 }), n(1), n(4, { category: "B" })],
  selfReply: [n(1, { parent_id: 1 }), n(2)],
  cycle: [n(1, { parent_id: 2 }), n(2, { parent_id: 1 }), n(3)],
};
const out = {};
for (const [name, nodes] of Object.entries(cases)) {
  for (const kind of ["tree", "radial", "arc"]) {
    try {
      const r = layoutHierarchy(nodes.map((x) => ({ ...x })), kind, 1200, 800);
      const notes = r.nodes.filter((p) => typeof p.id === "number");
      out[`${name}/${kind}`] = {
        ids: notes.map((p) => p.id).sort(),
        finite: notes.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
        threads: r.links.filter((l) => l.kind === "thread").map((l) => [l.source.id, l.target.id]),
      };
    } catch (e) {
      out[`${name}/${kind}`] = { error: String(e) };
    }
  }
}
console.log(JSON.stringify(out));
""",
    ]
)


@pytest.fixture(scope="module")
def laid():
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not installed")
    run = subprocess.run([node, "-e", SCRIPT], capture_output=True, text=True, timeout=60)
    assert run.returncode == 0, run.stderr
    return json.loads(run.stdout)


@pytest.mark.parametrize("kind", ["tree", "radial", "arc"])
def test_a_reply_listed_before_the_note_it_answers_is_laid_out_under_it(laid, kind):
    got = laid[f"replyFirst/{kind}"]
    assert "error" not in got, got
    assert got["ids"] == [1, 2, 3, 4] and got["finite"]
    assert sorted(got["threads"]) == [[1, 2], [2, 3]]


@pytest.mark.parametrize("case", ["selfReply", "cycle"])
@pytest.mark.parametrize("kind", ["tree", "radial", "arc"])
def test_a_reply_chain_that_loops_is_filed_under_its_category_not_lost(laid, case, kind):
    got = laid[f"{case}/{kind}"]
    assert "error" not in got, got
    expected = [1, 2] if case == "selfReply" else [1, 2, 3]
    assert got["ids"] == expected and got["finite"]
    assert got["threads"] == []
