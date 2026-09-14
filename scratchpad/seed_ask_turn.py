"""Seed one note and one Ask turn with citations, for INBOX 241's sweep.

No model runs in the sandbox, so a real Ask answer cannot be produced here.
This writes the row `_save_ask_turn` would have written, in the same shape,
so `scratchpad/ui-sweeps/askhistorycite.js` can reopen it from the history
panel and measure what gets drawn.

    MEMORYMAP_DATA_DIR=/tmp/mm-notes PYTHONPATH=src .venv/bin/python \
        scratchpad/seed_ask_turn.py
"""

from __future__ import annotations

import json

import os
from pathlib import Path

from memorymap.core.database import AskTurn, DatabaseManager
from memorymap.entry import manager

SENTENCE = "The beans need netting next week."


def main() -> int:
    data_dir = Path(os.environ.get("MEMORYMAP_DATA_DIR", "."))
    with DatabaseManager(data_dir / "memorymap.db").session() as session:
        entry = manager.create_entry(session, f"{SENTENCE} The netting is in the shed.")
        session.flush()
        session.add(
            AskTurn(
                question="what did I write about beans",
                answer=f"{SENTENCE} You also noted where the netting is.",
                raw_result_ids=json.dumps([entry.id]),
                search_mode="keyword",
                when_phrase="",
                match_info=json.dumps({str(entry.id): {"type": "keyword", "terms": ["beans"]}}),
                connected_ids="[]",
                grounding=json.dumps(
                    [
                        {
                            "sentence": SENTENCE,
                            "note_id": entry.id,
                            "start": 0,
                            "end": len(SENTENCE),
                            "score": 0.9,
                            "label": SENTENCE[:60],
                        }
                    ]
                ),
            )
        )
        session.commit()
        print(f"seeded note {entry.id} and one ask turn")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
