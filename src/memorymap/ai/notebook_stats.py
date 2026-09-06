"""Questions about the *shape* of the notebook, answered from SQL.

Asked for directly: *"enhance the semantic search so it can pick up stuff like
if I ask 'what are my most common tags', or maybe 'categories with the most
notes'."*

**Retrieval cannot answer these, and that is not a tuning problem.** Semantic
search finds the notes most *like* a question. "What are my most common tags"
is not like any note — it is a question about the collection, and the honest
answer is a count, not a passage. Before this, such a question went through
retrieval, came back with five arbitrary notes, and the model was told to
answer using only those: so it either declined or invented a ranking from a
five-note sample. Both are worse than saying nothing.

So these are answered by counting, which is what a database is for. Three
properties fall out of that and they are the point:

- **It is exact.** "You have 47 notes" is a fact, not a model's impression.
- **It is instant.** No inference, so it works with the model stopped.
- **It cannot hallucinate.** The numbers come from rows.

The model still gets to *phrase* the answer when it is running (see
`routes_chat`), but the facts are computed here and passed to it, so what it
can do is write a sentence around numbers it did not choose.

Deliberately a heuristic matcher rather than a model call, for exactly the
reason `intent.py` gives about its own classifier: it runs on every message, so
it has to be instant and predictable, and anything it is not sure about falls
through to ordinary retrieval — the worst case is the behaviour that was there
before.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.core.database import Category, Document, Entry, EntryLink, utcnow

#: How many rows a "top N" answer lists. Ten is a glance; fifty is a report
#: nobody reads in a chat bubble, and the follow-up question ("show me all of
#: them") has the Library for an answer.
TOP_N = 10


@dataclass
class StatAnswer:
    """One computed answer, ready to be spoken or rendered.

    `text` is a complete answer on its own — that is what makes this work with
    the model stopped. `facts` is the same information as rows, so a caller can
    render a list or hand the model something to phrase without re-parsing
    prose.
    """

    kind: str
    text: str
    facts: list[dict] = field(default_factory=list)


def _visible(query):
    """Live notes only: binned and private notes are nobody's statistics.

    Private notes are excluded for the reason the rest of the app excludes
    them — a count that changes when a note is made private is a count that
    leaks what is in it.
    """
    return query.where(Entry.deleted_at.is_(None), Entry.is_private.is_(False))


def _tags_of(raw: str) -> list[str]:
    try:
        parsed = json.loads(raw or "[]")
    except (ValueError, TypeError):
        return []
    return [str(tag).strip() for tag in parsed if str(tag).strip()] if isinstance(parsed, list) else []


def _plural(n: int, word: str) -> str:
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


# --- the questions -----------------------------------------------------------
#
# Each pattern is anchored on the *thing being asked about* rather than on a
# whole sentence shape, because people phrase these a dozen ways ("my most
# common tags", "which tags do I use most", "top tags") and a sentence-shaped
# regex catches one of them.

_TAG_WORDS = r"tags?"
_CATEGORY_WORDS = r"categor(?:y|ies)|folders?|spaces?"
_MOST = r"most|top|common|commonest|frequent|popular|biggest|largest|main"
_COUNT = r"how many|how much|number of|count of|total"


def _asks(text: str, *patterns: str) -> bool:
    return all(re.search(pattern, text) for pattern in patterns)


def looks_like_a_question_about_the_notebook(message: str) -> bool:
    """Cheap pre-filter: is this worth running the matchers over at all?"""
    text = (message or "").lower()
    return bool(
        re.search(_TAG_WORDS, text)
        or re.search(_CATEGORY_WORDS, text)
        or re.search(r"\bnotes?\b|\bdocuments?\b|notebook", text)
    )


def answer(message: str, session: Session) -> StatAnswer | None:
    """The computed answer to this question, or None to fall through to search."""
    text = (message or "").strip().lower()
    if not text or not looks_like_a_question_about_the_notebook(text):
        return None

    if _asks(text, _TAG_WORDS, _MOST):
        return _top_tags(session)
    if _asks(text, _CATEGORY_WORDS, _MOST):
        return _top_categories(session)
    if _asks(text, r"untagged|no tags|without (?:a )?tags?|missing tags?"):
        return _untagged(session)
    if _asks(text, _COUNT, _TAG_WORDS):
        return _tag_count(session)
    if _asks(text, _COUNT, _CATEGORY_WORDS):
        return _category_count(session)
    if _asks(text, _COUNT, r"\bnotes?\b"):
        return _note_count(session)
    if _asks(text, _COUNT, r"\bdocuments?\b"):
        return _document_count(session)
    if _asks(text, r"\bmost linked|linked (?:to )?the most|best connected|most connect"):
        return _most_linked(session)
    if _asks(text, r"orphan|unlinked|not linked|no links"):
        return _orphans(session)
    if _asks(text, r"when do i|busiest|most active|what time|which day"):
        return _busiest(session)
    if _asks(text, _COUNT, r"this week|past week|last week|this month|past month"):
        return _recent_count(session, text)
    return None


def _top_tags(session: Session) -> StatAnswer:
    rows = session.scalars(_visible(select(Entry.tags))).all()
    counts = Counter(tag for raw in rows for tag in _tags_of(raw))
    if not counts:
        return StatAnswer("tags", "You have not tagged any notes yet.")
    top = counts.most_common(TOP_N)
    listed = ", ".join(f"{tag} ({n})" for tag, n in top)
    return StatAnswer(
        "tags",
        f"Your most-used tags are {listed}. "
        f"That is across {_plural(len(counts), 'distinct tag')}.",
        [{"label": tag, "count": n} for tag, n in top],
    )


def _top_categories(session: Session) -> StatAnswer:
    rows = session.execute(
        _visible(
            select(Category.name, func.count(Entry.id))
            .join(Category, Category.id == Entry.category_id)
            .group_by(Category.name)
        ).order_by(func.count(Entry.id).desc()).limit(TOP_N)
    ).all()
    if not rows:
        return StatAnswer("categories", "None of your notes are filed in a category yet.")
    listed = ", ".join(f"{name} ({n})" for name, n in rows)
    return StatAnswer(
        "categories",
        f"The categories with the most notes are {listed}.",
        [{"label": name, "count": n} for name, n in rows],
    )


def _untagged(session: Session) -> StatAnswer:
    rows = session.scalars(_visible(select(Entry.tags))).all()
    without = sum(1 for raw in rows if not _tags_of(raw))
    return StatAnswer(
        "untagged",
        f"{_plural(without, 'note')} out of {len(rows)} have no tags."
        + (" Filing those would make them much easier to find." if without else ""),
        [{"label": "untagged", "count": without}, {"label": "total", "count": len(rows)}],
    )


def _tag_count(session: Session) -> StatAnswer:
    rows = session.scalars(_visible(select(Entry.tags))).all()
    distinct = {tag for raw in rows for tag in _tags_of(raw)}
    return StatAnswer(
        "tag-count",
        f"You are using {_plural(len(distinct), 'distinct tag')}.",
        [{"label": "tags", "count": len(distinct)}],
    )


def _category_count(session: Session) -> StatAnswer:
    total = session.scalar(select(func.count(Category.id))) or 0
    return StatAnswer(
        "category-count",
        f"You have {_plural(total, 'category')}.".replace("categorys", "categories"),
        [{"label": "categories", "count": total}],
    )


def _note_count(session: Session) -> StatAnswer:
    total = session.scalar(_visible(select(func.count(Entry.id)))) or 0
    return StatAnswer(
        "note-count",
        f"You have {_plural(total, 'note')}.",
        [{"label": "notes", "count": total}],
    )


def _document_count(session: Session) -> StatAnswer:
    total = session.scalar(select(func.count(Document.id))) or 0
    return StatAnswer(
        "document-count",
        f"You have {_plural(total, 'document')}.",
        [{"label": "documents", "count": total}],
    )


def _most_linked(session: Session) -> StatAnswer:
    """The notes at the centre of the graph.

    Counts both directions: a note everything points *at* is as central as one
    that points at everything, and a "best connected" answer that counted only
    outgoing links would rank the note you happened to write last.
    """
    counts: Counter[int] = Counter()
    for source, target in session.execute(select(EntryLink.source_entry_id, EntryLink.target_entry_id)).all():
        counts[source] += 1
        counts[target] += 1
    if not counts:
        return StatAnswer("linked", "None of your notes are linked to each other yet.")
    top_ids = [entry_id for entry_id, _ in counts.most_common(TOP_N)]
    rows = session.scalars(_visible(select(Entry).where(Entry.id.in_(top_ids)))).all()
    by_id = {row.id: row for row in rows}
    facts = []
    for entry_id in top_ids:
        row = by_id.get(entry_id)
        if row is None:
            continue  # binned or private since the link was made
        facts.append(
            {
                "label": (row.content or "").strip().split("\n")[0][:60],
                "count": counts[entry_id],
                "id": row.id,
            }
        )
    if not facts:
        return StatAnswer("linked", "None of your visible notes are linked to each other yet.")
    listed = "; ".join(f"“{fact['label']}” ({fact['count']} links)" for fact in facts[:5])
    return StatAnswer("linked", f"Your most connected notes are {listed}.", facts)


def _orphans(session: Session) -> StatAnswer:
    linked: set[int] = set()
    for source, target in session.execute(select(EntryLink.source_entry_id, EntryLink.target_entry_id)).all():
        linked.add(source)
        linked.add(target)
    ids = session.scalars(_visible(select(Entry.id))).all()
    alone = [entry_id for entry_id in ids if entry_id not in linked]
    return StatAnswer(
        "orphans",
        f"{_plural(len(alone), 'note')} out of {len(ids)} are not linked to anything else.",
        [{"label": "unlinked", "count": len(alone)}, {"label": "total", "count": len(ids)}],
    )


#: Written out rather than computed from the locale: this string is spoken back
#: to the user, and `%A` would follow the *server's* locale rather than theirs.
_WEEKDAYS = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def _busiest(session: Session) -> StatAnswer:
    rows = session.scalars(_visible(select(Entry.created_at))).all()
    if not rows:
        return StatAnswer("busiest", "There are no notes to look at yet.")
    days = Counter(_WEEKDAYS[value.weekday()] for value in rows if value)
    hours = Counter(value.hour for value in rows if value)
    day, day_n = days.most_common(1)[0]
    hour, _ = hours.most_common(1)[0]
    window = f"{hour:02d}:00–{(hour + 1) % 24:02d}:00"
    return StatAnswer(
        "busiest",
        f"You write most on {day}s ({_plural(day_n, 'note')}), and most often around {window}.",
        [{"label": name, "count": n} for name, n in days.most_common()],
    )


def _recent_count(session: Session, text: str) -> StatAnswer:
    days = 7 if re.search(r"week", text) else 30
    since = utcnow() - timedelta(days=days)
    total = (
        session.scalar(_visible(select(func.count(Entry.id)).where(Entry.created_at >= since)))
        or 0
    )
    window = "the past week" if days == 7 else "the past month"
    return StatAnswer(
        "recent-count",
        f"You have written {_plural(total, 'note')} in {window}.",
        [{"label": window, "count": total}],
    )
