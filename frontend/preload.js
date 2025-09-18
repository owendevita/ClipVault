const { contextBridge } = require('electron')

// Backend API URL
const API_URL = 'http://127.0.0.1:8000'

// Expose protected methods that allow the renderer process to use
// the backend API through a "backend" global object
contextBridge.exposeInMainWorld(
    'backend', {
        // Test connection to backend
        async testConnection() {
            const response = await fetch(`${API_URL}/test-connection`)
            return response.json()
        },

        // Get clipboard content
        async getClipboard() {
            const response = await fetch(`${API_URL}/clipboard/current`)
            return response.json()
        },

        // Set clipboard content
        async setClipboard(content) {
            const response = await fetch(`${API_URL}/clipboard/set`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(content)
            })
            return response.json()
        },

        // Get clipboard history
        async getHistory(limit = 10) {
            const response = await fetch(`${API_URL}/clipboard/history?limit=${limit}`)
            return response.json()
        }
    }
)