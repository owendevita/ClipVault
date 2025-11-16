![ClipVault Logo](frontend/logo.png)

# ClipVault

[![codecov - backend](https://codecov.io/gh/owendevita/ClipVault/branch/main/graph/badge.svg?flag=backend)](https://app.codecov.io/gh/owendevita/ClipVault/tree/main/backend)
[![codecov - frontend](https://codecov.io/gh/owendevita/ClipVault/branch/main/graph/badge.svg?flag=frontend)](https://app.codecov.io/gh/owendevita/ClipVault/tree/main/frontend)

## About

Secure, encrypted clipboard with history, auth, and an Electron UI.

## Contributing

We welcome contributions! Please see our [contributing guide](docs/CONTRIBUTING.md) for details.

## Quick start

Backend (FastAPI):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

Frontend (Electron):

```powershell
cd frontend
npm install
npm start
```

Tests:

```powershell
# Backend tests (64 comprehensive tests)
cd backend
# Activate virtual environment first
.\..venv\Scripts\Activate.ps1
# Run all tests
python -m pytest tests/ -v
# With coverage
python -m pytest tests/ --cov=. --cov-report=term-missing

# Frontend tests
cd ../frontend
npm test
```

## Coverage reports

Coverage (Codecov):

- Backend: https://app.codecov.io/gh/owendevita/ClipVault/tree/main/backend
- Frontend: https://app.codecov.io/gh/owendevita/ClipVault/tree/main/frontend

For more, see the [Developer Guide](docs/DEVELOPER_README.md).

Release steps: see [RELEASE.md](RELEASE.md).
