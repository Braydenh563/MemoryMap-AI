"""Build the FastAPI app: API routers + the static frontend.

No CORS middleware: the frontend is served from the same origin as the
API, so none is needed (plan §4).
"""

from __future__ import annotations

import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from memorymap import __version__
from memorymap.api import routes_chat, routes_entries
from memorymap.core import deps
from memorymap.core.deps import init_app_state

# repo-root/frontend — three levels up from src/memorymap/api/app.py.
FRONTEND_DIR = Path(__file__).resolve().parents[3] / "frontend"


def _warm_up_embeddings() -> None:
    """Load the embedding model in the background at startup.

    The first embed call loads the model weights (several seconds), which
    used to land on the user's very first save. Warming up here makes
    that first save fast. Any failure just means embeddings are
    unavailable — the app runs fine without them."""
    try:
        deps.get_embeddings().embed_text("warm up")
    except Exception:
        pass


def create_app() -> FastAPI:
    init_app_state()
    threading.Thread(
        target=_warm_up_embeddings, name="embedding-warmup", daemon=True
    ).start()

    app = FastAPI(title="MemoryMap AI", version=__version__)
    app.include_router(routes_entries.router)
    app.include_router(routes_chat.router)

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "app": "MemoryMap AI", "version": __version__}

    # Mounted last so the API routes above always win; html=True makes
    # "/" serve frontend/index.html.
    if FRONTEND_DIR.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

    return app
