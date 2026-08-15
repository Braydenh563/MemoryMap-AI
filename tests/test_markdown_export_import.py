"""The whole-notebook markdown export (a zip of files) and its import.

(Unrelated to test_document_import.py, which is markitdown converting an
uploaded PDF/DOCX/etc. into notes — this is the notebook's own round-trip
format: one `.md` file per note, with frontmatter for category/tags.)
"""

from __future__ import annotations

import io
import zipfile


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


def test_markdown_export_zip_layout(client):
    _save(client, "buy milk", category="Shopping", tags=["errand"])
    binned = _save(client, "old thought")
    client.delete(f"/entries/{binned['id']}")

    response = client.get("/export/markdown")
    assert response.status_code == 200
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    names = archive.namelist()
    assert any(name.startswith("Shopping/") for name in names)
    assert any(name.startswith("_recycle-bin/") for name in names)  # never dropped

    shopping = archive.read([n for n in names if n.startswith("Shopping/")][0]).decode()
    assert "category: Shopping" in shopping
    assert "tags: [errand]" in shopping
    assert shopping.rstrip().endswith("buy milk")


def _upload(client, files):
    return client.post(
        "/import/markdown",
        files=[("files", (name, body.encode(), "text/markdown")) for name, body in files],
    )


def test_markdown_import_with_frontmatter(client):
    body = "---\ncategory: Recipes\ntags: [dinner, easy]\n---\n\nPasta: boil, sauce, eat."
    response = _upload(client, [("pasta.md", body)])
    assert response.status_code == 201
    assert response.json() == {"imported": 1, "skipped": []}

    entry = client.get("/entries").json()[0]
    assert entry["content"] == "Pasta: boil, sauce, eat."
    assert entry["category"] == "Recipes"
    assert entry["tags"] == ["dinner", "easy"]
    assert entry["user_filed"] is True  # the file chose its home


def test_markdown_import_plain_file_and_skips(client):
    response = _upload(client, [("idea.md", "just a plain thought"), ("empty.md", "   ")])
    body = response.json()
    assert body["imported"] == 1
    assert body["skipped"] == ["empty.md: empty"]
    assert client.get("/entries").json()[0]["category"] == "Uncategorised"


def test_markdown_roundtrip(client):
    _save(client, "roundtrip me", category="Ideas", tags=["keep"])
    exported = client.get("/export/markdown").content
    archive = zipfile.ZipFile(io.BytesIO(exported))
    name = archive.namelist()[0]

    response = _upload(client, [(name.split("/")[-1], archive.read(name).decode())])
    assert response.json()["imported"] == 1
    contents = [e["content"] for e in client.get("/entries").json()]
    assert contents.count("roundtrip me") == 2  # original + reimport
