"""The second half of filing by the notebook's own words (BACKLOG 76).

A note filed while no model was available is `filing_state == "words"`. When a
model is back, the autonomous pass gives each a second opinion through the
same `categorise` a new note gets. These seed such notes directly and use the
fake transport, so the model's answer is the fake's canned one.
"""

from __future__ import annotations

from memorymap.ai import autonomous, janitor
from memorymap.core import deps
from memorymap.core.database import AuditLog, Entry
from memorymap.entry import manager
from sqlalchemy import select


def _words_note(session, content, category="Misc", **flags):
    entry = manager.create_entry(session, content, category_name=category)
    entry.filing_state = manager.WORDS_FILED
    for key, value in flags.items():
        setattr(entry, key, value)
    session.commit()
    return entry


def _review(session, limit=20):
    return janitor.review_words_filed(
        session, deps.get_embeddings(), deps.get_model_manager(), deps.get_ollama(), limit=limit
    )


def test_a_words_note_is_refiled_by_the_model_and_marked_as_the_ais(ai_client):
    janitor._review_tried.clear()
    db = deps.get_db()
    with db.session() as session:
        moved = _words_note(session, "a funny pun about a scarecrow", "Misc")
        same = _words_note(session, "milk and eggs from the shop", "Shopping")
        result = _review(session)
        session.refresh(moved)
        session.refresh(same)
        assert result == {"looked": 2, "moved": 1, "confirmed": 1}
        assert manager.category_name_for(session, moved) == "Dad Jokes"
        assert moved.filing_state == manager.AUTO_FILED
        assert same.filing_state == manager.AUTO_FILED
        assert manager.category_name_for(session, same) == "Shopping"
        filed = session.scalars(
            select(AuditLog).where(AuditLog.action == "filed", AuditLog.entity_id == moved.id)
        ).all()
        assert filed and filed[-1].actor == manager.FILING_ACTOR


def test_a_move_by_hand_afterwards_is_a_correction(ai_client):
    janitor._review_tried.clear()
    db = deps.get_db()
    with db.session() as session:
        note = _words_note(session, "milk and eggs from the shop", "Misc")
        _review(session)
        manager.update_entry(session, note, category_name="Recipes")
        corrections = session.scalars(select(AuditLog).where(AuditLog.action == "correction")).all()
        assert len(corrections) == 1


def test_it_leaves_alone_what_it_must(ai_client):
    janitor._review_tried.clear()
    db = deps.get_db()
    with db.session() as session:
        mine = _words_note(session, "a funny pun", "Misc", user_filed=True)
        private = _words_note(session, "another pun, but private", "Misc", is_private=True)
        binned = _words_note(session, "a pun in the bin", "Misc", is_deleted=True)
        result = _review(session)
        assert result["looked"] == 0
        for entry in (mine, private, binned):
            session.refresh(entry)
            assert entry.filing_state == manager.WORDS_FILED


def test_it_does_nothing_with_no_model(client):
    janitor._review_tried.clear()
    db = deps.get_db()
    with db.session() as session:
        note = _words_note(session, "a funny pun", "Misc")
        assert _review(session)["looked"] == 0
        session.refresh(note)
        assert note.filing_state == manager.WORDS_FILED


def test_a_note_the_model_cannot_decide_stays_and_is_not_asked_again(ai_client, monkeypatch):
    janitor._review_tried.clear()
    asked = []

    def undecided(session, content, *args, **kwargs):
        asked.append(content)
        return "Misc", 40, "words"  # the model had nothing; the words fallback answered

    monkeypatch.setattr(janitor, "categorise", undecided)
    db = deps.get_db()
    with db.session() as session:
        note = _words_note(session, "a funny pun", "Misc")
        assert _review(session) == {"looked": 1, "moved": 0, "confirmed": 0}
        assert _review(session)["looked"] == 0  # not asked again this run
        assert len(asked) == 1
        session.refresh(note)
        assert note.filing_state == manager.WORDS_FILED


def test_the_batch_is_bounded(ai_client):
    janitor._review_tried.clear()
    db = deps.get_db()
    with db.session() as session:
        for i in range(5):
            _words_note(session, f"a funny pun number {i}", "Misc")
        assert _review(session, limit=2)["looked"] == 2
        left = session.scalars(select(Entry).where(Entry.filing_state == manager.WORDS_FILED)).all()
        assert len(left) == 3


def test_the_autonomous_pass_runs_it(ai_client, monkeypatch):
    seen = []

    def fake_review(session, embeddings, model_manager, ollama, limit):
        seen.append(limit)
        return {"looked": 1, "moved": 0, "confirmed": 1}

    monkeypatch.setattr(janitor, "review_words_filed", fake_review)
    # The agent turn that follows is not what this is about.
    monkeypatch.setattr(autonomous, "_enabled_tasks", lambda config: [])
    from memorymap.core import jobruns

    with jobruns.job_run("autonomous") as run:
        import time

        autonomous._working.set()
        autonomous._optimization_pass(time.monotonic(), run)
    assert seen == [autonomous.WORDS_REVIEW_BATCH_SIZE]
