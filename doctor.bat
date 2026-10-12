@echo off
REM ===================================================================
REM  Tessellate - check this computer (Windows)
REM
REM  The same as start.bat --doctor: prints a table of what the app
REM  needs and exits. A file of its own so it is one double-click, the
REM  owner 2026-10-11: "I just need easy ways to run the set scripts and
REM  actions". The pause keeps the window open to read the table.
REM ===================================================================
call "%~dp0start.bat" --doctor %*
pause
