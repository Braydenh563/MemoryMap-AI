"""The Guide, drafting and document review narrate their runs (OPEN row 553).

They stream `thinking`, `delta` and (review) `item` events, which the
narrator did not read, so their ledger runs held a start and an end only.
"""

from __future__ import annotations

import json

from tessellate.core.activity import StreamNarrator


def _said(events: list[dict]) -> list[str]:
    narrator = StreamNarrator()
    return [line for line in (narrator(json.dumps(e)) for e in events) if line]


def test_the_guide_and_drafting_say_what_they_did():
    said = _said([
        {"type": "thinking", "text": "hm"},
        {"type": "thinking", "text": "more"},
        {"type": "delta", "text": "Open the "},
        {"type": "delta", "text": "Library tab."},
        {"type": "done", "content": "Open the Library tab."},
    ])
    assert said == ["Thinking.", "Writing the answer.", "Done: 4 words."]


def test_a_review_names_each_suggestion():
    said = _said([
        {"type": "item", "quote": "very very", "reason": "A repeated word", "fix": "very"},
        {"type": "done"},
    ])
    assert said[0] == "Suggested a change: A repeated word."
    assert said[-1].startswith("Done:")
