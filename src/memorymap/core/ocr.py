"""Local OCR text extraction for uploaded images (ROADMAP.md item 30d).

A whiteboard photo or a scanned page attached via `POST /media/upload`
attaches today as an opaque file nothing reads — "what was on that
whiteboard photo from March" is unanswerable by search. This reads the
image once, in the background, and stores what it found on
`MediaUpload.ocr_text`, so the Library's Image Gallery search (client-side,
same as the rest of the Library's own search box) can find it.

`pytesseract`/Pillow (the thin Python wrapper this module imports) are
listed as the "ocr" entry in `core/extras.py`'s installable-extras
registry — pip installable, so `_run_install` handles that half exactly
like every other extra. The `tesseract` **system binary** itself is a
different problem: no PyPI wheel ships it, so `pip install` alone can
never make it appear. `attempt_binary_install` below (asked for directly:
"automate it if possible") tries the platform's own package manager
non-interactively — winget/brew/apt/dnf/pacman — and `core/extras.py`'s
`_run_install` calls it, best-effort, right after the pip half succeeds
for this one extra specifically. When neither the automated attempt nor a
manual `apt install tesseract-ocr` (INSTALL.md) has happened yet, this
degrades to "extracts nothing," logged once per process rather than once
per upload, never a failed upload — the same "never blocks or fails the
thing it's attached to" contract `ai/embeddings.py`'s own background retry
already follows.
"""

from __future__ import annotations

import functools
import logging
import os
import shutil
import subprocess  # noqa: S404 — fixed args from a hardcoded table below, no shell, no user input
import sys
import threading
from pathlib import Path

logger = logging.getLogger("memorymap.ocr")

#: Only raster formats Tesseract/Pillow can open directly — deliberately
#: excludes PDF (`MEDIA_SUFFIXES` in routes_files.py allows it too), which
#: would need page rasterisation (a poppler/pdf2image dependency this
#: feature doesn't pull in) before Tesseract could see anything at all.
OCR_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"})

def tesseract_available() -> bool:
    return shutil.which("tesseract") is not None


@functools.lru_cache(maxsize=1)
def _log_binary_missing() -> None:
    """Called on every missing-binary path but only ever logs once per
    process — `lru_cache` runs the body on the first call and returns the
    cached `None` on every later one, which needs no mutable module-level
    flag at all (CodeQL flagged the plain-bool version of this as an
    unused-global-variable note: `py/unused-global-variable`)."""
    logger.info(
        "the 'tesseract' binary isn't on PATH — uploaded images won't "
        "get searchable OCR text until Tesseract OCR is installed "
        "separately (see INSTALL.md); this is not an error"
    )


@functools.lru_cache(maxsize=1)
def _log_package_missing() -> None:
    """Same once-per-process shape as `_log_binary_missing` above, for the
    other gap: the binary is there but `pytesseract`/Pillow aren't."""
    logger.info(
        "tesseract is installed but the pytesseract/Pillow Python "
        "packages aren't — run: pip install pytesseract Pillow"
    )


def extract_text(image_path: Path) -> str:
    """Best-effort OCR text for one image file. Never raises — a missing
    binary, a corrupt image, or an unsupported format all just mean no text
    was found, exactly as if the image genuinely had none."""
    if not tesseract_available():
        _log_binary_missing()
        return ""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        # The tesseract *binary* is on PATH (checked above) but the
        # `pytesseract`/`Pillow` Python packages aren't installed — a
        # different gap than the binary-missing one, worth its own message.
        _log_package_missing()
        return ""
    try:
        with Image.open(image_path) as img:
            text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception:
        # A single unreadable image (corrupt file, an animated GIF Tesseract
        # chokes on, a format Pillow can't decode) must never take down the
        # background thread it runs on or be mistaken for the binary being
        # missing — logged with the traceback so a real recurring failure is
        # still diagnosable, just not surfaced to the person who uploaded it.
        logger.warning("OCR failed for %s", image_path.name, exc_info=True)
        return ""


#: A word Tesseract is less than this sure of is dropped from a region's
#: text. Its own confidence is 0–100 and it reports -1 for the structural
#: rows (page/block/paragraph) that carry no word at all. 30 is low enough to
#: keep a smudged scan readable and high enough to drop the punctuation-noise
#: it invents at the edges of a photograph.
REGION_MIN_CONFIDENCE = 30

#: A word taller than this multiple of the page's median word height is read
#: as a heading rather than body text. Purely a *presentation* hint for the
#: region list — nothing downstream depends on it being right, which is why a
#: ratio is honest here and a "table"/"formula" classifier would not be:
#: Tesseract reports boxes and confidences, not semantic structure, and
#: labelling a region "table" from box geometry alone would be a guess
#: presented as a fact.
REGION_HEADING_RATIO = 1.45


def extract_regions(image_path: Path) -> dict | None:
    """Text laid out as Tesseract found it: one entry per block, with the
    box it occupies on the page.

    Asked for directly, with three screenshots of Baidu's Unlimited-OCR:
    *"for the document ocr I want smth like this"* — a page beside its
    regions, each region typed and its text separately readable, rather than
    one wall of text under the picture with no way to tell which part of the
    page a line came from.

    Returns `None` — not an empty result — when the OCR stack is missing or
    the image cannot be read, so a caller can tell "nothing is installed"
    apart from "this page has no text on it" and say so. Boxes are
    **normalised to 0–1** against the image's own pixel size, because the
    thing that draws them is an `<img>` scaled to whatever width the panel
    happens to be; sending pixels would make every overlay wrong at every
    size but one.
    """
    if not tesseract_available():
        _log_binary_missing()
        return None
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        _log_package_missing()
        return None
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    except Exception:
        logger.warning("OCR regions failed for %s", image_path.name, exc_info=True)
        return None
    if not width or not height:
        return None

    #: Grouped by Tesseract's own block numbering rather than by clustering
    #: boxes ourselves: it has already done the page analysis, and a second
    #: opinion computed from the boxes it returned would only ever be worse.
    blocks: dict[tuple[int, int], dict] = {}
    heights: list[float] = []
    for i in range(len(data.get("text", []))):
        word = str(data["text"][i]).strip()
        if not word:
            continue
        try:
            confidence = float(data["conf"][i])
        except (TypeError, ValueError):
            continue
        if confidence < REGION_MIN_CONFIDENCE:
            continue
        key = (int(data["page_num"][i]), int(data["block_num"][i]))
        left, top = float(data["left"][i]), float(data["top"][i])
        word_w, word_h = float(data["width"][i]), float(data["height"][i])
        heights.append(word_h)
        block = blocks.setdefault(
            key,
            {"words": [], "confidences": [], "x0": left, "y0": top, "x1": left, "y1": top,
             "line": int(data["line_num"][i]), "heights": []},
        )
        #: A newline where Tesseract says the line changed, so a paragraph
        #: comes back as a paragraph. Joining every word with a space turned
        #: an address block into one run-on line.
        if int(data["line_num"][i]) != block["line"]:
            block["words"].append("\n")
            block["line"] = int(data["line_num"][i])
        block["words"].append(word)
        block["confidences"].append(confidence)
        block["heights"].append(word_h)
        block["x0"] = min(block["x0"], left)
        block["y0"] = min(block["y0"], top)
        block["x1"] = max(block["x1"], left + word_w)
        block["y1"] = max(block["y1"], top + word_h)

    median_height = sorted(heights)[len(heights) // 2] if heights else 0.0
    regions = []
    for key in sorted(blocks):
        block = blocks[key]
        text = " ".join(block["words"]).replace(" \n ", "\n").replace("\n ", "\n").strip()
        if not text:
            continue
        block_heights = block["heights"]
        block_median = sorted(block_heights)[len(block_heights) // 2] if block_heights else 0.0
        kind = (
            "heading"
            if median_height and block_median >= median_height * REGION_HEADING_RATIO
            else "text"
        )
        regions.append(
            {
                "index": len(regions),
                "kind": kind,
                "text": text,
                "confidence": round(sum(block["confidences"]) / len(block["confidences"]), 1),
                #: x/y/w/h as fractions of the image, top-left origin.
                "box": {
                    "x": round(block["x0"] / width, 5),
                    "y": round(block["y0"] / height, 5),
                    "w": round((block["x1"] - block["x0"]) / width, 5),
                    "h": round((block["y1"] - block["y0"]) / height, 5),
                },
            }
        )
    return {"width": width, "height": height, "regions": regions, "source": "tesseract"}


def extract_and_store(upload_id: int, image_path: Path) -> None:
    """Runs OCR synchronously and writes the result onto the `MediaUpload`
    row if any text was found. Split out from `extract_in_background` below
    so tests can call this directly without waiting on a real thread."""
    text = extract_text(image_path)
    if not text:
        return
    # Imported here, not at module level: this file has to stay importable
    # (for `tesseract_available()`/`extract_text()` alone) without pulling
    # in the whole app's dependency graph just to check whether a binary
    # exists on PATH.
    from memorymap.core import deps
    from memorymap.core.database import MediaUpload

    with deps.get_db().session() as session:
        upload = session.get(MediaUpload, upload_id)
        if upload is None:
            return  # deleted (or its upload never committed) before OCR finished
        upload.ocr_text = text
        session.commit()


def extract_in_background(upload_id: int, image_path: Path) -> None:
    """Fire-and-forget: never blocks the `POST /media/upload` response.
    Tesseract can take a second or two per image, and the upload itself is
    already done by the time this runs — the same "don't make the caller
    wait for something that isn't the point of the request" reasoning as
    `ai/embeddings.py`'s background reinstall-and-retry."""
    threading.Thread(
        target=extract_and_store,
        args=(upload_id, image_path),
        daemon=True,
        name="ocr-extract",
    ).start()


#: Per platform, the first package manager found on PATH gets tried. Every
#: command is fixed and non-interactive — no shell, no string built from
#: user input, and every flag exists specifically to prevent a prompt this
#: process has no way to answer (a password, a EULA dialog, an "are you
#: sure?"). Linux tries three, in order, since which one exists varies by
#: distro; Windows and macOS have one first-party option each.
_BINARY_INSTALL_COMMANDS: dict[str, list[tuple[str, list[str]]]] = {
    "win32": [
        (
            "winget",
            [
                "winget",
                "install",
                "--id",
                "UB-Mannheim.Tesseract-OCR",
                "-e",
                "--silent",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ],
        )
    ],
    "darwin": [("brew", ["brew", "install", "tesseract"])],
    "linux": [
        ("apt-get", ["apt-get", "install", "-y", "tesseract-ocr"]),
        ("dnf", ["dnf", "install", "-y", "tesseract"]),
        ("pacman", ["pacman", "-S", "--noconfirm", "tesseract"]),
    ],
}

BINARY_INSTALL_TIMEOUT = 90


def attempt_binary_install(timeout: int = BINARY_INSTALL_TIMEOUT) -> tuple[bool, str]:
    """Best-effort, non-interactive install of the `tesseract` system binary
    itself — the one part `pip install pytesseract` can never do, since it
    isn't a Python package. Asked for directly: "add the option for install
    assistance for the tesseract program installation, automate it if
    possible."

    Tries the platform's own package manager with fully non-interactive
    flags. Never prompts, never hangs waiting on a password or a UAC dialog
    it has no way to answer — every attempt is wall-clock bounded — and
    never raises; any failure is reported back as an honest, actionable
    message rather than a crash. `installed` is only ever `True` once
    `tesseract_available()` is confirmed **after** the attempt — the
    installer's own exit code is not trusted alone, the same "a POST
    response can lie about stored state" caution this app applies
    everywhere else that reports success.
    """
    if tesseract_available():
        return True, "Tesseract is already installed."

    platform_key = "linux" if sys.platform.startswith("linux") else sys.platform
    candidates = _BINARY_INSTALL_COMMANDS.get(platform_key, [])
    available = [(name, cmd) for name, cmd in candidates if shutil.which(name)]
    if not available:
        return False, (
            "Couldn't find a package manager to install Tesseract "
            "automatically on this system — install it by hand (see "
            "INSTALL.md)."
        )

    # Linux package managers need root. Tried as-is first (already root —
    # common inside a container) and, only if that's not the case, once
    # more through `sudo -n`, which fails immediately rather than prompting
    # for a password this non-interactive process has no way to answer,
    # instead of silently hanging until the timeout above kills it.
    manager_name, base_command = available[0]
    attempts = [base_command]
    if platform_key == "linux" and hasattr(os, "geteuid") and os.geteuid() != 0:
        attempts = [["sudo", "-n", *base_command], base_command]

    last_error = ""
    for attempt in attempts:
        try:
            result = subprocess.run(  # noqa: S603 — fixed args from the table above, no shell
                attempt, capture_output=True, text=True, timeout=timeout
            )
        except FileNotFoundError:
            continue  # `sudo` itself isn't installed — fall through to the bare command
        except subprocess.TimeoutExpired:
            last_error = f"{attempt[0]} timed out after {timeout}s"
            continue
        if result.returncode == 0 and tesseract_available():
            return True, "Tesseract installed."
        tail = (result.stderr or result.stdout or "").strip().splitlines()
        last_error = tail[-1] if tail else f"{manager_name} exited with code {result.returncode}"

    return False, (
        f"Couldn't install Tesseract automatically ({last_error or 'unknown error'}) "
        "— install it by hand (see INSTALL.md)."
    )
