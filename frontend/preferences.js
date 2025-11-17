const BACKEND_URL = "http://127.0.0.1:8000";
const HOTKEY_HELP_TEXT = "Press new key combination...";

if (!window.backend) {
  window.backend = {
    getPreferences: async () => {
      return JSON.parse(localStorage.getItem("clipvault_preferences") || "{}");
    },
    updatePreferences: async (prefs) => {
      localStorage.setItem("clipvault_preferences", JSON.stringify(prefs));
      return { success: true };
    },
    auth: {
      isLoggedIn: () => true,
      getUsername: () => "BrowserMode",
      setToken: () => {},
    },
    getSecurityStatus: async () => ({
      encryption_working: false,
      key_storage: {
        clipboard_key_exists: false,
        jwt_secret_exists: false,
      },
      timestamp: Date.now() / 1000
    })
  };
}

function loadUserInfo() {
    const username = window.backend.auth.getUsername();
    const el = document.getElementById("current-username");
    if (el) el.textContent = username;
}

async function loadSecurityStatus() {
    const statusElement = document.getElementById("security-status");
    if (!statusElement) return;

    try {
        const securityStatus = await window.backend.getSecurityStatus();
        if (!securityStatus || typeof securityStatus !== "object" || !("encryption_working" in securityStatus)) {
            throw new Error("Invalid security status");
        }

        statusElement.innerHTML = `
            <div class="security-item ${securityStatus.encryption_working ? 'status-good' : 'status-bad'}">
                <strong>Encryption:</strong> ${securityStatus.encryption_working ? 'Active' : 'Error'}
            </div>
            <div class="security-item ${securityStatus.key_storage?.clipboard_key_exists ? 'status-good' : 'status-bad'}">
                <strong>Clipboard Key:</strong> ${securityStatus.key_storage?.clipboard_key_exists ? 'Available' : 'Missing'}
            </div>
            <div class="security-item ${securityStatus.key_storage?.jwt_secret_exists ? 'status-good' : 'status-bad'}">
                <strong>Auth Key:</strong> ${securityStatus.key_storage?.jwt_secret_exists ? 'Available' : 'Missing'}
            </div>
            <div class="security-item">
                <strong>Last Updated:</strong> ${new Date(securityStatus.timestamp * 1000).toLocaleString()}
            </div>
        `;
    } catch (error) {
        console.error("Failed to load security status:", error);
        statusElement.innerHTML = `
            <div class="security-item status-bad">
              <strong>Error:</strong> Could not load security status
            </div>
        `;
    }
}

async function loadPreferences() {
    try {
        const prefs = await window.backend.getPreferences();
        if (!prefs || typeof prefs !== "object") return;

        document.querySelectorAll(".pref-toggle").forEach(toggle => {
            const key = toggle.dataset.pref;
            if (prefs.hasOwnProperty(key)) toggle.checked = Boolean(prefs[key]);
        });

        if (prefs.hotkeys && typeof prefs.hotkeys === "object") {
            const hotkeyButtons = document.querySelectorAll(".hotkey-btn");
            if (hotkeyButtons[0] && prefs.hotkeys.copy) hotkeyButtons[0].textContent = prefs.hotkeys.copy;
            if (hotkeyButtons[1] && prefs.hotkeys.paste) hotkeyButtons[1].textContent = prefs.hotkeys.paste;
        }
    } catch (error) {
        console.error("Failed to load preferences:", error);
    }
}

async function savePreferences() {
    const preferences = {};
    document.querySelectorAll(".pref-toggle").forEach(toggle => {
        const key = toggle.dataset.pref;
        preferences[key] = toggle.checked;
    });

    const hotkeyButtons = document.querySelectorAll(".hotkey-btn");
    preferences.hotkeys = {
      copy: hotkeyButtons[0]?.textContent.trim(),
      paste: hotkeyButtons[1]?.textContent.trim(),
    };

    try {
        const response = await window.backend.updatePreferences(preferences);
        if (response?.success) {
          console.log("Preferences saved successfully!");
        } else {
          alert("Attempted to update preferences, but the server did not respond.");
        }
    } catch (error) {
        console.error("Failed to update preferences:", error);
        alert("Failed to save preferences. Please try again.");
    }
}

async function rotateClipboardKey() {
    if (!confirm("WARNING: Rotating the clipboard encryption key will make ALL existing encrypted clipboard data unreadable!\n\nThis action cannot be undone. Are you absolutely sure you want to continue?")) return;
    if (!confirm("This is your final warning. All existing clipboard history will be lost. Continue?")) return;

    try {
        await window.backend.rotateClipboardKey();
        alert("Clipboard encryption key rotated successfully!\n\nAll existing encrypted data is now inaccessible.");
        await loadSecurityStatus();
    } catch (error) {
        console.error("Failed to rotate clipboard key:", error);
        alert("Failed to rotate clipboard key. Please try again.");
    }
}

async function rotateJWTSecret() {
    if (!confirm("WARNING: Rotating the JWT secret key will log out ALL users!\n\nYou will need to log in again after this action. Continue?")) return;

    try {
        const result = await window.backend.rotateJWTSecret();
        if (result?.success === false) {
            alert("Failed to rotate JWT secret. Please try again.");
            return;
        }
        alert("JWT secret key rotated successfully!\n\nAll users have been logged out for security.");
        window.backend.auth.logout();
    } catch (error) {
        console.error("Failed to rotate JWT secret:", error);
        alert("Failed to rotate JWT secret. Please try again.");
    }
}

function initPreferences({ popup, hotkeyDisplay, saveBtn, cancelBtn, hotkeyButtons, isMac = false }) {
    let currentCombo = [];
    let activeButton = null;
    const savedCombos = new Set();
    let listenerAttached = false;

    function handleKeydown(e) {
        if (popup.style.display !== "flex") return;
        if (e.key === "Escape") {
            popup.style.display = "none";
            activeButton = null;
            currentCombo = [];
            if (listenerAttached) {
                window.removeEventListener("keydown", handleKeydown);
                listenerAttached = false;
            }
            return;
        }
        e.preventDefault();
        currentCombo = [];
        if (e.ctrlKey) currentCombo.push("CTRL");
        if (e.shiftKey) currentCombo.push("SHIFT");
        if (e.altKey) currentCombo.push("ALT");
        if (e.metaKey) currentCombo.push(isMac ? "CMD" : "WIN");
        if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) currentCombo.push(e.key.toUpperCase());
        hotkeyDisplay.textContent = currentCombo.join(" + ");
    }

    hotkeyButtons.forEach(btn => {
        savedCombos.add(btn.textContent.trim());
        btn.addEventListener("click", () => {
            currentCombo = [];
            activeButton = btn;
            hotkeyDisplay.textContent = HOTKEY_HELP_TEXT;
            popup.style.display = "flex";
            if (!listenerAttached) {
                window.addEventListener("keydown", handleKeydown);
                listenerAttached = true;
            }
        });
    });

    saveBtn.addEventListener("click", async () => {
        const comboString = currentCombo.join(" + ");
        if (!comboString) {
            hotkeyDisplay.textContent = "Please press a valid key combo!";
            return;
        }
        if (activeButton) savedCombos.delete(activeButton.textContent.trim());
        if (savedCombos.has(comboString)) {
            hotkeyDisplay.textContent = "Combo already in use!";
            return;
        }
        if (activeButton) {
            activeButton.textContent = comboString;
            savedCombos.add(comboString);
            await savePreferences();
        }
        popup.style.display = "none";
        activeButton = null;
        currentCombo = [];
        if (listenerAttached) {
            window.removeEventListener("keydown", handleKeydown);
            listenerAttached = false;
        }
    });

    cancelBtn.addEventListener("click", () => {
        popup.style.display = "none";
        activeButton = null;
        currentCombo = [];
        if (listenerAttached) {
            window.removeEventListener("keydown", handleKeydown);
            listenerAttached = false;
        }
    });
    return { handleKeydown };
}

function setupEventListeners() {
    const rotateClipboardBtn = document.getElementById("rotate-clipboard-key");
    if (rotateClipboardBtn) 
        rotateClipboardBtn.addEventListener("click", rotateClipboardKey);

    const rotateJwtBtn = document.getElementById("rotate-jwt-secret");
    if (rotateJwtBtn) 
        rotateJwtBtn.addEventListener("click", rotateJWTSecret);

    document.querySelectorAll(".pref-toggle").forEach(toggle => {
        toggle.addEventListener("change", async (e) => {
            const pref = e.target.dataset.pref;
            const value = e.target.checked;
            
            console.log("pref: ", pref);
            console.log("value:", value);
          
            if (pref === "darkMode") {
                if (value) document.body.classList.add("dark-mode");
                else document.body.classList.remove("dark-mode");
            }

            await savePreferences();
            
      });
    });

    const popup = document.getElementById("hotkey-popup");
    const hotkeyDisplay = document.getElementById("hotkey-display");
    const saveHotkeyBtn = document.getElementById("save-hotkey-btn");
    const cancelHotkeyBtn = document.getElementById("cancel-hotkey-btn");
    const hotkeyButtons = document.querySelectorAll(".hotkey-btn");
    
    if (popup && hotkeyDisplay && saveHotkeyBtn && cancelHotkeyBtn && hotkeyButtons.length) {
        initPreferences({
            popup,
            hotkeyDisplay,
            saveBtn: saveHotkeyBtn,
            cancelBtn: cancelHotkeyBtn,
            hotkeyButtons
        });
    } else {
        console.warn("Hotkey elements missing — popup not initialized.");
    }
}

async function initAfterDomLoaded() {
    const hasBackend = !!window.backend;
    const hasAuth = !!window.backend?.auth;

    if (hasAuth && !window.backend.auth.isLoggedIn()) {
        const token = localStorage.getItem('clipvault_token');
        if (token && window.backend?.auth?.setToken) {
            window.backend.auth.setToken(token);
        }

        if (!window.backend.auth.isLoggedIn()) {
            window.location.href = "login.html";
            return;
        }
    } else if (!hasAuth) {
        const token = localStorage.getItem('clipvault_token');
        if (!token) {
            window.location.href = "login.html";
            return;
        }
    }

    if (hasBackend && hasAuth) {
        loadUserInfo();
        await loadSecurityStatus();
        await loadPreferences();
    } else {
        console.warn("Running outside Electron — using placeholder data.");

        const usernameEl = document.getElementById("current-username");
        if (usernameEl) usernameEl.textContent = "Guest (no backend)";

        const statusElement = document.getElementById("security-status");
        if (statusElement) {
            statusElement.innerHTML = `
                <div class="security-item status-bad">
                  <strong>Encryption:</strong> N/A
                </div>
                <div class="security-item status-bad">
                  <strong>Clipboard Key:</strong> N/A
                </div>
                <div class="security-item status-bad">
                  <strong>Auth Key:</strong> N/A
                </div>
                <div class="security-item">
                  <strong>Last Updated:</strong> Not available in browser
                </div>
            `;
        }
    }

    setupEventListeners();
}

function bootstrapPreferences() {
    initAfterDomLoaded();
}

if (typeof window !== "undefined" && !window.JEST_TEST) {
    window.addEventListener("DOMContentLoaded", bootstrapPreferences);
}

if (typeof window !== "undefined") {
    window.preferencesBootstrap = bootstrapPreferences;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        initPreferences,
        loadPreferences,
        savePreferences,
        loadSecurityStatus,
        rotateClipboardKey,
        rotateJWTSecret,
        loadUserInfo,
        setupEventListeners,
        bootstrapPreferences,
        initAfterDomLoaded,
    };
}