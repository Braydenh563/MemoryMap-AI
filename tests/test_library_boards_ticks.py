"""The Library's Boards & maps ticks line up under the Maps / Boards chip.

`syncLibraryBoardsTicks` (library.js) grafts a selection tick onto each card
whiteboard.js drew by fetching the board list again and matching it to the
cards by position. It bails, attaching nothing, when the two lists differ in
length. It narrowed by the search box and the sort (`wbVisibleBoards`) but not
by the Maps / Boards / All chip, so with a chip on the grid held one kind, the
list held every kind, and no card got a tick: "Select all" and the bulk Delete
were dead under exactly the filters people use to find a map.

The behaviour is driven in Chromium by `scratchpad/ui-sweeps/boardticks.js`
(0 ticks on 1 card under Maps and 0 on 2 under Boards before; one each after).
This is the cheap half the suite can see: the gallery and the tick sync must
narrow through the *same* function, so the two cannot drift again.
"""

from __future__ import annotations

from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "frontend" / "js"


def _body(text: str, signature: str) -> str:
    start = text.index(signature)
    end = text.index("\n}\n", start)
    return text[start:end]


def test_gallery_and_tick_sync_narrow_through_one_function() -> None:
    whiteboard = (JS / "whiteboard.js").read_text(encoding="utf-8")
    library = (JS / "library.js").read_text(encoding="utf-8")

    assert "window.wbBoardsOfTypeFilter = function" in whiteboard

    gallery = _body(whiteboard, "async function renderLibraryBoardsGallery()")
    assert "window.wbBoardsOfTypeFilter(boards)" in gallery
    # The private copy this replaced must not come back beside it.
    assert "BOARD_FILTERS.find" not in gallery

    ticks = _body(library, "async function syncLibraryBoardsTicks()")
    assert "window.wbBoardsOfTypeFilter(" in ticks
    # Narrowed by the chip *before* the search and sort, as the gallery does.
    assert "window.wbVisibleBoards(window.wbBoardsOfTypeFilter(boards), needle)" in ticks
