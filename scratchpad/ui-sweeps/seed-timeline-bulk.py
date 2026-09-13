"""Two thousand notes, spread over three years, straight into the database.

TIMELINE_PLAN Phase 3's gate is "a 2,000-note seed scrolls without a horizontal
bar and without a > 100ms frame during paging", and 2,000 `POST /entries` calls
through a browser is a quarter of an hour of sweep time for a fixture. These
rows exist to be *read*: the timeline endpoint selects entries by date and
reads their text, categories and tags, all of which this writes.

What it deliberately does not write is the search index, so a note seeded here
is not findable from the search box. That is the honest limit of the shortcut,
and it is why this is a sweep fixture rather than anything a test of search
should use.

    .venv/bin/python scratchpad/ui-sweeps/seed-timeline-bulk.py /tmp/mm-timeline/memorymap.db 2000
"""

import json
import random
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

db = sys.argv[1] if len(sys.argv) > 1 else "/tmp/mm-timeline/memorymap.db"
count = int(sys.argv[2]) if len(sys.argv) > 2 else 2000

TITLES = [
    "Weekly review", "Reading notes", "Standup", "Retro actions", "Trip planning",
    "Recipe", "Budget", "Interview notes", "Paper notes", "Training log",
    "Shopping", "Ideas", "Bug hunt", "Design notes", "Call with the bank",
]
BODIES = [
    "Shipped the sweep tooling; next is component consistency by count.",
    "Three books queued, one half finished, and a fourth recommended twice.",
    "Agreed the plan, three workstreams, review on the twentieth.",
    "Roast the tomatoes first and add a little smoked paprika at the end.",
    "What went well: measuring before changing. What did not: reading instead of running.",
]

con = sqlite3.connect(db)
categories = [row[0] for row in con.execute("SELECT id FROM categories")]
if not categories:
    categories = [None]
now = datetime.now(timezone.utc).replace(tzinfo=None)
random.seed(11)

rows = []
for i in range(count):
    # Uneven on purpose: a strip of writing that is the same height everywhere
    # is a strip that proves nothing about the thing it is drawn for. Three
    # years back, with bursts.
    burst = random.choice([1, 1, 1, 3, 14, 60])
    when = now - timedelta(
        days=min(1095, int(random.random() ** 2 * 1095) + burst),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    title = TITLES[i % len(TITLES)]
    body = BODIES[i % len(BODIES)]
    rows.append(
        (
            f"# {title} {i}\n\n{body}",
            random.choice(categories),
            json.dumps([random.choice(["work", "personal", "ideas", "reading", "health"])]),
            when.isoformat(sep=" "),
            when.isoformat(sep=" "),
        )
    )

con.executemany(
    "INSERT INTO entries (content, category_id, tags, created_at, updated_at, "
    "is_deleted, is_private, pinned, workspace_id, ai_confidence, access_count, "
    "filing_state, user_filed, is_board, is_draft, source_path) "
    "VALUES (?, ?, ?, ?, ?, 0, 0, 0, 'default', 0, 0, 'done', 0, 0, 0, '')",
    rows,
)
con.commit()
total = con.execute("SELECT COUNT(*) FROM entries WHERE is_deleted = 0").fetchone()[0]
span = con.execute("SELECT MIN(created_at), MAX(created_at) FROM entries").fetchone()
print(f"entries {total} from {span[0]} to {span[1]}")
con.close()
