import sys, os
# Add parent directory to Python path so we can import from backend folder
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

def test_api_endpoints():
    # Create a test client that simulates HTTP requests
    client = TestClient(app)

    # Test 1: Health Check Endpoint
    # Verify that /health returns 200 OK and correct status
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    # Test 2: Setting Clipboard Content
    # Verify that we can set new content via POST request
    test_content = "Test API Content"
    response = client.post("/clipboard/set", json=test_content)
    assert response.status_code == 200  
    assert response.json()["success"] == True  

    # Test 3: Getting Current Clipboard Content
    # Verify that we can retrieve the current clipboard content
    response = client.get("/clipboard/current")
    assert response.status_code == 200  
    assert "content" in response.json()  

def test_clipboard_history():
    # Create a test client for history endpoint
    client = TestClient(app)
    
    # Verify that /clipboard/history returns a valid list of entries
    response = client.get("/clipboard/history")
    assert response.status_code == 200  
    assert isinstance(response.json(), list)  