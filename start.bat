@echo off
title SertifikasiPro

echo ============================================
echo   SertifikasiPro - Starting Servers...
echo ============================================
echo.

echo [1/2] Starting Backend (FastAPI - port 8000)...
start "SertifikasiPro Backend" cmd /k "cd /d D:\ClaudeCode\CapstoneProject\sertifikasipro\backend && "C:\Program Files\Python310\python.exe" -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (Vite - port 5173)...
start "SertifikasiPro Frontend" cmd /k "cd /d D:\ClaudeCode\CapstoneProject\sertifikasipro\frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   Servers are running!
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo   API Docs : http://localhost:8000/docs
echo ============================================
echo.

start "" "http://localhost:5173"

echo Press any key to close this window...
pause >nul
