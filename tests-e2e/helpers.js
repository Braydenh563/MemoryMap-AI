// Shared steps for the flow specs. Each helper drives the real UI the way a
// person would, or reads back through the app's own `apiJson` (the same
// authenticated helper the page uses) when the outcome is data rather than
// pixels. Asserting on what a person sees after a reload is the point of
// these specs (see playwright.config.js), so the helpers wait for the app to
// be really up, not for a request to return.
const { expect } = require("@playwright/test");
const { E2E_PASSWORD: PASSWORD } = require("./playwright.config.js");

// Every uncaught exception and console.error on the page, for the specs that
// end with "and nothing threw". Attach before the first goto.
function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // A 4xx the app asked for on purpose (a probe for an optional extra) is
    // logged by the browser itself, not by the app's code.
    if (/Failed to load resource/.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

// The app is up: the boot splash and the opening curtain are gone and the
// tab bar answers. `networkidle` never settles here (the app polls).
async function openApp(page, route = "/") {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  // A spec that locks the app (notes.spec.js) ends every saved session, so
  // a later spec may meet the lock screen: sign in the way a person would.
  const locked = await page
    .waitForFunction(
      () => {
        const field = document.getElementById("lock-password");
        const overlay = document.getElementById("lock-overlay");
        if (field && overlay && !overlay.classList.contains("hidden") && field.offsetParent !== null) return "lock";
        return overlay && overlay.classList.contains("hidden") && localStorage.getItem("token") ? "app" : false;
      },
      null,
      { timeout: 20_000 }
    )
    .then((handle) => handle.jsonValue());
  if (locked === "lock") {
    await page.fill("#lock-password", PASSWORD);
    await page.click("#lock-submit");
  }
  await page.waitForFunction(
    () => {
      const splash = document.getElementById("boot-splash");
      const lock = document.getElementById("lock-overlay");
      return (
        (!splash || splash.classList.contains("hidden")) &&
        lock && lock.classList.contains("hidden") &&
        !document.documentElement.classList.contains("shell-curtain") &&
        typeof window.apiJson === "function"
      );
    },
    null,
    { timeout: 20_000 }
  );
}

async function openTab(page, tab) {
  await page.click(`#tab-btn-${tab}`);
  await expect(page.locator(`#tab-${tab}`)).toBeVisible();
}

// The app's own authenticated fetch, from inside the page.
function api(page, route, options) {
  return page.evaluate(([r, o]) => apiJson(r, o), [route, options || {}]);
}

// Notes, Capture: type into the composer and press Save. Returns the new
// note's id, read from the status line the composer writes it to.
async function captureNote(page, text, { title, tags, category } = {}) {
  await openTab(page, "notes");
  await page.click('#notes-subtabs [data-section="capture"]');
  const box = page.locator("#entry-content");
  await expect(box).toBeVisible();
  if (title !== undefined) await page.fill("#entry-title", title);
  if (tags !== undefined) await page.fill("#entry-tags", tags);
  if (category !== undefined) await page.selectOption("#entry-category", { label: category });
  // Clicked and typed, not filled: a click upgrades the textarea to the live
  // editor (CodeMirror) the way it does for a person, and the save must read
  // what was typed there.
  const live = page.locator('.cm-content[aria-label="New note"]');
  await ((await live.count()) ? live : box).click();
  await page.keyboard.insertText(text);
  await expect(box).toHaveValue(text);
  const status = page.locator("#save-status");
  const before = await status.getAttribute("data-entry-id");
  await page.click("#save-btn");
  await expect.poll(() => status.getAttribute("data-entry-id")).not.toBe(before);
  const id = Number(await status.getAttribute("data-entry-id"));
  expect(id, "the composer wrote no note id after Save").toBeGreaterThan(0);
  return id;
}

// Background filing settles: the note leaves "pending".
async function waitFiled(page, id) {
  let note;
  await expect
    .poll(
      async () => {
        note = await api(page, `/entries/${id}`);
        return note.filing_state;
      },
      { timeout: 20_000, message: `note ${id} never left the filing queue` }
    )
    .not.toBe("pending");
  return note;
}

// A note in the bin answers 404 to a plain read, so "is it there" is whether
// the read succeeds.
function noteExists(page, id) {
  return page.evaluate((nid) => apiJson(`/entries/${nid}`).then(() => true, () => false), id);
}

module.exports = { watchErrors, openApp, openTab, api, captureNote, waitFiled, noteExists };
