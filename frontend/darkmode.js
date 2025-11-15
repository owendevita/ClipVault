(async function applyDarkMode() {
  try {
    let prefs = null;

    if (window.backend?.getPreferences) {
      prefs = await window.backend.getPreferences();
    } else {
      prefs = JSON.parse(localStorage.getItem("clipvault_preferences") || "{}");
    }

    if (prefs?.darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  } catch (err) {
    console.warn("Could not apply dark mode:", err);
  }
})();