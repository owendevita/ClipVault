import sqlite3
import threading
from datetime import datetime
import os
import logging
from passlib.context import CryptContext
from clipboard_crypto import clipboard_crypto, SecureMemory, SecureString
import json

from passlib.context import CryptContext

# Password hashing (pbkdf2_sha256)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
logger = logging.getLogger(__name__)

class ClipboardDB:
    def __init__(self, db_path="clipboard_history.db"):
        # Test/CI mode?
        self._test_mode = (os.getenv("PYTEST_CURRENT_TEST") is not None) or (os.getenv("CI", "false").lower() == "true")
        self.db_path = db_path
        # Serialize DB access
        self._lock = threading.RLock()
        # Single shared connection for app lifetime
        if self._test_mode:
            # In-memory DB for tests to avoid Windows file locks
            self._conn = sqlite3.connect(":memory:", timeout=10, check_same_thread=False)
        else:
            # Use absolute path to avoid relative path issues in packaged apps
            abs_db_path = os.path.abspath(self.db_path)
            self._conn = sqlite3.connect(abs_db_path, timeout=30, check_same_thread=False)
        try:
            c = self._conn.cursor()
            c.execute("PRAGMA journal_mode=WAL;")
            c.execute("PRAGMA synchronous=NORMAL;")
            c.execute("PRAGMA busy_timeout=5000;")
            c.execute("PRAGMA foreign_keys=ON;")
            self._conn.commit()
        except Exception:
            pass
        # Initialize schema
        self.init_db()

    def _connect(self):
        """Return shared SQLite connection."""
        return self._conn

    def clear_history(self):
        if os.path.exists(self.db_path):
            with self._lock:
                conn = self._connect()
                c = conn.cursor()
                c.execute('DELETE FROM clipboard_history')
                conn.commit()
                return True

    def init_db(self):
        """Initialize database if it doesn't exist"""
        with self._lock:
            conn = self._connect()
            c = conn.cursor()
            c.execute('''
                CREATE TABLE IF NOT EXISTS clipboard_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                )
            ''')

            c.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    preferences TEXT DEFAULT '{}'
                )
            ''')

            c.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in c.fetchall()]
            if 'preferences' not in columns:
                c.execute("ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'")
            
            conn.commit()

    def add_entry(self, content: str):
        """Add encrypted clipboard entry."""
        timestamp = datetime.now().isoformat()
        
        try:
            # Secure string wrapper
            with SecureString(content.strip()) as content_clean:
                # Encrypt before storing
                encrypted_content = clipboard_crypto.encrypt_content(content_clean)
                
                # Write row
                with self._lock:
                    conn = self._connect()
                    c = conn.cursor()
                    c.execute('INSERT INTO clipboard_history (content, timestamp) VALUES (?, ?)',
                             (encrypted_content, timestamp))
                    
                    logger.info(f"Added encrypted clipboard entry at {timestamp}")
                    conn.commit()
                
                # Clear temp
                SecureMemory.clear_string(encrypted_content)
                
        except Exception as e:
            logger.error(f"Failed to add encrypted clipboard entry: {e}")
            # Note: Avoiding aggressive memory clearing during development/testing
            raise

    def get_history(self, limit: int = 10):
        """Get decrypted history list."""
        try:
            with self._lock:
                conn = self._connect()
                c = conn.cursor()
                c.execute('SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?', (limit,))
                rows = c.fetchall()
            
            # Decrypt content for each row
            decrypted_history = []
            for r in rows:
                try:
                    # Decrypt
                    decrypted_content = clipboard_crypto.decrypt_content(r[1])
                    decrypted_history.append({
                        "id": r[0], 
                        "content": decrypted_content, 
                        "timestamp": r[2]
                    })
                    # Note: keep decrypted_content for response
                except Exception as e:
                    logger.error(f"Failed to decrypt clipboard entry {r[0]}: {e}")
                    # Skip corrupted entries
                    continue
            
            return decrypted_history
            
        except Exception as e:
            logger.error(f"Failed to get clipboard history: {e}")
            raise

    def view_history(self):
        """Print decrypted history (debug)."""
        try:
            history = self.get_history(limit=50)
            print("\nDecrypted Clipboard History:")
            print("=" * 80)
            for entry in history:
                # Use secure context for displaying
                with SecureString(entry['content']) as content:
                    print(f"[{entry['timestamp']}] {content}")
        except Exception as e:
            logger.error(f"Failed to view history: {e}")

    def view_contents(self):
        """Print decrypted DB contents (debug)."""
        try:
            print("\nDecrypted Database Contents:")
            print("=" * 80)
            
            # Show decrypted DB contents
            history = self.get_history(limit=100)
            for entry in history:
                with SecureString(entry['content']) as content:
                    print(f"[{entry['timestamp']}] {content}")
        except Exception as e:
            logger.error(f"Failed to view contents: {e}")
    
    def get_raw_history(self, limit: int = 10):
        """Raw encrypted history (debug/admin)."""
        with self._lock:
            conn = self._connect()
            c = conn.cursor()
            c.execute('SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?', (limit,))
            rows = c.fetchall()
            return [{"id": r[0], "encrypted_content": r[1], "timestamp": r[2]} for r in rows]

    def delete_entry(self, entry_id: int) -> bool:
        """Delete one entry by id."""
        try:
            with self._lock:
                conn = self._connect()
                c = conn.cursor()
                c.execute('DELETE FROM clipboard_history WHERE id = ?', (entry_id,))
                deleted = (c.rowcount or 0) > 0
                conn.commit()
            logger.info(f"Deleted clipboard entry id={entry_id}: {deleted}")
            return deleted
        except Exception as e:
            logger.error(f"Failed to delete clipboard entry {entry_id}: {e}")
            raise
    
    def create_user(self, username: str, password: str):
        """Create user (hashed password)."""
        password_hash = pwd_context.hash(password)
        with self._lock:
            conn = self._connect()
            c = conn.cursor()
            try:
                c.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, password_hash))
                conn.commit()
            except sqlite3.IntegrityError as e:
                if "UNIQUE constraint failed" in str(e):
                    raise ValueError("Username already exists")
                else:
                    raise ValueError(f"Database error: {e}")

    def verify_user(self, username: str, password: str) -> bool:
        """Verify username/password."""
        with self._lock:
            conn = self._connect()
            c = conn.cursor()
            c.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
            row = c.fetchone()
        if row:
            return pwd_context.verify(password, row[0])
        return False

    def get_user_preferences(self, username):
        with self._lock:
            conn = self._connect()
            c = conn.cursor()
            c.execute("SELECT preferences FROM users WHERE username = ?", (username,))
            row = c.fetchone()
            if not row:
                return {}
            try:
                return json.loads(row[0] or "{}")
            except json.JSONDecodeError:
                return {}

    def update_user_preferences(self, username, prefs: dict):
        with self._lock:
            conn = self._connect()
            c = conn.cursor()
            c.execute("UPDATE users SET preferences = ? WHERE username = ?",
                    (json.dumps(prefs), username))
            conn.commit()

if __name__ == "__main__":
    db = ClipboardDB()
    db.view_history()  # Show in console
    db.view_contents()  # Show both DB and text file contents