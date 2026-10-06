"""The "Mentioned, not linked" Link button and names with odd characters.

Measured before the fix, on a note called `Plan [v2]`: the button answered
"Linked", rewrote the sentence to `[[Plan [v2]]]`, and stored no link at all,
because the wiki-link pattern cannot hold a square bracket. `|` and `#` names
(`C# basics`) always worked and must keep working.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import select

from memorymap.core.database import EntryLink


def _pair(client, name):
    target = client.post("/entries", json={"content": f"{name}\nbody text"}).json()
    source = client.post("/entries", json={"content": f"I was reading {name} yesterday."}).json()
    mention = client.get(f"/entries/{target['id']}/backlinks").json()["mentions"][0]
    return target, source, mention


def _link(client, target, mention):
    return client.post(
        f"/entries/{target['id']}/mentions/link",
        json={k: mention[k] for k in ("kind", "id", "start", "end")},
    )


@pytest.mark.parametrize("name", ["C# basics", "Notes | drafts", "A#B|C"])
def test_hash_and_pipe_names_link_and_store_a_link(client, session, name):
    target, source, mention = _pair(client, name)
    assert mention["linkable"] is True
    assert _link(client, target, mention).status_code == 200
    assert [(row.source_entry_id, row.target_entry_id) for row in session.scalars(select(EntryLink))] == [
        (source["id"], target["id"])
    ]


def test_a_bracket_name_is_marked_not_linkable_with_its_reason(client):
    _target, _source, mention = _pair(client, "Plan [v2]")
    assert mention["linkable"] is False
    assert "square bracket" in mention["why"]


def test_a_bracket_name_is_refused_and_the_note_is_left_alone(client, session):
    target, source, mention = _pair(client, "Plan [v2]")
    response = _link(client, target, mention)
    assert response.status_code == 400
    assert "square bracket" in response.json()["detail"]
    assert client.get(f"/entries/{source['id']}").json()["content"] == "I was reading Plan [v2] yesterday."
    assert session.scalars(select(EntryLink)).all() == []


def test_the_button_is_disabled_with_the_reason_for_an_unlinkable_row():
    menus = (Path(__file__).resolve().parents[1] / "frontend" / "js" / "menus.js").read_text(encoding="utf-8")
    assert "m.linkable === false" in menus and "link.disabled = true" in menus
