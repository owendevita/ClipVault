# ClipVault Backend

FastAPI service that manages clipboard history, user auth, and a local SQLite database. The Electron frontend calls these HTTP endpoints.

## Prerequisites

- Python 3.11+ 
- Windows PowerShell

## Setup (Windows)

From the `backend` folder, create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

If you see a ModuleNotFoundError (e.g., `passlib`), ensure you activated the venv and installed from `requirements.txt`.

## Run the server

```powershell
# In the backend folder with venv activated
python main.py
```

The API will be available at http://127.0.0.1:8000.

## Tests

### Quick Test Commands

```powershell
# Basic test run
python -m pytest tests/ -v

# With coverage report
python -m pytest tests/ --cov=. --cov-report=term-missing

# Run specific test file
python -m pytest tests/test_security.py -v

# Run tests quietly (just pass/fail summary)
python -m pytest tests/ -q
```

### Comprehensive Test Suite (64 Tests)

Our backend test suite covers:

**🔒 Security Tests (13 tests)** - `test_security.py`
- JWT token validation and expiration handling
- Malformed token and authorization header protection
- XSS injection prevention and input sanitization
- Brute force protection and timing attack resistance
- Security headers validation and CORS handling
- Information disclosure prevention

**🔐 Cryptography Tests (7 tests)** - `test_crypto.py`
- Encryption/decryption of clipboard content
- Special character and Unicode encryption support
- Large content encryption performance testing
- Encryption key rotation and invalid key handling
- Cryptographic throughput benchmarking

**🗄️ Database Tests (12 tests)** - `test_database.py` + `test_database_advanced.py`
- User preferences storage and retrieval
- Multi-user data isolation and access control
- Database connection handling and resilience
- Concurrent access and thread safety
- SQL injection prevention
- Query optimization and performance testing
- Schema migration compatibility
- Large history retrieval and memory management

**🌐 API Tests (14 tests)** - `test_api.py` + `test_api_advanced.py`
- Core API endpoints functionality
- Rate limiting and malformed request validation
- Boundary value testing and input validation
- Unicode and encoding handling
- Authentication edge cases
- Performance consistency and load testing
- Error handling and system recovery
- Bulk operations efficiency

**🔄 Integration Tests (12 tests)** - `test_integration_comprehensive.py`
- Complete user workflows (registration → clipboard operations)
- Multi-session data persistence
- Concurrent user interactions
- Data integrity across operations
- System limits and boundary conditions
- Error recovery in integrated scenarios

**🔧 Core Tests (6 tests)** - `test_auth.py` + `test_clipboard.py`
- User registration and login validation
- Protected route authentication
- JWT token rotation and invalidation
- Basic clipboard operations

### Test Coverage: 82%

Note: JavaScript tests (Jest + jsdom) are used in the frontend; backend tests use pytest only.

## Data files

- `clipboard_history.db`: SQLite database (encrypted entries)

## Dependencies

Installed via `requirements.txt`:

- fastapi: API framework
- uvicorn[standard]: ASGI server
- pyperclip: system clipboard access
- passlib[bcrypt]: password hashing
- python-jose[cryptography]: JWT tokens
- python-multipart: form data for OAuth2PasswordRequestForm
- pytest: test runner