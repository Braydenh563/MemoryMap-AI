"""Row 1661: the server's resident memory over a long seeded session.

Each lap creates SEED notes (3 unless set; 0 for none), then GETs every path
a browser session's boot and tab switches asked for, and every fifth lap
samples the server's RSS. Usage: memserver.py BASE PID MINUTES.
"""

from __future__ import annotations

import json
import os
import random
import subprocess
import sys
import time

import requests

#: Taken from one browser session's access log, 2026-10-11.
PATHS = [
    "/ask-history/stats",
    "/auth/lan-watch?since=-1",
    "/auth/status",
    "/backups/integrity",
    "/capture/command",
    "/categories",
    "/changelog",
    "/chat/modes",
    "/chat/recent",
    "/chat/suggestions",
    "/conversations",
    "/conversations?limit=1",
    "/desktop/fullscreen",
    "/documents",
    "/entries/most-accessed",
    "/entries/reference-counts?ids=22,21,20,19,18,17,16,15,14,13,12,11,10,8,7,6,5,4,3,2,1",
    "/entries?limit=200",
    "/files/exports",
    "/graph/topics/of?ids=22,21,20,19,18,17,16,15,14,13,12,11,10,8,7,6,5,4,3,2,1",
    "/health",
    "/help/sample-notebook",
    "/help/topics",
    "/insights/day",
    "/insights/greeting?block=[redacted]",
    "/insights/heatmap",
    "/insights/patterns",
    "/insights/stats",
    "/jobs/last-runs",
    "/models/sampling",
    "/models/status",
    "/models/suggested",
    "/preferences",
    "/preferences/defaults",
    "/privacy/verdict",
    "/questions/counts?ids=22,21,20,19,18,17,16,15,14,13,12,11,10,8,7,6,5,4,3,2,1",
    "/read?q=[redacted]&tz_offset_minutes=[redacted]&now=[redacted]&locale=[redacted]&surface=[redacted]",
    "/reminders/counts?ids=22,21,20,19,18,17,16,15,14,13,12,11,10,8,7,6,5,4,3,2,1",
    "/reminders?include_done=[redacted]",
    "/reminders?limit=200&offset=0",
    "/review-queue?limit=1",
    "/skills",
    "/spaces",
    "/statistics",
    "/tasks",
    "/tidy",
    "/update/source-status",
    "/v1/models",
    "/whiteboard/boards?limit=200&offset=0",
] + [
    "/graph",
    "/timeline",
    "/search?q=note",
    "/search?q=meeting%20plan",
    "/entries?limit=60&offset=60",
]
WORDS = "plan meeting garden budget travel recipe idea book research project notes week review call".split()


def rss(pid: str) -> int:
    out = subprocess.run(
        ["ps", "-o", "rss=", "-p", pid], capture_output=True, text=True, check=False
    )
    return round(int(out.stdout.strip() or 0) / 1024)


def main() -> None:
    base, pid, minutes = sys.argv[1], sys.argv[2], float(sys.argv[3])
    seed = int(os.environ.get("SEED", "3"))
    session = requests.Session()
    unlocked = session.post(base + "/auth/unlock", json={"password": "testpassword123"}, timeout=60)
    unlocked.raise_for_status()
    session.headers["X-Auth-Token"] = unlocked.json()["token"]
    codes: dict[str, int] = {}
    started = time.time()
    lap = 0
    print(json.dumps({"lap": 0, "s": 0, "rss": rss(pid)}), flush=True)
    while time.time() - started < minutes * 60:
        lap += 1
        for _ in range(seed):
            text = " ".join(random.choice(WORDS) for _ in range(40))
            made = session.post(
                base + "/entries",
                json={"content": f"Seed {lap} {text}", "tags": [random.choice(WORDS)]},
                timeout=60,
            )
            codes[str(made.status_code)] = codes.get(str(made.status_code), 0) + 1
        for path in PATHS:
            try:
                got = session.get(base + path, timeout=60)
            except requests.RequestException:
                codes["error"] = codes.get("error", 0) + 1
                continue
            codes[str(got.status_code)] = codes.get(str(got.status_code), 0) + 1
        if lap % 5 == 0:
            print(
                json.dumps({"lap": lap, "s": round(time.time() - started), "rss": rss(pid)}),
                flush=True,
            )
    print(
        json.dumps(
            {"lap": lap, "s": round(time.time() - started), "rss": rss(pid), "codes": codes}
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
