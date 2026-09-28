"""The README's light/dark split, from two shots of the same notebook.

Take both with readmeshots.js (ONLY=dashboard, THEME=light and THEME=dark,
same BASE, back to back), then:

    .venv/bin/python scratchpad/ui-sweeps/themesplit.py LIGHT.png DARK.png OUT.png

The left half is the light shot and the right half the dark one, with a
2px rule between them. Both halves must come from one run: two shots taken
at different times drew a different dashboard on each side (the owner at
release: "there's a mismatch in this split comparison image").
"""
import sys

from PIL import Image, ImageDraw

light, dark, out = sys.argv[1:4]
with Image.open(light) as a, Image.open(dark) as b:
    if a.size != b.size:
        sys.exit(f"sizes differ: {a.size} vs {b.size}")
    w, h = a.size
    mid = w // 2
    img = a.convert("RGB")
    img.paste(b.convert("RGB").crop((mid, 0, w, h)), (mid, 0))
    ImageDraw.Draw(img).rectangle((mid - 1, 0, mid, h), fill=(140, 150, 255))
    img.save(out, optimize=True)
print(out)
