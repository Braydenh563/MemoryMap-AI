"""A newer note on the same thing is the current one (O11; BACKLOG "Facts
change over time"). Measured 2026-10-17 with no model: "what are my uni
days" over a February and a July note answered from February; "what is my
address" quoted the 2025 address over the 2026 one."""

from __future__ import annotations

import json
from datetime import datetime

import pytest

from tessellate.ai import supersede
from tessellate.core.database import Entry
from tessellate.entry import manager

NOTES = (
    ("Uni days this semester: Tuesday and Thursday. Classes: COMP1001 and MATH1002.", "2026-02-20"),
    ("Uni days this semester are Monday and Wednesday. Classes: COMP2001 and STAT2002.", "2026-07-25"),
    ("My address is 12 Oak Street, Perth.", "2025-03-01"),
    ("Moved house. My address is now 4 Birch Road, Fremantle.", "2026-06-01"),
    ("Golf is fun, played nine holes with Sam.", "2026-05-01"),
)


@pytest.fixture()
def notebook(session):
    for text, day in NOTES:
        entry = manager.create_entry(session, text)
        session.flush()
        session.get(Entry, entry.id).created_at = datetime.fromisoformat(f"{day}T10:00:00")
    session.commit()
    return session


def _say(client, question: str) -> str:
    text = []
    with client.stream("POST", "/chat/stream", json={"question": question, "notes_only": True, "answer_from": "notes", "use_tools": False}) as r:
        for line in r.iter_lines():
            if line.strip():
                event = json.loads(line)
                if event.get("type") == "answer":
                    text.append(event["delta"])
    return "".join(text)


def test_the_newest_note_answers_and_the_older_is_named(client, notebook):
    said = _say(client, "what are my uni days")
    assert "Monday and Wednesday" in said, said
    assert said.index("Monday and Wednesday") < said.index("Tuesday and Thursday"), said
    assert "20 February" in said, said
    address = _say(client, "what is my address")
    assert "4 Birch Road" in address, address
    assert "12 Oak Street" not in address.split("\n\n")[0], address
    assert "An older note, from 1 March 2025, said 12 Oak Street, Perth." in address or "1 March 2025" in address, address


def test_a_question_about_the_change_keeps_both(client, notebook):
    kept, replaced = supersede.current("how did my uni days change", [{"content": t, "created_at": d} for t, d in NOTES])
    assert len(kept) == len(NOTES) and not replaced


def test_only_the_subject_asked_about_is_set_aside():
    notes = [{"content": t, "created_at": d} for t, d in NOTES] + [{"content": "Golf is hard.", "created_at": "2026-06-01"}]
    kept, replaced = supersede.current("what are my uni days", notes)
    assert [r.value for r in replaced] == ["Tuesday and Thursday"]
    assert any("Golf is fun" in n["content"] for n in kept)


def test_the_older_line_has_eight_wordings_a_voice():
    for voice in ("natural", "professional"):
        lines = supersede._PROFESSIONAL if voice == "professional" else supersede._NATURAL
        assert len(set(lines)) >= 8 and all("!" not in line and chr(0x2014) not in line for line in lines)
