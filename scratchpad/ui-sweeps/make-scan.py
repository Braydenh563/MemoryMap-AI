"""Make a scanned multi-page PDF: text rasterised to pixels, no text layer.

INBOX 314 is a report about a scanned PDF, and nothing in this repository is
one: every PDF fixture here is a few objects of real text, which the reading
workspace can read without any optical reader at all. Hunting for a real scan
is slower than making one, so this renders some pages of text to images and
binds the images into a PDF. `/Font` never appears in the result, which is the
whole point: the only way to any words on it is a reader.

    .venv/bin/pip install --target /tmp/mm-ocr-libs pypdfium2 pillow
    PYTHONPATH=/tmp/mm-ocr-libs .venv/bin/python \\
        scratchpad/ui-sweeps/make-scan.py /tmp/mm-ocr-work/scanned-report.pdf

Pillow and pypdfium2 are this app's "PDF pages" optional extra, installed to a
directory of their own here rather than into the shared venv, so a sweep can
rasterise pages without changing what the test suite finds installed.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PAGES = 6
LINES = (
    "Chapter {n}: the {n}th section of a scanned report",
    "This page was rasterised, so a PDF text layer does not exist here.",
    "Only an optical reader can say what these words are.",
    "Figure {n}.1 shows the measured call count per page view.",
    "The quick brown fox jumps over the lazy dog, page {n}.",
)


def main(out: Path, pages: int = PAGES) -> None:
    font = ImageFont.load_default()
    images = []
    for number in range(1, pages + 1):
        page = Image.new("RGB", (850, 1100), "white")
        draw = ImageDraw.Draw(page)
        top = 80
        for line in LINES:
            draw.text((60, top), line.format(n=number), fill="black", font=font)
            top += 60
        draw.text((400, 1040), f"- {number} -", fill="black", font=font)
        images.append(page)
    out.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(out, "PDF", save_all=True, append_images=images[1:], resolution=100.0)
    print(f"wrote {out} ({pages} pages, text layer: {b'/Font' in out.read_bytes()})")


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mm-ocr-work/scanned-report.pdf")
    main(target, int(sys.argv[2]) if len(sys.argv) > 2 else PAGES)
