"""Tabulate timelinetune.js output: python timelinetune-sum.py /tmp/tl-*.jsonl"""

import json
import sys

for f in sys.argv[1:]:
    print("==", f)
    for line in open(f):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if "scale" not in d:
            print("  first", {k: v for k, v in d.items() if k.startswith("first")})
            continue
        print(
            f"  d{d['days']:>3} {d['scale']:5} rows{d['rows']:3} hdr{d['headers']:3} "
            f"chrome{d['chrome']:5} single{d['single']:5} gap{d['gap']:5} act{d['activeDays']:4} "
            f"items{d['itemsInRange']:5} bk{d['buckets']:4} dens{d['densest']:4} "
            f"hs{int(d['hscroll'])} minT{d['minTitle']} ms{d['ms']}"
        )
