@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Bitacora E.E. - MiBus Panama

where powershell.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar.ps1"
) else (
    echo [ERROR] No se encontro powershell.exe en el sistema.
    pause
)
