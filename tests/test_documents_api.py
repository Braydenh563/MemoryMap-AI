"""Long-form documents: CRUD, export, and AI editing.

The rule that matters: an AI edit never writes to the document by itself.
"""

from __future__ import annotations


def test_create_read_update_delete(client):
    created = client.post(
        "/documents", json={"title": "My essay", "content": "# Intro\n\nSome text."}
    ).json()
    assert created["title"] == "My essay"
    assert created["words"] == 4  # "#" counts as a token, like most editors

    fetched = client.get(f"/documents/{created['id']}").json()
    assert fetched["content"] == "# Intro\n\nSome text."

    updated = client.put(
        f"/documents/{created['id']}", json={"content": "# Intro\n\nMore text now."}
    ).json()
    assert "More text now" in updated["content"]
    assert updated["title"] == "My essay"  # untouched fields stay put

    assert client.delete(f"/documents/{created['id']}").json()["deleted"] is True
    assert client.get(f"/documents/{created['id']}").status_code == 404


def test_documents_are_listed_most_recently_edited_first(client):
    first = client.post("/documents", json={"title": "First"}).json()
    client.post("/documents", json={"title": "Second"}).json()
    client.put(f"/documents/{first['id']}", json={"content": "touched"})

    titles = [d["title"] for d in client.get("/documents").json()]
    assert titles[0] == "First"


def test_documents_never_show_up_as_notes(client):
    """A document is not a captured thought; it must stay out of note search."""
    client.post("/documents", json={"title": "Essay", "content": "carbonara guanciale"})
    assert client.get("/entries").json() == []


def test_markdown_export_includes_the_title_and_a_filename(client):
    created = client.post(
        "/documents", json={"title": "My Essay", "content": "Body text."}
    ).json()
    response = client.get(f"/documents/{created['id']}/export.md")

    assert response.status_code == 200
    assert response.text.startswith("# My Essay")
    assert "Body text." in response.text
    assert 'filename="My-Essay.md"' in response.headers["content-disposition"]


def test_export_filename_cannot_be_steered_by_the_title(client):
    """The title is user text — it must not decide where the file lands."""
    created = client.post(
        "/documents", json={"title": "../../etc/passwd", "content": "x"}
    ).json()
    disposition = client.get(f"/documents/{created['id']}/export.md").headers[
        "content-disposition"
    ]
    assert "/" not in disposition.split("filename=")[1]
    assert ".." not in disposition.split("filename=")[1]


def test_ai_edit_returns_a_revision_without_saving_it(ai_client, fake_ollama):
    """An AI edit that silently overwrote the document would be the most
    destructive thing in the app."""
    created = ai_client.post(
        "/documents", json={"title": "Essay", "content": "The original text."}
    ).json()
    fake_ollama.librarian_reply = "The rewritten text."

    body = ai_client.post(
        f"/documents/{created['id']}/ai-edit", json={"instruction": "make it formal"}
    ).json()

    assert body["revised"] == "The rewritten text."
    assert body["replaced_selection"] is False
    # The stored document is untouched until the user accepts.
    assert ai_client.get(f"/documents/{created['id']}").json()["content"] == "The original text."


def test_ai_edit_of_a_selection_only_sees_that_passage(ai_client, fake_ollama):
    created = ai_client.post(
        "/documents",
        json={"title": "Essay", "content": "Paragraph one.\n\nParagraph two."},
    ).json()
    fake_ollama.librarian_reply = "Paragraph two, rewritten."

    body = ai_client.post(
        f"/documents/{created['id']}/ai-edit",
        json={"instruction": "tighten this", "selection": "Paragraph two."},
    ).json()

    assert body["replaced_selection"] is True
    prompt = fake_ollama.chat_calls[-1][-1]["content"]
    assert "Paragraph two." in prompt
    assert "Paragraph one." not in prompt


def test_ai_edit_without_the_model_returns_the_text_unchanged(ai_client, fake_ollama):
    created = ai_client.post(
        "/documents", json={"title": "Essay", "content": "Careful prose."}
    ).json()
    fake_ollama.running = False

    body = ai_client.post(
        f"/documents/{created['id']}/ai-edit", json={"instruction": "improve it"}
    ).json()
    assert body["revised"] == "Careful prose."
    assert body["ollama_running"] is False


def test_ai_edit_of_an_empty_document_is_a_clean_400(ai_client):
    created = ai_client.post("/documents", json={"title": "Empty"}).json()
    response = ai_client.post(
        f"/documents/{created['id']}/ai-edit", json={"instruction": "write it"}
    )
    assert response.status_code == 400


def test_missing_documents_are_404(client):
    assert client.get("/documents/9999").status_code == 404
    assert client.put("/documents/9999", json={"title": "x"}).status_code == 404
    assert client.delete("/documents/9999").status_code == 404
