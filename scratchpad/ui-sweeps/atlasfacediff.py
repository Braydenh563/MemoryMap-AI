"""Count Atlas's distinct faces per size from atlasfacediff.js's cells.

Two moods are the same face when fewer than 2% of the cell's pixels differ
by more than DIFF in any of R, G and B (default 48; a gold sign on white moves blue, not the mean); FRAC (default 0.02) sets the share. The count is the number of groups left
after joining every such pair. Usage: python3 atlasfacediff.py DIR
"""
import itertools
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from pngpixel import read_png  # noqa: E402

root = sys.argv[1]
DIFF = float(os.environ.get("DIFF", 48))
FRAC = float(os.environ.get("FRAC", 0.02))
cells = {}
for name in sorted(os.listdir(root)):
    if name.endswith(".png"):
        theme, look, size, mood = name[:-4].split("-")
        cells.setdefault((theme, look, int(size)), {})[mood] = read_png(os.path.join(root, name))
for key in sorted(cells, key=lambda k: (k[0], k[1], -k[2])):
    faces = cells[key]
    moods = list(faces)
    parent = {m: m for m in moods}

    def find(m):
        while parent[m] != m:
            m = parent[m]
        return m

    same = []
    for a, b in itertools.combinations(moods, 2):
        wa, ha, ra = faces[a]
        wb, hb, rb = faces[b]
        w, h = min(wa, wb), min(ha, hb)
        n = sum(
            1 for y in range(h) for x in range(w)
            if max(abs(ra[y][x][c] - rb[y][x][c]) for c in range(3)) > DIFF
        )
        if n < FRAC * w * h:
            parent[find(a)] = find(b)
            same.append(f"{a}={b}({n})")
    groups = len({find(m) for m in moods})
    print(f"{key[0]} {key[1]} {key[2]}px: {groups} of {len(moods)} distinct", " ".join(same[:12]))
