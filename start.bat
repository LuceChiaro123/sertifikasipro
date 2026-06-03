@echo off
setlocal enabledelayedexpansion
title SertifikasiPro

:: Dapatkan direktori root dari lokasi .bat ini
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

echo.
echo  ============================================
echo    SertifikasiPro - Sistem Sertifikasi LSP
echo  ============================================
echo.

:: --------------------------------------------------------
:: [1] Deteksi Python
:: --------------------------------------------------------
echo [1/5] Mendeteksi Python...
set "PYTHON="

where python >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=2 delims= " %%V in ('python --version 2^>^&1') do set "PYVER=%%V"
    if "!PYVER:~0,1!" == "3" (
        set "PYTHON=python"
        echo       [OK] Python ditemukan ^(versi !PYVER!^)
        goto :python_ok
    )
)

where python3 >nul 2>&1
if %errorlevel% == 0 (
    set "PYTHON=python3"
    echo       [OK] Python3 ditemukan
    goto :python_ok
)

for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "C:\Python313\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\Python39\python.exe"
    "C:\Program Files\Python313\python.exe"
    "C:\Program Files\Python312\python.exe"
    "C:\Program Files\Python311\python.exe"
    "C:\Program Files\Python310\python.exe"
    "C:\Program Files\Python39\python.exe"
) do (
    if exist %%~P (
        set "PYTHON=%%~P"
        echo       [OK] Python ditemukan: %%~P
        goto :python_ok
    )
)

echo.
echo  [ERROR] Python 3.9+ tidak ditemukan!
echo  Install dari: https://www.python.org/downloads/
echo  Centang "Add Python to PATH" saat instalasi.
echo.
pause
exit /b 1
:python_ok

:: --------------------------------------------------------
:: [2] Deteksi Node.js / npm
:: --------------------------------------------------------
echo [2/5] Mendeteksi Node.js...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js / npm tidak ditemukan!
    echo  Install dari: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%V in ('npm --version') do set "NPMVER=%%V"
echo       [OK] npm v!NPMVER! ditemukan

:: --------------------------------------------------------
:: [3] Buat .env jika belum ada
:: --------------------------------------------------------
echo [3/5] Mengecek konfigurasi...
if not exist "%BACKEND%\.env" (
    echo       Membuat .env dengan konfigurasi SQLite...
    (
        echo DATABASE_URL=sqlite+aiosqlite:///./dev.db
        echo SECRET_KEY=sertifikasipro-dev-secret-key-min-32-chars-long
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=60
        echo REFRESH_TOKEN_EXPIRE_DAYS=7
        echo CORS_ORIGINS=http://localhost:5173,http://localhost:3000
        echo APP_ENV=development
        echo UPLOAD_DIR=./media
        echo MAX_FILE_SIZE_MB=5
        echo ALLOWED_EXTENSIONS=pdf,jpg,jpeg,png,docx
    ) > "%BACKEND%\.env"
    echo       [OK] .env dibuat
) else (
    echo       [OK] .env sudah ada
)

:: --------------------------------------------------------
:: [4] Install dependencies jika perlu
:: --------------------------------------------------------
echo [4/5] Mengecek dependencies...

"%PYTHON%" -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo       Menginstall backend dependencies ^(mungkin beberapa menit^)...
    "%PYTHON%" -m pip install -r "%BACKEND%\requirements.txt" --quiet --disable-pip-version-check
    if %errorlevel% neq 0 (
        echo  [ERROR] Gagal install backend dependencies!
        pause & exit /b 1
    )
    echo       [OK] Backend dependencies terinstall
) else (
    echo       [OK] Backend dependencies sudah ada
)

if not exist "%FRONTEND%\node_modules" (
    echo       Menginstall frontend dependencies ^(npm install^)...
    cd /d "%FRONTEND%"
    npm install --silent
    if %errorlevel% neq 0 (
        echo  [ERROR] Gagal install frontend dependencies!
        pause & exit /b 1
    )
    echo       [OK] Frontend dependencies terinstall
) else (
    echo       [OK] Frontend dependencies sudah ada
)

:: --------------------------------------------------------
:: [5] Inisialisasi database jika belum ada
:: --------------------------------------------------------
if not exist "%BACKEND%\dev.db" (
    echo [5/5] Membuat database baru...
    cd /d "%BACKEND%"
    "%PYTHON%" -m scripts.init_db
    if %errorlevel% neq 0 (
        echo  [ERROR] Gagal inisialisasi database!
        pause & exit /b 1
    )
    echo       Menjalankan seed data awal...
    "%PYTHON%" -m scripts.seed
    echo       Menjalankan seed akun demo...
    "%PYTHON%" -m scripts.seed_demo
    echo       [OK] Database siap
) else (
    echo [5/5] Database sudah ada [OK]
)

:: --------------------------------------------------------
:: Jalankan server
:: --------------------------------------------------------
echo.
echo  Menjalankan server...
echo.

echo  ^> Backend  ^(FastAPI^) - http://localhost:8000
start "SertifikasiPro - Backend" cmd /k "cd /d \"%BACKEND%\" && \"%PYTHON%\" -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo  ^> Frontend ^(Vite^)   - http://localhost:5173
start "SertifikasiPro - Frontend" cmd /k "cd /d \"%FRONTEND%\" && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo  ============================================
echo    Aplikasi siap digunakan!
echo.
echo    Frontend : http://localhost:5173
echo    Backend  : http://localhost:8000
echo    API Docs : http://localhost:8000/docs
echo.
echo    Akun demo:
echo    admin@sertifikasipro.id  ^|  admin123  ^(superadmin^)
echo    asesi@demo.id            ^|  demo123   ^(asesi^)
echo    asesor@demo.id           ^|  demo123   ^(asesor^)
echo    pimpinan@demo.id         ^|  demo123   ^(pimpinan^)
echo  ============================================
echo.

start "" "http://localhost:5173"

echo  Tekan sembarang tombol untuk menutup...
pause >nul
