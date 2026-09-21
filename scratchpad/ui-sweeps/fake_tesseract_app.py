"""The app with a **fake** optical reader, for driving the reading workspace.

Tesseract is a system binary and it is not in this sandbox (CLAUDE.md section
4: say so rather than implying a reading was seen). Without it every page of a
scanned PDF answers "nothing read yet", which is the one state in which the
reading panel's two page-linked behaviours (INBOX 314: the panel following the
page, and a section taking you to its page) cannot be measured at all.

So this serves the real app with `ocr.extract_regions` replaced by a function
that answers like Tesseract would: a heading and two paragraphs per page, at
plausible positions, different on every page so a sweep can tell page 4's
reading from page 1's. Nothing else is stubbed; the routes, the store and the
whole frontend are the real ones.

    setsid env PYTHONPATH=src:scratchpad/ui-sweeps MEMORYMAP_DATA_DIR=/tmp/mm-ocr \\
      .venv/bin/python -m uvicorn fake_tesseract_app:create_app --factory --port 8800

**Never used by the test suite, and it must not be.** It is a fake transport
for a binary, in the same spirit as `scratchpad/fake_openai_server.py`, and
what it proves is the plumbing either side of the reader, never what Tesseract
reads off a real scan.
"""

from __future__ import annotations

import re
from pathlib import Path

from memorymap.api.app import create_app as _create_app
from memorymap.core import ocr


def _fake_extract_regions(image_path: Path) -> dict | None:
    """Three blocks, positioned, naming the page they came from.

    `_pdf_regions_for` rasterises page N into a temporary file called
    `page-N.png`, so the page number is recoverable from the name; anything
    else (a plain image) is page 1 of itself.
    """
    match = re.search(r"page-(\d+)", Path(image_path).name)
    page = int(match.group(1)) + 1 if match else 1
    blocks = [
        ("heading", f"Chapter {page}: the {page}th section of a scanned report", 0.07, 0.9, 0.04),
        ("text", f"This page was rasterised, so page {page} has no text layer.", 0.14, 0.86, 0.05),
        ("text", f"Figure {page}.1 shows the measured call count per page view.", 0.22, 0.8, 0.05),
    ]
    return {
        "width": 850,
        "height": 1100,
        "regions": [
            {
                "index": index,
                "kind": kind,
                "text": text,
                "confidence": 90.0 - index,
                "box": {"x": 0.07, "y": top, "w": width, "h": height},
            }
            for index, (kind, text, top, width, height) in enumerate(blocks)
        ],
    }


def create_app():
    ocr.extract_regions = _fake_extract_regions
    ocr.tesseract_available = lambda: True
    return _create_app()
