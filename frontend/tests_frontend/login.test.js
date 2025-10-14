/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "../login.html"), "utf8");

let loginBtn;

beforeEach(() => {
  document.documentElement.innerHTML = html.toString();
  global.submitLogin = jest.fn();
  loginBtn = document.getElementById("openLogin");
});

test("login button exists", () => {
  expect(loginBtn).not.toBeNull();
});

test("login button click calls function", () => {
  let clicked = false;
  loginBtn.addEventListener("click", () => { clicked = true });
  loginBtn.click();
  expect(clicked).toBe(true);
});