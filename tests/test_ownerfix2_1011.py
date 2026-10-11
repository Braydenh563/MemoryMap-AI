"""INBOX 838 to 846: the owner's afternoon findings, pinned by the rule each
measured fix rests on (the suite cannot see layout; numbers are in
docs/roadmap/agent-remaining/ownerfix2-1011.md)."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "frontend" / "css"
JS = ROOT / "frontend" / "js"


def test_the_constellation_keeps_its_shape_and_its_height_across_a_theme_change():
    """"swapping between light and dark mode collapses the notebook
    constellation and joltingly redraws it without it staying the same shape"
    (INBOX 838). Measured over a theme switch: the holder fell 220px to 0 for a
    frame (the veil is absolute, so the canvas alone gave it height), and every
    star's drift restarted from phase 0 (up to 6px)."""
    css = (CSS / "02-chat-graph.css").read_text(encoding="utf-8")
    holder = css[css.index(".art-holder {") :].split("}", 1)[0]
    assert "min-height: 13.75rem;" in holder
    js = (JS / "dashboard.js").read_text(encoding="utf-8")
    # The drift is read off a page-lifetime clock, never a sketch's own.
    assert "const artEpoch = performance.now();" in js
    assert "p.millis() * 0.0003" not in js
    assert js.count("artDriftMs() * 0.0003") == 2


def test_the_nav_history_x_is_drawn_inside_the_rows_fill():
    """"there's an excessive gap on the right for the x close buttons on the
    nav history, can you integrate them together??" (INBOX 846). Measured at
    1440: the row's button filled 177px and the X sat 4px past it (28px,
    outside the highlight). The X is laid over the button's right end, the fill
    follows the row, and the button yields the X's width only while shown."""
    css = (CSS / "nav-history-lazy.css").read_text(encoding="utf-8")
    row = css[css.index(".nav-history-row {") :].split("}", 1)[0]
    assert "position: relative;" in row
    remove = css[css.index(".nav-history-remove {") :].split("}", 1)[0]
    assert "position: absolute;" in remove and "opacity: 0;" in remove
    fill = css[css.index(".nav-history-row:hover > .nav-history-item,") :].split("}", 1)[0]
    assert "background-color: var(--ghost-btn-bg);" in fill and "padding-inline-end:" in fill


def test_the_nav_history_clear_action_is_a_quiet_footer_text_button():
    """"can you redesign or change the design of this 'clear this list'
    button??" (INBOX 845). It was a bordered, tinted button with a trash icon on
    a row of its own (32px tall, a 1px border, a lilac fill). Now one footer row:
    the older-steps count left, a muted text action right, the destructive ink
    only under the pointer or keyboard; no icon, no fill at rest."""
    js = (JS / "nav-history.js").read_text(encoding="utf-8")
    assert "ph:trash" not in js and 'foot.className = "nav-history-foot";' in js
    assert 'clear.className = "nav-history-clear";' in js
    css = (CSS / "nav-history-lazy.css").read_text(encoding="utf-8")
    rest = css[css.index(".nav-history-clear {") :].split("}", 1)[0]
    assert "background: none;" in rest and "color: var(--muted);" in rest
    hover = css[css.index(".nav-history-clear:hover,") :].split("}", 1)[0]
    assert "color: var(--error);" in hover


def test_a_small_pull_on_a_graph_node_heats_a_small_part_of_the_map():
    """"small adjustments and graph nodes being pulled in slightly are glitchy
    and jittery, not smooth" (INBOX 839). The worker raised the drag target to
    0.3 the moment a node was pressed. Measured per worker tick on 34 notes, an
    8px pull, two runs each: ticks above 1px 38 and 15, the last at tick 41 and
    179, one run with a 28px step and 8 re-accelerations before; 5 and 3, the
    last at tick 7 and 3, largest step 2.7px and 1 re-acceleration after. A
    120px pull is unchanged (90 against 92 to 96 ticks above 1px, 12.3 against
    12.6px). The target follows the distance carried from the press, easing from
    `DRAG_ALPHA_MIN` to `DRAG_ALPHA`."""
    worker = (JS / "graph-worker.js").read_text(encoding="utf-8")
    assert "const DRAG_ALPHA_MIN = 0.04;" in worker and "const DRAG_FULL_DISTANCE = 90;" in worker
    assert "simulation.alphaTarget(DRAG_ALPHA).alpha(Math.max(simulation.alpha(), DRAG_ALPHA));" not in worker
    start = worker[worker.index('if (message.phase === "start") {') :]
    assert "dragOrigin = { x: node.x, y: node.y };" in start.split('} else if (message.phase === "move")')[0]
    move = start.split('} else if (message.phase === "move") {')[1].split("} else {")[0]
    assert "dragHeat(message.x, message.y)" in move
    assert "dragOrigin = null;" in start
