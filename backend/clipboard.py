import sqlite3
from datetime import datetime
import pyperclip
from threading import Thread
import time
from fastapi.testclient import TestClient
import pytest
from database import ClipboardDB

class ClipboardDB:
    def __init__(self, db_path="clipboard_history.db", txt_path="clipboard_history.txt"):
        self.db_path = db_path
        self.txt_path = txt_path
        self.init_db()

    def init_db(self):
        """Initialize database with clipboard_history table"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS clipboard_history
            (id INTEGER PRIMARY KEY AUTOINCREMENT,
             content TEXT NOT NULL,
             timestamp TEXT NOT NULL)
        ''')
        conn.commit()
        conn.close()

    def add_entry(self, content: str):
        """Add new clipboard entry to both DB and text file"""
        timestamp = datetime.now().isoformat()
        
        # Add to SQLite DB
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('INSERT INTO clipboard_history (content, timestamp) VALUES (?, ?)',
                 (content, timestamp))
        conn.commit()
        conn.close()

        # Add to text file
        with open(self.txt_path, "a", encoding='utf-8') as f:
            f.write(f"[{timestamp}] {content}\n")

    def get_history(self, limit: int = 10):
        """Get clipboard history from DB"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = c.fetchall()
        conn.close()
        return [{"id": r[0], "content": r[1], "timestamp": r[2]} for r in rows]

    def view_text_history(self):
        """Print text file history to console"""
        try:
            with open(self.txt_path, "r", encoding='utf-8') as f:
                print("\nClipboard History:")
                print("-" * 80)
                print(f.read())
        except FileNotFoundError:
            print("No clipboard history found")

class ClipboardManager:
    def __init__(self):
        self.last_copied = None
        self.running = True
        self.monitor_thread = Thread(target=self._monitor_clipboard)
        self.monitor_thread.daemon = True
        self.db = None

    def _monitor_clipboard(self):
        """Monitor clipboard for changes"""
        while self.running:
            try:
                current_content = pyperclip.paste()
                if current_content != self.last_copied and current_content.strip():
                    self.last_copied = current_content
                    if self.db:
                        self.db.add_entry(current_content)
            except Exception as e:
                print(f"Error monitoring clipboard: {str(e)}")
            time.sleep(1)

    def get_clipboard_content(self):
        """Get current clipboard content"""
        try:
            return pyperclip.paste()
        except Exception as e:
            print(f"Error accessing clipboard: {str(e)}")
            return None

    def set_clipboard_content(self, content: str):
        """Set clipboard content"""
        try:
            pyperclip.copy(content)
            return True
        except Exception as e:
            print(f"Error setting clipboard: {str(e)}")
            return False

    def start_monitoring(self, db):
        """Start clipboard monitoring"""
        self.db = db
        self.monitor_thread.start()

    def stop_monitoring(self):
        """Stop clipboard monitoring"""
        self.running = False

def run_tests():
    """Run clipboard tests"""
    from main import app
    
    print("\nRunning ClipVault Tests:")
    print("=" * 80)
    
    # Initialize test components
    cm = ClipboardManager()
    db = ClipboardDB()
    client = TestClient(app)
    
    # Test clipboard operations
    test_content = "Test ClipVault Content"
    assert cm.set_clipboard_content(test_content) == True, "Failed to set clipboard content"
    assert cm.get_clipboard_content() == test_content, "Failed to get clipboard content"
    
    # Test database operations
    db.add_entry(test_content)
    history = db.get_history(limit=1)
    assert len(history) > 0, "No history entries found"
    assert history[0]["content"] == test_content, "History content mismatch"
    
    # Test API endpoints
    response = client.get("/health")
    assert response.status_code == 200, "Health check failed"
    assert response.json() == {"status": "ok"}, "Invalid health status"
    
    test_content = "API Test Content"
    response = client.post("/clipboard/set", json={"content": test_content})
    assert response.status_code == 200, "Set clipboard failed"
    assert response.json()["success"] == True, "Set clipboard unsuccessful"
    
    print("All tests passed successfully!")

if __name__ == "__main__":
    # Test viewing history
    db = ClipboardDB()
    db.view_text_history()
    
    run_tests()