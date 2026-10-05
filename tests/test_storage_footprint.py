"""What the data folder's directories weigh (BACKLOG section 26): `GET /storage`
reports uploads, pictures and backups next to the database, from a cached walk."""

from __future__ import annotations

import os

from memorymap.core import deps, diskspace


def _write(folder, name, size):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_bytes(b"x" * size)


def test_dir_bytes_sums_nested_files_and_ignores_links(tmp_path):
    _write(tmp_path / "a", "one", 100)
    _write(tmp_path / "a" / "deep", "two", 50)
    outside = tmp_path.parent / (tmp_path.name + "-outside")
    _write(outside, "big", 10_000)
    link = tmp_path / "a" / "link"
    try:
        os.symlink(outside, link)
    except (OSError, NotImplementedError):
        link = None  # a filesystem without symlinks: the other checks still hold
    assert diskspace.dir_bytes(tmp_path / "a", ttl=0) == 150
    assert diskspace.dir_bytes(tmp_path / "missing", ttl=0) == 0


def test_the_walk_is_cached_for_the_ttl(tmp_path):
    _write(tmp_path, "one", 10)
    assert diskspace.dir_bytes(tmp_path) == 10
    _write(tmp_path, "two", 90)
    assert diskspace.dir_bytes(tmp_path) == 10  # still believed
    assert diskspace.dir_bytes(tmp_path, ttl=0) == 100  # measured afresh


def test_storage_reports_the_three_folders(client):
    data = deps.get_config().data_dir
    _write(data / "uploads", "a.pdf", 2000)
    _write(data / "media", "p.png", 300)
    _write(data / "backups", "b.zip", 40)
    diskspace._dir_sizes.clear()
    body = client.get("/storage").json()
    assert body["uploads_bytes"] == 2000
    assert body["media_bytes"] == 300
    assert body["backups_bytes"] == 40
