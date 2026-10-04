"""The Timeline's "auto" bucket scale, over the notebook shapes it was tuned on.

`timelineAutoScale` (frontend/js/timeline.js) is a pure function of the density
strip, `{day: items}`. These are the shapes `scratchpad/ui-sweeps/timelinetune.js`
measured (rows on screen, empty-gap ratio, first paint at 1440 and 390; see
TIMELINE_PLAN's "auto scale" entry in HISTORY), plus the edges: an empty
notebook, one note, a decade of months.

The done-when the thresholds were chosen against: no feed of headers more than
60% empty calendar, no scale with a median under two items per header once there
is more than a screen of headers, never more than 120 headers, and the densest
day readable (it is: a day is a vertical list, and no width scrolls sideways).
"""

from __future__ import annotations

import json
import random
import shutil
import subprocess
from datetime import date, timedelta
from pathlib import Path

import pytest

JS = Path(__file__).resolve().parent.parent / "frontend" / "js" / "timeline.js"
ANCHOR = date(2026, 10, 4)


def _between(text: str, start: str, end: str) -> str:
    begin = text.index(start)
    return text[begin : text.index(end, begin)]


def _density(days_back: list[int]) -> dict[str, int]:
    out: dict[str, int] = {}
    for back in days_back:
        key = (ANCHOR - timedelta(days=back)).isoformat()
        out[key] = out.get(key, 0) + 1
    return out


def _shapes() -> dict[str, dict[str, int]]:
    rnd = random.Random(7)
    burst = [rnd.randint(100, 129) for _ in range(140)] + [rnd.randint(0, 364) for _ in range(60)]
    steady = [int(rnd.random() * 730) for _ in range(2000)]
    long_ = [
        min(1825, int(rnd.random() ** 2 * 1825) + rnd.choice([0, 0, 0, 2, 9, 30])) for _ in range(5000)
    ]
    return {
        "empty": {},
        "one note": _density([3]),
        "week of 30": _density([rnd.randint(0, 6) for _ in range(30)]),
        "three notes a year apart": _density([0, 365, 730]),
        "burst, last 90 days": _density([b for b in burst if b < 90]),
        "burst, last year": _density(burst),
        "steady, 90 days": _density([b for b in steady if b < 90]),
        "steady, a year": _density([b for b in steady if b < 365]),
        "steady, two years": _density(steady),
        "5,000 over 5 years, 90 days": _density([b for b in long_ if b < 90]),
        "5,000 over 5 years, a year": _density([b for b in long_ if b < 365]),
        "5,000 over 5 years": _density(long_),
        "a note a week for 5 years": _density(list(range(0, 1820, 7))),
        "a note a day for 9 years": _density(list(range(0, 3285))),
        "a note a day for 12 years": _density(list(range(0, 4380))),
    }


EXPECTED = {
    "empty": "day",
    "one note": "day",
    "week of 30": "day",
    "three notes a year apart": "day",
    # 15 day headers over 90 days is 83% empty calendar: week reads, day does not.
    "burst, last 90 days": "week",
    "burst, last year": "week",
    "steady, 90 days": "day",
    "steady, a year": "week",
    "steady, two years": "week",
    "5,000 over 5 years, 90 days": "day",
    "5,000 over 5 years, a year": "week",
    "5,000 over 5 years": "month",
    "a note a week for 5 years": "month",
    "a note a day for 9 years": "month",
    "a note a day for 12 years": "year",
}


def _run(shapes: dict[str, dict[str, int]]) -> dict[str, str]:
    source = JS.read_text(encoding="utf-8")
    key_fn = _between(source, "function timelineBucketKey", "// The header a bucket wears")
    auto = _between(source, "const TIMELINE_AUTO_MAX_HEADERS", "// Cached on the strip itself")
    script = (
        key_fn
        + auto
        + "\nconst shapes = "
        + json.dumps(shapes)
        + ";\nconst out = {};\n"
        + "for (const [name, density] of Object.entries(shapes)) out[name] = timelineAutoScale(density);\n"
        + "console.log(JSON.stringify(out));\n"
    )
    done = subprocess.run(["node", "-"], input=script, capture_output=True, text=True, timeout=60)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_auto_picks_the_scale_the_measurement_chose_for_each_shape():
    assert _run(_shapes()) == EXPECTED


@pytest.mark.skipif(not shutil.which("node"), reason="needs node")
def test_the_chosen_scale_always_meets_the_stated_done_when():
    """Recomputed in Python from the same strip, so the JS cannot quietly drift
    from the rule it documents."""
    shapes = _shapes()
    chosen = _run(shapes)

    def key(day: date, scale: str) -> date:
        if scale == "day":
            return day
        if scale == "week":
            return day - timedelta(days=day.weekday())
        if scale == "month":
            return day.replace(day=1)
        return day.replace(month=1, day=1)

    for name, density in shapes.items():
        if not density:
            continue
        scale = chosen[name]
        per: dict[date, int] = {}
        for day, n in density.items():
            k = key(date.fromisoformat(day), scale)
            per[k] = per.get(k, 0) + n
        if scale == "year":
            continue  # only a decade of months reaches it; the cap is the point
        assert len(per) <= 120, name
        if len(per) > 12 and scale != "month":
            counts = sorted(per.values())
            assert counts[len(counts) // 2] >= 2, name
            lo, hi = min(per), max(per)
            step = 1 if scale == "day" else 7
            span = (hi - lo).days // step + 1
            assert 1 - len(per) / span <= 0.6, name


def test_the_feed_asks_the_resolver_with_no_argument_and_caches_it_on_the_strip():
    source = JS.read_text(encoding="utf-8")
    assert "timelineResolvedScale()" in source
    assert "timelineAutoCache.density !== timelineDensity" in source
