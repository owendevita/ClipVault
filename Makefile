.PHONY: all backend frontend clean

all: backend frontend

backend:
	@echo ">>> Building backend executable..."
	backend/venv/Scripts/pip install -r backend/requirements.txt
	backend/venv/Scripts/python -m PyInstaller --noconsole --onefile --paths backend/venv/Lib/site-package --hidden-import=passlib.handlers.bcrypt --name backend backend/main.py
	@echo ">>> Copying backend.exe into Electron resources..."
	mkdir -p frontend/resources
	cp dist/backend.exe frontend/resources/
	@echo ">>> Backend build complete and copied."

frontend:
	@echo ">>> Building Electron app with Forge..."
	cd frontend && npm install && npm run make
	@echo ">>> Electron Forge build complete."

clean:
	@echo ">>> Cleaning up build artifacts..."
	rm -rf build dist backend.spec
	rm -rf frontend/out
	@echo ">>> Clean complete."
