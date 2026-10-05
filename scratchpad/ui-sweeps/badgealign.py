"""Ink measures for badgealign.js (argv: png, json of items; PNG at 3x, boxes in CSS px).

Per badge: the icon's ink centre against its words' cap-height centre (dy,
positive = icon low), the ink gap between icon and words, and the ink gap at
each end (padL, padR) so padding symmetry is read from what is painted, not
from the box. The background is the most common colour inside the badge.
"""
import json
import sys
from collections import Counter

from PIL import Image

S = float(__import__("os").environ.get("SCALE", "3"))
img = Image.open(sys.argv[1]).convert("RGB")
W, H = img.size
with open(sys.argv[2], encoding="utf-8") as fh:
    items = json.load(fh)


def px(x, y):
    return img.getpixel((min(max(x, 0), W - 1), min(max(y, 0), H - 1)))


def background(box):
    c = Counter()
    x0, x1 = int(box["left"] * S), int(box["right"] * S)
    y0, y1 = int(box["top"] * S), int(box["bottom"] * S)
    for y in range(y0 + 2, y1 - 2, 2):
        for x in range(x0 + 2, x1 - 2, 2):
            c[px(x, y)] += 1
    return c.most_common(1)[0][0] if c else (255, 255, 255)


def inked(p, bg):
    return sum(abs(p[i] - bg[i]) for i in range(3)) > 90


def ink(box, bg, within, pad=3):
    """Rows and columns inked inside box, clipped to the badge's inner area."""
    x0, x1 = int(max(box["left"], within["left"] + 1) * S), int(min(box["right"], within["right"] - 1) * S)
    y0, y1 = int(max(box["top"] - pad, within["top"] + 1) * S), int(min(box["bottom"] + pad, within["bottom"] - 1) * S)
    rows, cols = {}, {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            if inked(px(x, y), bg):
                rows[y] = rows.get(y, 0) + 1
                cols[x] = cols.get(x, 0) + 1
    return rows, cols


def vcentre(rows, band):
    if not rows:
        return None
    ys = sorted(rows)
    if band:
        peak = max(rows.values())
        ys = [y for y in ys if rows[y] >= peak * 0.5]
    return (ys[0] + ys[-1] + 1) / 2 / S


def capcentre(rows, cap):
    """Centre of the capitals, the label recipe's target (DESIGN.md, INBOX
    592): the dense band's bottom is the baseline (a descender or a cap
    changes the band's top, never its bottom), and the font's own cap height
    (`H`'s ascent) says how far up the capitals reach."""
    if not rows:
        return None
    peak = max(rows.values())
    ys = [y for y in sorted(rows) if rows[y] >= peak * 0.5]
    return (ys[-1] + 1) / S - cap / 2


out = []
for it in items:
    b = it["box"]
    bg = background(b)
    r = {"id": it["id"]}
    ir = ic = tr = tc = None
    if it["text"] is None:
        # An icon in a circle: ink centre against the circle as PAINTED. The
        # rect lies here (the circle's edges and the glyph snap to whole
        # pixels on their own), so the ring is found in the pixels, on a
        # column 4px off the centre line to miss the rail's hairline.
        # Only the glyph's own box (+1px): a circle's ring curves into a taller
        # box and its antialiased pixels read as ink.
        ir, ic = ink(it["icon"], bg, b, pad=1)
        if ir and ic:
            cx_css = (b["left"] + b["right"]) / 2
            x = int((cx_css + 4) * S)
            col = [px(x, y) for y in range(int((b["top"] - 3) * S), int((b["bottom"] + 3) * S))]
            y0 = int((b["top"] - 3) * S)
            # The surround is the colour well outside the circle on the column.
            outside = col[0]
            diffs = [y0 + i for i, p in enumerate(col) if sum(abs(p[k] - outside[k]) for k in range(3)) > 14]
            # Rail hairline above and below is on x=centre only, so any row
            # differing here belongs to the circle: its first and last.
            if diffs:
                ring_c = (diffs[0] + diffs[-1] + 1) / 2 / S
                r["ringh"] = round((diffs[-1] - diffs[0] + 1) / S, 2)
            else:
                ring_c = (b["top"] + b["bottom"]) / 2
            cy = (min(ir) + max(ir) + 1) / 2 / S
            cx = (min(ic) + max(ic) + 1) / 2 / S
            r["mdx"] = round(cx - cx_css, 2)
            r["mdy"] = round(cy - ring_c, 2)
            r["mdyr"] = round(cy - (b["top"] + b["bottom"]) / 2, 2)
        out.append(r)
        continue
    if it["icon"]:
        ir, ic = ink(it["icon"], bg, b)
    if it["text"]:
        tr, tc = ink(it["text"], bg, b)
    bc = (b["top"] + b["bottom"]) / 2
    if ir:
        r["ic"] = round(vcentre(ir, False) - bc, 2)
    if tr:
        r["tc"] = round(capcentre(tr, it["cap"]) - bc, 2)
        r["tb"] = round(vcentre(tr, False) - bc, 2)
    if ir and tr:
        r["dy"] = round(vcentre(ir, False) - capcentre(tr, it["cap"]), 2)
    allc = {}
    for c in (ic, tc):
        if c:
            allc.update(c)
    for box2 in it.get("extra") or []:
        _, c2 = ink(box2, bg, b)
        allc.update(c2)
    if allc:
        lo, hi = min(allc) / S, (max(allc) + 1) / S
        r["padL"] = round(lo - b["left"], 2)
        r["padR"] = round(b["right"] - hi, 2)
    if ic and tc:
        a_hi, t_lo = (max(ic) + 1) / S, min(tc) / S
        t_hi, a_lo = (max(tc) + 1) / S, min(ic) / S
        r["inkgap"] = round(t_lo - a_hi, 2) if a_hi <= t_lo + 0.01 else round(a_lo - t_hi, 2)
    out.append(r)
print(json.dumps(out))
