@echo off
cd /d "%~dp0"
start "" http://localhost:8000/chord-trainer_v4.html
python -m http.server 8000
