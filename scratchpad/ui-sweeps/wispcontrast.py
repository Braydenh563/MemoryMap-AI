"""How much the astral wisps stand out: the pixels that change when the wisps
layer is hidden, their colour against what is behind them (atlaswisps.js).

    python3 wispcontrast.py WITH.png WITHOUT.png "rgb(r, g, b)"

Prints JSON: how many pixels the wisps paint, the median and 90th-percentile
contrast ratio of a wisp pixel against the same pixel without the wisps, and
the same over the page alone (pixels whose backdrop is the page colour).
"""

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from pngpixel import read_png  # noqa: E402


def lum(rgb):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = rgb[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main(with_path, without_path, page):
    _, _, a = read_png(with_path)
    _, _, b = read_png(without_path)
    #: "corner": the page colour is the backdrop's own top-left pixel.
    page_rgb = b[0][0][:3] if page == "corner" else tuple(int(v) for v in re.findall(r"\d+", page)[:3])
    every, over_page = [], []
    for row_a, row_b in zip(a, b):
        for pa, pb in zip(row_a, row_b):
            if sum(abs(x - y) for x, y in zip(pa[:3], pb[:3])) < 6:
                continue
            c = ratio(pa, pb)
            every.append(c)
            if sum(abs(x - y) for x, y in zip(pb[:3], page_rgb)) < 12:
                over_page.append(c)

    def stats(values):
        if not values:
            return None
        values = sorted(values)
        return {
            "px": len(values),
            "median": round(values[len(values) // 2], 2),
            "p90": round(values[int(len(values) * 0.9)], 2),
        }

    print(json.dumps({"all": stats(every), "over_page": stats(over_page)}))


if __name__ == "__main__":
    main(*sys.argv[1:4])
