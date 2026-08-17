@echo off
title MemoryMap AI - Uninstall
REM ===================================================================
REM  MemoryMap AI - uninstaller for Windows
REM
REM  Removes the virtual environment (.venv) that start.bat built, so
REM  the app stops being runnable from this folder. Your notes live in
REM  a separate data directory and are NEVER touched unless you
REM  explicitly pass --delete-data.
REM
REM  Usage:
REM    uninstall.bat                 Remove .venv, keep your notes
REM    uninstall.bat --delete-data   Also delete your notes (asks first)
REM    uninstall.bat --yes           Skip the "are you sure" prompts
REM
REM  This script does not delete the project folder itself (the source
REM  code and this script). Delete the folder by hand afterwards if you
REM  want it gone completely - re-running start.bat at any point
REM  rebuilds .venv and picks up right where you left off, notes
REM  included.
REM ===================================================================

setlocal enabledelayedexpansion
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
cd /d "%~dp0"

set "DELETE_DATA=0"
set "ASSUME_YES=0"
for %%A in (%*) do (
  if /i "%%A"=="--delete-data" set "DELETE_DATA=1"
  if /i "%%A"=="--yes" set "ASSUME_YES=1"
  if /i "%%A"=="-y" set "ASSUME_YES=1"
)

echo !ESC![1;38;5;73mMemoryMap AI - uninstall!ESC![0m
echo.

REM --- Where the data actually is --------------------------------------
set "DATA_DIR=data"
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%K in (`findstr /b "MEMORYMAP_DATA_DIR=" ".env"`) do set "DATA_DIR=%%L"
)

REM --- 1. Remove the virtual environment --------------------------------
if exist ".venv" (
  set "DOIT=%ASSUME_YES%"
  if "!DOIT!"=="0" (
    set /p "REPLY=Remove the .venv folder (all installed dependencies)? [y/N] "
    if /i "!REPLY!"=="y" set "DOIT=1"
  )
  if "!DOIT!"=="1" (
    rmdir /s /q ".venv"
    echo  !ESC![1;38;5;73m[done]!ESC![0m Removed .venv.
  ) else (
    echo  !ESC![1;33m[skipped]!ESC![0m .venv left in place.
  )
) else (
  echo  !ESC![1;38;5;73m[skip]!ESC![0m No .venv found - nothing to remove there.
)

REM --- 2. Your notes: opt-in only, asked again even with --yes unless -----
REM        --delete-data was passed explicitly. A stray "uninstall" is not
REM        consent to lose a notebook.
if "%DELETE_DATA%"=="1" (
  if exist "%DATA_DIR%" (
    echo.
    echo  !ESC![1;31mThis deletes your notes, documents, images and settings in:!ESC![0m
    echo    %CD%\%DATA_DIR%
    set /p "REPLY=Type DELETE to confirm: "
    if "!REPLY!"=="DELETE" (
      rmdir /s /q "%DATA_DIR%"
      echo  !ESC![1;38;5;73m[done]!ESC![0m Deleted %DATA_DIR%.
    ) else (
      echo  !ESC![1;33m[skipped]!ESC![0m Data left in place - confirmation text didn't match.
    )
  ) else (
    echo  !ESC![1;38;5;73m[skip]!ESC![0m No data directory found at %DATA_DIR%.
  )
) else (
  echo  !ESC![1;38;5;73m[kept]!ESC![0m Your notes in '%DATA_DIR%' were left untouched ^(pass --delete-data to remove them^).
)

echo.
echo  Uninstall finished. This folder's source code is still here -
echo  delete it by hand if you want it fully gone, or run start.bat
echo  any time to reinstall and pick up right where you left off.
pause
endlocal
