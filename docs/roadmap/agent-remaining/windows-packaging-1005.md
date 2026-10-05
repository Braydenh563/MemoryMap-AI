# Windows packaging audit before 0.4.0 (2026-10-05)

Branch cut from `claude/notes-flow-rebuild` (merged first). Nothing pushed.
Local proof: the Windows spec built on Linux with PyInstaller (no torch),
then `packaging/frozen_smoke.py` against it: 128 assets, 0 failures, no
traceback, nothing written into the bundle; `--install-extras docx,pyodide`
exit 0.

## Done

- 19e639f alembic.ini plain ASCII (the Alembic stamp failed under cp932/936/949 and a C locale).
- 891f63a both specs list every app module (needle_provider was missing: 198 of 200 bundled).
- 89e848c bootloader splash asked for only when one exists (a traceback per launch in the log).
- 622bd00 tray Restart on Windows (os.execv unquoted argv split the exe path); abrupt exits release instance.lock.
- 9588157 atomic writes retry a refused rename on Windows, UTF-8.
- 535673e no bytecode written beside the exe (migrations/__pycache__ outlived uninstall).
- 059b75b whole stdlib bundled for extras (filecmp, ctypes.util, optparse, venv were missing; +3 MB).
- d85d4a4 extras: bundled requirements.txt constrains pip; Linux asks for manylinux wheels.
- dab77ad /capabilities: no MCP command the packaged app cannot run.
- 4482ea1 lazy stylesheets carry their own stamp (library-lazy.css cached under app.js's).
- ccbce0f start.bat/uninstall.bat: shell's Desktop (OneDrive), apostrophes in paths.
- 5e2e487 installer version from `__version__`, tag check in release.yml, `[InstallDelete] {app}\_internal`.
- 3e8509d package-check: frozen_smoke (lazy assets + MIME, API, Alembic), pyodide, upgrade over the latest release, clean uninstall; release.yml runs the same smoke.
- a6d0a39 uninstaller deletes the downloaded `extras` folder too on yes.
- e406d37 Repair leaves a running copy's window profile alone.

## Left (not verified until CI's Windows job runs)

- installer.iss's ISPP version reader (`#sub`/`#for`, single-quoted `'"'`, `RPos`) compiles only on Windows: first push shows it.
- The upgrade step downloads the latest release with `gh` and `github.token`; a fork or a repo without releases fails it loudly.
- The traceback check in the smoke step reads the app's whole output; a benign logged traceback on Windows would fail it.

## Found, not fixed (all four since done)

- e48e60f instance lock claimed before the window opens (`_claim_notebook`: port chosen, lock written, then `create_window`); `_boot_and_swap` only sets the focus handler. A copy arriving in the remaining gap (relaunch decision, WebView2 probe) sees "starting" and waits.
- 80ec91e silent update reopens the app: the updater passes `/RELAUNCH=1`, a silent-only `[Run]` entry in installer.iss starts it. Not verified: no Windows here; an update from a build older than this one has no such flag, so that first update still needs a manual reopen.
- 6b1693a start.bat reads `%~dp0`/`%~f0` and cds before `enabledelayedexpansion` (a nested setlocal; every endlocal is followed by an exit). Not verified on cmd.
- (this commit) both specs filter `__pycache__` from `a.datas`; not run under PyInstaller (not installed here), the filter is tested on the entry shapes.
