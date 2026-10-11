"""Profile the hot routes under cProfile (WORLD_CLASS_PLAN 26.2, decision 63).

    PYTHONPATH=src .venv/bin/python scripts/profile_routes.py DATA_DIR [--runs 5]

DATA_DIR is a copy of a seeded notebook (`scratchpad/ui-sweeps/seed-showcase.py`
writes the README's: 71 notes, 3 documents, a board, a mind map, 4 chats). The
app is driven in-process through httpx's ASGI transport. Sync route handlers
normally run in a worker thread, where cProfile cannot see them, so
`anyio.to_thread.run_sync` and Starlette's `run_in_threadpool` are replaced by
a direct call: wall times here are a single-request figure, not a concurrent
one. Prints each route's median wall time and then the app's own functions with
the largest cumulative time over all the runs, middleware excluded.
"""

from __future__ import annotations

import asyncio
import cProfile
import os
import pstats
import statistics
import sys
import time

ROUTES = [
    "/entries",
    "/search?q=harbor launch",
    "/graph",
    "/insights/stats",
    "/insights/patterns",
    "/resurface",
    "/most-opened",
    "/activity",
    "/categories",
    "/documents",
]


async def _anyio_inline(func, *args, **kwargs):  # noqa: ANN001, ANN202
    for name in ("abandon_on_cancel", "cancellable", "limiter"):
        kwargs.pop(name, None)
    return func(*args)


async def _starlette_inline(func, *args, **kwargs):  # noqa: ANN001, ANN202
    return func(*args, **kwargs)


async def main(data_dir: str, runs: int) -> None:
    os.environ["MEMORYMAP_DATA_DIR"] = data_dir
    import anyio.to_thread
    import httpx
    import starlette.concurrency

    anyio.to_thread.run_sync = _anyio_inline
    starlette.concurrency.run_in_threadpool = _starlette_inline
    from memorymap.api.app import create_app

    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1") as c:
        status = (await c.get("/auth/status")).json()
        route = "/auth/setup" if status.get("setup_required") else "/auth/unlock"
        token = (await c.post(route, json={"password": "testpassword123"})).json()["token"]
        c.headers["X-Auth-Token"] = token
        prof = cProfile.Profile()
        for path in ROUTES:
            await c.get(path)  # warm: imports, caches, the first query plan
            times = []
            for _ in range(runs):
                prof.enable()
                t = time.perf_counter()
                r = await c.get(path)
                times.append((time.perf_counter() - t) * 1000)
                prof.disable()
            print(f"{r.status_code} {statistics.median(times):8.1f} ms median of {runs}  {path}  ({len(r.content)} bytes)")
        stats = pstats.Stats(prof)
        # The app's own functions only: the middleware chain wraps every call and
        # would take the top of a raw list.
        stats.sort_stats("cumulative").print_stats(r"src/memorymap/(?!api/(app|versioning|routes_auth)|core/security)", 14)


if __name__ == "__main__":
    n = int(sys.argv[sys.argv.index("--runs") + 1]) if "--runs" in sys.argv else 5
    asyncio.run(main(sys.argv[1], n))
