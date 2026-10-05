"""One suggestions inbox that learns (GRAPH_PLAN KG9 part two, INBOX 528).

The two new recognisers (`ai/inbox.merge_candidates`, `type_candidates`) are
tested on plain data; the routes (`/suggestions`) on a real notebook: a
merge moves every mention, a type lands on the link, and every accept and
dismissal is a correction the next pass reads.
"""

from __future__ import annotations

import random
import sqlite3
import time
from pathlib import Path

from memorymap.ai.inbox import EntityFacts, LinkFacts, merge_candidates, type_candidates


def _ents(*rows):
    return [EntityFacts(id=i, name=n, notes=frozenset(notes)) for i, (n, notes) in enumerate(rows, 1)]


def _merge(found, a, b):
    return next((m for m in found if {m["keep_id"], m["merge_id"]} == {a, b}), None)


# --- the pure half -----------------------------------------------------------


def test_a_first_name_inside_a_full_name_is_a_merge_keeping_the_full_name():
    found = merge_candidates(_ents(("Sam", {1, 2}), ("Sam Lee", {2, 3}), ("Priya", {4})))
    row = _merge(found, 1, 2)
    assert row is not None and row["keep_id"] == 2
    assert {s["signal"] for s in row["signals"]} == {"part_name", "same_note"}
    assert "“Sam” is part of “Sam Lee”" in row["reason"]


def test_case_and_near_spellings_merge_and_different_people_do_not():
    found = merge_candidates(
        _ents(("priya shah", {1}), ("Priya Shah", {2}), ("Jonathan Smith", {3}), ("Jonathon Smith", {4}),
              ("Sam Lee", {5}), ("Sam Ng", {6}))
    )
    assert _merge(found, 1, 2)["signals"][0]["signal"] == "same_name"
    assert _merge(found, 3, 4)["signals"][0]["signal"] == "near_name"
    assert _merge(found, 5, 6) is None


def test_an_ambiguous_first_name_is_less_sure_and_a_dismissed_pair_never_returns():
    one = _merge(merge_candidates(_ents(("Sam", {1, 2}), ("Sam Lee", {1}))), 1, 2)
    two = merge_candidates(_ents(("Sam", {1, 2}), ("Sam Lee", {1}), ("Sam Ng", {2})))
    assert len(two) == 2 and all(m["confidence"] < one["confidence"] for m in two)
    assert merge_candidates(_ents(("Plan 2025", {1}), ("Plan 2026", {2}))) == []
    assert merge_candidates(_ents(("Sam", {1}), ("Sam Lee", {1})), exclude={frozenset((1, 2))}) == []


def test_merge_candidates_at_five_thousand_entities_is_quick():
    rng = random.Random(4)
    syll = ["ka", "lo", "mi", "ra", "su", "te", "vo", "ne", "pa", "di", "ro", "ya"]
    word = lambda: "".join(rng.choice(syll) for _ in range(rng.randint(2, 3))).title()  # noqa: E731
    surnames = [word() for _ in range(60)]
    rows = [(f"{word()} {rng.choice(surnames)}", {i}) for i in range(5000)]
    #: CPU time of this process, not the wall clock: the claim is that the pass
    #: does little work on 5,000 names (blocking, not all pairs), and the wall
    #: clock also counts every slice the scheduler gives to other processes
    #: (1.57 s on a busy CI runner for a pass that takes a fraction of that).
    started = time.process_time()
    merge_candidates(_ents(*rows))
    took = time.process_time() - started
    assert took < 1.0, took


def test_a_cue_in_the_sentence_or_the_reason_suggests_a_type():
    links = [
        LinkFacts(id=1, source_id=1, target_id=2, context="Cone 6 reduction, for example [[Glaze A]]."),
        LinkFacts(id=2, source_id=1, target_id=3, reason="this continues the October plan"),
        LinkFacts(id=3, source_id=1, target_id=4, context="See [[Kiln]] when you can."),
        LinkFacts(id=4, source_id=2, target_id=3, reason="supports the claim", deduced=True),
    ]
    found = {row["link_id"]: row for row in type_candidates(links)}
    assert found[1]["link_type"] == "example_of"
    assert found[1]["context"][found[1]["hit_start"]:found[1]["hit_end"]].lower() == "for example"
    assert found[2]["link_type"] == "continues"
    assert 3 not in found and 4 not in found


def test_two_types_at_once_is_no_suggestion_and_a_dismissal_holds():
    both = LinkFacts(id=1, source_id=1, target_id=2, context="It contradicts, for example, the plan.")
    assert type_candidates([both]) == []
    one = LinkFacts(id=2, source_id=1, target_id=2, context="Background for the trip.")
    assert type_candidates([one], exclude={(2, "context")}) == []
    assert type_candidates([one])[0]["link_type"] == "context"


# --- the routes ----------------------------------------------------------------


def _note(client, text):
    return client.post("/entries", json={"content": text}).json()


def _entity(session, name, *entry_ids):
    from memorymap.core.database import Entity, EntityMention

    entity = Entity(name=name)
    session.add(entity)
    session.flush()
    for entry_id in entry_ids:
        session.add(EntityMention(entity_id=entity.id, entry_id=entry_id))
    session.commit()
    return entity.id


def test_the_inbox_offers_a_merge_and_accepting_it_moves_every_mention(client, session):
    from memorymap.core.database import Entity, EntityMention

    a, b, c = (_note(client, f"Note {i} about the studio") for i in range(3))
    sam = _entity(session, "Sam", a["id"], b["id"])
    sam_lee = _entity(session, "Sam Lee", b["id"], c["id"])
    body = client.get("/suggestions").json()
    row = next(m for m in body["merges"] if {m["keep_id"], m["merge_id"]} == {sam, sam_lee})
    assert row["keep_id"] == sam_lee and row["keep_name"] == "Sam Lee"

    made = client.post("/suggestions/merges/accept", json={"keep_id": sam_lee, "merge_id": sam, "signals": ["part_name"]})
    assert made.status_code == 200, made.text
    session.expire_all()
    notes = sorted(m.entry_id for m in session.query(EntityMention).filter_by(entity_id=sam_lee))
    assert notes == sorted({a["id"], b["id"], c["id"]})
    assert session.query(EntityMention).filter_by(entity_id=sam).count() == 0
    gone = session.get(Entity, sam)
    assert gone.merged_into == sam_lee and "Sam" in (session.get(Entity, sam_lee).aliases or [])
    assert client.get("/suggestions").json()["merges"] == []
    kinds = [c["kind"] for c in client.get("/learned/corrections").json()]
    assert "accept_merge" in kinds


def test_a_dismissed_merge_stays_dismissed(client, session):
    a = _note(client, "one")
    x = _entity(session, "Sam", a["id"])
    y = _entity(session, "Sam Lee", a["id"])
    assert client.get("/suggestions").json()["merges"]
    client.post("/suggestions/merges/dismiss", json={"a": x, "b": y, "signals": ["part_name"]})
    assert client.get("/suggestions").json()["merges"] == []


def test_extraction_after_a_merge_lands_on_the_survivor(session):
    from memorymap.ai.entities import _find_or_create_entity, merge_entities
    from memorymap.core.database import Entity

    keep = Entity(name="Sam Lee")
    gone = Entity(name="Sam")
    session.add_all([keep, gone])
    session.flush()
    merge_entities(session, keep, gone)
    assert _find_or_create_entity(session, "sam", {}).id == keep.id


def test_a_type_suggestion_lands_on_the_link_and_teaches(client, session):
    from memorymap.core.database import EntryLink

    target = _note(client, "# Glaze A\n\nshino over tenmoku")
    holder = _note(client, "# Firing log\n\nCone 6 went well, for example [[Glaze A]] crawled less.")
    rows = client.get("/suggestions").json()["types"]
    row = next(r for r in rows if r["source_id"] == holder["id"] and r["target_id"] == target["id"])
    assert row["link_type"] == "example_of" and row["type_label"] == "Example of"
    made = client.post(
        "/suggestions/types/accept", json={"link_id": row["link_id"], "link_type": "example_of", "signals": ["cue"]}
    )
    assert made.status_code == 200, made.text
    session.expire_all()
    assert session.get(EntryLink, row["link_id"]).link_type == "example_of"
    assert client.get("/suggestions").json()["types"] == []
    kinds = [c["kind"] for c in client.get("/learned/corrections").json()]
    assert "accept_link_type" in kinds


def test_a_dismissed_type_stays_dismissed_and_a_private_end_is_never_offered(client, session):
    from memorymap.core.database import Entry

    target = _note(client, "# Kiln two\n\nbody")
    holder = _note(client, "# Plan\n\nBackground: [[Kiln two]] is the gas one.")
    row = client.get("/suggestions").json()["types"][0]
    client.post("/suggestions/types/dismiss", json={"link_id": row["link_id"], "link_type": row["link_type"]})
    assert client.get("/suggestions").json()["types"] == []

    other = _note(client, "# Kiln three\n\nbody")
    _note(client, "# Plan two\n\nBackground: [[Kiln three]] is electric.")
    assert client.get("/suggestions").json()["types"]
    session.get(Entry, other["id"]).is_private = True
    session.commit()
    assert client.get("/suggestions").json()["types"] == []
    assert target and holder


def test_a_link_type_can_be_changed_and_a_bad_one_is_refused(client, session):
    from memorymap.core.database import EntryLink

    a, b = _note(client, "first"), _note(client, "second")
    client.post(f"/entries/{a['id']}/links", json={"target_id": b["id"]})
    link = session.query(EntryLink).one()
    ok = client.patch(f"/entries/{b['id']}/links/{link.id}", json={"link_type": "supports"})
    assert ok.status_code == 200, ok.text
    session.expire_all()
    assert session.get(EntryLink, link.id).link_type == "supports"
    assert client.patch(f"/entries/{a['id']}/links/{link.id}", json={"link_type": "nonsense"}).status_code == 422


def test_an_accepted_suggestion_keeps_the_signals_confidence(client, session):
    from memorymap.core.database import EntryLink

    a, b = _note(client, "first"), _note(client, "second")
    client.post(
        f"/entries/{a['id']}/links",
        json={"target_id": b["id"], "reason": "both mention Priya", "reason_confidence": 0.72},
    )
    assert session.query(EntryLink).one().reason_confidence == 0.72


def test_tension_decisions_are_corrections(client):
    a, b = _note(client, "The kiln fires at 1200"), _note(client, "The kiln never passes 1100")
    client.post("/entries/tensions/dismiss", json={"earlier_id": a["id"], "later_id": b["id"]})
    client.post("/entries/tensions/accept", json={"earlier_id": a["id"], "later_id": b["id"]})
    kinds = [c["kind"] for c in client.get("/learned/corrections").json()]
    assert "dismiss_tension" in kinds and "accept_tension" in kinds


def test_type_decisions_reweight_that_type(session):
    from memorymap.ai import learning

    for i in range(6):
        learning.record(session, kind="dismiss_link_type", subject={"link_id": i, "signals": ["context"]})
    session.commit()
    weights = learning.signal_weights(session, accept="accept_link_type", dismiss="dismiss_link_type", prior=3.0)
    assert 0.5 <= weights["context"] < 1.0
    one = LinkFacts(id=1, source_id=1, target_id=2, context="Background for the trip.")
    assert type_candidates([one], weights=weights) == []


def test_the_migration_adds_the_entity_columns_over_the_auto_migrator(tmp_path):
    from memorymap.core.database import DatabaseManager, _ensure_alembic_baseline

    db_path = tmp_path / "entities.db"
    DatabaseManager(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        assert {"kind", "aliases", "merged_into"} <= {r[1] for r in conn.execute('PRAGMA table_info("entities")')}
        conn.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        conn.execute("DELETE FROM alembic_version")
        conn.execute("INSERT INTO alembic_version VALUES ('a7d3e9c1f5b4')")
        conn.commit()
    finally:
        conn.close()
    _ensure_alembic_baseline(db_path)
    conn = sqlite3.connect(str(db_path))
    try:
        assert conn.execute("SELECT version_num FROM alembic_version").fetchall() == [(_alembic_head(),)]
    finally:
        conn.close()


def _alembic_head() -> str:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    return ScriptDirectory.from_config(config).get_current_head()
