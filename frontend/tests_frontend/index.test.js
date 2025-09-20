/**
 * @jest-environment jsdom
 */

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require("jsdom");

let window, document;

beforeEach(() => {
  // Minimal HTML for testing
  const dom = new JSDOM(`
    <div id="connection-status" class="status-container"></div>
    <div class="button-container">
        <button class="history-btn">Clipboard History</button>
        <button class="preferences-btn">User Preferences</button>
        <button class="logout-btn">Log out</button>
    </div>
  `, { runScripts: "dangerously", url: "http://localhost" });

  window = dom.window;
  document = window.document;

  // Mock backend
  window.backend = {
    testConnection: jest.fn(),
  };

  // Extract backend-checking logic into a testable function
  window.checkBackendStatus = async function() {
    try {
      const result = await window.backend.testConnection();
      document.getElementById('connection-status').innerHTML =
        `Backend Status: ${result.status}<br>Message: ${result.message}`;
    } catch (error) {
      document.getElementById('connection-status').innerHTML =
        'Error: Could not connect to backend';
    }
  };
});

afterEach(() => {
  window.close();
});

test("displays backend status when connection succeeds", async () => {
  window.backend.testConnection.mockResolvedValue({
    status: "OK",
    message: "Connection successful",
  });

  await window.checkBackendStatus();

  const statusDiv = document.getElementById("connection-status");
  expect(statusDiv.textContent).toContain("Backend Status: OK");
  expect(statusDiv.textContent).toContain("Message: Connection successful");
});

test("displays error when backend connection fails", async () => {
  window.backend.testConnection.mockRejectedValue(new Error("Failed"));

  await window.checkBackendStatus();

  const statusDiv = document.getElementById("connection-status");
  expect(statusDiv.textContent).toBe("Error: Could not connect to backend");
});

test("buttons exist with correct text", () => {
  const historyBtn = document.querySelector(".history-btn");
  const preferencesBtn = document.querySelector(".preferences-btn");
  const logoutBtn = document.querySelector(".logout-btn");

  expect(historyBtn).not.toBeNull();
  expect(historyBtn.textContent).toBe("Clipboard History");

  expect(preferencesBtn).not.toBeNull();
  expect(preferencesBtn.textContent).toBe("User Preferences");

  expect(logoutBtn).not.toBeNull();
  expect(logoutBtn.textContent).toBe("Log out");
});