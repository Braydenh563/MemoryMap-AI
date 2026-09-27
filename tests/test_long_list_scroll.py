"""The Library's and the Timeline's long lists stay smooth while they grow.

Measured on a thousand-note seed (`scratchpad/ui-sweeps/libtlscroll.js`,
libtl-0926): a chunk of Library cards landing mid-scroll took 45 to 88ms
and the Timeline dropped a dozen frames per 120 wheel steps. Four causes,
each pinned here, because each one is a small edit away from coming back and
nothing else in the suite scrolls a thousand rows.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def read(name: str) -> str:
    return (FRONTEND / name).read_text(encoding="utf-8")


def function_body(source: str, name: str) -> str:
    start = source.index(f"function {name}(")
    depth = 0
    for index in range(source.index(") {", start) + 2, len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[start : index + 1]
    raise AssertionError(f"{name} has no end")


def test_the_incremental_renderer_can_build_by_time_and_the_library_asks_it_to():
    source = read("notes-list.js")
    body = function_body(source, "renderIncrementally")
    assert "budgetMs = 0" in body, "opt-in, so the Notes list keeps its behaviour"
    assert "performance.now() - started > budgetMs" in body
    # The observer only fires on a *change* of intersection, so a small chunk
    # that leaves the sentinel near must carry on by itself, on frames.
    assert "requestAnimationFrame(pump)" in body
    assert re.search(r"budgetMs:\s*\d+", read("library.js"))


def test_a_new_card_does_not_restyle_the_whole_grid():
    # `:has(.library-card-tick:checked)` on the grid re-matched every card
    # each time a card (with its tick) was inserted: 10 cards restyled 1,270
    # elements. The selection code toggles a class instead.
    css = "\n".join(p.read_text(encoding="utf-8") for p in (FRONTEND / "css").glob("*.css"))
    assert ":has(.library-card-tick:checked)" not in css
    assert ".library-grid.is-choosing .library-card-tick" in css
    library = read("library.js")
    assert 'classList.toggle("is-choosing", chosen.length > 0)' in library
    assert 'classList.toggle("is-choosing", n > 0)' in library


def test_the_timeline_appends_by_time_and_counts_once_per_chunk():
    body = function_body(read("timeline.js"), "appendTimelineRows")
    assert "TIMELINE_APPEND_BUDGET_MS" in body
    # Re-counting a section per row walked the section per row: quadratic.
    assert 'section.querySelectorAll(".timeline-row")' not in body
    assert "childElementCount" in body
    # The visible set is built once per page, not per chunk.
    assert "appendTimelineRows(fresh, next, visible)" in body


def test_the_timeline_scroll_does_its_work_once_a_frame():
    source = read("timeline.js")
    listener = source[source.index('$("timeline-scroll").addEventListener("scroll"') :][:600]
    assert "requestAnimationFrame" in listener
    assert "passive: true" in listener
    span = function_body(source, "timelineDensitySpan")
    assert "timelineSpanCache.density === timelineDensity" in span
    window_ = function_body(source, "drawTimelineWindow")
    assert 'getAttribute("y") !==' in window_
