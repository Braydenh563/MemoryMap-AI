"""The whole notebook as one file, optionally sealed with one password.

`GET /export/backup` has long written a zip (the database snapshot plus
`media/` and `uploads/`); nothing could read it back, so the "full backup"
was a file the app could not use (BACKLOG 115 row 10). This module is both
halves: `build_zip` makes it, `restore_zip` takes one in, and
`encrypt_file`/`decrypt_file` wrap the same zip in a `.mmenc` container.

The container reuses `core/crypto.py`'s scrypt key derivation and AES-GCM,
in chunks, because a notebook with attachments can be gigabytes and the
single-shot form would hold all of it, twice, in memory:

  MAGIC | salt (16) | nonce prefix (8) | chunk 0 | chunk 1 | ...

Each chunk is AES-GCM of up to `CHUNK_BYTES` of the zip under a nonce of the
prefix and the chunk's counter, with one byte of associated data saying
whether it is the last. That byte is what makes a file cut at a chunk
boundary fail instead of reading as a shorter valid one; every other kind
of damage fails the chunk's own tag. A wrong password fails the first chunk
the same way, and the message says "password", which is the likelier cause.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import tempfile
import zipfile
from pathlib import Path

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from memorymap.core import backup, crypto

logger = logging.getLogger(__name__)

MAGIC = b"MMBK1\n"
CHUNK_BYTES = 1024 * 1024
_TAG_BYTES = 16
_PREFIX_BYTES = 8
#: The folders of the data directory a bundle carries besides the database.
_FOLDERS = ("media", "uploads")
#: A zip that claims more than this once unpacked is refused before anything
#: is written (a zip bomb, or a notebook this app was never going to hold).
MAX_UNPACKED_BYTES = 64 * 1024**3


class BundleError(ValueError):
    """The file is not one this app can read; the message is for the person."""


def _nonce(prefix: bytes, counter: int) -> bytes:
    return prefix + counter.to_bytes(4, "big")


def encrypt_file(source: Path, destination: Path, password: str) -> None:
    salt = crypto.new_salt()
    prefix = os.urandom(_PREFIX_BYTES)
    aead = AESGCM(crypto.derive_kek(password, salt))
    with open(source, "rb") as reader, open(destination, "wb") as writer:
        writer.write(MAGIC + salt + prefix)
        counter = 0
        block = reader.read(CHUNK_BYTES)
        while True:
            upcoming = reader.read(CHUNK_BYTES)
            last = not upcoming
            writer.write(aead.encrypt(_nonce(prefix, counter), block, b"\x01" if last else b"\x00"))
            if last:
                break
            block, counter = upcoming, counter + 1


def is_sealed(path: Path) -> bool:
    with open(path, "rb") as handle:
        return handle.read(len(MAGIC)) == MAGIC


def decrypt_file(source: Path, destination: Path, password: str) -> None:
    wrong = BundleError("That password does not open this file, or the file is damaged.")
    with open(source, "rb") as reader:
        header = reader.read(len(MAGIC) + crypto.SALT_BYTES + _PREFIX_BYTES)
        if len(header) < len(MAGIC) + crypto.SALT_BYTES + _PREFIX_BYTES or not header.startswith(MAGIC):
            raise BundleError("That is not an encrypted notebook file.")
        salt = header[len(MAGIC) : len(MAGIC) + crypto.SALT_BYTES]
        prefix = header[-_PREFIX_BYTES:]
        aead = AESGCM(crypto.derive_kek(password, salt))
        size = CHUNK_BYTES + _TAG_BYTES
        counter = 0
        block = reader.read(size)
        try:
            with open(destination, "wb") as writer:
                while True:
                    if len(block) < _TAG_BYTES:
                        raise wrong  # cut inside a tag, or an empty body
                    upcoming = reader.read(size)
                    last = not upcoming
                    writer.write(aead.decrypt(_nonce(prefix, counter), block, b"\x01" if last else b"\x00"))
                    if last:
                        break
                    block, counter = upcoming, counter + 1
        except InvalidTag as exc:
            raise wrong from exc


def build_zip(data_dir: Path, db_path: Path, destination: Path) -> None:
    """The portable zip: a cleaned snapshot of the database (never the live
    WAL-mode file, which misses what the log still holds, ARCH-18) and every
    file under `media/` and `uploads/`."""
    snapshot_fd, snapshot_name = tempfile.mkstemp(suffix=".db", prefix="memorymap_snapshot_")
    os.close(snapshot_fd)
    snapshot_path = Path(snapshot_name)
    try:
        if db_path.exists():
            backup.snapshot(db_path, snapshot_path)
        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
            if db_path.exists():
                archive.write(snapshot_path, "memorymap.db")
            for name in _FOLDERS:
                folder = data_dir / name
                if not folder.is_dir():
                    continue
                for root, _, files in os.walk(folder):
                    for file_name in files:
                        file_path = Path(root) / file_name
                        archive.write(file_path, str(file_path.relative_to(data_dir)))
    finally:
        for stray in (snapshot_path, Path(f"{snapshot_path}-wal"), Path(f"{snapshot_path}-shm")):
            try:
                stray.unlink()
            except OSError:
                pass  # never written, or already gone


def _safe_target(data_dir: Path, member: str) -> Path | None:
    """Where a member lands, or None when it is not ours to write: not under
    `media/` or `uploads/`, or a path that climbs out of them."""
    parts = Path(member.replace("\\", "/")).parts
    if len(parts) < 2 or parts[0] not in _FOLDERS:
        return None
    root = (data_dir / parts[0]).resolve()
    target = (data_dir / Path(*parts)).resolve()
    return target if target.is_relative_to(root) and target != root else None


def restore_zip(archive_path: Path, db_path: Path, data_dir: Path, keep: int) -> dict:
    """Replace the notebook with the one in the zip.

    The database goes through `backup.restore_file`, which takes the safety
    snapshot and checks the copy before swapping it in, so a refusal leaves
    the live notebook untouched. Files are merged over the folders (a file
    the zip lacks is kept, not deleted: a restore must never be the thing
    that removes an attachment). The caller disposes the engine first and
    reloads after, as for `restore_backup`."""
    try:
        archive = zipfile.ZipFile(archive_path)
    except zipfile.BadZipFile as exc:
        raise BundleError("That file is not a MemoryMap backup.") from exc
    with archive:
        names = archive.namelist()
        if "memorymap.db" not in names:
            raise BundleError("That zip has no notebook in it, so nothing was changed.")
        if sum(info.file_size for info in archive.infolist()) > MAX_UNPACKED_BYTES:
            raise BundleError("That backup is larger than this app will unpack.")
        staged = db_path.with_name(f"{db_path.name}.import-tmp")
        try:
            with archive.open("memorymap.db") as source, open(staged, "wb") as sink:
                while chunk := source.read(CHUNK_BYTES):
                    sink.write(chunk)
            try:
                backup.restore_file(staged, db_path, data_dir, keep)
            except sqlite3.DatabaseError as exc:
                raise BundleError(backup.DAMAGED_BACKUP) from exc
        finally:
            staged.unlink(missing_ok=True)
        restored = skipped = 0
        for info in archive.infolist():
            if info.is_dir() or info.filename == "memorymap.db":
                continue
            target = _safe_target(data_dir, info.filename)
            if target is None:
                skipped += 1
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source, open(target, "wb") as sink:
                while chunk := source.read(CHUNK_BYTES):
                    sink.write(chunk)
            restored += 1
    return {"files": restored, "skipped": skipped}
