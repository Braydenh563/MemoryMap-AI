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

    # Requests happen outside the asserts so they still run under `python -O`.
    deleted = client.delete(f"/documents/{created['id']}")
    assert deleted.json()["deleted"] is True
    gone = client.get(f"/documents/{created['id']}")
    assert gone.status_code == 404


def test_documents_are_listed_most_recently_edited_first(client):
    first = client.post("/documents", json={"title": "First"}).json()
    client.post("/documents", json={"title": "Second"}).json()
    client.put(f"/documents/{first['id']}", json={"content": "touched"})

    titles = [d["title"] for d in client.get("/documents").json()]
    assert titles[0] == "First"


def test_documents_past_the_old_200_cap_are_still_reachable(client):
    """`list_documents` used to `.limit(200)` with no offset — a notebook
    with more than 200 documents had no way, UI or API, to see the rest."""
    for i in range(205):
        client.post("/documents", json={"title": f"Doc {i}"})
    assert len(client.get("/documents").json()) == 205


def test_documents_search_matches_the_title(client):
    client.post("/documents", json={"title": "Sourdough notes", "content": "starter"})
    client.post("/documents", json={"title": "Trip planning", "content": "flights"})
    titles = [d["title"] for d in client.get("/documents?q=sourdough").json()]
    assert titles == ["Sourdough notes"]


def test_documents_search_matches_content_not_only_title(client):
    """The gap `GET /documents?q=` exists to close: `_summary()` never sends
    a document's body to the browser, so client-side filtering alone could
    only ever match a title — the AI's own `_list_documents` tool already
    searched title *and* content; this mirrors it rather than a title-only
    filter reachable from the API."""
    client.post("/documents", json={"title": "Untitled", "content": "carbonara guanciale"})
    client.post("/documents", json={"title": "Untitled", "content": "unrelated"})
    hits = client.get("/documents?q=guanciale").json()
    assert len(hits) == 1


def test_documents_search_is_case_insensitive(client):
    client.post("/documents", json={"title": "Sourdough", "content": ""})
    assert len(client.get("/documents?q=SOURDOUGH").json()) == 1


def test_documents_search_with_no_matches_is_an_empty_list_not_an_error(client):
    client.post("/documents", json={"title": "Sourdough"})
    assert client.get("/documents?q=nonexistentxyz").json() == []


def test_documents_empty_q_behaves_like_no_q_at_all(client):
    client.post("/documents", json={"title": "A"})
    client.post("/documents", json={"title": "B"})
    assert len(client.get("/documents?q=").json()) == 2


def test_documents_never_show_up_as_notes(client):
    """A document is not a captured thought; it must stay out of note search."""
    client.post("/documents", json={"title": "Essay", "content": "carbonara guanciale"})
    entries = client.get("/entries").json()
    assert entries == []


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
    stored = ai_client.get(f"/documents/{created['id']}").json()
    assert stored["content"] == "The original text."


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


# --- the write/remove verb set (reskinned from a single rewrite action) -----


def test_ai_write_inserts_new_content_without_needing_existing_text(ai_client, fake_ollama):
    """The one verb an empty document must NOT 400 on — there is nothing to
    edit yet, but there is plenty to write."""
    created = ai_client.post("/documents", json={"title": "Empty"}).json()
    fake_ollama.librarian_reply = "A brand new opening paragraph."

    response = ai_client.post(
        f"/documents/{created['id']}/ai-edit",
        json={"instruction": "write an opening paragraph", "verb": "write"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verb"] == "write"
    assert body["revised"] == "A brand new opening paragraph."
    assert body["replaced_selection"] is False


def test_ai_write_requires_an_instruction(ai_client, fake_ollama):
    created = ai_client.post(
        "/documents", json={"title": "Essay", "content": "Some text."}
    ).json()
    response = ai_client.post(
        f"/documents/{created['id']}/ai-edit", json={"verb": "write"}
    )
    assert response.status_code == 400


def test_ai_write_uses_the_selection_as_the_insertion_point_not_the_target(
    ai_client, fake_ollama
):
    created = ai_client.post(
        "/documents",
        json={"title": "Essay", "content": "Paragraph one.\n\nParagraph two."},
    ).json()
    fake_ollama.librarian_reply = "A new sentence."

    ai_client.post(
        f"/documents/{created['id']}/ai-edit",
        json={
            "instruction": "add a supporting sentence",
            "selection": "Paragraph one.",
            "verb": "write",
        },
    )
    prompt = fake_ollama.chat_calls[-1][-1]["content"]
    assert "Paragraph one." in prompt
    assert "INSERT DIRECTLY AFTER" in prompt


def test_ai_remove_deletes_a_selection_with_no_instruction_needed(ai_client, fake_ollama):
    """Asked for directly: a selection alone already says what to remove."""
    created = ai_client.post(
        "/documents",
        json={"title": "Essay", "content": "Paragraph one.\n\nParagraph two."},
    ).json()
    fake_ollama.librarian_reply = "Paragraph one."

    response = ai_client.post(
        f"/documents/{created['id']}/ai-edit",
        json={"selection": "Paragraph two.", "verb": "remove"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verb"] == "remove"
    assert body["replaced_selection"] is True
    assert body["revised"] == "Paragraph one."


def test_ai_remove_with_no_selection_needs_an_instruction(ai_client, fake_ollama):
    created = ai_client.post(
        "/documents", json={"title": "Essay", "content": "Some text about cats."}
    ).json()
    response = ai_client.post(
        f"/documents/{created['id']}/ai-edit", json={"verb": "remove"}
    )
    assert response.status_code == 400


def test_ai_remove_leaves_the_document_untouched_until_accepted(ai_client, fake_ollama):
    created = ai_client.post(
        "/documents", json={"title": "Essay", "content": "Keep this. Remove that."}
    ).json()
    fake_ollama.librarian_reply = "Keep this."

    ai_client.post(
        f"/documents/{created['id']}/ai-edit",
        json={"instruction": "remove the second sentence", "verb": "remove"},
    )
    stored = ai_client.get(f"/documents/{created['id']}").json()
    assert stored["content"] == "Keep this. Remove that."


# --- the AI-edit changelog ("allow edits made by the AI to be undone or
# altered before and after they are set") --------------------------------


def test_ai_edit_log_records_and_lists_an_entry(client):
    created = client.post(
        "/documents", json={"title": "Essay", "content": "Before text."}
    ).json()
    logged = client.post(
        f"/documents/{created['id']}/ai-edit-log",
        json={
            "verb": "edit",
            "instruction": "make it formal",
            "before_content": "Before text.",
            "after_content": "After text.",
        },
    )
    assert logged.status_code == 201
    assert logged.json()["verb"] == "edit"
    assert logged.json()["instruction"] == "make it formal"

    listed = client.get(f"/documents/{created['id']}/ai-edit-log").json()
    assert len(listed) == 1
    assert listed[0]["id"] == logged.json()["id"]


def test_ai_edit_log_stores_a_selection_excerpt_not_the_full_selection(client):
    created = client.post("/documents", json={"title": "Essay", "content": "x"}).json()
    long_selection = "word " * 100
    logged = client.post(
        f"/documents/{created['id']}/ai-edit-log",
        json={
            "instruction": "",
            "selection": long_selection,
            "before_content": "x",
            "after_content": "y",
        },
    ).json()
    assert len(logged["selection_excerpt"]) <= 161  # 160 chars + the ellipsis
    assert logged["selection_excerpt"].endswith("…")


def test_ai_edit_log_prunes_beyond_the_cap(client):
    from memorymap.api import routes_documents

    created = client.post("/documents", json={"title": "Essay", "content": "x"}).json()
    total = routes_documents.MAX_AI_EDIT_LOG_PER_DOCUMENT + 5
    for i in range(total):
        client.post(
            f"/documents/{created['id']}/ai-edit-log",
            json={
                "instruction": f"edit {i}",
                "before_content": "x",
                "after_content": "y",
            },
        )
    listed = client.get(f"/documents/{created['id']}/ai-edit-log").json()
    assert len(listed) == routes_documents.MAX_AI_EDIT_LOG_PER_DOCUMENT
    # Newest first, and the oldest ones are the ones that got pruned.
    assert listed[0]["instruction"] == f"edit {total - 1}"


def test_revert_ai_edit_restores_the_documents_content(client):
    created = client.post(
        "/documents", json={"title": "Essay", "content": "After the AI's edit."}
    ).json()
    logged = client.post(
        f"/documents/{created['id']}/ai-edit-log",
        json={
            "instruction": "tighten it",
            "before_content": "Before the AI's edit.",
            "after_content": "After the AI's edit.",
        },
    ).json()

    response = client.post(f"/documents/{created['id']}/ai-edit-log/{logged['id']}/revert")
    assert response.status_code == 200
    assert response.json()["content"] == "Before the AI's edit."

    stored = client.get(f"/documents/{created['id']}").json()
    assert stored["content"] == "Before the AI's edit."


def test_revert_ai_edit_records_its_own_changelog_entry(client):
    """The changelog stays a truthful record of everything that happened,
    including the revert itself — never a silent rewind."""
    created = client.post(
        "/documents", json={"title": "Essay", "content": "After."}
    ).json()
    logged = client.post(
        f"/documents/{created['id']}/ai-edit-log",
        json={"instruction": "do the thing", "before_content": "Before.", "after_content": "After."},
    ).json()

    client.post(f"/documents/{created['id']}/ai-edit-log/{logged['id']}/revert")

    listed = client.get(f"/documents/{created['id']}/ai-edit-log").json()
    assert len(listed) == 2
    assert listed[0]["verb"] == "revert"
    assert "do the thing" in listed[0]["instruction"]


def test_revert_ai_edit_can_itself_be_reverted(client):
    created = client.post("/documents", json={"title": "Essay", "content": "v2"}).json()
    logged = client.post(
        f"/documents/{created['id']}/ai-edit-log",
        json={"before_content": "v1", "after_content": "v2"},
    ).json()
    client.post(f"/documents/{created['id']}/ai-edit-log/{logged['id']}/revert")
    stored_after_revert = client.get(f"/documents/{created['id']}").json()
    assert stored_after_revert["content"] == "v1"

    # Revert the revert (the newest changelog entry) — should bring v2 back.
    listed = client.get(f"/documents/{created['id']}/ai-edit-log").json()
    revert_entry_id = listed[0]["id"]
    client.post(f"/documents/{created['id']}/ai-edit-log/{revert_entry_id}/revert")
    stored_after_second_revert = client.get(f"/documents/{created['id']}").json()
    assert stored_after_second_revert["content"] == "v2"


def test_revert_ai_edit_404s_for_an_entry_from_a_different_document(client):
    doc_a = client.post("/documents", json={"title": "A", "content": "a"}).json()
    doc_b = client.post("/documents", json={"title": "B", "content": "b"}).json()
    logged = client.post(
        f"/documents/{doc_a['id']}/ai-edit-log",
        json={"before_content": "old", "after_content": "a"},
    ).json()
    response = client.post(f"/documents/{doc_b['id']}/ai-edit-log/{logged['id']}/revert")
    assert response.status_code == 404


def test_ai_write_without_the_model_returns_nothing_to_insert(ai_client, fake_ollama):
    created = ai_client.post(
        "/documents", json={"title": "Essay", "content": "Some text."}
    ).json()
    fake_ollama.running = False

    body = ai_client.post(
        f"/documents/{created['id']}/ai-edit",
        json={"instruction": "add a sentence", "verb": "write"},
    ).json()
    # Falling back to the existing content (compose()'s own contract) would
    # insert the whole document into itself — "write" must fall back to ""
    # instead, since there is nothing sensible to insert.
    assert body["revised"] == ""
    assert body["ollama_running"] is False


def test_missing_documents_are_404(client):
    fetched = client.get("/documents/9999")
    assert fetched.status_code == 404
    updated = client.put("/documents/9999", json={"title": "x"})
    assert updated.status_code == 404
    deleted = client.delete("/documents/9999")
    assert deleted.status_code == 404


def test_storage_says_where_the_notebook_actually_is(client, tmp_path):
    """"Where are my documents stored?" was asked outright, and the app had
    no answer anywhere in its interface. For a local-first notebook that is
    most of the promise: a file you can't locate isn't obviously yours."""
    body = client.get("/storage").json()

    assert body["database"].endswith(".db")
    # A real path to a file that exists, not a placeholder.
    from pathlib import Path

    assert Path(body["database"]).exists()
    assert Path(body["data_dir"]).is_dir()
    assert body["database_bytes"] > 0
    # The backups folder is part of the answer to "how do I keep a copy?".
    assert "backups" in body["backups_dir"].lower()
