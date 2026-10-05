"""The calls between library.js and the editors it is bundled with (audit FE-03(c)).

    python3 scratchpad/perf2-1005-libsplit.py

Prints, both ways, which top-level functions of one side the other calls, and
which boot files call into the editors: what a split of the `library` bundle
into `library.js` and the editors would have to put behind stand-ins.
"""

import re
from pathlib import Path

JS = Path(__file__).resolve().parent.parent / "frontend" / "js"
EDITORS = ["undo-store.js", "documents-code.js", "documents-prose.js", "documents.js", "whiteboard-map.js", "whiteboard.js"]
DEF = re.compile(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", re.M)


def defs(name: str) -> set[str]:
    return set(DEF.findall((JS / name).read_text(encoding="utf-8")))


def calls(text: str, names: set[str]) -> list[str]:
    code = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("//"))
    return sorted(n for n in names if re.search(r"(?<![\w$.])" + re.escape(n) + r"\s*\(", code))


editor_defs = set().union(*(defs(n) for n in EDITORS))
library_defs = defs("library.js")
print("library.js -> editors:", calls((JS / "library.js").read_text(encoding="utf-8"), editor_defs))
for name in EDITORS:
    print(f"{name} -> library.js:", calls((JS / name).read_text(encoding="utf-8"), library_defs))

#: Top-level bindings (not functions) of the editors that library.js names:
#: a split would read them before they exist.
BINDING = re.compile(r"^(?:const|let|var)\s+([A-Za-z_$][\w$]*)", re.M)
bindings = {}
for name in EDITORS:
    for found in BINDING.findall((JS / name).read_text(encoding="utf-8")):
        bindings[found] = name
library_code = "\n".join(
    line for line in (JS / "library.js").read_text(encoding="utf-8").splitlines() if not line.lstrip().startswith("//")
)
named = sorted(b for b in bindings if re.search(r"(?<![\w$.])" + re.escape(b) + r"(?![\w$])", library_code))
print("library.js names editor bindings:", [(b, bindings[b]) for b in named])

#: Editor functions library.js names without calling them (a listener passed
#: by reference is read when the listener is added).
named_refs = sorted(
    n for n in editor_defs
    if re.search(r"(?<![\w$.])" + re.escape(n) + r"(?![\w$(])", library_code)
)
print("library.js references editor functions:", named_refs)
