"""What the notebook worked out for itself (WORLD_CLASS_PLAN 15, I1 and I9).

A derived fact is a sentence the app decided was worth remembering *about* a
note: a claim the note makes, or a question it leaves open. Nothing here is
ever written back into a note. Every row carries where it came from (the note
and the exact offsets in it), who decided (a model by name, or `local` when
none was involved), when, and how sure, because a model that is wrong quietly
is worse than no model, and the only defence is that every derived thing can
be read, corrected, deleted and switched off.

**Why the derivation is local first and the model second.** The obvious
shape is to hand the note to a model and ask for a JSON list of claims and
questions. That shape has two faults this app cannot carry. The first is that
a model's paraphrase does not appear in the note, so the span that is supposed
to point at the source has to be re-found afterwards by string search, which
lands on the wrong sentence in any note that repeats itself and on nothing at
all when the model rewords. The second is that the notebook is offline-first:
a pipeline that derives nothing without a model would give a person with no
model a screen that is empty forever, and would be untestable against the fake
transport every provider test in this project runs on (CLAUDE.md section 4).

So the pass reads the note itself, splits it into sentences with their
offsets, and proposes candidates from the shape of each sentence. A model,
when one is running, is then asked to *narrow* that list, which is the half a
small local model is actually good at and the half where a wrong answer costs
a missing row rather than a fabricated one. `model` on the row names whoever
made the final call: the model when its reply was usable, `local` when it was
not asked or its reply could not be parsed. A row that says `local` is telling
the truth about itself, which is the whole contract.

**The lifecycle** lives on the row (see `DerivedFact` in `core/database.py`):
an edited row is never overwritten by a later run, a deleted row is a
tombstone rather than a `DELETE` so it is never re-derived, and a delete is
*also* written to the corrections store (`ai/learning.py`) because those are
two different jobs: the tombstone stops the re-derivation, and the correction
is what the loop learns from.

**The switches** are preferences, one per invention plus a master. Every
runner asks `runner_enabled()` before it does anything, and "off" means it
computes nothing and shows nothing while its existing rows are kept and inert.

**Nothing here imports `ai/learning.py`,** and the export that needs both
lives in `api/routes_learned.py` for that reason: `learning` asks this module
whether its runner is switched on, so an import the other way would close a
cycle (`tests/test_no_import_cycles.py` counts the statement wherever it
sits, which is the right rule: a function-level import is still a cycle, it
just fails later and further away).
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core.database import DerivedFact, Entry, utcnow

logger = logging.getLogger("memorymap.ai.facts")

#: The switch names, and what each is off or on by default.
#:
#: The plan (WORLD_CLASS_PLAN 15, I9) lists some of these as off by default,
#: which was written about the *unattended* runs: "off by default, one switch
#: in Settings, with a token budget per night and a battery guard". Nothing
#: here runs unattended on its own. The night pass runs on the schedule only
#: when `autonomous_tasks_enabled` is on, which is off by default and is the
#: preference that has always meant "may this app think while I am not
#: looking"; these switches are the finer control over *what* it thinks about
#: once it may, and a switch that starts off would make "run now" do nothing
#: the first time anybody pressed it. INBOX 194 records the reading.
SWITCHES: dict[str, bool] = {
    "night_shift": True,
    "margin_reader": True,
    "open_questions": True,
    "resurfacing": True,
    "evidence_checks": True,
    "corrections": True,
    "model_bench": True,
}

#: The master switch. Not one of the seven: it is the answer to "stop all of
#: this now" and has to be readable without knowing what the seven are.
MASTER = "paused"

#: Where a switch is stored. One preference per switch rather than one JSON
#: blob, so a switch added later cannot be lost by a writer that read the blob
#: before it existed.
def _pref_key(name: str) -> str:
    return f"learn.{name}.enabled"


#: The kinds this pass derives today. I1's later passes (tensions,
#: duplicates, entities, dates) add their own to the same table and the same
#: listing; the lifecycle below does not care which kind a row is.
KINDS = ("claim", "question")

#: A sentence, and everything that is not one. Deliberately not
#: `grounding.split_sentences`: that one splits an *answer* into strings and
#: throws the offsets away, and an offset thrown away cannot be recovered (a
#: note that says the same sentence twice has two right answers and one of
#: them is wrong). This regex is matched with `finditer` so every candidate
#: carries the span it was cut from.
_SENTENCE = re.compile(r"[^.!?\n]+(?:[.!?]+|(?=\n)|$)")

#: A sentence shorter than this is a fragment ("Yes.", a list bullet, a
#: heading) and a sentence longer than this is a paragraph somebody forgot to
#: punctuate. Neither is a claim worth showing beside the note it came from.
MIN_SENTENCE_CHARS = 20
MAX_SENTENCE_CHARS = 300

#: How many facts one note may contribute to a single run. A pasted article
#: has hundreds of sentences and none of the value is in the two hundredth:
#: the cap is what stops one paste from becoming most of the table.
MAX_FACTS_PER_ENTRY = 12

#: The words that make a sentence a claim rather than a note to self. A claim
#: takes a position: something is, was, should or must be the case. Without
#: one of these, "ring the dentist" and "chicken, rice, tomatoes" would each
#: become a claim the app would then offer to check against the rest of the
#: notebook, which is noise wearing the clothes of insight.
_STANCE = frozenset(
    {
        "is", "are", "was", "were", "be", "been", "am",
        "should", "must", "will", "wont", "cannot", "cant",
        "has", "have", "had", "does", "do", "did",
        "never", "always", "needs", "need", "means", "costs", "takes",
    }
)

#: Rough tokens per character of prompt. Every local model's tokenizer
#: disagrees with every other one, so this is a budget unit rather than a
#: measurement, and it is deliberately on the generous side: a budget that
#: under-counts is a budget that does not stop anything.
TOKENS_PER_CHAR = 0.3

#: What reading one note costs even when no model is asked. Not zero, because
#: a budget of N has to bound a run over a notebook of any size, and a pass
#: that charges nothing for the notes it reads would walk the whole table
#: whatever budget it was given.
TOKENS_PER_NOTE = 4


@dataclass(frozen=True)
class Candidate:
    """One sentence the pass thinks is worth remembering, with its span."""

    kind: str
    text: str
    start: int
    end: int
    confidence: float


# --- the switches -------------------------------------------------------------


def stored_switches(config) -> dict[str, bool]:  # noqa: ANN001  # config is duck-typed
    """What the person actually set, ignoring the master switch."""
    return {
        name: bool(config.get_preference(_pref_key(name), default))
        for name, default in SWITCHES.items()
    }


def switches(config) -> dict[str, bool]:  # noqa: ANN001  # config is duck-typed
    """The switches as every runner sees them: the master wins.

    The master is reported *with* the seven rather than beside them because
    the question a caller is asking is "may this run", and an answer that
    needs two lookups and a rule to combine them is an answer two callers
    will combine differently.
    """
    paused = bool(config.get_preference(_pref_key(MASTER), False))
    values = stored_switches(config)
    if paused:
        values = dict.fromkeys(values, False)
    return {**values, MASTER: paused}


def set_switches(config, values: dict[str, Any]) -> dict[str, bool]:  # noqa: ANN001
    """Set any subset of the switches. Unknown names are refused."""
    unknown = set(values) - set(SWITCHES) - {MASTER}
    if unknown:
        raise ValueError(f"unknown switch(es) {sorted(unknown)}; known: {sorted({*SWITCHES, MASTER})}")
    for name, value in values.items():
        config.set_preference(_pref_key(name), bool(value))
    return switches(config)


def enabled(config, name: str) -> bool:  # noqa: ANN001  # config is duck-typed
    """May this runner do anything at all? The one question a runner asks."""
    return bool(switches(config).get(name, False))


# --- the derivation -----------------------------------------------------------


def sentences(content: str) -> list[tuple[str, int, int]]:
    """Every sentence in `content` with the span it occupies, exactly.

    `content[start:end]` is the returned text, character for character. The
    tests assert that, and so does every reader that scrolls a note to the
    sentence a fact came from.
    """
    out: list[tuple[str, int, int]] = []
    for match in _SENTENCE.finditer(content):
        start, end = match.start(), match.end()
        while start < end and content[start].isspace():
            start += 1
        while end > start and content[end - 1].isspace():
            end -= 1
        if end > start:
            out.append((content[start:end], start, end))
    return out


def candidates(content: str) -> list[Candidate]:
    """The claims and questions in one note, before any model sees them."""
    found: list[Candidate] = []
    for text, start, end in sentences(content):
        if not (MIN_SENTENCE_CHARS <= len(text) <= MAX_SENTENCE_CHARS):
            continue
        words = {word.strip("'\"`").lower() for word in re.findall(r"[A-Za-z']+", text)}
        if text.endswith("?"):
            # A question is the one kind the text states outright, which is
            # why it is checked first and scored highest: no judgement was
            # needed and none should be claimed.
            found.append(Candidate("question", text, start, end, 0.9))
        elif words & _STANCE:
            found.append(Candidate("claim", text, start, end, 0.6))
        if len(found) >= MAX_FACTS_PER_ENTRY:
            break
    return found


def _fingerprint(kind: str, text: str) -> str:
    """What makes two facts the same fact across runs.

    Whitespace and case are not part of it: a note re-wrapped by an editor
    would otherwise re-derive every fact in it and orphan every correction
    the person had made.
    """
    normalised = " ".join(text.split()).casefold()
    return f"{kind}:{hashlib.sha256(normalised.encode()).hexdigest()[:32]}"


def fingerprint_of(row: DerivedFact) -> str:
    """A stored row's fingerprint, taken from the model's words.

    `original_text` rather than `text` when the row has been edited, because
    the question this answers is "has the pass already produced this", and
    what the pass produces is the model's wording, not the person's fix.
    """
    return _fingerprint(row.kind, row.original_text or row.text)


_KEEP = re.compile(r"\b(\d+)\b")


def _narrow(provider, model: str, content: str, proposed: list[Candidate]) -> set[int] | None:  # noqa: ANN001
    """Ask the model which candidates are worth keeping. None means it could
    not be asked or could not be understood, and the caller keeps all of them.

    Keeping all of them on a bad reply is the deliberate direction to fail in.
    The alternative, dropping everything the model did not explicitly bless,
    hands a model that answers with prose the power to empty this feature
    silently, and silence is the failure mode this whole section exists to
    prevent.
    """
    if provider is None:
        return None
    listed = "\n".join(f"{i}. {item.text}" for i, item in enumerate(proposed))
    system = (
        "You are reviewing sentences taken from one of the user's own notes. "
        "Some are worth remembering as a claim the note makes or a question it "
        "leaves open; some are chatter. Reply with only the numbers worth "
        "keeping, separated by spaces. Reply with nothing if none are."
    )
    try:
        reply = provider.chat(
            model,
            [{"role": "system", "content": system}, {"role": "user", "content": listed}],
        )
    except Exception as exc:  # noqa: BLE001  # a background pass, any provider
        logger.info("night pass: the model could not be asked (%s)", exc)
        return None
    text = str((reply or {}).get("content") or "").strip()
    if not text:
        return None
    numbers = {int(n) for n in _KEEP.findall(text) if int(n) < len(proposed)}
    if not numbers:
        # Prose with no numbers in it is not an answer to this question. The
        # fake transport every provider test runs against replies exactly
        # this way, which is why the local candidates have to stand on their
        # own: see this module's docstring.
        return None
    return numbers


def _entries_to_read(session: Session, force: bool) -> list[Entry]:
    """The notes this run should look at, newest first.

    Without `force` that is the notes nothing has read yet, or that have been
    edited since they were last read: the cursor the plan asks for, expressed
    as a join rather than a stored timestamp so a run that crashes halfway
    leaves no cursor pointing past the notes it never reached.
    """
    query = (
        select(Entry)
        .where(Entry.is_deleted.is_(False), Entry.is_private.is_(False))
        .order_by(Entry.id.desc())
    )
    entries = list(session.scalars(query).all())
    if force:
        return entries
    seen = dict(
        session.execute(
            select(DerivedFact.entry_id, func.max(DerivedFact.computed_at)).group_by(
                DerivedFact.entry_id
            )
        ).all()
    )
    fresh = []
    for entry in entries:
        last = seen.get(entry.id)
        if last is None or (entry.updated_at and entry.updated_at > last):
            fresh.append(entry)
    return fresh


def run(
    session: Session,
    *,
    budget: int = 2000,
    force: bool = False,
    provider=None,  # noqa: ANN001  # any Provider, or None for the local pass
    model: str = "",
    config=None,  # noqa: ANN001  # ConfigManager, duck-typed
) -> dict:
    """One night pass. Returns what it did, including why it stopped.

    Never raises on a provider that is down or a note that will not parse: it
    is the body of a background task, and the worst thing it can do is take
    the scheduler with it.
    """
    if config is not None and not enabled(config, "night_shift"):
        return {"paused": True}

    spent = 0
    scanned = 0
    derived = 0
    stopped = "done"
    for entry in _entries_to_read(session, force):
        if spent + TOKENS_PER_NOTE > budget:
            stopped = "budget"
            break
        content = entry.content or ""
        spent += TOKENS_PER_NOTE
        scanned += 1
        proposed = candidates(content)
        if not proposed:
            continue

        known = {
            fingerprint_of(row)
            for row in session.scalars(
                select(DerivedFact).where(DerivedFact.entry_id == entry.id)
            ).all()
        }
        # `known` grows as this note's candidates are taken, not only from what
        # was already stored: a note that says the same sentence twice has two
        # spans and one fact, and without this it would get a row per
        # occurrence on the first run and none on any run after (the stored
        # row would then match both).
        kept: list[Candidate] = []
        for item in proposed:
            mark = _fingerprint(item.kind, item.text)
            if mark in known:
                continue
            known.add(mark)
            kept.append(item)
        proposed = kept
        if not proposed:
            continue

        decided_by = "local"
        cost = int(len(content) * TOKENS_PER_CHAR)
        if provider is not None and model and spent + cost <= budget:
            spent += cost
            kept = _narrow(provider, model, content, proposed)
            if kept is not None:
                proposed = [item for i, item in enumerate(proposed) if i in kept]
                decided_by = model

        for item in proposed:
            session.add(
                DerivedFact(
                    entry_id=entry.id,
                    kind=item.kind,
                    text=item.text,
                    span_start=item.start,
                    span_end=item.end,
                    model=decided_by,
                    confidence=item.confidence,
                    computed_at=utcnow(),
                )
            )
            derived += 1
    session.flush()
    return {
        "paused": False,
        "scanned": scanned,
        "derived": derived,
        "tokens_spent": spent,
        "budget": budget,
        "stopped_reason": stopped,
    }


# --- reading and correcting ---------------------------------------------------


def _visible(query):  # noqa: ANN001  # a select() of DerivedFact
    """Only rows the person can actually open.

    Joined rather than copied onto the fact: a note made private *after* its
    facts were derived has to disappear from this listing, and the only way a
    stored copy of "is it private" gets that right is if every writer of
    `is_private` remembers to update it here too (Brief 24, decision 4).
    """
    return (
        query.join(Entry, Entry.id == DerivedFact.entry_id)
        .where(
            DerivedFact.deleted_at.is_(None),
            Entry.is_deleted.is_(False),
            Entry.is_private.is_(False),
        )
    )


def listing(
    session: Session,
    *,
    kind: str | None = None,
    q: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[DerivedFact], int]:
    """One page of the table, newest first, plus the total behind it."""
    query = _visible(select(DerivedFact))
    if kind:
        query = query.where(DerivedFact.kind == kind)
    if q:
        from memorymap.core.database import LIKE_ESCAPE, like_escape

        query = query.where(
            DerivedFact.text.like(f"%{like_escape(q)}%", escape=LIKE_ESCAPE)
        )
    counted = _visible(select(func.count()).select_from(DerivedFact))
    if kind:
        counted = counted.where(DerivedFact.kind == kind)
    total = session.scalar(counted)
    rows = list(
        session.scalars(
            query.order_by(DerivedFact.computed_at.desc(), DerivedFact.id.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
    return rows, int(total or 0)


def visible(session: Session, fact_id: int) -> DerivedFact | None:
    """One row, if the person is allowed to see it."""
    return session.scalars(
        _visible(select(DerivedFact)).where(DerivedFact.id == fact_id)
    ).first()


def as_json(row: DerivedFact) -> dict:
    """One row in the shape the table and the export both read."""
    return {
        "id": row.id,
        "entry_id": row.entry_id,
        "kind": row.kind,
        "text": row.text,
        "span": [row.span_start, row.span_end],
        "model": row.model,
        "confidence": row.confidence,
        "computed_at": row.computed_at.isoformat() if row.computed_at else None,
        "edited_by_user": bool(row.edited_by_user),
        "original_text": row.original_text,
    }


def edit(session: Session, row: DerivedFact, text: str) -> DerivedFact:
    """Replace what a fact says. The model never gets it back."""
    if not row.edited_by_user:
        row.original_text = row.text
    row.text = text
    row.edited_by_user = True
    session.flush()
    return row


def reset(session: Session, row: DerivedFact) -> DerivedFact:
    """Put the model's own words back."""
    if row.edited_by_user and row.original_text is not None:
        row.text = row.original_text
    row.edited_by_user = False
    row.original_text = None
    session.flush()
    return row


def remove(session: Session, row: DerivedFact, at: datetime | None = None) -> None:
    """Tombstone a fact so no later run brings it back."""
    row.deleted_at = at or utcnow()
    session.flush()


def forget(session: Session) -> dict[str, int]:
    """Everything the app derived, gone. Nothing the person wrote is touched.

    Tombstones go too: "forget everything" means the table is empty, not that
    it is full of rows saying what used to be there. The next run is then free
    to derive from scratch, which is what a person who pressed this asked for.
    """
    from memorymap.core.database import AuditLog, NoteScore

    facts = session.query(DerivedFact).delete(synchronize_session=False)
    scores = session.query(NoteScore).delete(synchronize_session=False)
    corrections = (
        session.query(AuditLog)
        .filter(AuditLog.action == "correction")
        .delete(synchronize_session=False)
    )
    session.flush()
    return {"facts": facts, "corrections": corrections, "scores": scores}


def runner_enabled(name: str) -> bool:
    """Is this runner switched on? Asked by the runner, before every pass.

    The one place in this module that reaches for the app's config, so that
    everything above it can be called with nothing around it. A runner invoked
    with no app state (a unit test of the arithmetic, a script) gets True
    rather than an exception, because a missing config means "nobody has
    switched this off", not "stop".
    """
    try:
        from memorymap.core import deps

        return enabled(deps.get_config(), name)
    except Exception:  # noqa: BLE001  # no app state: nothing has been switched off
        return True
