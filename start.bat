@echo off
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
cd /d "%~dp0"

REM --- Desktop mode ----------------------------------------------------
REM  "start.bat desktop" runs the app in its own window instead of a
REM  browser tab. start-desktop.bat is a double-clickable shortcut to it.
REM  MM_DESKTOP survives the self-update relaunch below, so the child
REM  process keeps the mode the user asked for.
if /i "%~1"=="desktop" set "MM_DESKTOP=1"
if /i "%~1"=="--desktop" set "MM_DESKTOP=1"

REM --- 0. Self-update, then re-launch a FRESH copy --------------------
REM  A running .bat is read from disk by byte offset, so a git pull that
REM  rewrites this file mid-run would corrupt it. To stay safe we pull,
REM  then re-launch the (possibly updated) script in a child process and
REM  stop this one. The MM_CHILD guard prevents an endless loop.
if not defined MM_CHILD (
  where git >nul 2>nul && if exist ".git" (
    set "MM_CHILD=1"
    echo  Checking for updates...
    git pull --ff-only
    call "%~f0"
    exit /b !errorlevel!
  )
)

echo.
echo   __  __                        __  __               _   ___
echo  ^|  \/  ^|___ _ __  ___ _ _ _  _^|  \/  ^|__ _ _ __    /_\ ^|_ _^|
echo  ^| ^|\/^| / -_) '  \/ _ \ '_^| ^|^| ^| ^|\/^| / _` ^| '_ \  / _ \ ^| ^|
echo  ^|_^|  ^|_\___^|_^|_^|_\___/_^|  \_, ^|_^|  ^|_\__,_^| .__/ /_/ \_\___^|
echo                          ^|__/            ^|_^|
echo             your notebook, on your machine
echo.

set "VENV_PY=.venv\Scripts\python.exe"

REM --- 1. Build the venv if it doesn't exist yet ----------------------
REM  Only the FIRST run needs a system Python; after that the app uses
REM  its own .venv, so a flaky PATH can't stop later launches.
if not exist "%VENV_PY%" (
  echo  [1/4] First-time setup - looking for Python to build the environment...
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
    echo  [X] No Python was found. Install Python 3.11 or newer from
    echo      https://www.python.org/downloads/ and tick
    echo      "Add python.exe to PATH" during setup, then run this again.
    echo.
    pause
    exit /b 1
  )
  echo        Using !PYTHON! to create the virtual environment...
  !PYTHON! -m venv .venv
  if errorlevel 1 (
    echo  [X] Could not create the virtual environment.
    pause
    exit /b 1
  )
) else (
  echo  [1/4] Using the app's virtual environment.
)

if not exist "%VENV_PY%" (
  echo  [X] The virtual environment looks incomplete - delete the .venv
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
    echo  [2/4] The app folder moved since it was installed - relinking it...
    set "NEED_INSTALL=1"
  )
)

if "!NEED_INSTALL!"=="1" (
  echo  [2/4] Installing dependencies - this can take a few minutes the first time...
  "%VENV_PY%" -m pip install --upgrade pip
  "%VENV_PY%" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo  [X] Dependency install failed. Scroll up for the error.
    pause
    exit /b 1
  )
  "%VENV_PY%" -m pip install -e .
  if errorlevel 1 (
    echo  [X] Installing the app failed. Scroll up for the error.
    pause
    exit /b 1
  )
  for %%A in ("requirements.txt") do echo %%~tA>".venv\.mm_installed"
) else (
  echo  [2/4] Dependencies already up to date - skipping install.
)

REM  pywebview is optional and only needed for the app window, so it is
REM  installed on demand rather than for everyone. Cheap after the first
REM  time - pip exits immediately when it is already present.
if defined MM_DESKTOP (
  echo        Checking desktop window support...
  "%VENV_PY%" -m pip install --quiet pywebview
  if errorlevel 1 (
    echo  [!] pywebview would not install - opening a browser tab instead.
    set "MM_DESKTOP="
  )
)

REM --- 3. First-run .env ----------------------------------------------
if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo  [3/4] Created .env from .env.example.
  )
) else (
  echo  [3/4] Configuration found.
)

REM --- 4. Launch -------------------------------------------------------
if defined MM_DESKTOP (
  echo  [4/4] Starting MemoryMap AI in its own window.
  echo        Close the app window to stop it.
  echo.
  "%VENV_PY%" -m memorymap --desktop
) else (
  echo  [4/4] Starting MemoryMap AI at http://localhost:8000
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
