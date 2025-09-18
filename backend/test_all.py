from fastapi.testclient import TestClient
from clipboard import ClipboardManager
from database import ClipboardDB
from main import app

def run_all_tests():
    """Run all ClipVault tests"""
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
    
    # Test API endpoints
    response = client.get("/health")
    assert response.status_code == 200, "Health check failed"
    
    print("All tests passed successfully!")

if __name__ == "__main__":
    run_all_tests()