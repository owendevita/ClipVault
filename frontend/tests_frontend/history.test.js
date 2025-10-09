/**
 * @jest-environment jsdom
 */
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require("jsdom");

global.fetch = jest.fn(); // mock fetch globally
global.alert = jest.fn();
global.confirm = jest.fn(() => true); // auto-confirm deletes

let window, document, loadHistory, clearHistory, formatDate;

beforeEach(() => {
  const dom = new JSDOM(
    `
    <body>
      <div id="entries-container" class="entries"></div>
      <button class="clear-history-btn">Clear All History</button>
    </body>
    `,
    { runScripts: "dangerously" }
  );

  window = dom.window;
  document = window.document;

  // Inject the functions similar to your HTML <script> section
  formatDate = (isoString) => {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const BACKEND_URL = "http://127.0.0.1:8000";

  const checkHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      const data = await res.json();
      return data.status === "ok";
    } catch {
      return false;
    }
  };

  loadHistory = async () => {
    const healthy = await checkHealth();
    if (!healthy) {
      alert("Backend unavailable. Please ensure the server is running.");
      return;
    }

    const res = await fetch(`${BACKEND_URL}/clipboard/history?limit=20`);
    const history = await res.json();
    const container = document.getElementById("entries-container");
    container.innerHTML = "";

    history.forEach((entry, idx) => {
      const row = document.createElement("div");
      row.className = "entry-row";

      const btn = document.createElement("button");
      btn.className = "entry-btn";
      btn.dataset.enabled = "false";
      btn.dataset.id = idx;
      btn.textContent = "Click to reveal";

      const time = document.createElement("p");
      time.className = "entry-modified-time";
      time.textContent = formatDate(entry.timestamp);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      const deleteIcon = document.createElement("img");
      deleteIcon.src = "./bin.png";
      deleteIcon.alt = "Delete";
      deleteBtn.appendChild(deleteIcon);

      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm("Delete this entry?");
        if (!confirmed) return;

        const res = await fetch(`${BACKEND_URL}/clipboard/delete/${entry.id}`, {
          method: "DELETE",
        });
        if (res.ok) row.remove();
      });

      btn.addEventListener("click", () => {
        if (btn.dataset.enabled === "false") {
          btn.dataset.enabled = "true";
          btn.textContent = entry.content;
        } else {
          btn.dataset.enabled = "false";
          btn.textContent = "Click to reveal";
        }
      });

      row.appendChild(btn);
      row.appendChild(time);
      row.appendChild(deleteBtn);
      container.appendChild(row);
    });
  };

  clearHistory = async () => {
    const healthy = await checkHealth();
    if (!healthy) {
      alert("Backend unavailable. Please ensure the server is running.");
      return;
    }
    await fetch(`${BACKEND_URL}/clipboard/clear-history`, { method: "DELETE" });
    document.getElementById("entries-container").innerHTML = "";
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

test("formatDate returns formatted date string", () => {
  const dateStr = "2025-10-08T07:30:00Z";
  const result = formatDate(dateStr);
  expect(result).toMatch(/\bOct\b/);
});

test("loadHistory populates entries correctly", async () => {
  fetch
    .mockResolvedValueOnce({
      json: async () => ({ status: "ok" }),
    })
    .mockResolvedValueOnce({
      json: async () => [
        { id: 1, content: "hello", timestamp: "2025-10-08T00:00:00Z" },
      ],
    });

  await loadHistory();

  const rows = document.querySelectorAll(".entry-row");
  expect(rows.length).toBe(1);
  expect(rows[0].querySelector(".entry-btn").textContent).toBe("Click to reveal");
  expect(rows[0].querySelector(".entry-modified-time").textContent).toContain("Oct");
});

test("entry button toggles visibility", async () => {
  fetch
    .mockResolvedValueOnce({
      json: async () => ({ status: "ok" }),
    })
    .mockResolvedValueOnce({
      json: async () => [
        { id: 1, content: "secret text", timestamp: "2025-10-08T00:00:00Z" },
      ],
    });

  await loadHistory();

  const btn = document.querySelector(".entry-btn");
  expect(btn.textContent).toBe("Click to reveal");
  btn.click();
  expect(btn.textContent).toBe("secret text");
  btn.click();
  expect(btn.textContent).toBe("Click to reveal");
});

test("delete button removes entry row", async () => {
  fetch
    .mockResolvedValueOnce({
      json: async () => ({ status: "ok" }),
    })
    .mockResolvedValueOnce({
      json: async () => [
        { id: 1, content: "to delete", timestamp: "2025-10-08T00:00:00Z" },
      ],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

  await loadHistory();

  const deleteBtn = document.querySelector(".delete-btn");
  deleteBtn.click();

  // Wait for event loop
  await Promise.resolve();

  expect(document.querySelectorAll(".entry-row").length).toBe(0);
});

test("clearHistory clears all entries", async () => {
  fetch
    .mockResolvedValueOnce({ json: async () => ({ status: "ok" }) }) // loadHistory health
    .mockResolvedValueOnce({
      json: async () => [
        { id: 1, content: "A", timestamp: "2025-10-08T00:00:00Z" },
        { id: 2, content: "B", timestamp: "2025-10-08T00:00:00Z" },
      ],
    }) // loadHistory data
    .mockResolvedValueOnce({ json: async () => ({ status: "ok" }) }) // clearHistory health
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // clearHistory delete

  await loadHistory();
  expect(document.querySelectorAll(".entry-row").length).toBe(2);

  await clearHistory();
  await Promise.resolve(); // let DOM flush
  expect(document.querySelectorAll(".entry-row").length).toBe(0);
});