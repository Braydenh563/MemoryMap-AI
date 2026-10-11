"""Read requests reach their tool with no model, in people's words and the
owner's typos, and the answer carries the links (brief composer item 4: "30
phrasings, each answer offers the exact action row or nav link"). The gold
is `fixtures/composer/routing_1011.json`."""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from memorymap.ai import question_noise, reading

ROOT = Path(__file__).resolve().parents[1]
GOLD = json.loads((ROOT / "tests" / "fixtures" / "composer" / "routing_1011.json").read_text(encoding="utf-8"))
NOW = datetime(2026, 10, 11, 10, 0)
#: Measured 2026-10-11: 12 of 30 read as typed before, 30 of 30 after.
FLOOR = 1.0


def _tool(typed: str) -> str | None:
    return reading.read(question_noise.repair(question_noise.tidy(typed)), now=NOW).tool


def test_the_gold_requests_reach_their_tool():
    misses = [(typed, want, _tool(typed)) for typed, want in GOLD["routes"] if _tool(typed) != want]
    assert len(GOLD["routes"]) >= 30
    assert 1 - len(misses) / len(GOLD["routes"]) >= FLOOR, misses


def test_a_question_about_one_note_is_not_the_whole_list():
    listing = {"list_tags", "list_categories", "list_documents", "list_skills", "list_notes", "notebook_overview", "notebook_structure"}
    wrong = [(typed, _tool(typed)) for typed in GOLD["not_tools"] if _tool(typed) in listing]
    assert not wrong, wrong


def _answer(client, question):
    with client.stream("POST", "/chat/stream", json={"question": question, "use_tools": True}) as response:
        events = [json.loads(line) for line in response.iter_lines() if line.strip()]
    return "".join(e.get("delta", "") for e in events if e["type"] == "answer")


def test_through_the_route_a_typed_request_lists_with_its_links(client, session):
    from memorymap.entry import manager

    manager.create_entry(session, "# Dentist\n\nCheck-up booked for the 21st.", tags=["health"])
    manager.create_entry(session, "# Harbor launch\n\nShip the app on the 14th.", tags=["harbor"])
    session.commit()
    tags = _answer(client, "shwo me evry tag i hav plz")
    assert "You have two tags" in tags and "[Open your notes](#/notes)" in tags, tags
    notes = _answer(client, "shwo all my notes")
    assert re.search(r"\]\(#/notes/\d+\)", notes), notes


def test_a_listing_by_category_or_tag_lists_only_those(client, session):
    """Row 442 (P12): "list my work notes" answered "I found two notes about
    list my work"; it lists the Work notes, and a tag the same way."""
    from memorymap.entry import manager

    harbor = manager.create_entry(session, "# Harbor launch\n\nShip the app on the 14th.", tags=["harbor"], category_name="Work").id
    standup = manager.create_entry(session, "# Standup\n\nSync rewrite is behind.", tags=["team"], category_name="Work").id
    bread = manager.create_entry(session, "# Sourdough\n\nLoaf 6 was great.", tags=["baking"], category_name="Cooking").id
    session.commit()
    for typed in ("list my work notes", "shw me all my work notes plz", "notes in work"):
        said, rows = _listed(client, typed)
        assert said.startswith("Here are your two Work notes"), said
        assert rows == {harbor, standup}, (typed, rows)
    said, rows = _listed(client, "show my baking notes")
    assert said.startswith("Here is your note tagged #baking") and rows == {bread}, (said, rows)


def _listed(client, question):
    """The answer's words, and the ids of the notes it lists: as rows under
    an act's line, or as links in a read's answer."""
    with client.stream("POST", "/chat/stream", json={"question": question, "use_tools": True}) as response:
        events = [json.loads(line) for line in response.iter_lines() if line.strip()]
    said = "".join(e.get("delta", "") for e in events if e["type"] == "answer")
    rows = {item["id"] for e in events if e["type"] == "tool" for card in e.get("cards") or [] for item in card.get("items") or []}
    return said, rows or {int(n) for n in re.findall(r"\]\(#/notes/(\d+)\)", said)}
