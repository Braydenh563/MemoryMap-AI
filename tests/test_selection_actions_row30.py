"""WORLD_CLASS_PLAN section 5, items 5 and 6 from a selection (section 8,
row 30): move the selected notes to a space, and export them.

Before, the Notes selection bar could move notes between categories, tag,
merge, archive and delete, but a note filed into the wrong space (INBOX 1's
confusion) could only be moved by deleting the space it was in, and an
export was the whole notebook or one note.
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

from tests._app_js import app_js_text


def _note(client, text, category=None, space=None):
    headers = {"X-Workspace-ID": space} if space else {}
    body = {"content": text}
    if category:
        body["category"] = category
    return client.post("/entries", json=body, headers=headers).json()


def _ids_in(client, space):
    rows = client.get("/entries", headers={"X-Workspace-ID": space}).json()
    rows = rows.get("entries", rows) if isinstance(rows, dict) else rows
    return {row["id"] for row in rows}


def test_moving_notes_to_a_space_takes_their_category_name_and_files(client):
    a = _note(client, "Passport renewal", category="Travel")
    b = _note(client, "Hotel in Kyoto", category="Travel")
    stay = _note(client, "Stays where it is")
    attached = client.post(
        f"/entries/{a['id']}/files",
        files={"file": ("ticket.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")},
    )
    assert attached.status_code in (200, 201), attached.text

    moved = client.post("/spaces/work/move-notes", json={"ids": [a["id"], b["id"]]})
    assert moved.status_code == 200, moved.text
    body = moved.json()
    assert body["moved"] == 2
    assert body["from"] == {str(a["id"]): "default", str(b["id"]): "default"}

    assert {a["id"], b["id"]} <= _ids_in(client, "work")
    assert stay["id"] in _ids_in(client, "default")
    assert a["id"] not in _ids_in(client, "default")
    seen = client.get(f"/entries/{a['id']}", headers={"X-Workspace-ID": "work"}).json()
    assert seen["category"] == "Travel"
    assert seen["workspace_id"] == "work"
    assert seen.get("attachments"), seen

    back = client.post("/spaces/default/move-notes", json={"ids": [a["id"]]})
    assert back.json()["moved"] == 1
    assert a["id"] in _ids_in(client, "default")


def test_moving_to_a_space_that_does_not_exist_is_refused(client):
    a = _note(client, "Anything")
    assert client.post("/spaces/nowhere/move-notes", json={"ids": [a["id"]]}).status_code == 404


def test_the_markdown_export_takes_a_selection(client):
    a = _note(client, "# Alpha\n\nfirst")
    _note(client, "# Beta\n\nsecond")
    response = client.get("/export/markdown", params={"ids": str(a["id"])})
    assert response.status_code == 200
    names = zipfile.ZipFile(io.BytesIO(response.content)).namelist()
    assert len(names) == 1 and names[0].endswith(".md") and f"/{a['id']}-" in names[0]


def test_the_selection_bar_offers_both():
    app = app_js_text()
    more = app.split("function fillBatchMore(", 1)[1].split("\n}\n", 1)[0]
    assert "batchMoveToSpace" in more
    assert "batchExport" in more
    assert "/move-notes" in app
    assert "/export/markdown?ids=" in app


def test_the_note_edit_form_counts_words_and_reading_time():
    app = app_js_text()
    form = app.split("function renderEditForm(", 1)[1].split("\n}\n", 1)[0]
    assert "note-edit-counts" in form
    assert "min read" in form


def test_note_templates_fill_the_clipboard_and_the_cursor():
    app = app_js_text()
    assert 'replaceAll("{{clipboard}}"' in app
    assert 'NOTE_TEMPLATE_CURSOR = "{{cursor}}"' in app
    assert "noteTemplateForUse(template)" in app.split("async function useNoteTemplate(", 1)[1]
    root = Path(__file__).resolve().parents[1]
    html = (root / "frontend" / "index.html").read_text(encoding="utf-8")
    assert "<code>{{clipboard}}</code>" in html and "<code>{{cursor}}</code>" in html
