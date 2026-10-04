"""Print popupinv.js's JSON as a table of chosen columns.

    python3 popuptab.py /tmp/pop.json radius,padding,border
"""
import json
import sys

with open(sys.argv[1]) as fh:
    d = json.load(fh)
cols = sys.argv[2].split(",")
print("name".ljust(28), *[c[:16].ljust(17) for c in cols])
for k, v in d.items():
    if "card" not in v:
        print(k.ljust(28), "--", v)
        continue
    print(k[:27].ljust(28), *[str(v.get(c, ""))[:16].ljust(17) for c in cols])
