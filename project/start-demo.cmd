@echo off
cd /d "%~dp0"
set HOSTNAME=127.0.0.1
set PORT=3002
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is required. Install Node.js LTS first.
 pause
 exit /b 1
)
if not exist node_modules call npm.cmd ci
if errorlevel 1 exit /b 1
if not exist .next\standalone\server.js call npm.cmd run build
if errorlevel 1 exit /b 1
echo Open http://127.0.0.1:3002 after Ready appears.
call npm.cmd start
pause
