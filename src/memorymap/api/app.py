"""Build the FastAPI app: API routers + the static frontend.

No CORS middleware: the frontend is served from the same origin as the
API, so none is needed (plan §4).
"""

from __future__ import annotations

from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles

from memorymap import __version__
from memorymap.ai import embeddings
from memorymap.api import (
    routes_auth,
    routes_categories,
    routes_chat,
    routes_conversations,
    routes_documents,
    routes_duplicates,
    routes_drafts,
    routes_entries,
    routes_files,
    routes_graph,
    routes_insights,
    routes_models,
    routes_reminders,
    routes_settings,
    routes_tags,
    routes_voice,
)
from memorymap.api.routes_auth import require_unlock
from memorymap.core import backup, deps, logbuffer
from memorymap.core.deps import init_app_state
from memorymap.entry import manager

# repo-root/frontend — three levels up from src/memorymap/api/app.py.
FRONTEND_DIR = Path(__file__).resolve().parents[3] / "frontend"


# (Embedding warm-up now lives in ai/embeddings.start_warmup, which also
# tracks running/failed state for the status pill.)


def _purge_expired_bin_entries() -> None:
    """Recycle-bin auto-clear (plan Phase 4): permanently drop entries
    binned longer than the user's configured number of days."""
    try:
        session = deps.get_db().session()
        try:
            config = deps.get_config()
            days = int(config.get_preference("recycle_bin_days", 30))
            manager.purge_expired_deleted(session, days, uploads_dir=config.uploads_dir)
        finally:
            session.close()
    except Exception:
        pass  # a failed purge must never stop the app from starting


def _backup_if_due() -> None:
    """Scheduled local backups (Wave F): one consistent snapshot per day,
    taken at startup. Failure must never stop the app."""
    try:
        config = deps.get_config()
        backup.backup_if_due(config.db_path, config.data_dir)
    except Exception:
        pass


def create_app() -> FastAPI:
    logbuffer.install()  # start capturing logs for the Settings viewer
    init_app_state()
    _purge_expired_bin_entries()
    _backup_if_due()
    # The session factory is handed in so embeddings never has to import the
    # dependency container that imports it.
    embeddings.start_warmup(deps.get_embeddings(), deps.get_db().session)

    app = FastAPI(title="MemoryMap AI", version=__version__)

    # Everything that touches the user's data sits behind the unlock
    # gate; /auth itself and /health stay open.
    locked = [Depends(require_unlock)]
    app.include_router(routes_auth.router)
    app.include_router(routes_entries.router, dependencies=locked)
    app.include_router(routes_chat.router, dependencies=locked)
    app.include_router(routes_models.router, dependencies=locked)
    app.include_router(routes_settings.router, dependencies=locked)
    app.include_router(routes_files.router, dependencies=locked)
    app.include_router(routes_tags.router, dependencies=locked)
    app.include_router(routes_categories.router, dependencies=locked)
    app.include_router(routes_conversations.router, dependencies=locked)
    app.include_router(routes_documents.router, dependencies=locked)
    app.include_router(routes_duplicates.router, dependencies=locked)
    app.include_router(routes_drafts.router, dependencies=locked)
    app.include_router(routes_insights.router, dependencies=locked)
    app.include_router(routes_graph.router, dependencies=locked)
    app.include_router(routes_reminders.router, dependencies=locked)
    app.include_router(routes_voice.router, dependencies=locked)

    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok", "app": "MemoryMap AI", "version": __version__}

    # Mounted last so the API routes above always win; html=True makes
    # "/" serve frontend/index.html.
    if FRONTEND_DIR.is_dir():
        app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

    return app
