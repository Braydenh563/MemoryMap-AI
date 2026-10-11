"""The skill fixtures and their scorer (AGENT_SKILLS_REFORM Phase E, decision 1).

Each shipped skill has three cases in `tests/fixtures/skills/<slug>.json`:
a notebook, an instruction (the inputs) and the expected writes. A run is
scored against the notebook before and after it:

* **pass**: every expected write holds and every step ended `done`;
* **partial**: some of it held;
* **fail**: nothing expected held, or no step got done.

`tests/test_skill_fixtures.py` checks the fixtures and this scorer without a
model; `tests/test_skills_evals.py` runs every case against a real one and
reports the rate per skill. Not named `test_*.py` on purpose.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

from sqlalchemy import func, select

FIXTURES = Path(__file__).parent / "fixtures" / "skills"

#: The expected-writes vocabulary. Each key reads the snapshots below; a key
#: outside this list fails `test_skill_fixtures.py`. Pairs are note indices in
#: the case's notebook; groups are names of which at most one may remain.
EXPECT_KEYS = (
    "unchanged",
    "notes_kept",
    "untagged_max",
    "linked_pairs",
    "unlinked_pairs",
    "reminders_added_min",
    "documents_created_min",
    "tags_merged",
    "categories_merged",
    "answer_mentions",
)

#: What the small model class must reach to keep a skill in its palette
#: (decision 2). Mirrored by `ai/data/skill_rates.json`'s threshold.
SMALL_CLASS_BAR = 0.8


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def load_all() -> dict[str, dict]:
    """Every fixture file, by the skill name it is about."""
    out = {}
    for path in sorted(FIXTURES.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["_path"] = path.name
        out[data["skill"]] = data
    return out


def seed(session, notebook: list[dict]) -> list[int]:
    """Write a case's notebook, notes then links by index; the new note ids."""
    from memorymap.core.database import EntryLink
    from memorymap.entry import manager

    made = [
        manager.create_entry(session, note["content"], note.get("category") or manager.UNCATEGORISED, list(note.get("tags") or []))
        for note in notebook
    ]
    for note, entry in zip(notebook, made):
        for other in note.get("links") or []:
            session.add(EntryLink(source_entry_id=entry.id, target_entry_id=made[other].id))
    session.commit()
    return [entry.id for entry in made]


def snapshot(session) -> dict:
    """What the expected writes are read from."""
    from memorymap.core.database import Category, Document, Entry, EntryLink, Reminder

    live = session.scalars(select(Entry).where(Entry.is_deleted == False)).all()  # noqa: E712
    tags = {entry.id: {t.lower() for t in json.loads(entry.tags or "[]")} for entry in live}
    links = session.execute(select(EntryLink.source_entry_id, EntryLink.target_entry_id)).all()
    return {
        "notes": {entry.id: (entry.content, entry.category_id, sorted(tags[entry.id])) for entry in live},
        "untagged": sum(1 for found in tags.values() if not found),
        "tags": set().union(*tags.values()) if tags else set(),
        "links": {frozenset(pair) for pair in links},
        "reminders": session.scalar(select(func.count()).select_from(Reminder)) or 0,
        "documents": session.scalar(select(func.count()).select_from(Document)) or 0,
        "categories": {name.lower() for name in session.scalars(select(Category.name))},
    }


def _mentions(answer: str, words: list[str]) -> bool:
    folded = answer.lower()
    return all(word.lower() in folded for word in words)


def _pairs(ids: list[int], pairs: list[list[int]]) -> set[frozenset]:
    return {frozenset((ids[a], ids[b])) for a, b in pairs}


def _at_most_one(present: set[str], groups: list[list[str]]) -> bool:
    return all(len(present & {name.lower() for name in group}) <= 1 for group in groups)


def checks(expect: dict, before: dict, after: dict, answer: str, ids: list[int]) -> dict[str, bool]:
    """Each expected write, held or not."""
    table = {
        "unchanged": lambda want: (before["notes"], before["links"], before["reminders"])
        == (after["notes"], after["links"], after["reminders"]),
        "notes_kept": lambda want: set(before["notes"]) <= set(after["notes"]),
        "untagged_max": lambda want: after["untagged"] <= want,
        "linked_pairs": lambda want: _pairs(ids, want) <= after["links"],
        "unlinked_pairs": lambda want: not (_pairs(ids, want) & after["links"]),
        "reminders_added_min": lambda want: after["reminders"] - before["reminders"] >= want,
        "documents_created_min": lambda want: after["documents"] - before["documents"] >= want,
        "tags_merged": lambda want: _at_most_one(after["tags"], want),
        "categories_merged": lambda want: _at_most_one(after["categories"], want),
        "answer_mentions": lambda want: _mentions(answer, want),
    }
    return {key: bool(table[key](want)) for key, want in expect.items()}


def step_outcomes(events: list[dict]) -> dict[int, dict]:
    """The last state each step reached, which is its outcome."""
    last: dict[int, dict] = {}
    for event in events:
        if event.get("type") == "step":
            last[event["index"]] = event
    return last


def score(expect: dict, before: dict, after: dict, answer: str, steps: dict[int, dict], ids: list[int]) -> dict:
    """pass, partial or fail, with the first step that did not get done."""
    held = checks(expect, before, after, answer, ids)
    undone = [index for index, event in sorted(steps.items()) if event.get("state") != "done"]
    failed = undone[0] if undone else None
    done_any = len(undone) < len(steps) or not steps
    if all(held.values()) and failed is None:
        outcome = "pass"
    elif any(held.values()) and done_any:
        outcome = "partial"
    else:
        outcome = "fail"
    return {
        "outcome": outcome,
        "checks": held,
        "failed_step": failed,
        "reason": (steps[failed].get("reason") or steps[failed].get("state")) if failed is not None else "",
    }


def answer_text(events: list[dict]) -> str:
    return "".join(str(event.get("delta") or "") for event in events if event.get("type") == "answer")


def run_case(client, skill: str, case: dict) -> dict:
    """Seed, run the skill over `/chat/stream` as the app runs it, and score."""
    from memorymap.core import deps

    with deps.get_db().session() as session:
        ids = seed(session, case["notebook"])
        before = snapshot(session)
    body = {"question": skill, "skill": skill, "skill_inputs": case.get("inputs") or {}}
    started, first_step = time.monotonic(), None
    events = []
    with client.stream("POST", "/chat/stream", json=body) as response:
        for line in response.iter_lines():
            if not line.strip():
                continue
            events.append(json.loads(line))
            if first_step is None and events[-1].get("type") == "step":
                first_step = time.monotonic() - started
    seconds = time.monotonic() - started
    with deps.get_db().session() as session:
        after = snapshot(session)
    report = score(case["expect"], before, after, answer_text(events), step_outcomes(events), ids)
    steps = max(1, len(report_steps := step_outcomes(events)))
    report.update(
        case=case["id"],
        seconds=round(seconds, 1),
        first_step_seconds=round(first_step, 1) if first_step is not None else None,
        seconds_per_step=round(seconds / steps, 1),
        steps=len(report_steps),
    )
    return report


def rates(reports: list[dict]) -> dict:
    """One skill's reports folded into its row of the measured table."""
    counts = {kind: sum(1 for r in reports if r["outcome"] == kind) for kind in ("pass", "partial", "fail")}
    failed = next((r for r in reports if r["outcome"] != "pass"), None)
    return {
        **counts,
        "rate": round(counts["pass"] / len(reports), 2) if reports else 0.0,
        "failed_step": failed["failed_step"] if failed else None,
        "reason": failed["reason"] if failed else "",
    }
