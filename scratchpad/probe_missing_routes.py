"""Which paths does the frontend call that the server does not serve?

    PYTHONPATH=src .venv/bin/python scratchpad/probe_missing_routes.py

The mirror of `probe_dead_routes.py`, and the half that finds the worse
defect. A route with no caller is dead weight; a *call* with no route is a
404 waiting for whoever opens that screen, and nothing in this repository
looks for it: the suite does not open a browser, and the browser only finds
it when a person clicks the thing.

**Both halves matter and they fail differently.** The dead-route scan found
`GET /learned`'s whole lifecycle built and unreachable, months after it
shipped with tests. This one asks whether `apiJson("/thing")` in the
frontend resolves to anything at all.

**A probe, not a lint**, for the same reason its twin is one: a path built
from pieces (`/entries/${id}/${what}`) cannot be resolved without running
the code, so this reports what it cannot decide rather than guessing, and a
lint over that would need an allowance list. Read the output.

How a call is matched against a route:

* Every string literal the frontend passes to `api`, `apiJson` or `fetch`
  that starts with `/` is a candidate, with its query string dropped.
* A template hole (`${...}`) matches one path segment, which is what a path
  parameter is, so `/entries/${id}/related` meets `/entries/{id}/related`.
* A candidate holding a hole in the *middle of* a segment
  (`/boards/${a}-${b}`) is reported as undecidable rather than matched.

First run, 2026-09-20: **320 routes served, 297 distinct paths called, 0
calls with no route.** Two undecidable, both resolved by reading them:
`/media/${item.id}${endpoint}` is `/media/{upload_id}/caption` or `/ocr`,
and `/websearch/detect-searxng${query}` is that route with a query string.
The frontend and the backend agree completely, which is worth having as a
number rather than as a hope.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from memorymap.api.app import create_app  # noqa: E402
from probe_dead_routes import routes  # noqa: E402

#: `api(...)`, `apiJson(...)` and `fetch(...)` with a literal or a template
#: literal first argument. The body is captured whole; the hole-handling
#: below decides what it can mean.
CALL = re.compile(
    r"""\b(?:api|apiJson|fetch)\(\s*(['"`])(/[^'"`\n]*)\1""",
    re.VERBOSE,
)

#: A path the server serves, as a regex: `{name}` is one segment.
def _route_pattern(path: str) -> re.Pattern[str]:
    parts = [
        r"[^/]+" if part.startswith("{") and part.endswith("}") else re.escape(part)
        for part in path.split("/")
    ]
    return re.compile("^" + "/".join(parts) + "$")


def _candidate_pattern(call: str) -> re.Pattern[str] | None:
    """The frontend's own path as a regex, or None when it cannot be decided.

    A hole that is a whole segment is a path parameter and matches one. A
    hole with text beside it inside one segment could be anything.
    """
    out = []
    for part in call.split("/"):
        holes = part.count("${")
        if not holes:
            out.append(re.escape(part))
        elif re.fullmatch(r"\$\{[^{}]*\}", part):
            out.append(r"[^/]+")
        else:
            return None
    return re.compile("^" + "/".join(out) + "$")


def main() -> int:
    app = create_app()
    served = [(path, _route_pattern(path)) for path, _ in routes(app)]
    calls: dict[str, list[str]] = {}
    for file in sorted((ROOT / "frontend").glob("*.js")):
        for match in CALL.finditer(file.read_text(encoding="utf-8")):
            path = match.group(2).split("?")[0].rstrip("/") or "/"
            calls.setdefault(path, []).append(file.name)

    missing, undecidable = [], []
    for path, files in sorted(calls.items()):
        pattern = _candidate_pattern(path)
        if pattern is None:
            undecidable.append((path, files))
            continue
        #: Either direction: the call may be the concrete one
        #: (`/entries/12/related` against `/entries/{id}/related`) or the
        #: templated one against a literal route.
        if any(pattern.match(route) or served_pattern.match(path)
               for route, served_pattern in served):
            continue
        missing.append((path, files))

    print(f"{len(served)} routes served, {len(calls)} distinct paths called\n")
    if missing:
        print(f"{len(missing)} call(s) with no route:")
        for path, files in missing:
            print(f"  {path}    ({', '.join(sorted(set(files)))})")
    else:
        print("0 calls with no route.")
    if undecidable:
        print(f"\n{len(undecidable)} path(s) this cannot decide (a hole inside a segment):")
        for path, files in undecidable:
            print(f"  {path}    ({', '.join(sorted(set(files)))})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
