import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pngpixel import read_png  # noqa: E402

D = os.path.join(os.environ.get("SCRATCH", "."), "shots") + "/"


def lum(p):
    def c(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * c(p[0]) + 0.7152 * c(p[1]) + 0.0722 * c(p[2])


for theme in ("light", "dark"):
    for w in (1440, 390):
        W, H, pix = read_png(f"{D}st-{theme}-{w}.png")
        size = (W - 16) // 2  # css px of the button
        bg = pix[8 + 4 * 2][W // 2][:3]
        cx = W // 2
        box = [pix[y][x][:3] for y in range(cx - 14, cx + 14) for x in range(cx - 14, cx + 14)]
        lb = lum(bg)
        ink = max(box, key=lambda p: abs(lum(p) - lb))
        li = lum(ink)
        r = (max(li, lb) + 0.05) / (min(li, lb) + 0.05)
        print(f"{theme} {w}: button {size}px, ground #{'%02x%02x%02x' % bg}, glyph ink #{'%02x%02x%02x' % ink}, contrast {r:.2f}:1")
