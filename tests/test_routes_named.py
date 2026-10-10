"""Every route has a test naming its path (WORLD_CLASS_PLAN 26.2, decision 59): a ratchet.

The route table is read from the real app (so `include_router` prefixes are
counted, which a regex over the route files misses). A route is named when
some string literal in `tests/` has the same segments: a `{param}` segment in
the route matches anything, and a hole (`{eid}`, `%s`) in the test's literal
matches only a route's own `{param}` segment, so `/entries/{eid}` does not
name `/entries/export`. A literal ending in `/` is a prefix with one
segment to come (`"/documents/" + id`). Methods are not compared: the rule
is the path, which is what the decision says.

The seed is the 49 routes found on 2026-10-10 (the census counted 54 with a
looser match). A route not in it and not named fails; a seeded route that a
test now names fails too, so the list only shrinks. Add a test that calls the
path, or delete the route, then delete its line.
"""

from __future__ import annotations

import re
from pathlib import Path

TESTS = Path(__file__).resolve().parent

SEED = frozenset(
    """
DELETE /board-library/libraries/{library_id}
DELETE /documents/{document_id}/bookmarks/{bookmark_id}
DELETE /documents/{document_id}/notes/{entry_id}
DELETE /documents/{document_id}/purge
DELETE /entries/{entry_id}/bookmarks/{bookmark_id}
DELETE /reminders/{reminder_id}/purge
GET /documents/{document_id}/connections
GET /documents/{document_id}/export.md
GET /documents/{document_id}/revisions/{revision_id}
GET /questions/summary
POST /board-library/libraries
POST /board-library/{item_id}/duplicate
POST /board-library/{item_id}/restore
POST /categories/{category_id}/merge
POST /categories/{category_id}/split
POST /conversations/{conversation_id}/retitle
POST /documents/{document_id}/ai-check
POST /documents/{document_id}/ai-edit
POST /documents/{document_id}/ai-edit-log/{entry_id}/revert
POST /documents/{document_id}/notes
POST /documents/{document_id}/restore
POST /documents/{document_id}/revisions/{revision_id}/restore
POST /entries/{entry_id}/filing/stop
POST /entries/{entry_id}/history/{revision_id}/restore
POST /entries/{entry_id}/links/{link_id}/generate-reason
POST /entries/{entry_id}/meeting/append
POST /entries/{entry_id}/meeting/remind
POST /entries/{entry_id}/meeting/summarise
POST /entries/{entry_id}/mentions/link
POST /learned/{fact_id}/reset
POST /media/{upload_id}/ocr-range-read
POST /models/bench/stop
POST /reminders/{reminder_id}/restore
POST /review-queue/{entry_id}/accept
POST /tidy/link-reasons/run
POST /tidy/link-reasons/stop
POST /whiteboard/boards/{board_id}/nodes/clear-style
POST /whiteboard/boards/{board_id}/nodes/outline
POST /whiteboard/boards/{board_id}/place
PUT /board-library/libraries/{library_id}
PUT /conversations/{conversation_id}/archive
PUT /conversations/{conversation_id}/pin
PUT /conversations/{conversation_id}/turns/{index}/answer
PUT /conversations/{conversation_id}/turns/{index}/followups
PUT /conversations/{conversation_id}/unarchive
PUT /documents/{document_id}/archive
PUT /documents/{document_id}/unarchive
PUT /entries/{entry_id}/links/{link_id}/reason
PUT /whiteboard/boards/{board_id}/nodes/{node_id}/move
""".strip().splitlines()
)

_LITERAL = re.compile(r"""["'`](/[A-Za-z0-9_\-./{}$%:+]*)""")


def route_table(app) -> set[tuple[str, str]]:  # noqa: ANN001
    """(method, path) for every route; FastAPI keeps included routers as nodes."""
    out: set[tuple[str, str]] = set()

    def walk(routes, prefix: str) -> None:  # noqa: ANN001
        for r in routes:
            if hasattr(r, "original_router"):
                walk(r.original_router.routes, prefix + (r.include_context.prefix or ""))
            elif hasattr(r, "methods") and hasattr(r, "endpoint"):
                for m in r.methods - {"HEAD", "OPTIONS"}:
                    out.add((m, prefix + r.path))
            elif hasattr(r, "routes") and hasattr(r, "app"):
                walk(r.routes, prefix + r.path)

    walk(app.routes, "")
    return out


def _test_literals() -> list[tuple[list[str], bool]]:
    text = ""
    for p in sorted(TESTS.rglob("*.py")):
        if p.name != Path(__file__).name:  # this file's seed would name every route in it
            text += p.read_text(encoding="utf-8", errors="ignore") + "\n"
    lits = []
    for lit in set(_LITERAL.findall(text)):
        path = lit.split("?")[0]
        lits.append(([s for s in path.split("/") if s], path.endswith("/")))
    return lits


def untested_routes(app) -> set[str]:  # noqa: ANN001
    lits = _test_literals()
    missing = set()
    for method, path in route_table(app):
        segs = [s for s in path.split("/") if s]
        named = False
        for parts, prefix in lits:
            if not parts and not segs:
                named = True
            elif prefix and len(segs) == len(parts) + 1:
                named = all(a == b or b.startswith("{") for a, b in zip(parts, segs))
            elif not prefix and len(segs) == len(parts):
                named = all(a == b or b.startswith("{") for a, b in zip(parts, segs))
            if named:
                break
        if not named:
            missing.add(f"{method} {path}")
    return missing


def _app(tmp_path, monkeypatch):  # noqa: ANN001
    monkeypatch.setenv("MEMORYMAP_DATA_DIR", str(tmp_path / "data"))
    from memorymap.api.app import create_app

    return create_app()


def test_no_new_unnamed_route(tmp_path, monkeypatch) -> None:  # noqa: ANN001
    new = untested_routes(_app(tmp_path, monkeypatch)) - SEED
    assert not new, "a route no test names; add a test that calls its path, or remove it:\n  " + "\n  ".join(sorted(new))


def test_the_seed_only_shrinks(tmp_path, monkeypatch) -> None:  # noqa: ANN001
    stale = SEED - untested_routes(_app(tmp_path, monkeypatch))
    assert not stale, "now named by a test, so delete it from SEED:\n  " + "\n  ".join(sorted(stale))
