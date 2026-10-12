"""Every test module collects on its own (audit 2026-10-10, item 9).

`tests/` is a package, so a helper next to the tests (`_app_js`, `_composer_eval`)
is importable as `tests._app_js` and not as `_app_js`. Six modules wrote the
bare form; in a full run something earlier happened to put `tests/` on
`sys.path` and they passed, but run alone (`gate.sh --changed`, an agent's
targeted run) each died at collection with "No module named '_app_js'".
"""

from __future__ import annotations

import re
from pathlib import Path

TESTS = Path(__file__).resolve().parent


def test_no_module_imports_a_test_helper_by_its_bare_name():
    helpers = sorted(p.stem for p in TESTS.glob("_*.py") if p.stem != "__init__")
    assert helpers, "tests/ has no underscore helpers left; delete this test"
    bare = re.compile(r"^(?:from|import)\s+(" + "|".join(map(re.escape, helpers)) + r")\b", re.M)
    offenders = [
        f"{path.name}: {match.group(0).strip()}"
        for path in sorted(TESTS.glob("test_*.py"))
        for match in bare.finditer(path.read_text(encoding="utf-8"))
    ]
    assert offenders == [], "import these as tests.<helper>: " + "; ".join(offenders)
