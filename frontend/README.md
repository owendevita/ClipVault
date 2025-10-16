# Frontend (Electron)

## Prerequisites

- Node.js 18+ and npm
- Backend running at http://127.0.0.1:8000

## Install

```powershell
# From the frontend folder
npm install
```

## Run

```powershell
npm start
```

Loads `login.html`; renderer calls backend via `preload.js` at `http://127.0.0.1:8000`.

## Package

```powershell
npm run package
# or
npm run make
```

Outputs land in `out/`.

## Config

- Backend URL is currently hard-coded in `preload.js` (API_URL). If you change the backend host/port, update it there.
- Electron Forge config lives in `forge.config.js`.

## Tests

Run tests:

```powershell
npm test
```
Jest uses `jsdom` (set in `package.json`).
