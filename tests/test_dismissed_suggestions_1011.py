"""Brief 86 (b): Settings, Data can forget every dismissed suggestion, and
take the forgetting back.

A dismissal is a correction (`ai/learning.py`) or a tension pair in
preferences. Clearing marks the corrections revived rather than deleting them,
so the same press can be undone and the learning is not lost to a mis-click.
"""

from __future__ import annotations

from memorymap.ai import learning
from memorymap.core import deps


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


def test_a_dismissed_merge_comes_back_when_dismissals_are_cleared_and_goes_again_on_undo(client, session):
    a = _note(client, "one")
    x = _entity(session, "Sam", a["id"])
    y = _entity(session, "Sam Lee", a["id"])
    client.post("/suggestions/merges/dismiss", json={"a": x, "b": y, "signals": ["part_name"]})
    body1 = client.get("/suggestions").json()
    assert body1["merges"] == []
    body2 = client.get("/suggestions/dismissed").json()
    assert body2["by_kind"] == {"dismiss_merge": 1}

    cleared = client.post("/suggestions/dismissed/clear").json()
    assert cleared["cleared"] == 1 and len(cleared["ids"]) == 1
    body3 = client.get("/suggestions").json()
    assert body3["merges"], "the suggestion is offered again"
    body4 = client.get("/suggestions/dismissed").json()
    assert body4["total"] == 0
    kinds = [c["kind"] for c in client.get("/learned/corrections").json()]
    assert "dismiss_merge" not in kinds, "a forgotten dismissal is no longer a verdict"

    restored = client.post("/suggestions/dismissed/restore", json={"ids": cleared["ids"], "tensions": cleared["tensions"]}).json()
    assert restored["restored"] == 1
    body5 = client.get("/suggestions").json()
    assert body5["merges"] == []
    body6 = client.get("/suggestions/dismissed").json()
    assert body6["total"] == 1


def test_dismissed_tension_pairs_are_cleared_and_restored_with_the_corrections(client, session):
    deps.get_config().set_preference("tensions_dismissed", ["1:2", "3:4"])
    learning.record(session, kind="dismiss_resurface", subject={"entry_id": 1})
    session.commit()
    body = client.get("/suggestions/dismissed").json()
    assert body["total"] == 3 and body["tension_pairs"] == 2 and body["by_kind"] == {"dismiss_resurface": 1}

    cleared = client.post("/suggestions/dismissed/clear").json()
    assert cleared["cleared"] == 3 and cleared["tensions"] == ["1:2", "3:4"]
    assert deps.get_config().get_preference("tensions_dismissed", None) == []

    client.post("/suggestions/dismissed/restore", json={"ids": cleared["ids"], "tensions": cleared["tensions"]})
    assert deps.get_config().get_preference("tensions_dismissed") == ["1:2", "3:4"]
    body7 = client.get("/suggestions/dismissed").json()
    assert body7["total"] == 3


def test_clearing_leaves_other_corrections_alone_and_restore_ignores_strangers(client, session):
    learning.record(session, kind="refile", subject={"entry_id": 1}, from_value="A", to_value="B")
    learning.record(session, kind="accept_merge", subject={"a": 1, "b": 2})
    session.commit()
    body8 = client.post("/suggestions/dismissed/clear").json()
    assert body8["cleared"] == 0
    kinds = [c["kind"] for c in client.get("/learned/corrections").json()]
    assert "accept_merge" in kinds
    # An id that is not a revived dismissal is not touched.
    live_id = learning.corrections(session, "accept_merge")[0].id
    body9 = client.post("/suggestions/dismissed/restore", json={"ids": [live_id], "tensions": []}).json()
    assert body9["restored"] == 0


def test_tags_turned_down_on_notes_are_counted_cleared_and_restored(client):
    """INBOX 1271: "Clear dismissed suggestions" now reaches the per-note
    "Not suggested" tags, and Undo puts each back on its own note."""
    a = _note(client, "gym session")
    b = _note(client, "boiler service")
    client.post(f"/entries/{a['id']}/suggested-tags", json={"discard": ["Study", "uni"]})
    client.post(f"/entries/{b['id']}/suggested-tags", json={"discard": ["Study"]})
    body = client.get("/suggestions/dismissed").json()
    assert body["note_tags"] == 3 and body["total"] == 3

    cleared = client.post("/suggestions/dismissed/clear").json()
    assert cleared["cleared"] == 3
    assert client.get("/suggestions/dismissed").json()["total"] == 0
    assert client.get(f"/entries/{a['id']}").json()["discarded_tags"] == []

    client.post(
        "/suggestions/dismissed/restore",
        json={"ids": cleared["ids"], "tensions": cleared["tensions"], "note_tags": cleared["note_tags"]},
    )
    assert client.get(f"/entries/{a['id']}").json()["discarded_tags"] == ["Study", "uni"]
    assert client.get(f"/entries/{b['id']}").json()["discarded_tags"] == ["Study"]
    assert client.get("/suggestions/dismissed").json()["note_tags"] == 3
