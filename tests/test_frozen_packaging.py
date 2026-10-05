"""What the frozen Windows build carries and how it reads it, checked on any
machine.

The packaged app is built and smoked on a real Windows runner only in CI
(`.github/workflows/package-check.yml`). These are the parts of that build
that can be proven from the source tree: the files the spec bundles, the
modules it must name because nothing imports them by name, and the files
the bundle reads in whatever encoding the person's Windows happens to use.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_alembic_ini_is_plain_ascii():
    """Alembic reads `alembic.ini` with `configparser` in the locale's
    encoding, not UTF-8. One em dash in a comment (e2 80 94) is not valid
    cp932, cp936 or cp949, so on a Japanese, Chinese or Korean Windows, and
    in the frozen app under a C locale (measured on the Linux build of the
    Windows spec: `UnicodeDecodeError: 'ascii' codec can't decode byte
    0xe2`), `_ensure_alembic_baseline` failed before any migration ran and
    the database was never stamped or upgraded."""
    raw = (ROOT / "alembic.ini").read_bytes()
    bad = [i for i, byte in enumerate(raw) if byte > 0x7F]
    assert not bad, f"alembic.ini has non-ASCII bytes at {bad[:5]}"
