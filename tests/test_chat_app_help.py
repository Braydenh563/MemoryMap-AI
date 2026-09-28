"""Chat and the agents read the app's own help for a how-to question.

The owner, with a screenshot of Chat answering "how should I use the knowledge
graph??" from the notes: "give the chat tab chat ai and agent access to the
help info as well in case users ask it questions for help"."""

from __future__ import annotations

from memorymap.ai import help_chat, librarian


def test_a_how_to_question_about_the_app_gets_the_help():
    block = help_chat.help_block_for("how should I use the knowledge graph??")
    assert "MemoryMap's own help" in block
    assert "Graph" in block


def test_a_question_about_the_notes_gets_none():
    assert help_chat.help_block_for("what did I write about bread") == ""
    assert help_chat.help_block_for("make a note about bread") == ""


def test_the_block_rides_with_the_question_not_the_system_prompt():
    messages = librarian.build_messages("how do I use the graph?", [])
    assert "MemoryMap's own help" not in messages[0]["content"]
    assert "MemoryMap's own help" in messages[-1]["content"]


def test_the_block_is_bounded():
    block = help_chat.help_block_for("how do I use chat, notes, the graph and search?")
    assert len(block) < help_chat.HELP_BLOCK_MAX_CHARS + 200


def test_the_agent_request_carries_it(ai_client, fake_ollama):
    ai_client.post("/chat/stream", json={"question": "how do I use the graph?", "use_tools": True})
    sent = fake_ollama.tool_rounds[0]
    assert "MemoryMap's own help" in sent[-1]["content"]
    assert "MemoryMap's own help" not in sent[0]["content"]
