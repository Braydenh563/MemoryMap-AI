"""Typed directional relations with properties (GRAPH_PLAN KG3, INBOX 528).

The six built-in link types stay in code; a person adds their own with an
inverse name ("part of" / "has part"), and a link carries properties. The
done-when: a custom type survives a backup round trip and shows its inverse
name on the incoming side.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


def _note(client, text):
    return client.post("/entries", json={"content": text}).json()


def _types(client):
    return {t["key"]: t for t in client.get("/relation-types").json()}


def test_the_built_ins_are_listed_with_their_inverses(client):
    types = _types(client)
    assert {"related", "continues", "context", "supports", "contradicts", "example_of"} <= set(types)
    assert types["supports"]["inverse"] == "Supported by" and types["supports"]["built_in"] is True
    assert types["related"]["directed"] is False


def test_a_custom_type_is_made_named_and_refused_twice(client):
    made = client.post("/relation-types", json={"name": "Part of", "inverse": "Has part"})
    assert made.status_code == 201, made.text
    assert made.json()["key"] == "part_of" and made.json()["built_in"] is False
    assert client.post("/relation-types", json={"name": "part of"}).status_code == 409
    assert client.post("/relation-types", json={"name": "Supports"}).status_code == 409
    assert client.post("/relation-types", json={"name": "  "}).status_code == 422
    changed = client.patch("/relation-types/part_of", json={"inverse": "Contains", "colour": "teal"})
    assert changed.status_code == 200 and changed.json()["inverse"] == "Contains"
    assert client.patch("/relation-types/supports", json={"inverse": "x"}).status_code == 400


def test_a_link_takes_a_custom_type_and_props_and_each_side_names_it(client):
    client.post("/relation-types", json={"name": "Part of", "inverse": "Has part"})
    wheel, car = _note(client, "Wheel"), _note(client, "Car")
    out = client.post(
        f"/entries/{wheel['id']}/links",
        json={"target_id": car["id"], "link_type": "part_of", "props": {"count": 4, "since": "2026"}},
    ).json()
    link = next(link for link in out["links"] if link["entry_id"] == car["id"])
    assert link["link_type"] == "part_of" and link["link_label"] == "Part of"
    assert link["props"] == {"count": 4, "since": "2026"}
    other = client.get(f"/entries/{car['id']}").json()
    back = next(link for link in other["links"] if link["entry_id"] == wheel["id"])
    assert back["link_label"] == "Has part"
    seen = client.get(f"/entries/{car['id']}/connections").json()
    assert seen["incoming"][0]["link_label"] == "Has part"
    patched = client.patch(
        f"/entries/{car['id']}/links/{link['link_id']}", json={"props": {"count": 5}}
    )
    assert patched.status_code == 200
    again = next(x for x in patched.json()["links"] if x["entry_id"] == wheel["id"])
    assert again["props"] == {"count": 5} and again["link_type"] == "part_of"


def test_bad_props_are_refused(client):
    a, b = _note(client, "one"), _note(client, "two")
    too_many = {f"k{i}": i for i in range(21)}
    assert client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "props": too_many}).status_code == 422
    nested = {"k": {"deep": 1}}
    assert client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "props": nested}).status_code == 422


def test_deleting_a_custom_type_leaves_its_links_untyped(client, session):
    from memorymap.core.database import EntryLink

    client.post("/relation-types", json={"name": "Cites", "inverse": "Cited by"})
    a, b = _note(client, "paper"), _note(client, "source")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "link_type": "cites"})
    assert client.delete("/relation-types/cites").status_code == 200
    session.expire_all()
    assert session.query(EntryLink).one().link_type is None
    assert client.delete("/relation-types/supports").status_code == 400


def test_a_custom_type_survives_a_backup_round_trip(client):
    client.post("/relation-types", json={"name": "Part of", "inverse": "Has part"})
    wheel, car = _note(client, "Wheel"), _note(client, "Car")
    client.post(f"/entries/{wheel['id']}/links", json={"target_id": car["id"], "link_type": "part_of"})
    name = client.post("/backups").json()["name"]
    client.delete("/relation-types/part_of")
    assert "part_of" not in _types(client)
    assert client.post("/backups/restore", json={"name": name}).status_code == 200
    types = _types(client)
    assert types["part_of"]["inverse"] == "Has part"
    back = next(x for x in client.get(f"/entries/{car['id']}").json()["links"] if x["entry_id"] == wheel["id"])
    assert back["link_label"] == "Has part"


def test_the_json_export_carries_types_and_props(client):
    client.post("/relation-types", json={"name": "Part of", "inverse": "Has part"})
    a, b = _note(client, "one"), _note(client, "two")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"], "link_type": "part_of", "props": {"n": 1}})
    data = client.get("/export/json").json()
    assert data["links"][0]["link_type"] == "part_of" and data["links"][0]["props"] == {"n": 1}
    assert any(t["key"] == "part_of" and t["inverse"] == "Has part" for t in data["relation_types"])


def test_the_migration_adds_props_and_the_table_over_the_auto_migrator(tmp_path):
    from memorymap.core.database import DatabaseManager, _ensure_alembic_baseline

    db_path = tmp_path / "kg3.db"
    DatabaseManager(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        assert "props" in {r[1] for r in conn.execute('PRAGMA table_info("entry_links")')}
        conn.execute("DROP TABLE relation_types")
        conn.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        conn.execute("DELETE FROM alembic_version")
        conn.execute("INSERT INTO alembic_version VALUES ('b8e4f2a6c9d1')")
        conn.commit()
    finally:
        conn.close()
    _ensure_alembic_baseline(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        assert conn.execute("SELECT version_num FROM alembic_version").fetchall() == [(_alembic_head(),)]
        assert {"key", "name", "inverse", "directed"} <= {r[1] for r in conn.execute('PRAGMA table_info("relation_types")')}
    finally:
        conn.close()


def _alembic_head() -> str:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    return ScriptDirectory.from_config(config).get_current_head()
