"""Place an open INBOX item in the plan it belongs to.

    python scratchpad/inbox_place.py 164 UI_MODERNISATION_PLAN.md

The companion to inbox_resolve.py, for the other half of standing order 2: a
triaged item that is not fixed now is "placed in its plan's 'Placed from
INBOX' section". The numbered item (from its "N. **" line to the next item or
section) is cut from docs/roadmap/INBOX.md and appended, number kept, under a
"## Placed from INBOX, <today>" section at the end of the named plan (created
if the plan has none for today), and INBOX's "Placed" list gets a one-line
pointer so the tray still says where the item went. The tray lint
(`tests/test_plan_hygiene.py`) counts "N. **" items in INBOX, which is why the
copy in the plan is the item and the line left behind is not.
"""

from __future__ import annotations

import datetime
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROADMAP = ROOT / "docs" / "roadmap"
INBOX = ROADMAP / "INBOX.md"


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    plan = ROADMAP / argv[-1]
    if not plan.exists():
        print(f"no such plan: {plan.name}")
        return 1
    wanted = {int(n) for n in argv[:-1]}
    text = INBOX.read_text(encoding="utf-8")
    parts = re.split(r"(?m)^(?=\d+\. \*\*)", text)
    kept, moved, numbers = [parts[0]], [], []
    for part in parts[1:]:
        match = re.match(r"^(\d+)\. \*\*", part)
        number = int(match.group(1)) if match else -1
        tail = ""
        section = re.search(r"(?m)^## ", part)
        if section:
            tail = part[section.start():]
            part = part[: section.start()]
        if number in wanted:
            moved.append(part.rstrip("\n") + "\n")
            numbers.append(number)
            if tail:
                kept.append(tail)
        else:
            kept.append(part + tail)
    if not moved:
        print("nothing placed: numbers not found")
        return 1
    today = datetime.date.today().isoformat()
    inbox = "".join(kept)
    pointer = f"- {today}: {', '.join(str(n) for n in numbers)} placed in {plan.name}.\n"
    marker = "## Placed (last 20, newest first)\n"
    if marker in inbox:
        head, rest = inbox.split(marker, 1)
        inbox = head + marker + "\n" + pointer + rest.lstrip("\n")
    else:
        inbox = inbox.rstrip("\n") + "\n\n" + marker + "\n" + pointer
    INBOX.write_text(inbox, encoding="utf-8")
    body = plan.read_text(encoding="utf-8").rstrip("\n")
    heading = f"\n## Placed from INBOX, {today}\n"
    block = "".join(moved)
    if heading in body:
        body = body.rstrip("\n") + "\n\n" + block
    else:
        body += "\n" + heading + "\n" + block
    plan.write_text(body + "\n", encoding="utf-8")
    print(f"placed {len(moved)} item(s) in {plan.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
