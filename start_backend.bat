@echo off
set PATH=C:\xampp\php;%PATH%
cd /d "%~dp0"

echo Starting Roicard Backend...
echo.

start "Roicard API" php artisan serve --port=8000
echo API server starting on http://localhost:8000

start "Roicard Queue" php artisan queue:work --stop-when-empty
echo Queue worker started

echo.
echo Done! Backend running at http://localhost:8000
echo Press Ctrl+C in each window to stop.
