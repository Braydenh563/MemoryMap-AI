// Smoke suite: every tab loads, throws nothing, and doesn't overflow the
// viewport. Not a feature test — the Python suite already covers behaviour
// with the API faked; this is the one thing it structurally cannot see; a
// tab that renders wrong, a console exception on load, a card that pushes
// the page sideways.
const { test, expect } = require("@playwright/test");

// Mirrors app.js's own TABS array, minus "documents" — §36F replaced it with
// Library in the nav bar rather than keeping both (see index.html's own
// comment above #tab-btn-library), so it has no persistent #tab-btn-documents
// to click; it's reached by opening a document from the Library instead.
// Found by this suite's first real run, which is exactly the job it's for.
const TABS = [
  "dashboard",
  "notes",
  "chat",
  "graph",
  "library",
  "timeline",
  "reminders",
];

test.describe("every tab loads clean", () => {
  for (const tab of TABS) {
    test(`${tab} tab: no console errors, no layout overflow`, async ({ page }) => {
      const pageErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/");
      await page.waitForSelector(`#tab-btn-${tab}`, { timeout: 15_000 });
      await page.click(`#tab-btn-${tab}`);
      await page.waitForTimeout(500); // let async loads (fetches, renders) settle

      await expect(page.locator(`#tab-${tab}`)).toBeVisible();

      // The `--page-viewport`/`--page-sticky-h` traps HANDOVER.md names by
      // name: a box sized against a guess at the window, not the box it's
      // actually in, pushes the page wider than the screen rather than
      // clipping — which is invisible to a test that only checks elements
      // exist, and exactly what this catches.
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      expect(
        overflow,
        `#tab-${tab} is ${overflow}px wider than the viewport — something is overflowing horizontally`
      ).toBeLessThanOrEqual(1); // 1px of rounding slack, not a real overflow

      expect(pageErrors, `uncaught exceptions on ${tab}: ${pageErrors.join("; ")}`).toEqual([]);
      expect(
        consoleErrors,
        `console.error on ${tab}: ${consoleErrors.join("; ")}`
      ).toEqual([]);
    });
  }
});

test("capturing a note makes it appear in Notes -> Browse", async ({ page }) => {
  await page.goto("/");
  await page.click("#tab-btn-notes");
  // The Notes tab defaults to its "Your notes" (browse) sub-tab — the
  // capture box lives under its own sub-tab and isn't visible until it's
  // selected (index.html's #notes-subtabs, data-section="capture").
  await page.click('[data-section="capture"]');
  await page.waitForSelector("#entry-content", { timeout: 10_000 });

  const marker = `E2E smoke-test note ${Date.now()}`;
  await page.fill("#entry-content", marker);
  await page.click("#save-btn");
  await page.waitForTimeout(1000); // filing (even the fake AI path) is async

  await page.click('[data-section="browse"]');
  await page.waitForTimeout(300);
  await expect(page.locator("#entry-list")).toContainText(marker, { timeout: 10_000 });
});

// Reported with a screenshot: "I cant view older chat sessions, the
// panel/page just appears blank." The header was right — title, model, token
// count — and only the transcript was empty, which is why it read as a
// rendering problem rather than the crash it was.
//
// `#chat-suggest` is on loan: `chatEmptyState` *moves* it out of the dock and
// into `.chat-empty` inside `#chat-messages`. `openConversation` then called
// `replaceChildren()` on that pane — destroying the borrowed element — and
// dereferenced it on the very next line. The throw landed between "clear the
// transcript" and "draw the messages", so every saved conversation opened
// blank.
//
// This lives in the E2E suite because it is exactly the shape the Python
// tests structurally cannot see: the API was correct the whole time, and the
// only evidence was one console error in a browser.
test("opening a saved conversation renders its messages", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/");
  await page.click("#tab-btn-chat");
  await page.waitForSelector("#chat-messages", { timeout: 15_000 });

  // A conversation has to exist to be reopened, and the empty state has to
  // have been shown first — that is what lends `#chat-suggest` away, and a
  // test that skipped it would pass against the bug.
  const conversationId = await page.evaluate(async () => {
    const list = await apiJson("/conversations");
    return list.length ? list[0].id : null;
  });
  test.skip(conversationId === null, "no saved conversations in this profile");

  await page.evaluate((id) => openConversation(id), conversationId);
  await page.waitForTimeout(500);

  const rendered = await page.evaluate(
    () => document.getElementById("chat-messages").children.length
  );
  expect(
    rendered,
    "a saved conversation opened with an empty transcript — see openConversation's #chat-suggest comment"
  ).toBeGreaterThan(0);
  expect(pageErrors, `uncaught exceptions: ${pageErrors.join("; ")}`).toEqual([]);
});
