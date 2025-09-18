import sqlite3
from datetime import datetime
import os

class ClipboardDB:
    def __init__(self, db_path="clipboard_history.db", txt_path="clipboard_history.txt"):
        self.db_path = db_path
        self.txt_path = txt_path
        self.clear_history()
        self.init_db()
        self.init_txt_file()

    def clear_history(self):
        if os.path.exists(self.db_path):
            conn = sqlite3.connect(self.db_path)
            c = conn.cursor()
            c.execute('DELETE FROM clipboard_history')
            conn.commit()
            conn.close()
        
        with open(self.txt_path, "w", encoding='utf-8') as f:
            f.write("ClipVault History\n")
            f.write("=" * 80 + "\n\n")

    def init_txt_file(self):
        """Initialize text file if it doesn't exist"""
        if not os.path.exists(self.txt_path):
            with open(self.txt_path, "w", encoding='utf-8') as f:
                f.write("ClipVault History\n")
                f.write("=" * 80 + "\n\n")

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
        conn.commit()
        conn.close()

        # Add to text file with quotes for multiline content
        with open(self.txt_path, "a", encoding='utf-8') as f:
            f.write(f'[{timestamp}] "{content_clean}"\n')

    def get_history(self, limit: int = 10):
        # Get clipboard history
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM clipboard_history ORDER BY timestamp DESC LIMIT ?', (limit,))
        rows = c.fetchall()
        conn.close()
        return [{"id": r[0], "content": r[1], "timestamp": r[2]} for r in rows]

    def write_to_txt(self):
        """Write all database entries to text file"""
        history = self.get_history(limit=1000)  # Get all entries (up to 1000)
        with open(self.txt_path, "w", encoding='utf-8') as f:
            f.write("ClipVault History\n")
            f.write("=" * 80 + "\n\n")
            for entry in history:
                f.write(f"[{entry['timestamp']}] {entry['content']}\n")

    def view_history(self):
        """Display history in console"""
        history = self.get_history(limit=50)
        print("\nClipboard History:")
        print("=" * 80)
        for entry in history:
            print(f"[{entry['timestamp']}] {entry['content']}")

    def view_contents(self):
        """View both database and text file contents"""
        print("\nDatabase Contents:")
        print("=" * 80)
        
        # Show DB contents
        history = self.get_history(limit=100)
        for entry in history:
            print(f"[{entry['timestamp']}] {entry['content']}")
        
        print("\nText File Contents:")
        print("=" * 80)
        try:
            with open(self.txt_path, 'r', encoding='utf-8') as f:
                print(f.read())
        except FileNotFoundError:
            print("Text file not found")

if __name__ == "__main__":
    db = ClipboardDB()
    db.write_to_txt()  # Write to text file
    db.view_history()  # Show in console
    db.view_contents()  # Show both DB and text file contents