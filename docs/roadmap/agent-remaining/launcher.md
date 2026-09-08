# Brief 17, the launchers, the uninstallers and the splash: what is left

Agent: Opus, worktree `agent-a3e9c02681f8ef629`, branch
`claude/epic-ramanujan-8xocc0`. Stopped on a usage cutoff, not on a
failure. One commit landed: `8335e00 start.sh: one flag set, a doctor, and
a log for every run`.

Read Brief 17 in [`../SESSION_BRIEFS.md`](../SESSION_BRIEFS.md) first: this
file says only what is done and what is not, not why any of it is wanted.

## Done

**Item 1, half of it.** `start.sh` only. It takes, and `--help` lists in
this order: `desktop`, `--port N`, `--no-browser`, `--no-update`,
`--reinstall`, `--doctor`, `--logs`, `--shortcut`, `--version`, `--help`.
Unknown flag prints help and exits 2; a non-numeric or out-of-range
`--port` does the same. `MEMORYMAP_DATA_DIR` is resolved with the app's own
precedence (environment, then `.env`, then `data`) and printed by `--help`,
`--version` and both launch paths. `--port` is exported as
`MEMORYMAP_PORT`, **which `src/memorymap/__main__.py` does not read yet**
(see below): the flag is honoured by the launcher's own port checks and by
the URL it opens, and ignored by the server.

**Item 2, on `start.sh`.** `mm_doctor` prints the nine rows the brief asks
for with a fix line per cross, and exits 0 or 1. The preflight subset
(port, disk, venv) runs before every start, and a MemoryMap already on the
port opens it instead of failing.

**Item 3, on `start.sh`.** `<data>/logs/launcher-<date>.log`, via
`exec > >(tee -a ...)`, ten files kept. Every hard stop goes through
`mm_fail`, which prints the failure, the matching doctor row's fix, the log
path and `./start.sh --doctor`.

**Item 6, the protocol only.** `mm_status` writes
`step|total|title|detail|state` (state `active|done|failed`), **appended**,
so the file is a history. Steps are Update, Python, Dependencies, Desktop
window (desktop mode only), Start; the total is 4 or 5 accordingly. zenity
lost `--pulsate` and now gets a real percentage (steps finished over
total) plus `title: detail` as its label. `mm_cancelled` /
`mm_bail_if_cancelled` poll `$MM_SPLASH_FILE.cancel` for `__cancel__`
between phases; nothing writes that file yet, splash.ps1's Cancel button
is not built.

## Not done, in the order to do it

1. **Item 1, `start.bat`.** The same ten flags in the same order and the
   same help text. `tests/test_launcher_scripts.py` (item 7, not written)
   is meant to be what fails when the two drift. Traps: the `MM_CHILD`
   self-update relaunch guard must survive every new flag, `set` in cmd
   makes a real environment variable so a `PIP_*` name collides with pip's
   own option parsing (there is a long comment on `MM_PIP_LOG` in the file
   about exactly this), and the header's rule stands: never put `(` or `)`
   inside an `ECHO` within an `IF ( ... )` block.
2. **Items 2 and 3, `start.bat`.** The doctor has to work with no Python at
   all: cmd checks Python's presence, the port and the disk itself, then
   asks the venv for the rest once it exists. Use the same `[ok]`/`[x]`
   marks, the same row order and the same fix wording as `start.sh` so the
   two tables read as one. Log with `>>` to
   `<data>\logs\launcher-<date>.log`; cmd has no `tee`, so either echo
   twice or route the noisy phases through a `> file` plus a `type`.
3. **Item 4.** `start-desktop.sh` does not exist. It is three lines:
   `cd "$(dirname "$0")"` and `exec ./start.sh --desktop "$@"`, with the
   same header comment `start-desktop.bat` carries. `start-desktop.bat`
   still passes a bare `desktop` and must pass `%*` as well.
4. **Item 5.** Neither uninstaller has been touched. Needs `--dry-run`
   (list with sizes, remove nothing), `--export PATH`, `--shortcuts`,
   caches (`__pycache__`, `.pytest_cache`, `.venv/.mm_installed`) removed
   with `.venv`, a running-instance check on the port that stops rather
   than deleting under it, sizes before and after, and `.env` kept unless
   `--delete-data`. `--export` needs a new `python -m memorymap --export
   PATH`: the zip-building body of `export_markdown` in
   `src/memorymap/api/routes_settings.py` (line ~1591) has to come out into
   a function both the route and `__main__.py` call. The route stays.
   `./start.sh --shortcut` writes
   `~/.local/share/applications/memorymap-ai.desktop` plus a Desktop copy
   on Linux, and a Finder alias (or a symlink fallback) named
   `MemoryMap AI` on the macOS Desktop: `--shortcuts` removes those exact
   paths.
5. **Item 6, the three renderers.** None are done.
   - `scripts/splash.ps1` still reads the last line as plain text, so
     between this commit and that one the Windows splash shows a raw
     `1|5|Update|...|active` line. It needs the step list with ticks, the
     active step's elapsed seconds, the muted pending steps, the detail
     line, a real bar at steps-done-over-total with the marquee inside the
     active step only, the five rotating tips at 6s, the Details / Copy
     diagnostics / Cancel footer, the slow-step hints (Dependencies 5
     minutes, Update 30 seconds) and the `failed` error card with Open log
     and Try again. Keep `MaxMinutes`, the three ways to die, and the
     `EnableVisualStyles` and no-`ForeColor` comments: both record real
     regressions.
   - `src/memorymap/core/launch_status.py` does not exist. It parses the
     protocol, rejects malformed lines, and seeds `_LOADING_HTML`.
     `__main__.py` must read the file **before** `_close_launch_splash()`
     deletes it: in `_run_desktop`, that is between the `create_window`
     call (~line 712) and `_close_launch_splash()` (~line 725).
   - `_LOADING_HTML` needs the same step list, seeded from that history,
     then its own `_STARTUP_PHASE_PERCENT` phases, plus the tips.
   - `frontend/index.html`'s `#boot-splash` needs the tip line, and
     `frontend/boot-guard.js` a "Still loading: reload" at 8 seconds
     (`offerReload` already exists; the 12s notice stays as it is).
     `.boot-splash` rules in `frontend/css/00-tokens-shell.css`, reduced
     motion respected.
   - macOS: one notification per step is already how `mm_splash` behaves in
     `notify` mode, but the terminal does not narrate a step list with
     ticks yet.
6. **Item 7.** `tests/test_launcher_scripts.py` does not exist. It should
   assert both scripts' help lists the same flags in the same order, that
   every phase in both writes a protocol line, `bash -n` on `start.sh`,
   `uninstall.sh` and `start-desktop.sh`, that `launch_status.py` parses
   and rejects, and that `--doctor` exits 0 or 1 with the table.
7. **`MEMORYMAP_PORT` in `src/memorymap/__main__.py`.** `HOST, PORT` is a
   module-level constant (line 25) and nothing reads the environment.
   `--port` is a half-kept promise until it does.
   `tests/test_desktop_launcher.py:224` asserts on `launcher.PORT`, so keep
   the name.
8. **`docs/INSTALL.md`.** Its launcher section (line ~95) and uninstall
   section (line ~189) still describe the old two-flag world.

## Not verified

- Nothing on Windows. PowerShell and cmd cannot run in this sandbox, so
  `start.bat`, `uninstall.bat` and `splash.ps1` are read, not executed.
- No browser was driven; nothing visual in this commit.
- `--shortcut` was not run on either platform: the Linux branch writes a
  file and the macOS branch shells out to `osascript`, both unexercised.
- `--logs` was not run (it shells out to `xdg-open`).
- The doctor's Ollama and git rows were exercised only in their negative
  state here: no Ollama is running in the sandbox, and a worktree's `.git`
  is a file rather than a directory, so the "Updates" row reported "not a
  git checkout". A real clone takes the other branch, which is the same
  `[ -d .git ]` test the existing self-update block has always used.
