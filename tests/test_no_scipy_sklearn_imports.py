"""The app's own code never imports scipy or sklearn (WORLD_CLASS_PLAN 19.1, direction 3).

Vectors are stored as raw float32 and compared with numpy (`ai/embeddings.py`),
so the scientific stack that sentence-transformers drags in (436 shared
objects from scipy, 117 from sklearn on a warm instance) is reachable only
through that optional package. A direct import here would make it load for
every launch; this holds the line.
"""

from __future__ import annotations

import re
from pathlib import Path

from tests._repo_files import repo_files

SRC = Path(__file__).resolve().parents[1] / "src" / "tessellate"
_IMPORT = re.compile(r"^\s*(?:import|from)\s+(?:scipy|sklearn)\b", re.M)


def test_no_module_imports_scipy_or_sklearn():
    offenders = [
        p.relative_to(SRC).as_posix()
        for p in repo_files(SRC, suffixes=(".py",))
        if _IMPORT.search(p.read_text(encoding="utf-8", errors="ignore"))
    ]
    assert not offenders, f"import of scipy or sklearn in: {offenders}"
