#!/usr/bin/env python3
"""One case for each Tidy review the showcase notebook has none of (INBOX 691).

    .venv/bin/python scratchpad/ui-sweeps/tidy691-seed.py 8828 <scratch>/mm-tidy

Run once, after seed-showcase.py. Notes go through the app's routes; the tag
Atlas "added" through the agent's tool door (`/chat/tools/execute`), so the log
says `ai:tag_note`; the overdue reminder straight into the database, because
the reminders route rightly refuses a due time in the past.
"""

from __future__ import annotations

import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

PORT = sys.argv[1] if len(sys.argv) > 1 else "8828"
DATA = Path(sys.argv[2]) if len(sys.argv) > 2 else None
BASE = f"http://127.0.0.1:{PORT}"
S = requests.Session()
status = S.get(BASE + "/auth/status", timeout=10).json()
route = "/auth/setup" if status.get("setup_required") else "/auth/unlock"
S.headers["X-Auth-Token"] = S.post(BASE + route, json={"password": "testpassword123"}, timeout=30).json()["token"]


def post(path: str, body: dict) -> dict:
    r = S.post(BASE + path, json=body, timeout=60)
    if not r.ok:
        raise SystemExit(f"{path}: {r.status_code} {r.text[:200]}")
    return r.json()


have = {e["content"] for e in S.get(BASE + "/entries?limit=1000", timeout=30).json()}
for body in (
    {"content": "todo"},
    {"content": "Call the plumber about the kitchen leak on Monday", "category": "Home"},
    {"content": "Call the plumber about the kitchen leak on Monday morning", "category": "Home"},
    {"content": "Feed the sourdough starter and check the crumb of the loaf", "category": "Uncategorised"},
    {"content": "Exam timetable for the spring term", "tags": ["study schedule"], "category": "Ideas"},
    {"content": "Library hours this week", "tags": ["study-schedule"], "category": "Ideas"},
):
    if body["content"] not in have:
        post("/entries", body)
travel = next(e for e in S.get(BASE + "/entries?limit=1000", timeout=30).json() if e.get("category") == "Travel")
post("/chat/tools/execute", {"name": "tag_note", "arguments": {"note_id": travel["id"], "add": ["gardening"]}})
if DATA:
    db = sqlite3.connect(DATA / "memorymap.db")
    due = (datetime.now(timezone.utc) - timedelta(days=40)).strftime("%Y-%m-%d %H:%M:%S.%f")
    if not db.execute("select 1 from reminders where text = 'Renew the passport'").fetchone():
        db.execute(
            "insert into reminders (text, due_at, done, priority, recurring, created_at, workspace_id) values (?, ?, 0, 'normal', 'none', ?, 'default')",
            ("Renew the passport", due, due),
        )
        db.commit()
print("seeded")
