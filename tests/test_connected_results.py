"""A note that came along by connection is never presented as a match.

Retrieval pulls in the notes a match *links to* — that is the app's premise,
and it is what makes this a memory map rather than a search box. It also
introduces a way to mislead that did not exist before: the person asked about
one thing and is shown notes about another, and both the answer and the results
panel would report them as though the search had found them.

So the provenance travels with the note, all the way to both readers:

- the **model** sees "(not a match — linked to one of the above)" in the prompt,
  so an answer can say "you linked this to…" rather than implying a hit;
- the **panel** labels the row, because a note about something else with no
  explanation reads as the search having misfired.
"""

from __future__ import annotations

import json

from memorymap.ai import librarian
from memorymap.core.database import Entry, EntryLink


def _note(session, content, tags=None):
    entry = Entry(content=content, tags=json.dumps(tags or []))
    session.add(entry)
    session.commit()
    return entry


def test_the_response_names_which_results_arrived_by_connection(ai_client, session):
    match = _note(session, "the beans need netting before the pigeons find them")
    linked = _note(session, "netting is in the shed behind the mower")
    session.add(EntryLink(source_entry_id=match.id, target_entry_id=linked.id))
    session.commit()

    body = ai_client.post("/chat", json={"question": "beans netting"}).json()
    ids = [row["id"] for row in body["raw_results"]]
    assert match.id in ids and linked.id in ids
    assert body["connected_ids"] == [linked.id]


def test_nothing_is_marked_when_nothing_was_pulled_in(ai_client, session):
    """The common case. An empty list rather than a missing key, so the client
    can read it without a guard."""
    _note(session, "a note with no connections at all")
    body = ai_client.post("/chat", json={"question": "connections"}).json()
    assert body["connected_ids"] == []


def test_the_prompt_tells_the_model_which_notes_did_not_match():
    notes = [
        {"id": 1, "category": "Garden", "content": "the beans need netting"},
        {
            "id": 2,
            "category": "House",
            "content": "netting is in the shed",
            "connected": True,
        },
    ]
    messages = librarian.build_messages("beans netting", notes)
    prompt = messages[-1]["content"]
    assert "not a match — linked to one of the above" in prompt
    # …and only on the one that needs it.
    assert prompt.count("not a match") == 1


def test_an_attached_note_keeps_its_own_marker():
    """The two markers answer different questions — "I chose this" and "this
    did not match" — and a note could carry either."""
    notes = [{"id": 1, "category": "Garden", "content": "beans", "attached": True}]
    prompt = librarian.build_messages("beans", notes)[-1]["content"]
    assert "attached by me" in prompt
    assert "not a match" not in prompt
