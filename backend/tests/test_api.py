import sys, os
# Add parent directory to Python path so we can import from backend folder
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
import time

def test_api_endpoints():
    # Create a test client that simulates HTTP requests
    client = TestClient(app)

    # Test 1: Health Check Endpoint
    # Verify that /health returns 200 OK and correct status
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, dict)
    assert body.get("status") == "ok"

    # Auth: register + login to get a token for protected routes
    username = f"testuser_{int(time.time())}"
    password = "testpass123"
    # register
    reg = client.post("/register", data={"username": username, "password": password}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert reg.status_code in (200, 400)  # allow 'username exists' if re-run fast
    # login
    login = client.post("/login", data={"username": username, "password": password}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Test 2: Setting Clipboard Content (requires auth)
    test_content = "Test API Content"
    response = client.post("/clipboard/set", content=test_content, headers={**auth_headers, "Content-Type": "text/plain; charset=utf-8"})
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Test 3: Getting Current Clipboard Content
    # Verify that we can retrieve the current clipboard content (requires auth)
    response = client.get("/clipboard/current", headers=auth_headers)
    assert response.status_code == 200
    assert "content" in response.json()

def test_clipboard_history():
    # Create a test client for history endpoint
    client = TestClient(app)

    # login flow for protected route
    username = f"testuser_{int(time.time())}"
    password = "testpass123"
    client.post("/register", data={"username": username, "password": password}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    login = client.post("/login", data={"username": username, "password": password}, headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Verify that /clipboard/history returns a dict with history list
    response = client.get("/clipboard/history", headers=auth_headers)
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, dict)
    assert isinstance(payload.get("history", []), list)