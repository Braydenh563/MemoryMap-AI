@echo off
REM ===================================================================
REM  Tessellate - reinstall (Windows)
REM
REM  The same as start.bat --reinstall: rebuilds the app's Python
REM  environment (.venv) from scratch, then starts the app. Notes,
REM  settings and models live in the data folder and are not touched.
REM  Asks first; --yes skips the question.
REM ===================================================================
if /i "%~1"=="--yes" goto go
echo This rebuilds Tessellate's Python environment, then starts the app.
echo Your notes and settings are not touched.
choice /c YN /n /m "Continue? [Y/N] "
if errorlevel 2 goto cancelled
:go
call "%~dp0start.bat" --reinstall
exit /b %errorlevel%
:cancelled
echo Nothing changed.
pause
