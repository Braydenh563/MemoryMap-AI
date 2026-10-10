"""The no-model filing decision (WORLD_CLASS_PLAN 23, decisions 2, 3 and 6).

The person's categories first: a note files only into a category the
notebook has, by its notes' words, their topics in the pack, and the
category's own name ("Gym" is Fitness); a new category is only proposed, and
only when nothing the person has scored at all; every filing says why; a
note that reads as health, money, family, the law or identity waits for the
person unless Settings lets it file.
"""

from __future__ import annotations

import json

from memorymap.ai import lexical_filing, taxonomy
from memorymap.core import deps
from memorymap.entry import manager


def _notes(session, rows) -> None:
    for content, category in rows:
        manager.create_entry(session, content, category_name=category)
    session.commit()


GYM_AND_KITCHEN = (
    ("Bench press PR, 62.5kg for three", "Gym"),
    ("Rowing machine 2k, then core", "Gym"),
    ("Coach's new programme, upper and lower split", "Gym"),
    ("Pasta with garlic and lemon, serves two", "Cooking"),
    ("Banana bread, bake 50 minutes", "Cooking"),
    ("Lemon chicken traybake", "Cooking"),
)


def test_every_topic_the_filing_data_names_is_in_the_pack() -> None:
    data = json.loads((taxonomy.DATA_DIR / "memorymap_filing.json").read_text(encoding="utf-8"))
    topics = set(taxonomy.taxonomy_map())
    assert set(data["sensitive_topics"]) <= topics
    assert {t for names in data["name_aliases"].values() for t in names} <= topics


def test_a_categorys_name_reaches_its_topics() -> None:
    assert "Fitness" in taxonomy.name_topics("Gym")
    assert "Fitness" in taxonomy.name_topics("Gym & fitness")
    assert "Entertainment" in taxonomy.name_topics("Films & TV")
    assert "Vehicle Maintenance" in taxonomy.name_topics("Car")
    assert "Squats" not in taxonomy.topic_hits("squats and deadlifts")
    assert taxonomy.topic_hits("squats and deadlifts")["Fitness"] == ["squat", "deadlift"]


def test_a_note_files_by_its_topics_before_any_note_shared_its_words(session) -> None:
    """No Gym note says "squat" or "deadlift"; the pack says they are Fitness
    and the name says Gym is."""
    _notes(session, GYM_AND_KITCHEN)
    match = lexical_filing.lexical_category(session, "Leg day: squats 5x5, then deadlifts")
    assert match is not None and match.name == "Gym"
    assert match.why == "It mentions “squat” and “deadlift” (Fitness), like the 3 notes in Gym."


def test_a_new_category_is_only_proposed_when_nothing_fits(session) -> None:
    _notes(session, GYM_AND_KITCHEN)
    decision = lexical_filing.decide(session, "Pottery class: centring the clay on the wheel")
    assert decision.filed is None and decision.proposal is not None
    assert decision.proposal.name == "Art"
    assert "pottery" in decision.proposal.why
    assert lexical_filing.decide(session, "squats again").proposal is None


def test_a_word_that_is_not_a_subject_proposes_nothing(session) -> None:
    """The "Study" bug's category half: a verb or a note's purpose is not a
    subject, so it never becomes a category."""
    _notes(session, GYM_AND_KITCHEN)
    for text in ("I need to study the map before the hike", "Project plan: due Friday, three milestones"):
        proposal = lexical_filing.decide(session, text).proposal
        assert proposal is None or proposal.name not in taxonomy.functional_categories(), (text, proposal)
        assert proposal is None or "Study" not in proposal.name


def test_two_topics_that_tie_make_a_composite_proposal(session) -> None:
    """"Some categories might not just be gym or Fitness but gym & fitness"
    (the owner): two topics within ten percent, both in the note."""
    _notes(session, GYM_AND_KITCHEN)
    proposal = lexical_filing.decide(session, "Guitar lesson, then a sketchbook drawing").proposal
    assert proposal is not None and proposal.name == "Art & Learning Musical Instruments"
    single = lexical_filing.decide(session, "Hiking boots for the camping trip").proposal
    assert single is not None and single.name == "Outdoors"


def test_a_sensitive_note_waits_unless_settings_lets_it_file(session) -> None:
    _notes(session, (
        ("Dentist check-up booked for the 21st", "Health"),
        ("GP says blood pressure is fine", "Health"),
        ("Physio for the shoulder", "Health"),
        *GYM_AND_KITCHEN,
    ))
    text = "Dentist appointment moved to Friday"
    decision = lexical_filing.decide(session, text)
    assert decision.held and decision.filed is None and decision.ranked[0].name == "Health"
    assert lexical_filing.lexical_category(session, text) is None
    deps.get_config().set_preference(lexical_filing.PREF_AUTO_FILE_SENSITIVE, True)
    match = lexical_filing.lexical_category(session, text)
    assert match is not None and match.name == "Health"


def test_the_filing_status_carries_the_why_and_the_proposal(client) -> None:
    for content, category in GYM_AND_KITCHEN:
        client.post("/entries", json={"content": content, "category": category})
    filed = client.post("/entries", json={"content": "Leg day: squats 5x5, then deadlifts"}).json()
    status = client.get(f"/entries/{filed['id']}/filing").json()
    for _ in range(200):
        if status["filing_state"] != "pending":
            break
        status = client.get(f"/entries/{filed['id']}/filing").json()
    assert status["filed_by"] == "words" and status["category"] == "Gym"
    assert "squat" in status["why"]
    lone = client.post("/entries", json={"content": "Pottery class: centring the clay on the wheel"}).json()
    status = client.get(f"/entries/{lone['id']}/filing").json()
    for _ in range(200):
        if status["filing_state"] != "pending":
            break
        status = client.get(f"/entries/{lone['id']}/filing").json()
    assert status["proposal"]["name"] == "Art"
    assert set(status["suggestion_reasons"]) <= set(status["suggestions"])
