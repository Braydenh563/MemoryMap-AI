"""The notebook the interaction budgets are measured on (WORLD_CLASS_PLAN
25g, decision 54): the 500-note fixture plus the two heavy items its
decision names, a board of 500 text objects and a document of 50,000 words.

Rows go in through the session, not the API, so building it takes seconds and
`tests/test_budgets.py`, the Playwright spec and the README's measurements
all start from the same bytes.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.fixtures import notebook500

WORDS = "the quick brown fox jumps over lazy dogs while writing notes about gardens budgets travel plans and reading lists".split()
OBJECTS = 500
DOC_WORDS = 50_000


def document_text(words: int = DOC_WORDS) -> str:
    return "".join(WORDS[i % len(WORDS)] + (".\n\n" if i % 12 == 11 else " ") for i in range(words))


def build(session, uploads_dir: Path) -> dict:  # noqa: ANN001
    from memorymap.core.database import Document, WhiteboardObject
    from memorymap.entry import manager

    made = notebook500.build(session, uploads_dir)
    board = manager.create_entry(session, "Budget board", category_name="Work")
    board.is_board = True
    session.flush()
    for i in range(OBJECTS):
        session.add(WhiteboardObject(
            board_id=board.id, kind="text", x=float((i % 25) * 220), y=float((i // 25) * 140), width=200.0, height=100.0,
            data=json.dumps({"content": f"Card {i} with a few words of text on it"}),
        ))
    document = Document(title="Budget document", content=document_text(), file_type="md")
    session.add(document)
    session.commit()
    made.update(board_id=board.id, objects=OBJECTS, document_id=document.id, words=DOC_WORDS)
    return made
