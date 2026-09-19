"""Which routes does the frontend never call?

    PYTHONPATH=src .venv/bin/python scratchpad/probe_dead_routes.py

CLAUDE.md section 6: "A feature that never ran once: grep the call site of
anything new." This asks that question for all 300-odd routes at once,
which is how `GET /learned` and its whole edit/delete/reset lifecycle,
`POST /night/run`, `GET /search/stats` and `POST /drafts/title` were found
unreachable from the app in one pass, months after each shipped with tests.

**A probe, not a lint, and it stays one.** Some routes are meant to have no
frontend caller: `/entries/daily/{day}` exists for the agent's own "add to
today's note" tool and says so, and `/openapi.json` is FastAPI's. A lint
here would need an allowance list, and an allowance list is how a lint stops
meaning anything. Read the output instead, and for each row ask the two
questions that matter: is this reachable another way, and if not, was it
meant to be?

The matching is deliberately generous, so a name that appears anywhere in
the frontend counts as called. It under-reports rather than over-reports:
every row it prints is worth a look, and a route it misses would have needed
the frontend to build its path out of pieces no string in the file contains.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from memorymap.api.app import create_app  # noqa: E402


def routes(app) -> list[tuple[str, tuple[str, ...]]]:  # noqa: ANN001
    """Every (path, methods) the app serves, including the included routers.

    FastAPI wraps an `include_router` in a `_IncludedRouter` whose own `path`
    is None, so a walk of `app.routes` alone finds three routes and reports
    the other three hundred as dead.
    """

    def walk(container, prefix=""):  # noqa: ANN001, ANN202
        for route in getattr(container, "routes", []):
            path = getattr(route, "path", None)
            methods = getattr(route, "methods", None)
            if path and methods:
                yield prefix + path, tuple(sorted(m for m in methods if m != "HEAD"))
            else:
                inner = (
                    getattr(route, "original_router", None)
                    or getattr(route, "router", None)
                    or getattr(route, "app", None)
                )
                if inner is not None and inner is not container:
                    yield from walk(inner, prefix + (getattr(route, "path", "") or ""))

    return list(dict.fromkeys(walk(app)))


#: What a URL path segment can hold, outside a `${…}`.
_PATH_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-./{}")


def _read_path(source: str, at: int) -> str:
    """One path literal, starting after its quote, `${…}` collapsed to `*`.

    Hand-scanned rather than matched, for two reasons a regex got wrong in
    turn. Requiring the literal to end at its own closing quote matched none
    of the templated calls, so `` `/search?q=${encodeURIComponent(x)}` ``
    counted as no call at all and seven live routes were reported dead. And
    stopping at the first character a path cannot hold cuts
    `` `/auth/${mode === "setup" ? "setup" : "unlock"}` `` at the space
    inside its substitution, which is two more. A substitution can hold
    anything, so it is skipped by brace depth and the path resumes after it.
    """
    out: list[str] = []
    i = at
    while i < len(source):
        ch = source[i]
        if ch == "$" and source[i + 1 : i + 2] == "{":
            depth = 1
            i += 2
            while i < len(source) and depth:
                if source[i] == "{":
                    depth += 1
                elif source[i] == "}":
                    depth -= 1
                i += 1
            out.append("*")
            continue
        if ch not in _PATH_CHARS:
            break
        out.append(ch)
        i += 1
    return "".join(out)


def frontend_paths() -> set[str]:
    """Every path-ish literal the frontend mentions, `${…}` as a wildcard."""
    seen: set[str] = set()
    for file in sorted((ROOT / "frontend").glob("*.js")):
        source = file.read_text(encoding="utf-8")
        #: From the quote, not from a slash: the frontend routinely builds a
        #: path as `` `${base}/page-reads` ``, where `base` is
        #: `/files/${id}`, and anchoring on the slash misses every one of
        #: those (six live routes, on the run that found this).
        for match in re.finditer(r"""["'`]""", source):
            call = _read_path(source, match.end()).split("?")[0]
            #: Something that names a route, not a shape. `**`, `*/*` and
            #: `*.*` all fall out of this scan (a CSS selector, a date
            #: format, a filename built from two variables) and each one, as
            #: a pattern, matches every route in the app: with them in, the
            #: probe reported nothing dead at all. A real call carries a
            #: slash and some letters of its own.
            if not call.startswith(("/", "*")):
                continue
            if "/" not in call or len(re.sub(r"[*/]", "", call)) < 3:
                continue
            seen.add(call.rstrip("/") or "/")
    return seen


def called(path: str, seen: set[str]) -> bool:
    """Does any literal in the frontend name this route?

    Two directions, because either side can be the one with the hole in it.
    The route's own `{param}` becomes a wildcard and is matched against the
    literals; and each literal's `*` becomes a wildcard and is matched
    against the route. A `*` from a substitution matches across `/` in the
    second direction, since `${base}` is routinely a whole path prefix.
    """
    pattern = re.sub(r"\{[^}]*\}", "[^/]+", path).rstrip("/") or "/"
    rx = re.compile("^" + pattern.replace("*", "[^/]*") + "$")
    plain = path.replace("{", "").replace("}", "")
    for call in seen:
        if rx.match(call.replace("*", "X")):
            return True
        #: A leading `*` is a `${base}` standing in for a whole prefix, so it
        #: may span `/`; every other `*` is one segment. Letting them all
        #: span turned a literal like `` `${a}/${b}` `` into a pattern that
        #: matched every route in the app and the probe reported nothing at
        #: all, which is the failure mode a generous matcher has.
        body = re.escape(call).replace(r"\*", "[^/]*")
        if call.startswith("*"):
            body = ".*" + body[len("[^/]*"):]
        if re.match("^" + body + "$", plain):
            return True
    return False


def main() -> int:
    app = create_app()
    every = routes(app)
    seen = frontend_paths()
    orphans = [(path, methods) for path, methods in every if not called(path, seen)]
    print(f"{len(every)} routes, {len(orphans)} with no literal match in frontend/*.js\n")
    for path, methods in sorted(orphans):
        print(f"  {','.join(methods):12} {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
