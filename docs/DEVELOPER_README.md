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
# Comprehensive test suite (64 tests, 82% coverage)\npython -m pytest tests/ --cov=. --cov-report=term-missing -v\n\n# Quick run (summary only)\npython -m pytest tests/ -q\n\n# Specific test categories\npython -m pytest tests/test_security.py -v     # Security tests (13)\npython -m pytest tests/test_crypto.py -v       # Encryption tests (7)\npython -m pytest tests/test_database_advanced.py -v  # Database tests (11)
```

**Test Categories:**
- **Security**: JWT validation, XSS prevention, brute force protection, timing attacks
- **Cryptography**: Encryption/decryption, key rotation, performance benchmarking  
- **Database**: User data isolation, SQL injection prevention, concurrent access
- **API**: Input validation, rate limiting, error handling, Unicode support
- **Integration**: End-to-end workflows, multi-user scenarios, system limits

Key files: `main.py`, `database.py`, `clipboard.py`, `auth.py`, `clipboard_crypto.py`.

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
