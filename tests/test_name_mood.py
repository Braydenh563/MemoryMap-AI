"""A generated face reads a mood out of the name it is drawn for.

The owner: "would it be funny if for the generated avatar profile pictures,
the application detects the intent or mood from the name ... I have personas
called 'overly dramatic narrator', and 'depressed wizard', 'exitable
academic'", and then: "most people wont do that, so there needs to be some
other way as well ... like if I put in the word pandaSushi101, what would
that generate".

So `nameMood` (app.js) reads a name in four layers, most specific first:
mood words and the nouns that carry one; the way the name is typed (capitals,
punctuation, emoticons, emoji, a few numbers); and, when nothing says
anything, a personality drawn from the name's own hash, so every name still
gets a character and the same name always gets the same one. These tests run
the real function under node and pin what each layer decides.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "frontend" / "app.js").read_text(encoding="utf-8")


def _mood_source() -> str:
    start = APP.index("const NAME_MOOD_LEXICON")
    end = APP.index("\n}\n", APP.index("function nameMood(")) + 3
    return APP[start:end]


def _moods(names: list[str], tmp_path: Path) -> list[dict]:
    node = shutil.which("node")
    if not node:  # pragma: no cover - node is in the sandbox and in CI
        pytest.skip("node is not available")
    script = tmp_path / "mood.js"
    script.write_text(
        _mood_source() + f"\nconsole.log(JSON.stringify({json.dumps(names)}.map(nameMood)));\n",
        encoding="utf-8",
    )
    out = subprocess.run([node, str(script)], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def test_the_owners_personas_get_the_face_their_name_asks_for(tmp_path: Path) -> None:
    dramatic, wizard, academic = _moods(
        ["Overly dramatic narrator", "Depressed wizard", "Exitable academic"], tmp_path
    )
    assert dramatic["mood"] == "dramatic" and dramatic["intense"] is True
    assert wizard["mood"] == "sad" and "hat" in wizard["props"]
    # "exitable" is how it was typed; a face should not need the spelling right.
    assert academic["mood"] == "excited" and "glasses" in academic["props"]
    assert all(m["source"] == "words" for m in (dramatic, wizard, academic))


def test_a_handle_with_no_mood_word_still_says_something(tmp_path: Path) -> None:
    (panda,) = _moods(["pandaSushi101"], tmp_path)
    assert panda["animal"] == "panda"
    assert panda["mood"] == "hungry"
    # Glued together, lower case, the same reading.
    (glued,) = _moods(["pandasushi101"], tmp_path)
    assert glued["animal"] == "panda" and glued["mood"] == "hungry"


def test_the_way_a_name_is_typed_is_read_when_the_words_say_nothing(tmp_path: Path) -> None:
    shout, bang, dots, huh, smile, frown, emoji, beast = _moods(
        ["BRAYDEN", "Maya!", "Liam...", "Tom?", "Sam :)", "Sam :(", "Jo 😴", "Kai666"], tmp_path
    )
    assert shout["intense"] is True and shout["source"] == "hint"
    assert bang["mood"] == "excited"
    assert dots["mood"] == "sleepy"
    assert huh["mood"] == "confused"
    assert smile["mood"] == "happy"
    assert frown["mood"] == "sad"
    assert emoji["mood"] == "sleepy"
    assert "horns" in beast["props"]


def test_short_words_match_whole_words_only(tmp_path: Path) -> None:
    # "mad" is a mood; "Madison" is a name. "cat" is an animal; "Education" is
    # not a cat. A three-letter keyword only ever matches a whole word.
    madison, education, mad_cat = _moods(["Madison", "Education bot", "mad cat"], tmp_path)
    assert madison["mood"] != "angry" or madison["source"] == "seed"
    assert education["animal"] is None and "antenna" in education["props"]
    assert mad_cat["mood"] == "angry" and mad_cat["animal"] == "cat"


def test_nothing_said_draws_a_stable_personality_from_the_name(tmp_path: Path) -> None:
    names = ["Alice", "Ben", "Chloe", "Daniel", "Emma", "Farah", "George", "Hana", "Isaac", "Jade"]
    first = _moods(names, tmp_path)
    again = _moods(names, tmp_path)
    assert first == again
    assert all(m["source"] == "seed" and m["intense"] is False for m in first)
    # A personality, not a costume: a seeded face never gets a prop or an
    # animal, which only a word in the name can ask for.
    assert all(not m["props"] and m["animal"] is None for m in first)
    # Some plain faces and some characters, not ten of one.
    kinds = {m["mood"] for m in first}
    assert len(kinds) >= 4, kinds


def test_an_empty_name_is_quiet(tmp_path: Path) -> None:
    (empty,) = _moods([""], tmp_path)
    assert empty["mood"] is None and not empty["props"] and empty["animal"] is None


def test_names_that_make_no_sense_still_get_a_character(tmp_path: Path) -> None:
    # The owner: "can you improve or expand it even more for names which just
    # make no sence haha??"
    mash, scream, mutant, digits_mash = _moods(["asdfgh", "aaaaaaa", "xqzvbrrt", "k7x9q"], tmp_path)
    assert mash["mood"] == "dizzy" and mash["source"] == "nonsense"
    assert scream["mood"] == "surprised" and scream["intense"] is True
    assert mutant["mutant"] and mutant["source"] == "nonsense"
    assert digits_mash["mutant"]
    # A mutant's traits come from the letters, helixlabs style, so they are
    # stable and two different nonsense names are two different creatures.
    again = _moods(["xqzvbrrt", "zzkrrptt", "bcdfgh", "qwxz"], tmp_path)
    assert again[0]["mutant"] == mutant["mutant"]
    assert len({json.dumps(m["mutant"], sort_keys=True) for m in again}) >= 3


def test_the_internets_own_words_are_read(tmp_path: Path) -> None:
    lol, haha, meh, bruh, uwu, hmm, happy, sooo = _moods(
        ["lol", "hahahaha", "meh", "bruh", "uwu", "hmmmm", "happyyyy", "sooo sleepy"], tmp_path
    )
    assert lol["mood"] == "laughing" and haha["mood"] == "laughing"
    assert meh["mood"] == "unimpressed" and bruh["mood"] == "unimpressed"
    assert uwu["mood"] == "uwu"
    assert hmm["mood"] == "confused"
    # A stretched word is still the word, and a stretched "so" still turns it up.
    assert happy["mood"] == "happy"
    assert sooo["mood"] == "sleepy" and sooo["intense"] is True


def test_a_real_name_is_not_mistaken_for_nonsense(tmp_path: Path) -> None:
    real = _moods(["Alice", "Brayden", "Siobhan", "Nguyen", "Krzysztof", "Chris"], tmp_path)
    assert all(m["source"] == "seed" and not m["mutant"] for m in real[:4])


def test_a_name_that_says_several_things_gets_all_of_them(tmp_path: Path) -> None:
    # The owner: 'what if a there was a name like "Uwu wink wink ahhhhhh ur
    # cooked buddy"'. The first mood word sets the face; the rest stack on it
    # as flavours rather than being thrown away.
    (chaos,) = _moods(["Uwu wink wink ahhhhhh ur cooked buddy"], tmp_path)
    assert chaos["mood"] == "uwu"
    assert {"wink", "scream", "doomed"} <= set(chaos["flavours"])
    (plain,) = _moods(["Alice"], tmp_path)
    assert plain["flavours"] == []


def test_evil_smiles_and_the_rest_of_the_cast(tmp_path: Path) -> None:
    # The owner: "what about evil smiles and other things haha".
    cases = {
        "Evil overlord": ("evil", None),
        "muahahaha": ("evil", None),
        "Vampire": (None, "fangs"),
        "Sick of mondays": ("sick", None),
        "dead inside": ("dead", None),
        "\U0001F480": ("dead", None),
        "Clown": ("laughing", "rednose"),
        "Space cowboy": (None, "cowboy"),
        "birthday girl": (None, "partyhat"),
        "Ninja": ("sly", "ninjamask"),
        "Astronaut": (None, "helmet"),
        "smol bean": ("cute", None),
        "starstruck fan": ("starstruck", None),
        "tipsy": ("drunk", None),
    }
    got = _moods(list(cases), tmp_path)
    for (name, (mood, prop)), reading in zip(cases.items(), got):
        if mood:
            assert reading["mood"] == mood, (name, reading)
        if prop:
            assert prop in reading["props"], (name, reading)


def test_one_hat_per_head(tmp_path: Path) -> None:
    party, king = _moods(["Party wizard", "Wizard king"], tmp_path)
    assert "partyhat" in party["props"] and "hat" not in party["props"]
    assert "hat" in king["props"] and "crown" not in king["props"]


def test_hands_and_the_things_they_hold(tmp_path: Path) -> None:
    # The owner: "could we add some hand gestures like a thumbs up, middle
    # finger, drink bottles, wine glasses, someone ripping a table in half".
    cases = {
        "Nice one": "thumbsup",
        "\U0001F44D": "thumbsup",
        "Rude dude": "middlefinger",
        "\U0001F595": "middlefinger",
        "Peace out": "peace",
        "Hi there": "wave",
        "Beer o clock": "beer",
        "Wine mom": "wine",
        "Latte lover": "mug",
        "Sir Knight": "sword",
        "Detective Pikachu": "magnifier",
        "Karaoke queen": "mic",
        "Bookworm": "book",
        "Selfie queen": "phone",
        "Pizza rat": "pizza",
    }
    got = _moods(list(cases), tmp_path)
    for (name, held), reading in zip(cases.items(), got):
        assert reading["hand"] == held, (name, reading)
    # One hand, one thing in it: the first one named.
    (both,) = _moods(["Beer and wine"], tmp_path)
    assert both["hand"] == "beer"


def test_a_table_flip_is_a_table_flip(tmp_path: Path) -> None:
    flips = _moods(["(╯°□°)╯︵ ┻━┻", "tableflip", "rage quit"], tmp_path)
    assert all(m["hand"] == "tableflip" and m["mood"] == "angry" for m in flips), flips


def test_money_eyes(tmp_path: Path) -> None:
    rich, stonks = _moods(["Filthy rich", "stonks"], tmp_path)
    assert rich["mood"] == "greedy" and stonks["mood"] == "greedy"


def test_plain_faces_vary_their_smiles_and_features(tmp_path: Path) -> None:
    names = [f"Person {chr(65 + i)}{chr(97 + i)}" for i in range(26)]
    got = _moods(names, tmp_path)
    smiles = {m["style"]["smile"] for m in got}
    extras = {e for m in got for e in m["style"]["features"]}
    assert len(smiles) >= 5, smiles
    assert len(extras) >= 3, extras


def test_limbs_are_not_always_hands(tmp_path: Path) -> None:
    # The owner: "not all of them have to have hands btw, some can have feet
    # or tentacles or wings some none at all."
    cases = {
        "Angel": "wings-feather",
        "Dragon": "wings-bat",
        "Bat": "wings-bat",
        "Fairy": "wings-bug",
        "Busy bee": "wings-bug",
        "Kraken": "tentacles",
        "Tentacle monster": "tentacles",
        "Speed walker": "feet",
        "Alice": None,
    }
    got = _moods(list(cases), tmp_path)
    for (name, limbs), reading in zip(cases.items(), got):
        assert reading["limbs"] == limbs, (name, reading)
    octo, bat = _moods(["Octopus", "Bat"], tmp_path)
    assert octo["animal"] == "octopus" and bat["animal"] == "bat"
    # Mutants roll their own: across a handful, more than one kind, and some
    # with none at all.
    mutants = _moods(["xqzvbrrt", "zzkrrptt", "bcdfgh", "qwxz", "k7x9q", "brrrt", "pfft", "grrr", "hmph", "xkcd"], tmp_path)
    kinds = {m["limbs"] for m in mutants if m["mutant"]}
    assert len(kinds) >= 2, kinds
