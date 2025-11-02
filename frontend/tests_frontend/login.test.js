/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "../login.html"), "utf8");

beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    const msg = args.map(a => a?.toString() || "").join(" ");
    if (
      msg.includes("Not implemented: navigation") ||
      msg.includes("Network error") ||
      msg.includes("Login error:")
    ) {
      return;
    }
    originalError(...args);
  };
});

let openLoginBtn,
  openSignupBtn,
  loginModal,
  signupModal,
  submitLogin,
  submitSignup,
  loginMessage,
  signupMessage;

beforeEach(() => {
  document.documentElement.innerHTML = html.toString();

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: async () => ({ access_token: "mock_token" }),
    })
  );

  Object.defineProperty(window, "localStorage", {
    value: { setItem: jest.fn(), getItem: jest.fn(), clear: jest.fn() },
    writable: true,
  });

  delete window.location;
  window.location = { href: "" };

  require("../login.js");

  openLoginBtn = document.getElementById("openLogin");
  openSignupBtn = document.getElementById("openSignup");
  loginModal = document.getElementById("loginModal");
  signupModal = document.getElementById("signupModal");
  submitLogin = document.getElementById("submitLogin");
  submitSignup = document.getElementById("submitSignup");
  loginMessage = document.getElementById("loginMessage");
  signupMessage = document.getElementById("signupMessage");
});

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

test("login and signup buttons exist", () => {
  expect(openLoginBtn).not.toBeNull();
  expect(openSignupBtn).not.toBeNull();
});

test("clicking login button opens login modal", () => {
  openLoginBtn.click();
  expect(loginModal.style.display).toBe("flex");
});

test("clicking signup button opens signup modal", () => {
  openSignupBtn.click();
  expect(signupModal.style.display).toBe("flex");
});

test("clicking outside login modal closes it", () => {
  openLoginBtn.click();
  loginModal.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(loginModal.style.display).toBe("none");
});

test("login form shows error if fields are empty", () => {
  submitLogin.click();
  expect(loginMessage.textContent).toBe("Please enter username and password.");
  expect(loginMessage.className).toContain("error");
});

test("signup form shows error if fields are empty", () => {
  submitSignup.click();
  expect(signupMessage.textContent).toBe("Please fill out all fields.");
  expect(signupMessage.className).toContain("error");
});

async function flushAll() {
  await Promise.resolve();
  await Promise.resolve();

  const isFakeTimers = typeof jest.getRealSystemTime === "function" && jest.isMockFunction(setTimeout);
    if (isFakeTimers) {
      jest.runAllTimers();
    }

  await Promise.resolve();
  await Promise.resolve();
}

test("network error during login shows error message", async () => {
  document.getElementById("loginUsername").value = "user";
  document.getElementById("loginPassword").value = "pass";

  global.fetch.mockRejectedValueOnce(new Error("Network error"));

  submitLogin.click();

  await flushAll()

  expect(loginMessage.textContent).toContain("Network error");
  expect(loginMessage.className).toContain("error");
}, 10000);

test("failed login shows error message", async () => {
  document.getElementById("loginUsername").value = "baduser";
  document.getElementById("loginPassword").value = "badpass";

  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ detail: "Invalid credentials" }),
  });

  submitLogin.click();

  await flushAll();

  expect(loginMessage.textContent).toBe("Invalid credentials");
  expect(loginMessage.className).toContain("error");
}, 10000);

test("signup success hides modal after short delay", async () => {
  document.getElementById("signupUsername").value = "newuser";
  document.getElementById("signupPassword").value = "newpass";

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({}),
  });

  jest.useFakeTimers();

  submitSignup.click();

  await Promise.resolve();
  await Promise.resolve();

  jest.advanceTimersByTime(1500);

  await Promise.resolve();
  await Promise.resolve();

  expect(signupModal.style.display).toBe("none");
  expect(signupMessage.className).toContain("success");

  jest.useRealTimers();
}, 10000);

test("successful login stores token", async () => {
  document.getElementById("loginUsername").value = "user";
  document.getElementById("loginPassword").value = "pass";

  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ access_token: "mock_token" }),
  });

  window.backend = { sendAuthToken: jest.fn() };
  localStorage.setItem = jest.fn();


  jest.useFakeTimers();
  submitLogin.click();

  await Promise.resolve();
  await Promise.resolve();

  jest.advanceTimersByTime(1500);
  await Promise.resolve();

  expect(localStorage.setItem).toHaveBeenCalledWith("clipvault_token", "mock_token");
  expect(localStorage.setItem).toHaveBeenCalledWith("clipvault_username", "user");
  expect(window.backend.sendAuthToken).toHaveBeenCalledWith("mock_token");
  expect(loginMessage.className).toContain("success");

  jest.useRealTimers();
});

test("signup shows error if password is too short", () => {
  document.getElementById("signupUsername").value = "user";
  document.getElementById("signupPassword").value = "abc";

  submitSignup.click();

  expect(signupMessage.textContent).toBe("Password must be at least 4 characters long.");
  expect(signupMessage.className).toContain("error");
});

test("network error during signup shows error message", async () => {
  document.getElementById("signupUsername").value = "newuser";
  document.getElementById("signupPassword").value = "newpass";

  global.fetch.mockRejectedValueOnce(new Error("Network error"));

  submitSignup.click();

  await flushAll();

  expect(signupMessage.textContent).toContain("Network error");
  expect(signupMessage.className).toContain("error");
});

test("clicking outside signup modal closes it", () => {
  openSignupBtn.click();
  signupModal.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  expect(signupModal.style.display).toBe("none");
});