# Release (minimal)

1. Bump versions
   - frontend/package.json: "version"
   - backend: optional tag only
2. Clean & test
   - Backend: `python -m pytest -q`
   - Frontend: `npm test`
3. Build artifacts
   - Frontend: `npm run make` (Electron Forge)
4. Tag and push
   - `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   - `git push --tags`
5. Draft GitHub Release
   - Attach artifacts from `frontend/out/make/`
