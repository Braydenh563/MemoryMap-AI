"""PLAN.md §3 B3: every failure this app returns is JSON with a
machine-readable `code`, and an unhandled exception never leaks a traceback.

Two things are deliberately NOT retested here, because they already are
elsewhere and re-asserting them would only pin the same fact twice: that
`RequestValidationError` (422 from a malformed request body) keeps its own,
separate FastAPI-default shape: `_register_error_handlers` only replaces the
`HTTPException` and catch-all `Exception` handlers, never that one, and that
every existing route's `detail` string is unchanged (every other test file in
this suite that asserts `response.json()["detail"] == "..."` is that check,
run ~a couple thousand times over).
"""

from __future__ import annotations

from fastapi.testclient import TestClient

import memorymap.api.app as app_module


def _app_without_frontend_mount(tmp_path, monkeypatch):
    """`app_module.create_app()` mounts the frontend at `"/"` last, and Starlette's
    `Mount` matches by prefix: so it would swallow every request to a route
    added *after* `app_module.create_app()` returns, including the test-only ones below,
    before routing ever reaches them (reproduced while writing this: the
    test route came back 404 from the static handler, not from FastAPI's
    router). Pointing `FRONTEND_DIR` at a directory that doesn't exist makes
    `app_module.create_app()`'s own `if FRONTEND_DIR.is_dir()` guard skip the mount
    entirely, which is simpler and less brittle than reordering `app.routes`
    by hand after the fact.
    """
    monkeypatch.setattr(app_module, "FRONTEND_DIR", tmp_path / "no-frontend-here")
    return app_module.create_app()


def test_a_404_route_returns_the_error_contract_shape(client):
    # GET /entries/{id}/filing 404s through `_existing_entry` →
    # `deps.get_or_404`, one of the ~200 plain-string-detail HTTPException
    # sites this item deliberately does not rewrite.
    response = client.get("/entries/999999/filing")
    assert response.status_code == 404
    body = response.json()
    # `detail` is untouched: this is the assertion every pre-existing test
    # in this suite already makes, spelled out once here as the contract's
    # own promise rather than an incidental side effect.
    assert body["detail"] == "Entry not found"
    assert body["code"] == "not_found"
    assert body["hint"] is None


def test_an_unhandled_exception_becomes_json_500_with_a_ref(app_state, tmp_path, monkeypatch):
    """A route that raises something nobody caught, the shape the §40 audit
    found (the space-delete `IntegrityError`) that used to fall through to
    Starlette's bare `text/plain` "Internal Server Error".

    Added directly to this test's own app instance via `add_api_route`
    rather than relying on an existing bug, per this item's own brief: no
    route in the real app is deliberately broken to make this test pass.

    `raise_server_exceptions=False` matters here specifically: `TestClient`'s
    default re-raises anything that reaches it uncaught, which is the right
    default for *tests of routes this app didn't mean to fail*, but this test
    is deliberately exercising the "nothing caught it" path itself, so it has
    to let the response come back rather than have the test runner re-raise
    the exception it exists to observe.
    """

    def _boom() -> None:
        raise RuntimeError("deliberately unhandled, for the test only")

    app = _app_without_frontend_mount(tmp_path, monkeypatch)
    app.add_api_route("/__test_boom__", _boom, methods=["GET"])
    test_client = TestClient(app, raise_server_exceptions=False)

    response = test_client.get("/__test_boom__")

    assert response.status_code == 500
    body = response.json()
    assert body["detail"] == "Internal error"
    assert body["code"] == "internal"
    # A real, unique reference, not echoed traceback text, and nothing of
    # the actual exception (message, file paths, line numbers) anywhere in
    # the body. This is the leak the docstring above calls out by name.
    assert "ref" in body and len(body["ref"]) == 32
    assert "RuntimeError" not in response.text
    assert "deliberately unhandled" not in response.text
    assert "Traceback" not in response.text


def test_a_dict_detail_lets_a_route_set_its_own_code_and_hint(app_state, tmp_path, monkeypatch):
    """No route does this yet (grep for `detail={` in `src/` returns nothing)
    - this is the "doesn't break the day one does" half of the contract."""

    def _rich_error() -> None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=409,
            detail={"detail": "That name is taken", "code": "name_conflict", "hint": "Try another"},
        )

    app = _app_without_frontend_mount(tmp_path, monkeypatch)
    app.add_api_route("/__test_rich_error__", _rich_error, methods=["GET"])
    test_client = TestClient(app, raise_server_exceptions=False)

    response = test_client.get("/__test_rich_error__")

    assert response.status_code == 409
    body = response.json()
    assert body["detail"] == "That name is taken"
    assert body["code"] == "name_conflict"
    assert body["hint"] == "Try another"


def test_a_full_disk_says_so_instead_of_internal_error(app_state, tmp_path, monkeypatch):
    """The one failure the person can fix themselves, so it tells them.

    Measured before this existed: with the store unable to take another page,
    `POST /entries` raised `sqlite3.OperationalError: database or disk is
    full` out of the route and the catch-all above turned it into
    `{"detail": "Internal error"}` with a reference number. For a notebook
    whose whole promise is that your writing is safe on your own machine,
    that is the worst available answer to pressing save: the text is still in
    the editor, nothing says why it would not save, and nothing says what to
    do. Reading kept working, which is the part worth telling them.

    Both shapes, because both mean the same thing to a person: SQLite answers
    `SQLITE_FULL` as an `OperationalError` reading "database or disk is
    full", while an upload, an export or a log write answers `OSError` with
    `ENOSPC`.
    """
    import errno
    import sqlite3

    from sqlalchemy.exc import OperationalError

    def _sqlite_full() -> None:
        raise OperationalError(
            "INSERT INTO entries ...",
            {},
            sqlite3.OperationalError("database or disk is full"),
        )

    def _no_space() -> None:
        raise OSError(errno.ENOSPC, "No space left on device", "/notes/upload.png")

    #: Something that is an OSError but is *not* about space, so the narrow
    #: matching is checked rather than assumed: a handler that answered 507
    #: for every OSError would be worse than the 500 it replaced.
    def _other_os_error() -> None:
        raise OSError(errno.EACCES, "Permission denied", "/notes/locked")

    app = _app_without_frontend_mount(tmp_path, monkeypatch)
    app.add_api_route("/__test_sqlite_full__", _sqlite_full, methods=["GET"])
    app.add_api_route("/__test_no_space__", _no_space, methods=["GET"])
    app.add_api_route("/__test_other_os_error__", _other_os_error, methods=["GET"])
    test_client = TestClient(app, raise_server_exceptions=False)

    for path in ("/__test_sqlite_full__", "/__test_no_space__"):
        response = test_client.get(path)
        assert response.status_code == 507, f"{path} answered {response.status_code}"
        body = response.json()
        assert body["code"] == "out_of_space"
        assert "disk space" in body["detail"]
        #: The sentence has to carry the reassurance as well as the fault:
        #: "it broke" and "it broke and your notes are fine" are different
        #: messages to someone who has just failed to save something.
        assert "lost" in body["hint"]
        #: And no driver text: the person is told what happened, not what
        #: SQLAlchemy called it.
        assert "OperationalError" not in response.text
        assert "INSERT INTO" not in response.text

    other = test_client.get("/__test_other_os_error__")
    assert other.status_code == 500, "only running out of space is out of space"
    assert other.json()["code"] == "internal"
