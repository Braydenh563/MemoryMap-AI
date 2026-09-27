"""The Library's keyboard and its remembered sort (libtl-0926).

Measured with the probes in `scratchpad/ui-sweeps/libtlaudit.js` on a
thousand-note seed: Tab from the search went 400 presses without leaving
the grid (every card was three stops and the grid grows as it scrolls), and
the All view's sort was the one Library sort not kept across a reload.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIBRARY = (ROOT / "frontend" / "library.js").read_text(encoding="utf-8")
NAVIGATION = (ROOT / "frontend" / "navigation.js").read_text(encoding="utf-8")


def _function(name: str) -> str:
    start = LIBRARY.index(f"function {name}(")
    depth = 0
    for index in range(LIBRARY.index(") {", start) + 2, len(LIBRARY)):
        if LIBRARY[index] == "{":
            depth += 1
        elif LIBRARY[index] == "}":
            depth -= 1
            if depth == 0:
                return LIBRARY[start : index + 1]
    raise AssertionError(name)


def test_a_card_is_built_off_the_tab_order_with_its_controls():
    card = _function("libraryCard")
    assert "card.tabIndex = 0;" not in card
    assert card.rstrip().endswith("setLibraryCardStop(card, false);\n  return card;\n}")
    stop = _function("setLibraryCardStop")
    assert "card.tabIndex = on ? 0 : -1" in stop
    assert "LIBRARY_CARD_STOPS" in stop
    assert 'const LIBRARY_CARD_STOPS = ".library-card-tick, .library-card-menu > button";' in LIBRARY


def test_the_grid_always_has_one_stop_and_it_follows_the_focus():
    assert "ensureLibraryGridStop(grid);" in LIBRARY
    ensure = _function("ensureLibraryGridStop")
    assert "grid.dataset.stopKey" in ensure
    listener = LIBRARY[LIBRARY.index('$("library-grid").addEventListener("focusin"') :][:600]
    assert "setLibraryCardStop(other, false)" in listener
    assert "setLibraryCardStop(card, true)" in listener
    # The arrow keys that move between the cards are the shared ones.
    assert '["#library-grid", ".library-card"]' in NAVIGATION


def test_the_all_view_sort_is_remembered_like_the_other_library_sorts():
    assert 'const LIBRARY_SORT_KEY = "library-sort";' in LIBRARY
    assert "localStorage.setItem(LIBRARY_SORT_KEY, event.target.value)" in LIBRARY
    assert "localStorage.getItem(LIBRARY_SORT_KEY)" in LIBRARY
    # Only a value the select offers is restored.
    assert "[...select.options].some((o) => o.value === stored)" in LIBRARY


def test_the_archive_and_drafts_empty_states_are_sentences_without_a_false_offer():
    # Measured on every chip at zero: "No archived yet." with a Create beside
    # it, offering to make something that would not appear there.
    assert '"archived", "shelved"].includes(libraryKind)' in LIBRARY
    says = LIBRARY[LIBRARY.index("const LIBRARY_EMPTY_SAYS = {") :][:400]
    assert 'shelved: "Nothing archived yet."' in says
    assert "LIBRARY_EMPTY_SAYS[libraryKind]" in LIBRARY
