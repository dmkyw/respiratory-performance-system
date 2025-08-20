@echo off
echo Starting HTTP Server on port 8000...
cd /d "%~dp0"
python -m http.server 8000
pause