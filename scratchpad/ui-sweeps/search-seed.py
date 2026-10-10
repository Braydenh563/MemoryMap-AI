"""Seed one of each search kind into a data dir (Brief 47's sweep, search.js).

    MEMORYMAP_DATA_DIR=<dir> PYTHONPATH=src .venv/bin/python scratchpad/ui-sweeps/search-seed.py

Through the ORM, so the index's flush hook writes every row as the app would.
Each thing carries its own word ("quillnote", "quilldoc", ...) so a sweep can
find exactly one hit per kind. Idempotent: a second run adds nothing.
"""
import json
from datetime import datetime

from memorymap.core import deps
from memorymap.core.database import (
    AskTurn,
    Attachment,
    Bookmark,
    Conversation,
    Document,
    Entry,
    Reminder,
)

with deps.get_db().session() as session:
    if session.query(Entry).filter(Entry.content.like("%quillnote%")).first():
        print("already seeded")
        raise SystemExit(0)
    note = Entry(content="Quill note\n\nquillnote about fountain pens")
    session.add(note)
    session.add(Entry(content="# Quill board\nquillboard", is_board=True))
    session.add(Entry(content="# Quill map\nquillmap", is_board=True, board_settings=json.dumps({"type": "map"})))
    session.add(Document(title="Quill document", content="quilldoc on nibs"))
    session.add(Bookmark(url="https://example.com/quill", title="Quill bookmark quillmark"))
    session.add(Reminder(text="quillremind refill the ink", due_at=datetime(2026, 11, 1, 9)))
    session.add(
        Conversation(
            title="Quill chat",
            messages=json.dumps([
                {"role": "user", "content": "quillchat which ink is best"},
                {"role": "assistant", "content": "a dye-based ink"},
            ]),
        )
    )
    session.add(AskTurn(question="quillask what nib did I buy", answer="A fine steel nib."))
    session.flush()
    session.add(Attachment(entry_id=note.id, filename="quillfile.pdf", stored_name="quillfile", ocr_text="quillfile receipt"))
    session.commit()
    print("seeded")
