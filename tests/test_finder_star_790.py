"""INBOX 790: the Find anything star did nothing visible, and an active
favourite was an outline.

The star opens "Name this search" through `promptDialog`, a `.confirm-overlay`
at z-index 1040, while the finder overlay is 2000: the prompt opened behind
the finder and the press only seemed to darken the page. A confirm now sits
above the finder and the command palette, and an active favourite draws a
filled star (the vendored Phosphor is the regular weight only, so the fill is
`.star-fill`, a clipped box in the glyph's colour)."""

import re
from pathlib import Path

from tests._css_paths import CSS_FILES

ROOT = Path(__file__).resolve().parents[1]
CSS = "\n".join(p.read_text(encoding="utf-8") for p in CSS_FILES)
SEARCH = (ROOT / "frontend" / "js" / "search.js").read_text(encoding="utf-8")


def _z(selector: str) -> int:
    m = re.search(re.escape(selector) + r" \{[^}]*?z-index: (\d+)", CSS)
    assert m, selector
    return int(m.group(1))


def test_a_prompt_opened_from_the_finder_sits_above_it():
    assert _z(".modal-overlay.confirm-overlay") > _z(".command-palette-overlay,\n.finder-overlay")


def test_an_active_favourite_is_a_filled_star():
    rule = re.search(r"\.is-favourite > \.ph-star::before,[^{]*\.ph-star\.star-fill::before \{([^}]*)\}", CSS)
    assert rule, "the filled star rule"
    body = rule.group(1)
    assert "clip-path: polygon(" in body and "background: currentColor" in body


def test_the_finder_star_toggles_and_shows_its_state():
    assert 'function syncFinderStar' in SEARCH
    assert '"star-fill"' in SEARCH and 'aria-pressed' in SEARCH
    save = SEARCH[SEARCH.index("async function saveFinderSearch") :][:900]
    assert "finderSavedAs(query)" in save and "Removed the saved search" in save
