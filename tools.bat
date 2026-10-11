@echo off
REM ===================================================================
REM  Tessellate - every launcher action in one menu (Windows)
REM
REM  The owner, 2026-10-11: "I just need easy ways to run the set scripts
REM  and actions". Each choice runs the launcher flag documented in
REM  start.bat --help, so there is one implementation of each action.
REM ===================================================================
:menu
echo.
echo Tessellate tools
echo   1  Start in a browser tab
echo   2  Start in its own window
echo   3  Check this computer - doctor
echo   4  Reinstall the app's Python environment
echo   5  Open the launcher logs
echo   6  Make a desktop shortcut
echo   7  Show the version
echo   8  Uninstall
echo   Q  Quit
choice /c 12345678Q /n /m "Choose: "
if errorlevel 9 exit /b 0
if errorlevel 8 goto uninstall
if errorlevel 7 goto version
if errorlevel 6 goto shortcut
if errorlevel 5 goto logs
if errorlevel 4 goto reinstall
if errorlevel 3 goto doctor
if errorlevel 2 goto desktop
goto start
:start
call "%~dp0start.bat"
exit /b %errorlevel%
:desktop
call "%~dp0start-desktop.bat"
exit /b %errorlevel%
:doctor
call "%~dp0start.bat" --doctor
goto menu
:reinstall
call "%~dp0reinstall.bat"
exit /b %errorlevel%
:logs
call "%~dp0start.bat" --logs
goto menu
:shortcut
call "%~dp0start.bat" --shortcut
goto menu
:version
call "%~dp0start.bat" --version
goto menu
:uninstall
call "%~dp0uninstall.bat"
exit /b %errorlevel%
