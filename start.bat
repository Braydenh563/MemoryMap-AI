@echo off
title MemoryMap AI
REM ===================================================================
REM  MemoryMap AI - one-click launcher for Windows
REM
REM  Double-click this file, or run "start.bat" in a terminal. It sets
REM  everything up the first time, then just runs the app after that:
REM
REM    1. use the app's own .venv Python (only needs a system Python the
REM       very first time, to build that .venv)
REM    2. install / update dependencies + the app itself
REM    3. copy .env.example to .env the first time
REM    4. start the server and open your browser at localhost:8000
REM
REM  Editors beware: never put ( or ) inside an ECHO that sits within an
REM  IF ( ... ) block - cmd reads the ) as the end of the block and the
REM  script dies. Keep echoed text paren-free.
REM ===================================================================

setlocal enabledelayedexpansion

REM Generate the ESC character to allow ANSI color codes in Windows CMD
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"

cd /d "%~dp0"

REM --- Launch splash ---------------------------------------------------
REM  Everything below this line - the git pull, building .venv, and a pip
REM  install that can run to several hundred megabytes - happens before
REM  Python exists, so before __main__.py can show its own loading window.
REM  Reported directly: those pre-processes "take a while to actually open
REM  the window so the user doesn't think the application didn't start
REM  properly because they didn't have access to the terminal logs".
REM
REM  So a splash goes up first, within a second of the double-click, and
REM  the phases below write what they are doing into MM_SPLASH_FILE for it
REM  to display. See scripts\splash.ps1 for the protocol - one line of
REM  text, polled; deleting the file closes the window.
REM
REM  Entirely best-effort: launched detached, errorlevel never checked, and
REM  every path out of this script deletes the file. A machine with no
REM  PowerShell, a locked-down execution policy or no desktop session just
REM  does not get a splash, exactly as before.
REM
REM  MM_CHILD guards it the same way it guards the self-update: the child
REM  process inherits MM_SPLASH_FILE and keeps writing to the splash the
REM  parent already opened, instead of opening a second one on top of it.
if not defined MM_CHILD (
  set "MM_SPLASH_FILE=%TEMP%\mm_splash_%RANDOM%.txt"
  echo Starting...> "!MM_SPLASH_FILE!"
  REM  -IconPath so the splash window and its taskbar button carry the app's
  REM  icon rather than PowerShell's. splash.ps1 works this out for itself
  REM  from its own location too; passing it explicitly means the packaged
  REM  layout (where scripts\ and frontend\ may not be siblings) does not
  REM  have to match the checkout's.
  if exist "scripts\splash.ps1" start "" /b powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "scripts\splash.ps1" -StatusFile "!MM_SPLASH_FILE!" -IconPath "%~dp0frontend\icon.ico" >nul 2>nul
)

REM --- Desktop mode ----------------------------------------------------
REM  "start.bat desktop" runs the app in its own window instead of a
REM  browser tab. start-desktop.bat is a double-clickable shortcut to it.
REM  MM_DESKTOP survives the self-update relaunch below, so the child
REM  process keeps the mode the user asked for.
if /i "%~1"=="desktop" set "MM_DESKTOP=1"
if /i "%~1"=="--desktop" set "MM_DESKTOP=1"

REM --- Help --------------------------------------------------------------
REM  Checked before anything else touches the network or the venv, so
REM  --help is always instant regardless of connection state.
if /i "%~1"=="--help" goto :help
if /i "%~1"=="-h" goto :help
goto :after_help
:help
echo MemoryMap AI launcher
echo.
echo Usage:
echo   start.bat              Start the app at http://localhost:8000
echo   start.bat desktop      Start the app in its own window instead of a browser tab
echo   start.bat --help       Show this message and exit
echo.
echo What it does: builds .venv on first run, installs/updates dependencies
echo whenever requirements.txt changes, pulls the latest code first (skipped
echo silently if offline), then starts the server.
echo.
echo To remove what this script installed, see uninstall.bat --help.
exit /b 0
:after_help

REM --- 0. Self-update, then re-launch a FRESH copy --------------------
REM  A running .bat is read from disk by byte offset, so a git pull that
REM  rewrites this file mid-run would corrupt it. To stay safe we pull,
REM  then re-launch the (possibly updated) script in a child process and
REM  stop this one. The MM_CHILD guard prevents an endless loop.
REM
REM  `http.lowSpeedLimit`/`http.lowSpeedTime` are git's own "abort a
REM  connection that has gone quiet" option - the same flags start.sh
REM  uses, and the same ones that turned a black-holed connection (a
REM  listener that accepts and never answers) into a five-second failure
REM  instead of a long stall when tested against one. They don't bound the
REM  very first connect, so a proxy that never completes even a handshake
REM  still falls back to git's own much longer default - rare next to "no
REM  internet" or "a slow/stalled proxy", which is what these are for.
REM
REM  Output is captured to a temp file rather than left to print live, so
REM  a failure can be told apart from a real internet connection - but the
REM  same file is shown either way (see below), so nothing that used to
REM  print here goes missing.
if not defined MM_CHILD (
  where git >nul 2>nul && if exist ".git" (
    set "MM_CHILD=1"
    echo  Checking for updates...
    if defined MM_SPLASH_FILE echo Checking for updates on GitHub...> "!MM_SPLASH_FILE!"
    REM Read before the pull so a real version change can be reported to
    REM the app after relaunch, the same way start.sh's own self-update
    REM block does - this script's update runs and finishes before the
    REM server (and browser tab) exist, so nothing else can tell "was I
    REM just updated?" without this.
    call :read_version MM_VERSION_BEFORE
    set "MM_GIT_LOG=%TEMP%\mm_git_update_%RANDOM%.log"
    git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=5 pull --ff-only > "!MM_GIT_LOG!" 2>&1
    set "MM_GIT_STATUS=!errorlevel!"
    if "!MM_GIT_STATUS!"=="0" type "!MM_GIT_LOG!"
    if "!MM_GIT_STATUS!"=="0" call :read_version MM_VERSION_AFTER
    if "!MM_GIT_STATUS!"=="0" if not "!MM_VERSION_AFTER!"=="" if not "!MM_VERSION_AFTER!"=="!MM_VERSION_BEFORE!" (
      REM Picked up by routes_update.py's GET /update/source-status, purely
      REM from these two env vars - no network call on the app's own side,
      REM so this stays offline-safe like everything else update-related.
      set "MM_UPDATED_FROM=!MM_VERSION_BEFORE!"
      set "MM_UPDATED_TO=!MM_VERSION_AFTER!"
    )
    set "MM_GIT_NET=0"
    if not "!MM_GIT_STATUS!"=="0" findstr /I /C:"could not resolve" /C:"unable to access" /C:"timed out" /C:"connection refused" /C:"connection reset" /C:"network is unreachable" /C:"could not connect" /C:"bytes/sec" /C:"proxy" /C:"ssl certificate" /C:"getaddrinfo" "!MM_GIT_LOG!" >nul 2>nul
    if not "!MM_GIT_STATUS!"=="0" if not errorlevel 1 set "MM_GIT_NET=1"
    if not "!MM_GIT_STATUS!"=="0" if "!MM_GIT_NET!"=="1" echo         No internet - skipping update check.
    if not "!MM_GIT_STATUS!"=="0" if "!MM_GIT_NET!"=="0" echo  !ESC![1;31m[X]!ESC![0m Update failed - staying on the current version:
    if not "!MM_GIT_STATUS!"=="0" if "!MM_GIT_NET!"=="0" type "!MM_GIT_LOG!" 2>nul
    del /q "!MM_GIT_LOG!" >nul 2>nul
    call "%~f0"
    exit /b !errorlevel!
  )
)

echo.
echo !ESC![1;38;5;73m    __  ___                                __  ___               ___    ____
echo    /  ^|/  /__  ____ ___  ____  _______  __/  ^|/  /___ _____    /   ^|  /  _/
echo   / /^|_/ / _ \/ __ `__ \/ __ \/ ___/ / / / /^|_/ / __ `/ __ \  / /^| ^|  / /
echo  / /  / /  __/ / / / / / /_/ / /  / /_/ / /  / / /_/ / /_/ / / ___ ^|_/ /
echo /_/  /_/\___/_/ /_/ /_/\____/_/   \__, /_/  /_/\__,_/ .___/ /_/  ^|_/___/
echo                                  /____/            /_/
echo             your notebook, on your machine!ESC![0m
echo.

set "VENV_PY=.venv\Scripts\python.exe"

REM --- 1. Build the venv if it doesn't exist yet ----------------------
REM  Only the FIRST run needs a system Python; after that the app uses
REM  its own .venv, so a flaky PATH can't stop later launches.
if not exist "%VENV_PY%" (
  echo  !ESC![1;38;5;73m[1/4]!ESC![0m First-time setup - looking for Python to build the environment...
  set "PYTHON="
  py -3 --version >nul 2>nul && set "PYTHON=py -3"
  if not defined PYTHON (
    python --version >nul 2>nul && set "PYTHON=python"
  )
  if not defined PYTHON (
    python3 --version >nul 2>nul && set "PYTHON=python3"
  )
  if not defined PYTHON (
    echo.
    echo  !ESC![1;31m[X]!ESC![0m No Python was found. Install Python 3.11 or newer from
    echo      https://www.python.org/downloads/ and tick
    echo      "Add python.exe to PATH" during setup, then run this again.
    echo.
    pause
    exit /b 1
  )
  REM  Caught here, not left to surface later as a confusing pip/import
  REM  failure deep into step 2 - pyproject.toml requires 3.11+, and
  REM  building a venv with an older interpreter would "succeed" and only
  REM  fail once something actually needs a 3.11-only feature.
  !PYTHON! -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul
  if errorlevel 1 (
    for /f "delims=" %%V in ('!PYTHON! --version 2^>^&1') do set "PYVER=%%V"
    echo  !ESC![1;31m[X]!ESC![0m Found !PYVER!, but MemoryMap AI needs Python 3.11 or newer.
    echo      Install a newer Python from https://www.python.org/downloads/
    echo      and run this again.
    pause
    exit /b 1
  )
  echo        Using !PYTHON! to create the virtual environment...
  !PYTHON! -m venv .venv
  if errorlevel 1 (
    echo  !ESC![1;31m[X]!ESC![0m Could not create the virtual environment.
    pause
    exit /b 1
  )
) else (
  echo  !ESC![1;38;5;73m[1/4]!ESC![0m Using the app's virtual environment.
)

if not exist "%VENV_PY%" (
  echo  !ESC![1;31m[X]!ESC![0m The virtual environment looks incomplete - delete the .venv
  echo      folder and run this script again.
  pause
  exit /b 1
)

REM --- 2. Install / update dependencies -------------------------------
REM  A marker file skips the slow reinstall unless requirements.txt has
REM  changed since the last good install.
set "NEED_INSTALL=1"
if exist ".venv\.mm_installed" (
  for %%A in ("requirements.txt") do set "REQ_TIME=%%~tA"
  set /p LAST_TIME=<".venv\.mm_installed"
  if "!REQ_TIME!"=="!LAST_TIME!" set "NEED_INSTALL=0"
)

REM  The marker only answers "have requirements.txt changed?". The question
REM  that matters at launch is "can this venv actually import the app?", and
REM  those come apart the moment the project folder is renamed or moved:
REM  `pip install -e .` records an ABSOLUTE path into the venv, so the old
REM  path stops resolving while requirements.txt keeps its timestamp. The
REM  marker then says "up to date", the reinstall is skipped, and the launch
REM  dies with "No module named memorymap" - reported after a rename from
REM  MemoryMap-AI-v0 to MemoryMap-AI. Asking the venv directly costs one
REM  interpreter start and catches a move, a rename, and a half-deleted venv.
if "!NEED_INSTALL!"=="0" (
  "%VENV_PY%" -c "import memorymap" >nul 2>nul
  if errorlevel 1 (
    echo  !ESC![1;38;5;73m[2/4]!ESC![0m The app folder moved since it was installed - relinking it...
    set "NEED_INSTALL=1"
  )
)

if "!NEED_INSTALL!"=="1" (
  if defined MM_SPLASH_FILE echo Installing dependencies - this can take a few minutes...> "!MM_SPLASH_FILE!"
  echo  !ESC![1;38;5;73m[2/4]!ESC![0m Installing dependencies - this can take a few minutes for heavy AI models.
  echo         pip's own progress prints below as it happens:

  REM  `--timeout 5 --retries 0` makes pip give up on a dead connection in
  REM  seconds instead of its default (a 15s socket timeout retried 5
  REM  times per package - several minutes of silence on a dead network).
  REM
  REM  `--quiet` and a full `> log 2>&1` redirect used to hide pip's own
  REM  progress entirely - reported directly ("I hate that I can't see
  REM  what's going on and why it is taking so long"), and this is a real
  REM  multi-minute install (sentence-transformers, and torch on Windows).
  REM  Dropping `--quiet` and only redirecting stderr lets pip's own
  REM  "Collecting X / Downloading X (NN%%)" lines print live to the
  REM  console while errors still land in the log for the network-vs-real
  REM  check below - and because nothing here is piped, `errorlevel` still
  REM  reads directly off each pip command with no extra plumbing needed.
  REM
  REM  Named MM_PIP_LOG, not PIP_LOG - every `set` in cmd.exe becomes a real
  REM  environment variable, inherited by the pip subprocess below, and pip
  REM  reads any PIP_<OPTION> env var as if it were that CLI flag. `--log`
  REM  becomes PIP_LOG, so a variable of that exact name made pip try to
  REM  write its OWN verbose log to this same path - the one cmd.exe already
  REM  has open for the `2>>` redirect below. Two writers on one handle, and
  REM  when pip's RotatingFileHandler tried to rotate it mid-install, Windows'
  REM  exclusive locking turned that into a PermissionError logged to stderr
  REM  (reported: "Successfully installed Mako-1.4.1 alembic-1.19.1" followed
  REM  by a `--- Logging error ---` traceback from `logging.handlers`). The
  REM  install itself still succeeded - only pip's own incidental debug
  REM  logging failed - but the traceback reads as a real crash.
  set "MM_PIP_LOG=%TEMP%\mm_pip_install_%RANDOM%.log"
  set "PIP_FAILED=0"
  "%VENV_PY%" -m pip install --upgrade pip --timeout 5 --retries 0 2>"!MM_PIP_LOG!"
  if errorlevel 1 set "PIP_FAILED=1"
  "%VENV_PY%" -m pip install -r requirements.txt --prefer-binary --timeout 5 --retries 0 2>>"!MM_PIP_LOG!"
  if errorlevel 1 set "PIP_FAILED=1"

  "%VENV_PY%" -m pip install -e . --timeout 5 --retries 0 2>>"!MM_PIP_LOG!"
  if errorlevel 1 set "PIP_FAILED=1"

  if "!PIP_FAILED!"=="1" (
    set "MM_PIP_NET=0"
    findstr /I /C:"could not resolve" /C:"unable to access" /C:"timed out" /C:"connection refused" /C:"connection reset" /C:"network is unreachable" /C:"could not connect" /C:"newconnectionerror" /C:"max retries exceeded" /C:"proxy" /C:"ssl" /C:"getaddrinfo" "!MM_PIP_LOG!" >nul 2>nul
    if not errorlevel 1 set "MM_PIP_NET=1"
    if "!MM_PIP_NET!"=="1" echo  !ESC![1;33m[!]!ESC![0m No internet - skipping dependency update.
    if "!MM_PIP_NET!"=="0" echo  !ESC![1;33m[!]!ESC![0m Could not update dependencies:
    if "!MM_PIP_NET!"=="0" type "!MM_PIP_LOG!" 2>nul
    del /q "!MM_PIP_LOG!" >nul 2>nul
    "%VENV_PY%" -c "import memorymap" >nul 2>nul
    if errorlevel 1 (
      echo  !ESC![1;31m[X]!ESC![0m First-time setup requires an internet connection to install dependencies.
      pause
      exit /b 1
    ) else (
      echo         Launching with existing installation...
    )
  ) else (
    del /q "!MM_PIP_LOG!" >nul 2>nul
    for %%A in ("requirements.txt") do echo %%~tA>".venv\.mm_installed"
  )
) else (
  echo  !ESC![1;38;5;73m[2/4]!ESC![0m Dependencies already up to date - skipping install.
)

REM  pywebview is optional and only needed for the app window, so it is
REM  installed on demand rather than for everyone. Cheap after the first
REM  time - pip exits immediately when it is already present. Same
REM  `--timeout`/`--retries` as step 2, since this runs even when
REM  NEED_INSTALL was 0 - it's the one bit of network work that isn't
REM  skipped just because everything else is already installed.
if defined MM_DESKTOP (
  if defined MM_SPLASH_FILE echo Checking desktop window support...> "!MM_SPLASH_FILE!"
  echo        Checking desktop window support...
  "%VENV_PY%" -m pip install --quiet --timeout 5 --retries 0 pywebview
  if errorlevel 1 (
    echo  !ESC![1;33m[!]!ESC![0m pywebview would not install - offline, or a real error - opening a browser tab instead.
    set "MM_DESKTOP="
  )
)

REM --- 3. First-run .env ----------------------------------------------
if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo  !ESC![1;38;5;73m[3/4]!ESC![0m Created .env from .env.example.
  )
) else (
  echo  !ESC![1;38;5;73m[3/4]!ESC![0m Configuration found.
)

REM --- 4. Launch -------------------------------------------------------
REM  The splash's handoff. In desktop mode __main__.py opens its own loading
REM  window with a real progress bar, and passes MM_SPLASH_FILE straight
REM  through to it - see _close_launch_splash there - so the two never overlap
REM  and never leave a gap. In browser mode nothing else appears, so the file
REM  is deleted below once the tab is opening.
if defined MM_SPLASH_FILE echo Starting the app...> "!MM_SPLASH_FILE!"

REM --- 4. Launch -------------------------------------------------------
if defined MM_DESKTOP (
  echo  !ESC![1;38;5;73m[4/4]!ESC![0m Starting MemoryMap AI in its own window.
  echo        Close the app window to stop it.
  echo.
  REM Asked for directly: "guide the user to where the application location
  REM is and what files to run" — !CD!, not %CD%, since this line sits
  REM inside a parenthesized if/else block under enabledelayedexpansion set
  REM at the top of this script. %CD% there would resolve once at the
  REM block's own parse time rather than when this line actually runs, the
  REM same trap !ESC! already exists to avoid. Safe to print as the
  REM install location specifically because "cd /d %~dp0" at the top of
  REM this script means it is always this script's own folder.
  echo  !ESC![1;38;5;73mInstalled at:!ESC![0m !CD!
  echo  !ESC![1;38;5;73mNext time:!ESC![0m    open a terminal there and run start-desktop.bat again
  echo.
  "%VENV_PY%" -m memorymap --desktop
  REM  Exit code 42 (RELAUNCHED_HIDDEN_EXIT_CODE, __main__.py) means "User
  REM  view" handed off to a separate, console-less pythonw.exe process and
  REM  this one exited on purpose - its job here is done. Falling through to
  REM  the shared "has stopped" message and `pause` below would leave this
  REM  window sitting on a keypress prompt forever, which is exactly the
  REM  visible terminal "User view" exists to avoid - exit here instead so
  REM  it closes itself the same way a normal double-click launch would.
  if !errorlevel! equ 42 (
    endlocal
    exit /b 0
  )
) else (
  echo  !ESC![1;38;5;73m[4/4]!ESC![0m Starting MemoryMap AI at http://localhost:8000
  echo        A browser tab opens in a moment. Close THIS window, or press
  echo        Ctrl+C in it, to stop the app.
  echo.
  echo  !ESC![1;38;5;73mInstalled at:!ESC![0m !CD!
  echo  !ESC![1;38;5;73mNext time:!ESC![0m    open a terminal there and run start.bat again
  echo.
  REM  Wait a moment, then open the browser — done with the venv Python
  REM  rather than `timeout` and `start`.
  REM
  REM  `timeout` is an EXTERNAL program (System32\timeout.exe), not a cmd
  REM  builtin, so it fails with "'timeout' is not recognized as an internal
  REM  or external command" on any machine whose PATH has lost System32 —
  REM  which a badly-behaved installer or a hand-edited PATH does more often
  REM  than you would think. It also refuses to run at all when its input is
  REM  redirected. Reported in use.
  REM
  REM  `%VENV_PY%` is an absolute path this script has already created and
  REM  checked, so it needs nothing on PATH at all, and `webbrowser` picks the
  REM  default browser the same way `start` does.
  start "" /b "%VENV_PY%" -c "import time, webbrowser; time.sleep(3); webbrowser.open('http://localhost:8000')"
  REM  No second window is coming in browser mode - the tab is the app - so
  REM  the splash closes here rather than being handed on.
  if defined MM_SPLASH_FILE del /q "!MM_SPLASH_FILE!" >nul 2>nul
  "%VENV_PY%" -m memorymap
)

echo.
REM  The backstop. Every ordinary path already deleted this, but an error
REM  path that exits through here must not leave a borderless always-on-top
REM  window with no owner sitting on the user's desktop. splash.ps1 also
REM  gives up on its own after MaxMinutes for the case where this script is
REM  killed outright and never runs this line at all.
if defined MM_SPLASH_FILE del /q "!MM_SPLASH_FILE!" >nul 2>nul
echo  MemoryMap AI has stopped.
pause
endlocal
goto :eof

REM --- Subroutine: read __version__ out of src\memorymap\__init__.py ----
REM  Called with the name of the variable to set (e.g. `call :read_version
REM  MM_VERSION_BEFORE`) - batch has no return value, only "set a variable
REM  in the caller's scope", which `set "%~1=..."` under
REM  enabledelayedexpansion (set at the top of this script) does.
REM
REM  Deliberately left quoted (token 3 of `__version__ = "0.1.3"`, split on
REM  spaces, is `"0.1.3"` with the quotes still on) rather than stripped
REM  here - putting a literal double-quote character inside a batch
REM  `set "VAR=..."` line is exactly the kind of thing this project's own
REM  start.bat has already been bitten by once (see the top-of-file note
REM  on parens inside IF blocks). routes_update.py strips the quotes on
REM  the Python side instead, where it's one `.strip('"')` and not a
REM  cmd.exe quoting puzzle.
:read_version
set "MM_VER_TMP="
for /f "tokens=1,2,* delims= " %%A in ('findstr /B "__version__" "src\memorymap\__init__.py" 2^>nul') do set "MM_VER_TMP=%%C"
set "%~1=!MM_VER_TMP!"
exit /b 0