@echo off
setlocal
title Nabta - Plant. Verify. Earn.
cd /d "%~dp0"

echo.
echo    Starting Nabta...
echo.

REM ------------------------------------------------------------------
REM  Prefer Python. Try the py launcher first, then the plain commands.
REM  "python" alone can be the Microsoft Store stub, which exits with an
REM  error instead of running - the errorlevel check filters that out.
REM ------------------------------------------------------------------
set "PYEXE="

py -3 -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PYEXE=py -3"
    goto :check
)

python3 -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PYEXE=python3"
    goto :check
)

python -c "import sys" >nul 2>&1
if not errorlevel 1 (
    set "PYEXE=python"
    goto :check
)

goto :fallback

REM ------------------------------------------------------------------
REM  Preflight: confirm this Python can import what the server needs and
REM  that server.py compiles. If anything is wrong we quietly use the
REM  Windows server instead of failing in front of an audience.
REM ------------------------------------------------------------------
:check
%PYEXE% -c "import http.server, socketserver, socket, threading, webbrowser; compile(open(r'%~dp0launcher\server.py','rb').read(), 'server.py', 'exec')" >nul 2>&1
if errorlevel 1 goto :fallback

%PYEXE% "%~dp0launcher\server.py"
goto :done

REM ------------------------------------------------------------------
REM  Windows PowerShell is on every Windows machine, so this path runs
REM  with nothing installed at all.
REM ------------------------------------------------------------------
:fallback
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\serve.ps1"

:done
if errorlevel 1 (
    echo.
    echo    Nabta could not start. The message above explains why.
    echo.
    pause
)
endlocal
