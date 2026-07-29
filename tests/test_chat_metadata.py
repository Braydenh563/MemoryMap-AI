"""Search results and message metadata must survive a thinking model.

Reported: with a thinking model, neither the "matching notes" disclosure nor
the metadata line at the bottom of a message showed up. Both are driven by
stream events, so these tests assert on the events themselves.
"""

from __future__ import annotations

import json


def _events(client, question, **body):
    with client.stream("POST", "/chat/stream", json={"question": question, **body}) as r:
        return [json.loads(line) for line in r.iter_lines() if line.strip()]


def test_meta_and_stats_arrive_with_a_thinking_model(ai_client, fake_ollama):
    ai_client.post("/entries", json={"content": "carbonara needs guanciale, not bacon"})
    fake_ollama.librarian_thinking = "Let me consider the notes about pasta."
    fake_ollama.librarian_reply = "You wrote that carbonara needs guanciale."

    events = _events(ai_client, "what did I write about carbonara?", use_tools=False)
    kinds = [e["type"] for e in events]

    assert "thinking" in kinds  # the model really did think
    meta = next(e for e in events if e["type"] == "meta")
    assert meta["raw_results"], "the matching notes disclosure had nothing to show"
    assert meta["search_mode"]
    stats = next(e for e in events if e["type"] == "stats")
    assert stats["output_tokens"] and stats["prompt_tokens"]


def test_agent_mode_still_reports_stats(ai_client, fake_ollama):
    """Tools are on by default, and that path used to emit no stats at all."""
    ai_client.post("/entries", json={"content": "a note about cycling"})
    fake_ollama.librarian_reply = "Done."

    events = _events(ai_client, "what did I write about cycling?", use_tools=True)
    stats = [e for e in events if e["type"] == "stats"]
    assert stats, "agent turns reported no token counts"
    assert stats[0]["output_tokens"]
    assert stats[0]["model"]


def test_agent_mode_reports_stats_for_every_round(ai_client, fake_ollama):
    """Multi-round turns report per round; the UI adds them up."""
    fake_ollama.librarian_reply = "All done."
    fake_ollama.tool_script = [
        [{"name": "count_notes", "arguments": {}}],
        [{"name": "list_categories", "arguments": {}}],
    ]
    events = _events(ai_client, "how many notes do I have and in what categories?")
    stats = [e for e in events if e["type"] == "stats"]
    assert len(stats) >= 2  # one per round, so the totals can accumulate


def test_thinking_model_in_agent_mode_reports_both(ai_client, fake_ollama):
    """The exact reported combination: thinking model + tools on."""
    ai_client.post("/entries", json={"content": "a note about gardening"})
    fake_ollama.librarian_thinking = "Considering the request."
    fake_ollama.librarian_reply = "Here's what I found."

    events = _events(ai_client, "what have I saved about gardening?", use_tools=True)
    kinds = [e["type"] for e in events]
    assert "thinking" in kinds
    assert "stats" in kinds
    meta = next(e for e in events if e["type"] == "meta")
    assert meta["raw_results"]
    assert meta["answered_by"]


def test_the_latest_answer_reaches_a_follow_up_nearly_whole():
    """Reported: "difficult to get the agent to explain something, and then
    make it as a note." The explanation is the previous answer, and clipping
    it to 600 characters meant "save that" saved a stump. The most recent
    answer travels nearly whole; older ones stay clipped hard."""
    from memorymap.ai import librarian

    turns = [
        {"question": f"q{i}", "answer": "old " * 500} for i in range(3)
    ] + [{"question": "explain seraphine", "answer": "the explanation " * 500}]
    messages = librarian.history_messages(turns)
    answers = [m["content"] for m in messages if m["role"] == "assistant"]
    assert all(
        len(a) <= librarian.MAX_HISTORY_ANSWER_CHARS for a in answers[:-1]
    )
    assert len(answers[-1]) == librarian.LAST_ANSWER_CHARS
