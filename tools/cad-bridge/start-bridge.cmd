@echo off
rem Start the local CAD bridge on THIS computer.
rem The bridge listens on 127.0.0.1:47823 only; it is never exposed to the LAN.
setlocal
set "BRIDGE_DIR=%~dp0"
set "LOG_DIR=%LOCALAPPDATA%\MechanicalDesignCadBridge"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

rem Already running (another copy or the Startup entry)? Do not start a second one.
powershell -NoProfile -Command "try { if ((Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:47823/cad-bridge/health' -TimeoutSec 2).StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  echo The local CAD bridge is already running on http://127.0.0.1:47823
  exit /b 0
)

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo Install Node.js LTS from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)

echo Starting the local CAD bridge on http://127.0.0.1:47823 ...
echo Log: %LOG_DIR%\bridge.log
"%ProgramFiles%\nodejs\node.exe" "%BRIDGE_DIR%server.mjs" >> "%LOG_DIR%\bridge.log" 2>&1
if errorlevel 1 (
  node "%BRIDGE_DIR%server.mjs" >> "%LOG_DIR%\bridge.log" 2>&1
)
endlocal
