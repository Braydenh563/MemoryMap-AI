"""Importing a file as a document.

Asked for directly: the chat's attach button should take any file, with images
going to the gallery and "the others … in the documents subtab". Images already
had a home; everything else had none, so a .docx or a .csv could be attached to
a message and then existed nowhere in the app.

What is stored is the file's *text*, not the file. Same decision the viewer
made: this app never serves an uploaded byte back inline, so a conversion
happens once on the way in rather than leaving a binary the rest of the app
would have to learn to handle.
"""

from __future__ import annotations

import io


def _post(client, name: str, data: bytes):
    return client.post(
        "/documents/import", files={"file": (name, io.BytesIO(data), "application/octet-stream")}
    )


def test_a_text_file_becomes_a_document(client):
    response = _post(client, "meeting-notes.txt", b"Budget review\nHeadcount is flat.")
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "meeting-notes"
    assert "Headcount is flat." in body["content"]

    # And it is really in the documents list, which is the whole point.
    listed = client.get("/documents").json()
    assert any(d["id"] == body["id"] for d in listed)


def test_a_csv_keeps_its_rows(client):
    response = _post(client, "spend.csv", b"item,cost\nlaptop,1200\ndesk,300\n")
    assert response.status_code == 201
    assert "laptop,1200" in response.json()["content"]


def test_a_code_file_keeps_its_own_type(client):
    """So the editor gives it a gutter and the right comment marker, rather
    than treating a .py as prose."""
    response = _post(client, "runner.py", b"def main():\n    return 1\n")
    assert response.status_code == 201
    assert response.json()["file_type"] == "py"


def test_the_title_comes_from_the_filename_without_its_extension(client):
    assert _post(client, "Q3 Report.md", b"# Q3\n\nfine").json()["title"] == "Q3 Report"


def test_a_file_type_it_cannot_read_is_refused_by_name(client):
    response = _post(client, "clip.mp4", b"\x00\x00\x00\x18ftypmp42")
    assert response.status_code == 415
    assert "mp4" in response.json()["detail"]


def test_an_empty_file_is_refused_rather_than_making_a_blank_document(client):
    """A document with no content is worse than a refusal: it is a row in the
    list that opens onto nothing and gives no clue why."""
    response = _post(client, "empty.txt", b"   \n  \n")
    assert response.status_code == 422


def test_an_oversized_file_is_refused_before_it_is_stored(client):
    from tessellate.api import routes_documents

    big = b"x" * (routes_documents.MAX_IMPORT_BYTES + 1024)
    response = _post(client, "huge.txt", big)
    assert response.status_code == 413
    # Nothing was written on the way to refusing it.
    assert not any(d["title"] == "huge" for d in client.get("/documents").json())


def test_import_is_matched_before_the_document_id_route():
    """`/documents/import` would otherwise be read as a document id, the same
    trap `/documents/file-types` sits above. FastAPI matches in declaration
    order, so this is a property of the source, not of the request."""
    from tessellate.api import routes_documents

    paths = [route.path for route in routes_documents.router.routes]
    assert paths.index("/documents/import") < paths.index("/documents/{document_id}")


def test_importing_is_recorded_in_the_audit_log(client):
    _post(client, "traceable.txt", b"something worth keeping")
    actions = client.get("/audit").json()
    assert any("import" in str(a).lower() and "document" in str(a).lower() for a in actions)


def test_a_diff_a_patch_and_a_visual_basic_file_import_as_code(client):
    """These were 415 (OPEN ledger 298): .diff and .patch are what a reviewer
    pastes into a library, .vb and .vbs are plain source."""
    for name in ("fix.diff", "fix.patch", "Module1.vb", "setup.vbs"):
        response = _post(client, name, b"--- a\n+++ b\n@@ -1 +1 @@\n-x\n+y\n")
        assert response.status_code == 201, name
        assert "+y" in response.json()["content"], name


def test_a_file_named_dockerfile_or_makefile_imports_as_code(client):
    """No suffix at all: the name is the type (OPEN ledger 298)."""
    for name in ("Dockerfile", "Makefile", "dockerfile"):
        response = _post(client, name, b"FROM python:3.12\nRUN echo hi\n")
        assert response.status_code == 201, name
        assert "FROM python" in response.json()["content"], name


def test_the_suffix_of_a_bare_name_is_the_one_the_viewer_knows():
    from tessellate.core import docview

    assert docview.effective_suffix("Dockerfile") == ".dockerfile"
    assert docview.effective_suffix("makefile") == ".mk"
    assert docview.effective_suffix("notes.TXT") == ".txt"
    assert docview.effective_suffix("README") == ""
    assert docview.kind_for(docview.effective_suffix("Dockerfile")) == "code"
