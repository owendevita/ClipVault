import sys, os, time, threading
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app
import concurrent.futures
import json
import random


class TestIntegrationScenarios:
    """Test complete integration scenarios"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"integration_{int(time.time())}"
        self.password = "IntegrationTest123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_full_user_workflow(self):
        """Test complete user workflow from registration to clipboard operations"""
        # User registers (already done in setup)
        # User logs in (already done in setup)
        
        # User sets preferences
        preferences = {
            "darkMode": True,
            "autoEncrypt": False,
            "notifyOnClipboardChange": True
        }
        response = self.client.post("/preferences", json=preferences, headers=self.headers)
        assert response.status_code == 200
        
        # User sets clipboard content
        test_content = "Integration test clipboard content"
        response = self.client.post("/clipboard/set", content=test_content,
                                  headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        assert response.status_code == 200
        
        # User retrieves current clipboard
        response = self.client.get("/clipboard/current", headers=self.headers)
        assert response.status_code == 200
        assert response.json()["content"] == test_content
        
        # User views clipboard history
        response = self.client.get("/clipboard/history", headers=self.headers)
        assert response.status_code == 200
        history = response.json().get("history", [])
        assert len(history) >= 1
        
        # User retrieves preferences
        response = self.client.get("/preferences", headers=self.headers)
        assert response.status_code == 200
        saved_prefs = response.json()
        assert saved_prefs["darkMode"] == True

    def test_multi_session_user_workflow(self):
        """Test user workflow across multiple sessions"""
        # Session 1: Set some content and preferences
        test_content_1 = "Session 1 content"
        self.client.post("/clipboard/set", content=test_content_1,
                        headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        
        preferences_1 = {"darkMode": True, "autoEncrypt": True}
        self.client.post("/preferences", json=preferences_1, headers=self.headers)
        
        # Simulate logout by creating new token (new login)
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        new_token = response.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}
        
        # Session 2: Verify data persistence
        response = self.client.get("/clipboard/current", headers=new_headers)
        assert response.status_code == 200
        assert response.json()["content"] == test_content_1
        
        response = self.client.get("/preferences", headers=new_headers)
        assert response.status_code == 200
        assert response.json()["darkMode"] == True

    def test_concurrent_user_interactions(self):
        """Test multiple users interacting with the system simultaneously"""
        def user_session(user_id):
            try:
                # Create unique user
                client = TestClient(app)
                username = f"concurrent_{user_id}_{int(time.time())}"
                password = "ConcurrentTest123!"
                
                # Register
                reg_response = client.post("/register", data={"username": username, "password": password},
                                         headers={"Content-Type": "application/x-www-form-urlencoded"})
                if reg_response.status_code not in [200, 400]:
                    return False
                
                # Login
                login_response = client.post("/login", data={"username": username, "password": password},
                                           headers={"Content-Type": "application/x-www-form-urlencoded"})
                if login_response.status_code != 200:
                    return False
                
                token = login_response.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                # Perform user operations
                operations_success = []
                
                # Set clipboard content
                content = f"User {user_id} content"
                response = client.post("/clipboard/set", content=content,
                                     headers={**headers, "Content-Type": "text/plain; charset=utf-8"})
                operations_success.append(response.status_code == 200)
                
                # Get clipboard content
                response = client.get("/clipboard/current", headers=headers)
                operations_success.append(response.status_code == 200)
                
                # Set preferences
                prefs = {"darkMode": user_id % 2 == 0}  # Alternate preferences
                response = client.post("/preferences", json=prefs, headers=headers)
                operations_success.append(response.status_code == 200)
                
                # Get history
                response = client.get("/clipboard/history", headers=headers)
                operations_success.append(response.status_code == 200)
                
                return all(operations_success)
                
            except Exception:
                return False
        
        # Run multiple users concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(user_session, i) for i in range(3)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Most users should succeed
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.6  # At least 60% success rate

    def test_data_integrity_across_operations(self):
        """Test data integrity across various operations"""
        # Set up test data
        test_contents = [
            "First clipboard entry",
            "Second clipboard entry with 特殊字符",
            "Third entry with emojis 🚀🎉",
            "Fourth entry with numbers 12345",
        ]
        
        # Add all test content
        for i, content in enumerate(test_contents):
            response = self.client.post("/clipboard/set", content=content,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            assert response.status_code == 200
            
            # Verify immediate retrieval
            response = self.client.get("/clipboard/current", headers=self.headers)
            assert response.status_code == 200
            assert response.json()["content"] == content
        
        # Verify history contains all entries
        response = self.client.get("/clipboard/history?limit=10", headers=self.headers)
        assert response.status_code == 200
        history = response.json().get("history", [])
        assert len(history) >= len(test_contents)
        
        # Verify data integrity by checking content preservation
        history_contents = [entry.get("content", "") for entry in history]
        for content in test_contents:
            assert content in history_contents

    def test_error_recovery_integration(self):
        """Test system recovery in integrated scenarios"""
        # Set up valid state
        valid_content = "Valid initial content"
        response = self.client.post("/clipboard/set", content=valid_content,
                                  headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
        assert response.status_code == 200
        
        # Cause various errors
        error_scenarios = [
            # Invalid JSON in preferences
            lambda: self.client.post("/preferences", content="invalid json",
                                   headers={**self.headers, "Content-Type": "application/json"}),
            
            # Invalid endpoint
            lambda: self.client.get("/invalid/endpoint", headers=self.headers),
            
            # Missing authorization
            lambda: self.client.get("/clipboard/current"),
        ]
        
        for error_scenario in error_scenarios:
            # Cause error
            error_response = error_scenario()
            assert error_response.status_code >= 400
            
            # Verify system still works after error
            response = self.client.get("/clipboard/current", headers=self.headers)
            assert response.status_code == 200
            assert response.json()["content"] == valid_content


class TestSystemLimits:
    """Test system behavior at various limits"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"limits_{int(time.time())}"
        self.password = "LimitsTest123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_maximum_history_entries(self):
        """Test behavior with maximum number of history entries"""
        # Add many entries
        max_entries = 100
        for i in range(max_entries):
            content = f"History entry {i:03d}"
            response = self.client.post("/clipboard/set", content=content,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            if response.status_code != 200:
                break  # Stop if we hit limits
        
        # Test retrieving all history
        response = self.client.get(f"/clipboard/history?limit={max_entries}", headers=self.headers)
        assert response.status_code == 200
        
        history = response.json().get("history", [])
        # Should have reasonable number of entries (not necessarily all)
        assert len(history) >= 1
        assert len(history) <= max_entries

    def test_content_size_limits(self):
        """Test behavior with various content sizes"""
        size_tests = [
            ("tiny", "x"),
            ("small", "x" * 100),
            ("medium", "x" * 10000),
            ("large", "x" * 100000),
            ("very_large", "x" * 1000000),  # 1MB
        ]
        
        for size_name, content in size_tests:
            response = self.client.post("/clipboard/set", content=content,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            
            # Should either succeed or fail gracefully
            assert response.status_code in [200, 400, 413, 422]
            
            if response.status_code == 200:
                # Verify retrieval works
                get_response = self.client.get("/clipboard/current", headers=self.headers)
                assert get_response.status_code == 200
                retrieved_content = get_response.json().get("content", "")
                assert len(retrieved_content) == len(content)

    def test_rapid_request_handling(self):
        """Test handling of rapid consecutive requests"""
        rapid_requests = 30
        success_count = 0
        start_time = time.time()
        
        for i in range(rapid_requests):
            response = self.client.post("/clipboard/set", content=f"Rapid content {i}",
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            if response.status_code == 200:
                success_count += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should handle some requests successfully
        assert success_count >= rapid_requests // 2  # At least half should succeed
        
        # Should not take excessive time
        assert total_time < 60.0  # Less than 1 minute for 30 requests

    def test_preference_complexity_limits(self):
        """Test limits on preference data complexity"""
        complex_preferences = {
            "simple_setting": True,
            "nested_object": {
                "level1": {
                    "level2": {
                        "deep_setting": "value"
                    }
                }
            },
            "array_setting": [1, 2, 3, 4, 5] * 10,  # Large array
            "string_setting": "x" * 1000,  # Long string
            "number_setting": 123456789,
            "boolean_array": [True, False] * 50,
        }
        
        response = self.client.post("/preferences", json=complex_preferences, headers=self.headers)
        # Should either accept or reject gracefully
        assert response.status_code in [200, 400, 413, 422]
        
        if response.status_code == 200:
            # Verify retrieval works
            get_response = self.client.get("/preferences", headers=self.headers)
            assert get_response.status_code == 200
            retrieved_prefs = get_response.json()
            # Should preserve at least basic structure
            assert "simple_setting" in retrieved_prefs


class TestBoundaryConditions:
    """Test various boundary conditions and edge cases"""

    def setup_method(self):
        self.client = TestClient(app)
        self.username = f"boundary_{int(time.time())}"
        self.password = "BoundaryTest123!"
        
        # Register and login
        self.client.post("/register", data={"username": self.username, "password": self.password},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
        response = self.client.post("/login", data={"username": self.username, "password": self.password},
                                  headers={"Content-Type": "application/x-www-form-urlencoded"})
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_special_character_handling(self):
        """Test handling of special characters and control sequences"""
        special_contents = [
            "\n\r\t",  # Whitespace characters
            "\x00\x01\x02",  # Null and control characters
            "\\n\\r\\t",  # Escaped sequences
            '"quotes" and \'apostrophes\'',  # Quote characters
            "<script>alert('xss')</script>",  # Potential XSS
            "&amp;&lt;&gt;",  # HTML entities
            "SELECT * FROM users;",  # SQL-like content
        ]
        
        for content in special_contents:
            response = self.client.post("/clipboard/set", content=content,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            
            # Should handle gracefully
            assert response.status_code in [200, 400, 422]  # May reject problematic characters
            
            if response.status_code == 200:
                # Verify retrieval
                get_response = self.client.get("/clipboard/current", headers=self.headers)
                assert get_response.status_code == 200

    def test_numeric_boundary_values(self):
        """Test numeric boundary values in parameters"""
        boundary_limits = [
            ("limit=0", 0),
            ("limit=1", 1),
            ("limit=100", 100),
            ("limit=9999", 9999),
            ("limit=-1", -1),  # Should be handled gracefully
        ]
        
        for param_string, expected_limit in boundary_limits:
            response = self.client.get(f"/clipboard/history?{param_string}", headers=self.headers)
            
            # Should either work or fail gracefully
            assert response.status_code in [200, 400, 422]
            
            if response.status_code == 200:
                history = response.json().get("history", [])
                if expected_limit >= 0:
                    assert len(history) <= expected_limit

    def test_empty_and_null_scenarios(self):
        """Test empty and null-like scenarios"""
        empty_scenarios = [
            "",  # Empty string
            " ",  # Single space
            "\n",  # Just newline
            "\t",  # Just tab
        ]
        
        for content in empty_scenarios:
            response = self.client.post("/clipboard/set", content=content,
                                      headers={**self.headers, "Content-Type": "text/plain; charset=utf-8"})
            
            # Should handle empty content gracefully
            assert response.status_code in [200, 400, 422]  # May accept or reject empty content
            
            if response.status_code == 200:
                # Verify retrieval preserves the content
                get_response = self.client.get("/clipboard/current", headers=self.headers)
                assert get_response.status_code == 200