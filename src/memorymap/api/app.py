"""Build the FastAPI app: routers now, frontend mount in Phase 3.

No CORS middleware: FastAPI will serve the frontend from the same
origin, so none is needed (plan §4).
"""

from __future__ import annotations

from fastapi import FastAPI

from memorymap import __version__
from memorymap.api import routes_chat, routes_entries
from memorymap.core.deps import init_app_state


def create_app() -> FastAPI:
    init_app_state()

    app = FastAPI(title="MemoryMap AI", version=__version__)
    app.include_router(routes_entries.router)
    app.include_router(routes_chat.router)

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "app": "MemoryMap AI", "version": __version__}

    return app
