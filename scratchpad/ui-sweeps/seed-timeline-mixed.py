"""Documents, reminders and boards to go with `seed-timeline-bulk.py`'s notes.

The Timeline's feed is a merge of three tables with three date columns and one
cursor per source (`api/routes_timeline.py`, `_encode_marks`). A merge is only
exercised when every source has more rows than a page holds: with two thousand
notes and one document, every page is notes and the document's mark is never
advanced, which is exactly the state the per-source cursor was proved in (three
rows, `tests/test_timeline.py`).

So this writes hundreds of each, spread across the same three years the notes
cover, which makes each page a genuine interleave and makes the second page
depend on three marks rather than one.

Straight into SQLite for the same reason the notes script gives: these rows
exist to be read by one endpoint, and a thousand POSTs through a browser is a
quarter of an hour of sweep time. It writes no search index and no embeddings,
which is the honest limit of the shortcut.

    .venv/bin/python scratchpad/ui-sweeps/seed-timeline-mixed.py \
        /tmp/mm-timeline-mix/memorymap.db 600 600 40
"""

import json
import random
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

db = sys.argv[1] if len(sys.argv) > 1 else "/tmp/mm-timeline-mix/memorymap.db"
documents = int(sys.argv[2]) if len(sys.argv) > 2 else 600
reminders = int(sys.argv[3]) if len(sys.argv) > 3 else 600
boards = int(sys.argv[4]) if len(sys.argv) > 4 else 40

TITLES = [
    "Lease", "Quarterly plan", "Conference talk", "House move", "Reading list",
    "Postmortem", "Onboarding", "Recipe book", "Budget 2026", "Trip itinerary",
]
BODIES = [
    "# {title}\n\nThe opening paragraph, long enough to be clipped by the feed's preview.",
    "# {title}\n\nA list of things, each of which was going to be one line and was not.",
]
ERRANDS = [
    "ring the landlord back", "renew the season ticket", "send the invoice",
    "book the dentist", "return the library books", "pay the water bill",
]

con = sqlite3.connect(db)
now = datetime.now(timezone.utc).replace(tzinfo=None)
random.seed(29)


def spread(i: int, total: int) -> datetime:
    """A moment in the same three years the notes cover, unevenly.

    Uneven on purpose, and interleaved with the notes rather than in a block at
    one end: a merge whose sources occupy different halves of the range is a
    merge that never has to choose between two sources inside one page.
    """
    return now - timedelta(
        days=int(random.random() ** 1.5 * 1080) + 1,
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


doc_rows = []
for i in range(documents):
    title = f"{TITLES[i % len(TITLES)]} {i}"
    when = spread(i, documents)
    doc_rows.append(
        (
            title,
            random.choice(BODIES).format(title=title),
            "md",
            when.isoformat(sep=" "),
            when.isoformat(sep=" "),
            "default",
        )
    )
con.executemany(
    "INSERT INTO documents (title, content, file_type, created_at, updated_at, "
    "workspace_id, archived_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    doc_rows,
)

rem_rows = []
for i in range(reminders):
    when = spread(i, reminders)
    rem_rows.append(
        (
            f"{ERRANDS[i % len(ERRANDS)]} ({i})",
            when.isoformat(sep=" "),
            #: A due date in the past is the normal case for a journal of what
            #: happened, which is what the Timeline is: the feed places a
            #: reminder on the day it was due, done or not.
            1 if i % 3 == 0 else 0,
            random.choice(["low", "normal", "high"]),
            when.isoformat(sep=" "),
            "default",
        )
    )
con.executemany(
    "INSERT INTO reminders (text, due_at, done, priority, created_at, workspace_id, "
    "entry_id, recurring) VALUES (?, ?, ?, ?, ?, ?, NULL, 'none')",
    rem_rows,
)

board_rows = []
for i in range(boards):
    when = spread(i, boards)
    board_rows.append(
        (
            #: The same content a real board has: `# <name>`, one heading and
            #: nothing else (`routes_whiteboard.py` writes exactly that; the
            #: topics live in their own tables). A seed that put the board's
            #: JSON here would make the feed's preview and word count read as
            #: `{"title": ...`, which is a fixture bug that looks like a
            #: product bug.
            f"# Map {i}",
            json.dumps(["ideas"]),
            when.isoformat(sep=" "),
            when.isoformat(sep=" "),
        )
    )
con.executemany(
    "INSERT INTO entries (content, category_id, tags, created_at, updated_at, "
    "is_deleted, is_private, pinned, workspace_id, ai_confidence, access_count, "
    "filing_state, user_filed, is_board, is_draft, source_path) "
    "VALUES (?, NULL, ?, ?, ?, 0, 0, 0, 'default', 0, 0, 'done', 0, 1, 0, '')",
    board_rows,
)

con.commit()
counts = {
    "documents": con.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
    "reminders": con.execute("SELECT COUNT(*) FROM reminders").fetchone()[0],
    "boards": con.execute("SELECT COUNT(*) FROM entries WHERE is_board = 1").fetchone()[0],
    "notes": con.execute(
        "SELECT COUNT(*) FROM entries WHERE is_board = 0 AND is_deleted = 0"
    ).fetchone()[0],
}
print(" ".join(f"{name} {count}" for name, count in counts.items()))
con.close()
