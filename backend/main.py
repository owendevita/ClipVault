from fastapi import FastAPI, Body, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from clipboard import ClipboardManager
from database import ClipboardDB
from contextlib import asynccontextmanager
import uvicorn
from auth import create_access_token, get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.clear_history()
    clipboard.start_monitoring(db)
    yield
    # Shutdown
    clipboard.stop_monitoring()

app = FastAPI(lifespan=lifespan)
clipboard = ClipboardManager()
db = ClipboardDB()

# Update CORS to allow Electron specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["file://", "null", "http://localhost*", "http://127.0.0.1:5500"],  # Allow Electron file:// protocol
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

#@app.get("/clipboard/current")
#async def get_clipboard():
#    content = clipboard.get_clipboard_content()
#    if content:  # Only add non-empty content
#        db.add_entry(content)  # This will update both DB and text file
#    return {"content": content}

@app.post("/clipboard/set")
async def set_clipboard(content: str = Body(...)):
    success = clipboard.set_clipboard_content(content)
    if success:
        db.add_entry(content)  # This will update both DB and text file
    return {"success": success}

@app.get("/clipboard/history")
async def get_history(limit: int = 10):
    return db.get_history(limit)

# Add a test endpoint for frontend connection
@app.get("/test-connection")
async def test_connection():
    return {
        "status": "connected",
        "message": "Successfully connected to ClipVault backend"
    }

@app.post("/register")
def register(form_data: OAuth2PasswordRequestForm = Depends()):
    username = form_data.username
    password = form_data.password
    try:
        db.create_user(username, password)
        return {"message": "User registered successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Username already exists")

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not db.verify_user(form_data.username, form_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": form_data.username})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/clipboard/current")
async def get_clipboard(user: str = Depends(get_current_user)):
    content = clipboard.get_clipboard_content()
    if content:
        db.add_entry(content)
    return {"content": content, "user": user}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)