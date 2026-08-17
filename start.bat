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
    set "MM_GIT_LOG=%TEMP%\mm_git_update_%RANDOM%.log"
    git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=5 pull --ff-only > "!MM_GIT_LOG!" 2>&1
    set "MM_GIT_STATUS=!errorlevel!"
    if "!MM_GIT_STATUS!"=="0" type "!MM_GIT_LOG!"
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
  set "PIP_LOG=%TEMP%\mm_pip_install_%RANDOM%.log"
  set "PIP_FAILED=0"
  "%VENV_PY%" -m pip install --upgrade pip --timeout 5 --retries 0 2>"!PIP_LOG!"
  if errorlevel 1 set "PIP_FAILED=1"
  "%VENV_PY%" -m pip install -r requirements.txt --prefer-binary --timeout 5 --retries 0 2>>"!PIP_LOG!"
  if errorlevel 1 set "PIP_FAILED=1"

  "%VENV_PY%" -m pip install -e . --timeout 5 --retries 0 2>>"!PIP_LOG!"
  if errorlevel 1 set "PIP_FAILED=1"

  if "!PIP_FAILED!"=="1" (
    set "MM_PIP_NET=0"
    findstr /I /C:"could not resolve" /C:"unable to access" /C:"timed out" /C:"connection refused" /C:"connection reset" /C:"network is unreachable" /C:"could not connect" /C:"newconnectionerror" /C:"max retries exceeded" /C:"proxy" /C:"ssl" /C:"getaddrinfo" "!PIP_LOG!" >nul 2>nul
    if not errorlevel 1 set "MM_PIP_NET=1"
    if "!MM_PIP_NET!"=="1" echo  !ESC![1;33m[!]!ESC![0m No internet - skipping dependency update.
    if "!MM_PIP_NET!"=="0" echo  !ESC![1;33m[!]!ESC![0m Could not update dependencies:
    if "!MM_PIP_NET!"=="0" type "!PIP_LOG!" 2>nul
    del /q "!PIP_LOG!" >nul 2>nul
    "%VENV_PY%" -c "import memorymap" >nul 2>nul
    if errorlevel 1 (
      echo  !ESC![1;31m[X]!ESC![0m First-time setup requires an internet connection to install dependencies.
      pause
      exit /b 1
    ) else (
      echo         Launching with existing installation...
    )
  ) else (
    del /q "!PIP_LOG!" >nul 2>nul
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
if defined MM_DESKTOP (
  echo  !ESC![1;38;5;73m[4/4]!ESC![0m Starting MemoryMap AI in its own window.
  echo        Close the app window to stop it.
  echo.
  "%VENV_PY%" -m memorymap --desktop
) else (
  echo  !ESC![1;38;5;73m[4/4]!ESC![0m Starting MemoryMap AI at http://localhost:8000
  echo        A browser tab opens in a moment. Close THIS window, or press
  echo        Ctrl+C in it, to stop the app.
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
  "%VENV_PY%" -m memorymap
)

echo.
echo  MemoryMap AI has stopped.
pause
endlocal