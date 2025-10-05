.PHONY: all backend frontend clean

all: backend frontend

backend:
	@echo Building backend executable...
	backend\venv\Scripts\pip install -r backend\requirements.txt
	backend\venv\Scripts\python -m PyInstaller --noconsole --onefile --paths backend\venv\Lib\site-packages --hidden-import=passlib.handlers.bcrypt --name backend backend\main.py
	@echo Copying backend.exe into Electron resources...
	if not exist "frontend\resources" mkdir "frontend\resources"
	copy "dist\backend.exe" "frontend\resources\backend.exe" /Y
	@echo Backend build complete.

frontend:
	@echo Building Electron app...
	cd frontend && npm install && npm run make
	@echo Electron build complete.

clean:
	@echo Cleaning up build artifacts...
	if exist build rmdir /s /q build
	if exist dist rmdir /s /q dist
	if exist backend.spec del /q backend.spec
	if exist frontend\out rmdir /s /q frontend\out
	@echo Clean complete.
