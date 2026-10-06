"""`GET /capabilities`: what this install can do, asked once (WORLD_CLASS_PLAN B7).

The question every optional feature asks before it draws itself is "is the
thing behind me here": a transcriber for the microphone button, Tesseract for
"read the text in this image", markitdown for the Office importer, a local
embedding model for "find by meaning". Each used to be answered by its own
status route, or by trying and showing the error, so a button could appear
and then fail on its first press. This is the one answer, cheap enough for the
page to read once at unlock: every field is a look at the disk or at a saved
preference, never a request to a model server and never an import of the
package it asks about (`importlib.util.find_spec` finds without loading, which
matters for a 700 MB ML stack).

*Installed*, not *running*. Whether the model server answers right now is
`/models/status`'s question, polled because it changes; what is installed
changes when the person installs something, which restarts nothing but is
rare enough that a reload is the right way to see it.
"""

from __future__ import annotations

import importlib.util

from fastapi import APIRouter

from memorymap import __version__
from memorymap.api import paging
from memorymap.core import deps

router = APIRouter(tags=["system"])

#: The versioned contract's prefix (H4); `api/versioning.py` serves it.
API_PREFIX = "/api/v1"
API_VERSION = 1


def _mcp() -> dict:
    """The stdio MCP server, as far as this install can run it.

    `python -m memorymap.mcp_server` needs a Python that can import this
    package: a source checkout has one, the packaged app does not (its exe
    is the interpreter, and it takes only its own flags). The packaged app
    said "installed" with that command anyway, and an outside client set up
    from it failed to start."""
    import sys

    if getattr(sys, "frozen", False):
        return {
            "installed": False,
            "reason": "The packaged app cannot start the MCP server; it runs from a source checkout.",
        }
    return {"installed": True, "command": "python -m memorymap.mcp_server"}


def _installed(module: str) -> bool:
    try:
        return importlib.util.find_spec(module) is not None
    except (ImportError, ValueError):
        return False


@router.get("/capabilities")
def capabilities() -> dict:
    from memorymap.ai import voice
    from memorymap.core import netbind, ocr
    from memorymap.entry import importer

    config = deps.get_config()
    backend = str(config.get_preference("embedding_backend", "sentence-transformers"))
    return {
        "version": __version__,
        "api": {
            "version": API_VERSION,
            "prefix": API_PREFIX,
            # How a client walks a list and guards a write, said rather than
            # left for it to discover from one route's headers.
            "next_cursor_header": paging.NEXT_CURSOR,
            "etag_on": ["/entries/{id}"],
            "if_match_on": ["PUT /entries/{id}", "DELETE /entries/{id}"],
            # The header an outside agent names itself in, so the change it
            # makes is filed under its name in the activity panel (H4).
            "agent_header": "X-MemoryMap-Agent",
        },
        "features": {
            # A local model for meaning (the sentence-transformers backend) is
            # an optional install; the Ollama backend needs only the server.
            "embeddings": {
                "backend": backend,
                "installed": backend == "ollama" or _installed("sentence_transformers"),
            },
            "voice": {"installed": voice.whisper_available()},
            "ocr": {
                # A local engine on the server (Tesseract, or RapidOCR where
                # Tesseract is not ready; the key keeps its old name, which is
                # the local reader's id). The browser's own reader and a
                # vision model are the fallbacks, which is why `ocr` alone is
                # never a reason to hide "read the text".
                "tesseract": ocr.local_available(),
                "engine": ocr.engine(),
            },
            "office_import": {"installed": importer.markitdown_available()},
            # Read aloud is the browser's speech synthesis: nothing to install
            # on this side, said so the page does not go looking for it.
            "tts": {"engine": "browser"},
            "mcp": _mcp(),
            "lan": {"enabled": bool(netbind.lan_enabled(config))},
            "user_skills_folder": {"installed": True},
        },
    }
