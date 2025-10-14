from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import logging
from secure_storage import key_manager
from clipboard_crypto import SecureMemory

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
logger = logging.getLogger(__name__)

def _get_secret_key() -> str:
    """Get JWT secret key from secure storage"""
    secret = key_manager.get_jwt_secret()
    if not secret:
        logger.error("JWT secret key not found in secure storage")
        raise HTTPException(status_code=500, detail="Authentication configuration error")
    return secret

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token using secure key from storage"""
    try:
        secret_key = _get_secret_key()
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
        
        # Clear secret key from memory
        SecureMemory.clear_string(secret_key)
        
        return encoded_jwt
    except Exception as e:
        logger.error(f"Failed to create access token: {e}")
        raise HTTPException(status_code=500, detail="Token creation failed")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate JWT token using secure key from storage"""
    try:
        secret_key = _get_secret_key()
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        # Clear secret key from memory
        SecureMemory.clear_string(secret_key)
        
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        raise HTTPException(status_code=500, detail="Authentication error")

def rotate_jwt_secret():
    """Rotate JWT secret key (will invalidate all existing tokens)"""
    try:
        logger.warning("Rotating JWT secret key - all existing tokens will be invalidated")
        key_manager.rotate_jwt_secret()
        return {"message": "JWT secret key rotated successfully", "warning": "All existing tokens are now invalid"}
    except Exception as e:
        logger.error(f"Failed to rotate JWT secret: {e}")
        raise HTTPException(status_code=500, detail="Key rotation failed")