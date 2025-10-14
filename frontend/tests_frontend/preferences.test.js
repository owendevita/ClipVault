/**
 * @jest-environment jsdom
 */

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require("jsdom");
const { initPreferences } = require("../preferences.js");

let window, document, popup, hotkeyDisplay, saveBtn, cancelBtn, hotkeyButtons, prefs;

beforeEach(() => {
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

  btn.click();

  prefs.handleKeydown({
    key: "X",
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => {},
  });

  saveBtn.click();

  expect(btn.textContent).toBe("CTRL + X");
  expect(popup.style.display).toBe("none");
});

test("duplicate hotkey combos are prevented", () => {
  const btn1 = hotkeyButtons[0];
  const btn2 = hotkeyButtons[1];

  btn1.click();
  prefs.handleKeydown({
    key: "C",
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => {},
  });
  saveBtn.click();

  expect(btn1.textContent).toBe("CTRL + X");
  expect(hotkeyDisplay.textContent).toBe("Combo already in use!");
});

test("hotkey popup ignores key presses when closed", () => {
  expect(popup.style.display).toBe("none");

  prefs.handleKeydown({
    key: "A",
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    preventDefault: () => {},
  });

  expect(hotkeyDisplay.textContent).toBe("");
});

test("saving invalid combo shows message", () => {
  const btn = hotkeyButtons[0];
  btn.click();

  saveBtn.click();

  expect(hotkeyDisplay.textContent).toBe("Please press a valid key combo!");
  expect(popup.style.display).toBe("flex");
});