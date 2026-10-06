"""docs/MODELS.md quotes the same sizes the app's catalogue shows.

The catalogue (`SUGGESTED_MODELS` in `ai/model_manager.py`) is the source the
app displays; the doc once said `qwen3.5:35b-a3b` was 24 GB and needed ~32 GB
while the app said about 21 GB and 24 GB. A row of MODELS.md that names a
catalogue tag must carry that tag's download size, and its "Needs ~N GB" when
the catalogue states one (`ram_gb`). Fix the doc, not the test: the app's
number is the one people see.
"""
import re
from pathlib import Path

from memorymap.ai.model_manager import SUGGESTED_MODELS

DOC = Path(__file__).resolve().parents[1] / "docs" / "MODELS.md"
ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*(~?[\d.]+\s*[GM]B)\s*\|(.*)\|\s*$")


def _catalogue():
    return {m["name"]: m for group in SUGGESTED_MODELS.values() for m in group}


def _norm(size: str) -> str:
    return size.replace("~", "").replace(" ", "").upper()


def _rows():
    for number, line in enumerate(DOC.read_text(encoding="utf-8").splitlines(), 1):
        match = ROW.match(line)
        if match:
            yield number, match.group(1), match.group(2), match.group(3)


def test_the_doc_names_catalogue_models():
    names = _catalogue()
    assert sum(1 for _, tag, _, _ in _rows() if tag in names) >= 12


def test_every_catalogue_model_in_the_doc_has_the_catalogues_size():
    names = _catalogue()
    wrong = [
        f"MODELS.md:{n} {tag}: doc {size}, app {names[tag]['size']}"
        for n, tag, size, _ in _rows()
        if tag in names and _norm(size) != _norm(names[tag]["size"])
    ]
    assert not wrong, "\n".join(wrong)


def test_a_stated_memory_need_matches_the_catalogue():
    names = _catalogue()
    wrong = []
    for n, tag, _, purpose in _rows():
        need = re.search(r"[Nn]eeds ~?(\d+) GB", purpose)
        if tag in names and need and names[tag].get("ram_gb") is not None:
            if int(need.group(1)) != names[tag]["ram_gb"]:
                wrong.append(f"MODELS.md:{n} {tag}: doc needs {need.group(1)} GB, app {names[tag]['ram_gb']} GB")
    assert not wrong, "\n".join(wrong)


def test_the_largest_moe_row_says_what_the_app_says():
    row = next(r for r in _rows() if r[1] == "qwen3.5:35b-a3b")
    assert _norm(row[2]) == "21GB" and "Needs ~24 GB" in row[3]
