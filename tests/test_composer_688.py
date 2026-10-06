"""The composed answer from the notes (INBOX 688, `ai/composer.py`).

The rule under test, the brief's own words: every factual clause in a composed
answer is either the person's own words (a quoted or lightly trimmed sentence
from a note, cited) or a number or date the app measured; only connective
tissue comes from templates. `assert_traceable` checks that of every answer
these tests produce, part by part, against the notes the answer was given.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

import pytest

from memorymap.ai import composer

TODAY = date(2026, 10, 6)
#: Spelled by its code point: the lint reads this file too.
EM_DASH = chr(0x2014)


def _note(note_id: int, content: str, days_ago: int, **extra) -> dict:
    return {
        "id": note_id,
        "content": content,
        "created_at": (TODAY - timedelta(days=days_ago)).isoformat(),
        **extra,
    }


NOTES = [
    _note(1, "# Harbor launch plan\n\nShip the mobile app to the public on the 14th of next month. "
          "Three gates before then: beta feedback closed, the onboarding rewrite merged, and the "
          "pricing page signed off.\n\n- [x] Beta invite list\n- [x] Crash reporting\n- [ ] Store listing copy", 30),
    _note(2, "# Beta feedback, week 2\n\n41 testers active. The top complaint is the sign-up flow "
          "(nine fields). So, offline mode is hard to find.", 20),
    _note(3, "# Public API, maybe\n\nThree people in the beta asked for one. Not before launch.", 12),
    _note(4, "# Dentist\n\nCheck-up booked for the 21st. Ask about the night guard.", 9),
    _note(5, "# Reading list\n\n- Designing Data-Intensive Applications\n- The Mom Test\n- A Pattern Language", 40),
    _note(6, "# Lisbon, where to stay\n\nAlfama has the walk-everywhere feel, but the hills are steep. "
          "Príncipe Real is quieter and close to the metro.", 25),
    _note(7, "# Porto, three days\n\nRibeira at sunset, and a port lodge tour across the bridge in Gaia.", 24),
    _note(8, "# Why the list felt slow\n\nIt was not the database. Every row re-measured its own height on "
          "scroll. Caching the height per row took a long list from 40ms a frame to 6.", 15),
    _note(9, "# Sync rewrite, first notes\n\nThe conflict rule is last-writer-wins today, which silently "
          "drops edits. Proposal: keep both versions and ask.", 50),
    _note(10, "# Sync rewrite, week 3\n\nThe sync rewrite now keeps both versions and asks. Merged behind a flag.", 3),
    _note(11, "# Offline as the headline\n\nBeta testers did not know Harbor works offline.", 10),
    _note(12, "# Standup\n\nThe launch date is the 14th of next month.", 5),
    _note(13, "# Standup again\n\nThe launch date is the 21st of next month, moved a week.", 1),
    _note(14, "Note with no heading about the garden shed roof. It leaks in the north corner.", 2),
]


def _by_id(notes):
    return {note["id"]: note for note in notes}


def _flat(text: str) -> str:
    return " ".join(text.split())


def _measured_values(notes: list[dict]) -> set[str]:
    """Every value the app could have measured over these notes: counts up to
    the number of notes (as digits and as words) and every note's day."""
    values = {str(n) for n in range(len(notes) + 1)}
    values |= set(composer._NUMBER_WORDS[: len(notes) + 1])
    for note in notes:
        day = date.fromisoformat(note["created_at"][:10])
        month = composer._MONTHS[day.month - 1]
        values |= {f"{day.day} {month}", f"{day.day} {month} {day.year}"}
        if day == TODAY:
            values.add("today")
        if (TODAY - day).days == 1:
            values.add("yesterday")
    return values


def assert_traceable(result: dict, question: str, notes: list[dict]) -> None:
    """Every part of the answer is a template, a quote of the note it names, a
    note's name, a measured value or a word of the question; and the parts are
    the whole text, so nothing can sit between them unchecked."""
    by_id = _by_id(notes)
    parts = result["parts"]
    assert "".join(part[1] for part in parts) == result["text"]
    templates = set(composer.PHRASES.values())
    measured = _measured_values(notes)
    for part in parts:
        kind, text = part[0], part[1]
        if kind == "template":
            assert text in templates, f"not a fixed phrase: {text!r}"
        elif kind == "quote":
            content = _flat(by_id[part[2]]["content"])
            body = text.rstrip("…")
            assert body[1:] in content and (body[0].lower() + body[1:] in content or body in content), (
                f"quote not in note {part[2]}: {text!r}"
            )
        elif kind == "title":
            first = re.sub(r"[*_`#]", "", by_id[part[2]]["content"].split("\n", 1)[0]).strip()
            assert first.startswith(text.rstrip("…")), f"not note {part[2]}'s name: {text!r}"
        elif kind == "measure":
            assert text in measured, f"not a measured value: {text!r}"
        elif kind == "asked":
            assert text.lower() in question.lower(), f"not from the question: {text!r}"
        else:  # pragma: no cover - a new kind must be added here first
            raise AssertionError(f"unknown part kind {kind!r}")
    for row in result["grounding"]:
        content = by_id[row["note_id"]]["content"]
        span = _flat(content[row["start"]:row["end"]])
        body = row["sentence"].rstrip("…")
        assert span[:1].lower() == body[:1].lower() and span[1:].startswith(body[1:]), (
            f"row {row['sentence']!r} does not point at its own text: {span!r}"
        )
        assert row["sentence"] in result["text"]
    #: The copy rules the whole app holds: no em-dashes, no exclamation marks.
    assert EM_DASH not in result["text"] and "!" not in result["text"].replace("![", "")


def ask(question: str, notes=NOTES, **kwargs) -> dict:
    result = composer.compose(question, notes, today=TODAY, **kwargs)
    assert_traceable(result, question, notes)
    return result


# --- the question --------------------------------------------------------------


@pytest.mark.parametrize(
    ("question", "shape"),
    [
        ("What is the Harbor launch plan?", "what"),
        ("When is the dentist check-up?", "when"),
        ("Who asked for a public API?", "who"),
        ("How many beta testers are active?", "count"),
        ("Which books are on my reading list?", "list"),
        ("Compare Lisbon and Porto", "compare"),
        ("Lisbon vs Porto", "compare"),
        ("Why did the list feel slow?", "explain"),
        ("How do I make pizza?", "explain"),
        ("What is the latest on the sync rewrite?", "status"),
        ("Does Harbor work offline?", "yesno"),
        ("tell me about the garden", "what"),
    ],
)
def test_the_shape_is_read_from_the_wording(question, shape):
    assert composer.classify(question) == shape


def test_the_subject_drops_the_asking_words():
    assert composer.subject_terms("What is the latest on the sync rewrite?") == ["sync", "rewrite"]
    assert "feel" not in composer.subject_terms("Why did the list feel slow?")


def test_compare_finds_both_sides():
    assert composer.compare_sides("Compare Lisbon and Porto") == ("Lisbon", "Porto")
    assert composer.compare_sides("What is the difference between Lisbon and Porto?") == ("Lisbon", "Porto")
    assert composer.compare_sides("Lisbon vs Porto") == ("Lisbon", "Porto")


# --- the notes, as sentences ----------------------------------------------------


def test_a_note_reads_as_sentences_and_items_with_offsets():
    view = composer.read_note(NOTES[0], 0)
    assert view.title == "Harbor launch plan"
    texts = [s.text for s in view.sentences]
    assert texts[0] == "Ship the mobile app to the public on the 14th of next month."
    assert texts[1].startswith("Three gates before then")
    tasks = [s for s in view.sentences if s.kind == "task"]
    assert [(s.text, s.done) for s in tasks] == [
        ("Beta invite list", True),
        ("Crash reporting", True),
        ("Store listing copy", False),
    ]
    for s in view.sentences:
        assert NOTES[0]["content"][s.start:s.end] == s.text


def test_a_leading_discourse_word_is_trimmed_and_the_offsets_follow():
    view = composer.read_note(NOTES[1], 0)
    last = view.sentences[-1]
    assert last.text == "Offline mode is hard to find."
    assert NOTES[1]["content"][last.start:last.end] == "offline mode is hard to find."


def test_a_note_without_a_heading_is_named_by_its_first_words():
    view = composer.read_note(NOTES[13], 0)
    assert view.title == "Note with no heading about the…"
    #: Its first sentence is still quotable: the name is not the body.
    assert view.sentences[0].text.startswith("Note with no heading")


def test_a_long_sentence_is_cut_at_a_word_and_says_so():
    long = "This sentence goes on " + "and on " * 80 + "until it ends."
    view = composer.read_note(_note(99, f"# Long\n\n{long}", 1), 0)
    text = view.sentences[0].text
    assert text.endswith("…") and len(text) <= composer.MAX_QUOTE_CHARS + 1


# --- composition, one test per shape ----------------------------------------------


def test_what_leads_with_the_note_named_by_the_question_and_shows_its_checklist():
    result = ask("What is the Harbor launch plan?")
    text = result["text"]
    assert text.startswith(("Your note **Harbor launch plan**", "From your note **Harbor launch plan**",
                            "The closest match is your note **Harbor launch plan**"))
    assert "> Ship the mobile app to the public on the 14th of next month." in text
    assert "- [x] Beta invite list\n- [x] Crash reporting\n- [ ] Store listing copy" in text
    assert result["support"]["ratio"] == 1.0 and not result["support"]["low"]


def test_when_leads_with_the_dated_sentence():
    result = ask("When is the dentist check-up?")
    assert "**Dentist**" in result["text"].split("\n", 1)[0]
    assert "> Check-up booked for the 21st." in result["text"]


def test_when_without_a_date_in_the_sentence_says_the_day_it_was_written():
    notes = [_note(1, "# Flights\n\nBooked, seats 14A and 14B on the evening plane.", 4)]
    result = ask("When did I book the flights?", notes)
    first = result["text"].split("\n", 1)[0]
    assert first == "From your note **Flights**, written 2 October:"


def test_when_lists_the_other_notes_in_the_order_they_were_written():
    result = ask("When is the launch date?")
    text = result["text"]
    assert "**In the order you wrote them**" in text
    timeline = text.split("**In the order you wrote them**", 1)[1]
    days = re.findall(r"^- (\d+ \w+), in", timeline, re.M)
    parsed = [date(2026, composer._MONTH_INDEX[d.split()[1].lower()], int(d.split()[0])) for d in days]
    assert parsed == sorted(parsed)


def test_who_quotes_the_sentence_that_names_who():
    result = ask("Who asked for a public API?")
    assert "> Three people in the beta asked for one." in result["text"]


def test_count_leads_with_the_figure():
    result = ask("How many beta testers are active?")
    first, rest = result["text"].split("\n\n", 1)
    assert "**Beta feedback, week 2**" in first
    assert rest.startswith("> 41 testers active.")


def test_list_answers_with_the_persons_own_list():
    result = ask("Which books are on my reading list?")
    assert result["text"].startswith("From your note **Reading list**:")
    assert "- Designing Data-Intensive Applications\n- The Mom Test\n- A Pattern Language" in result["text"]


def test_compare_draws_two_sides_with_measured_counts():
    result = ask("Compare Lisbon and Porto")
    text = result["text"]
    assert text.startswith(composer.PHRASES["each_side"])
    assert "**Lisbon** (one note)" in text and "**Porto** (one note)" in text
    lisbon, porto = text.split("**Porto**", 1)
    assert "Alfama" in lisbon and "Ribeira" in porto


def test_explain_keeps_the_notes_sentences_in_their_own_order():
    result = ask("Why did the list feel slow?")
    quote = next(line for line in result["text"].splitlines() if line.startswith("> "))
    assert quote == (
        "> It was not the database. Every row re-measured its own height on scroll. "
        "Caching the height per row took a long list from 40ms a frame to 6."
    )


def test_status_leads_with_the_newest_and_lists_the_earlier_newest_first():
    result = ask("What is the latest on the sync rewrite?")
    text = result["text"]
    assert "**Sync rewrite, week 3**" in text.split("\n", 1)[0]
    assert text.split("\n", 1)[0].startswith(("The most recent, written 3 October", "The newest note on this, from 3 October"))
    assert "**Earlier**\n- 17 August, in **Sync rewrite, first notes**" in text


def test_yes_no_never_answers_yes_or_no():
    result = ask("Does Harbor work offline?")
    first = result["text"].split("\n", 1)[0]
    assert first.startswith(("The closest your notes come is", "Nothing here says it outright"))
    assert not re.search(r"\b(yes|no)\b[,.]", result["text"].split("\n\n", 1)[0], re.I)


def test_two_notes_that_may_disagree_are_named_newer_first():
    result = ask("What is the launch date?")
    text = result["text"]
    assert "**These two may disagree, the newer first**" in text
    pair = text.split("**These two may disagree, the newer first**", 1)[1]
    assert pair.index("Standup again") < pair.index("**Standup** (")


def test_words_no_note_found_holds_are_named_in_the_closing_line():
    result = ask("What hotel is near the Porto lodge?")
    assert result["text"].endswith("None of these notes mention “hotel”.")


def test_the_closing_line_is_left_out_when_nothing_matched_at_all():
    result = ask("What is the capital of Peru?")
    assert result["text"] == composer.PHRASES["nothing"]
    assert result["grounding"] == []


def test_the_newest_notes_for_a_question_with_no_subject():
    newest = sorted(NOTES, key=lambda n: n["created_at"], reverse=True)
    result = ask("what did I write recently", newest, recent=True)
    assert result["shape"] == "recent"
    assert result["text"].startswith("Your newest notes, from 27 September to yesterday:")
    assert result["text"].count("\n- ") == 5


def test_near_duplicates_are_dropped():
    notes = [
        _note(1, "# A\n\nThe boiler pressure keeps dropping to 0.8 bar.", 3),
        _note(2, "# B\n\nThe boiler pressure keeps dropping to 0.8 bar again.", 2),
    ]
    result = ask("What about the boiler pressure?", notes)
    assert result["text"].count("keeps dropping") == 1


def test_a_connected_note_ranks_below_a_matching_one():
    notes = [
        _note(1, "# Linked\n\nThe boiler pressure was fine in May.", 3, connected=True),
        _note(2, "# Boiler\n\nThe boiler pressure keeps dropping.", 2),
    ]
    result = ask("What about the boiler pressure?", notes)
    assert "**Boiler**" in result["text"].split("\n", 1)[0]


# --- the grounding --------------------------------------------------------------


def test_every_quote_is_cited_once_with_its_exact_span():
    result = ask("What is the Harbor launch plan?")
    sentences = [row["sentence"] for row in result["grounding"]]
    assert len(sentences) == len(set(sentences))
    assert all(row["verdict"] == "supported" for row in result["grounding"])
    assert all(row["note_id"] in {n["id"] for n in NOTES} for row in result["grounding"])


def test_support_counts_the_quotes_not_the_connective_words():
    result = ask("Why did the list feel slow?")
    #: Three quotes; the first ("It was not the database.") is under
    #: `grounding.MIN_SENTENCE_WORDS` and is counted in neither half, as for
    #: any answer.
    assert len(result["grounding"]) == 3
    assert result["support"]["supported"] == result["support"]["sentences"] == 2
    assert result["support"]["unsupported"] == []


# --- fluency without invention -------------------------------------------------------


def test_the_same_question_composes_the_same_answer():
    assert ask("What is the Harbor launch plan?")["text"] == ask("What is the Harbor launch plan?")["text"]


def test_openings_vary_across_questions():
    openings = {
        ask(q)["text"].split("**", 1)[0]
        for q in (
            "What is the Harbor launch plan?",
            "What about the public API?",
            "Tell me about the dentist",
            "What about Lisbon?",
            "What did the beta feedback say?",
            "What about the reading list?",
        )
    }
    assert len(openings) >= 2


@pytest.mark.parametrize("phrase", list(composer.PHRASES.values()))
def test_every_phrase_follows_the_copy_rules(phrase):
    assert EM_DASH not in phrase and "!" not in phrase
    assert "Oops" not in phrase
    letters = phrase.strip(" -*>“”():,.\n")
    if letters and letters[0].isalpha() and phrase[0].isalpha():
        assert letters[0].isupper() or phrase.startswith(("a ", "one", "or")), phrase


def test_the_rule_holds_over_a_sweep_of_questions():
    """Every answer to a spread of questions passes the traceability check
    (`ask` runs it), whatever shape the question takes."""
    for question in (
        "what about offline",
        "how much did the API cost",
        "who is on the beta",
        "which tasks are done for the launch",
        "is the sync rewrite merged",
        "how do I fix the slow list",
        "what is the status of the dentist",
        "when are the gates",
        "garden shed roof",
        "difference between Alfama and Príncipe Real",
    ):
        ask(question)


def test_a_notes_tags_say_what_it_is_about_without_being_quoted():
    """"Reading list", tagged books, answers "which books am I reading" though
    no line of it says "book"; the tag picks the note and is never quoted."""
    notes = [
        _note(1, "# Reading list\n\n- Designing Data-Intensive Applications\n- The Mom Test", 5, tags=["books"]),
        _note(2, "# Teach what I just learned\n\nWrite a short post after each book I am reading.", 3),
    ]
    result = ask("Which books am I reading?", notes)
    assert result["text"].startswith("From your note **Reading list**:")
    assert "books" not in result["text"].split("\n", 1)[1].lower().replace("**", "")


def test_the_word_list_is_a_subject_unless_it_opens_the_question():
    assert composer.subject_terms("Why did the list feel slow?") == ["list", "slow"]
    assert composer.subject_terms("List my books") == ["books"]


def test_a_sentence_that_leans_back_brings_the_one_it_leans_on():
    notes = [
        _note(1, "# Main\n\nThe beta testers are the subject here, all of them active.", 4),
        _note(2, "# Teach\n\nWrite a short post after each book. It keeps the beta testers reading.", 3),
    ]
    result = ask("What about the beta testers?", notes)
    assert "Write a short post after each book. It keeps the beta testers reading." in result["text"]


def test_closest_match_wording_is_kept_for_the_first_result() -> None:
    """INBOX 724: the lead said "The closest match is your note" about the
    third note found; "closest" is said only of the search's first result."""
    import inspect

    from memorymap.ai import composer as mod

    body = inspect.getsource(mod._lead)
    assert '["a", "b", "c"] if s.rank == 0 else ["a", "b"]' in body


def test_an_answer_no_model_wrote_says_so_in_its_support_notice() -> None:
    """INBOX 724: "this message needs to be altered as a model wasnt used"."""
    from pathlib import Path

    routes = Path("src/memorymap/api/routes_chat.py").read_text(encoding="utf-8")
    assert routes.count('"by_model": False') >= 2
    js = Path("frontend/js/capture-ask.js").read_text(encoding="utf-8")
    body = js[js.index("function renderAnswerSupport") :]
    body = body[: body.index("\n}\n")]
    assert "support.by_model === false" in body and "no model wrote any of it" in body
