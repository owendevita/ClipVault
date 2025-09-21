from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from clipboard import ClipboardManager
from database import ClipboardDB
from contextlib import asynccontextmanager
import uvicorn

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
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
    allow_origins=["file://", "http://localhost:*"],  # Allow Electron file:// protocol
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/clipboard/current")
async def get_clipboard():
    content = clipboard.get_clipboard_content()
    if content:  # Only add non-empty content
        db.add_entry(content) 
    return {"content": content}

@app.post("/clipboard/set")
async def set_clipboard(content: str = Body(...)):
    success = clipboard.set_clipboard_content(content)
    if success:
        db.add_entry(content)  
    return {"success": success}

@app.get("/clipboard/history")
async def get_history(limit: int = 10):
    return db.get_history(limit)

@app.delete("/clipboard/clear-history")
async def clear_history():
    return db.clear_history()

# Test endpoint for frontend connection
@app.get("/test-connection")
async def test_connection():
    return {
        "status": "connected",
        "message": "Successfully connected to ClipVault backend"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)