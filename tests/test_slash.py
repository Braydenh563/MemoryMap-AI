"""Slash commands (O6; BACKLOG "Slash commands in Chat and the composer" and
"Composer: natural language equals slash commands"). One registry
(`ai/slash.py`) feeds the route, `GET /chat/commands`, `/help` and the "/"
menu's Commands row; every command answers with no model. Before: "/recent
3" in Chat answered "I couldn't find any saved notes matching that
question" (measured on :8785, 2026-10-17)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tessellate.ai import help_chat, reading, slash
from tessellate.entry import manager

ROOT = Path(__file__).resolve().parents[1]
READER = reading.__name__


def _say(client, question: str, **body) -> str:
    text = []
    with client.stream("POST", "/chat/stream", json={"question": question, **body}) as response:
        for line in response.iter_lines():
            if line.strip():
                event = json.loads(line)
                if event.get("type") == "answer":
                    text.append(event["delta"])
    return "".join(text)


@pytest.fixture()
def notebook(session):
    manager.create_entry(session, "Golf after work, hit a bucket of balls", "Sport", ["golf"])
    manager.create_entry(session, "Golf lesson with the club pro", "Sport", ["golf"])
    manager.create_entry(session, "Dentist on Tuesday at 3pm")
    manager.create_entry(session, "Grocery list: milk and eggs")
    session.commit()
    return session


@pytest.mark.parametrize("body", [{"use_tools": True}, {"use_tools": False}, {"notes_only": True, "answer_from": "notes", "use_tools": False}])
def test_each_command_answers_exactly_in_chat_and_ask(client, notebook, body):
    assert _say(client, "/recent 2", **body).startswith("Your two newest notes:")
    assert "Grocery list" in _say(client, "/recent 2", **body)
    assert _say(client, "/count", **body) == "You have four notes."
    assert _say(client, "/count golf", **body) == "Two of your 4 notes are tagged #golf."
    assert _say(client, "/count sport", **body) == "Two of your 4 notes are in sport."
    assert _say(client, "/count dentist", **body) == "One of your 4 notes mentions “dentist”."
    made = _say(client, "/made today", **body)
    assert made.startswith("You wrote four notes today:") and "Golf lesson" in made, made
    assert "last month" in _say(client, "/made last month", **body)
    untagged = _say(client, "/untagged", **body)
    assert untagged.startswith("Two notes have no tags:") and "Dentist" in untagged and "Golf" not in untagged.split("\n\n")[1]


def test_help_lists_every_command_and_says_how_to_type_one(client, notebook):
    listed = _say(client, "/help")
    for command in slash.COMMANDS.values():
        assert command.usage in listed
    assert _say(client, "/help made").startswith("**/made [day or span]**")
    assert _say(client, "/frobnicate").startswith("There's no /frobnicate command.")
    assert "Try /made yesterday" in _say(client, "/made bananas")
    assert "Say when" in _say(client, "/made")


def test_a_typed_command_is_exact_with_a_model_running_too(ai_client, notebook):
    assert _say(ai_client, "/count golf", use_tools=True) == "Two of your 4 notes are tagged #golf."


def test_plain_words_run_the_command(client, notebook):
    said = _say(client, "which notes have no tags", use_tools=False)
    assert said.startswith("Two notes have no tags:"), said


def test_one_registry_feeds_the_route_the_menu_and_the_help(client):
    names = [c["name"] for c in client.get("/chat/commands").json()["commands"]]
    assert names == list(slash.COMMANDS)
    editor = (ROOT / "frontend" / "js" / "editor.js").read_text(encoding="utf-8")
    row = editor[editor.index('id: "chat-commands"'):].split("\n", 1)[0]
    topic = next(t for t in help_chat.HELP_TOPICS if t["id"] == "slash-commands")
    for name in names:
        assert name in row, name
        assert f"/{name}" in topic["body"], name
    assert 'sendChatMessage("/help")' in row


def test_house_style():
    for text in [c.summary for c in slash.COMMANDS.values()]:
        assert "!" not in text and chr(0x2014) not in text and text[:1].islower()
