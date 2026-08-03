// Headless Playwright smoke suite (roadmap ANALYSIS.md §31, ROADMAP.md §38.2).
//
// The point named in the roadmap: "every layout bug found by hand has
// passed a fully green run" — the Python suite fakes every AI call and
// never opens a browser, so a clipped tab, an overlapping z-index or a
// console error has never once failed CI. This doesn't replace that
// suite; it catches the class of bug it structurally cannot.
//
// PLAYWRIGHT_BROWSERS_PATH, if set, is respected automatically by
// Playwright itself — no code here needs to know about it. In this sandbox
// that points at the pre-installed Chromium; in real CI, `npx playwright
// install --with-deps chromium` downloads one to the default cache location
// and this config works unchanged either way.
const { defineConfig, devices } = require("@playwright/test");
const os = require("os");
const path = require("path");

const PORT = process.env.MEMORYMAP_E2E_PORT || 8799;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DATA_DIR = path.join(os.tmpdir(), `memorymap-e2e-${PORT}`);

module.exports = defineConfig({
  testDir: "./specs",
  // One shared app instance (see webServer below), so tests run serially
  // against one notebook rather than each spinning up its own server.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // "github" alone annotates the run but writes no report to disk — the CI
  // job uploads playwright-report/ on failure, which needs "html" too.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  globalSetup: require.resolve("./global-setup.js"),
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    // Written by global-setup.js: first-run password, unlock and the
    // onboarding overlay dismissed once, reused by every spec so each one
    // isn't repeating the same slow setup dance.
    storageState: path.join(__dirname, ".auth-state.json"),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // MEMORYMAP_PYTHON lets this run against the sandbox's .venv locally;
    // real CI has `python` on PATH after `pip install -e .`, same as the
    // Python suite's own CI job.
    command:
      `${process.env.MEMORYMAP_PYTHON || "python"} -m uvicorn ` +
      `memorymap.api.app:create_app --factory --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 30_000,
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PYTHONPATH: "src",
      MEMORYMAP_DATA_DIR: DATA_DIR,
    },
  },
});

module.exports.BASE_URL = BASE_URL;
module.exports.E2E_PASSWORD = "e2e-smoke-test-password";
