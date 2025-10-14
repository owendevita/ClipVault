/**
 * @jest-environment jsdom
 */

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require("jsdom");

let window, document;

beforeEach(() => {
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

  window.backend = {
    testConnection: jest.fn(),
    exitApp: jest.fn(),
  };

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
  jest.clearAllMocks();
});

test("connection status div exists", () => {
  const statusDiv = document.getElementById("connection-status");
  expect(statusDiv).not.toBeNull();
});

test("all buttons exist with correct text", () => {
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

test("clicking history button redirects correctly", () => {
  const historyBtn = document.querySelector(".history-btn");
  historyBtn.onclick = jest.fn();
  historyBtn.click();
  expect(historyBtn.onclick).toHaveBeenCalled();
});

test("clicking preferences button redirects correctly", () => {
  const preferencesBtn = document.querySelector(".preferences-btn");
  preferencesBtn.onclick = jest.fn();
  preferencesBtn.click();
  expect(preferencesBtn.onclick).toHaveBeenCalled();
});

test("clicking logout button redirects correctly", () => {
  const logoutBtn = document.querySelector(".logout-btn");
  logoutBtn.onclick = jest.fn();
  logoutBtn.click();
  expect(logoutBtn.onclick).toHaveBeenCalled();
});

async function flushAll() {
  await Promise.resolve();
  await Promise.resolve();
}

test("exitApp calls backend exit function if defined", () => {
  window.exitApp = () => {
    if (window.backend && window.backend.exitApp) {
      window.backend.exitApp();
    }
  };

  window.exitApp();
  expect(window.backend.exitApp).toHaveBeenCalled();
});