"""An entity merge can be undone, exactly (INBOX 553(a), the owner's decision).

"Entity merge gets Undo: snapshot both entities and their mentions before a
merge, and Undo in the toast splits them back exactly." A merge moves the
folded entity's mentions, drops the ones the survivor already had, folds its
name into the survivor's aliases and points it (and anything earlier merged
into it) at the survivor. Undo puts every one of those back: the same rows,
the same names, aliases and kinds, the same redirects.
"""

from __future__ import annotations

from sqlalchemy import select

from memorymap.core.database import Entity, EntityMention


def _note(client, text: str) -> int:
    return client.post("/entries", json={"content": text}).json()["id"]


def _state(session) -> dict:
    session.expire_all()
    entities = {
        row.id: (row.name, row.kind, sorted(row.aliases or []), row.merged_into)
        for row in session.scalars(select(Entity)).all()
    }
    mentions = sorted(
        (row.id, row.entity_id, row.entry_id) for row in session.scalars(select(EntityMention)).all()
    )
    return {"entities": entities, "mentions": mentions}


def _setup(client, session) -> tuple[int, int]:
    one, two, three = _note(client, "one"), _note(client, "two"), _note(client, "three")
    keep = Entity(name="Sam Lee", kind="person", aliases=["S. Lee"])
    gone = Entity(name="Sammy", kind=None, aliases=["Sam L"])
    session.add_all([keep, gone])
    session.flush()
    earlier = Entity(name="Samuel", merged_into=gone.id)
    session.add(earlier)
    session.add_all(
        [
            EntityMention(entity_id=keep.id, entry_id=one),
            # Both name note two: the merge drops this one as a duplicate.
            EntityMention(entity_id=keep.id, entry_id=two),
            EntityMention(entity_id=gone.id, entry_id=two),
            EntityMention(entity_id=gone.id, entry_id=three),
        ]
    )
    session.commit()
    return keep.id, gone.id


def test_undo_splits_a_merge_back_exactly(client, session):
    keep, gone = _setup(client, session)
    before = _state(session)
    merged = client.post(f"/entities/{gone}/merge", json={"into_id": keep}).json()
    assert merged["undo_id"]
    assert _state(session) != before
    undone = client.post(f"/entities/merges/{merged['undo_id']}/undo")
    assert undone.status_code == 200, undone.text
    assert _state(session) == before


def test_undo_from_the_suggestions_inbox_and_redo(client, session):
    keep, gone = _setup(client, session)
    before = _state(session)
    accepted = client.post("/suggestions/merges/accept", json={"keep_id": keep, "merge_id": gone}).json()
    after_merge = _state(session)
    assert client.post(f"/entities/merges/{accepted['undo_id']}/undo").status_code == 200
    assert _state(session) == before
    # Redo is the merge again, and undoing that is exact too.
    again = client.post(f"/entities/{gone}/merge", json={"into_id": keep}).json()
    redo_state = _state(session)
    assert redo_state["entities"] == after_merge["entities"]
    assert client.post(f"/entities/merges/{again['undo_id']}/undo").status_code == 200
    assert _state(session) == before


def test_an_undo_is_refused_twice_or_after_the_merge_moved_on(client, session):
    keep, gone = _setup(client, session)
    merged = client.post(f"/entities/{gone}/merge", json={"into_id": keep}).json()
    assert client.post(f"/entities/merges/{merged['undo_id']}/undo").status_code == 200
    second = client.post(f"/entities/merges/{merged['undo_id']}/undo")
    assert second.status_code == 409
    assert "already" in second.json()["detail"]
    assert client.post("/entities/merges/999999/undo").status_code == 404
