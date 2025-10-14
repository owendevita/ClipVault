# Developer Guide

Concise steps to run, test, and package.

## Prereqs

- Windows/macOS/Linux, Python 3.11+, Node.js 18+.

## Backend

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Tests + coverage:

```powershell
python -m pytest --cov=. --cov-report=term-missing -q
```

Key files: `main.py`, `database.py`, `clipboard.py`, `auth.py`.

## Frontend

```powershell
cd frontend
npm install
npm start
```

Tests + coverage:

```powershell
npm test -- --coverage
```

Package:

```powershell
npm run package
# or
npm run make
```

## Coverage (Codecov)

CI uploads backend `coverage.xml` and frontend `lcov.info`. Badges in the root README auto-update for this public repo.

## Tips

- Backend URL lives in `frontend/preload.js` (API_URL).
- Clipboard monitoring is disabled in tests/CI.
- If you make new endpoints, add tests and update the preload bridge.
