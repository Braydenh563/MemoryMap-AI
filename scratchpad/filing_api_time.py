"""Time-to-filed through a RUNNING server, no browser (INBOX 434).

  BASE=http://127.0.0.1:8844 python scratchpad/filing_api_time.py [N] [POLL_MS]

Saves N notes with `defer_filing` one after another and polls
`GET /entries/{id}` the way captureaudit.js does; prints filed_ms per note
and the median. POLL_MS defaults to 50 (the audit's own).
"""
import json
import os
import statistics
import sys
import time
import urllib.request

BASE = os.environ.get("BASE", "http://127.0.0.1:8844")
N = int(sys.argv[1]) if len(sys.argv) > 1 else 8
POLL = int(sys.argv[2]) if len(sys.argv) > 2 else 50


def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("X-Auth-Token", token)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b"null")


token = call("POST", "/auth/unlock", {"password": "testpassword123"})["token"]
topics = ["tomato sauce with basil", "squats and deadlifts at the gym", "quarterly planning with the team",
          "flights to lisbon and a hotel", "prune the roses before frost", "sourdough starter feeding"]
times = []
for i in range(N):
    text = f"{topics[i % len(topics)]} filing probe {time.time():.3f}"
    made = call("POST", "/entries", {"content": text, "defer_filing": True}, token)
    t0 = time.perf_counter()
    while True:
        e = call("GET", f"/entries/{made['id']}", token=token)
        if e["filing_state"] != "pending":
            break
        time.sleep(POLL / 1000)
    ms = (time.perf_counter() - t0) * 1000
    times.append(ms)
    print(f"  note {made['id']}: filed_ms={ms:.0f} ({e['category']}, {e['filing_state']})")
    time.sleep(1.5)  # let the rest of the job finish: each note is measured alone
print(f"median filed_ms={statistics.median(times):.0f}  max={max(times):.0f}")
