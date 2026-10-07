"""Questions typed the way people type (INBOX 741, `ai/question_noise.py`).

The owner: "does it cover any and ALL typos, maybe use similarity or
meaning, cover all slang like pls, ty, lol, u, r, wym, etc?". One test per
slang entry, the small-talk words, the typo repair and its guards, meaning
as the fallback, and the noise eval's gates.
"""

from __future__ import annotations

import pytest

from memorymap.ai import composer, intent, question_noise
from tests import _composer_eval as ev


# --- 1. slang -----------------------------------------------------------------


def test_the_slang_table_holds_at_least_two_hundred_entries():
    assert len(question_noise.SLANG) >= 200


@pytest.mark.parametrize(("typed", "meant"), sorted(question_noise.SLANG.items()))
def test_each_slang_entry_is_spelled_out(typed, meant):
    #: In the asking place, where "r" and "y" are read too.
    assert question_noise.repair(f"{typed} x").startswith(meant)


@pytest.mark.parametrize("typed", sorted(question_noise.SLANG))
def test_no_slang_entry_is_a_subject_word_or_a_number(typed):
    assert not typed.isdigit()
    assert typed not in ("may", "mar", "sat", "sun", "ill", "4", "2")


@pytest.mark.parametrize("message", ["ty", "thx", "tysm", "lol", "lmao", "hahahaha", "lmaooo", "ok thx", "ty for the help", "gn", "brb", "kk", ":)", "\U0001F44D"])
def test_small_talk_typed_short_is_small_talk_and_never_searched(message):
    assert question_noise.social_kind(message)
    assert intent.classify(message) == intent.SMALLTALK


@pytest.mark.parametrize("message", ["ty when is the dentist", "lol what did i say about lisbon", "the help desk number"])
def test_a_question_with_small_talk_in_it_is_still_a_question(message):
    assert question_noise.social_kind(message) is None


def test_laughter_and_thanks_get_their_own_reply():
    assert composer.social("lol") in composer.SOCIAL["laugh"]
    assert composer.social("ty") in composer.SOCIAL["thanks"]


# --- 2. typo repair -----------------------------------------------------------


@pytest.mark.parametrize(
    ("typed", "read"),
    [
        ("whenis the dentist", "when is the dentist"),
        ("wh en is the dentist", "when is the dentist"),
        ("howmany testers", "how many testers"),
        ("wehn is the launch", "when is the launch"),
        ("wjen is the dentist", "when is the dentist"),
        ("whrre is the key", "where is the key"),
        ("hoow many testers", "how many testers"),
        ("how manny testers", "how many testers"),
        ("hwo asked", "who asked"),
        ("hwo many", "how many"),
        ("what is the lattest on harbor", "what is the latest on harbor"),
        ("diffrence between a and b", "difference between a and b"),
        ("explian why", "explain why"),
        ("when is the dentist \U0001F9B7", "when is the dentist"),
    ],
)
def test_a_misspelt_asking_word_is_put_right(typed, read):
    assert question_noise.repair(typed) == read


@pytest.mark.parametrize(
    "kept",
    ["then what", "show me the list", "why is the list slow", "the boiler is due", "hat stand", "when is the dentist"],
)
def test_real_words_and_the_subject_are_left_as_typed(kept):
    assert question_noise.repair(kept) == kept


def test_a_neighbouring_key_a_doubled_letter_and_a_dropped_vowel_are_cheap_edits():
    d = question_noise.distance
    assert d("wjen", "when") < d("wzen", "when")
    assert d("whhen", "when") < 1
    assert d("lng", "long") < 1
    assert d("hwo", "how") < 1


# --- 3. meaning as the fallback -------------------------------------------------


@pytest.mark.parametrize(
    ("question", "kind"),
    [
        ("dentist date?", "when"),
        ("address of the hotel", "where"),
        ("progress on the sync rewrite", "status"),
        ("steps to sharpen my knife", "explain"),
        ("price of the trip", "count"),
        ("reason the list was slow", "explain"),
    ],
)
def test_a_question_no_rule_reads_is_matched_to_example_questions(question, kind):
    assert composer.classify(question) == kind


@pytest.mark.parametrize("subject", ["spare key", "lisbon", "the boiler", "harbor launch plan", "trip budget"])
def test_a_bare_subject_stays_a_what(subject):
    assert composer.classify(subject) == "what"


def test_with_an_embedder_meaning_is_measured_by_its_cosine():
    question_noise._EMBED_CACHE.clear()

    def embed(texts):
        #: A toy embedder: "date" words point one way, the rest another.
        return [[1.0, 0.0] if any(w in t for w in ("date", "day", "time", "when")) else [0.0, 1.0] for t in texts]

    assert question_noise.guess_kind("the date of it", embed) is None or question_noise.guess_kind("the date of it", embed) == "when"
    question_noise._EMBED_CACHE.clear()


# --- 4. the noise eval ----------------------------------------------------------


@pytest.fixture(scope="module")
def noise_rows():
    return ev.run_noise()


def test_the_noise_eval_holds_at_least_a_hundred_questions(noise_rows):
    assert len(noise_rows) >= 100


def test_the_hand_written_noisy_questions_are_all_read_as_meant(noise_rows):
    wrong = [(r["question"], r["got"], r["expect"]) for r in noise_rows if r["set"] == "hand" and not r["right"]]
    assert wrong == []


def test_noise_nobody_tuned_against_changes_the_kind_rarely(noise_rows):
    derived = [r for r in noise_rows if r["set"] == "derived"]
    assert sum(r["right"] for r in derived) / len(derived) >= 0.98
