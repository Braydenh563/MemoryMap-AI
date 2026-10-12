"""Chat names the model that answered, not the default it asked for
(bug sweep 2026-10-12): with the default "llama3.2" not installed and a
llama.cpp server serving Qwen, the turn said "Answering with llama3.2". A
server that serves one model answers with it whatever name is sent, so that
one is named; a configured model the server has is named as configured.
"""

from __future__ import annotations

import json

from memorymap.ai import tools
from memorymap.ai.model_manager import served_name


def _meta(client, question):
    with client.stream("POST", "/chat/stream", json={"question": question}) as response:
        for line in response.iter_lines():
            if line.strip():
                event = json.loads(line)
                if event["type"] == "meta":
                    return event
    raise AssertionError("no meta event")


def test_the_one_served_model_is_named_when_the_default_is_not_there(ai_client, fake_ollama, session):
    tools.execute_tool(session, "create_note", {"content": "The garden shed needs a new roof before winter"})
    session.commit()
    fake_ollama.installed = [{"name": "/home/x/memorymap-llama/qwen2.5-1.5b-instruct-q4_k_m.gguf"}]
    assert _meta(ai_client, "what does the garden shed need")["answered_by"] == "qwen2.5-1.5b-instruct-q4_k_m"


def test_an_installed_configured_model_is_named_as_configured(ai_client, fake_ollama, session):
    tools.execute_tool(session, "create_note", {"content": "The garden shed needs a new roof before winter"})
    session.commit()
    assert _meta(ai_client, "what does the garden shed need")["answered_by"] == "llama3.2"


def test_served_name_rules():
    assert served_name("llama3.2", [{"name": "llama3.2:latest"}]) == "llama3.2"
    assert served_name("llama3.2", [{"id": "qwen2.5:1.5b"}]) == "qwen2.5:1.5b"
    #: Two served and neither is the one asked for: the request names it, so it stays.
    assert served_name("llama3.2", [{"name": "a"}, {"name": "b"}]) == "llama3.2"
    assert served_name("llama3.2", []) == "llama3.2"
    assert served_name("Qwen/Qwen2.5-1.5B", [{"id": "Qwen/Qwen2.5-1.5B"}]) == "Qwen/Qwen2.5-1.5B"
