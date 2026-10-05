"""WORLD_CLASS_PLAN row 30 (section 5 items 5): the selection bar's last two
actions, Move to space and Export. A batch of notes moves to another space in
one transaction (their category follows by name, their reminders and files go
with them, the search index follows), and comes back the same way, which is
the Undo. A selection exports as one zip of Markdown files.
"""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"


def _in(space: str) -> dict:
    return {"X-Workspace-ID": space}


def _space(client, name="Work") -> str:
    return client.post("/spaces", json={"name": name}).json()["id"]


def _note(client, text, category=None, headers=None) -> int:
    body = {"content": text}
    if category:
        body["category"] = category
    return client.post("/entries", json=body, headers=headers or {}).json()["id"]


def _ids(client, headers=None) -> set[int]:
    return {e["id"] for e in client.get("/entries", params={"limit": 200}, headers=headers or {}).json()}


def test_a_batch_moves_with_its_category_and_its_reminders(client):
    space = _space(client)
    a = _note(client, "kiln firing schedule zinnia", category="Ceramics")
    b = _note(client, "glaze recipe zinnia", category="Ceramics")
    stay = _note(client, "tax return")
    due = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    client.post("/reminders", json={"text": "fire the kiln", "due_at": due, "entry_id": a})
    moved = client.post("/entries/move-space", json={"ids": [a, b, stay + 999], "target": space})
    assert moved.status_code == 200, moved.text
    body = moved.json()
    assert sorted(body["moved"]) == sorted([a, b]) and body["skipped"] == [stay + 999]
    assert {p["id"]: p["space"] for p in body["previous"]} == {a: "default", b: "default"}
    # They are in the new space and gone from the old one.
    assert {a, b} <= _ids(client, _in(space))
    assert not ({a, b} & _ids(client, _in("default")))
    assert stay in _ids(client, _in("default"))
    # The category exists there under its own name, and the notes point at it.
    cats = {c["name"] for c in client.get("/categories", headers=_in(space)).json()}
    assert "Ceramics" in cats
    fetched = client.get(f"/entries/{a}", headers=_in(space)).json()
    assert fetched["category"] == "Ceramics"
    # The reminder travelled with its note.
    assert [r["text"] for r in client.get("/reminders", headers=_in(space)).json()] == ["fire the kiln"]
    assert client.get("/reminders", headers=_in("default")).json() == []


def test_search_follows_the_move(client):
    space = _space(client)
    note = _note(client, "quincunx orchard plan")
    client.post("/entries/move-space", json={"ids": [note], "target": space})
    def hits(space):
        found = client.get("/search", params={"q": "quincunx", "kind": "note"}, headers=_in(space)).json()["hits"]
        return {h["id"] for h in found}

    assert note in hits(space)
    assert note not in hits("default")


def test_moving_back_is_the_undo(client):
    space = _space(client)
    note = _note(client, "undo me", category="Errands")
    first = client.post("/entries/move-space", json={"ids": [note], "target": space}).json()
    back = client.post(
        "/entries/move-space",
        json={"ids": [p["id"] for p in first["previous"]], "target": first["previous"][0]["space"]},
        headers=_in(space),
    )
    assert back.status_code == 200 and back.json()["moved"] == [note]
    assert note in _ids(client, _in("default"))
    assert client.get(f"/entries/{note}", headers=_in("default")).json()["category"] == "Errands"


def test_bad_requests(client):
    note = _note(client, "n")
    assert client.post("/entries/move-space", json={"ids": [note], "target": "nowhere"}).status_code == 404
    assert client.post("/entries/move-space", json={"ids": [note], "target": "all"}).status_code == 422
    space = _space(client, "Other")
    assert client.post("/entries/move-space", json={"ids": [], "target": space}).status_code == 422
    # Already there: nothing moves, nothing breaks.
    same = client.post("/entries/move-space", json={"ids": [note], "target": "default"}).json()
    assert same["moved"] == [] and same["skipped"] == [note]


def test_a_selection_exports_as_one_zip(client):
    a = _note(client, "# Bread\n\nproving times", category="Food")
    b = _note(client, "second note", category="Food")
    c = _note(client, "not in the selection")
    response = client.post("/export/markdown", json={"ids": [a, b]})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/zip")
    names = zipfile.ZipFile(io.BytesIO(response.content)).namelist()
    assert len(names) == 2 and all(n.endswith(".md") for n in names)
    assert not any(n.startswith(f"food/{c}-") or f"/{c}-" in n for n in names)
    assert client.post("/export/markdown", json={"ids": []}).status_code == 422


def test_the_selection_bar_offers_both():
    skills = (FRONTEND / "js" / "skills.js").read_text(encoding="utf-8")
    block = skills.split("function fillBatchMore", 1)[1].split("async function batchDelete", 1)[0]
    assert "Move to space" in block and "Export selection" in block
    assert "/entries/move-space" in skills and "/export/markdown" in skills
