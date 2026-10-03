"""A category's own colour, chosen by the person (INBOX 441 (4)).

The owner: "there is no way to customise the colour of categories." Until now
every category's colour was a hash of its name (a dot) or its place in the
sorted list (the graph). A category now stores an optional `colour`: one of
the palette keys the swatch picker offers, or a `#rrggbb` hex, or nothing
(automatic). The stored value rides on the categories list, so every surface
that draws a category reads it from the one place.
"""

from __future__ import annotations

import sqlite3

import pytest

from memorymap.core.database import DatabaseManager


def _note(client, text, category):
    entry = client.post("/entries", json={"content": text}).json()
    client.put(f"/entries/{entry['id']}", json={"category": category})
    return entry["id"]


def _cats(client):
    return {c["name"]: c for c in client.get("/categories").json()}


def test_a_category_has_no_colour_until_one_is_chosen(client):
    _note(client, "a", "Work")
    assert _cats(client)["Work"]["colour"] is None


def test_set_a_palette_key_and_read_it_back(client):
    _note(client, "a", "Work")
    cid = _cats(client)["Work"]["id"]
    done = client.put(f"/categories/{cid}/colour", json={"colour": "teal"})
    assert done.status_code == 200
    assert done.json() == {"id": cid, "name": "Work", "colour": "teal"}
    assert _cats(client)["Work"]["colour"] == "teal"


def test_a_hex_is_accepted_and_lowercased(client):
    _note(client, "a", "Work")
    cid = _cats(client)["Work"]["id"]
    done = client.put(f"/categories/{cid}/colour", json={"colour": "#AB12cD"})
    assert done.status_code == 200
    assert _cats(client)["Work"]["colour"] == "#ab12cd"


def test_null_clears_it_back_to_automatic(client):
    _note(client, "a", "Work")
    cid = _cats(client)["Work"]["id"]
    client.put(f"/categories/{cid}/colour", json={"colour": "red"})
    cleared = client.put(f"/categories/{cid}/colour", json={"colour": None})
    assert cleared.status_code == 200 and cleared.json()["colour"] is None
    assert _cats(client)["Work"]["colour"] is None


@pytest.mark.parametrize(
    "bad",
    ["chartreuse", "#abc", "#12345g", "ff0000", "red; background: url(x)", "", " teal", "#1234567", 7, ["red"]],
)
def test_anything_else_is_refused_and_nothing_is_stored(client, bad):
    _note(client, "a", "Work")
    cid = _cats(client)["Work"]["id"]
    refused = client.put(f"/categories/{cid}/colour", json={"colour": bad})
    assert refused.status_code == 422
    assert _cats(client)["Work"]["colour"] is None


def test_a_missing_field_is_refused(client):
    _note(client, "a", "Work")
    cid = _cats(client)["Work"]["id"]
    assert client.put(f"/categories/{cid}/colour", json={}).status_code == 422


def test_an_unknown_category_is_a_400_like_its_siblings(client):
    assert client.put("/categories/99999/colour", json={"colour": "red"}).status_code == 400


def test_rename_keeps_the_colour_and_a_merge_keeps_the_targets(client):
    _note(client, "a", "Wrok")
    _note(client, "b", "Work")
    cats = _cats(client)
    client.put(f"/categories/{cats['Wrok']['id']}/colour", json={"colour": "pink"})
    client.put(f"/categories/{cats['Work']['id']}/colour", json={"colour": "green"})
    # A plain rename carries the colour with the row.
    client.put(f"/categories/{cats['Wrok']['id']}", json={"name": "Scratch"})
    assert _cats(client)["Scratch"]["colour"] == "pink"
    # Renaming onto an existing name merges; the survivor keeps its own.
    client.put(f"/categories/{_cats(client)['Scratch']['id']}", json={"name": "Work"})
    cats = _cats(client)
    assert "Scratch" not in cats and cats["Work"]["colour"] == "green"


def test_the_agent_created_category_starts_automatic(client):
    client.post("/categories", json={"name": "Garden"})
    assert _cats(client)["Garden"]["colour"] is None


def test_a_database_that_needs_the_per_space_rebuild_keeps_its_colours(tmp_path):
    """`_rebuild_categories_unique_constraint` copies a fixed column list into
    a new table. A column it does not name is gone after the rebuild, and a
    `colour` the person chose would silently disappear on the one start that
    rebuilds, so the copy names it."""
    path = tmp_path / "old.db"
    conn = sqlite3.connect(str(path))
    try:
        conn.execute(
            "CREATE TABLE categories (id INTEGER NOT NULL PRIMARY KEY,"
            " name VARCHAR(100) NOT NULL UNIQUE, description TEXT, created_at DATETIME,"
            " colour VARCHAR(16))"
        )
        conn.execute("INSERT INTO categories (id, name, colour) VALUES (1, 'Work', 'teal')")
        conn.execute("INSERT INTO categories (id, name, colour) VALUES (2, 'Home', NULL)")
        conn.commit()
    finally:
        conn.close()
    DatabaseManager(path)
    conn = sqlite3.connect(str(path))
    try:
        rows = dict(conn.execute("SELECT name, colour FROM categories"))
    finally:
        conn.close()
    assert rows == {"Work": "teal", "Home": None}


def test_the_column_arrives_on_a_database_that_never_had_it(tmp_path):
    path = tmp_path / "older.db"
    conn = sqlite3.connect(str(path))
    try:
        conn.execute(
            "CREATE TABLE categories (id INTEGER NOT NULL PRIMARY KEY,"
            " name VARCHAR(100) NOT NULL UNIQUE, description TEXT, created_at DATETIME)"
        )
        conn.execute("INSERT INTO categories (id, name) VALUES (1, 'Work')")
        conn.commit()
    finally:
        conn.close()
    DatabaseManager(path)
    conn = sqlite3.connect(str(path))
    try:
        assert dict(conn.execute("SELECT name, colour FROM categories")) == {"Work": None}
    finally:
        conn.close()


def test_the_migration_alone_adds_the_column(tmp_path):
    """The Alembic step, not the startup auto-migrator, is what is checked: a
    database stood at the revision before this one, with `categories` lacking
    the column, gains it from `upgrade` and keeps its rows."""
    from memorymap.core.database import _ensure_alembic_baseline

    path = tmp_path / "migrate.db"
    DatabaseManager(path)
    conn = sqlite3.connect(str(path))
    try:
        conn.execute("ALTER TABLE categories DROP COLUMN colour")
        conn.execute("INSERT INTO categories (id, name, workspace_id, created_at) VALUES (7, 'Work', 'default', '2026-01-01 00:00:00')")
        conn.execute("CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL)")
        conn.execute("INSERT INTO alembic_version VALUES ('d3b7c2a91e45')")
        conn.commit()
    finally:
        conn.close()
    _ensure_alembic_baseline(path)
    conn = sqlite3.connect(str(path))
    try:
        assert conn.execute("SELECT name, colour FROM categories").fetchall() == [("Work", None)]
        assert conn.execute("SELECT version_num FROM alembic_version").fetchall() == [("e5a9d1c3b7f2",)]
    finally:
        conn.close()
