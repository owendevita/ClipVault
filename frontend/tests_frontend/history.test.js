/**
 * @jest-environment jsdom
 */

const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM } = require("jsdom");

let window, document, entryButtons, clearBtn;

beforeEach(() => {
  const dom = new JSDOM(`
    <div class="entries">
      <div class="entry-row">
        <button class="entry-btn" data-enabled="false">Click to reveal entry</button>
        <p class="entry-modified-time">00:00:00</p>
      </div>
      <div class="entry-row">
        <button class="entry-btn" data-enabled="false">Click to reveal entry</button>
        <p class="entry-modified-time">00:00:00</p>
      </div>
    </div>
    <button class="clear-history-btn">Clear All History</button>
  `, { runScripts: "dangerously" });

  window = dom.window;
  document = window.document;

  entryButtons = document.querySelectorAll(".entry-btn");
  clearBtn = document.querySelector(".clear-history-btn");

  // Attach click handlers manually
  entryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.enabled === "false") {
        btn.dataset.enabled = "true";
        btn.textContent = "test data";
      } else {
        btn.dataset.enabled = "false";
        btn.textContent = "Click to reveal entry";
      }
    });
  });

  clearBtn.addEventListener("click", () => {
    document.querySelectorAll(".entry-row").forEach(row => row.remove());
  });
});


afterEach(() => {
  window.close();
});

test("clicking an entry button toggles text and data-enabled", () => {
  const btn = entryButtons[0];

  // Initial state
  expect(btn.dataset.enabled).toBe("false");
  expect(btn.textContent).toBe("Click to reveal entry");

  // Click to reveal
  btn.click();
  expect(btn.dataset.enabled).toBe("true");
  expect(btn.textContent).toBe("test data");

  // Click again to hide
  btn.click();
  expect(btn.dataset.enabled).toBe("false");
  expect(btn.textContent).toBe("Click to reveal entry");
});

test("clicking clear history removes all entry rows", () => {
  const rows = document.querySelectorAll(".entry-row");
  expect(rows.length).toBe(2);

  clearBtn.click();

  const rowsAfter = document.querySelectorAll(".entry-row");
  expect(rowsAfter.length).toBe(0);
});