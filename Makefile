.PHONY: all backend frontend clean

all: backend frontend

backend:
	@echo ">>> Building backend executable..."
	@echo ">>> Using workflow venv at backend/venv"
	backend/venv/Scripts/python -m pip install --upgrade pip
	backend/venv/Scripts/python -m pip install -r backend/requirements.txt
	backend/venv/Scripts/python -m pip install pyinstaller
	backend/venv/Scripts/python -m PyInstaller --noconsole --onefile --hidden-import=passlib.handlers.pbkdf2_sha256 --name backend backend/main.py
	@echo ">>> Copying backend executable into Electron resources..."
	backend/venv/Scripts/python - <<PY
import os, shutil, sys
os.makedirs('frontend/resources', exist_ok=True)
src = 'dist/backend.exe' if os.name == 'nt' else 'dist/backend'
dst = os.path.join('frontend','resources', os.path.basename(src))
shutil.copy(src, dst)
print(f'Copied {src} -> {dst}')
PY
	@echo ">>> Backend build complete and copied."

frontend:
	@echo ">>> Building Electron app with Forge..."
	cd frontend && npm install && npm run make
	@echo ">>> Electron Forge build complete."

clean:
	@echo ">>> Cleaning up build artifacts..."
	-rm -rf build dist backend.spec
	-rm -rf frontend/out
	@echo ">>> Clean complete."
