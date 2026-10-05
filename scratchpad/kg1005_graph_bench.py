"""The graph's endpoints at notebook scale, in process (GRAPH_PLAN, 2026-10-05).

Seeds N notes (default 5,000) into DATA_DIR once (two links and two tags a
note, eight categories, a few drafts and boards), then drives the real app
over httpx's ASGI transport and prints, per endpoint, the cold call (after a
write moved the fingerprint), the warm median of five, and the payload size.

    PYTHONPATH=src .venv/bin/python scratchpad/kg1005_graph_bench.py /tmp/mm-bench5k 5000

Point PYTHONPATH at another tree (`git archive <rev> src | tar -x -C dir`) to
time another revision against the same notebook.
"""

import asyncio
import json
import random
import statistics
import sys
import time
from pathlib import Path

import httpx

root = Path(sys.argv[1])
count = int(sys.argv[2]) if len(sys.argv) > 2 else 5000
root.mkdir(parents=True, exist_ok=True)

import os  # noqa: E402

os.environ["MEMORYMAP_DATA_DIR"] = str(root)
os.environ.setdefault("MEMORYMAP_NO_AUTO_INSTALL", "1")

from sqlalchemy import func, insert, select  # noqa: E402

from memorymap.api.app import create_app  # noqa: E402
from memorymap.core.database import DatabaseManager, Entry, EntryLink  # noqa: E402

PW = "testpassword123"


def seed() -> None:
    db = DatabaseManager(root / "memorymap.db")
    with db.session() as session:
        have = session.scalar(select(func.count(Entry.id))) or 0
        if have >= count:
            return
        rng = random.Random(7)
        words = "graph note link map idea plan read write cluster label node edge spark comet kiln glaze".split()
        tags = [f"t{i}" for i in range(count // 10)]
        rows = []
        for i in range(count):
            body = " ".join(rng.choice(words) for _ in range(60))
            rows.append({
                "content": f"# Note {i} about {rng.choice(words)}\n\n{body}",
                "tags": json.dumps(rng.sample(tags, 2)),
                "is_private": False,
                "is_draft": i % 250 == 1,
                "is_board": i % 500 == 2,
            })
        session.execute(insert(Entry), rows)
        session.commit()
        ids = list(session.scalars(select(Entry.id)))
        pairs = {(rng.choice(ids), rng.choice(ids)) for _ in range(count * 2)}
        session.execute(insert(EntryLink), [{"source_entry_id": a, "target_entry_id": b} for a, b in pairs if a != b])
        session.commit()


async def main() -> None:
    seed()
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1", timeout=600) as c:
        r = await c.post("/auth/setup", json={"password": PW})
        if r.status_code >= 400:
            r = await c.post("/auth/unlock", json={"password": PW})
        h = {"X-Auth-Token": r.json()["token"]}
        first = 10  # a seeded note with links (ids start at 1)
        paths = ["/graph", "/graph?include_maps=true", f"/graph/local/{first}", "/graph/structure"]
        # One write, so every path's first call below is cold.
        await c.post("/entries", headers=h, json={"content": f"bench {time.time()}"})
        for path in paths:
            t = time.perf_counter()
            resp = await c.get(path, headers=h)
            cold = (time.perf_counter() - t) * 1000
            warm = []
            for _ in range(5):
                t = time.perf_counter()
                await c.get(path, headers=h)
                warm.append((time.perf_counter() - t) * 1000)
            print(f"{path:30} cold {cold:7.0f} ms  warm p50 {statistics.median(warm):6.0f} ms  {len(resp.content) / 1024:7.0f} KB  {resp.status_code}")
        # Both views in turn, after a write: the order no longer changes a size.
        await c.post("/entries", headers=h, json={"content": f"bench {time.time()}"})
        a = {n["id"]: n["centrality"] for n in (await c.get(f"/graph/local/{first}", headers=h)).json()["nodes"]}
        b = {n["id"]: n["centrality"] for n in (await c.get("/graph", headers=h)).json()["nodes"]}
        same = sum(1 for k, v in a.items() if b.get(k) == v)
        print(f"focus nodes with the map's centrality: {same} of {len(a)}")


asyncio.run(main())
