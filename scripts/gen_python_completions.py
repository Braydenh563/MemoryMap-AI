"""Write frontend/vendor/python-stdlib/stdlib.json: the standard library's public
names, signatures and first doc lines, for a Python document's completions
after `module.` and its hover card (DOCUMENTS D9, OPEN row 1070).

Read from this interpreter's `inspect`, not Pyodide's: the standard library
is the same CPython modules in both, and the generator then needs no
browser. Run it with the Python the app ships with; the table is a file in
the repository, so a run on another version is a reviewed diff, not a
silent change. Modules Pyodide leaves out (no threads, no sockets, no
subprocesses) are not listed.

    python scripts/gen_python_completions.py
"""

from __future__ import annotations

import importlib
import inspect
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "frontend" / "vendor" / "python-stdlib" / "stdlib.json"

MODULES = (
    "abc", "argparse", "array", "base64", "bisect", "calendar", "cmath", "collections",
    "contextlib", "copy", "csv", "dataclasses", "datetime", "decimal", "difflib", "enum",
    "fnmatch", "fractions", "functools", "glob", "hashlib", "heapq", "html", "io",
    "itertools", "json", "logging", "math", "operator", "os", "os.path", "pathlib",
    "pprint", "random", "re", "secrets", "shutil", "statistics", "string", "struct",
    "sys", "tempfile", "textwrap", "time", "typing", "unicodedata", "urllib.parse", "uuid",
    "zoneinfo",
)

#: Enough for a completion row and a hover card, small enough to fetch once.
DOC_CHARS = 120
NAMES_PER_MODULE = 160


def _kind(value: object) -> str:
    if inspect.ismodule(value):
        return "namespace"
    if inspect.isclass(value):
        return "class"
    if callable(value):
        return "function"
    return "constant"


def _signature(name: str, value: object) -> str:
    if not callable(value) or inspect.ismodule(value):
        return ""
    try:
        return f"{name}{inspect.signature(value)}"
    except (TypeError, ValueError):
        text = getattr(value, "__text_signature__", None)
        return f"{name}{text.replace('$module, ', '').replace('$module', '')}" if text else ""


def _doc(value: object) -> str:
    if not (callable(value) or inspect.ismodule(value)):
        return ""
    doc = inspect.getdoc(value) or ""
    first = doc.strip().split("\n\n", 1)[0].replace("\n", " ").strip()
    return first if len(first) <= DOC_CHARS else first[: DOC_CHARS - 1].rstrip() + "…"


def build() -> dict:
    table: dict[str, list[list[str]]] = {}
    for module_name in MODULES:
        module = importlib.import_module(module_name)
        names = getattr(module, "__all__", None) or [n for n in dir(module) if not n.startswith("_")]
        rows = []
        for name in sorted(set(names)):
            if name.startswith("_") or not hasattr(module, name):
                continue
            value = getattr(module, name)
            rows.append([name, _kind(value), _signature(name, value), _doc(value)])
        table[module_name] = rows[:NAMES_PER_MODULE]
    return {"python": f"{sys.version_info.major}.{sys.version_info.minor}", "modules": table}


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(build(), ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(OUT.parents[3])}")


if __name__ == "__main__":
    main()
