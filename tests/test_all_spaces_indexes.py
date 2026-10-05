""""All spaces" lists are served by indexes too (audit 2026-10-05, ARCH-05).

`activeSpaceId()` defaults to "all", and with "all" the space hook adds no
`workspace_id = ?`, while every composite index for the list queries led
with `workspace_id`. EXPLAIN on the real statements: `/entries?limit=50`
under "all" was `SCAN ... USE TEMP B-TREE FOR ORDER BY` (the whole notebook
sorted, `content` and all, 26 times per unlock at 5,000 notes), against an
index search with one space selected. The perf pass of 2026-10-03 measured
with a space selected, which is why it missed this.

These capture the statements each list route actually runs, under both
headers, and ask SQLite for their plans: no list may sort its table.
"""

from __future__ import annotations

import pytest
from sqlalchemy import event, text

from memorymap.core import deps

#: Route, and the table whose rows it lists.
LISTS = [
    ("/entries?limit=50", "entries"),
    ("/entries?deleted=true", "entries"),
    ("/entries?archived=true", "entries"),
    ("/documents", "documents"),
    ("/reminders", "reminders"),
    ("/conversations", "conversations"),
    ("/media", "media_uploads"),
]


def _statements(client, path: str, workspace: str) -> list[tuple[str, object]]:
    engine = deps.get_db().engine
    seen: list[tuple[str, object]] = []

    def capture(_conn, _cursor, statement, parameters, _context, _many):  # noqa: ANN001
        if statement.lstrip().upper().startswith("SELECT"):
            seen.append((statement, parameters))

    event.listen(engine, "before_cursor_execute", capture)
    try:
        reply = client.get(path, headers={"X-Workspace-ID": workspace})
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert reply.status_code == 200, (path, reply.text)
    return seen


def _sorts(statement: str, parameters) -> bool:  # noqa: ANN001
    with deps.get_db().engine.connect() as connection:
        plan = connection.exec_driver_sql("EXPLAIN QUERY PLAN " + statement, parameters).fetchall()
    return any("TEMP B-TREE FOR ORDER BY" in str(row[-1]) for row in plan)


@pytest.mark.parametrize("workspace", ["all", "default"])
@pytest.mark.parametrize(("path", "table"), LISTS)
def test_a_list_is_not_a_sort_of_its_table(client, path, table, workspace):
    client.post("/entries", json={"content": "one note so the lists have a row"})
    listing = [
        (statement, parameters)
        for statement, parameters in _statements(client, path, workspace)
        if f"FROM {table}" in statement and "ORDER BY" in statement and "count(" not in statement.lower()
    ]
    assert listing, f"{path} ran no ordered read of {table}; the test is looking at the wrong thing"
    for statement, parameters in listing:
        assert not _sorts(statement, parameters), f"{path} under {workspace!r} sorts {table}:\n{statement}"


def test_the_audit_log_reads_by_action_and_by_date_are_indexed(client):
    with deps.get_db().engine.connect() as connection:
        for sql in (
            "SELECT id FROM audit_log WHERE action = 'correction' ORDER BY id DESC LIMIT 50",
            "SELECT id FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 200",
        ):
            plan = " ".join(str(row[-1]) for row in connection.execute(text("EXPLAIN QUERY PLAN " + sql)))
            # A walk along an index ("SCAN ... USING COVERING INDEX") is the
            # point; a bare "SCAN audit_log" is the table read row by row.
            assert "TEMP B-TREE" not in plan and "INDEX ix_audit_log_" in plan, plan
