"""`EntryOut.edited_at`: when a person last changed what a note says.

Asked for so the notes list can sort by "recently edited" and say "edited
2h ago". `Entry.updated_at` cannot be that field: it has `onupdate=utcnow`,
so it moves when a note is merely opened (the open bumps `access_count`) or
filed by the AI, and a list sorted by it reorders itself on every click.
`edited_at` moves on a change to the text, title, tags or category, and on
nothing else. Null means never edited since it was written; a list sorts by
`edited_at ?? created_at`.
"""

from __future__ import annotations

import sqlite3

from memorymap.core.database import DatabaseManager, Entry, _ensure_alembic_baseline
from memorymap.entry import manager


def _edited(client, entry_id):
    return client.get(f"/entries/{entry_id}").json()["edited_at"]


def test_a_new_note_has_not_been_edited(client):
    made = client.post("/entries", json={"content": "fresh"}).json()
    assert made["edited_at"] is None
    assert _edited(client, made["id"]) is None  # opening it is not an edit


def test_content_tags_and_category_edits_set_it(client):
    for change in ({"content": "changed"}, {"tags": ["new"]}, {"category": "Elsewhere"}):
        made = client.post("/entries", json={"content": "a note"}).json()
        out = client.put(f"/entries/{made['id']}", json=change).json()
        assert out["edited_at"] is not None, change
        assert _edited(client, made["id"]) == out["edited_at"]


def test_pinning_and_filing_do_not(client, session):
    made = client.post("/entries", json={"content": "a note"}).json()
    client.put(f"/entries/{made['id']}", json={"pinned": True})
    assert _edited(client, made["id"]) is None

    entry = session.get(Entry, made["id"])
    assert manager.record_filing(session, entry, "Filed by the AI")
    session.commit()
    assert _edited(client, made["id"]) is None


def test_the_migration_upgrades_over_the_auto_migrator(tmp_path):
    """The guard: `_add_missing_columns` has already added the column by the
    time Alembic runs, so the migration must not add it a second time."""
    db_path = tmp_path / "edited-at.db"
    DatabaseManager(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        assert "edited_at" in {row[1] for row in conn.execute('PRAGMA table_info("entries")')}
        conn.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        conn.execute("DELETE FROM alembic_version")
        conn.execute("INSERT INTO alembic_version VALUES ('d3b7c2a91e45')")
        conn.commit()
    finally:
        conn.close()

    _ensure_alembic_baseline(db_path)

    conn = sqlite3.connect(str(db_path))
    try:
        assert conn.execute("SELECT version_num FROM alembic_version").fetchall() == [("e6f2a9c4b1d7",)]
    finally:
        conn.close()
