"""What the notebook learned from being corrected (WORLD_CLASS_PLAN 15, I7).

A correction is the record of the app getting something wrong and the person
putting it right: a note re-filed out of the category the AI chose, a
suggested link dismissed, a search result opened after a question the ranking
answered badly, a resurfacing card sent away for good. Each one is a fact
about this notebook that no model was trained on and no amount of prompting
will rediscover, so each one is written down and read back by the thing that
is about to make the same decision again.

**Where corrections are stored, and why there is no new table.** The spec
(`tests/test_learned_spec.py`) names a `corrections` table; this module keeps
them in `AuditLog`, as `action="correction"` rows, and is the layer over that.
The reason, recorded because standing order 3 says a decision is not remade:

- There is already exactly one store, and it already works. A filing
  correction has been written by `entry/manager.update_entry_with_correction`
  and read by `ai/librarian.filing_corrections` since Brief 13. A second
  table beside it would mean two places a correction can live, which is the
  shape that ends with one of them quietly going stale.
- `AuditLog` is the event log Brief 7 built up: it has the
  `ix_audit_log_entity` index, a retention rule, compaction, and a feed that
  renders it. A corrections table would need all four again.
- The spec's own header allows it: "Module and function names below are the
  contract; a session that needs a different shape changes the test in the
  same commit, with the reason." This is that reason. The *functions* are
  exactly as specified; only the storage differs.

**What a boost is.** Corrections are facts; a boost is what a pile of the
same fact adds up to. `boosts()` folds the rows into a weight per subject,
bounded at `MAX_BOOST` so fifty corrections cannot drown the signal the
ranking is supposed to be using, and `decayed()` halves a weight every
`HALF_LIFE_DAYS`, so a rule the person has stopped reasserting fades instead
of becoming permanent. Both are deliberately arithmetic rather than learned:
there is no training here, and nothing to go wrong that a person cannot see
and undo.
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from memorymap.core.database import LIKE_ESCAPE, AuditLog, like_escape
from memorymap.core.logbuffer import safe_value

#: The most any pile of corrections is allowed to be worth. A boost is a nudge
#: to a ranking that already works, not a replacement for it: without a
#: ceiling, a question asked fifty times would pin one note to the top of
#: every search that shared a word with it.
MAX_BOOST = 1.0

#: How long a correction stays worth half of what it was. Thirty days is the
#: span over which "I always file these under Projects" stops being true
#: without anyone saying so, and it is the number the spec measures against.
HALF_LIFE_DAYS = 30.0

#: What one correction is worth before the ceiling and the decay. Small on
#: purpose: two of the same correction is the point at which a preference is
#: worth acting on, which is also what `centroid_excluded` reads.
PER_CORRECTION = 0.25

#: How many corrections away from a category make it wrong for notes like
#: these. Two, matching the spec, and matching the intuition: once is a
#: mistake, twice is a rule.
EXCLUDE_AFTER = 2

#: The kinds this module knows. Kept as a set so a typo in a `kind=` argument
#: is an error at the call rather than a row nothing will ever read back.
KINDS = frozenset(
    {
        "refile",
        "open_after_ask",
        "dismiss_link",
        # A suggested link the person made (GRAPH_PLAN KG9). Feeds no boost
        # family: with `dismiss_link` it feeds `signal_weights`, which signals
        # of a suggestion are worth believing in this notebook.
        "accept_link",
        # The suggestions inbox's other three kinds (KG9 part two): an entity
        # merge, a link type, a tension. Each feeds `signal_weights` through
        # its own accept and dismiss pair; a dismissal also keeps that one
        # suggestion from coming back.
        "accept_merge",
        "dismiss_merge",
        "accept_link_type",
        "dismiss_link_type",
        "accept_tension",
        "dismiss_tension",
        "dismiss_resurface",
        # The two the derived facts table writes (I9). They feed no boost
        # family: a deleted fact is already stopped from returning by its own
        # tombstone, and these rows exist so that "what has the app been
        # getting wrong" is answerable in one place rather than two.
        "delete_fact",
        "edit_fact",
        # The open questions view (I3, row 7): a question dropped, reopened,
        # or marked answered by hand. No boost family; recorded so "what has
        # the app been getting wrong" includes the answers it found.
        "drop_question",
        "reopen_question",
        "answer_question",
    }
)

#: Which family of boost each kind feeds. `boosts(kind="filing")` and
#: `boosts(kind="search")` are what the spec asks for, and they are groups of
#: correction kinds rather than kinds themselves: filing learns from re-files,
#: search learns from what got opened after a question.
FAMILIES: dict[str, tuple[str, ...]] = {
    "filing": ("refile",),
    "search": ("open_after_ask",),
    "links": ("dismiss_link",),
    "resurface": ("dismiss_resurface",),
}


@dataclass(frozen=True)
class Correction:
    """One recorded correction, in the shape the spec reads it back in.

    `from_value`/`to_value` rather than `from`/`to` because `from` is a Python
    keyword; the stored payload keeps the short names, which is what
    `librarian.filing_corrections` has always read.
    """

    id: int
    kind: str
    subject: dict[str, Any]
    from_value: str | None
    to_value: str | None
    excerpt: str
    at: Any


def _payload(row: AuditLog) -> dict:
    raw = row.payload
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except ValueError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _as_correction(row: AuditLog) -> Correction:
    payload = _payload(row)
    subject = payload.get("subject")
    if not isinstance(subject, dict):
        # A row written before this module existed: `update_entry_with_correction`
        # stored the entry id on the row itself and nothing else, so the subject
        # is reconstructed rather than treated as missing. This is the whole
        # point of keeping one store: yesterday's corrections still count.
        subject = {"entry_id": row.entity_id} if row.entity_id else {}
    return Correction(
        id=row.id,
        kind=str(payload.get("kind") or "refile"),
        subject=subject,
        from_value=(payload.get("from") or None),
        to_value=(payload.get("to") or None),
        excerpt=str(payload.get("excerpt") or ""),
        at=row.created_at,
    )


def record(
    session: Session,
    *,
    kind: str,
    subject: dict[str, Any],
    from_value: str | None = None,
    to_value: str | None = None,
    excerpt: str = "",
) -> Correction:
    """Write one correction. The only writer.

    Not routed through `events.record`: a correction must never be folded into
    the write that provoked it. `entry/manager.update_entry_with_correction`
    already says why at length, and the short version is that a correction is
    a second, separately readable fact about the same moment, and folded into
    the edit it is invisible to the query that looks for it.
    """
    if kind not in KINDS:
        logging.getLogger("memorymap.learning").warning(
            "unknown correction kind %s; known: %s", safe_value(kind, 60), sorted(KINDS)
        )
        raise ValueError("That isn't a kind of correction the notebook learns from.")
    payload: dict[str, Any] = {"kind": kind, "subject": dict(subject)}
    if from_value is not None:
        payload["from"] = from_value
    if to_value is not None:
        payload["to"] = to_value
    if excerpt:
        payload["excerpt"] = " ".join(excerpt.split())[:200]
    row = AuditLog(
        action="correction",
        entity_type="entry",
        entity_id=subject.get("entry_id"),
        detail=f"{kind}: {from_value or ''} -> {to_value or ''}".strip(),
        payload=payload,
        actor="user",
    )
    session.add(row)
    session.flush()
    return _as_correction(row)


def corrections(session: Session, kind: str | None = None, limit: int = 500) -> list[Correction]:
    """Corrections, oldest first, optionally of one kind.

    Oldest first because every reader of these is building a history ("you
    have moved three of these"), and a history reads forwards.

    **The kind narrows the query, not the page.** It used to filter in Python
    after taking the newest `limit` rows of *every* kind, which quietly broke
    the promise this whole module exists to keep: measured, one
    `dismiss_resurface` followed by 600 refiles, and asking for the
    dismissals returned none, so a card told "never again" came back the
    moment the notebook had been filed in enough times. This table only ever
    grows, so that was a matter of time rather than of scale.

    `detail` carries the kind as its own prefix (`record` writes
    `f"{kind}: ..."`), which is what makes the narrowing possible without a
    column: SQLite has no JSON operator here. The payload stays the
    authority, so the Python check below still runs; SQL only decides which
    rows are worth reading.
    """
    query = select(AuditLog).where(AuditLog.action == "correction")
    if kind is not None:
        narrowed = AuditLog.detail.like(f"{like_escape(kind)}:%", escape=LIKE_ESCAPE)
        if kind == "refile":
            #: `manager.update_entry` writes a move by hand as "moved from X
            #: to Y" with no kind in its payload (`_as_correction` reads that
            #: as a refile). Narrowed on "refile:" alone, every refile made in
            #: the app was invisible here, so neither the filing prompt nor
            #: the centroid exclusion ever saw one (found 2026-10-05, row 20).
            narrowed = or_(narrowed, AuditLog.detail.like("moved from %"))
        query = query.where(narrowed)
    rows = session.scalars(query.order_by(AuditLog.id.desc()).limit(limit)).all()
    found = [_as_correction(row) for row in rows]
    if kind is not None:
        found = [item for item in found if item.kind == kind]
    return list(reversed(found))


#: How many of the notes the AI filed most recently the accuracy line reads
#: (I7: "Filing accuracy 71% to 89% over the last 200 notes").
ACCURACY_WINDOW = 200
#: The fewest notes in each half before the line compares them. Under it, one
#: refile moves a half by ten points or more, which is noise said as a trend.
ACCURACY_MIN_HALF = 10


def filing_accuracy(session: Session, window: int = ACCURACY_WINDOW) -> dict:
    """The "Learned from you" line's numbers (WORLD_CLASS_PLAN row 20, I7).

    A note the AI filed is one whose `filing_state` says so (auto, stand-in,
    words) or one the person has refiled (the move sets it to `done`); it was
    filed right if the person never moved it. Over the last `window` of them,
    by id: `accuracy` for all of them, and `earlier`/`later` for the older and
    newer halves, so the line can say whether learning from the moves helped.
    Percentages are whole numbers; None where there is nothing to divide.
    """
    from memorymap.core.database import Entry
    from memorymap.entry import manager

    refiled = {
        row.entity_id
        for row in session.scalars(
            select(AuditLog).where(
                AuditLog.action == "correction",
                AuditLog.entity_type == "entry",
                AuditLog.entity_id.is_not(None),
                or_(AuditLog.detail.like("moved from %"), AuditLog.detail.like("refile:%")),
            )
        )
    }
    auto_states = (manager.AUTO_FILED, manager.STAND_IN, manager.WORDS_FILED)
    filters = [Entry.filing_state.in_(auto_states)]
    if refiled:
        filters.append(Entry.id.in_(refiled))
    ids = list(
        reversed(
            session.scalars(
                select(Entry.id)
                .where(Entry.is_deleted.is_(False), or_(*filters))
                .order_by(Entry.id.desc())
                .limit(max(1, window))
            ).all()
        )
    )

    def share(part: list[int]) -> int | None:
        if not part:
            return None
        return round(100 * sum(1 for i in part if i not in refiled) / len(part))

    half = len(ids) // 2
    split = half >= ACCURACY_MIN_HALF
    total = session.scalar(
        select(func.count(AuditLog.id)).where(AuditLog.action == "correction")
    ) or 0
    return {
        "corrections": int(total),
        "refiles": sum(1 for i in ids if i in refiled),
        "notes": len(ids),
        "window": window,
        "accuracy": share(ids),
        "earlier": share(ids[: len(ids) - half]) if split else None,
        "later": share(ids[len(ids) - half :]) if split else None,
    }


def decayed(weight: float, days: float) -> float:
    """What a weight is worth `days` later. Halves every `HALF_LIFE_DAYS`."""
    return weight * math.pow(0.5, days / HALF_LIFE_DAYS)


def boosts(session: Session, kind: str) -> dict[tuple, float]:
    """The weight each subject has earned, keyed by what the reader looks up.

    `kind` here names a *family* (`filing`, `search`, `links`, `resurface`),
    because that is how a reader asks: the ranking wants "what has search
    learned", not "how many open_after_ask rows are there".

    The key shape is the family's own: filing is keyed `(from, to)` because
    the lesson is a move between two categories; search is keyed
    `(question, entry_id)` because the lesson is that one note answered one
    question; links and resurfacing are keyed by the pair or the note.
    """
    kinds = FAMILIES.get(kind)
    if not kinds:
        raise ValueError(f"unknown boost family {kind!r}; known: {sorted(FAMILIES)}")
    from memorymap.ai.facts import runner_enabled

    if not runner_enabled("corrections"):
        # Switched off means the corrections are kept and inert (I9). The rows
        # stay, `corrections()` still reads them, and only the thing that
        # *changes behaviour* stops, which is the difference between pausing a
        # feature and deleting somebody's history.
        return {}
    out: dict[tuple, float] = {}
    # **Read per kind, not once over everything.** `corrections()` takes the
    # newest 500 rows, and this used to ask for all kinds at once and then
    # keep the family's: with one dismissal followed by six hundred re-files,
    # the dismissal was outside the window and "never again" quietly expired.
    # This table only ever grows, so that was a matter of time rather than of
    # scale. Asking per kind gives each its own window, and the SQL narrows
    # before the limit rather than after it.
    items = [item for correction_kind in kinds for item in corrections(session, kind=correction_kind)]
    for item in sorted(items, key=lambda row: row.id):
        key: tuple | None = None
        if item.kind == "refile":
            key = (item.from_value or "", item.to_value or "")
        elif item.kind == "open_after_ask":
            question = str(item.subject.get("question") or "")
            entry_id = item.subject.get("entry_id")
            if question and entry_id is not None:
                key = (question, entry_id)
        elif item.kind == "dismiss_link":
            a, b = item.subject.get("a"), item.subject.get("b")
            if a is not None and b is not None:
                key = (min(a, b), max(a, b))
        elif item.kind == "dismiss_resurface":
            entry_id = item.subject.get("entry_id")
            if entry_id is not None:
                key = (entry_id,)
        if key is None:
            continue
        out[key] = min(MAX_BOOST, out.get(key, 0.0) + PER_CORRECTION)
    return out


#: How far one signal's weight may move from 1.0 either way (GRAPH_PLAN KG9).
SIGNAL_WEIGHT_RANGE = (0.5, 1.5)


def signal_weights(
    session: Session, accept: str = "accept_link", dismiss: str = "dismiss_link", prior: float = 1.0
) -> dict[str, float]:
    """What each kind of suggestion evidence is worth in this notebook.

    `accept` and `dismiss` name the pair of kinds read: a link suggestion's
    by default, an entity merge's or a link type's for the inbox (KG9).
    `prior` is the smoothing's pseudo-count per side. The inbox passes 3: its
    rows rest on one signal each, so at 1 a single "no" to one "Background"
    would silence every cue of that type, where once is a mistake and twice
    is a rule (`EXCLUDE_AFTER`).

    Every accepted or dismissed suggestion carries the signals it was offered
    for (`subject["signals"]`, from `ai/relations`). A signal's weight is
    twice its acceptance rate, Laplace smoothed so one decision moves it a
    little and none leaves it at 1.0, bounded to `SIGNAL_WEIGHT_RANGE`, with
    each decision decayed over `HALF_LIFE_DAYS` like every other boost here.
    Only signals somebody decided about are in the answer.
    """
    from memorymap.ai.facts import runner_enabled

    if not runner_enabled("corrections"):
        return {}
    now = None
    tally: dict[str, list[float]] = {}
    for kind, slot in ((accept, 0), (dismiss, 1)):
        for item in corrections(session, kind=kind):
            signals = item.subject.get("signals")
            if not isinstance(signals, list):
                continue
            weight = 1.0
            if item.at is not None:
                if now is None:
                    from memorymap.core.database import utcnow

                    now = utcnow()
                try:
                    weight = decayed(1.0, max(0.0, (now - item.at).total_seconds() / 86400))
                except TypeError:
                    weight = 1.0
            for signal in {str(name) for name in signals}:
                tally.setdefault(signal, [0.0, 0.0])[slot] += weight
    low, high = SIGNAL_WEIGHT_RANGE
    return {
        signal: min(high, max(low, 2.0 * (accepted + prior) / (accepted + dismissed + 2.0 * prior)))
        for signal, (accepted, dismissed) in tally.items()
    }


def centroid_excluded(session: Session, category: str, text: str) -> bool:
    """Has this category been corrected away from, for notes like this one?

    The filing centroid is a similarity score and has no memory; this is the
    memory. Two moves out of a category (`EXCLUDE_AFTER`) mean the centroid
    may not choose it again for a note that reads like the ones that were
    moved, which is the specific failure the owner reported: "the model files
    work notes about a side project under Work, the user moves them to Side
    project every single time, and the next note goes back under Work".

    "Reads like" is word overlap against the corrected notes' own excerpts,
    not an embedding: the excerpts are short, the comparison has to be exact
    and explainable, and a cosine here would make a rule the person can see
    into a rule they cannot.
    """
    wanted = _words(text)
    if not wanted:
        return False
    moved_away = 0
    for item in corrections(session, kind="refile"):
        if (item.from_value or "").strip().lower() != category.strip().lower():
            continue
        excerpt = _words(item.excerpt)
        # An excerpt-less correction still counts: the older rows carry one,
        # and a correction with no words to compare is still a move out of
        # this category.
        if not excerpt or excerpt & wanted:
            moved_away += 1
    return moved_away >= EXCLUDE_AFTER


def filing_evidence(session: Session, text: str, limit: int = 5) -> list[dict]:
    """What the next filing decision about `text` should see.

    Two kinds of row, deliberately in one list: the corrections that moved
    notes like this one, and the notes already filed that read like it. A
    prompt built from only the first has rules with no examples; from only the
    second, examples with no rules.
    """
    from memorymap.entry import manager

    wanted = _words(text)
    out: list[dict] = []
    for item in corrections(session, kind="refile"):
        excerpt = _words(item.excerpt)
        if wanted and excerpt and not (excerpt & wanted):
            continue
        out.append(
            {
                "kind": "correction",
                "from": item.from_value or "",
                "to": item.to_value or "",
                "excerpt": item.excerpt,
            }
        )
        if len(out) >= limit:
            break

    from memorymap.core.database import Entry

    rows = session.scalars(
        select(Entry)
        .where(Entry.is_deleted.is_(False), Entry.is_board.is_(False))
        .order_by(Entry.id.desc())
        .limit(200)
    ).all()
    scored: list[tuple[int, Entry]] = []
    for entry in rows:
        overlap = len(_words(manager.readable_content(entry)) & wanted)
        if overlap:
            scored.append((overlap, entry))
    scored.sort(key=lambda pair: (-pair[0], -pair[1].id))
    for _overlap, entry in scored[:limit]:
        out.append(
            {
                "kind": "neighbour",
                "entry_id": entry.id,
                "category": manager.category_name_for(session, entry),
            }
        )
    return out


#: Words too common to say two notes are about the same thing. Deliberately
#: tiny: a stop list that grows becomes a second, invisible ranking.
_STOP = frozenset(
    "the a an and or but of in on at to for with from is are was were be been "
    "it its this that these those my your our their about into over under".split()
)


def _words(text: str) -> set[str]:
    return {
        word
        for word in "".join(c.lower() if c.isalnum() else " " for c in (text or "")).split()
        if len(word) > 2 and word not in _STOP
    }
