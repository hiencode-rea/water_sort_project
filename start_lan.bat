@echo off
title Water Sort Puzzle - LAN Server
color 0A

echo ================================================
echo   WATER SORT PUZZLE - AI SOLVER (LAN MODE)
echo ================================================
echo.

:: Mo port 5000 tren Firewall (can quyen Admin)
echo [1/3] Opening Windows Firewall port 5000...
netsh advfirewall firewall add rule name="WaterSort-Flask-5000" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1
if %errorlevel% equ 0 (
    echo       Port 5000 opened successfully!
) else (
    echo       [!] Run as Administrator to open firewall port.
    echo           Or manually allow port 5000 in Windows Firewall.
)
echo.

:: Hien thi IP LAN
echo [2/3] Your network interfaces:
ipconfig | findstr /i "IPv4"
echo.
echo       Share the Wi-Fi/LAN IP above with other devices.
echo.

:: Khoi dong Flask server
echo [3/3] Starting Flask server on 0.0.0.0:5000...
echo       Press Ctrl+C to stop.
echo.
cd /d "%~dp0backend"
python app.py

pause

</new_text>