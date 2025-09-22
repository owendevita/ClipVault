/**
 * @jest-environment jsdom
 */

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require("jsdom");
const { initPreferences } = require("../preferences.js"); // adjust path if needed

let window, document, popup, hotkeyDisplay, saveBtn, cancelBtn, hotkeyButtons, prefs;

beforeEach(() => {
  // Minimal neutral HTML for testing
  const dom = new JSDOM(`
    <div id="hotkey-popup" style="display: none;"></div>
    <p id="hotkey-display"></p>
    <button id="save-hotkey-btn">Save</button>
    <button id="cancel-hotkey-btn">Cancel</button>
    <button class="hotkey-btn">CTRL + X</button>
    <button class="hotkey-btn">CTRL + C</button>
  `, { runScripts: "dangerously" });

  window = dom.window;
  document = window.document;

  popup = document.getElementById("hotkey-popup");
  hotkeyDisplay = document.getElementById("hotkey-display");
  saveBtn = document.getElementById("save-hotkey-btn");
  cancelBtn = document.getElementById("cancel-hotkey-btn");
  hotkeyButtons = document.querySelectorAll(".hotkey-btn");

  // IMPORTANT: assign prefs to capture handleKeydown
  prefs = initPreferences({
    popup,
    hotkeyDisplay,
    saveBtn,
    cancelBtn,
    hotkeyButtons,
    isMac: false,
  });
});

afterEach(() => {
  window.close();
});

test("clicking hotkey button shows popup", () => {
  hotkeyButtons[0].click();
  expect(popup.style.display).toBe("flex");
  expect(hotkeyDisplay.textContent).toBe("Press new key combination...");
});

test("cancel button hides popup", () => {
  hotkeyButtons[0].click();
  cancelBtn.click();
  expect(popup.style.display).toBe("none");
});

test("Escape key hides popup", () => {
  hotkeyButtons[0].click();

  // Use handleKeydown from the same initPreferences instance
  prefs.handleKeydown({
    key: "Escape",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => {},
  });

  expect(popup.style.display).toBe("none");
});

test("saving new hotkey updates button text", () => {
  const btn = hotkeyButtons[0];

  // Open popup
  btn.click();

  // Use handleKeydown from the same initPreferences instance
  prefs.handleKeydown({
    key: "X",
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => {},
  });

  // Click save button
  saveBtn.click();

  expect(btn.textContent).toBe("CTRL + X");
  expect(popup.style.display).toBe("none");
});
