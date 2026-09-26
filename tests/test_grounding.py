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


def test_prose_from_two_rounds_is_not_glued_into_one_sentence(ai_client, fake_ollama):
    """INBOX 40, the half that made a skill run cite nothing at all.

    A multi-round turn writes its prose in bursts with a tool call between
    them, and the transcript draws each burst as its own paragraph. The route
    used to concatenate the raw deltas, so the last sentence of one round and
    the first of the next arrived as "…rye flour.The starter…": one string
    with no whitespace after the full stop, which `split_sentences` cannot
    split. The grounding row it produced named a "sentence" that appears in no
    paragraph on screen, so the client's citation walker could never find it
    and every marker in the turn was lost.
    """
    saved = ai_client.post(
        "/entries",
        json={"content": "The sourdough starter needs feeding daily in the morning with rye flour."},
    ).json()
    ai_client.post(
        "/entries", json={"content": "Bought new hiking boots for the weekend trip up Snowdon."}
    )
    # Round one narrates *and* calls a tool, which is the only shape this fake
    # has that puts prose before a tool event; round two answers.
    fake_ollama.text_tool_reply = (
        "Your sourdough starter needs feeding daily in the morning with rye flour."
        '<tool_call>{"name": "get_note", "arguments": {"note_id": %d}}</tool_call>' % saved["id"]
    )
    fake_ollama.librarian_reply = (
        "The starter is fed daily in the morning with rye flour, as your note says."
    )
    events = _stream_events(ai_client, "remind me what my kitchen routine was")
    grounding = [e for e in events if e["type"] == "grounding"]
    assert grounding, "the touched note never became a candidate"
    rows = grounding[0]["sentences"]
    # Each grounded sentence is one sentence: it ends with its full stop and
    # carries no second one glued to it, which is what makes it findable in a
    # single paragraph of the transcript.
    for row in rows:
        assert row["sentence"].endswith("."), row["sentence"]
        assert row["sentence"].count(".") == 1, row["sentence"]
    assert len(rows) >= 2, f"both rounds should ground, got {rows}"


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


# --- the passage, not the note (CHAT_PLAN decision 2) -------------------------


LONG_NOTE = (
    "Kitchen notes for the month.\n\n"
    "The sourdough starter lives in the fridge and comes out on a Friday. "
    "It is fed twice with strong white flour before it is used, and it doubles "
    "in about five hours on the counter when the kitchen is warm.\n\n"
    "The rye loaf is a different thing altogether: it takes 180 grams of rye "
    "flour, no kneading at all, and it bakes in a covered tin at 200C for "
    "fifty minutes.\n\n"
    "The pizza dough is the same starter, more water, and a cold prove of two "
    "days in the fridge before it is stretched out and topped.\n\n"
    "Bread bins are useless. A paper bag and a cut face down on the board keeps "
    "a loaf for two days without turning the crust to leather."
)


def test_a_mark_points_at_the_passage_the_claim_came_from():
    """A whole-note mark says "it is in here somewhere", which is what the
    citation was doing before: this note says "starter" in three of its five
    paragraphs, so word counting cannot pick between them and BM25 over the
    note's own passages can."""
    notes = [{"id": 7, "content": LONG_NOTE}]
    answer = "The rye loaf takes 180 grams of rye flour and bakes at 200C for fifty minutes."
    row = ground_answer_sentences(answer, notes)[0]
    assert row["note_id"] == 7
    passage = LONG_NOTE[row["start"] : row["end"]]
    assert "rye" in passage and "covered tin" in passage
    # The passage is a passage, not the note, and not a fragment of one word.
    assert 20 < len(passage) < len(LONG_NOTE)
    assert row["score"] > 0


def test_the_number_a_claim_quotes_pulls_the_passage_to_it():
    """Decision 2's second check. "Two days" appears in two paragraphs here,
    and only one of them is about the dough."""
    notes = [{"id": 7, "content": LONG_NOTE}]
    answer = "The pizza dough gets a cold prove of two days in the fridge before stretching."
    row = ground_answer_sentences(answer, notes)[0]
    assert "pizza" in LONG_NOTE[row["start"] : row["end"]]


def test_a_short_note_is_its_own_passage():
    """Highlighting the whole of a two-line note is the honest answer, not a
    window padded out to forty words."""
    notes = [
        {"id": 1, "content": "The sourdough starter needs feeding daily in the morning."},
        {"id": 2, "content": "Bought new hiking boots for the weekend trip."},
    ]
    row = ground_answer_sentences("Your sourdough starter needs feeding daily.", notes)[0]
    assert (row["start"], row["end"]) == (0, 56)


def test_the_spans_are_offsets_into_the_note_that_was_sent():
    """The span has to be usable by the caller without re-finding the text: a
    highlight computed against different characters is a highlight in the wrong
    place, and every note here says "starter" more than once."""
    notes = [{"id": 7, "content": LONG_NOTE}]
    answer = (
        "The starter is fed twice with strong white flour before it is used. "
        "A paper bag keeps a cut loaf for two days without the crust turning to leather."
    )
    rows = ground_answer_sentences(answer, notes)
    assert len(rows) == 2
    first, second = rows
    assert "strong white flour" in LONG_NOTE[first["start"] : first["end"]]
    assert "paper bag" in LONG_NOTE[second["start"] : second["end"]]
    assert first["start"] < second["start"]


# --- formatted answers and grounding as the answer streams (INBOX 318, 320) ---


#: The shape a real instruct model answers in, and the shape the Ask sweep
#: measured with no marker placed at all: a lead-in ending in a colon, a list
#: whose items open with a bold label, a closing sentence with emphasis in it.
MARKDOWN_ANSWER = (
    "Here is what your notes say:\n\n"
    "- **Boots:** My hiking boots need resoling before the Snowdon trip in October.\n"
    "- **Starter:** The sourdough starter is fed with rye flour every morning at seven.\n\n"
    "Also, the garage *door* opener responds to the blue remote but not the grey one."
)
THREE_NOTES = [
    {"id": 1, "content": "My hiking boots need resoling before the Snowdon trip in October."},
    {"id": 2, "content": "The sourdough starter is fed with rye flour every morning at seven."},
    {"id": 3, "content": "The garage door opener responds to the blue remote but not the grey one."},
]


def test_a_sentence_never_runs_across_two_blocks():
    """INBOX 318, measured: the lead-in and the first list item came back as
    one "sentence", because a colon does not end one and a list marker is not
    a capital letter. That string exists in no single paragraph on screen, so
    the client could never place its marker, and the owner saw one marker
    where the grounding had found three notes."""
    sentences = split_sentences(MARKDOWN_ANSWER)
    assert sentences[0] == "Here is what your notes say:"
    assert not any("\n" in s for s in sentences), sentences
    assert len(sentences) == 4


def test_list_and_heading_markers_are_not_part_of_the_sentence():
    """The rendered list item has no "- " and no "1. " in its text, so a
    sentence that kept them could never be matched against it."""
    text = (
        "## Plans\n\n1. Resole the hiking boots before October.\n"
        "2. Feed the rye starter at seven.\n> Quoted line from a note here."
    )
    assert split_sentences(text) == [
        "Plans",
        "Resole the hiking boots before October.",
        "Feed the rye starter at seven.",
        "Quoted line from a note here.",
    ]


def test_a_hard_wrapped_paragraph_is_still_one_sentence():
    """A line break inside a paragraph is a soft break when rendered, so it
    must not cut the sentence in half either."""
    text = "The sourdough starter is fed with rye\nflour every morning at seven."
    assert split_sentences(text) == [
        "The sourdough starter is fed with rye flour every morning at seven."
    ]


def test_every_note_a_formatted_answer_draws_on_is_grounded():
    rows = ground_answer_sentences(MARKDOWN_ANSWER, THREE_NOTES)
    assert {row["note_id"] for row in rows} == {1, 2, 3}


def test_an_unclosed_code_fence_is_not_grounded():
    """Mid-stream the closing fence has not arrived yet; code is still not a
    claim, whichever half of it has streamed."""
    text = "Here is the fix for the hiking boots.\n```python\ndef resole_the_hiking_boots(): pass"
    assert "def" not in " ".join(split_sentences(text))


def test_the_live_grounder_marks_each_sentence_once_it_is_complete():
    """INBOX 320: the Matching records numbers arrived with the finished
    answer, because grounding ran once, at the end. Fed the answer as it
    streams, the grounder names a note as soon as the sentence citing it is
    complete, never for a sentence still being written, and never twice."""
    from memorymap.ai.grounding import SentenceGrounder

    grounder = SentenceGrounder(THREE_NOTES)
    second_item = MARKDOWN_ANSWER.index("- **Starter")
    # The first list item is complete once the second one has begun.
    assert grounder.feed(MARKDOWN_ANSWER[: second_item - 30]) == []
    rows = grounder.feed(MARKDOWN_ANSWER[: second_item + 14])
    assert [row["note_id"] for row in rows] == [1]
    # Nothing new until another sentence completes.
    assert grounder.feed(MARKDOWN_ANSWER[: second_item + 30]) == []
    assert [row["note_id"] for row in grounder.feed(MARKDOWN_ANSWER)] == [2]
    # The last sentence has nothing after it, so only the end of the answer
    # says it is complete.
    assert [row["note_id"] for row in grounder.finish(MARKDOWN_ANSWER)] == [3]
    assert grounder.rows == ground_answer_sentences(MARKDOWN_ANSWER, THREE_NOTES)


def test_the_stream_numbers_a_note_before_the_answer_is_finished(ai_client, fake_ollama):
    """The event the Ask tab numbers its records from arrives between the
    answer's deltas, not after the last one; and the final grounding event,
    which the saved turn and the support line read, is unchanged by it."""
    boots = ai_client.post("/entries", json={"content": THREE_NOTES[0]["content"]}).json()
    starter = ai_client.post("/entries", json={"content": THREE_NOTES[1]["content"]}).json()
    #: The fake streams its reply in two halves, so the second sentence is
    #: longer than the first: the split then falls inside it, and the first
    #: sentence is complete (another has begun) before the last delta.
    fake_ollama.librarian_reply = (
        "My hiking boots need resoling before the Snowdon trip in October. "
        "The sourdough starter is fed with rye flour every morning at seven, "
        "before anyone else in the house is awake."
    )
    events = _stream_events(
        ai_client,
        "what about the hiking boots and the sourdough starter",
        notes_only=True,
        use_tools=False,
    )
    kinds = [e["type"] for e in events]
    last_answer = max(i for i, kind in enumerate(kinds) if kind == "answer")
    live = [i for i, kind in enumerate(kinds) if kind == "grounding_live"]
    assert live and live[0] < last_answer, kinds
    assert {row["note_id"] for row in events[live[0]]["sentences"]} == {boots["id"]}
    final = [e for e in events if e["type"] == "grounding"]
    assert len(final) == 1
    assert {row["note_id"] for row in final[0]["sentences"]} == {boots["id"], starter["id"]}


# --- a note the answer names by its number (the owner, 2026-09-24) ----------
#: "the ask subtab search ai in-text number referencing didnt pick up note 6":
#: the answer said "(Notes 1, 5, and 6 all reinforce these specific
#: examples)" and was marked 5 only, because two notes holding the same
#: question score within a hair of each other and the single-best rule keeps
#: one. The prompt numbers the notes 1..n in this list's order, so a number
#: the model wrote is a citation it made, and it is honoured when the named
#: note shares the sentence's words (a stray "note 3" in prose about
#: something else is not).

_SPICE = [
    {"id": 11, "content": "The complete social skills guide: openers, rapport, the ask, follow up."},
    {"id": 12, "content": "Gym routine overview: squats on Monday, rows on Thursday."},
    {"id": 13, "content": "Weekly groceries: oats, milk, coffee beans."},
    {"id": 14, "content": "Reading list for the winter, three novels."},
    {"id": 15, "content": 'Ice breakers: ask "If you were a spice, which one would you be and why?" to ease tension.'},
    {"id": 16, "content": 'Ice breakers: "If you were a spice, which one would you be and why?"'},
]


def test_a_note_the_answer_names_by_number_is_cited():
    sentence = (
        'Ask "If you were a spice, which one would you be and why?" '
        "(Notes 1, 5, and 6 all reinforce these specific examples)."
    )
    cited = {row["note_id"] for row in ground_answer_sentences(sentence, _SPICE)}
    assert {15, 16} <= cited


def test_a_named_number_with_nothing_in_common_is_not_cited():
    sentence = 'Ask "If you were a spice, which one would you be and why?" as note 3 says.'
    cited = {row["note_id"] for row in ground_answer_sentences(sentence, _SPICE)}
    assert 13 not in cited


def test_a_named_number_past_the_prompt_list_is_ignored():
    sentence = 'Ask "If you were a spice, which one would you be and why?" (note 9).'
    rows = ground_answer_sentences(sentence, _SPICE)
    assert all(row["note_id"] in {n["id"] for n in _SPICE} for row in rows)
