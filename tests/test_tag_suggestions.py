"""Tag suggestions with no model, measured (INBOX 781: "I want the
deterministic engine to be better for when suggesting tags, both for popup
suggestions, when using the 'tag and file with atlas', and also when making a
note").

The set is `tests/fixtures/tagging/notes.json` (67 notes, `tests/_tag_eval.py`
says how each number is counted), leave one out, `ai/tagging.suggest`:

| step | p1 | p3 | recall3 | shown | junk | category filed / first choice |
| --- | --- | --- | --- | --- | --- | --- |
| before (2026-10-10, `lexical_filing.suggest_tags`) | 0.687 | 0.769 | 0.619 | 78 | 1 | 0.612 / 0.881 |
| quotes, image addresses and OCR footers out; multi-word tags need every word | 0.716 | 0.842 | 0.660 | 76 | 0 | 0.612 / 0.881 |
| folded words ("stats", "running") and the pack's phrases vote | 0.791 | 0.667 | 0.701 | 102 | 0 | |
| a phrase backs a tag only when no alternative tag names its topic; a sibling of a said tag needs to be used with it | 0.791 | 0.861 | 0.701 | 79 | 0 | 0.612 / 0.881 |

The title and first line counting twice measured no change on this set (its
notes are short); links and turn-downs have no rows here and are tested
below. Category filing is unchanged: most misses are sensitive notes held for
the person (decision 6), and the first choice offered is right 0.881.
"""

from __future__ import annotations

import json

from memorymap.ai import tagging
from memorymap.core.database import EntryLink
from memorymap.entry import manager
from tests import _tag_eval

#: The floors this file holds; a step may not fall below them.
FLOOR = {"p1": 0.79, "p3": 0.85, "recall3": 0.70, "category_first": 0.88}


def test_the_set_is_sixty_notes_or_more_each_with_a_reason() -> None:
    notes = _tag_eval.NOTES
    assert len(notes) >= 60
    assert all(note["reason"] and note["tags"] and note["category"] for note in notes)
    assert {"line", "list", "pasted", "caption"} <= {note["kind"] for note in notes}


def test_suggestions_hold_their_floor_with_no_junk(session) -> None:
    out = _tag_eval.measure(session)
    rows = out.pop("rows")
    assert out["junk"] == 0, [row for row in rows if row["junk"]]
    for name, floor in FLOOR.items():
        assert out[name] >= floor, (name, out)


def _notebook(session, notes) -> None:
    for text, tags in notes:
        manager.create_entry(session, text, category_name="Uni", tags=tags)
    session.commit()


def test_a_word_said_only_in_a_quote_is_not_a_tag(session) -> None:
    _notebook(session, [("Gym: squats and bench", ["gym"]), ("Gym: deadlifts", ["gym"]), ("Coffee with Sam", ["friends"])])
    offered = tagging.suggest(session, 'Jordan said "you should really try the gym with me", maybe soon', have=[])
    assert "gym" not in offered, offered


def test_a_pasted_quotation_is_still_the_note(session) -> None:
    _notebook(session, [("Gym: squats and bench", ["gym"]), ("Gym: deadlifts", ["gym"])])
    offered = tagging.suggest(session, 'From the coach: "Gym at six, squats then bench, rest two minutes."', have=[])
    assert "gym" in offered, offered


def test_an_abbreviation_finds_the_tag_and_says_so(session) -> None:
    _notebook(session, [("Statistics lecture on variance", ["statistics"]), ("Statistics: the t-test", ["statistics"])])
    assert tagging.suggest(session, "Stats revision: the t-test and variance", have=[]) == ["statistics"]
    assert tagging.reason("statistics", "Stats revision") == "It says “stats”."


def test_one_spelling_is_offered_the_most_used(session) -> None:
    _notebook(session, [
        ("Assignment one: essay plan", ["assignment"]),
        ("Assignment two: the lab report", ["assignment"]),
        ("Assignment three: slides", ["assignment"]),
        ("Assignments due this month", ["assignments"]),
    ])
    assert tagging.suggest(session, "Assignment four: the poster", have=[]) == ["assignment"]
    assert tagging.suggest(session, "Assignment four: the poster", have=["Assignments"]) == []


def test_ocr_footer_and_image_address_are_not_read(session) -> None:
    _notebook(session, [("Shopping list: rice, eggs", ["shopping"]), ("Shopping for the flat", ["shopping"])])
    note = "![receipt](/media/0badf00d.jpg)\n\nHeadphones, keep for the warranty. Thank you for shopping with us. Page 1 of 2"
    assert "shopping" not in tagging.suggest(session, note, have=[])


def test_a_sibling_of_a_said_tag_rides_only_when_used_with_it(session) -> None:
    """"lecture" said: #exam (Education too, never used with #lecture) is not
    offered on the word "seminar"; #gym, used with #legs, still is."""
    _notebook(session, [
        ("Lecture on the Cold War", ["lecture", "history"]),
        ("Lecture: containment", ["lecture", "history"]),
        ("Exam on the Cold War", ["exam", "history"]),
        ("Exam revision: decolonisation", ["exam", "history"]),
    ])
    offered = tagging.suggest(session, "Lecture and seminar on the Cold War", have=[])
    assert "lecture" in offered and "exam" not in offered, offered


def test_a_linked_notes_tag_votes(session) -> None:
    """"run" is #running only folded, too loose alone; a link to a #running
    note makes it."""
    _notebook(session, [("Parkrun results: 26 minutes", ["running"]), ("Running shoes to buy", ["running"])])
    note = manager.create_entry(session, "Went for a run by the river after lunch", tags=[])
    session.commit()
    assert tagging.suggest(session, note.content, have=[], exclude_entry_id=note.id) == []
    linked = manager.create_entry(session, "Couch to 5k, week three", tags=["running"])
    session.add(EntryLink(source_entry_id=note.id, target_entry_id=linked.id))
    session.commit()
    assert tagging.suggest(session, note.content, have=[], exclude_entry_id=note.id) == ["running"]


def test_a_tag_turned_down_often_is_offered_less_until_offered_again(session, app_state) -> None:
    _notebook(session, [("Gym: squats", ["gym", "legs"]), ("Gym: lunges", ["gym", "legs"])])
    for i in range(tagging.TURNED_DOWN_OFTEN):
        entry = manager.create_entry(session, f"Gym day {i}: squats", tags=["gym"])
        entry.discarded_tags = json.dumps(["legs"])
    session.commit()
    assert tagging.turned_down(session)["leg"] == ("legs", tagging.TURNED_DOWN_OFTEN)
    votes = {"leg": 1.0}
    tagging._damp(session, votes)
    assert votes["leg"] == tagging.DAMPED
    tagging.offer_again(session, "legs")
    assert "leg" not in tagging.turned_down(session)
    votes = {"leg": 1.0}
    tagging._damp(session, votes)
    assert votes["leg"] == 1.0


def test_tag_and_file_with_atlas_offers_tags_with_no_model(client) -> None:
    for text in ("Minecraft: iron farm by the village", "Minecraft: the nether hub"):
        client.post("/entries", json={"content": text, "tags": ["minecraft"]})
    note = client.post("/entries", json={"content": "Minecraft trading hall plans"}).json()
    out = client.post(f"/entries/{note['id']}/reevaluate").json()
    assert out["suggested_tags"] == ["minecraft"], out
    assert out["suggested_tag_reasons"]["minecraft"] == "It says “minecraft”."


def test_a_new_note_gets_suggestions_with_reasons_and_its_title_counts(client) -> None:
    for text in ("Biology lecture: mitosis", "Biology: the Krebs cycle"):
        client.post("/entries", json={"content": text, "tags": ["biology"]})
    out = client.post("/entries/suggest-tags", json={"content": "enzymes and the cell cycle", "tags": [], "title": "Biology revision"}).json()
    assert out["suggested_tags"] == ["biology"], out
    assert out["suggested_tag_reasons"] == {"biology": "It says “biology”."}


def test_turned_down_tags_are_listed_and_offered_again(client) -> None:
    ids = [client.post("/entries", json={"content": f"Gym {i}", "tags": ["gym"]}).json()["id"] for i in range(3)]
    for entry_id in ids:
        client.post(f"/entries/{entry_id}/suggested-tags", json={"discard": ["legs"]})
    listed = client.get("/tags/turned-down").json()
    assert listed == [{"tag": "legs", "notes": 3, "damped": True}], listed
    client.post("/tags/turned-down/offer-again", json={"tag": "legs"})
    assert client.get("/tags/turned-down").json() == []
