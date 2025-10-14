// Auth check
window.addEventListener('DOMContentLoaded', () => {
    if (!window.backend.auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadUserInfo();
    loadSecurityStatus();
    setupEventListeners();
});

// User info
function loadUserInfo() {
    const username = window.backend.auth.getUsername();
    document.getElementById('current-username').textContent = username;
}

// Security status
async function loadSecurityStatus() {
    const statusElement = document.getElementById('security-status');
    
    try {
        const securityStatus = await window.backend.getSecurityStatus();
        
        statusElement.innerHTML = `
            <div class="security-item ${securityStatus.encryption_working ? 'status-good' : 'status-bad'}">
                <strong>🔐 Encryption:</strong> ${securityStatus.encryption_working ? '✅ Active' : '❌ Error'}
            </div>
            <div class="security-item ${securityStatus.key_storage?.clipboard_key_exists ? 'status-good' : 'status-bad'}">
                <strong>🔑 Clipboard Key:</strong> ${securityStatus.key_storage?.clipboard_key_exists ? '✅ Available' : '❌ Missing'}
            </div>
            <div class="security-item ${securityStatus.key_storage?.jwt_secret_exists ? 'status-good' : 'status-bad'}">
                <strong>🛡️ Auth Key:</strong> ${securityStatus.key_storage?.jwt_secret_exists ? '✅ Available' : '❌ Missing'}
            </div>
            <div class="security-item">
                <strong>🕐 Last Updated:</strong> ${new Date(securityStatus.timestamp * 1000).toLocaleString()}
            </div>
        `;
        
    } catch (error) {
        console.error('Failed to load security status:', error);
        statusElement.innerHTML = `
            <div class="security-item status-bad">
                <strong>❌ Error:</strong> Could not load security status
            </div>
        `;
    }
}

// Wire buttons + hotkeys
function setupEventListeners() {
    // Security management buttons
    document.getElementById('rotate-clipboard-key').addEventListener('click', rotateClipboardKey);
    document.getElementById('rotate-jwt-secret').addEventListener('click', rotateJWTSecret);
    
    // Hotkey management
    initHotkeyManagement();
}

// Rotate clipboard key
async function rotateClipboardKey() {
    const confirmed = confirm(
        '⚠️ WARNING: Rotating the clipboard encryption key will make ALL existing encrypted clipboard data unreadable!\n\n' +
        'This action cannot be undone. Are you absolutely sure you want to continue?'
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = confirm('This is your final warning. All existing clipboard history will be lost. Continue?');
    if (!doubleConfirm) return;
    
    try {
        const result = await window.backend.rotateClipboardKey();
        alert('✅ Clipboard encryption key rotated successfully!\n\nAll existing encrypted data is now inaccessible.');
        loadSecurityStatus(); // Refresh status
    } catch (error) {
        console.error('Failed to rotate clipboard key:', error);
        alert('❌ Failed to rotate clipboard key. Please try again.');
    }
}

// Rotate JWT secret
async function rotateJWTSecret() {
    const confirmed = confirm(
        '⚠️ WARNING: Rotating the JWT secret key will log out ALL users!\n\n' +
        'You will need to log in again after this action. Continue?'
    );
    
    if (!confirmed) return;
    
    try {
        const result = await window.backend.rotateJWTSecret();
        alert('✅ JWT secret key rotated successfully!\n\nAll users have been logged out for security.');
        
        // Force logout after key rotation
        window.backend.auth.logout();
    } catch (error) {
        console.error('Failed to rotate JWT secret:', error);
        alert('❌ Failed to rotate JWT secret. Please try again.');
    }
}

// Hotkeys
function initHotkeyManagement() {
    const popup = document.getElementById("hotkey-popup");
    const hotkeyDisplay = document.getElementById("hotkey-display");
    const saveBtn = document.getElementById("save-hotkey-btn");
    const cancelBtn = document.getElementById("cancel-hotkey-btn");
    const hotkeyButtons = document.querySelectorAll(".hotkey-btn");
    const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
    
    let currentCombo = [];
    let activeButton = null;
    const savedCombos = new Set();
    let listenerAttached = false;

    function handleKeydown(e) {
        if (popup.style.display !== "flex") return;

        // Escape closes popup
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

        // Build key combination
        currentCombo = [];
        if (e.ctrlKey) currentCombo.push("CTRL");
        if (e.shiftKey) currentCombo.push("SHIFT");
        if (e.altKey) currentCombo.push("ALT");
        if (e.metaKey) currentCombo.push(isMac ? "CMD" : "WIN");

        if (!["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
            currentCombo.push(e.key.toUpperCase());
        }

        hotkeyDisplay.textContent = currentCombo.join(" + ");
    }

    hotkeyButtons.forEach(btn => {
        savedCombos.add(btn.textContent.trim());

        btn.addEventListener("click", () => {
            currentCombo = [];
            activeButton = btn;
            // Show a helpful prompt when the popup opens
            const helperText = "Press new key combination...";
            const target = document.getElementById("hotkey-display");
            if (target) target.textContent = helperText;
            popup.style.display = "flex";
            if (!listenerAttached) {
                window.addEventListener("keydown", handleKeydown);
                listenerAttached = true;
            }
        });
    });

    saveBtn.addEventListener("click", () => {
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
}

// Expose a small test-friendly initializer when required from Node (Jest)
// This does not affect the browser path because module.exports is undefined there.
if (typeof module !== 'undefined' && module.exports) {
    module.exports.initPreferences = function({ popup, hotkeyDisplay, saveBtn, cancelBtn, hotkeyButtons, isMac = false }) {
        let currentCombo = [];
        let activeButton = null;
        const savedCombos = new Set();
        let listenerAttached = false;

        function handleKeydown(e) {
            if (popup.style.display !== 'flex') return;
            if (e.key === 'Escape') {
                popup.style.display = 'none';
                activeButton = null;
                currentCombo = [];
                return;
            }
            e.preventDefault();
            currentCombo = [];
            if (e.ctrlKey) currentCombo.push('CTRL');
            if (e.shiftKey) currentCombo.push('SHIFT');
            if (e.altKey) currentCombo.push('ALT');
            if (e.metaKey) currentCombo.push(isMac ? 'CMD' : 'WIN');
            if (!['Control','Shift','Alt','Meta'].includes(e.key)) {
                currentCombo.push(e.key.toUpperCase());
            }
            hotkeyDisplay.textContent = currentCombo.join(' + ');
        }

        hotkeyButtons.forEach(btn => {
            savedCombos.add(btn.textContent.trim());
            btn.addEventListener('click', () => {
                currentCombo = [];
                activeButton = btn;
                hotkeyDisplay.textContent = 'Press new key combination...';
                popup.style.display = 'flex';
            });
        });

        saveBtn.addEventListener('click', () => {
            const comboString = currentCombo.join(' + ');
            if (!comboString) {
                hotkeyDisplay.textContent = 'Please press a valid key combination!';
                return;
            }
            if (activeButton) savedCombos.delete(activeButton.textContent.trim());
            if (savedCombos.has(comboString)) {
                hotkeyDisplay.textContent = 'Combo already in use!';
                return;
            }
            if (activeButton) {
                activeButton.textContent = comboString;
                savedCombos.add(comboString);
            }
            popup.style.display = 'none';
            activeButton = null;
            currentCombo = [];
        });

        cancelBtn.addEventListener('click', () => {
            popup.style.display = 'none';
            activeButton = null;
            currentCombo = [];
        });

        // Provide handleKeydown so tests can simulate keystrokes without window listeners
        return { handleKeydown };
    };
}