"""ROADMAP.md item 36 — per-sentence grounding for a direct Q&A answer."""

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
