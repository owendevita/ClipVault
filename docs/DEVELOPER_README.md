# ClipVault Developer Guide

Everything you need to run, develop, and test the app locally.

## Overview

- Backend: FastAPI (Python), local SQLite files (`clipboard_history.db`, `clipboard_history.txt`)
- Frontend: Electron Forge app (Node.js)
- Frontend talks to backend at `http://127.0.0.1:8000`

## Prerequisites

- Windows (project targeted, but Electron is cross‑platform)
- Python 3.11+
- Node.js 18+ and npm

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
python main.py
```

### Tests

```powershell
python -m pytest tests -v
```

### Useful files

- `database.py`, `clipboard.py`, `auth.py`, `main.py`
- Data files: `clipboard_history.db`, `clipboard_history.txt`

## Frontend setup

```powershell
cd frontend
npm install
npm start
```

Electron opens and loads `home.html`. The preload script calls the backend at `http://127.0.0.1:8000`.

### Packaging

```powershell
npm run package
# or
npm run make
```

### Frontend tests (Jest + jsdom)

Install dev dependencies (first time):

```powershell
cd frontend
npm install --save-dev jest @jest/globals jest-environment-jsdom
```

Run tests:

```powershell
npm test
```

`package.json` configures Jest to use the `jsdom` test environment.

## Common development tasks

- Change backend port: update `uvicorn.run` in `backend/main.py` and the `API_URL` in `frontend/preload.js`.
- Add new API endpoint: implement in `backend/main.py`, add logic in `frontend/preload.js`, and call from your UI pages.
- Update dependencies: backend in `backend/requirements.txt`, frontend in `frontend/package.json`.

## Troubleshooting

- ModuleNotFoundError (e.g., passlib): ensure venv is active and `pip install -r requirements.txt` ran.
- Electron fails to start: check Node version, run `npm install` again, and check `electron` version in `frontend/package.json`.
- Backend connection errors from frontend: confirm backend is running and `API_URL` is correct in `preload.js`.
