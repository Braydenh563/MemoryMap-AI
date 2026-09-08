"""ROADMAP.md item 36: per-sentence grounding for a direct Q&A answer."""

from __future__ import annotations

from memorymap.ai.grounding import ground_answer_sentences, split_sentences


def test_splits_on_sentence_boundaries():
    text = "The bread proved overnight. It baked at 220C for 25 minutes."
    assert split_sentences(text) == [
        "The bread proved overnight.",
        "It baked at 220C for 25 minutes.",
    ]


def test_code_fences_are_stripped_before_splitting():
    text = "Here is the fix.\n```python\ndef f(): pass\n```\nThat should do it."
    sentences = split_sentences(text)
    assert "def f" not in "".join(sentences)
    assert "Here is the fix." in sentences


def test_a_sentence_grounds_to_the_note_it_shares_words_with():
    notes = [
        {"id": 1, "content": "The sourdough starter needs feeding daily in the morning."},
        {"id": 2, "content": "Bought new hiking boots for the weekend trip."},
    ]
    answer = "Your sourdough starter needs feeding daily. New hiking boots were bought for the weekend trip."
    result = ground_answer_sentences(answer, notes)
    by_sentence = {g["sentence"]: g["note_id"] for g in result}
    assert by_sentence["Your sourdough starter needs feeding daily."] == 1
    assert by_sentence["New hiking boots were bought for the weekend trip."] == 2


def test_an_ungrounded_sentence_is_omitted_not_mis_grounded():
    notes = [{"id": 1, "content": "The sourdough starter needs feeding daily."}]
    answer = "The sourdough starter needs feeding daily. Completely unrelated musings about astronomy follow."
    result = ground_answer_sentences(answer, notes)
    grounded_sentences = {g["sentence"] for g in result}
    assert "Completely unrelated musings about astronomy follow." not in grounded_sentences
    assert len(result) == 1


def test_short_sentences_are_skipped():
    notes = [{"id": 1, "content": "The sourdough starter needs feeding daily in the morning."}]
    assert ground_answer_sentences("Sure. The sourdough starter needs feeding daily.", notes)[0][
        "sentence"
    ] == "The sourdough starter needs feeding daily."


def test_no_notes_or_empty_answer_grounds_nothing():
    assert ground_answer_sentences("", [{"id": 1, "content": "x"}]) == []
    assert ground_answer_sentences("Some answer.", []) == []


def test_chat_endpoint_includes_sentence_grounding_for_direct_qa(client):
    client.post("/entries", json={"content": "The sourdough starter needs feeding daily in the morning."})
    resp = client.post("/chat", json={"question": "What does the sourdough starter need?"})
    body = resp.json()
    assert "sentence_grounding" in body
    assert isinstance(body["sentence_grounding"], list)


def test_a_paraphrase_grounds_by_the_notes_distinctive_words():
    """Reported: an answer that named three notes cited one. The model
    paraphrases, so plain overlap stays under MIN_OVERLAP_RATIO; the words
    only one candidate note contains ("boots", "snowdon") are what a reader
    uses, so they are what the scorer uses too."""
    notes = [
        {"id": 1, "content": "The sourdough starter needs feeding daily in the morning with rye flour."},
        {"id": 2, "content": "Bought new hiking boots for the weekend trip up Snowdon."},
    ]
    answer = (
        "You had planned to carry those boots all the way up Snowdon, "
        "so remember to pack a spare pair of socks, a map and a torch."
    )
    result = ground_answer_sentences(answer, notes)
    assert [g["note_id"] for g in result] == [2]


def test_distinctive_words_need_a_second_candidate_to_mean_anything():
    """With one note every word is 'distinctive', so the rule would ground
    any sentence sharing two words with it; it stays off until there are
    two candidates to tell apart."""
    notes = [{"id": 2, "content": "Bought new hiking boots for the weekend trip up Snowdon."}]
    answer = (
        "You had planned to carry those boots all the way up Snowdon, "
        "so remember to pack a spare pair of socks, a map and a torch."
    )
    assert ground_answer_sentences(answer, notes) == []


def test_a_sentence_about_two_notes_cites_both():
    notes = [
        {"id": 1, "content": "The sourdough starter needs feeding daily in the morning with rye flour."},
        {"id": 2, "content": "Bought new hiking boots for the weekend trip up Snowdon."},
    ]
    answer = "Feed the sourdough starter with rye flour before you take the hiking boots up Snowdon."
    result = ground_answer_sentences(answer, notes)
    assert {g["note_id"] for g in result} == {1, 2}
    assert len({g["sentence"] for g in result}) == 1


def test_shared_vocabulary_does_not_earn_a_second_citation():
    """Two notes about sourdough: a sentence about one must not cite the
    other on the strength of the words they have in common."""
    notes = [
        {"id": 1, "content": "The sourdough starter needs feeding daily in the morning with rye flour."},
        {"id": 2, "content": "The sourdough loaf baked for forty minutes at two hundred and twenty degrees."},
    ]
    answer = "Your sourdough starter needs feeding daily in the morning with rye flour."
    assert [g["note_id"] for g in ground_answer_sentences(answer, notes)] == [1]


def _stream_events(client, question, **body):
    import json

    with client.stream("POST", "/chat/stream", json={"question": question, **body}) as response:
        assert response.status_code == 200
        return [json.loads(line) for line in response.iter_lines() if line]


def test_a_note_read_by_a_tool_grounds_the_streamed_answer(ai_client, fake_ollama):
    """Reported twice: an agent answer that named several notes cited the
    one retrieval had found, and a skill run cited nothing. The notes the
    model reads through tools mid-turn are what its answer is about; they
    are candidates now, and the event carries a label for each because a
    touched note is not in `raw_results`."""
    saved = ai_client.post(
        "/entries",
        json={"content": "The sourdough starter needs feeding daily in the morning with rye flour."},
    ).json()
    other = ai_client.post(
        "/entries", json={"content": "Bought new hiking boots for the weekend trip up Snowdon."}
    ).json()
    fake_ollama.tool_script = [[{"name": "get_note", "arguments": {"note_id": saved["id"]}}]]
    fake_ollama.librarian_reply = (
        "Your sourdough starter needs feeding daily in the morning with rye flour."
    )
    # A question whose words match neither note, so retrieval finds nothing
    # and the only route to a citation is the note the tool read.
    events = _stream_events(ai_client, "remind me what my kitchen routine was")
    assert any(e["type"] == "tool" for e in events)
    grounding = [e for e in events if e["type"] == "grounding"]
    assert grounding, "the touched note never became a candidate"
    rows = grounding[0]["sentences"]
    assert {row["note_id"] for row in rows} == {saved["id"]}
    assert rows[0]["label"].startswith("The sourdough starter")
    assert other["id"] not in {row["note_id"] for row in rows}


def test_a_private_note_read_by_a_tool_is_never_cited(ai_client, fake_ollama, session):
    """The guard kept where the shape is kept: whatever a tool result names,
    a private note does not become a citation."""
    from memorymap.core.database import Entry

    saved = ai_client.post(
        "/entries",
        json={"content": "The sourdough starter needs feeding daily in the morning with rye flour."},
    ).json()
    entry = session.get(Entry, saved["id"])
    entry.is_private = True
    session.commit()
    fake_ollama.tool_script = [[{"name": "get_note", "arguments": {"note_id": saved["id"]}}]]
    fake_ollama.librarian_reply = (
        "Your sourdough starter needs feeding daily in the morning with rye flour."
    )
    events = _stream_events(ai_client, "remind me what my kitchen routine was")
    assert not [e for e in events if e["type"] == "grounding"]
