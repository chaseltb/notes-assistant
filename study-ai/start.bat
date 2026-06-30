@echo off
setlocal EnableDelayedExpansion

:: ── Locate this script's directory ──────────────────────────────────────────
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "ENV_FILE=%ROOT%.env"

:: ── Load .env (skip blank lines and comments) ────────────────────────────────
if not exist "%ENV_FILE%" (
    echo [ERROR] .env not found at %ENV_FILE%
    echo         Copy .env.example to .env and fill in your values.
    pause
    exit /b 1
)

for /f "usebackq tokens=1* delims==" %%A in ("%ENV_FILE%") do (
    set "line=%%A"
    if not "!line:~0,1!" == "#" if not "!line!" == "" (
        set "%%A=%%B"
    )
)

:: ── Validate required secrets are set ───────────────────────────────────────
if "%GEMINI_API_KEY%" == "" (
    echo [ERROR] GEMINI_API_KEY is not set in .env
    pause
    exit /b 1
)
if "%GEMINI_API_KEY%" == "your_gemini_api_key" (
    echo [ERROR] GEMINI_API_KEY still has the placeholder value. Set it in .env
    pause
    exit /b 1
)

echo [OK] .env loaded and validated.

:: ── Ensure data directories exist ───────────────────────────────────────────
if not exist "%ROOT%data\markdown" mkdir "%ROOT%data\markdown"
if not exist "%ROOT%data\chunks"   mkdir "%ROOT%data\chunks"

:: ── Start backend in a new window ───────────────────────────────────────────
echo [*] Starting backend...
start "Study AI — Backend" cmd /k "cd /d "%BACKEND%" && set GEMINI_API_KEY=%GEMINI_API_KEY% && set NOTES_DIR=%NOTES_DIR% && uvicorn app:app --reload --port 8000"

:: ── Brief pause so backend starts binding before frontend hits it ─────────────
timeout /t 3 /nobreak >nul

:: ── Start frontend in a new window ──────────────────────────────────────────
echo [*] Starting frontend...
start "Study AI — Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo [*] Both servers are starting.
echo     Backend : http://localhost:8000
echo     Frontend: http://localhost:5173
echo     API docs: http://localhost:8000/docs
echo.
echo     To stop, close the two terminal windows.
echo.

:: ── Open browser after servers have a moment to start ───────────────────────
timeout /t 4 /nobreak >nul
start http://localhost:5173

pause
