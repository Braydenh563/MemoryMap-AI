@echo off
REM ===================================================================
REM  MemoryMap AI - one-click launcher for Windows
REM
REM  Double-click this file (or run `start.bat` in a terminal) and it
REM  will set everything up the first time, then just run the app on
REM  every launch after that:
REM
REM    1. create a virtual environment (.venv) if one isn't there yet
REM    2. install / update the Python dependencies + the app itself
REM    3. copy .env.example to .env the first time
REM    4. start the server and open your browser at http://localhost:8000
REM
REM  Nothing here talks to the cloud - it's the same offline app,
REM  just without you having to remember the commands.
REM ===================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo  ==========================================
echo   MemoryMap AI - starting up
echo  ==========================================
echo.

REM --- 1. Find a Python -------------------------------------------------
set "PYTHON="
where py >nul 2>nul && set "PYTHON=py -3"
if not defined PYTHON (
  where python >nul 2>nul && set "PYTHON=python"
)
if not defined PYTHON (
  echo  [X] Python was not found on your PATH.
  echo      Install Python 3.11+ from https://www.python.org/downloads/
  echo      and tick "Add python.exe to PATH" during setup, then run this again.
  echo.
  pause
  exit /b 1
)
echo  [1/4] Using Python: %PYTHON%

REM --- 2. Create the virtual environment if it's missing ---------------
if not exist ".venv\Scripts\python.exe" (
  echo  [2/4] Creating virtual environment (.venv) - one-time setup...
  %PYTHON% -m venv .venv
  if errorlevel 1 (
    echo  [X] Could not create the virtual environment.
    pause
    exit /b 1
  )
) else (
  echo  [2/4] Virtual environment found.
)

set "VENV_PY=.venv\Scripts\python.exe"

REM --- 3. Install / update dependencies -------------------------------
REM  A tiny marker file lets us skip the (slow) reinstall on every launch
REM  unless requirements.txt has changed since the last successful install.
set "NEED_INSTALL=1"
if exist ".venv\.mm_installed" (
  for %%A in ("requirements.txt") do set "REQ_TIME=%%~tA"
  set /p LAST_TIME=<".venv\.mm_installed"
  if "!REQ_TIME!"=="!LAST_TIME!" set "NEED_INSTALL=0"
)

if "!NEED_INSTALL!"=="1" (
  echo  [3/4] Installing dependencies - this can take a few minutes the first time...
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
  echo  [3/4] Dependencies already up to date - skipping install.
)

REM --- 4. First-run .env ----------------------------------------------
if not exist ".env" (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
    echo        Created .env from .env.example.
  )
)

REM --- 5. Launch -------------------------------------------------------
echo  [4/4] Starting MemoryMap AI at http://localhost:8000
echo        (opening your browser in a moment; close this window to stop)
echo.

REM  Give the server a second to bind, then open the browser.
start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:8000"

"%VENV_PY%" -m memorymap

echo.
echo  MemoryMap AI has stopped.
pause
endlocal
