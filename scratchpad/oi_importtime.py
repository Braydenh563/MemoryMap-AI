"""Top-level packages by cumulative import time, from `python -X importtime`.

    python scratchpad/oi_importtime.py /tmp/importtime.txt

Reads the stderr of `python -X importtime -c "..."` and prints each top-level
package's own cumulative time (the row where it was first imported), largest
first, so a heavy dependency pulled in at startup is one line to find.
"""

from __future__ import annotations

import sys
from pathlib import Path


def main(path: str) -> None:
    first: dict[str, int] = {}
    with Path(path).open(encoding="utf-8") as handle:
        for line in handle:
            if not line.startswith("import time:") or "|" not in line:
                continue
            parts = line.split("|")
            try:
                cumulative = int(parts[1].strip())
            except ValueError:
                continue
            name = parts[2].strip()
            top = name.split(".")[0]
            if name == top:
                first[top] = max(first.get(top, 0), cumulative)
    for name, micros in sorted(first.items(), key=lambda item: -item[1])[:40]:
        print(f"{micros / 1000:8.1f} ms  {name}")


if __name__ == "__main__":
    main(sys.argv[1])
