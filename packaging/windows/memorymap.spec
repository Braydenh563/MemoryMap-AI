# PyInstaller spec for the Windows desktop build.
#
# Built on windows-latest in CI (.github/workflows/release.yml), never on
# this developer's own machine — PyInstaller bundles for the OS it runs on,
# it does not cross-compile, so a spec written and reasoned about here is
# unverified until that workflow actually runs it. Read this file's own
# comments as "why", not "confirmed working."
#
# Usage (from the repo root, on Windows):
#   pip install -e ".[desktop]" pyinstaller
#   pyinstaller packaging/windows/memorymap.spec --distpath dist --workpath build
#
# Produces dist/MemoryMap AI/MemoryMap AI.exe (onedir, not onefile — see
# below for why) plus everything it needs beside it. installer.iss in this
# same folder packages that whole folder into the actual installer.

import sys
from pathlib import Path

block_cipher = None

# packaging/windows/memorymap.spec -> repo root is two levels up.
REPO_ROOT = Path(SPECPATH).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend"
ENTRY_SCRIPT = REPO_ROOT / "src" / "memorymap" / "__main__.py"
ICON = str(FRONTEND_DIR / "icon.ico")

a = Analysis(
    [str(ENTRY_SCRIPT)],
    pathex=[str(REPO_ROOT / "src")],
    binaries=[],
    datas=[
        # Bundled at the extraction root as "frontend" — api/app.py's
        # FRONTEND_DIR and __main__.py's icon lookup both expect exactly
        # that path once sys.frozen is true (see their own comments).
        (str(FRONTEND_DIR), "frontend"),
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
        # pywebview's Windows backends. edgechromium is the modern
        # (WebView2) one and what a current Windows ships; mshtml is the
        # legacy IE-engine fallback pywebview itself falls back to. Neither
        # is imported by name anywhere in this app's own code, so without
        # this pywebview finds nothing to render into on a frozen build.
        "webview.platforms.edgechromium",
        "webview.platforms.mshtml",
        # multipart form parsing (note/document file uploads) and password
        # hashing both resolve their real backend at import time in a way
        # PyInstaller's analysis has been seen to miss.
        "multipart",
        "bcrypt",
        # pystray's own backend selection (__main__._start_tray) is the same
        # "picked by name at runtime" shape as pywebview's platforms above —
        # win32 is the only one this build ever runs, but PyInstaller's
        # static analysis has no way to know that from `import pystray` alone.
        "pystray._win32",
        "PIL.Image",
        # search/searxng_manager.py's own module __getattr__ reaches these
        # four facade files exclusively through importlib.import_module —
        # the same "picked by name at runtime" shape as every entry above,
        # and confirmed missing from a real packaged build by a support
        # bundle: "ModuleNotFoundError: No module named
        # 'memorymap.search.searxng_docker'". None of the four is ever
        # imported by its own name anywhere else in this app, so PyInstaller's
        # static analysis has no path to any of them without this.
        "memorymap.search.searxng_settings",
        "memorymap.search.searxng_docker",
        "memorymap.search.searxng_install",
        "memorymap.search.searxng_process",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Explicitly never bundled — see CLAUDE.md/requirements.txt: this
        # app's own semantic search already falls back to keywords without
        # them, and torch alone is a very large chunk of a download this
        # installer's whole point is to keep small and fast to fetch.
        # (Belt-and-braces: nothing in this app imports them at module
        # level, so PyInstaller's analysis should not pull them in on its
        # own — this just makes the intent explicit and keeps a future
        # accidental import from silently ballooning the build.)
        "torch",
        "sentence_transformers",
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
    # No code signing yet (deliberate, for now — see README's Windows
    # install note): an unsigned exe still needs an icon so Explorer, the
    # taskbar and the installer shortcut all show the real one rather than
    # a generic default, which is a separate thing from the signature.
    icon=ICON,
)

# onedir, not onefile: a onefile build re-extracts itself to a temp folder
# on every single launch, which is a slow, avoidable cold start for an app
# meant to be opened like any other desktop program. installer.iss installs
# this whole folder, which is also the more normal shape for an "installed"
# app (matches the earlier portable-vs-installed decision) — a onefile
# build is the better fit for the portable case this project chose not to
# ship for v1.
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="MemoryMap AI",
)
