"""Distinct values per property across the popup tiers, before and after.

    python3 popupcmp.py 1440 light            # reads /tmp/pop18/<w>-<theme>-{before,after}.json

A tier's property is "one value" when every surface in it that has the thing
measured agrees. Surfaces that are not part of a tier by design are left out
and named in popup-inventory.md: the welcome wizard (no head), the confirm
alert (no head, two buttons), the Ctrl+K palette (an input and a list), the
popovers and menus (anchored, no head, their own shell).
"""
import json
import sys
from collections import Counter

w, theme = sys.argv[1], sys.argv[2]
EXCLUDE = {"onboarding-overlay", "confirm-dialog", "palette-overlay", "chat-model-panel",
           "status-clock-detail", "help-popover", "graph-help-panel", "graph-options", "ocr-workspace"}
PROPS = ["radius", "padding", "border", "headH", "titleSize", "titleWeight", "closeKind", "closeW", "closeRight", "closeTop"]
# On a phone a sheet is full width and a panel docks to the edge, so the
# corner and inset rows are read inside their own geometry.
TIERS = {
    "dialog+sheet": lambda v: v.get("kind") in ("modal", "dialog", "sheet") and not v.get("card", "").startswith("div.card.modal-card.sheet-card.sheet-card-page"),
    "palette": lambda v: v.get("kind") == "palette",
    "panel": lambda v: v.get("kind") == "panel",
}


def load(tag):
    return json.load(open(f"/tmp/pop18/{w}-{theme}-{tag}.json"))


def distinct(d, tier, prop):
    c = Counter()
    for name, v in d.items():
        if name in EXCLUDE or "card" not in v or not TIERS[tier](v):
            continue
        if prop.startswith("close") and prop != "closeKind" and v.get("close") in (None, "none"):
            continue
        if prop in ("headH", "titleSize", "titleWeight") and "head" not in v:
            continue
        if prop == "closeKind" and v.get("close") in (None, "none"):
            c["no close"] += 1
            continue
        c[str(v.get(prop, ""))] += 1
    return c


before, after = load("before"), load("after")
print(f"{w} {theme}")
for tier in TIERS:
    print(f"  {tier}")
    for prop in PROPS:
        b, a = distinct(before, tier, prop), distinct(after, tier, prop)
        print(f"    {prop:12} before {len(b):2} {dict(b.most_common(4))}")
        print(f"    {'':12} after  {len(a):2} {dict(a.most_common(4))}")
