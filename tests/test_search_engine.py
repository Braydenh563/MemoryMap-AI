"""The retrieval engine, measured (SESSION_BRIEFS Brief 11, WORLD_CLASS_PLAN B3).

`tests/test_search_engine_spec.py` is the contract and stays as written; this
file is where the behaviour around it is pinned: the operators one by one, the
index's write path, the three scores, and the perf gates with the numbers they
were measured at.
"""
from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy import text as sa_text

from memorymap.search.query import understand


def test_an_ordinary_question_has_no_operators():
    u = understand("what did I write about beans")
    assert u.filters == {"tag": [], "kind": [], "space": [], "has": [], "is": []}
    assert not u.has_operators
    assert u.subject == "beans"


def test_operators_are_lifted_out_of_the_subject():
    u = understand("tag:work sourdough starter")
    assert u.filters["tag"] == ["work"]
    assert "tag:work" not in u.subject
    assert "sourdough" in u.subject


def test_a_quoted_value_and_a_comma_list():
    u = understand('tag:"two words" kind:note,document')
    assert u.filters["tag"] == ["two words"]
    assert u.filters["kind"] == ["note", "document"]


def test_aliases_mean_the_same_thing():
    assert understand("type:document").filters["kind"] == ["document"]
    assert understand("space:work").filters["space"] == ["work"]
    assert understand("tags:garden").filters["tag"] == ["garden"]


def test_before_and_after_are_exclusive_bounds():
    u = understand("before:2026-01-01 after:2025-12-01")
    assert u.until == date(2025, 12, 31)
    assert u.since == date(2025, 12, 2)


def test_a_typed_date_beats_a_time_phrase():
    """Both in one query: the stated bound wins rather than being overwritten."""
    u = understand("beans before:2026-01-01 last week", now=date(2026, 6, 1))
    assert u.until == date(2025, 12, 31)


def test_an_unreadable_date_invents_nothing():
    """`before:tuesday` is not an ISO date. No bound is guessed from it, and
    the words stay in the query, so the person sees their own text matching
    nothing rather than the app filtering by a date it made up."""
    u = understand("before:tuesday", now=date(2026, 6, 3))
    assert u.since is None and u.until is None
    assert "tuesday" in u.subject


def test_an_operator_query_is_not_a_time_only_question():
    u = understand("kind:document before:2026-01-01")
    assert not u.time_only


def test_a_url_is_not_an_operator():
    u = understand("https://example.com/thing")
    assert not u.has_operators
    assert "example.com" in u.subject


@pytest.mark.parametrize("q", ["", "   ", '"', "-", "tag:"])
def test_a_ragged_query_is_never_an_error(q):
    understand(q)


# --- the index over every kind ------------------------------------------------


def _counts(session):
    from memorymap.search import index

    return index.counts(session)


def test_every_kind_has_a_source_and_an_unknown_one_is_loud():
    from memorymap.search import index

    for kind in index.KINDS:
        assert index.sources_for_kind(kind), f"no index source for kind {kind!r}"
    for source in index.sources():
        assert index.source_for(source.name) is source
    with pytest.raises(index.UnknownSource):
        index.source_for("entries_but_spelled_wrong")


def test_slots_are_unique_because_they_are_baked_into_rowids():
    from memorymap.search import index

    slots = [source.slot for source in index.sources()]
    assert len(set(slots)) == len(slots)


def test_a_note_is_indexed_when_it_is_written(session):
    from memorymap.entry import manager

    manager.create_entry(session, "sourdough starter needs feeding", tags=["bread"])
    session.commit()
    assert _counts(session)["note"] == 1


def test_a_board_is_indexed_as_a_board_not_a_note(session):
    from memorymap.core.database import Entry

    session.add(Entry(content="my map", is_board=True))
    session.commit()
    counts = _counts(session)
    assert counts["board"] == 1 and counts["note"] == 0


def test_a_private_note_is_never_indexed(session):
    from memorymap.core.database import Entry

    session.add(Entry(content="ciphertext here", is_private=True))
    session.commit()
    assert _counts(session)["note"] == 0


def test_an_edit_keeps_the_index_in_step(session):
    """The write the event log does not see (a document edit records no
    event), which is why the index hangs off the flush instead."""
    from memorymap.core.database import Document
    from memorymap.search import index

    doc = Document(title="Roadmap", content="quarterly planning")
    session.add(doc)
    session.commit()
    assert index.counts(session)["document"] == 1
    doc.content = "quarterly planning and the allotment"
    session.commit()
    rows = session.execute(
        sa_text("SELECT body FROM search_index WHERE kind='document'")
    ).all()
    assert len(rows) == 1 and "allotment" in rows[0][0]


def test_deleting_takes_the_row_out(session):
    from memorymap.core.database import Bookmark

    mark = Bookmark(url="https://example.com", title="example")
    session.add(mark)
    session.commit()
    assert _counts(session)["bookmark"] == 1
    session.delete(mark)
    session.commit()
    assert _counts(session)["bookmark"] == 0


def test_every_kind_lands_in_one_index(session):
    from memorymap.core.database import (
        Attachment,
        Bookmark,
        Document,
        Entry,
        Reminder,
    )
    from datetime import datetime

    session.add(Entry(content="a note about beans"))
    session.add(Entry(content="a board", is_board=True))
    session.add(Document(title="a document", content="beans again"))
    session.add(Bookmark(url="https://example.com/beans", title="beans online"))
    session.add(Reminder(text="buy beans", due_at=datetime(2026, 1, 1)))
    session.flush()
    session.add(
        Attachment(entry_id=1, filename="beans.pdf", stored_name="x1", ocr_text="beans, dried")
    )
    session.commit()
    counts = _counts(session)
    assert counts["note"] == 1
    assert counts["board"] == 1
    assert counts["document"] == 1
    assert counts["bookmark"] == 1
    assert counts["reminder"] == 1
    assert counts["file"] == 1


def test_rebuild_matches_what_the_writes_indexed(session):
    from memorymap.core.database import Document, Entry
    from memorymap.search import index

    session.add(Entry(content="one"))
    session.add(Document(title="two", content="two"))
    session.commit()
    live = index.counts(session)
    index.rebuild(session)
    session.commit()
    assert index.counts(session) == live
