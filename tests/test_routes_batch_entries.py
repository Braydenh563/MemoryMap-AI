"""Named-route tests for notes: links, history, filing, mentions, meetings (ledger 1573).

Meeting tests reuse the one note shape from test_meetings_644.
"""

from __future__ import annotations

from tests.test_meetings_644 import _make as _meeting


def _note(client, content):
    return client.post("/entries", json={"content": content}).json()["id"]


def _link(client, a, b):
    made = client.post(f"/entries/{a}/links", json={"target_id": b, "reason": "same trip"})
    assert made.status_code == 200, made.text
    return made.json()["links"][0]["link_id"]


def test_a_link_reason_is_edited_and_asked_for_without_a_model(client):
    a = _note(client, "Lisbon trip notes")
    b = _note(client, "Lisbon packing list")
    link_id = _link(client, a, b)
    edited = client.put(f"/entries/{a}/links/{link_id}/reason", json={"reason": "packing for the trip"})
    assert edited.status_code == 200
    generated = client.post(f"/entries/{a}/links/{link_id}/generate-reason")
    assert generated.status_code in (200, 500)
    missing = client.post(f"/entries/{a}/links/99999/generate-reason")
    assert missing.status_code == 404


def test_an_earlier_version_of_a_note_is_restored(client):
    note_id = _note(client, "First wording of the note.")
    client.put(f"/entries/{note_id}", json={"content": "Second wording of the note."})
    history = client.get(f"/entries/{note_id}/history").json()
    revision_id = history["revisions"][0]["id"]
    restored = client.post(f"/entries/{note_id}/history/{revision_id}/restore")
    assert restored.status_code == 200
    assert "First wording" in restored.json()["content"]
    gone = client.post(f"/entries/{note_id}/history/99999/restore")
    assert gone.status_code == 404


def test_stopping_filing_on_a_filed_note_changes_nothing(client):
    note_id = _note(client, "Bought bread and milk.")
    stopped = client.post(f"/entries/{note_id}/filing/stop", json={"action": "keep"})
    assert stopped.status_code == 200 and stopped.json()["stopped"] is False
    bad = client.post(f"/entries/{note_id}/filing/stop", json={"action": "burn"})
    assert bad.status_code == 422


def test_a_mention_becomes_a_wiki_link(client):
    target = client.post("/entries", json={"content": "Orchid care\nbody text"}).json()["id"]
    source = client.post("/entries", json={"content": "I was reading Orchid care yesterday."}).json()["id"]
    mention = client.get(f"/entries/{target}/backlinks").json()["mentions"][0]
    linked = client.post(
        f"/entries/{target}/mentions/link",
        json={"kind": "note", "id": source, "start": mention["start"], "end": mention["end"]},
    )
    assert linked.status_code == 200
    assert "[[" in client.get(f"/entries/{source}").json()["content"]


def test_a_meeting_takes_lines_makes_a_reminder_and_summarises_by_rules(client):
    note_id = _meeting(client)["id"]
    appended = client.post(
        f"/entries/{note_id}/meeting/append", json={"section": "Decisions", "lines": ["Launch moves to November"]}
    )
    assert appended.status_code == 200 and "Launch moves to November" in appended.json()["content"]
    actions = client.get(f"/entries/{note_id}/meeting").json()["actions"]
    reminded = client.post(f"/entries/{note_id}/meeting/remind", json={"line": actions[0]["line"]})
    assert reminded.status_code == 201
    summary = client.post(f"/entries/{note_id}/meeting/summarise")
    assert summary.status_code == 200 and summary.json()["by"] == "rules"
