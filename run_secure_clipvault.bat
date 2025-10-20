@echo off
REM Change to repo backend directory relative to this script location
cd /d "%~dp0backend"

REM Pick a Python interpreter: prefer backend venv, then repo venv, else system python
set "PYEXE=python"
if exist ".venv\Scripts\python.exe" set "PYEXE=.venv\Scripts\python.exe"
if not exist ".venv\Scripts\python.exe" if exist "%~dp0.venv\Scripts\python.exe" set "PYEXE=%~dp0.venv\Scripts\python.exe"

"%PYEXE%" main.py
pause