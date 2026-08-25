"""Alembic adoption: stamped, never migrated into, on a database whose
schema already matches (create_all() built it). See `_ensure_alembic_baseline`
in `core/database.py` for the full reasoning.

Calls `_ensure_alembic_baseline` directly rather than relying on
`DatabaseManager.__init__` to trigger it — that call is skipped under
pytest (`PYTEST_CURRENT_TEST`) for suite speed, so exercising it here is the
only coverage this mechanism gets.
"""

import logging
import sqlite3

from memorymap.core.database import Base, DatabaseManager, _ensure_alembic_baseline


def _alembic_version(db_path):
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute("SELECT version_num FROM alembic_version").fetchall()
    finally:
        conn.close()
    return [r[0] for r in rows]


def test_fresh_database_gets_stamped(tmp_path):
    db_path = tmp_path / "fresh.db"
    db = DatabaseManager(db_path)  # create_all() + auto-migrator, no alembic (pytest)
    _ensure_alembic_baseline(db_path)

    versions = _alembic_version(db_path)
    assert len(versions) == 1
    assert versions[0]  # a real revision id, not empty

    # Stamping must never touch application data or tables — only add its
    # own bookkeeping table.
    with db.engine.connect() as connection:
        table_names = {
            row[0]
            for row in connection.exec_driver_sql(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
    for table in Base.metadata.tables:
        assert table in table_names


def test_stamped_database_is_idempotent(tmp_path):
    db_path = tmp_path / "idempotent.db"
    DatabaseManager(db_path)
    _ensure_alembic_baseline(db_path)
    first = _alembic_version(db_path)

    # A second call on an already-stamped database takes the "upgrade" path
    # (see the function's own docstring) — must be a no-op, not a re-stamp
    # or an error, since nothing newer than the baseline exists yet.
    _ensure_alembic_baseline(db_path)
    second = _alembic_version(db_path)
    assert first == second


def test_preexisting_database_without_alembic_version_gets_stamped(tmp_path):
    """The exact adoption scenario this exists for: a database created by a
    version of the app from before Alembic existed at all — schema already
    correct via create_all()/the additive auto-migrator, no alembic_version
    table. Must stamp cleanly, not attempt to run the baseline migration's
    CREATE TABLE statements against tables that already exist."""
    db_path = tmp_path / "preexisting.db"
    DatabaseManager(db_path)  # simulates "an older version already built this"

    with sqlite3.connect(str(db_path)) as conn:
        names = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
    assert "alembic_version" not in names

    _ensure_alembic_baseline(db_path)

    versions = _alembic_version(db_path)
    assert len(versions) == 1


def test_ensure_alembic_baseline_never_raises_on_bad_path(tmp_path):
    """Never allowed to stop the app from starting — the function's own
    contract. A path whose parent doesn't exist is about as broken an input
    as this could plausibly see; it must swallow the failure, not raise."""
    bad_path = tmp_path / "does" / "not" / "exist" / "db.sqlite"
    _ensure_alembic_baseline(bad_path)  # must not raise


def test_ensure_alembic_baseline_does_not_evict_the_app_s_own_log_handler(tmp_path):
    """Reported directly: the Settings -> Logs viewer showed nothing but
    Alembic's own plugin-registration lines, forever, after startup.

    migrations/env.py calls logging.config.fileConfig() every time this
    runs command.stamp/upgrade, and that unconditionally replaces the
    handler list of every logger alembic.ini explicitly configures (root
    among them) with exactly what the ini says — alembic.ini's own
    [logger_root] sets handlers = console, which silently tore
    logbuffer.install()'s handler off the root logger and left Alembic's
    plain console handler as the only one there for the rest of the
    process's life. `disable_existing_loggers=False` (already set in
    env.py) does not protect against this — it only stops loggers *not*
    listed in alembic.ini from being disabled, not the handlers of ones
    that are. Simulates logbuffer.install() with a marker handler on root,
    the same shape a real BufferHandler is attached in, and confirms it
    survives both the stamp path (fresh db) and the upgrade path (already
    stamped)."""
    db_path = tmp_path / "logging.db"
    DatabaseManager(db_path)

    marker = logging.Handler()
    root = logging.getLogger()
    root.addHandler(marker)
    try:
        _ensure_alembic_baseline(db_path)  # stamp path
        assert marker in root.handlers

        _ensure_alembic_baseline(db_path)  # upgrade path (already stamped)
        assert marker in root.handlers
    finally:
        root.removeHandler(marker)
