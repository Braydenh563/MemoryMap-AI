"""Ink rows for inkalign.js: PNG at 3x, boxes in CSS px (argv: png, json)."""
import json
import sys

from PIL import Image

S = 3
img = Image.open(sys.argv[1]).convert("RGB")
items = json.loads(sys.argv[2])


def ink_rows(box, bg):
    """Per row, how many pixels in the box differ from the background."""
    x0, x1 = int(box["left"] * S) + 1, int(box["right"] * S) - 1
    y0, y1 = int(box["top"] * S), int(box["bottom"] * S)
    rows = []
    for y in range(y0, y1):
        n = 0
        for x in range(x0, x1):
            p = img.getpixel((x, y))
            if sum(abs(p[i] - bg[i]) for i in range(3)) > 120:
                n += 1
        rows.append((y, n))
    return rows


def centre(rows, band=False):
    hit = [(y, n) for y, n in rows if n]
    if not hit:
        return None
    if band:
        # The x-height band: rows at least half as inked as the densest row.
        peak = max(n for _, n in hit)
        hit = [(y, n) for y, n in hit if n >= peak * 0.5]
    return (hit[0][0] + hit[-1][0]) / 2 / S


for it in items:
    b = it["box"]
    bg = img.getpixel((int(b["left"] * S) + 2, int(b["top"] * S) + 2))
    t = centre(ink_rows(it["text"], bg), band=True) if it["text"] else None
    i = centre(ink_rows(it["icon"], bg)) if it["icon"] else None
    k = centre(ink_rows(it["kbd"], bg)) if it["kbd"] else None
    parts = [f"{it['name']:<24}"]
    if t is not None and i is not None:
        parts.append(f"icon dy={i - t:+.2f}")
    if t is not None and k is not None:
        parts.append(f"key dy={k - t:+.2f}")
    if t is not None:
        parts.append(f"x-centre={t:.2f}")
    print("  ".join(parts))
