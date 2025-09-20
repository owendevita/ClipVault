document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://127.0.0.1:8000";

  // --- Register ---
  document.getElementById("register-btn")?.addEventListener("click", async () => {
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });

      const data = await response.json();
      alert(data.message || data.detail);
    } catch (err) {
      alert("Error registering user");
      console.error(err);
    }
  });

  // --- Login ---
  document.getElementById("login-btn")?.addEventListener("click", async () => {
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        window.location.href = "index.html";
      } else {
        alert(data.detail || "Login failed");
      }
    } catch (err) {
      alert("Error logging in");
      console.error(err);
    }
  });
});