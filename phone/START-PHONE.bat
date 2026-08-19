@echo off
title Nabta on your phone
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo   Node.js was not found.
    echo   Install it from https://nodejs.org and run this again.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0phone.ps1"
