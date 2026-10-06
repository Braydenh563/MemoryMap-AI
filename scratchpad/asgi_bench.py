"""Per-request cost of the middleware stack, in process (INBOX 472).

Drives the real app over httpx's ASGI transport (no socket, no uvicorn), so
what is measured is the stack and the handler: N requests to each path,
best-of-three mean in milliseconds.

    MEMORYMAP_DATA_DIR=/tmp/mm-me7 PYTHONPATH=src .venv/bin/python scratchpad/asgi_bench.py
"""

import asyncio
import os
import sys
import time

import httpx

sys.path.insert(0, "src")
from memorymap.api.app import create_app  # noqa: E402

N = int(os.environ.get("N", "300"))
PATHS = sys.argv[1:] or ["/health", "/chat/modes", "/entries?limit=20"]


async def main() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1") as c:
        r = await c.post("/auth/unlock", json={"password": os.environ.get("PW", "testpassword123")})
        h = {"X-Auth-Token": r.json()["token"]}
        for path in PATHS:
            best = None
            for _ in range(3):
                t = time.perf_counter()
                for _ in range(N):
                    await c.get(path, headers=h)
                ms = (time.perf_counter() - t) * 1000 / N
                best = ms if best is None else min(best, ms)
            print(f"{path:28} {best:6.2f} ms")


asyncio.run(main())
