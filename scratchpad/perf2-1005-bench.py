"""Route timings on a seeded 5,000-note notebook, in process.

    PYTHONPATH=src .venv/bin/python scratchpad/perf2-1005-bench.py FIXTURE_DB [route ...]

FIXTURE_DB is a seeded `memorymap.db` (the audit's was 5,032 notes with
384-wide `bench:hash` vectors). It is copied to a fresh temp dir per run so a
save measured here never changes the fixture. The embedder is a 384-wide hash
of the words, named `bench:hash` so the fixture's stored vectors are the
engine's vectors. Prints p50 / p95 / max in ms and the response size.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import statistics
import sys
import tempfile
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

DIM = 384


def _hash_vector(text: str) -> np.ndarray:
    vector = np.zeros(DIM, dtype="float32")
    for word in text.lower().split():
        h = int.from_bytes(hashlib.blake2b(word.encode(), digest_size=8).digest(), "little")
        vector[h % DIM] += 1.0 if (h >> 20) & 1 else -1.0
    norm = float(np.linalg.norm(vector))
    return vector / norm if norm else vector


def main() -> None:
    fixture = Path(sys.argv[1])
    only = set(sys.argv[2:])
    runs = int(os.environ.get("RUNS", "7"))
    tmp = Path(tempfile.mkdtemp(prefix="perf2-1005-"))
    data = tmp / "data"
    data.mkdir()
    shutil.copy(fixture, data / "memorymap.db")
    os.environ["MEMORYMAP_DATA_DIR"] = str(data)
    os.environ["MEMORYMAP_NO_AUTO_INSTALL"] = "1"

    from fastapi.testclient import TestClient

    from memorymap.ai.embeddings import EmbeddingService
    from memorymap.core import deps
    from tests.fakes import FakeOllama

    class HashEmbedder(EmbeddingService):
        def __init__(self) -> None:
            super().__init__(model_manager=None, ollama_client=None)  # type: ignore[arg-type]

        def backend_id(self) -> str:
            return "bench:hash"

        def active_model(self) -> str:
            return "bench-hash"

        def is_ready(self) -> bool:
            return True

        def embed_text(self, text: str):
            return _hash_vector(text)

    deps.init_app_state(data_dir=data)
    deps.override_ai(ollama=FakeOllama(running=False), embeddings=HashEmbedder())
    from memorymap.api.app import create_app

    client = TestClient(create_app())
    ids = [row["id"] for row in client.get("/entries?limit=60").json()]
    if isinstance(ids, dict):
        ids = []
    some = ids[0] if ids else 1
    body400 = " ".join(f"w{i % 300}" for i in range(400))

    def put_body():
        put_body.n += 1
        return {"content": f"edited {put_body.n} " + body400}

    put_body.n = 0

    routes = {
        "entries50": ("GET", "/entries?limit=50", None),
        "graph": ("GET", "/graph", None),
        "library": ("GET", "/library", None),
        "timeline": ("GET", "/timeline", None),
        "insights_stats": ("GET", "/insights/stats", None),
        "backlinks": ("GET", f"/entries/{some}/backlinks", None),
        "refcounts": ("GET", "/entries/reference-counts?ids=" + ",".join(map(str, ids[:60])), None),
        "duplicates": ("GET", "/duplicates", None),
        "link_suggestions": ("GET", "/entries/link-suggestions", None),
        "create400": ("POST", "/entries", lambda: {"content": "new note " + body400}),
        "create1": ("POST", "/entries", lambda: {"content": "garden budget for the spring"}),
        "put": ("PUT", f"/entries/{some}", put_body),
    }
    for name, (method, url, body) in routes.items():
        if only and name not in only:
            continue
        times = []
        size = 0
        status = None
        n = 1 if name in ("duplicates", "link_suggestions") else runs
        if os.environ.get("PROFILE") == name:
            import cProfile
            import pstats

            prof = cProfile.Profile()
            kwargs = {"json": body()} if body else {}
            prof.runcall(client.request, method, url, **kwargs)
            pstats.Stats(prof).sort_stats("cumulative").print_stats(35)
        for _ in range(n):
            t = time.perf_counter()
            kwargs = {"json": body()} if body else {}
            response = client.request(method, url, **kwargs)
            times.append((time.perf_counter() - t) * 1000)
            size = len(response.content)
            status = response.status_code
        times.sort()
        p95 = times[min(len(times) - 1, int(round(0.95 * (len(times) - 1))))]
        print(
            f"{name:18s} {status} p50 {statistics.median(times):8.0f}  p95 {p95:8.0f}  "
            f"max {times[-1]:8.0f} ms  {size / 1024:8.1f} KB",
            flush=True,
        )
    shutil.rmtree(tmp, ignore_errors=True)
    os._exit(0)


if __name__ == "__main__":
    main()
