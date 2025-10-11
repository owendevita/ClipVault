/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "../login.html"), "utf8");

beforeAll(() => {
  const originalError = console.error;
  console.error = (...args) => {
    const msg = args[0]?.toString() || "";
    if (msg.includes("Not implemented: navigation") || msg.includes("Network error")) return;
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

  global.fetch = jest.fn();

  Object.defineProperty(window, "localStorage", {
    value: {
      setItem: jest.fn(),
      getItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

  delete window.location;
  window.location = { href: "" };

  jest.isolateModules(() => {
    require("../login.js");
  });

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


test("network error during login shows error message", async () => {
  document.getElementById("loginUsername").value = "user";
  document.getElementById("loginPassword").value = "pass";

  global.fetch.mockRejectedValueOnce(new Error("Network error"));

  submitLogin.click();

  await flushAll();

  expect(loginMessage.textContent).toContain("Network error");
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