"""`/api/v1`: the notebook as a versioned local service (WORLD_CLASS_PLAN H4, B7).

**One contract, two spellings.** Every API route the app serves at `/x` is
also served at `/api/v1/x`, by the same handler behind the same unlock, the
same Host and Origin checks and the same space guard. Nothing is duplicated:
this middleware takes the prefix off before anything else sees the request,
so there is exactly one router, one schema (`/api/v1/openapi.json` is the
app's own, behind the unlock) and one set of tests. The page keeps calling
the bare paths; an outside client (a coding agent, a script, a desktop
assistant) calls `/api/v1/...`, and the day a route has to change shape
incompatibly, the old shape stays under `v1` and the new one goes under `v2`
here, without the page and the outside client having to move together.

What `/api/v1` does not serve is the page: a path under it that reaches the
static mount (the frontend's files) is a 404, so the prefix means "the API"
and nothing else. Every response under it carries `API-Version: 1`.

**The agent named** (H4): a request carrying `X-MemoryMap-Agent: <name>`, on
either spelling, has every change it makes filed under that name in the
event log (`events.as_agent`), so an outside write shows in the activity
panel as the agent's, not as the person's and not as Atlas's.
"""

from __future__ import annotations

from memorymap.core import events

PREFIX = "/api/v1"
VERSION = "1"
#: Set on the request scope for a request that came in under the prefix, so
#: the static mount can refuse it (`RevalidatedStatic`).
SCOPE_FLAG = "memorymap.api_v1"
AGENT_HEADER = b"x-memorymap-agent"


class ApiVersionMiddleware:
    """Pure ASGI, outermost: strips `/api/v1`, names the agent."""

    def __init__(self, app) -> None:  # noqa: ANN001  # an ASGI app
        self.app = app

    async def __call__(self, scope, receive, send) -> None:  # noqa: ANN001
        if scope.get("type") not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return
        agent = ""
        for key, value in scope.get("headers") or []:
            if key == AGENT_HEADER:
                agent = value.decode("latin-1")
                break
        path = scope.get("path") or ""
        versioned = path == PREFIX or path.startswith(PREFIX + "/")
        if versioned:
            rest = path[len(PREFIX):] or "/"
            scope = {**scope, "path": rest, "raw_path": rest.encode("utf-8"), SCOPE_FLAG: True}
            inner_send = send

            async def send(message) -> None:  # noqa: ANN001
                if message.get("type") == "http.response.start":
                    headers = list(message.get("headers") or [])
                    headers.append((b"api-version", VERSION.encode()))
                    message = {**message, "headers": headers}
                await inner_send(message)

        if agent:
            with events.as_agent(agent):
                await self.app(scope, receive, send)
        else:
            await self.app(scope, receive, send)


def is_versioned(scope) -> bool:  # noqa: ANN001
    return bool(scope.get(SCOPE_FLAG))
