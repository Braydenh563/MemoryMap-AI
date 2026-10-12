"""The graph names a fixed layout, and notes leaving the picture fade out.

The owner's "completely broken" graph was a saved Tree or Arc layout, static
by design. The dock now carries one chip naming the layout whenever it is not
Force, and the chip opens the Layout choice. A note that leaves the picture
keeps its halo for a moment and fades, as a note arriving fades in.
Measured in a browser at 1440 and 390 (the chip is 122 by 28 and 122 by 44;
the dock does not grow; a ghost's pixel went 255, 101, 16, 4 in 330 ms).
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANVAS = (ROOT / "frontend" / "js" / "graph-canvas.js").read_text(encoding="utf-8")
HTML = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
CSS = (ROOT / "frontend" / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")


def test_the_dock_chip_is_hidden_under_force_and_opens_the_layout_choice():
    assert re.search(r'<button id="graph-layout-chip" class="[^"]*\bhidden\b[^"]*" type="button"', HTML)
    body = CANVAS[CANVAS.index("function graphSyncLayoutChip(") :]
    body = body[: body.index("\n}\n")]
    assert 'layoutKind !== "force"' in body and 'classList.toggle("hidden", !named)' in body
    assert "setGraphOptionsOpen(true)" in body and "openGraphControlsSheet(chip)" in body
    assert 'focusSelect(document.getElementById("graph-layout"))' in body
    # Both renderers' stats line call it, so neither leaves a stale chip.
    assert "graphSyncLayoutChip(layoutKind);" in CANVAS
    assert "graphSyncLayoutChip(layoutKind);" in (ROOT / "frontend" / "js" / "graph.js").read_text(encoding="utf-8")


def test_the_chip_survives_the_phone_dock_that_hides_every_other_chip():
    assert re.search(r"\.dock-identity > #graph-layout-chip:not\(\.hidden\) \{\s*display: inline-flex;", CSS)


def test_a_note_leaving_the_picture_fades_instead_of_vanishing():
    mark = CANVAS[CANVAS.index("function gcMarkLeaving(") :]
    mark = mark[: mark.index("\n}\n")]
    assert "gcStill()" in mark, "less motion keeps the cut"
    assert "staying.has(n.id)" in mark
    draw = CANVAS[CANVAS.index("function gcDrawLeaving(") :]
    draw = draw[: draw.index("\n}\n")]
    assert "GC_BORN_MS" in draw and "s.bornPending = true" in draw, "the fade must keep the frame loop going"
    assert "gcMarkLeaving(s, graphNodesRef, nodes);\n  s.epoch += 1;" in CANVAS, "marked before graphNodesRef is replaced"
    assert "gcDrawLeaving(ctx, s, bornAt);" in CANVAS
