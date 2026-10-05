"""The merge gate's lint set names the lints no changed file selects.

`scripts/gate.sh --staged` runs only the `LINTS` list against the index, so a
lint that reads the Guide, the markup and the frontend all at once has to be
named there: no diff ever selects it by file name. A help edit once put the
Guide's whiteboard keys entry at 1,926 characters against its 1,920 budget and
passed the gate, because `tests/test_help_controls.py` was not in the list.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _lints() -> str:
    text = (ROOT / "scripts" / "gate.sh").read_text(encoding="utf-8")
    start = text.index("LINTS=(")
    return text[start : text.index("step lints", start)]


def test_the_lints_that_no_changed_file_selects_are_in_the_gate():
    lints = _lints()
    for name in ("test_help_controls.py", "test_like_escaping.py", "test_scratchpad_size.py", "test_codeql_shapes.py"):
        assert f"tests/{name}" in lints, f"scripts/gate.sh LINTS does not run {name}"
        assert (ROOT / "tests" / name).is_file()
