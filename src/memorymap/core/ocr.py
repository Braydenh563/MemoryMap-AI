"""Local OCR text extraction for uploaded images (ROADMAP.md item 30d).

A whiteboard photo or a scanned page attached via `POST /media/upload`
attaches today as an opaque file nothing reads, "what was on that
whiteboard photo from March" is unanswerable by search. This reads the
image once, in the background, and stores what it found on
`MediaUpload.ocr_text`, so the Library's Image Gallery search (client-side,
same as the rest of the Library's own search box) can find it.

`pytesseract`/Pillow (the thin Python wrapper this module imports) are
listed as the "ocr" entry in `core/extras.py`'s installable-extras
registry: pip installable, so `_run_install` handles that half exactly
like every other extra. The `tesseract` **system binary** itself is a
different problem: no PyPI wheel ships it, so `pip install` alone can
never make it appear. `attempt_binary_install` below (asked for directly:
"automate it if possible") tries the platform's own package manager
non-interactively, winget/brew/apt/dnf/pacman, and `core/extras.py`'s
`_run_install` calls it, best-effort, right after the pip half succeeds
for this one extra specifically. When neither the automated attempt nor a
manual `apt install tesseract-ocr` (INSTALL.md) has happened yet, this
degrades to "extracts nothing," logged once per process rather than once
per upload, never a failed upload, the same "never blocks or fails the
thing it's attached to" contract `ai/embeddings.py`'s own background retry
already follows.
"""

from __future__ import annotations

import functools
import importlib
import logging
import os
import re
import shutil
import subprocess  # noqa: S404  # fixed args from a hardcoded table below, no shell, no user input
import sys
from pathlib import Path

from memorymap.core import jobs
from memorymap.core.subproc import NO_WINDOW

logger = logging.getLogger("memorymap.ocr")

#: Only raster formats Tesseract/Pillow can open directly, deliberately
#: excludes PDF (`MEDIA_SUFFIXES` in routes_files.py allows it too), which
#: would need page rasterisation (a poppler/pdf2image dependency this
#: feature doesn't pull in) before Tesseract could see anything at all.
OCR_SUFFIXES = frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"})

#: Where the Windows installers put `tesseract.exe` when they do not put
#: it on PATH. Each entry is (environment variable, the rest of the path).
#: The UB-Mannheim build, which is the one INSTALL.md points at, offers an
#: "install for me only" mode that needs no administrator and lands under
#: LOCALAPPDATA; that is the mode most people end up in, and the one whose
#: installer never touches the machine PATH.
_WINDOWS_TESSERACT_DIRS = (
    ("ProgramFiles", ("Tesseract-OCR",)),
    ("ProgramFiles(x86)", ("Tesseract-OCR",)),
    ("LOCALAPPDATA", ("Programs", "Tesseract-OCR")),
    ("LOCALAPPDATA", ("Tesseract-OCR",)),
    ("ProgramW6432", ("Tesseract-OCR",)),
)

#: The registry keys the same installers write, whatever directory was
#: chosen. Checked before the fixed directories above, since this one is
#: right even for a custom install path.
_WINDOWS_TESSERACT_KEYS = (
    ("HKEY_LOCAL_MACHINE", r"SOFTWARE\Tesseract-OCR"),
    ("HKEY_CURRENT_USER", r"SOFTWARE\Tesseract-OCR"),
)


def _registry_tesseract_dir() -> Path | None:
    """The install directory Tesseract's own installer recorded, if any.

    Tried before the fixed Program Files guesses because it is the only
    source that survives someone choosing a different folder. Everything
    here is best effort: `winreg` does not exist off Windows, the key does
    not exist unless Tesseract was installed by its installer, and a value
    that is there but points nowhere is treated as absent.
    """
    try:
        import winreg  # noqa: PLC0415  # Windows-only, imported where it is used
    except ImportError:
        return None
    for root_name, subkey in _WINDOWS_TESSERACT_KEYS:
        root = getattr(winreg, root_name, None)
        if root is None:
            continue
        try:
            with winreg.OpenKey(root, subkey) as key:
                for value_name in ("Path", "InstallDir", ""):
                    try:
                        value, _kind = winreg.QueryValueEx(key, value_name)
                    except OSError:
                        continue
                    if value and Path(value).is_dir():
                        return Path(value)
        except OSError:
            continue
    return None


@functools.lru_cache(maxsize=1)
def _probe_windows_tesseract() -> Path | None:
    """Find `tesseract.exe` where the installer leaves it when PATH misses it.

    Reported directly: "Tesseract installed but not recognised". The
    Windows installers do not reliably add their own directory to PATH, and
    the per-user mode never does, so `shutil.which` says "not installed"
    about a binary sitting in a standard place. Answering "install it
    again" to someone who already has it is the worst version of this.

    Cached: an install that happens while the app is running is picked up
    by `attempt_binary_install`, which clears this, and every other caller
    is a status poll that would otherwise stat the same four directories
    forever.
    """
    candidates = []
    from_registry = _registry_tesseract_dir()
    if from_registry is not None:
        candidates.append(from_registry)
    for env_var, parts in _WINDOWS_TESSERACT_DIRS:
        root = os.environ.get(env_var, "")
        if root:
            candidates.append(Path(root).joinpath(*parts))
    for directory in candidates:
        binary = directory / "tesseract.exe"
        if binary.is_file():
            return binary
    return None


def _adopt_tesseract(binary: Path) -> None:
    """Make one found-off-PATH binary usable by everything that looks later.

    Two places have to agree, and neither is reached by simply returning
    True from `tesseract_available`:

    * `pytesseract` runs `tesseract` by bare name through its own
      `subprocess`, so it needs `tesseract_cmd` pointed at the real file or
      the very next call fails with the error this function exists to
      prevent.
    * `shutil.which`, which `tesseract_available` itself asks first and
      `attempt_binary_install` asks again after an install, plus anything
      else on this process's PATH.

    Both are idempotent: the PATH entry is added once, and re-pointing
    `tesseract_cmd` at the same file costs nothing.
    """
    directory = str(binary.parent)
    path = os.environ.get("PATH", "")
    if directory not in path.split(os.pathsep):
        os.environ["PATH"] = f"{path}{os.pathsep}{directory}" if path else directory
        logger.info("found tesseract at %s, which PATH did not mention", binary)
    try:
        import pytesseract  # noqa: PLC0415  # optional extra, imported where it is used
    except ImportError:
        return  # the binary is there, the Python wrapper is the other half
    pytesseract.pytesseract.tesseract_cmd = str(binary)


def tesseract_available() -> bool:
    """Whether the `tesseract` binary is reachable from this process.

    PATH first, since that is the answer on every platform where the
    package manager installed it. Windows gets a second look in the places
    its installers actually use, and adopts what it finds so that
    `pytesseract` and every later `shutil.which` see it too.
    """
    if shutil.which("tesseract") is not None:
        return True
    if sys.platform == "win32":
        binary = _probe_windows_tesseract()
        if binary is not None:
            _adopt_tesseract(binary)
            return True
    return False


def _one_thread_for_tesseract() -> None:
    """Pin Tesseract's OpenMP to one thread unless the person set it.

    Measured 2026-09-14 in a four-core container: a 600x160 line of text took
    42 s with the default (every OpenMP thread spinning on the LSTM's tiny
    matrices), and 0.28 s with `OMP_THREAD_LIMIT=1`. The same oversubscription
    hits any laptop running the app beside a model that already owns the
    cores, and the Tesseract project's own advice for that case is this
    variable. `setdefault`, so a person who tuned it keeps their value; the
    child process inherits the environment through pytesseract's subprocess.
    """
    os.environ.setdefault("OMP_THREAD_LIMIT", "1")


@functools.lru_cache(maxsize=1)
def _log_binary_missing() -> None:
    """Called on every missing-binary path but only ever logs once per
    process: `lru_cache` runs the body on the first call and returns the
    cached `None` on every later one, which needs no mutable module-level
    flag at all (CodeQL flagged the plain-bool version of this as an
    unused-global-variable note: `py/unused-global-variable`)."""
    logger.info(
        "the 'tesseract' binary isn't on PATH: uploaded images won't "
        "get searchable OCR text until Tesseract OCR is installed "
        "separately (see INSTALL.md); this is not an error"
    )


@functools.lru_cache(maxsize=1)
def _log_package_missing() -> None:
    """Same once-per-process shape as `_log_binary_missing` above, for the
    other gap: the binary is there but `pytesseract`/Pillow aren't."""
    logger.info(
        "tesseract is installed but the pytesseract/Pillow Python "
        "packages aren't: run: pip install pytesseract Pillow"
    )


def extract_text(image_path: Path) -> str:
    """Best-effort OCR text for one image file. Never raises: a missing
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
        # `pytesseract`/`Pillow` Python packages aren't installed: a
        # different gap than the binary-missing one, worth its own message.
        _log_package_missing()
        return ""
    _one_thread_for_tesseract()
    try:
        with Image.open(image_path) as img:
            text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception:
        # A single unreadable image (corrupt file, an animated GIF Tesseract
        # chokes on, a format Pillow can't decode) must never take down the
        # background thread it runs on or be mistaken for the binary being
        # missing: logged with the traceback so a real recurring failure is
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
#: region list: nothing downstream depends on it being right, which is why a
#: ratio is honest here and a "table"/"formula" classifier would not be:
#: Tesseract reports boxes and confidences, not semantic structure, and
#: labelling a region "table" from box geometry alone would be a guess
#: presented as a fact.
REGION_HEADING_RATIO = 1.45


def extract_regions(image_path: Path) -> dict | None:
    """Text laid out as Tesseract found it: one entry per block, with the
    box it occupies on the page.

    Asked for directly, with three screenshots of Baidu's Unlimited-OCR:
    *"for the document ocr I want smth like this"*, a page beside its
    regions, each region typed and its text separately readable, rather than
    one wall of text under the picture with no way to tell which part of the
    page a line came from.

    Returns `None`, not an empty result, when the OCR stack is missing or
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
    _one_thread_for_tesseract()
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


#: A line this many characters or fewer, with no closing punctuation, is a
#: heading rather than a one-line paragraph. Twelve words at a generous average
#:, long enough for a real section title, short enough that a sentence which
#: happens to end without a full stop is not mistaken for one.
READING_HEADING_CHARS = 72


def regions_from_reading(text: str) -> list[dict]:
    """Split a page's *reading* into typed blocks, with no image involved.

    **Why this exists: "the regions dont work without tesseract but surely
    there's a better way."** They did not, and the fallback said so honestly, 
    one region covering the whole page and a message telling you to go install
    a binary. That is a correct answer to the wrong question. This app's
    primary reader is a vision model, not Tesseract (see `read_page`), so on
    the path most people actually use, the page *was* read, in order, with its
    structure intact in the text, and the workspace threw all of that away
    because it could not draw a rectangle around it.

    Regions are two different things wearing one name: **where a block sits on
    the page**, which genuinely needs pixel analysis, and **what the blocks
    are, in order**, which does not. This computes the second from the reading
    itself, so every page gets regions whatever is installed: a heading is
    still a heading, a table is still a table, and "this sentence came from
    block 4 of page 2" is answerable: which is what "make it so extracted
    text is visually linked to the page or section it was extracted from"
    actually asks for. Where Tesseract *is* installed, `extract_regions` above
    still supplies real boxes and this is not used.

    Blocks are separated by blank lines, which is what every reader, vision
    model, Tesseract's own `--psm 1`, a PDF text layer, already emits between
    paragraphs. `box` is None rather than a full-page rectangle: a box that
    claims to be the whole page is a *wrong* answer, and the UI can draw a
    list without one but cannot un-draw a lie.
    """
    blocks: list[dict] = []
    for chunk in re.split(r"\n\s*\n", str(text or "")):
        body = chunk.strip("\n").rstrip()
        if not body.strip():
            continue
        blocks.append(
            {
                "index": len(blocks),
                "kind": _reading_block_kind(body),
                "text": body,
                #: Nothing measured it, so nothing pretends to have. The
                #: workspace reads 0.0 as "no confidence to show" and omits the
                #: badge rather than displaying a confident-looking zero.
                "confidence": 0.0,
                "box": None,
            }
        )
    return blocks


def _reading_block_kind(body: str) -> str:
    """What a block of a reading is, from its shape alone.

    Deliberately shape, not content: a model asked to label its own output
    costs a second round trip per page and disagrees with itself between runs,
    and every one of these is a rule a person could check by looking.
    """
    lines = [line for line in body.splitlines() if line.strip()]
    first = lines[0].strip() if lines else ""

    #: A fenced block, or a run of lines that are all indented four spaces, 
    #: the two ways every markdown reader writes code.
    if first.startswith("```") or all(line.startswith("    ") for line in lines):
        return "code"
    #: Two or more pipes on most lines is a table however it was drawn; a
    #: single stray pipe in prose is not.
    if len(lines) >= 2 and sum(line.count("|") >= 2 for line in lines) >= len(lines) - 1:
        return "table"
    #: Bullets, numbers, or checkboxes on the majority of lines.
    bulleted = sum(
        bool(re.match(r"^\s*(?:[-*+\u2022]|\d+[.)])\s+", line)) for line in lines
    )
    if lines and bulleted >= max(2, len(lines) - 1):
        return "list"
    #: A markdown heading says so outright. Otherwise: one short line with no
    #: sentence-ending punctuation is a title, which is how a heading reads on
    #: a scanned page where nothing carries markup at all.
    if first.startswith("#"):
        return "heading"
    if (
        len(lines) == 1
        and len(first) <= READING_HEADING_CHARS
        and not first.endswith((".", "!", "?", ":", ";", ","))
    ):
        return "heading"
    return "text"


def extract_and_store(upload_id: int, image_path: Path) -> None:
    """Runs OCR synchronously and writes the result onto the `MediaUpload`
    row if any text was found. Split out from `extract_in_background` below
    so tests can call this directly without waiting on a real thread.

    **Once per picture, by one engine** (owner: "the vision captioning and
    ocr should only happen each once, not multiple times each"). It had no
    stored-result guard, so every save of a note holding the picture read it
    again; and it ran beside the vision model's own read of the same text.
    Now it stands down when the text is already stored, and when a vision
    model is there to read it (`vision_ocr_and_store`, queued by the same
    commit), so the picture is read once, by the better reader available.
    """
    deps = importlib.import_module("memorymap.core.deps")
    from memorymap.core.database import MediaUpload

    with deps.get_db().session() as session:
        upload = session.get(MediaUpload, upload_id)
        if upload is None or upload.ocr_text:
            return
    try:
        if deps.get_model_manager().resolve_vision_model(deps.get_ollama()):
            return
    except Exception:  # noqa: BLE001  # no backend reachable: Tesseract is the reader
        pass
    text = extract_text(image_path)
    if not text:
        return
    # Imported here, not at module level: this file has to stay importable
    # (for `tesseract_available()`/`extract_text()` alone) without pulling
    # in the whole app's dependency graph just to check whether a binary
    # exists on PATH.
    #
    # `deps` specifically goes through `importlib` rather than an `import`
    # statement, because a statement is what CodeQL py/cyclic-import counts, 
    # deferring it into the function body does not clear the finding, only
    # dropping the statement does (`entry/manager.py` records the same). The
    # cycle here is `ai.embeddings -> core.extras -> core.ocr -> core.deps ->
    # ai.embeddings`, and this is its wrong-direction edge: `deps` is the
    # container that builds the embedding service, so nothing it builds
    # should name it back. Runtime behaviour is identical.
    with deps.get_db().session() as session:
        upload = session.get(MediaUpload, upload_id)
        if upload is None:
            return  # deleted (or its upload never committed) before OCR finished
        upload.ocr_text = text
        session.commit()


def extract_in_background(upload_id: int, image_path: Path) -> None:
    """Fire-and-forget: never blocks the `POST /media/upload` response.
    Tesseract can take a second or two per image, and the upload itself is
    already done by the time this runs, the same "don't make the caller
    wait for something that isn't the point of the request" reasoning as
    `ai/embeddings.py`'s background reinstall-and-retry."""
    jobs.enqueue("ocr", extract_and_store, upload_id, image_path, name=image_path.name, dedupe_key=("ocr", upload_id))


#: Per platform, the first package manager found on PATH gets tried. Every
#: command is fixed and non-interactive, no shell, no string built from
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
    itself: the one part `pip install pytesseract` can never do, since it
    isn't a Python package. Asked for directly: "add the option for install
    assistance for the tesseract program installation, automate it if
    possible."

    Tries the platform's own package manager with fully non-interactive
    flags. Never prompts, never hangs waiting on a password or a UAC dialog
    it has no way to answer, every attempt is wall-clock bounded, and
    never raises; any failure is reported back as an honest, actionable
    message rather than a crash. `installed` is only ever `True` once
    `tesseract_available()` is confirmed **after** the attempt, the
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
            "automatically on this system, install it by hand (see "
            "INSTALL.md)."
        )

    # Linux package managers need root. Tried as-is first (already root: 
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
            result = subprocess.run(  # noqa: S603  # fixed args from the table above, no shell
                attempt,
                capture_output=True,
                text=True,
                timeout=timeout,
                creationflags=NO_WINDOW,
            )
        except FileNotFoundError:
            continue  # `sudo` itself isn't installed: fall through to the bare command
        except subprocess.TimeoutExpired:
            last_error = f"{attempt[0]} timed out after {timeout}s"
            continue
        # The install just changed the filesystem the probe cached an answer
        # about, and on Windows the installer it ran is exactly the one that
        # may not touch PATH, so the confirmation below has to be allowed to
        # look again rather than repeat a stale "not there".
        _probe_windows_tesseract.cache_clear()
        if result.returncode == 0 and tesseract_available():
            return True, "Tesseract installed."
        tail = (result.stderr or result.stdout or "").strip().splitlines()
        last_error = tail[-1] if tail else f"{manager_name} exited with code {result.returncode}"

    return False, (
        f"Couldn't install Tesseract automatically ({last_error or 'unknown error'}) "
        ", install it by hand (see INSTALL.md)."
    )
