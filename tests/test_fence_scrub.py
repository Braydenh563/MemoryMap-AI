"""Fence markers a model echoes back never reach the person (INBOX 432).

Measured with Qwen2.5-1.5B through llama.cpp in the popup agent: the answer
quoted "<<<data note>>> ... <<<end data>>>" verbatim. The markers are for the
model (`ai/fence.py`); `AnswerScrubber` takes them out of the stream, even
when a marker is split across deltas.
"""

import json

from memorymap.ai.fence import AnswerScrubber


def _scrub(deltas):
    scrubber = AnswerScrubber()
    return "".join(scrubber.feed(d) for d in deltas) + scrubber.flush()


def test_whole_markers_are_removed():
    text = "Here it is:\n<<<data note>>>\nBuy batteries.\n<<<end data>>>\nDone."
    assert _scrub([text]) == "Here it is:\nBuy batteries.\nDone."


def test_a_marker_split_across_tokens_is_removed():
    deltas = ["Found: <", "<<da", "ta no", "te>>", "> Sourdough. <<", "<end d", "ata>>>", " ok"]
    # Spaces either side of a marker that arrived in other deltas may stay;
    # markdown renders them as one.
    assert " ".join(_scrub(deltas).split()) == "Found: Sourdough. ok"


def test_ordinary_angle_brackets_survive():
    for text in ("a < b and c << d", "x <<<y", "ends with <", "3 <<< 4 is false"):
        assert _scrub(list(text)) == text, text


def test_the_stream_is_scrubbed(ai_client, fake_ollama):
    fake_ollama.librarian_reply = "Your note says <<<data note>>> sourdough <<<end data>>> today."
    body = ai_client.post("/chat/stream", json={"question": "what about sourdough?", "use_tools": True}).text
    answer = "".join(
        json.loads(line).get("delta", "")
        for line in body.splitlines()
        if line and json.loads(line).get("type") == "answer"
    )
    assert "<<<" not in answer and "sourdough" in answer
