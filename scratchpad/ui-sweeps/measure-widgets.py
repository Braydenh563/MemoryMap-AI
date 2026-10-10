"""measure-1010 item 3: each DASH_WIDGETS entry, its render function, and how many acting constructs it holds.
python scratchpad/ui-sweeps/measure-widgets.py   (static: reads frontend/js/dashboard.js plus the file defining each render fn)"""
import glob
import re
from pathlib import Path

src = {f: Path(f).read_text(encoding="utf-8").split("\n") for f in glob.glob("frontend/js/*.js")}
dash = "\n".join(src["frontend/js/dashboard.js"])
rows = re.findall(r'^\s+(?:"([\w-]+)"|(\w+)): \{ title: "(?:ph:[\w-]+ )?([^"]+)", description: "([^"]+)", render: (\w+)', dash, re.M)
ACT = re.compile(r'addEventListener|onclick|\.click\b|createElement\("(?:button|a)"\)|smallButton|openNote|openEntry|switchTab|goToTab|href\s*=|kebabMenu|\bbtn\b', re.I)
for a, b, title, desc, fn in rows:
    name = a or b
    where = None
    for f, lines in src.items():
        for i, line in enumerate(lines):
            if re.match(rf'(?:async )?function {fn}\(', line):
                j = i + 1
                while j < len(lines) and not lines[j].startswith("}"):
                    j += 1
                where = (f, i + 1, j - i + 1, sum(bool(ACT.search(x)) for x in lines[i:j]))
    print(f"{name}\t{title}\t{fn}\t{where}")
print(len(rows), "widgets")
