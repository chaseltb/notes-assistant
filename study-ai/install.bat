@echo off
echo [Study AI] First-time setup...

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Download it from https://python.org/downloads
    pause & exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Download it from https://nodejs.org
    pause & exit /b 1
)

:: Install Python deps
echo [*] Installing Python packages...
pip install -r requirements.txt
if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )

:: Install frontend deps
echo [*] Installing frontend packages...
cd frontend && npm install && cd ..
if errorlevel 1 ( echo [ERROR] npm install failed & pause & exit /b 1 )

:: Copy .env if missing
if not exist .env (
    copy .env.example .env
    echo [*] Created .env -- open it and add your GEMINI_API_KEY
)

echo.
echo [OK] Setup complete! Run start.bat to launch the app.
pause
