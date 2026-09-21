"""What the app does when the disk it writes to fills up.

Measured before any of this was written (INBOX 266, item 6), on an 80 MB
tmpfs mounted as the data dir and filled to 100% with a ballast file, driving
the real server on port 8796 rather than a fake: `POST /entries` answered 507
with a usable sentence (already built), `GET /entries` and `GET /search`
answered 200 throughout, and three things were wrong:

* `POST /auth/unlock` answered 507, so the notebook could not be opened at
  all, over an audit row.
* `POST /entries/{id}/files` left a zero-byte orphan in `uploads/`.
* `POST /backups` left a zero-byte file in the backups folder *named like a
  backup*, which lists as one, passes `PRAGMA integrity_check`, and would
  have replaced the notebook with nothing if restored. That test lives in
  `test_backups_api.py` next to the rest of the backup contract.

`ENOSPC` is injected here rather than mounting a filesystem, because the
suite has to pass on any machine; the tmpfs run is what said which failures
were worth writing tests for in the first place.
"""

from __future__ import annotations

import errno

import pytest

from memorymap.core import deps, diskspace


def _no_space(*_args, **_kwargs):
    raise OSError(errno.ENOSPC, "No space left on device")


def test_reading_the_notebook_keeps_working_when_the_disk_is_full(client):
    """The measured behaviour, pinned so it stays true.

    Reading needs no space, and it is the one reassurance worth making a
    promise of: the notes are there, the app can still show them, and
    "export everything somewhere else" is still available as a way out.
    """
    client.post("/entries", json={"content": "written while there was room"})
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(diskspace, "free_bytes", lambda _path: 0)
        assert client.get("/entries").status_code == 200
        assert client.get("/search", params={"q": "room"}).status_code == 200


def test_unlocking_survives_a_full_disk(client, monkeypatch):
    """A full disk must not lock you out of your own notebook.

    This is the failure the tmpfs run turned up that nobody had guessed:
    `POST /auth/unlock` answered 507 because of the audit row written beside
    it, while every read endpoint behind the lock was working perfectly.
    """
    from memorymap.api import routes_auth

    client.post("/auth/setup", json={"password": "a-real-password"})
    #: Patched where `unlock` looks it up, not where it is defined: the
    #: route imported the name at module load, so patching `manager` would
    #: patch a different reference and the test would pass on nothing.
    monkeypatch.setattr(routes_auth, "log_action", _no_space)
    response = client.post("/auth/unlock", json={"password": "a-real-password"})

    assert response.status_code == 200, response.text
    assert response.json()["token"]


def test_a_write_too_big_for_the_disk_is_refused_before_it_starts(client):
    """The pre-write guard, in the shape that matters: the disk stays as
    full as it was rather than being filled to the last byte by a write that
    was always going to fail. One middleware, so a route added next month
    gets it without anyone remembering to ask."""
    big = "x" * (diskspace.WRITE_HEADROOM_BYTES // 2)
    with pytest.MonkeyPatch.context() as patch:
        #: Enough free for the body, not enough for the body plus the
        #: headroom SQLite needs around the transaction.
        patch.setattr(diskspace, "free_bytes", lambda _path: len(big) + 1024)
        response = client.post("/entries", json={"content": big})

    assert response.status_code == 507, response.text
    body = response.json()
    assert body["code"] == "out_of_space"
    #: The sentence has to be actionable, which is what the owner asked for:
    #: which folder, how much is free, roughly how much to free up.
    assert str(deps.get_config().data_dir) in body["hint"]
    assert "free" in body["hint"].lower()


def test_a_small_write_is_never_refused_by_arithmetic(client):
    """The other half of the same rule. An app that will not take a two-line
    note on a machine with room for it is worse than one that tries and
    fails honestly, so bodies under 64 KB are not weighed at all."""
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(diskspace, "free_bytes", lambda _path: 1024)
        response = client.post("/entries", json={"content": "two lines"})
    assert response.status_code == 201, response.text


def test_storage_reports_the_room_that_is_left(client):
    """`data_dir_writable` alone stayed `true` on a disk measured at 100%
    full, so on its own it is a reassurance the app cannot keep."""
    storage = client.get("/storage").json()
    assert storage["free_bytes"] is None or storage["free_bytes"] >= 0
    assert storage["disk_total_bytes"] > 0
    assert storage["low_space_bytes"] == diskspace.LOW_SPACE_BYTES


def test_a_failed_upload_leaves_no_orphan_behind(client, tmp_path):
    """Measured: a 507 upload left a zero-byte file in `uploads/` that no
    row pointed at and nothing would ever clean up. On a nearly-full disk
    that orphan is as large as whatever fitted before the failure."""
    entry = client.post("/entries", json={"content": "has a file"}).json()
    uploads = deps.get_config().uploads_dir
    before = {p.name for p in uploads.iterdir()}

    real_open = type(uploads).open

    def _open_that_runs_out(self, *args, **kwargs):
        handle = real_open(self, *args, **kwargs)
        if "w" in str(args[0] if args else kwargs.get("mode", "")):
            handle.close()
            raise OSError(errno.ENOSPC, "No space left on device", str(self))
        return handle

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(type(uploads), "open", _open_that_runs_out)
        response = client.post(
            f"/entries/{entry['id']}/files",
            files={"file": ("note.txt", b"hello", "text/plain")},
        )

    assert response.status_code == 507, response.text
    assert {p.name for p in uploads.iterdir()} == before


def test_out_of_space_is_recognised_however_it_was_raised():
    """One definition, shared by the guard and the handler, because a second
    copy of a two-shape match is exactly the thing that drifts."""
    import sqlite3

    from sqlalchemy.exc import OperationalError

    assert diskspace.out_of_space(OSError(errno.ENOSPC, "No space left on device"))
    assert diskspace.out_of_space(
        OperationalError("INSERT ...", {}, sqlite3.OperationalError("database or disk is full"))
    )
    #: Narrow on purpose: a 507 for every OSError would be worse than the
    #: 500 this replaced.
    assert not diskspace.out_of_space(OSError(errno.EACCES, "Permission denied"))
    assert not diskspace.out_of_space(None)


def test_partial_write_removes_what_a_failure_left_and_keeps_what_worked(tmp_path):
    target = tmp_path / "export.md"
    #: The assertion is after the `with`, not inside it. CodeQL read the
    #: earlier shape as unreachable code (#421) and it was right about the
    #: letter of it: the `raise` is the last statement of the inner block, so
    #: anything after it in that block never runs. Written this way the
    #: intent is also plainer, which is that the *context manager* cleans up,
    #: not the body.
    def fills_the_disk() -> None:
        with diskspace.partial_write(target):
            target.write_bytes(b"half of a fi")
            raise OSError(errno.ENOSPC, "No space left on device")

    with pytest.raises(OSError):
        fills_the_disk()
    assert not target.exists()

    with diskspace.partial_write(target):
        target.write_bytes(b"all of it")
    assert target.read_bytes() == b"all of it"
