# ClipVault Frontend (Electron)

Electron Forge app that provides the UI and talks to the FastAPI backend.

## Prerequisites

- Node.js 18+ and npm
- Backend running at http://127.0.0.1:8000

## Install

```powershell
# From the frontend folder
npm install
```

## Run (development)

```powershell
npm start
```

This launches Electron and loads `home.html`. The renderer uses `preload.js` to call the backend at `http://127.0.0.1:8000`.

## Package (distributables)

```powershell
npm run package
# or
npm run make
```

Artifacts will be created under `out/`.

## Configuration notes

- Backend URL is currently hard-coded in `preload.js` (API_URL). If you change the backend host/port, update it there.
- Electron Forge config lives in `forge.config.js`.

## Tests (Jest + jsdom)

We use Jest with the jsdom environment for frontend/renderer tests.

Install dev deps (first time):

```powershell
npm install --save-dev jest @jest/globals jest-environment-jsdom
```

Run tests:

```powershell
npm test
```

Jest is configured to use `jsdom` via the `jest` field in `package.json`.
