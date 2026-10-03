"""The Attach picker, before and after, from pickerinv.js's JSON in /tmp/pop18."""
import json

CONFIGS = [("1440", "light"), ("1440", "dark"), ("390", "light"), ("390", "dark")]


def get(d, *path):
    for p in path:
        d = d.get(p, {}) if isinstance(d, dict) else {}
    return d if d != {} else ""


ROWS = [
    ("shell", ("shell",)), ("radius", ("radius",)), ("padding", ("padding",)), ("box", ("width",)),
    ("head h", ("headH",)), ("title", ("title",)), ("close", ("close",)),
    ("row height", ("row", "h")), ("row padding", ("row", "pad")), ("row gap", ("row", "gap")),
    ("checkbox", ("row", "box")), ("name", ("row", "title")), ("second line", ("row", "meta")),
    ("filled chip", ("row", "chip")), ("foot justify", ("foot", "justify")),
    ("foot count font", ("foot", "countFont")),
]
out = []
for w, theme in CONFIGS:
    b = json.load(open(f"/tmp/pop18/picker-{w}-{theme}-before.json"))
    a = json.load(open(f"/tmp/pop18/picker-{w}-{theme}-after.json"))
    out.append(f"\n### {w}px, {theme}\n")
    out.append("| property | before | after |\n| --- | --- | --- |")
    for name, path in ROWS:
        out.append(f"| {name} | {get(b, *path)} | {get(a, *path)} |")
    bb = ", ".join(f"{x['id'].replace('note-picker-', '')} {x['cls']} {x['h']}px" for x in b["foot"]["btns"])
    ab = ", ".join(f"{x['id'].replace('note-picker-', '')} {x['cls']} {x['h']}px" for x in a["foot"]["btns"])
    out.append(f"| foot buttons | {bb} | {ab} |")
print("\n".join(out))
