import pyperclip
from threading import Thread
import time

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

if __name__ == "__main__":
    # Simple test of clipboard manager
    cm = ClipboardManager()
    print("ClipboardManager initialized successfully")