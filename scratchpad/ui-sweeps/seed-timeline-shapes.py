"""Synthetic notebook shapes for tuning the Timeline's auto scale.

Takes a data dir that already has a schema (a copy of a real one) and replaces
its notes with one of four shapes, straight into SQLite (no search index, like
seed-timeline-bulk.py).

    python scratchpad/ui-sweeps/seed-timeline-shapes.py /tmp/mm-tl-week week

Shapes: week (30 notes, one week), burst (200 over a year, 140 of them in one
month), long (5,000 over 5 years, bursty), steady (2,000 over 2 years).
"""

import json
import random
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

d, shape = sys.argv[1], sys.argv[2]
random.seed(7)
now = datetime.now(timezone.utc).replace(tzinfo=None)


def days_back():
    if shape == "week":
        return [random.randint(0, 6) for _ in range(30)]
    if shape == "burst":
        month = [random.randint(100, 129) for _ in range(140)]
        return month + [random.randint(0, 364) for _ in range(60)]
    if shape == "steady":
        return [int(random.random() * 730) for _ in range(2000)]
    # long: 5 years, quadratic towards the present, with bursts
    return [
        min(1825, int(random.random() ** 2 * 1825) + random.choice([0, 0, 0, 2, 9, 30]))
        for _ in range(5000)
    ]


con = sqlite3.connect(f"{d}/memorymap.db")
for t in ("entries", "reminders", "documents"):
    try:
        con.execute(f"DELETE FROM {t}")
    except sqlite3.Error as e:
        print("skip", t, e)
cats = [r[0] for r in con.execute("SELECT id FROM categories")] or [None]
rows = []
for i, back in enumerate(days_back()):
    when = now - timedelta(days=back, hours=random.randint(0, 20), minutes=random.randint(0, 59))
    rows.append(
        (
            f"# Note {i}\n\nWhat happened: a line or two about item {i}, enough to wrap onto a second line in a day row.",
            random.choice(cats),
            json.dumps([random.choice(["work", "personal", "ideas"])]),
            when.isoformat(sep=" "),
            when.isoformat(sep=" "),
        )
    )
con.executemany(
    "INSERT INTO entries (content, category_id, tags, created_at, updated_at, is_deleted, is_private, "
    "pinned, workspace_id, ai_confidence, access_count, filing_state, user_filed, is_board, is_draft, "
    "source_path, suggested_tags, discarded_tags) "
    "VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'default', 0, 0, 'done', 0, 0, 0, '', '[]', '[]')",
    rows,
)
con.commit()
print(shape, con.execute("SELECT COUNT(*) FROM entries").fetchone()[0], "entries")
