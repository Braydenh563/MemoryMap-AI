"""INBOX 527: what a small model writes for a forced first call, with the
app's real system prompt and compact tools, capped at 300 tokens.

    MEMORYMAP_EVALS_URL=... MEMORYMAP_EVALS_MODEL=... PYTHONPATH=src \
        .venv/bin/python scratchpad/harness_forced.py "Make a note: buy milk"
"""
import json
import logging
import os
import sys
import tempfile
from pathlib import Path

import requests

from memorymap.ai import agent, tools
from memorymap.core import deps

logging.disable(logging.WARNING)
URL, MODEL = os.environ["MEMORYMAP_EVALS_URL"], os.environ["MEMORYMAP_EVALS_MODEL"]
deps.init_app_state(data_dir=Path(tempfile.mkdtemp()))
for question in sys.argv[1:]:
    messages = agent.build_agent_messages(question, [])
    names = [n for n in dict.fromkeys([*tools.CORE_TOOLS, *(tools.focus_for(question) or [])]) if n not in tools.ORCHESTRATION_TOOLS]
    offered = tools.compact_schemas(tools.ollama_tools(names))
    body = {"model": MODEL, "messages": messages, "tools": offered, "tool_choice": "required", "max_tokens": 300}
    reply = requests.post(f"{URL}/chat/completions", json=body, timeout=900).json()
    message = reply["choices"][0]["message"]
    print("==", question)
    print("  ", json.dumps(message.get("tool_calls"))[:400], "|", (message.get("content") or "")[:200])
    print("   tokens:", reply.get("usage"))
