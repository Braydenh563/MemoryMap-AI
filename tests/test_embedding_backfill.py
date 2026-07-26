"""Notes that missed their embedding get one on the next start.

The bug: a note saved while the embedding model was still warming up got no
vector, and nothing ever went back for it — so it stayed invisible to semantic
search forever while looking completely normal in the notes list.
"""

from __future__ import annotations

from sqlalchemy import select

from memorymap.ai import embeddings
from memorymap.core import vault
from memorymap.core.database import EmbeddingRecord


def _embedded_ids(session):
    return {row.entry_id for row in session.scalars(select(EmbeddingRecord))}


def test_backfill_embeds_notes_that_have_none(client, session, fake_embeddings):
    a = client.post("/entries", json={"content": "first note"}).json()
    b = client.post("/entries", json={"content": "second note"}).json()
    # Simulate the warm-up gap: throw away the vectors that were stored.
    session.query(EmbeddingRecord).delete()
    session.commit()
    assert _embedded_ids(session) == set()

    fixed = embeddings.backfill_missing(fake_embeddings)

    assert fixed == 2
    assert _embedded_ids(session) == {a["id"], b["id"]}


def test_backfill_leaves_existing_embeddings_alone(client, session, fake_embeddings):
    client.post("/entries", json={"content": "already embedded"}).json()
    before = _embedded_ids(session)
    assert before  # the normal save path embedded it

    assert embeddings.backfill_missing(fake_embeddings) == 0
    assert _embedded_ids(session) == before


def test_backfill_skips_private_notes(client, session, fake_embeddings):
    """A vector encodes what a note is about — backfilling one would leak it."""
    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()

    entry = client.post("/entries", json={"content": "a private thing"}).json()
    client.post(f"/entries/{entry['id']}/privacy", json={"private": True})
    session.query(EmbeddingRecord).delete()
    session.commit()

    assert embeddings.backfill_missing(fake_embeddings) == 0
    assert _embedded_ids(session) == set()
    vault.close()


def test_backfill_skips_binned_notes(client, session, fake_embeddings):
    entry = client.post("/entries", json={"content": "to be binned"}).json()
    client.delete(f"/entries/{entry['id']}")
    session.query(EmbeddingRecord).delete()
    session.commit()

    assert embeddings.backfill_missing(fake_embeddings) == 0


def test_backfill_is_bounded(client, session, fake_embeddings):
    """A huge notebook must not spend minutes embedding on every launch."""
    for i in range(5):
        client.post("/entries", json={"content": f"note {i}"})
    session.query(EmbeddingRecord).delete()
    session.commit()

    assert embeddings.backfill_missing(fake_embeddings, limit=2) == 2


def test_backfill_does_nothing_without_a_ready_model(client, session, fake_embeddings):
    client.post("/entries", json={"content": "a note"})
    session.query(EmbeddingRecord).delete()
    session.commit()

    fake_embeddings.available = False  # is_ready() reads this
    assert embeddings.backfill_missing(fake_embeddings) == 0


def test_wal_and_busy_timeout_are_set(app_state):
    """WAL lets reads continue during a write; the timeout stops a moment of
    contention surfacing as a broken save."""
    from memorymap.core import deps

    with deps.get_db().engine.connect() as connection:
        assert connection.exec_driver_sql("PRAGMA journal_mode").scalar() == "wal"
        assert connection.exec_driver_sql("PRAGMA busy_timeout").scalar() == 5000
        assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
