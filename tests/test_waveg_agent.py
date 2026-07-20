"""Wave G: agentic tools — registry, agent loop, confirm flow, skills."""

from __future__ import annotations

import json

from memorymap.ai import tools
from memorymap.core import deps
from memorymap.core.database import Reminder


def _save(client, content, **extra):
    response = client.post("/entries", json={"content": content, **extra})
    assert response.status_code == 201
    return response.json()


def _stream_events(client, question, **body):
    with client.stream(
        "POST", "/chat/stream", json={"question": question, **body}
    ) as response:
        assert response.status_code == 200
        return [json.loads(line) for line in response.iter_lines() if line]


# --- the registry ---------------------------------------------------------------


def test_registry_shapes_are_valid_for_ollama(app_state):
    offered = tools.ollama_tools()
    # web_search stays hidden until the user opts in (Wave F).
    assert len(offered) == len(tools.TOOLS) - 1
    for item in offered:
        assert item["type"] == "function"
        fn = item["function"]
        assert fn["name"] in tools.TOOLS
        assert fn["description"]
        assert fn["parameters"]["type"] == "object"


def test_destructive_tools_are_flagged():
    assert tools.TOOLS["delete_note"].destructive
    assert tools.TOOLS["delete_tag"].destructive
    # Everything else must be safe to auto-run.
    safe = {n for n, s in tools.TOOLS.items() if not s.destructive}
    assert "create_note" in safe and "search_notes" in safe


def test_execute_search_and_count(ai_client, session):
    _save(ai_client, "buy milk and eggs", category="Shopping")
    _save(ai_client, "a funny scarecrow joke", category="Jokes")

    found = tools.execute_tool(session, "search_notes", {"query": "groceries milk"})
    assert found["found"] >= 1
    assert any("milk" in n["content"] for n in found["notes"])

    counted = tools.execute_tool(session, "count_notes", {})
    assert counted["total"] == 2
    assert counted["by_category"] == {"Shopping": 1, "Jokes": 1}

    one = tools.execute_tool(session, "count_notes", {"category": "Jokes"})
    assert one["count"] == 1


def test_execute_create_edit_tag_pin_link(ai_client, session):
    created = tools.execute_tool(
        session, "create_note", {"content": "call the dentist", "category": "Tasks"}
    )
    assert created["category"] == "Tasks"
    note_id = created["id"]

    tagged = tools.execute_tool(
        session, "tag_note", {"note_id": note_id, "add": ["health", "phone"]}
    )
    assert set(tagged["tags"]) == {"health", "phone"}

    untagged = tools.execute_tool(
        session, "tag_note", {"note_id": note_id, "remove": ["phone"]}
    )
    assert untagged["tags"] == ["health"]

    pinned = tools.execute_tool(session, "pin_note", {"note_id": note_id})
    assert pinned["pinned"] is True

    other = tools.execute_tool(session, "create_note", {"content": "book a checkup"})
    linked = tools.execute_tool(
        session, "link_notes", {"note_id": note_id, "other_note_id": other["id"]}
    )
    assert linked["linked"] == [note_id, other["id"]]

    edited = tools.execute_tool(
        session, "edit_note", {"note_id": note_id, "category": "Health"}
    )
    assert edited["category"] == "Health"

    # Tool actions land in the audit log with the ai_tool action.
    audit = ai_client.get("/audit?limit=100").json()
    assert any(row["action"] == "ai_tool" for row in audit)


def test_execute_reminder_tools(ai_client, session):
    created = tools.execute_tool(
        session,
        "set_reminder",
        {"text": "water the plants", "due_at": "2030-01-02T09:00"},
    )
    assert created["id"]

    listed = tools.execute_tool(session, "list_reminders", {})
    assert [r["text"] for r in listed["reminders"]] == ["water the plants"]

    done = tools.execute_tool(
        session, "complete_reminder", {"reminder_id": created["id"]}
    )
    assert done["done"] is True
    assert session.get(Reminder, created["id"]).done is True


def test_execute_bad_arguments_return_error_not_crash(ai_client, session):
    result = tools.execute_tool(session, "edit_note", {"note_id": 999})
    assert "error" in result
    result = tools.execute_tool(
        session, "set_reminder", {"text": "x", "due_at": "not-a-date"}
    )
    assert "error" in result
    assert tools.execute_tool(session, "no_such_tool", {}) == {
        "error": "Unknown tool 'no_such_tool'"
    }


# --- the agent loop over the streaming endpoint -----------------------------------


def test_agent_runs_tool_then_answers(ai_client, fake_ollama):
    fake_ollama.tool_script = [
        [{"name": "create_note", "arguments": {"content": "buy milk", "category": "Shopping"}}]
    ]
    fake_ollama.librarian_reply = "Done — I saved that to Shopping."

    events = _stream_events(ai_client, "save a note to buy milk")

    tool_events = [e for e in events if e["type"] == "tool"]
    assert len(tool_events) == 1
    assert tool_events[0]["ok"] is True
    assert "Created note" in tool_events[0]["label"]
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert answer == "Done — I saved that to Shopping."
    assert events[-1]["type"] == "done"

    # The note really exists now.
    entries = ai_client.get("/entries").json()
    assert any(e["content"] == "buy milk" for e in entries)


def test_agent_feeds_tool_results_back_to_model(ai_client, fake_ollama):
    _save(ai_client, "buy milk", category="Shopping")
    fake_ollama.tool_script = [[{"name": "count_notes", "arguments": {}}]]

    _stream_events(ai_client, "how many notes do I have?")

    # Round 2 must contain a tool message with the count result.
    final_round = fake_ollama.tool_rounds[-1]
    tool_messages = [m for m in final_round if m["role"] == "tool"]
    assert len(tool_messages) == 1
    assert json.loads(tool_messages[0]["content"])["total"] == 1


def test_agent_destructive_call_waits_for_confirmation(ai_client, fake_ollama):
    saved = _save(ai_client, "delete me please", category="Junk")
    fake_ollama.tool_script = [
        [{"name": "delete_note", "arguments": {"note_id": saved["id"]}}]
    ]

    events = _stream_events(ai_client, "delete that junk note")

    confirms = [e for e in events if e["type"] == "confirm"]
    assert len(confirms) == 1
    assert confirms[0]["name"] == "delete_note"
    assert str(saved["id"]) in confirms[0]["label"]
    # Nothing was deleted — the tool never ran.
    assert not [e for e in events if e["type"] == "tool"]
    entries = ai_client.get("/entries").json()
    assert any(e["id"] == saved["id"] for e in entries)


def test_confirmed_tool_executes_via_endpoint(ai_client):
    saved = _save(ai_client, "delete me please", category="Junk")

    response = ai_client.post(
        "/chat/tools/execute",
        json={"name": "delete_note", "arguments": {"note_id": saved["id"]}},
    )
    assert response.status_code == 200
    assert "recycle bin" in response.json()["label"]

    # Soft-deleted: gone from the list, present in the bin.
    assert all(e["id"] != saved["id"] for e in ai_client.get("/entries").json())
    binned = ai_client.get("/entries?deleted=true").json()
    assert any(e["id"] == saved["id"] for e in binned)


def test_execute_endpoint_rejects_unknown_and_bad_calls(ai_client):
    assert (
        ai_client.post("/chat/tools/execute", json={"name": "nope"}).status_code == 404
    )
    response = ai_client.post(
        "/chat/tools/execute",
        json={"name": "delete_note", "arguments": {"note_id": 12345}},
    )
    assert response.status_code == 400


def test_model_without_tool_support_falls_back_to_plain_chat(ai_client, fake_ollama):
    fake_ollama.supports_tools = False
    _save(ai_client, "a funny scarecrow joke")

    events = _stream_events(ai_client, "any funny jokes?")
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    # The normal streamed librarian answered instead of the agent.
    assert answer == fake_ollama.librarian_reply
    assert events[-1]["type"] == "done"


def test_use_tools_false_skips_the_agent(ai_client, fake_ollama):
    _save(ai_client, "a funny scarecrow joke")
    events = _stream_events(ai_client, "any funny jokes?", use_tools=False)
    assert not fake_ollama.tool_rounds  # chat_tools was never called
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert answer == fake_ollama.librarian_reply


def test_agent_works_on_an_empty_notebook(ai_client, fake_ollama):
    fake_ollama.tool_script = [
        [{"name": "create_note", "arguments": {"content": "first ever note"}}]
    ]
    events = _stream_events(ai_client, "save my first note")
    assert [e for e in events if e["type"] == "tool"]
    assert any(e["content"] == "first ever note" for e in ai_client.get("/entries").json())


def test_agent_round_limit_is_bounded(ai_client, fake_ollama):
    # A model that calls tools forever must be cut off politely.
    fake_ollama.tool_script = [
        [{"name": "count_notes", "arguments": {}}] for _ in range(50)
    ]
    events = _stream_events(ai_client, "loop forever")
    answer = "".join(e["delta"] for e in events if e["type"] == "answer")
    assert "stopped" in answer.lower()
    assert events[-1]["type"] == "done"


# --- skills preferences -----------------------------------------------------------


def test_skills_preference_roundtrip(client):
    body = {"skills": [{"name": "Weekly review", "prompt": "Summarise my week."}]}
    updated = client.put("/preferences", json=body).json()
    assert updated["skills"] == body["skills"]
    assert client.get("/preferences").json()["skills"] == body["skills"]


def test_tools_enabled_preference_roundtrip(client):
    assert client.get("/preferences").json()["tools_enabled"] is True
    updated = client.put("/preferences", json={"tools_enabled": False}).json()
    assert updated["tools_enabled"] is False
