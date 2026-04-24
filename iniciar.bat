@echo off
cd /d %~dp0

echo Iniciando sistema PESA...
start "" cmd /k ".venv\Scripts\activate && python -m uvicorn backend.main:app"

timeout /t 2 >nul

start http://127.0.0.1:8000