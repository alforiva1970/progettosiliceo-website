@echo off
title Silicea Kernel Knowledge Graph Viewer
echo ============================================================
echo  Starting local web server for Silicea Kernel Knowledge Graph
echo  Opening http://localhost:8000 in your default browser...
echo ============================================================
echo.
start http://localhost:8000
python -m http.server 8000
pause
