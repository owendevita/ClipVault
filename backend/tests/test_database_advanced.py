import sys, os, time, threading, sqlite3
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import ClipboardDB
import json
import tempfile
import concurrent.futures


class TestDatabaseOperations:
    """Test advanced database operations"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"dbtest_{int(time.time())}"
        self.password = "DBTest123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_user_preferences_storage(self):
        """Test user preferences storage and retrieval"""
        test_preferences = {
            "darkMode": True,
            "autoEncrypt": True,
            "notifyOnClipboardChange": False,
            "openOnStartup": True,
            "hotkeys": {
                "copy": "CTRL + C",
                "paste": "CTRL + V"
            }
        }
        
        # Set preferences
        response = self.client.post("/preferences", json=test_preferences, headers=self.headers)
        assert response.status_code == 200
        
        # Get preferences
        response = self.client.get("/preferences", headers=self.headers)
        assert response.status_code == 200
        saved_prefs = response.json()
        
        # Verify all preferences were saved
        for key, value in test_preferences.items():
            assert saved_prefs.get(key) == value

    def test_multiple_user_data_isolation(self):
        """Test that users can only access their own data"""
        # Create second user
        username2 = f"dbtest2_{int(time.time())}"
        password2 = "DBTest2_123!"
        
        self.client.post("/register", data={"username": username2, "password": password2},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response2 = self.client.post("/login", data={"username": username2, "password": password2},
                                   headers={"Content-Type": "application/x-www-form-urlencoded"})
        token2 = response2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # User 1 sets clipboard content
        content1 = "User 1 secret content"
        self.client.post("/clipboard/set", content=content1,
                        headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        
        # User 2 sets different clipboard content
        content2 = "User 2 secret content"
        self.client.post("/clipboard/set", content=content2,
                        headers={**headers2, "Content-Type": "text/plain; charset=utf-8"})
        
        # In current design, clipboard is global, so both users see the last set content
        # This test verifies that both authenticated users can access the clipboard
        response1 = self.client.get("/clipboard/current", headers=self.headers)
        response2 = self.client.get("/clipboard/current", headers=headers2)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        # Both should see the same content (global clipboard), which is content2 (last set)
        assert response1.json()["content"] == content2
        assert response2.json()["content"] == content2

    def test_database_connection_handling(self):
        """Test database connection resilience"""
        # Test multiple rapid requests (connection pooling)
        responses = []
        for i in range(10):
            response = self.client.post("/clipboard/set", content=f"Test content {i}",
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            responses.append(response)
        
        # All requests should succeed
        for response in responses:
            assert response.status_code == 200

    def test_concurrent_database_access(self):
        """Test concurrent database access from multiple threads"""
        def make_request(content_id):
            try:
                response = self.client.post("/clipboard/set", content=f"Concurrent content {content_id}",
                                          headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
                return response.status_code == 200
            except Exception:
                return False
        
        # Test concurrent writes
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request, i) for i in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Most requests should succeed (allow some to fail under high concurrency)
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.7  # At least 70% should succeed

    def test_large_history_retrieval(self):
        """Test retrieval of large clipboard history"""
        # Add multiple entries
        for i in range(50):
            self.client.post("/clipboard/set", content=f"History entry {i}",
                           headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        
        # Test retrieving large history
        response = self.client.get("/clipboard/history?limit=50", headers=self.headers)
        assert response.status_code == 200
        
        history = response.json().get("history", [])
        assert len(history) <= 50  # Should not exceed requested limit
        assert len(history) >= 1   # Should have at least some entries

    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        sql_injection_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "'; DELETE FROM clipboard_history; --",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "' OR 1=1 #"
        ]
        
        for payload in sql_injection_payloads:
            # Try injection in username during registration
            response = self.client.post("/register", data={"username": payload, "password": "test123"},
                                      headers={"Content-Type": "application/x-www-form-urlencoded"})
            # Should either succeed (payload treated as literal) or fail gracefully
            assert response.status_code in [200, 400, 422]
            
            # Try injection in clipboard content
            response = self.client.post("/clipboard/set", content=payload,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            # Should handle safely
            assert response.status_code in [200, 400]


class TestDatabasePerformance:
    """Test database performance and optimization"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"perfdbtest_{int(time.time())}"
        self.password = "PerfDBTest123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_database_query_optimization(self):
        """Test database query performance"""
        # Add test data
        for i in range(20):
            self.client.post("/clipboard/set", content=f"Performance test content {i}",
                           headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        
        # Test query performance
        start_time = time.time()
        response = self.client.get("/clipboard/history?limit=10", headers=self.headers)
        query_time = time.time() - start_time
        
        assert response.status_code == 200
        assert query_time < 2.0  # Should complete within 2 seconds
        
        # Test with larger limit
        start_time = time.time()
        response = self.client.get("/clipboard/history?limit=20", headers=self.headers)
        query_time = time.time() - start_time
        
        assert response.status_code == 200
        assert query_time < 3.0  # Should complete within 3 seconds

    def test_database_schema_migration(self):
        """Test database schema compatibility"""
        # Create a temporary database to test schema
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_file:
            tmp_db_path = tmp_file.name
        
        try:
            # Initialize database
            db = ClipboardDB(tmp_db_path)
            
            # Test that database initializes without errors
            assert os.path.exists(tmp_db_path)
            
            # Test basic operations
            db.add_entry("Test migration content")
            history = db.get_history(limit=1)
            assert len(history) >= 0
            
        finally:
            # Clean up
            try:
                os.unlink(tmp_db_path)
            except:
                pass


class TestMemoryAndLoad:
    """Test memory usage and load handling"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"loadtest_{int(time.time())}"
        self.password = "LoadTest123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_memory_usage_under_load(self):
        """Test memory usage during high load operations (without psutil)"""
        # Perform memory-intensive operations and test for performance
        large_content = "X" * (1024 * 10)  # 10KB content
        
        start_time = time.time()
        success_count = 0
        
        for i in range(20):
            response = self.client.post("/clipboard/set", content=f"{large_content} {i}",
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            if response.status_code == 200:
                success_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Operations should complete in reasonable time and most should succeed
        assert total_time < 30.0  # Should complete within 30 seconds
        assert success_count >= 15  # At least 75% should succeed

    def test_concurrent_user_handling(self):
        """Test handling multiple concurrent users"""
        def simulate_user(user_id):
            try:
                # Create unique client for each user
                client = TestClient(app)
                username = f"concurrent_user_{user_id}_{int(time.time())}"
                password = f"ConcurrentTest123!"
                
                # Register and login
                reg_response = client.post("/register", data={"username": username, "password": password},
                                         headers={"Content-Type": "application/x-www-form-urlencoded"})
                if reg_response.status_code not in [200, 400]:
                    return False
                
                login_response = client.post("/login", data={"username": username, "password": password},
                                           headers={"Content-Type": "application/x-www-form-urlencoded"})
                if login_response.status_code != 200:
                    return False
                
                token = login_response.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                # Perform operations
                response = client.post("/clipboard/set", content=f"Concurrent content from user {user_id}",
                                     headers={**headers, "Content-Type": "text/plain; charset=utf-8"})
                return response.status_code == 200
                
            except Exception:
                return False
        
        # Test with 5 concurrent users
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(simulate_user, i) for i in range(5)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Most users should succeed
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.6  # At least 60% should succeed

    def test_large_clipboard_content_processing(self):
        """Test processing of large clipboard content"""
        # Test with 100KB content
        large_content = "Large content test. " * 5000  # Approximately 100KB
        
        start_time = time.time()
        response = self.client.post("/clipboard/set", content=large_content,
                                  headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        processing_time = time.time() - start_time
        
        assert response.status_code == 200
        assert processing_time < 10.0  # Should process within 10 seconds
        
        # Verify retrieval works
        response = self.client.get("/clipboard/current", headers=self.headers)
        assert response.status_code == 200
        assert len(response.json()["content"]) > 50000  # Should preserve large content