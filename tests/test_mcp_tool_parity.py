"""The MCP server answers a tool call exactly as the in-app agent's executor does
(WORLD_CLASS_PLAN H4, the gate's first half).

`mcp_server._call_tool` wraps `tools.execute_tool`; the wrapper must add the
MCP result shape and the icon-free label and change nothing else. Every
read-only tool that needs no arguments is called both ways on one seeded
notebook and the answers compared.
"""

from __future__ import annotations

import json

from memorymap import mcp_server
from memorymap.ai import tools
from memorymap.core import deps


#: Answers that change from one call to the next, so two calls can never match.
CLOCK_READERS = frozenset({"get_current_time"})


def _no_argument_readers():
    return sorted(
        spec.name
        for spec in mcp_server.offered_tools()
        if spec.name not in CLOCK_READERS and mcp_server._is_read_only(spec) and not (spec.parameters or {}).get("required")
    )


def test_there_are_readers_to_compare(app_state):
    assert len(_no_argument_readers()) >= 5


def test_every_argumentless_reader_answers_the_same_over_mcp(client):
    client.post("/entries", json={"content": "Tomatoes grow best staked.", "category": "Garden"})
    client.post("/reminders", json={"text": "Water the plants", "due_at": "2030-01-01T09:00:00+00:00"})
    different = []
    for name in _no_argument_readers():
        session = deps.get_db().session()
        try:
            direct = tools.execute_tool(session, name, {}, agent="mcp client")
        finally:
            session.close()
        direct = mcp_server._clean_label(direct)
        over = mcp_server._call_tool(name, {})
        text = json.loads(over["content"][0]["text"])
        if text != json.loads(json.dumps(direct)) or over["isError"] != (isinstance(direct, dict) and "error" in direct):
            different.append(name)
    assert not different, f"MCP and the in-app executor disagree on: {different}"
