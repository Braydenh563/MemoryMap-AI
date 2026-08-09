"""Attaching specific notes to a chat message.

"Use these notes, specifically" is a stronger signal than any similarity
score, so attached notes are always given to the model, ahead of whatever
retrieval turns up.
"""

from __future__ import annotations


def _note(client, content):
    return client.post("/entries", json={"content": content}).json()["id"]


def test_attached_notes_are_sent_even_when_retrieval_misses_them(ai_client, fake_ollama):
    unrelated = _note(ai_client, "the offside rule in football explained")
    for i in range(6):
        _note(ai_client, f"a note about baking bread number {i}")
    fake_ollama.librarian_reply = "Noted."

    ai_client.post("/chat", json={"question": "what do you make of this?",
                                  "note_ids": [unrelated]})

    prompt = fake_ollama.chat_calls[-1][-1]["content"]
    assert "offside rule" in prompt
    assert "attached by me" in prompt


def test_attached_notes_come_back_in_the_results(ai_client, fake_ollama):
    note_id = _note(ai_client, "a very specific note about kayaking")
    fake_ollama.librarian_reply = "Sure."
    body = ai_client.post("/chat", json={"question": "thoughts?",
                                         "note_ids": [note_id]}).json()
    assert [r["id"] for r in body["raw_results"]][0] == note_id
    assert "attached" in body["search_mode"]


def test_attaching_a_note_makes_smalltalk_a_real_question(ai_client, fake_ollama):
    """"what do you think?" with a note clipped to it is about that note."""
    note_id = _note(ai_client, "my plan for the weekend")
    fake_ollama.librarian_reply = "Looks good."
    body = ai_client.post("/chat", json={"question": "ok", "note_ids": [note_id]}).json()
    assert body["raw_results"], "the attached note was dropped as small talk"


def test_binned_notes_cannot_be_attached(ai_client, fake_ollama):
    """Attaching one would quietly resurrect thrown-away content."""
    note_id = _note(ai_client, "something I deleted on purpose")
    ai_client.delete(f"/entries/{note_id}")
    fake_ollama.librarian_reply = "Nothing to see."

    body = ai_client.post("/chat", json={"question": "what about this?",
                                         "note_ids": [note_id]}).json()
    assert [r["id"] for r in body["raw_results"]] == []


def test_attachments_are_de_duplicated_against_retrieval(ai_client, fake_ollama):
    note_id = _note(ai_client, "sourdough starter needs feeding daily")
    fake_ollama.librarian_reply = "Yes."
    body = ai_client.post("/chat", json={"question": "sourdough starter",
                                         "note_ids": [note_id]}).json()
    ids = [r["id"] for r in body["raw_results"]]
    assert ids.count(note_id) == 1


def test_missing_note_ids_are_ignored_rather_than_erroring(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Fine."
    response = ai_client.post("/chat", json={"question": "hello?", "note_ids": [9999]})
    assert response.status_code == 200


# --- attached_notes_only (Trace's "Generate story from path") ------------------------
#
# Attaching notes never used to stop retrieval from running too — it only
# guaranteed the attached ones were *included*. Fine for "what do you make of
# this?", where more context is welcome; wrong for a deliberately closed set
# like a traced path, where the turn's own instruction text ("weave these
# into a narrative…") has no real subject and would keyword/semantic-match
# whatever it happens to share words with, appending unrelated notes nobody
# chose after the ones the user actually picked.


def test_attached_notes_only_excludes_what_retrieval_would_have_added(ai_client, fake_ollama):
    chosen = _note(ai_client, "the beans need netting before the pigeons find them")
    # Shares "netting" with the question below, so ordinary retrieval would
    # pull this in — attached_notes_only must stop that.
    unrelated = _note(ai_client, "netting is in the shed behind the mower")
    fake_ollama.librarian_reply = "A short story."

    body = ai_client.post(
        "/chat",
        json={
            "question": "beans netting — write a story about this",
            "note_ids": [chosen],
            "attached_notes_only": True,
        },
    ).json()

    ids = [r["id"] for r in body["raw_results"]]
    assert ids == [chosen]
    assert unrelated not in ids
    assert body["search_mode"] == "attached"


def test_attached_notes_only_has_no_effect_without_an_attachment(ai_client, fake_ollama):
    """Nothing to fall back to — must behave like an ordinary question, not
    silently search nothing and answer from thin air."""
    note_id = _note(ai_client, "a joke about a scarecrow winning an award")
    fake_ollama.librarian_reply = "Ha."

    body = ai_client.post(
        "/chat",
        json={"question": "scarecrow", "attached_notes_only": True},
    ).json()

    assert note_id in [r["id"] for r in body["raw_results"]]
