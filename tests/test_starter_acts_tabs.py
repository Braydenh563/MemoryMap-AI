"""Every tab's starters are answered with no model (OPEN row 562).

The dashboard's fourteen were held by `test_starter_acts.py`; the other tabs'
(palette.js AGENT_TAB_STARTERS) fell through to the composed answer, which
quotes notes rather than doing what the starter says.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from tests.test_starter_acts import FALLBACK, _events, _outcome, notebook  # noqa: F401

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / "frontend" / "js" / "palette.js").read_text("utf-8")

#: text -> (what the turn sends, the expected outcome, a word the answer must hold)
CASES = {
    "Suggest tags for the note I have open.": ("untagged", "card", "tag"),
    "Save the last answer as a note.": ("history", "card", "note"),
    "What is linked to the note I have open?": ("note", "answer", "link"),
    "What is in the board or map I have open?": ("board", "answer", "Garden"),
    "Summarise the document or board I have open.": ("document", "answer", "Seed order"),
    "Summarise the document I have open.": ("document", "answer", "Seed order"),
    "List the key points of the document I have open.": ("document", "answer", "Seed order"),
}


def test_every_tab_starter_is_a_case_here_or_on_the_dashboard():
    from tests.test_starter_acts import STARTERS

    tabs = JS[JS.index("const AGENT_TAB_STARTERS"):JS.index("};", JS.index("const AGENT_TAB_STARTERS"))]
    texts = set(re.findall(r'text: "([^"]+)"', tabs))
    covered = set(CASES) | {s["text"] for s in STARTERS} | {"Remind me to ", "What did I write this week?", "What is due?",
                                                            "Summarise the note I have open.", "Summarise this conversation.",
                                                            "Link notes that belong together.", "What changed in my notebook today?",
                                                            "What loose ends should I pick up next?"}
    assert texts <= covered, texts - covered


def _body(client, kind: str, ids: list[int]) -> dict:
    if kind == "note":
        return {"note_ids": [ids[0]]}
    if kind == "untagged":  # note 10 has no tags; its harbor siblings do
        return {"note_ids": [ids[10]]}
    if kind == "history":
        return {"history": [{"question": "What is the boiler pressure?", "answer": "Keep it at 1.5 bar, from your boiler note."}]}
    if kind == "document":
        doc = client.post("/documents", json={"title": "Seed order", "content": "# Seed order\n\n## Vegetables\n\nCarrots and leeks.\n\n## Flowers\n\nSweet peas."}).json()
        return {"document_ids": [doc["id"]]}
    board = client.post("/whiteboard/boards", json={"name": "Garden"}).json()
    return {"board_ids": [board["id"]]}


@pytest.mark.parametrize("text", list(CASES))
def test_each_tab_starter_runs_with_no_model(client, notebook, text):  # noqa: F811
    kind, expect, word = CASES[text]
    if kind == "note":
        client.post("/links", json={"source_entry_id": notebook[0], "target_entry_id": notebook[4]})
    events = _events(client, text, **_body(client, kind, notebook))
    answer = "".join(e.get("delta", "") for e in events if e.get("type") == "answer").strip()
    assert answer and not FALLBACK.search(answer), answer
    assert word.lower() in json.dumps(events).lower(), answer
    assert _outcome(events) == expect, (text, answer)
