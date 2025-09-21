import sqlite3
from datetime import datetime
import os

class ClipboardDB:
    def __init__(self, db_path="clipboard_history.db"):
        self.db_path = db_path
        # self.clear_history()
        self.init_db()

    def clear_history(self):
        if os.path.exists(self.db_path):
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('DELETE FROM clipboard_history')
            conn.commit()
            conn.close()
            return True

    def init_db(self):
        """Initialize database if it doesn't exist"""
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
        
        # Clean the content by replacing newlines with spaces if needed
        content_clean = content.strip()
        
        # Add to SQLite DB
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('INSERT INTO clipboard_history (content, timestamp) VALUES (?, ?)',
                 (content_clean, timestamp))
        print("adding " + content_clean)
        conn.commit()
        conn.close()



    def get_history(self, limit: int = 10):
        # Get clipboard history
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = c.fetchall()
        conn.close()
        return [{"id": r[0], "content": r[1], "timestamp": r[2]} for r in rows]

    def view_history(self):
        """Display history in console"""
        history = self.get_history(limit=50)
        print("\nClipboard History:")
        print("=" * 80)
        for entry in history:
            print(f"[{entry['timestamp']}] {entry['content']}")

    def view_contents(self):
        """View both database contents"""
        print("\nDatabase Contents:")
        print("=" * 80)
        
        # Show DB contents
        history = self.get_history(limit=100)
        for entry in history:
            print(f"[{entry['timestamp']}] {entry['content']}")

if __name__ == "__main__":
    db = ClipboardDB()
    db.view_history()  # Show in console
    db.view_contents()  # Show both DB and text file contents