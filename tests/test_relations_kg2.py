"""Relationship recognition with explanations (GRAPH_PLAN KG2, INBOX 528).

The pure half (`ai/relations.recognise`) is tested on plain data and timed at
2k and 10k notes; the route half (`GET /entries/link-suggestions`) is tested
with the embedding backend off, which is the case that used to answer `[]`.
"""

from __future__ import annotations

import random
import time
from datetime import datetime, timedelta

from memorymap.ai.relations import MIN_CONFIDENCE, NoteFacts, recognise


def _notes(n, facts=None):
    facts = facts or {}
    return {i: NoteFacts(label=f"Note {i}", **facts.get(i, {})) for i in range(1, n + 1)}


def _pair(found, a, b):
    return next((c for c in found if {c.a, c.b} == {a, b}), None)


def test_two_shared_entities_and_a_shared_neighbour_are_a_pair_with_both_reasons():
    notes = _notes(5)
    found = recognise(
        notes,
        edges=[(1, 3), (2, 3)],
        mentions=[("Priya", 1), ("Priya", 2), ("Kiln", 1), ("Kiln", 2), ("Kiln", 4)],
        similar=[],
        exclude=set(),
    )
    pair = _pair(found, 1, 2)
    assert pair is not None
    reasons = [s["reason"] for s in pair.signals()]
    assert any(r.startswith("both mention Priya") for r in reasons), reasons
    assert "both linked with “Note 3”" in reasons
    assert all(0 < s["confidence"] <= 1 for s in pair.signals())
    expected = 1.0
    for s in pair.evidence.values():
        expected *= 1 - s[0]
    assert abs(pair.confidence - (1 - expected)) < 1e-9


def test_one_shared_tag_alone_is_not_enough_but_with_a_neighbour_it_is():
    notes = _notes(4, {1: {"tags": frozenset({"glaze"})}, 2: {"tags": frozenset({"glaze"})}})
    assert _pair(recognise(notes, [], [], [], set()), 1, 2) is None
    found = recognise(notes, [(1, 3), (2, 3)], [], [], set())
    pair = _pair(found, 1, 2)
    assert pair is not None and pair.confidence >= MIN_CONFIDENCE
    assert {s["signal"] for s in pair.signals()} == {"tags", "neighbours"}


def test_time_alone_never_proposes_a_pair_but_supports_one():
    now = datetime(2026, 10, 4, 9, 0)
    notes = _notes(3, {1: {"created_at": now}, 2: {"created_at": now + timedelta(minutes=12)}})
    assert recognise(notes, [], [], [], set()) == []
    found = recognise(notes, [], [("Sam Lee", 1), ("Sam Lee", 2)], [], set())
    reasons = [s["reason"] for s in _pair(found, 1, 2).signals()]
    assert "written 12 minutes apart" in reasons


def test_a_hub_entity_makes_no_pairs():
    notes = _notes(40)
    mentions = [("Monday", i) for i in range(1, 41)]
    assert recognise(notes, [], mentions, [], set()) == []


def test_excluded_pairs_and_explicit_edges_are_never_offered():
    notes = _notes(4)
    found = recognise(
        notes, [(1, 3), (2, 3)], [("Priya", 1), ("Priya", 2)], [(1, 2, 0.9)], exclude={frozenset((1, 2))}
    )
    assert _pair(found, 1, 2) is None


def test_similarity_alone_keeps_the_old_reason():
    found = recognise(_notes(2), [], [], [(1, 2, 0.8)], set())
    assert [s["reason"] for s in found[0].signals()] == ["similar in meaning"]
    assert found[0].similarity == 0.8


def _synthetic(n, seed=7):
    rng = random.Random(seed)
    base = datetime(2026, 1, 1)
    tags = [f"t{i}" for i in range(n // 8)]
    notes = {
        i: NoteFacts(
            label=f"Note {i}",
            tags=frozenset(rng.sample(tags, 2)),
            created_at=base + timedelta(minutes=rng.randrange(n * 30)),
        )
        for i in range(1, n + 1)
    }
    edges = [(rng.randrange(1, n + 1), rng.randrange(1, n + 1)) for _ in range(n * 2)]
    entities = [f"E{i}" for i in range(n // 4)]
    mentions = [(rng.choice(entities), i) for i in range(1, n + 1) for _ in range(2)]
    similar = [(rng.randrange(1, n + 1), rng.randrange(1, n + 1), 0.55 + rng.random() * 0.4) for _ in range(n)]
    return notes, edges, mentions, similar


def test_cost_at_2k_and_10k_notes():
    """Measured, printed with -s: 2k and 10k notes, mean degree 4, two tags
    and two entity mentions each, one similar pair per note. 2026-10-04:
    162 ms and 802 ms in the sandbox. A wall-clock budget failed on a busy
    CI runner (9.6 s at 10k), so this pins the *shape*: five times the notes
    may cost at most fifteen times the time (linear is five, all-pairs would be
    twenty-five), with one generous ceiling for a disaster."""
    sizes = (2000, 10000)
    data = {n: _synthetic(n) for n in sizes}
    runs: dict[int, list[float]] = {n: [] for n in sizes}
    #: Measured in this process's CPU time rather than the wall clock (the
    #: ratio below is about how much work the pass does, and the wall clock
    #: also counts every moment the scheduler gave the core to someone else),
    #: and interleaved, 2k then 10k, five rounds, best of each: with the sizes
    #: timed one after the other, a stall that lasted through the 2k rounds and
    #: lifted for the 10k ones (or the reverse) skewed the ratio by itself.
    for _ in range(5):
        for n in sizes:
            started = time.process_time()
            found = recognise(*data[n], exclude=set())
            runs[n].append(time.process_time() - started)
            assert found
    took = {n: min(runs[n]) for n in sizes}
    for n in sizes:
        print(f"recognise n={n}: {took[n] * 1000:.0f} ms")
    #: Fifteen, the midpoint between linear (five) and all-pairs (twenty-five).
    #: It was ten, and on a machine with a dozen busy processes the CPU-time
    #: ratio itself reached 10.8 and 11.0 (70 ms at 2k, 760 ms at 10k): the
    #: 10k pass's larger working set misses the shared cache more when other
    #: processes are thrashing it. Quadratic work (twenty-five) is still well
    #: over this line.
    assert took[10000] < 15 * took[2000], took
    assert took[10000] < 30.0, took


# --- the route ------------------------------------------------------------


def _note(client, content):
    response = client.post("/entries", json={"content": content})
    assert response.status_code in (200, 201), response.text
    return response.json()


def _mention(session, name, *entry_ids):
    from memorymap.core.database import Entity, EntityMention

    entity = Entity(name=name)
    session.add(entity)
    session.flush()
    for entry_id in entry_ids:
        session.add(EntityMention(entity_id=entity.id, entry_id=entry_id))
    session.commit()


def test_the_route_suggests_structure_with_embeddings_off(client, session):
    a = _note(client, "Planning the glaze test with the studio crew")
    b = _note(client, "Notes from Thursday's firing, cone 6 went well")
    hub = _note(client, "Studio year plan")
    client.post(f"/entries/{a['id']}/links", json={"target_id": hub["id"]})
    client.post(f"/entries/{b['id']}/links", json={"target_id": hub["id"]})
    _mention(session, "Priya Shah", a["id"], b["id"])
    _mention(session, "Kiln two", a["id"], b["id"])
    rows = client.get("/entries/link-suggestions").json()
    row = next(r for r in rows if {r["source_id"], r["target_id"]} == {a["id"], b["id"]})
    signals = {s["signal"] for s in row["signals"]}
    assert {"entities", "neighbours"} <= signals
    assert row["confidence"] >= MIN_CONFIDENCE
    assert row["similarity"] is None
    assert "both mention" in row["reason"] and "both linked with" in row["reason"]


def test_the_route_still_answers_empty_when_nothing_relates(client):
    _note(client, "note one")
    _note(client, "note two")
    assert client.get("/entries/link-suggestions").json() == []


def test_a_dismissed_structural_pair_stays_dismissed(client, session):
    a = _note(client, "First note about the kiln rota")
    b = _note(client, "Second note, nothing in common in words")
    _mention(session, "Priya Shah", a["id"], b["id"])
    assert client.get("/entries/link-suggestions").json()
    client.post("/learned/corrections", json={"kind": "dismiss_link", "subject": {"a": a["id"], "b": b["id"]}})
    assert client.get("/entries/link-suggestions").json() == []


def test_a_private_note_is_never_in_a_structural_pair(client, session):
    from memorymap.core.database import Entry

    a = _note(client, "Kiln rota for October")
    b = _note(client, "Private thoughts")
    _mention(session, "Priya Shah", a["id"], b["id"])
    row = session.get(Entry, b["id"])
    row.is_private = True
    session.commit()
    assert client.get("/entries/link-suggestions").json() == []


# --- KG9, part one: accepting and dismissing reweights the signals ---------


def test_no_decisions_means_no_reweighting(session):
    from memorymap.ai import learning

    assert learning.signal_weights(session) == {}


def test_accepts_raise_a_signal_and_dismissals_lower_one_within_bounds(session):
    from memorymap.ai import learning

    for i in range(6):
        learning.record(session, kind="accept_link", subject={"a": i, "b": i + 100, "signals": ["tags"]})
        learning.record(session, kind="dismiss_link", subject={"a": i, "b": i + 200, "signals": ["neighbours"]})
    session.commit()
    weights = learning.signal_weights(session)
    assert 1.0 < weights["tags"] <= 1.5
    assert 0.5 <= weights["neighbours"] < 1.0
    assert "entities" not in weights


def test_a_down_weighted_signal_can_drop_a_pair_under_the_bar():
    notes = _notes(4, {1: {"tags": frozenset({"glaze"})}, 2: {"tags": frozenset({"glaze"})}})
    edges = [(1, 3), (2, 3)]
    assert _pair(recognise(notes, edges, [], [], set()), 1, 2) is not None
    assert _pair(recognise(notes, edges, [], [], set(), weights={"neighbours": 0.5}), 1, 2) is None


def test_dismissals_elsewhere_teach_the_route_what_a_signal_is_worth(client):
    hub = _note(client, "Studio year plan")
    a = client.post("/entries", json={"content": "Glaze trial, cone 6", "tags": ["glazelab"]}).json()
    b = client.post("/entries", json={"content": "Thursday firing log", "tags": ["glazelab"]}).json()
    for note in (a, b):
        client.post(f"/entries/{note['id']}/links", json={"target_id": hub["id"]})
    pair = {a["id"], b["id"]}
    assert any({r["source_id"], r["target_id"]} == pair for r in client.get("/entries/link-suggestions").json())
    for i in range(6):
        client.post(
            "/learned/corrections",
            json={"kind": "dismiss_link", "subject": {"a": 9000 + i, "b": 9100 + i, "signals": ["tags", "neighbours", "time"]}},
        )
    assert not any({r["source_id"], r["target_id"]} == pair for r in client.get("/entries/link-suggestions").json())
