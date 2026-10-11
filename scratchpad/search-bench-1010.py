"""Brief 47's gate: `GET /search` at 5,000 notes, p50 and p90.

    # 1. build the notebook (scripts/scale_test.py's `build_notebook`, 5,000 notes)
    MEMORYMAP_DATA_DIR=<dir> PYTHONPATH=src .venv/bin/python scratchpad/search-bench-1010.py build
    # 2. serve <dir> on a port, then time the route over HTTP
    .venv/bin/python scratchpad/search-bench-1010.py time 8817

Queries cover a word in a quarter of the notes, a rare word, an operator-only
query, a combined query, a typo and a page-2 request. Each is asked 20 times
after one warm call; p50 and p90 are over all of them, and per query.
"""
import sys
import time

QUERIES = [
    "recipe",
    "deadline client",
    "tag:tag3",
    "garden -bean",
    '"water plant"',
    "kind:note after:2020-01-01",
    "projct",
    "quillnote",
]


def build() -> None:
    sys.path.insert(0, "scripts")
    sys.path.insert(0, "src")
    from scale_test import build_notebook

    from memorymap.core import deps

    with deps.get_db().session() as session:
        build_notebook(session, 5000)
        from memorymap.search import index

        print("index counts", index.counts(session))


def timed(port: str) -> None:
    import requests

    base = f"http://127.0.0.1:{port}"
    answer = requests.post(f"{base}/auth/unlock", json={"password": "testpassword123"}, timeout=30)
    if answer.status_code == 400:  # a fresh notebook: set the password the sweeps use
        answer = requests.post(f"{base}/auth/setup", json={"password": "testpassword123"}, timeout=30)
    token = answer.json().get("token", "")
    headers = {"X-Auth-Token": token}
    every = []
    for q in QUERIES:
        for page in (1, 2) if q == "recipe" else (1,):
            params = {"q": q, "limit": 30, "page": page}
            requests.get(f"{base}/search", params=params, headers=headers, timeout=30)
            runs = []
            for _ in range(20):
                t = time.perf_counter()
                r = requests.get(f"{base}/search", params=params, headers=headers, timeout=30)
                runs.append((time.perf_counter() - t) * 1000)
                assert r.status_code == 200, r.text[:200]
            runs.sort()
            every.extend(runs)
            body = r.json()
            print(f"{q!r:32} page {page}: p50 {runs[10]:6.1f} ms  p90 {runs[18]:6.1f} ms  hits {len(body['hits'])} more {body['more']}")
    every.sort()
    print(f"all: p50 {every[len(every) // 2]:.1f} ms  p90 {every[int(len(every) * 0.9)]:.1f} ms  n={len(every)}")


if __name__ == "__main__":
    if sys.argv[1] == "build":
        build()
    else:
        timed(sys.argv[2])
