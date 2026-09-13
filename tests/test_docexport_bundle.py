"""A document leaves with its pictures, and (optionally) as a Word file.

DOCUMENTS_PLAN Phase 7. `export.md` hands over the text alone, and a document
with images in it then lands somewhere else with `/media/…` links that resolve
to nothing, because the pictures live in this notebook and the file does not.
The bundle is the answer to that, and the two things worth testing about it are
the two that would be silently wrong: that the picture is really in the zip, and
that the markdown's own link now points at it.

The Word export is an optional extra, so every test of it skips cleanly when
python-docx is not installed, and the endpoint's own behaviour *without* the
extra (a 501 that names it, not a 500) is tested on every install.
"""

from __future__ import annotations

import io
import zipfile

import pytest

from memorymap.core import docexport

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000a49444154789c6300010000050001"
    "0d0a2db40000000049454e44ae426082"
)


def _document_with_image(client, app_state) -> tuple[int, str]:
    """A document that references one upload, with the file really on disk."""
    media = app_state.data_dir / "media"
    media.mkdir(parents=True, exist_ok=True)
    (media / "dot.png").write_bytes(PNG)
    #: The row as well as the file: `referenced_names` reads the text, but a
    #: bundle that carried a file with no upload row behind it would be
    #: testing something the app never produces.
    from memorymap.core import deps
    from memorymap.core.database import MediaUpload

    with deps.get_db().session() as session:
        session.add(MediaUpload(filename="dot.png", original_name="dot.png"))
        session.commit()
    content = "# Notes\n\nHere it is:\n\n![a dot](/media/dot.png)\n"
    created = client.post(
        "/documents", json={"title": "With a picture", "content": content}
    ).json()
    return created["id"], content


def test_the_bundle_carries_the_picture_and_points_at_it(client, app_state):
    document_id, _ = _document_with_image(client, app_state)

    response = client.get(f"/documents/{document_id}/export.zip")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "With-a-picture.zip" in response.headers["content-disposition"]
    assert response.headers["X-Assets"] == "1"
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = set(archive.namelist())
    assert "assets/dot.png" in names
    markdown = next(name for name in names if name.endswith(".md"))
    body = archive.read(markdown).decode("utf-8")
    assert "![a dot](assets/dot.png)" in body
    assert "/media/dot.png" not in body
    assert body.startswith("# With a picture")
    assert archive.read("assets/dot.png") == PNG


def test_a_link_to_a_file_that_is_gone_is_left_alone(client, app_state):
    """Better an honest `/media/` link than a relative one to nothing."""
    content = "![missing](/media/not-here.png)"
    created = client.post(
        "/documents", json={"title": "Missing", "content": content}
    ).json()

    response = client.get(f"/documents/{created['id']}/export.zip")

    assert response.headers["X-Assets"] == "0"
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    body = archive.read("Missing.md").decode("utf-8")
    assert "/media/not-here.png" in body
    assert "assets/" not in body


def test_a_comment_travels_as_a_footnote_in_the_bundle(client, app_state):
    created = client.post(
        "/documents",
        json={"title": "Remarks", "content": "Some ==words== %%about them%%.\n"},
    ).json()

    response = client.get(f"/documents/{created['id']}/export.zip")

    archive = zipfile.ZipFile(io.BytesIO(response.content))
    body = archive.read("Remarks.md").decode("utf-8")
    assert "[^c1]" in body
    assert "[^c1]: about them" in body
    assert "%%" not in body


def test_a_code_document_is_refused_a_bundle(client, app_state):
    created = client.post(
        "/documents",
        json={"title": "Script", "content": "print('hi')", "file_type": "py"},
    ).json()

    response = client.get(f"/documents/{created['id']}/export.zip")

    assert response.status_code == 400
    assert "markdown" in response.json()["detail"]


def test_a_name_cannot_climb_out_of_the_media_folder(app_state, tmp_path):
    """The names come out of a document's own text, which is user input."""
    secret = tmp_path / "secret.txt"
    secret.write_text("not yours", encoding="utf-8")
    media = app_state.data_dir / "media"
    media.mkdir(parents=True, exist_ok=True)

    data, carried = docexport.bundle(
        "Climb", "![x](/media/x.png)", media, {"../secret.txt", "secret.txt"}
    )

    assert carried == []
    assert set(zipfile.ZipFile(io.BytesIO(data)).namelist()) == {"Climb.md"}


# --- the Word export, which is an optional extra ---------------------------

docx_only = pytest.mark.skipif(
    not docexport.docx_available(),
    reason="python-docx is an optional extra; the suite must not need it",
)


def test_without_the_extra_the_endpoint_says_which_extra(client, app_state, monkeypatch):
    """A 501 that names it, not a 500, and not a silent empty file."""
    monkeypatch.setattr(docexport, "docx_available", lambda: False)
    created = client.post("/documents", json={"title": "Essay", "content": "Hi"}).json()

    response = client.get(f"/documents/{created['id']}/export.docx")

    assert response.status_code == 501
    detail = response.json()["detail"]
    assert "python-docx" in detail
    #: And it says what *is* available, so the answer is a route out rather
    #: than a dead end.
    assert "zip" in detail


@docx_only
def test_the_word_export_is_a_real_docx_with_the_words_in_it(client, app_state):
    content = "# Heading\n\nSome **bold** text.\n\n- one\n- two\n"
    created = client.post(
        "/documents", json={"title": "Essay", "content": content}
    ).json()

    response = client.get(f"/documents/{created['id']}/export.docx")

    assert response.status_code == 200
    assert "essay.docx" in response.headers["content-disposition"]
    #: A .docx is a zip of XML; reading the document part back is the cheapest
    #: check that this is a real one and that the text survived.
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    xml = archive.read("word/document.xml").decode("utf-8")
    assert "Heading" in xml
    assert "bold" in xml
    assert "**" not in xml  # the marks are styles now, not characters
    assert "one" in xml and "two" in xml


@docx_only
def test_the_word_converter_keeps_its_limits_where_it_can_see_them():
    """What it does not understand stays the paragraph it was."""
    data = docexport.to_docx("T", "| a | b |\n| --- | --- |\n| 1 | 2 |\n")

    xml = zipfile.ZipFile(io.BytesIO(data)).read("word/document.xml").decode("utf-8")
    assert "| a | b |" in xml
