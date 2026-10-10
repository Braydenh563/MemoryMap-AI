"""The offline translator: which pairs are installed and which files serve them.

WORLD_CLASS_PLAN 28.5 row 10 (Brief 83). The owner, 2026-10-10: "What about
ai free translations?" A model-backed "Translate this passage" already
existed (a document hands the passage to chat); this is the one that needs
no model.

**Where the engine runs, and why.** Bergamot is marian-nmt compiled to
WebAssembly. It runs in a Web Worker in the page
(`frontend/js/translate-worker.js`), not here, measured on 2026-10-10:

- the app's policy (`core/security.build_csp`) already has
  `'wasm-unsafe-eval'` in `script-src` and `worker-src 'self'` for the
  grammar checker, and the engine's Emscripten glue has no `eval` and no
  `new Function`, so it runs under that policy unchanged;
- the server has no WebAssembly runtime and none may be installed (CLAUDE.md
  section 7), and a native build would be one more per-platform binary to
  pin and inspect.

So this module only says what is installed and resolves the file names the
worker may fetch; the text never reaches the server. The files are the
public engine and model, nothing of the notebook's.
"""

from __future__ import annotations

from pathlib import Path

from memorymap.core import extras

#: The package in Settings, Packages that carries the engine and the pairs.
EXTRA_ID = "translate"

#: Said wherever Translate this cannot run yet: names the package as
#: Settings, Packages lists it.
INSTALL_HINT = (
    "Translate this needs the offline translator. Install “Translate "
    "offline” in Settings, Packages."
)

#: The engine's two files, loaded by the worker.
ENGINE_FILES = ("bergamot-translator-worker.js", "bergamot-translator-worker.wasm")

#: The installed pairs' files, by direction. A new pair is a row here and its
#: downloads in `core/extras.py`'s entry.
PAIRS: tuple[dict, ...] = (
    {
        "from": "en",
        "to": "es",
        "label": "English to Spanish",
        "model": "model.enes.intgemm.alphas.bin",
        "lex": "lex.50.50.enes.s2t.bin",
        "vocab": "vocab.enes.spm",
    },
)

_TYPES = {
    ".js": "text/javascript; charset=utf-8",
    ".wasm": "application/wasm",
}


def _folder() -> Path | None:
    return extras.download_ready(EXTRA_ID)


def status() -> dict:
    """What the palette row and the sheet read: installed or not, the pairs,
    and the sentence to show when it is not."""
    installed = _folder() is not None
    return {
        "installed": installed,
        "pairs": [
            {key: pair[key] for key in ("from", "to", "label", "model", "lex", "vocab")}
            for pair in PAIRS
        ]
        if installed
        else [],
        "engine": ENGINE_FILES[0] if installed else "",
        "hint": "" if installed else INSTALL_HINT,
        "extra": EXTRA_ID,
    }


def served(name: str) -> tuple[Path, str] | None:
    """The file `name` names and its media type, or None.

    `name` only picks an entry from the extra's own list of written files
    (the engine, the licence, each pair's three), so no spelling of a path
    reaches the disk and the marker file is never served."""
    folder = _folder()
    if folder is None:
        return None
    extra = extras.EXTRAS_BY_ID[EXTRA_ID]
    allowed = {file: file for download in extra.downloads for _member, file in download.members}
    listed = allowed.get(name)
    if listed is None or not (folder / listed).is_file():
        return None
    suffix = "." + listed.rsplit(".", 1)[-1] if "." in listed else ""
    return folder / listed, _TYPES.get(suffix, "application/octet-stream")
