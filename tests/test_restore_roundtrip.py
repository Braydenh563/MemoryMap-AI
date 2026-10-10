"""A backup restored on a new machine, compared kind by kind (WORLD_CLASS 25e, decision 48).

`test_backup_roundtrip_full.py` wipes and restores into the *same* data
folder. The question a person asks is different: "my laptop died, does the
file I saved bring everything back on the new one?" So this seeds every kind
the app keeps (notes, documents, boards, maps, files, reminders, chats,
settings), takes the bundle, starts a second app on an empty scratch data
folder, restores the bundle there, and compares each kind's count and
bodies, plus the bytes of every attached file. Decision 48: nothing in 0.6
ships before this is green in CI.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from memorymap.core import backup, deps, vault

#: One query per kind: what a person would call losing it. Ordered by id so
#: two notebooks compare as plain lists.
KINDS = {
    "notes": "SELECT id, content, tags, is_deleted FROM entries WHERE is_board = 0 ORDER BY id",
    "documents": "SELECT id, title, content FROM documents ORDER BY id",
    "boards": "SELECT id, content, board_settings FROM entries WHERE is_board = 1 ORDER BY id",
    "board cards": "SELECT id, entry_id, board_id, x, y FROM whiteboard_nodes ORDER BY id",
    "maps": "SELECT id, board_id, kind, data FROM whiteboard_objects ORDER BY id",
    "files": "SELECT id, entry_id, filename, stored_name FROM attachments ORDER BY id",
    "media": "SELECT id, filename, original_name, size_bytes FROM media_uploads ORDER BY id",
    "reminders": "SELECT id, text, due_at FROM reminders ORDER BY id",
    "chats": "SELECT id, title, messages FROM conversations ORDER BY id",
    "note versions": "SELECT id, entry_id, content FROM entry_revisions ORDER BY id",
}

PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _kinds(db_path):
    """Each kind's rows, read from a snapshot so the WAL is folded in."""
    con = sqlite3.connect(db_path)
    try:
        out = {}
        for kind, query in KINDS.items():
            out[kind] = con.execute(query).fetchall()
        return out
    finally:
        con.close()


def _files(data_dir):
    """Every byte under the two folders a backup carries, by path."""
    found = {}
    for folder in ("media", "uploads"):
        root = data_dir / folder
        if root.is_dir():
            for path in sorted(root.rglob("*")):
                if path.is_file():
                    found[str(path.relative_to(data_dir))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return found


def _new_app(data_dir, monkeypatch):
    """A second app on its own empty data folder, as on a new machine."""
    from memorymap.api.app import create_app
    from tests.fakes import FakeEmbeddingService, FakeOllama

    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(data_dir))
    vault.close()
    deps.reset_app_state()
    deps.init_app_state(data_dir=data_dir)
    deps.override_ai(ollama=FakeOllama(running=False), embeddings=FakeEmbeddingService(available=False))
    return TestClient(create_app())


def _seed(client):
    """One of everything, with bodies that would show a truncation."""
    note_ids = []
    for i in range(60):
        reply = client.post("/entries", json={
            "content": f"note {i}: harbour pilots, tides and the {'long ' * i}way round",
            "tags": [f"tag{i % 5}", "shared"],
        })
        assert reply.status_code == 201, reply.text
        note_ids.append(reply.json()["id"])
    edited = client.put(f"/entries/{note_ids[2]}", json={"content": "note 2, rewritten"})
    assert edited.status_code == 200, edited.text
    binned = client.delete(f"/entries/{note_ids[-1]}")  # the bin comes back too
    assert binned.status_code in (200, 204)
    attached = client.post(
        f"/entries/{note_ids[0]}/files", files={"file": ("pier.png", PNG, "image/png")}
    )
    assert attached.status_code == 201, attached.text
    media = client.post("/media/upload", files={"file": ("tide.png", PNG, "image/png")}, data={"direct": "true"})
    assert media.status_code == 200, media.text
    document = client.post("/documents", json={"title": "Thesis", "content": "# Thesis\n\n" + "body " * 400, "file_type": "md"})
    assert document.status_code == 201, document.text
    board = client.post("/whiteboard/boards", json={"name": "Trip plan"})
    assert board.status_code == 201, board.text
    card = client.post("/whiteboard/nodes", json={"entry_id": note_ids[1], "board_id": board.json()["id"], "x": 40, "y": 80})
    assert card.status_code == 200, card.text
    mind = client.post("/whiteboard/boards", json={"name": "Thesis map", "type": "map"})
    assert mind.status_code == 201, mind.text
    root = client.post(f"/whiteboard/boards/{mind.json()['id']}/nodes", json={"text": "Tides"})
    assert root.status_code == 201, root.text
    child = client.post(f"/whiteboard/boards/{mind.json()['id']}/nodes", json={"text": "Neap", "parent_id": root.json()["id"]})
    assert child.status_code == 201, child.text
    reminder = client.post("/reminders", json={"text": "water the plants", "due_at": "2099-01-01T09:00:00"})
    assert reminder.status_code == 201, reminder.text
    chat = client.post("/conversations", json={"question": "When is high tide?", "answer": "At noon, per note 3."})
    assert chat.status_code == 201, chat.text
    turn = client.post(f"/conversations/{chat.json()['id']}/turns", json={"question": "And low?", "answer": "Six hours later."})
    assert turn.status_code == 200, turn.text
    prefs = client.put("/preferences", json={"timezone": "Europe/London", "recycle_bin_days": 11})
    assert prefs.status_code == 200, prefs.text


@pytest.mark.parametrize("password", ["", "hunter2hunter2"], ids=["zip", "sealed"])
def test_a_backup_restored_on_a_new_machine_brings_back_every_kind(client, app_state, tmp_path, monkeypatch, password):
    _seed(client)
    bundle = client.post("/backups/bundle", json={"password": password})
    assert bundle.status_code == 200, bundle.text
    backup.snapshot(app_state.db_path, tmp_path / "before.db")
    before = _kinds(tmp_path / "before.db")
    files_before = _files(app_state.data_dir)
    prefs_before = json.loads(app_state.preferences_path.read_text())

    fresh = _new_app(tmp_path / "new-machine", monkeypatch)
    config = deps.get_config()
    assert config.data_dir != app_state.data_dir
    reply = fresh.post(
        "/backups/bundle/restore",
        files={"file": ("memorymap-backup.bin", bundle.content)},
        data={"password": password},
    )
    assert reply.status_code == 200, reply.text

    backup.snapshot(config.db_path, tmp_path / "after.db")
    after = _kinds(tmp_path / "after.db")
    counts = {kind: (len(before[kind]), len(after[kind])) for kind in KINDS}
    assert all(b > 0 for b, _ in counts.values()), f"a kind was not seeded: {counts}"
    lost = [kind for kind in KINDS if before[kind] != after[kind]]
    assert lost == [], f"kinds that differ after restore (before, after counts): { {k: counts[k] for k in lost} }"
    assert _files(config.data_dir) == files_before
    assert len(files_before) >= 2
    prefs_after = json.loads(config.preferences_path.read_text())
    for key in ("timezone", "recycle_bin_days"):
        assert prefs_after.get(key) == prefs_before[key], key


def test_the_restored_notebook_reads_back_through_the_app(client, app_state, tmp_path, monkeypatch):
    """Rows equal is not the same as the app opening them: read each kind
    through its own route on the new machine."""
    _seed(client)
    bundle = client.post("/backups/bundle", json={"password": ""})
    fresh = _new_app(tmp_path / "new-machine", monkeypatch)
    restored = fresh.post("/backups/bundle/restore", files={"file": ("b.zip", bundle.content)})
    assert restored.status_code == 200
    notes = fresh.get("/entries?limit=100").json()
    assert sum(1 for n in notes if n["content"].startswith("note ")) == 59
    documents = fresh.get("/documents").json()
    reminders = fresh.get("/reminders").json()
    assert any(d["title"] == "Thesis" for d in documents)
    assert any(r["text"] == "water the plants" for r in reminders)
    chats = fresh.get("/conversations").json()
    chats = chats.get("items", chats) if isinstance(chats, dict) else chats
    assert any(c["title"] == "When is high tide?" for c in chats)
    prefs = fresh.get("/preferences").json()
    assert prefs["timezone"] == "Europe/London"
