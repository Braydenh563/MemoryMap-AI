"""Shrink README screenshots to under a byte budget (default 400 KB).

    python scratchpad/ui-sweeps/pngshrink.py docs/screenshots/*.png
    BUDGET=400000 python scratchpad/ui-sweeps/pngshrink.py a.png b.png

Three steps, each taken only while a file is still over the budget, so a
picture that fits is only ever losslessly recompressed:

1. lossless: PIL's `optimize` pass at the highest zlib level;
2. 256 colours with Floyd-Steinberg dithering, which a UI capture of flat
   surfaces takes with no visible change (the gradients dither rather than
   band);
3. scaled down by 10% at a time, for a picture whose detail is the size
   (the graph's field of nodes), never below 60%.

Prints each file's size before and after and what it took.
"""

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

from PIL import Image

BUDGET = int(os.environ.get("BUDGET", "400000"))


def encode(image: Image.Image) -> bytes:
    out = io.BytesIO()
    image.save(out, format="PNG", optimize=True, compress_level=9)
    return out.getvalue()


def quantised(image: Image.Image) -> Image.Image:
    if image.mode == "RGBA":
        return image.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    return image.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)


def shrink(path: Path) -> str:
    before = path.stat().st_size
    with Image.open(path) as opened:
        image = opened.copy()
    steps = ["lossless"]
    data = encode(image)
    if len(data) > BUDGET:
        steps.append("256 colours")
        base = quantised(image)
        data = encode(base)
        scale = 1.0
        while len(data) > BUDGET and scale > 0.6:
            scale = round(scale - 0.1, 2)
            size = (round(image.width * scale), round(image.height * scale))
            data = encode(quantised(image.resize(size, Image.Resampling.LANCZOS)))
        if scale < 1.0:
            steps.append(f"scaled to {int(scale * 100)}%")
    if len(data) < before:
        path.write_bytes(data)
    after = path.stat().st_size
    return f"{path.name}: {before:,} -> {after:,} ({', '.join(steps)})"


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        print(shrink(Path(arg)))
