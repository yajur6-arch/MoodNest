@echo off
REM Double-click this file to start the assistant backend.
REM 1) Edit the four lines below once. 2) Keep this file private: it contains your API key. Never share or upload it.
cd /d "%~dp0"
set GEMINI_API_KEY=PASTE-YOUR-KEY-HERE
set CAMPUS_CONTACT=Campus counselling: add the real number
set ASSISTANT_MODEL=gemini-flash-latest
REM Optional second model used once if the first is overloaded (leave empty to turn off):
set ASSISTANT_FALLBACK_MODEL=
echo Starting the backend. Leave this window open. Close it to stop.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
