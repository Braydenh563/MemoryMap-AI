# PyInstaller spec for the Linux desktop build.
#
# Built on ubuntu-latest in CI (.github/workflows/release.yml), never on this
# developer's own machine — PyInstaller bundles for the OS it runs on, it does
# not cross-compile, so a spec written and reasoned about here is unverified
# until that workflow actually runs it. Read this file's own comments as
# "why", not "confirmed working" — same standing caveat as the Windows spec
# beside it.
#
# No system tray on this build (see __main__.py's own comment on the
# win32-only gate): pystray's Linux backend needs GTK, which — like macOS's
# AppKit — only tolerates UI calls from the main thread, and this app's tray
# runs its event loop on a background thread while webview.start() blocks
# the main one. That is fine on Windows (the only platform it was built and
# tested against) and is exactly the reason macOS was never targeted either.
# Shipping the same architecture here would be a guess, not a port. The
# window still opens and closes normally — just no tray icon or minimize-to-
# tray, the same fallback already in place when pystray isn't installed.
#
# Usage (from the repo root, on Linux):
#   pip install -e ".[desktop]" pyinstaller
#   pyinstaller packaging/linux/memorymap.spec --distpath dist --workpath build
#
# Produces dist/MemoryMap AI/MemoryMap AI (onedir, not onefile — see the
# Windows spec's own comment for why) plus everything it needs beside it.
# The release workflow zips that whole folder rather than building a
# system-specific installer/package (.deb/.rpm/AppImage) — a plain zip has
# no packaging-format decision to get wrong for a first release, at the
# cost of no desktop-menu integration or auto-update path either.

import sys
from pathlib import Path

block_cipher = None

# packaging/linux/memorymap.spec -> repo root is two levels up.
REPO_ROOT = Path(SPECPATH).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend"
MIGRATIONS_DIR = REPO_ROOT / "migrations"
ALEMBIC_INI = REPO_ROOT / "alembic.ini"
ENTRY_SCRIPT = REPO_ROOT / "src" / "memorymap" / "__main__.py"
ICON = str(FRONTEND_DIR / "icon-512.png")

a = Analysis(
    [str(ENTRY_SCRIPT)],
    pathex=[str(REPO_ROOT / "src")],
    binaries=[],
    datas=[
        # Bundled at the extraction root as "frontend" — api/app.py's
        # FRONTEND_DIR and __main__.py's icon lookup both expect exactly
        # that path once sys.frozen is true (see their own comments).
        (str(FRONTEND_DIR), "frontend"),
        # Same reason, same extraction-root convention:
        # core/database.py's _migrations_root() looks for these two right
        # beside "frontend" once sys.frozen is true. Without them, a frozen
        # build silently falls back to "Alembic config not found" (logged,
        # never fatal — see _ensure_alembic_baseline's own docstring) and
        # every install stays on the pre-Alembic additive-only path.
        (str(MIGRATIONS_DIR), "migrations"),
        (str(ALEMBIC_INI), "."),
    ],
    hiddenimports=[
        # uvicorn picks its event loop / protocol implementations at
        # runtime via importlib rather than a top-level import, which is
        # exactly the shape PyInstaller's static analysis cannot see.
        "uvicorn.logging",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.protocols.websockets.wsproto_impl",
        "uvicorn.lifespan.on",
        # SQLAlchemy's sqlite dialect, same "picked by name at runtime"
        # shape as the uvicorn entries above.
        "sqlalchemy.dialects.sqlite",
        # pywebview's Linux backend: GTK (via PyGObject) is the one every
        # mainstream distro's default desktop can satisfy without asking
        # for a second toolkit; pywebview falls back to Qt only if GTK
        # isn't importable, which the CI runner may not have either — a
        # missing hidden import here means "no window opens" rather than a
        # partial failure, so this is the one entry in this file most
        # worth checking first if the Linux job's smoke step fails.
        "webview.platforms.gtk",
        # multipart form parsing (note/document file uploads) and password
        # hashing both resolve their real backend at import time in a way
        # PyInstaller's analysis has been seen to miss.
        "multipart",
        "bcrypt",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Explicitly never bundled — see CLAUDE.md/requirements.txt: this
        # app's own semantic search already falls back to keywords without
        # them, and torch alone is a very large chunk of a download this
        # build's whole point is to keep small and fast to fetch.
        "torch",
        "sentence_transformers",
        # No tray on this build (see the module docstring above) — pystray
        # is not installed for this job at all, so there is nothing to
        # exclude by name here; this entry exists so a future session
        # doesn't add pystray to the Linux install step without reading
        # why it was left out.
    ],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="MemoryMap AI",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    icon=ICON,
)

# onedir, not onefile — see the Windows spec's own comment: a onefile build
# re-extracts itself to a temp folder on every launch, a slow, avoidable cold
# start for something meant to be opened like a normal desktop program.
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="MemoryMap AI",
)
