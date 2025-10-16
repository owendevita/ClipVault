const { contextBridge } = require('electron')

// Backend API URL
const API_URL = 'http://127.0.0.1:8000'

// Helper function to get authentication headers
function getAuthHeaders() {
    const token = localStorage.getItem('clipvault_token');
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
}

// Helper function to handle API responses and authentication errors
async function handleResponse(response) {
    if (response.status === 401) {
        // Token expired or invalid, clear storage and redirect to login
        localStorage.removeItem('clipvault_token');
        localStorage.removeItem('clipvault_username');
        window.location.href = 'login.html';
        throw new Error('Authentication required');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    
    return response.json();
}

// Expose protected methods that allow the renderer process to use
// the backend API through a "backend" global object
contextBridge.exposeInMainWorld(
    'backend', {
        // Test connection to backend (health check with security status)
        async testConnection() {
            try {
                const response = await fetch(`${API_URL}/health`);
                return await handleResponse(response);
            } catch (error) {
                console.error('Connection test failed:', error);
                throw error;
            }
        },

        // Admin/debug: get raw encrypted history
        async rawHistory(limit = 20) {
            try {
                const response = await fetch(`${API_URL}/admin/raw-history?limit=${limit}`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Get raw history failed:', error);
                throw error;
            }
        },

        // Delete a single clipboard history entry
        async deleteHistoryEntry(entryId) {
            try {
                const response = await fetch(`${API_URL}/clipboard/history/${entryId}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Delete history entry failed:', error);
                throw error;
            }
        },

        // Get clipboard content (requires authentication)
        async getClipboard() {
            try {
                const response = await fetch(`${API_URL}/clipboard/current`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Get clipboard failed:', error);
                throw error;
            }
        },

        // Set clipboard content (requires authentication)
        async setClipboard(content) {
            try {
                const response = await fetch(`${API_URL}/clipboard/set`, {
                    method: 'POST',
                    headers: (() => {
                        const h = getAuthHeaders();
                        // Send as text/plain; keep Authorization header
                        if (h['Content-Type']) delete h['Content-Type'];
                        h['Content-Type'] = 'text/plain; charset=utf-8';
                        return h;
                    })(),
                    body: content
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Set clipboard failed:', error);
                throw error;
            }
        },

        // Get clipboard history (requires authentication)
        async getHistory(limit = 10) {
            try {
                const response = await fetch(`${API_URL}/clipboard/history?limit=${limit}`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Get history failed:', error);
                throw error;
            }
        },

        // Clear clipboard history (requires authentication)
        async clearHistory() {
            try {
                const response = await fetch(`${API_URL}/clipboard/clear-history`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Clear history failed:', error);
                throw error;
            }
        },

        // Get security status (admin endpoint)
        async getSecurityStatus() {
            try {
                const response = await fetch(`${API_URL}/admin/security-status`, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Get security status failed:', error);
                throw error;
            }
        },

        // Rotate clipboard encryption key (admin endpoint)
        async rotateClipboardKey() {
            try {
                const response = await fetch(`${API_URL}/admin/rotate-clipboard-key`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Rotate clipboard key failed:', error);
                throw error;
            }
        },

        // Rotate JWT secret key (admin endpoint)
        async rotateJWTSecret() {
            try {
                const response = await fetch(`${API_URL}/admin/rotate-jwt-secret`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                return await handleResponse(response);
            } catch (error) {
                console.error('Rotate JWT secret failed:', error);
                throw error;
            }
        },

        // Authentication helpers
        auth: {
            // Check if user is logged in
            isLoggedIn() {
                return !!localStorage.getItem('clipvault_token');
            },
            
            // Get current username
            getUsername() {
                return localStorage.getItem('clipvault_username') || 'Unknown User';
            },
            
            // Logout user
            logout() {
                localStorage.removeItem('clipvault_token');
                localStorage.removeItem('clipvault_username');
                window.location.href = 'login.html';
            }
        },

        // Exit the application
        exitApp() {
            const { ipcRenderer } = require('electron')
            ipcRenderer.send('exit-app')
        }
    }
)