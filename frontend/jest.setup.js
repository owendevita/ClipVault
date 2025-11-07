const fetchMock = require("jest-fetch-mock");
fetchMock.enableMocks();

global.fetch = fetchMock;

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(window, "alert").mockImplementation(() => {});
});