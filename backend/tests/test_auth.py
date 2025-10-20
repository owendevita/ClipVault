import sys, os, time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app


def _register(client: TestClient, username: str, password: str):
    return client.post(
        "/register",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def _login(client: TestClient, username: str, password: str):
    return client.post(
        "/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def test_register_and_login_success():
    client = TestClient(app)
    username = f"authuser_{int(time.time())}"
    password = "pw1234"

    r = _register(client, username, password)
    assert r.status_code in (200, 400)

    # login
    l = _login(client, username, password)
    assert l.status_code == 200
    body = l.json()
    assert "access_token" in body and body["token_type"] == "bearer"


def test_register_validation_errors():
    client = TestClient(app)
    # missing username
    r1 = _register(client, "", "abcd")
    assert r1.status_code == 400
    # short username
    r2 = _register(client, "ab", "abcd")
    assert r2.status_code == 400
    # short password
    r3 = _register(client, "validname", "a")
    assert r3.status_code == 400


def test_duplicate_username():
    client = TestClient(app)
    username = f"dupe_{int(time.time())}"
    password = "pw1234"
    r1 = _register(client, username, password)
    assert r1.status_code in (200, 400)
    r2 = _register(client, username, password)
    assert r2.status_code == 400


def test_protected_routes_require_auth():
    client = TestClient(app)
    # no token
    h = client.get("/clipboard/history")
    assert h.status_code == 401
    # login
    username = f"prot_{int(time.time())}"
    password = "pw1234"
    _register(client, username, password)
    login = _login(client, username, password)
    token = login.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    # with token
    h2 = client.get("/clipboard/history", headers=auth)
    assert h2.status_code == 200


def test_jwt_rotation_invalidates_tokens():
    client = TestClient(app)
    username = f"rot_{int(time.time())}"
    password = "pw1234"
    _register(client, username, password)
    login = _login(client, username, password)
    token = login.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    # Access before rotation
    ok = client.get("/clipboard/history", headers=auth)
    assert ok.status_code == 200
    # Rotate JWT secret (requires auth)
    rot = client.post("/admin/rotate-jwt-secret", headers=auth)
    assert rot.status_code == 200
    # Old token should now be invalid
    denied = client.get("/clipboard/history", headers=auth)
    assert denied.status_code == 401
