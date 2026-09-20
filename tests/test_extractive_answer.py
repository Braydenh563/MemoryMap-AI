"""An answer with no model in it: the notes' own words, chosen and ordered.

Asked for directly (INBOX 269/271, the owner): "I want to maximise the ability
and function of all the application features without ai, the ai features
should just be the bonus", and "maybe there can be a fill-in system
response/description/explanation that can replace the ai using clever sentence
stringing and composition to give the user a breakdown of the results on the
ask page in place of the ai".

The rule these tests exist to hold is the one that makes this safe: **every
sentence returned was typed by the person whose notebook it is.** A version of
this that paraphrased, or stitched half-sentences into fluent-looking prose,
would be producing claims nobody made, in the one kind of application that
must never do that.
"""

from __future__ import annotations

from memorymap.ai import extractive

NOTES = [
    {
        "id": 1,
        "content": (
            "The sourdough starter is fed with rye flour every morning at seven. "
            "It doubles in four hours when the kitchen is warm."
        ),
    },
    {
        "id": 2,
        "content": (
            "My hiking boots need resoling before the Snowdon trip in October. "
            "The cobbler on Mill Lane takes two weeks."
        ),
    },
    {"id": 3, "content": "The garage door opener responds to the blue remote but not the grey one."},
]


def test_every_word_of_the_answer_came_from_a_note() -> None:
    """The whole safety property, as one assertion.

    Anything in the answer that is not the lead has to appear verbatim in the
    note it is attributed to. A future change that starts rewriting passages
    to read better fails here, which is the point.
    """
    out = extractive.answer("what do my notes say about the starter and the boots?", NOTES)
    by_id = {note["id"]: note["content"] for note in NOTES}
    assert out["grounding"], "a question matching two notes must quote something"
    for row in out["grounding"]:
        assert row["sentence"] in by_id[row["note_id"]], (
            "a quoted passage must be the note's own text, character for "
            f"character: {row['sentence']!r}"
        )


def test_the_answer_says_it_is_quoting_rather_than_answering() -> None:
    out = extractive.answer("starter", NOTES)
    assert out["text"].startswith(extractive.LEAD)
    assert "not a written answer" in extractive.LEAD


def test_it_picks_the_notes_the_question_is_about_and_leaves_the_rest() -> None:
    out = extractive.answer("what do my notes say about the starter and the boots?", NOTES)
    cited = {row["note_id"] for row in out["grounding"]}
    assert cited == {1, 2}, (
        "the garage door note shares no meaningful word with the question and "
        f"must not be quoted, got {cited}"
    )


def test_the_offsets_point_at_the_passage_that_was_quoted() -> None:
    """The client highlights the passage inside the note's own card from these.

    An offset that does not line up with the text is a highlight over an
    arbitrary paragraph, which reads as the app being confidently wrong.
    """
    out = extractive.answer("rye flour", NOTES)
    by_id = {note["id"]: note["content"] for note in NOTES}
    for row in out["grounding"]:
        span = by_id[row["note_id"]][row["start"] : row["end"]]
        assert " ".join(span.split()) == row["sentence"] or row["sentence"] in span


def test_a_question_nothing_matches_says_so_rather_than_quoting_at_random() -> None:
    out = extractive.answer("xyzzy plugh frobnicate", NOTES)
    assert out["grounding"] == []
    assert out["text"] == extractive.NOTHING_MATCHED


def test_no_notes_at_all_is_not_a_crash() -> None:
    assert extractive.answer("anything", [])["grounding"] == []
    assert extractive.answer("", NOTES)["grounding"] == []


def test_a_long_passage_is_cut_at_a_word_and_says_it_was_cut() -> None:
    """Tested on the trimmer directly, not through a fixture note.

    A first version fed a long note to `answer` and asserted on what came
    back, and passed vacuously: the passage splitter had already broken that
    note into pieces well under the cap, so nothing was ever trimmed and the
    test proved only that the splitter exists.
    """
    quoted = extractive._trim("word " * 200)
    assert len(quoted) <= extractive.MAX_PASSAGE_CHARS + 1
    assert quoted.endswith("\u2026"), "a cut passage must say it was cut"
    assert not quoted.endswith(" \u2026"), "and must not be cut mid-space"
    #: Short enough to keep is kept whole, punctuation and all.
    assert extractive._trim("A short note.") == "A short note."
    #: And whitespace is flattened, because a passage is quoted inline.
    assert extractive._trim("two\n\nlines") == "two lines"


def test_the_floor_is_relative_so_a_short_note_is_not_discarded() -> None:
    """A first version used an absolute score floor of 0.35 and returned
    nothing for a question whose notes matched correctly: BM25's magnitude
    depends on how many passages a note has and how long they are, so a
    one-paragraph note scoring a perfectly good 0.288 was thrown away.
    """
    out = extractive.answer("starter", NOTES)
    assert out["grounding"], "a one-paragraph note that matches must still be quoted"


def test_the_grounding_rows_are_the_shape_the_client_already_renders() -> None:
    """Same keys `grounding.ground_answer_sentences` produces for a model's
    answer, so nothing downstream needs to know which kind of answer it is
    looking at."""
    out = extractive.answer("boots", NOTES)
    for row in out["grounding"]:
        assert set(row) >= {"sentence", "note_id", "start", "end", "score"}
        assert isinstance(row["note_id"], int)
        assert row["end"] > row["start"] >= 0
