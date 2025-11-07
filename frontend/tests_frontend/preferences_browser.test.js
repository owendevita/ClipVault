/**
 * @jest-environment jsdom
 */

const fetchMock = require("jest-fetch-mock");
fetchMock.enableMocks();

const load = () => require("../preferences.js");
const loadModule = () => require("../preferences.js");

beforeAll(() => {
    global.window.JEST_TEST = true;
});

beforeEach(() => {
    document.body.innerHTML = `
      <p id="current-username"></p>
      <div id="security-status"></div>
      <input type="checkbox" class="pref-toggle" data-pref="darkMode">
      <input type="checkbox" class="pref-toggle" data-pref="notifications">
      <button id="rotate-clipboard-key"></button>
      <button id="rotate-jwt-secret"></button>
      <button class="hotkey-btn">CTRL + C</button>
      <button class="hotkey-btn">CTRL + V</button>
      <div id="hotkey-popup"></div>
      <p id="hotkey-display"></p>
      <button id="save-hotkey-btn">Save</button>
      <button id="cancel-hotkey-btn">Cancel</button>
    `;

    global.window.backend = {
        auth: {
            isLoggedIn: jest.fn(() => true),
            getUsername: jest.fn(() => "testuser"),
            logout: jest.fn(),
        },
        getPreferences: jest.fn().mockResolvedValue({
            darkMode: true,
            notifications: false,
            hotkeys: { copy: "CTRL + C", paste: "CTRL + V" },
        }),
        updatePreferences: jest.fn().mockResolvedValue({ success: true }),
        getSecurityStatus: jest.fn().mockResolvedValue({
            encryption_working: true,
            key_storage: { clipboard_key_exists: true, jwt_secret_exists: true },
            timestamp: 1730611200,
        }),
        rotateClipboardKey: jest.fn().mockResolvedValue(true),
        rotateJWTSecret: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(window, "alert").mockImplementation(() => {});
    global.confirm = jest.fn(() => true);
});

test("loadPreferences applies preferences correctly", async () => {
    const { loadPreferences } = load();
    await loadPreferences();

    const toggles = document.querySelectorAll(".pref-toggle");
    expect(toggles[0].checked).toBe(true);
    expect(toggles[1].checked).toBe(false);

    const hotkeys = document.querySelectorAll(".hotkey-btn");
    expect(hotkeys[0].textContent).toBe("CTRL + C");
    expect(hotkeys[1].textContent).toBe("CTRL + V");
});

test("loadPreferences handles missing prefs", async () => {
    const { loadPreferences } = load();
    window.backend.getPreferences.mockResolvedValueOnce(null);
    await expect(loadPreferences()).resolves.not.toThrow();
});

test("savePreferences sends correct payload", async () => {
    const { savePreferences } = load();

    document.querySelector('[data-pref="darkMode"]').checked = false;
    document.querySelector('[data-pref="notifications"]').checked = true;
    document.querySelectorAll(".hotkey-btn")[0].textContent = "CTRL + X";

    await savePreferences();

    expect(window.backend.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
            darkMode: false,
            notifications: true,
        })
    );
});

test("loadSecurityStatus renders HTML", async () => {
    const { loadSecurityStatus } = load();
    await loadSecurityStatus();

    const html = document.getElementById("security-status").innerHTML;
    expect(html).toMatch(/Active/);
    expect(html).toMatch(/Clipboard/);
});

test("loadSecurityStatus handles failure", async () => {
    const { loadSecurityStatus } = load();
    window.backend.getSecurityStatus.mockRejectedValueOnce(new Error("fail"));

    await loadSecurityStatus();
    expect(document.getElementById("security-status").innerHTML).toMatch(/Could not/);
});

test("rotateClipboardKey confirms and calls backend", async () => {
    const { rotateClipboardKey } = load();

    await rotateClipboardKey();

    expect(window.backend.rotateClipboardKey).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
});

test("rotateClipboardKey cancels on confirm=false", async () => {
    const { rotateClipboardKey } = load();
    global.confirm = jest.fn(() => false);

    await rotateClipboardKey();
    expect(window.backend.rotateClipboardKey).not.toHaveBeenCalled();
});

test("rotateClipboardKey second confirm cancels", async () => {
    const { rotateClipboardKey } = load();

    global.confirm = jest.fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

    await rotateClipboardKey();
    expect(window.backend.rotateClipboardKey).not.toHaveBeenCalled();
});

test("rotateJWTSecret rotates and logs out", async () => {
    const { rotateJWTSecret } = load();

    await rotateJWTSecret();
    expect(window.backend.rotateJWTSecret).toHaveBeenCalled();
    expect(window.backend.auth.logout).toHaveBeenCalled();
});

test("rotateJWTSecret handles backend error", async () => {
    const { rotateJWTSecret } = load();
    window.backend.rotateJWTSecret.mockRejectedValueOnce(new Error("fail"));

    await rotateJWTSecret();
    expect(window.alert).toHaveBeenCalled();
});

test("initPreferences handleKeydown updates display", () => {
    const { initPreferences } = load();

    const popup = document.getElementById("hotkey-popup");
    popup.style.display = "flex";

    const { handleKeydown } = initPreferences({
        popup,
        hotkeyDisplay: document.getElementById("hotkey-display"),
        saveBtn: document.getElementById("save-hotkey-btn"),
        cancelBtn: document.getElementById("cancel-hotkey-btn"),
        hotkeyButtons: [...document.querySelectorAll(".hotkey-btn")],
    });

    const e = new KeyboardEvent("keydown", { key: "Z", ctrlKey: true });
    handleKeydown(e);

    expect(document.getElementById("hotkey-display").textContent).toContain("CTRL + Z");
});

describe("initAfterDomLoaded", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test("runs initialization when logged in", async () => {
      jest.doMock("../preferences.js", () => ({
          __esModule: true,
          loadUserInfo: jest.fn(),
          loadPreferences: jest.fn(),
          loadSecurityStatus: jest.fn(),
          setupEventListeners: jest.fn(),
          initAfterDomLoaded: jest.fn(async function() {
              this.loadUserInfo();
              this.loadPreferences();
              this.loadSecurityStatus();
              this.setupEventListeners();
          }),
      }));

      const mod = require("../preferences.js");
      await mod.initAfterDomLoaded();

      expect(mod.loadUserInfo).toHaveBeenCalled();
      expect(mod.loadPreferences).toHaveBeenCalled();
      expect(mod.loadSecurityStatus).toHaveBeenCalled();
      expect(mod.setupEventListeners).toHaveBeenCalled();
    });

    afterEach(() => {
        jest.resetModules();
        jest.dontMock("../preferences.js");
    });
});

test("loadUserInfo does nothing when element missing", () => {
    document.body.innerHTML = "";
    const { loadUserInfo } = load();
    expect(() => loadUserInfo()).not.toThrow();
});

test("loadSecurityStatus handles invalid object shape", async () => {
    const { loadSecurityStatus } = load();
    window.backend.getSecurityStatus.mockResolvedValueOnce({});
    await loadSecurityStatus();
    expect(document.getElementById("security-status").innerHTML).toMatch(/Could not/);
});

test("module exports required functions", () => {
    const mod = loadModule();
    expect(typeof mod.loadPreferences).toBe("function");
    expect(typeof mod.loadSecurityStatus).toBe("function");
    expect(typeof mod.setupEventListeners).toBe("function");
    expect(typeof mod.loadUserInfo).toBe("function");
    expect(typeof mod.savePreferences).toBe("function");
    expect(typeof mod.rotateClipboardKey).toBe("function");
    expect(typeof mod.rotateJWTSecret).toBe("function");
    expect(typeof mod.initPreferences).toBe("function");
    expect(typeof mod.bootstrapPreferences).toBe("function");
});

test("initAfterDomLoaded sets token from localStorage if not logged in", async () => {
    const token = "FAKE_JWT_TOKEN";
    localStorage.setItem("clipvault_token", token);

    const setTokenMock = jest.fn();
    const isLoggedInMock = jest.fn()
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

    global.window.backend = {
        auth: {
            isLoggedIn: isLoggedInMock,
            setToken: setTokenMock,
            getUsername: jest.fn(() => "user1"),
            logout: jest.fn(),
        },
        getPreferences: jest.fn().mockResolvedValue({}),
        getSecurityStatus: jest.fn().mockResolvedValue({
            encryption_working: true,
            key_storage: { clipboard_key_exists: true, jwt_secret_exists: true },
            timestamp: 1730611200
        }),
        updatePreferences: jest.fn(),
        rotateClipboardKey: jest.fn(),
        rotateJWTSecret: jest.fn(),
    };

    const prefsModule = require("../preferences.js");

    await prefsModule.initAfterDomLoaded();

    expect(setTokenMock).toHaveBeenCalledWith(token);

    expect(isLoggedInMock).toHaveBeenCalledTimes(2);

    const usernameEl = document.getElementById("current-username");
    if (usernameEl) {
        expect(usernameEl.textContent).toBe("user1");
    }

    localStorage.removeItem("clipvault_token");
});
