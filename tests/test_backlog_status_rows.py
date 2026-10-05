"""Status lines in BACKLOG.md that name code must agree with the code.

A row that reads "Next:" while its feature is on the page sends the next
session to rebuild it (CLAUDE.md section 1: three sessions have). Each test
here pins one such row to the evidence that closed it, so the row cannot
drift back to "Next" and the evidence cannot be deleted while the row says
"Built".
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _row(number: int) -> str:
    """The text of one numbered table row in BACKLOG 115's refinement table."""
    text = (ROOT / "docs" / "roadmap" / "BACKLOG.md").read_text(encoding="utf-8")
    match = re.search(rf"^\| {number} \| (.*)$", text.split("\n| # | Refinement", 1)[1], re.M)
    assert match, f"BACKLOG 115 row {number} not found"
    return match.group(1)


def test_saved_searches_row_is_marked_built_with_its_evidence():
    row = _row(8)
    assert not row.startswith("**Next:**"), "saved searches are built; the row still says Next"
    assert "Built" in row.split("|")[0]
    # The evidence the row cites must still exist in the frontend.
    wiring = (ROOT / "frontend" / "js" / "settings-wiring.js").read_text(encoding="utf-8")
    for name in re.findall(r"`(renderSavedSearches|persistSavedSearches|saveCurrentSearch)`", row):
        assert f"function {name}(" in wiring
    assert "settings-wiring.js" in row
    assert 'id="saved-searches"' in (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")


#: Names the textarea-era document editor owned, none of which exist in the
#: frontend any more. A sweep that reads one throws inside the page and
#: reports nothing (the editor.js sweep did, for weeks, until it was
#: re-pointed at `docSurface()` on 2026-10-05).
_RETIRED_EDITOR_NAMES = (
    "docUndoStack",
    "docUndoReset",
    "DOC_UNDO_LIMIT",
    "focusDocLiveBlock",
    "#doc-live .lp-src",
)


def test_no_sweep_reads_the_retired_textarea_editor():
    js = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / "frontend" / "js").glob("*.js")
    )
    revived = {name for name in _RETIRED_EDITOR_NAMES if name in js}
    assert not revived, f"the frontend defines {revived} again; retire the list or the names"
    offenders = []
    for sweep in sorted((ROOT / "scratchpad" / "ui-sweeps").glob("*.js")):
        code = "\n".join(
            line
            for line in sweep.read_text(encoding="utf-8").splitlines()
            if not line.lstrip().startswith("//")
        )
        hits = [name for name in _RETIRED_EDITOR_NAMES if name in code]
        if hits:
            offenders.append(f"{sweep.name}: {hits}")
    assert not offenders, "sweeps reading retired editor names: " + "; ".join(offenders)
