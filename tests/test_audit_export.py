"""GET /audit/export.csv: the activity log as a hand-over file (BACKLOG
section 115, row 11). Who, what, when, every event kind with its fields."""

from __future__ import annotations

import csv
import io

from memorymap.core import deps, events
from memorymap.core.database import AuditLog


def _rows(response):
    return list(csv.DictReader(io.StringIO(response.text)))


def test_export_has_every_field_oldest_first(client):
    client.post("/entries", json={"content": "first note"})
    client.post("/entries", json={"content": "second note", "category": "Ideas"})
    response = client.get("/audit/export.csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    rows = _rows(response)
    assert rows
    assert list(rows[0]) == [
        "id", "created_at", "actor", "action", "entity_type", "entity_id", "detail", "changed_fields",
    ]
    ids = [int(r["id"]) for r in rows]
    assert ids == sorted(ids)
    assert {r["actor"] for r in rows} == {events.ACTOR_USER}
    assert any(r["entity_type"] == "entry" and r["entity_id"] for r in rows)


def test_export_never_carries_a_payload_value(client):
    entry = client.post("/entries", json={"content": "the secret sentence"}).json()
    client.put(f"/entries/{entry['id']}", json={"content": "another secret sentence"})
    text = client.get("/audit/export.csv").text
    assert "secret sentence" not in text


def test_a_formula_cell_is_defanged(client):
    db = deps.get_db()
    with db.session() as s:
        s.add(AuditLog(action="created", entity_type="note", detail='=HYPERLINK("http://x")'))
        s.commit()
    rows = _rows(client.get("/audit/export.csv"))
    hit = [r for r in rows if "HYPERLINK" in r["detail"]]
    assert hit and hit[0]["detail"].startswith("'=")


def test_entity_filter_and_the_export_is_logged(client):
    client.post("/entries", json={"content": "x"})
    client.get("/audit/export.csv")
    rows = _rows(client.get("/audit/export.csv", params={"entity_type": "data"}))
    assert rows and all(r["entity_type"] == "data" for r in rows)
    assert any(r["detail"] == "audit csv" for r in rows)
