# ClipVault Backend

## Setup and Running

### Install Dependencies
```powershell
pip install fastapi uvicorn pyperclip pytest
```

### Run Backend Server
To start the ClipVault backend server:
```powershell
python main.py
```
The server will run at `http://127.0.0.1:8000`

### Running Tests
To run all tests:
```powershell
python tests/run_tests.py
```
Or using pytest directly:
```powershell
python -m pytest tests -v
```

### Viewing Database Contents
The clipboard history is stored in two formats:

1. SQLite Database (`clipboard_history.db`)
   - Use any SQLite viewer like DB Browser for SQLite
   - Contains structured data with timestamps

2. Text File (`clipboard_history.txt`)
   - Human-readable format
   - Updated in real-time with clipboard changes
   - View using:
     ```powershell
     type clipboard_history.txt
     ```