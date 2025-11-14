from fastapi import FastAPI, Body, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from clipboard import ClipboardManager
from database import ClipboardDB
from contextlib import asynccontextmanager
import uvicorn
import logging
import time
from auth import create_access_token, get_current_user, rotate_jwt_secret
from clipboard_crypto import clipboard_crypto, SecureMemory, SecureString
from secure_storage import key_manager
import os
import json

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ClipVault backend...")

    # Quick crypto self-test
    if not clipboard_crypto.verify_encryption():
        logger.error("Clipboard encryption verification failed!")
        raise Exception("Encryption system not working properly")
    
    logger.info("Encryption verification passed")
    # Clipboard monitor: disabled in tests/CI or when env says so.
    env_val = os.getenv("CLIPVAULT_DISABLE_CLIPBOARD")
    if env_val is None:
        disable_clipboard = ("PYTEST_CURRENT_TEST" in os.environ) or (os.getenv("CI", "false").lower() == "true")
    else:
        disable_clipboard = env_val == "1"

    if disable_clipboard:
        logger.info("Clipboard monitoring disabled (tests/CI or env override)")
    else:
        clipboard.start_monitoring(db)
        logger.info("Clipboard monitoring started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ClipVault backend...")
    clipboard.stop_monitoring()
    logger.info("Clipboard monitoring stopped")

# Security headers middleware
class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Wrap the send function to add security headers
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    headers = list(message.get("headers", []))
                    # Add security headers
                    headers.extend([
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"x-xss-protection", b"1; mode=block"),
                        (b"referrer-policy", b"strict-origin-when-cross-origin"),
                        (b"content-security-policy", b"default-src 'self'"),
                        (b"strict-transport-security", b"max-age=31536000; includeSubDomains")
                    ])
                    message["headers"] = headers
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)

app = FastAPI(
    lifespan=lifespan,
    title="ClipVault Secure API",
    description="Secure clipboard management with encryption",
    version="2.0.0"
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

clipboard = ClipboardManager()
db = ClipboardDB()

# CORS: default dev-friendly, configurable via env for production
allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )
else:
    # DEV fallback: allow any origin including 'null' (file://). Do NOT use in production.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[],
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,
    )

@app.get("/")
async def root():
    return {"status": "ok", "service": "ClipVault", "endpoints": ["/health", "/healthz"]}

@app.get("/ping", status_code=204)
async def ping():
    return None

@app.get("/healthz")
async def healthz():
    # Lightweight health that doesn't touch encryption/secure storage
    return {"status": "ok", "timestamp": time.time()}

@app.get("/health")
async def health_check():
    """Health with basic security status."""
    try:
        logger.info("/health requested")
        # Check encryption system
        encryption_ok = clipboard_crypto.verify_encryption()
        
        # Check secure storage
        key_info = key_manager.get_key_info()
        
        return {
            "status": "ok",
            "timestamp": time.time(),
            "security": {
                "encryption_working": encryption_ok,
                "keys_available": key_info["clipboard_key_exists"] and key_info["jwt_secret_exists"]
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Health check failed"}
        )


#@app.get("/clipboard/current")
#async def get_clipboard():
#    content = clipboard.get_clipboard_content()
#    if content:  # Only add non-empty content
#        db.add_entry(content)  # This will update both DB and text file
#    return {"content": content}

@app.post("/clipboard/set")
async def set_clipboard(request: Request, user: str = Depends(get_current_user)):
    """Set clipboard (auth). Accepts text/plain or JSON {content}."""
    try:
        raw = await request.body()
        if not raw:
            raise HTTPException(status_code=422, detail="Request body is empty")

        content_type = request.headers.get("content-type", "").lower()
        parsed_content = None

        # Try to parse based on content type
        if "application/json" in content_type:
            try:
                data = await request.json()
                # Accept either a bare JSON string or an object with content
                if isinstance(data, str):
                    parsed_content = data
                elif isinstance(data, dict) and "content" in data and isinstance(data["content"], str):
                    parsed_content = data["content"]
            except Exception as je:
                logger.warning(f"JSON parse failed for /clipboard/set: {je}")
        
        if parsed_content is None:
            # Fallback: treat as UTF-8 plain text
            try:
                parsed_content = raw.decode("utf-8")
            except Exception:
                parsed_content = raw.decode("latin-1", errors="ignore")

        if not parsed_content or not parsed_content.strip():
            raise HTTPException(status_code=422, detail="Clipboard content must be a non-empty string")

        with SecureString(parsed_content) as secure_content:
            success = clipboard.set_clipboard_content(secure_content)
            if success:
                db.add_entry(secure_content)
                logger.info(f"User {user} set clipboard content")
            return {"success": success, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to set clipboard for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to set clipboard content")

@app.get("/clipboard/history")
async def get_history(limit: int = 10, user: str = Depends(get_current_user)):
    """Get decrypted history (auth)."""
    try:
        history = db.get_history(limit)
        logger.info(f"User {user} retrieved clipboard history ({len(history)} items)")
        return {"history": history, "user": user}
    except Exception as e:
        logger.error(f"Failed to get history for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve clipboard history")

@app.delete("/clipboard/clear-history")
async def clear_history(user: str = Depends(get_current_user)):
    """Clear history (auth)."""
    try:
        result = db.clear_history()
        logger.warning(f"User {user} cleared clipboard history")
        return {"cleared": result, "user": user}
    except Exception as e:
        logger.error(f"Failed to clear history for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear clipboard history")

@app.delete("/clipboard/history/{entry_id}")
async def delete_history_entry(entry_id: int, user: str = Depends(get_current_user)):
    """Delete one history entry (auth)."""
    try:
        deleted = db.delete_entry(entry_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Entry not found")
        logger.info(f"User {user} deleted clipboard entry id={entry_id}")
        return {"deleted": True, "id": entry_id, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete entry {entry_id} for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete entry")


@app.post("/register")
def register(form_data: OAuth2PasswordRequestForm = Depends()):
    username = form_data.username
    password = form_data.password
    
    # Basic validation
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long")
    
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")
    
    try:
        db.create_user(username, password)
        logger.info(f"User registered successfully: {username}")
        return {"message": "User registered successfully"}
    except ValueError as e:
        logger.warning(f"Registration failed for {username}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error for {username}: {e}")
        raise HTTPException(status_code=500, detail="Registration failed due to server error")

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login -> JWT bearer token."""
    try:
        if not db.verify_user(form_data.username, form_data.password):
            logger.warning(f"Failed login attempt for username: {form_data.username}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_access_token({"sub": form_data.username})
        logger.info(f"Successful login for user: {form_data.username}")
        
        # Clear password from memory
        SecureMemory.clear_string(form_data.password)
        
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        SecureMemory.clear_string(form_data.password)
        raise HTTPException(status_code=500, detail="Login failed")

@app.get("/clipboard/current")
async def get_clipboard(user: str = Depends(get_current_user)):
    """Get current clipboard (auth)."""
    try:
        content = clipboard.get_clipboard_content()
    
        logger.info(f"User {user} accessed current clipboard content")
        return {"content": content, "user": user}
    except Exception as e:
        logger.error(f"Failed to get clipboard for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get clipboard content")

# Security Management Endpoints
@app.post("/admin/rotate-clipboard-key")
async def rotate_clipboard_key(user: str = Depends(get_current_user)):
    """Rotate clipboard key. Breaks old data."""
    try:
        clipboard_crypto.rotate_key()
        logger.warning(f"User {user} rotated clipboard encryption key")
        return {
            "message": "Clipboard encryption key rotated successfully",
            "warning": "All existing encrypted clipboard data is now inaccessible",
            "user": user
        }
    except Exception as e:
        logger.error(f"Failed to rotate clipboard key for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Key rotation failed")

@app.post("/admin/rotate-jwt-secret")
async def rotate_jwt_secret_endpoint(user: str = Depends(get_current_user)):
    """Rotate JWT secret. Invalidates tokens."""
    try:
        result = rotate_jwt_secret()
        logger.warning(f"User {user} rotated JWT secret key")
        result["user"] = user
        return result
    except Exception as e:
        logger.error(f"Failed to rotate JWT secret for user {user}: {e}")
        raise HTTPException(status_code=500, detail="JWT secret rotation failed")

@app.get("/admin/security-status")
async def get_security_status(user: str = Depends(get_current_user)):
    """Security status (auth)."""
    try:
        key_info = key_manager.get_key_info()
        encryption_ok = clipboard_crypto.verify_encryption()
        
        status = {
            "encryption_working": encryption_ok,
            "key_storage": key_info,
            "timestamp": time.time(),
            "user": user
        }
        
        logger.info(f"User {user} checked security status")
        return status
    except Exception as e:
        logger.error(f"Failed to get security status for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security status")

@app.get("/admin/raw-history")
async def get_raw_history(limit: int = 10, user: str = Depends(get_current_user)):
    """Raw encrypted history (auth)."""
    try:
        raw_history = db.get_raw_history(limit)
        logger.info(f"User {user} accessed raw encrypted history")
        return {"raw_history": raw_history, "user": user}
    except Exception as e:
        logger.error(f"Failed to get raw history for user {user}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get raw history")

@app.get("/preferences")
async def get_preferences(user: str = Depends(get_current_user)):
    prefs = db.get_user_preferences(user)
    return prefs

@app.post("/preferences")
async def update_preferences(preferences: dict, user: str = Depends(get_current_user)):
    import json
    logger.info(f"Updating preferences for {user}: {json.dumps(preferences)}")
    try:
        result = db.update_user_preferences(user, preferences)
        logger.info(f"Update result: {result}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Failed to update preferences for {user}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update preferences")


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    try:
        port = int(os.getenv("PORT", "8000"))
    except ValueError:
        port = 8000
    uvicorn.run(app, host=host, port=port)