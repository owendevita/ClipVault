function initPreferences({
  popup = document.getElementById("hotkey-popup"),
  hotkeyDisplay = document.getElementById("hotkey-display"),
  saveBtn = document.getElementById("save-hotkey-btn"),
  cancelBtn = document.getElementById("cancel-hotkey-btn"),
  hotkeyButtons = document.querySelectorAll(".hotkey-btn"),
  isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC")
} = {}) {
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
      hotkeyDisplay.textContent = "Press new key combination...";
      activeButton = btn;
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
  return { handleKeydown }; // For TESTING only!
}

// Auto-run in browser (skip if running in Jest)
if (typeof window !== "undefined" && typeof jest === "undefined") {
  window.addEventListener("DOMContentLoaded", () => initPreferences());
}

module.exports = { initPreferences };