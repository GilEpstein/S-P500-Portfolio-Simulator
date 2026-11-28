@echo off
cd /d "%~dp0"
start "" http://localhost:8000/chord-trainer_v8.html
python -m http.server 8000
