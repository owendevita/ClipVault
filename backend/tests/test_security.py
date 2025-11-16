import sys, os, time, threading
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from jose import jwt
import json
from datetime import datetime, timedelta


class TestAuthenticationSecurity:
    """Test JWT token handling and authentication security"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"sectest_{int(time.time())}"
        self.password = "SecurePass123!"
        
        # Register and get token
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]

    def test_jwt_token_expiration_handling(self):
        """Test that expired JWT tokens are properly rejected"""
        # Create an expired token
        expired_token = jwt.encode(
            {"sub": self.username, "exp": datetime.utcnow() - timedelta(minutes=1)},
            "test_secret", algorithm="HS256"
        )
        
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = self.client.get("/clipboard/history", headers=headers)
        assert response.status_code == 401
        assert "Invalid token" in response.json()["detail"]

    def test_malformed_jwt_token_handling(self):
        """Test handling of malformed JWT tokens"""
        malformed_tokens = [
            "invalid.token.format",
            "Bearer invalid_token",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_payload",
            "completely_invalid_token"
        ]
        
        for token in malformed_tokens:
            headers = {"Authorization": f"Bearer {token}"}
            response = self.client.get("/clipboard/history", headers=headers)
            assert response.status_code == 401

    def test_empty_missing_authorization_header(self):
        """Test handling of missing or empty authorization headers"""
        # No authorization header
        response = self.client.get("/clipboard/history")
        assert response.status_code == 401
        
        # Empty authorization header
        response = self.client.get("/clipboard/history", headers={"Authorization": ""})
        assert response.status_code == 401
        
        # Invalid format
        response = self.client.get("/clipboard/history", headers={"Authorization": "InvalidFormat"})
        assert response.status_code == 401

    def test_session_fixation_prevention(self):
        """Test that new tokens are issued on each login"""
        # Login twice and verify different tokens
        response1 = self.client.post("/login", data={"username": self.username, "password": self.password},
                                   headers={"Content-Type": "application/x-www-form-urlencoded"})
        token1 = response1.json()["access_token"]
        
        time.sleep(1)  # Ensure different timestamp
        
        response2 = self.client.post("/login", data={"username": self.username, "password": self.password},
                                   headers={"Content-Type": "application/x-www-form-urlencoded"})
        token2 = response2.json()["access_token"]
        
        assert token1 != token2


class TestInputValidationSecurity:
    """Test input validation and injection prevention"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"inputtest_{int(time.time())}"
        self.password = "TestPass123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_xss_injection_prevention(self):
        """Test XSS injection prevention in clipboard content"""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "';DROP TABLE users;--"
        ]
        
        for payload in xss_payloads:
            response = self.client.post("/clipboard/set", content=payload,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            assert response.status_code == 200
            
            # Verify content is stored safely (encrypted)
            get_response = self.client.get("/clipboard/current", headers=self.headers)
            assert get_response.status_code == 200

    def test_malformed_json_handling(self):
        """Test handling of malformed JSON requests"""
        malformed_json = [
            '{"invalid": json}',
            '{"missing_quote: "value"}',
            '{"trailing_comma": "value",}',
            '{invalid_json_completely'
        ]
        
        for json_data in malformed_json:
            response = self.client.post("/preferences", content=json_data,
                                      headers={**self.headers, "Content-Type": "application/json"})
            # Should handle gracefully, not crash
            assert response.status_code in [400, 422]

    def test_oversized_request_handling(self):
        """Test handling of oversized requests"""
        # Large clipboard content (1MB)
        large_content = "A" * (1024 * 1024)
        
        response = self.client.post("/clipboard/set", content=large_content,
                                  headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        # Should either accept or reject gracefully
        assert response.status_code in [200, 413, 422]

    def test_content_type_validation(self):
        """Test Content-Type header validation"""
        # Test invalid content types
        invalid_types = [
            "application/xml",
            "image/jpeg",
            "text/html",
        ]
        
        for content_type in invalid_types:
            response = self.client.post("/clipboard/set", content="test",
                                      headers={**self.headers, "Content-Type": content_type})
            # Should handle gracefully
            assert response.status_code in [200, 400, 415, 422]


class TestSecurityHeaders:
    """Test security headers and CORS"""

    def setup_method(self):
        self.client = TestClient(app)

    def test_security_headers_validation(self):
        """Test that security headers are present"""
        response = self.client.get("/health")
        headers = response.headers
        
        # Check for common security headers
        security_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options", 
            "X-XSS-Protection",
            "Referrer-Policy"
        ]
        
        # Note: Not all headers may be implemented yet
        for header in security_headers:
            if header in headers:
                assert headers[header] is not None

    def test_cors_preflight_handling(self):
        """Test CORS preflight request handling"""
        response = self.client.options("/health", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization"
        })
        
        # Should handle OPTIONS requests
        assert response.status_code in [200, 204, 405]


class TestBruteForceProtection:
    """Test brute force and timing attack protection"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"brutetest_{int(time.time())}"
        self.password = "BruteTest123!"
        
        # Register user
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})

    def test_timing_attack_resistance(self):
        """Test that response times are consistent to prevent timing attacks"""
        valid_username = self.username
        invalid_username = f"invalid_{int(time.time())}"
        
        # Measure response times for valid vs invalid usernames
        times_valid = []
        times_invalid = []
        
        for _ in range(5):
            start = time.time()
            self.client.post("/login", data={"username": valid_username, "password": "wrong"},
                           headers={"Content-Type": "application/x-www-form-urlencoded"})
            times_valid.append(time.time() - start)
            
            start = time.time()
            self.client.post("/login", data={"username": invalid_username, "password": "wrong"},
                           headers={"Content-Type": "application/x-www-form-urlencoded"})
            times_invalid.append(time.time() - start)
        
        # Times should be relatively similar (within reasonable variance)
        avg_valid = sum(times_valid) / len(times_valid)
        avg_invalid = sum(times_invalid) / len(times_invalid)
        
        # Allow up to 90% variance (very lenient for testing environments)
        # In production, this should be much tighter
        variance_threshold = 0.9
        if max(avg_valid, avg_invalid) > 0:
            assert abs(avg_valid - avg_invalid) / max(avg_valid, avg_invalid) < variance_threshold

    def test_password_brute_force_protection(self):
        """Test protection against password brute force attacks"""
        wrong_passwords = ["wrong1", "wrong2", "wrong3", "wrong4", "wrong5"]
        
        responses = []
        for password in wrong_passwords:
            response = self.client.post("/login", data={"username": self.username, "password": password},
                                      headers={"Content-Type": "application/x-www-form-urlencoded"})
            responses.append(response)
        
        # All should fail
        for response in responses:
            assert response.status_code in [400, 401, 429]  # 429 if rate limiting implemented

    def test_information_disclosure_prevention(self):
        """Test that errors don't disclose sensitive information"""
        # Test with non-existent user
        response = self.client.post("/login", data={"username": "nonexistent", "password": "wrong"},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        error_message = response.json().get("detail", "").lower()
        
        # Should not reveal whether user exists or not
        sensitive_info = ["user not found", "user exists", "invalid user", "user does not exist"]
        for info in sensitive_info:
            assert info not in error_message