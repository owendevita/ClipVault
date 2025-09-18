import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import ClipboardDB

def test_database_operations():
    # Initialize database with test-specific files
    # This prevents interference with production database
    db = ClipboardDB("test_clipboard.db", "test_clipboard.txt")
    
    # Test adding and retrieving content from database
    test_content = "Test Database Content"
    
    # Add an entry to the database
    db.add_entry(test_content)
    
    # Retrieve the latest entry
    history = db.get_history(limit=1)
    
    # Verify that:
    # 1. At least one entry exists
    assert len(history) > 0
    # 2. The content matches what we stored
    assert history[0]["content"] == test_content