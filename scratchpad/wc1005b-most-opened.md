# Most opened this month: parked work (WORLD_CLASS_PLAN section 17 row 5)

Three files folded into one under the scratchpad cap; see docs/roadmap/agent-remaining/worldclass-1005b.md.

## opens.py.txt

````
"""Which notes were opened this month (WORLD_CLASS_PLAN section 17, row 5).

The Most used widget ranked by `access_count`, every open and every Ask
match since the note was written, so a note read daily in March outranked
the one in use this week for ever. "Most opened this month" needs to know
*when* each open was, and a count cannot say.

**A file, not a table**, for the reasons `core/usage.py` gives: a few
hundred counters read whole and written whole, no query, and no migration
shared with every other branch. One bucket per month, note id to opens; the
current month and the one before are kept, so the file stays the size of two
months of reading however long the notebook lives. Ids only, never text: a
private note's open is a number like any other.
"""

from __future__ import annotations

import json
import threading
from datetime import date
from pathlib import Path

from memorymap.core.atomic_io import atomic_write_text

#: Months kept: this one, so the widget has a month, and the last, so the
#: first days of a month are not an empty widget (the page may fall back to it).
KEEP_MONTHS = 2
#: Notes counted in one month at most: a bound on the file, far above any
#: month of real reading.
MAX_PER_MONTH = 5000

_lock = threading.Lock()


def _path(data_dir: Path) -> Path:
    return Path(data_dir) / "opens.json"


def month_key(today: date | None = None) -> str:
    return (today or date.today()).strftime("%Y-%m")


def read(data_dir: Path) -> dict[str, dict[str, int]]:
    try:
        data = json.loads(_path(data_dir).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def record(data_dir: Path, entry_id: int, today: date | None = None) -> None:
    """Count one open of this note in this month."""
    key = month_key(today)
    with _lock:
        log = read(data_dir)
        month = log.setdefault(key, {})
        if not isinstance(month, dict):
            month = log[key] = {}
        name = str(int(entry_id))
        if name in month or len(month) < MAX_PER_MONTH:
            month[name] = int(month.get(name, 0)) + 1
        for old in sorted(log)[:-KEEP_MONTHS]:
            del log[old]
        atomic_write_text(_path(data_dir), json.dumps(log, separators=(",", ":")))


def top(data_dir: Path, today: date | None = None, limit: int = 10) -> list[tuple[int, int]]:
    """This month's notes by opens, most first, then newest id: `(id, opens)`."""
    month = read(data_dir).get(month_key(today)) or {}
    pairs = []
    for name, count in month.items() if isinstance(month, dict) else []:
        try:
            pairs.append((int(name), int(count)))
        except (TypeError, ValueError):
            continue
    pairs.sort(key=lambda pair: (-pair[1], -pair[0]))
    return pairs[: max(0, limit)]

````

## routes_entries.patch

````
diff --git a/src/memorymap/api/routes_entries.py b/src/memorymap/api/routes_entries.py
index f26f188..f740a7d 100644
--- a/src/memorymap/api/routes_entries.py
+++ b/src/memorymap/api/routes_entries.py
@@ -39,7 +39,7 @@ from memorymap.api.schemas import (
     LinkOut,
     SimilarOut,
 )
-from memorymap.core import deps, events, jobruns, jobs, vault
+from memorymap.core import deps, events, jobruns, jobs, opens, vault
 from memorymap.core.events import ACTOR_USER_AND_AI
 from memorymap.core.database import (  # noqa: F401 (EntryLink used in link_suggestions)
     AuditLog,
@@ -2162,9 +2162,28 @@ def list_entries(
 
 # Declared before /{entry_id} so "most-accessed" isn't parsed as an id.
 @router.get("/most-accessed", response_model=list[EntryOut])
-def most_accessed(session: Session = Depends(get_session)) -> list[EntryOut]:
+def most_accessed(
+    period: str = Query(default="all", pattern="^(all|month)$"),
+    session: Session = Depends(get_session),
+) -> list[EntryOut]:
     """Top entries by how often they've been opened or matched a
-    question: the quick-access dashboard."""
+    question: the quick-access dashboard. `period=month` is the ten opened
+    most this month (WORLD_CLASS_PLAN section 17, row 5), from the opens log
+    (`core/opens.py`); a note binned, archived or in another space since is
+    left out, so the list is never a stale id."""
+    if period == "month":
+        ranked = opens.top(deps.get_config().data_dir, limit=30)
+        rows = {
+            e.id: e
+            for e in session.scalars(
+                select(Entry).where(
+                    Entry.id.in_([entry_id for entry_id, _ in ranked]),
+                    Entry.is_deleted == False,  # noqa: E712
+                    Entry.archived_at.is_(None),
+                )
+            )
+        }
+        return _to_out_bulk(session, [rows[i] for i, _ in ranked if i in rows][:10])
     entries = manager.most_accessed_entries(session, limit=5)
     return _to_out_bulk(session, entries)
 
@@ -2293,6 +2312,13 @@ def get_entry(
         if bool(getattr(entry, "is_private", False)) and vault.key() is not None:
             manager.log_action(session, "decrypted", "entry", entry.id)
         session.commit()
+        #: The month's opens (section 17, row 5): the count above cannot
+        #: say when. Best effort: the open has happened whether or not this
+        #: small file could be written (a read-only disk, a full one).
+        try:
+            opens.record(deps.get_config().data_dir, entry.id)
+        except OSError as exc:
+            logger.warning("Could not count this open: %s", type(exc).__name__)
     out = _to_out(session, entry)
     #: B7: the note's version as an HTTP entity tag, the same text hash the
     #: editor already sends back as `base_hash`, so a client that never reads
````

## test_most_opened_month_17.py.txt

````
"""WORLD_CLASS_PLAN row 11, section 17's fifth row: the ten notes opened
most this month. `access_count` cannot say when, so each open is counted in
its month (`core/opens.py`, a file beside the database), and the Most used
widget can ask for this month."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from memorymap.core import deps, opens

ROOT = Path(__file__).resolve().parents[1]


def test_an_open_counts_in_its_month(tmp_path):
    opens.record(tmp_path, 7, date(2026, 10, 3))
    opens.record(tmp_path, 7, date(2026, 10, 4))
    opens.record(tmp_path, 9, date(2026, 10, 4))
    opens.record(tmp_path, 9, date(2026, 9, 30))
    assert opens.top(tmp_path, date(2026, 10, 5)) == [(7, 2), (9, 1)]
    assert opens.top(tmp_path, date(2026, 9, 1)) == [(9, 1)]


def test_only_two_months_are_kept(tmp_path):
    for month in (7, 8, 9, 10):
        opens.record(tmp_path, 1, date(2026, month, 1))
    assert sorted(opens.read(tmp_path)) == ["2026-09", "2026-10"]


def test_a_broken_file_reads_as_empty(tmp_path):
    (tmp_path / "opens.json").write_text("{not json", encoding="utf-8")
    assert opens.top(tmp_path) == []
    opens.record(tmp_path, 3)
    assert opens.top(tmp_path) == [(3, 1)]


def test_most_accessed_this_month_follows_opens_not_the_all_time_count(client):
    old = client.post("/entries", json={"content": "read every day in spring"}).json()
    new = client.post("/entries", json={"content": "the note in use this week"}).json()
    from memorymap.core.database import Entry

    with deps.get_db().session() as session:
        session.get(Entry, old["id"]).access_count = 40
        session.commit()
    for _ in range(3):
        client.get(f"/entries/{new['id']}")
    month = client.get("/entries/most-accessed", params={"period": "month"}).json()
    assert [e["id"] for e in month][:1] == [new["id"]]
    assert old["id"] not in [e["id"] for e in month]
    # All time is unchanged: the old note's count still leads it.
    assert client.get("/entries/most-accessed").json()[0]["id"] == old["id"]


def test_a_binned_note_is_not_listed_for_the_month(client):
    note = client.post("/entries", json={"content": "about to be binned"}).json()
    client.get(f"/entries/{note['id']}")
    client.delete(f"/entries/{note['id']}")
    month = client.get("/entries/most-accessed", params={"period": "month"}).json()
    assert note["id"] not in [e["id"] for e in month]


def test_the_widget_offers_this_month_and_all_time():
    dash = (ROOT / "frontend" / "js" / "dashboard.js").read_text(encoding="utf-8")
    widget = dash.split("async function renderMostUsedWidget", 1)[1].split("\n}\n", 1)[0]
    assert "period=month" in widget
    # Two exclusive choices are a `.seg` (DESIGN.md's recipe index).
    assert '"seg' in widget and "aria-pressed" in widget
````
