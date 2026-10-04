"""Bucket statistics per scale from a data dir's notes, no browser needed.

    python scratchpad/ui-sweeps/timelinetune-shape.py /tmp/mm-tl-real [rangeDays]

For each scale: headers (non-empty buckets), items per header (mean and
median), the share of headers holding one item or none-but-the-date (`sparse`),
and the share of the calendar span's buckets that are empty (`gap`).
"""

import sqlite3
import statistics
import sys
from datetime import date, datetime, timedelta

d = sys.argv[1]
rng = int(sys.argv[2]) if len(sys.argv) > 2 else 0
con = sqlite3.connect(f"{d}/memorymap.db")
today = date.today()
days: dict[date, int] = {}
for (c,) in con.execute("SELECT created_at FROM entries WHERE is_deleted = 0"):
    day = datetime.fromisoformat(c).date()
    if rng and (today - day).days > rng:
        continue
    days[day] = days.get(day, 0) + 1


def key(day: date, scale: str):
    if scale == "day":
        return day
    if scale == "week":
        return day - timedelta(days=day.weekday())
    if scale == "month":
        return day.replace(day=1)
    return day.replace(month=1, day=1)


print(f"{d} range={rng or 'all'} items={sum(days.values())} active_days={len(days)}")
lo, hi = min(days), max(days)
for scale in ("day", "week", "month", "year"):
    per: dict = {}
    for day, n in days.items():
        per[key(day, scale)] = per.get(key(day, scale), 0) + n
    span, cur = set(), lo
    while cur <= hi:
        span.add(key(cur, scale))
        cur += timedelta(days=1)
    counts = list(per.values())
    sparse = sum(1 for n in counts if n <= 1) / len(counts)
    print(
        f"  {scale:5} headers {len(counts):5} mean {statistics.mean(counts):7.1f} "
        f"median {statistics.median(counts):6.1f} max {max(counts):5} "
        f"sparse {sparse:4.2f} gap {1 - len(counts) / len(span):4.2f}"
    )
