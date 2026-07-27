@echo off
REM ===================================================================
REM  MemoryMap AI - open in its own app window (Windows)
REM
REM  Double-click this instead of start.bat to get a real application
REM  window rather than a browser tab. Everything else is identical:
REM  the same setup, the same app, the same data.
REM
REM  The window support (pywebview) installs itself the first time. If
REM  it cannot, the app falls back to a browser tab rather than failing.
REM ===================================================================
call "%~dp0start.bat" desktop
