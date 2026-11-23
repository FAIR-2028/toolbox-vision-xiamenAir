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
where python >nul 2>nul
if errorlevel 1 (
 echo Python 3.11 or newer is required for local CPU ONNX inference.
 echo Docker users can skip local Python installation and run docker compose up --build -d.
 pause
 exit /b 1
)
if not exist .venv-yolo\Scripts\python.exe (
 echo Creating the CPU ONNX environment...
 python -m venv .venv-yolo
 if errorlevel 1 exit /b 1
 .venv-yolo\Scripts\python.exe -m pip install -r requirements-onnx.txt
 if errorlevel 1 exit /b 1
)
if not exist node_modules call npm.cmd ci
if errorlevel 1 exit /b 1
if not exist .next\standalone\server.js call npm.cmd run build
if errorlevel 1 exit /b 1
set ANALYSIS_MODE=yolo
set YOLO_BACKEND=cpu
set YOLO_PROJECT_ROOT=%CD%
set YOLO_PYTHON=%CD%\.venv-yolo\Scripts\python.exe
set YOLO_MODEL_PATH=%CD%\models\empty-slot-yolo11n.onnx
echo Open http://127.0.0.1:3002 after Ready appears.
call npm.cmd start
pause
