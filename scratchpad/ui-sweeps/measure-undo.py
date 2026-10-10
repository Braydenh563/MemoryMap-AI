"""measure-1010 item 6: every function with 'undo' in its name in frontend/js/*.js, and whether its body calls pushUndo.
python scratchpad/ui-sweeps/measure-undo.py"""
import glob
import re
from pathlib import Path

rows = []
for f in sorted(glob.glob("frontend/js/*.js")):
    lines = Path(f).read_text(encoding="utf-8").split("\n")
    for i, line in enumerate(lines):
        m = re.match(r"\s*(?:async\s+)?function\s+(\w*[Uu]ndo\w*)\s*\(", line) or re.match(r"\s*(?:const|let)\s+(\w*[Uu]ndo\w*)\s*=\s*(?:async\s*)?(?:\(|function)", line)
        if not m:
            continue
        ind = len(line) - len(line.lstrip())
        j = i + 1
        while j < len(lines) and not (lines[j].startswith(" " * ind + "}") and len(lines[j]) - len(lines[j].lstrip()) == ind):
            j += 1
        body = "\n".join(lines[i:j + 1])
        rows.append((f.split("/")[-1], i + 1, m.group(1), j - i + 1, "pushUndo" in body))
for r in rows:
    print("%-26s %5d %-34s %4d lines  calls pushUndo: %s" % r)
print(len(rows), "functions;", sum(r[4] for r in rows), "call pushUndo")
callers = {}
for f in sorted(glob.glob("frontend/js/*.js")):
    n = len(re.findall(r"\bpushUndo\(", Path(f).read_text(encoding="utf-8")))
    if n:
        callers[f.split("/")[-1]] = n
print("pushUndo( occurrences per file:", callers)
