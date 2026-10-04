"""A handler passed straight to addEventListener gets the event as its first
argument (INBOX 432).

`$("import-md").addEventListener("click", importMarkdown)` handed the click
event to `importMarkdown(inputId = "import-md-files")`, which looked up an
element by an Event and threw on `.files` of null: Settings' "Import .md
files" button did nothing. A function whose first parameter is not an event
is wrapped in an arrow at the listener instead.
"""

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


def test_no_listener_hands_its_event_to_a_non_event_parameter():
    sources = {p.name: p.read_text(encoding="utf-8") for p in FRONTEND.glob("*.js")}
    everything = "\n".join(sources.values())
    params = {
        m.group(1): m.group(2)
        for m in re.finditer(r"^(?:async )?function (\w+)\(([^)]*)\)", everything, re.M)
    }
    bad = []
    for name, source in sources.items():
        for m in re.finditer(r'addEventListener\(\s*"\w+"\s*,\s*(\w+)\s*[,)]', source):
            first = (params.get(m.group(1)) or "").split(",")[0].strip()
            if first and not re.match(r"(e|ev|event|evt)\b", first):
                line = source.count("\n", 0, m.start()) + 1
                bad.append(f"{name}:{line} {m.group(1)}({first})")
    assert not bad, f"wrap these in an arrow so the event is not passed as an argument: {bad}"
