"""A stdio MCP (Model Context Protocol) server over this app's own tool
registry (ROADMAP.md item 38, ANALYSIS.md §60).

Why expose rather than consume: this app already has a local-process trust
boundary: anyone who can run a process on this machine can already open
`memorymap.db` directly: so a *stdio* server needs no new trust model, it's
the same boundary the app's own SQLite file already sits behind. Consuming
an external MCP server is the harder half (BACKLOG.md §29's missing trust
model for tool calls arriving *from* somewhere else) and is deliberately
not attempted here.

Only non-destructive, currently-enabled tools are offered. `ai.tools`'s own
`destructive` flag exists because a destructive tool needs a human to see
and confirm it before it runs, the chat UI does that with a confirm card
(`agent.py`'s tool loop parks it rather than running it), but a bare
`execute_tool()` call has no such gate built in, and an MCP client (Claude
Desktop, or anything else) has no confirm card to show. So the safe default
here is to never even list `delete_note`/`delete_tag`/`delete_category`/
`delete_document`/`delete_skill`/`merge_categories`, rather than run one
unconfirmed. `tool_enabled()` is reused as-is, so a tool the user turned off
in Settings -> Tools (including the `web_search`/`read_url` online opt-in)
is invisible here too, the same as it already is to the in-app chat model.

Run with `python -m memorymap.mcp_server`, with `MEMORYMAP_DATA_DIR` set the
same way the main app expects, it operates on the same notebook, not a
second one.
"""

from __future__ import annotations

import json
import re
import sys
from typing import TextIO

from memorymap.ai import tools
from memorymap.core import deps

#: Newest first. `initialize` answers with the client's own version when it is
#: one of these (the spec's negotiation), else the newest we speak. The
#: default for a client that names none stays the oldest, as before.
SUPPORTED_PROTOCOLS = ("2025-06-18", "2025-03-26", "2024-11-05")
PROTOCOL_VERSION = "2024-11-05"
SERVER_NAME = "memorymap-ai"
SERVER_VERSION = "0.1.0"


#: Tools that mean something only inside the chat window. `ends_turn` is the
#: registry's own mark for "stops and waits for the person" (`ask_user`,
#: `make_plan`, `run_skill`, `compress_chat`): a bare client has no card to
#: answer, so the call would park for ever. The two names are read-only but
#: describe this app's own screens and one conversation's history.
CHAT_ONLY = frozenset({"get_app_navigation", "search_chat_history"})


def offered_tools() -> list[tools.ToolSpec]:
    """Every tool this server will list and run: not destructive, not
    interactive, and not turned off in Settings -> Tools."""
    return [
        spec
        for spec in tools.TOOLS.values()
        if not spec.destructive
        and not spec.ends_turn
        and spec.name not in CHAT_ONLY
        and tools.tool_enabled(spec.name)
    ]


#: Tools that change nothing, so a client may auto-approve them. The registry
#: already lists the writers (`tools.WRITE_TOOLS`, the list the agent loop
#: trusts); `save_user_preference` writes a preference and is not in it.
#: `destructiveHint` is False for everything offered here by construction
#: (the spec's default is True, which would make a client ask before a
#: harmless note edit).
_ALSO_WRITES = frozenset({"save_user_preference"})


def _is_read_only(spec: tools.ToolSpec) -> bool:
    return spec.name not in tools.WRITE_TOOLS and spec.name not in _ALSO_WRITES


def _annotations(spec: tools.ToolSpec) -> dict:
    return {
        "readOnlyHint": _is_read_only(spec),
        "destructiveHint": bool(spec.destructive),
        "openWorldHint": spec.name in ("web_search", "read_url"),
    }


def _tool_list_payload() -> list[dict]:
    return [
        {
            "name": spec.name,
            "description": spec.description,
            "inputSchema": spec.parameters,
            "annotations": _annotations(spec),
        }
        for spec in offered_tools()
    ]


_ICON_PREFIX = re.compile(r"^ph:[\w-]+\s*")


def _clean_label(result):  # noqa: ANN001  # whatever the tool returned
    """The app's `label` leads with an icon token (`ph:folders Listed your
    categories`) for its own UI; an outside client reads that as text."""
    if isinstance(result, dict) and isinstance(result.get("label"), str):
        result = {**result, "label": _ICON_PREFIX.sub("", result["label"])}
    return result


#: Who is on the other end, from `initialize`'s `clientInfo.name` (H4): every
#: write a tool call makes is filed under it in the event log, so the activity
#: panel says "Claude Desktop" rather than "Atlas" for a change Atlas never made.
_client = {"name": ""}


def _call_tool(name: str, arguments: dict) -> dict:
    """Runs one tool call against a fresh session, in MCP's own result
    shape (a `content` list plus `isError`, not this app's own
    `{"error": ...}` convention `execute_tool` returns internally)."""
    if name not in {spec.name for spec in offered_tools()}:
        return {
            "content": [{"type": "text", "text": f"Unknown or unavailable tool '{name}'"}],
            "isError": True,
        }
    session = deps.get_db().session()
    try:
        result = tools.execute_tool(
            session, name, arguments or {}, agent=_client["name"] or "mcp client"
        )
    finally:
        session.close()
    result = _clean_label(result)
    is_error = isinstance(result, dict) and "error" in result
    return {"content": [{"type": "text", "text": json.dumps(result)}], "isError": is_error}


def handle_request(message: dict) -> dict | None:
    """One JSON-RPC message in, one response out, or `None` for a
    notification, which gets no reply at all (a bare `id`-less message, per
    JSON-RPC 2.0). Kept pure, no stdio touched here, so the protocol
    logic is directly testable without a real subprocess or a live client.
    """
    method = message.get("method")
    msg_id = message.get("id")
    is_notification = "id" not in message

    if method == "initialize":
        info = (message.get("params") or {}).get("clientInfo") or {}
        _client["name"] = str(info.get("name") or "") if isinstance(info, dict) else ""
        asked = (message.get("params") or {}).get("protocolVersion")
        if asked in SUPPORTED_PROTOCOLS:
            version = asked
        elif asked:
            version = SUPPORTED_PROTOCOLS[0]
        else:
            version = PROTOCOL_VERSION
        result = {
            "protocolVersion": version,
            "capabilities": {"tools": {}},
            "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
        }
    elif method in ("notifications/initialized", "notifications/cancelled"):
        return None
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": _tool_list_payload()}
    elif method == "tools/call":
        params = message.get("params") or {}
        result = _call_tool(params.get("name", ""), params.get("arguments") or {})
    else:
        if is_notification:
            return None
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {"code": -32601, "message": f"Unknown method '{method}'"},
        }

    if is_notification:
        return None
    return {"jsonrpc": "2.0", "id": msg_id, "result": result}


def serve(stdin: TextIO = sys.stdin, stdout: TextIO = sys.stdout) -> None:
    """The stdio loop: one JSON-RPC message per line in, one per line out, 
    MCP's stdio transport, no `Content-Length` framing. A line that isn't
    valid JSON is dropped rather than crashing the server; a client sending
    garbage shouldn't take down an otherwise-working session.
    """
    deps.init_app_state()
    for line in stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except json.JSONDecodeError:
            continue
        response = handle_request(message)
        if response is not None:
            stdout.write(json.dumps(response) + "\n")
            stdout.flush()


if __name__ == "__main__":
    serve()
