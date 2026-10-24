@echo off
REM Double-click this file to start the assistant backend.
REM 1) Edit the four lines below once. 2) Keep this file private: it contains your API key. Never share or upload it.
cd /d "%~dp0"
set GEMINI_API_KEY=AQ.Ab8RN6Jx1KkfkTIutLiEo3sJ4BezXiHBVYUu_08aLqOydcvGHQ
set DEV_TOKEN=yaj1102
set ASSISTANT_MODEL=gemini-3.8-flash-lite-tts
echo Starting the backend. Leave this window open. Close it to stop.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
