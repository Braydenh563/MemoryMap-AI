"""Sample the 20px chat head PNGs: eye vs skin contrast, hair vs ground, silhouette map."""
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


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


VB = (8, -2, 46)


def px(x, y, sc):
    k = 20 * sc / VB[2]
    return int((x - VB[0]) * k), int((y - VB[1]) * k)


for theme in ("light", "dark"):
    for sc in (1, 2):
        for look in ("masculine", "feminine"):

            img = read_png(f"{D}one-{look}-{theme}-{sc}.png")

            W, H, pix = img
            at = lambda x, y: pix[y][x][:3]  # noqa: E731
            el = at(*px(24.4, 26.6, sc))
            er = at(*px(37.6, 26.6, sc))
            skin = at(*px(31, 30.5, sc))
            ground = at(0, H - 1)
            hair = at(*px(50, 12, sc)) if look == "masculine" else at(*px(15.5, 30, sc))
            print(f"{theme} {sc}x {look}: eyeL/skin {ratio(el, skin):.2f} eyeR/skin {ratio(er, skin):.2f} "
                  f"hair {'#%02x%02x%02x' % hair} hair/ground {ratio(hair, ground):.2f} skin {'#%02x%02x%02x' % skin}")
            if sc == 2 and theme == "light":
                for y in range(0, H, 2):
                    print("".join(" " if ratio(at(x, y), ground) < 1.15 else ("#" if lum(at(x, y)) < 0.1 else "o") for x in range(0, W, 1)))
