// e2e-1005, "Filed with a model": write notes through the real composer on a
// seeded notebook whose Settings point at a real local model (llama-server,
// `scratchpad/llama-dev.sh serve`), and record per note the category the app
// filed it in, how (filing_state, the status line's words) and how long the
// filing took. One JSON line per note, then a summary line.
//
//   BASE=http://127.0.0.1:8818 PW=e2e-smoke-test-password node e2e648-realmodel.js
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8818";
const PW = process.env.PW || "e2e-smoke-test-password";
const NOTES = [
  ["Booked the night train from Lisbon to Porto and a hotel near Ribeira", "Travel"],
  ["Tried a sourdough focaccia: 75% hydration, olive oil, rosemary, baked hot", "Cooking"],
  ["Harbor launch: the store listing copy and the pricing page are still not signed off", "Work"],
  ["Long run of 16 km today, the knee held up after the physio exercises", "Health"],
  ["The bathroom extractor fan rattles again, ask the landlord to send someone", "Home"],
  ["Finished the second part of Middlemarch, Dorothea's choice makes more sense now", "Reading"],
  ["What if the reminders could be snoozed by dragging them along the timeline", "Ideas"],
  ["Passport photos done, the visa form wants two copies and the hotel address", "Travel"],
  ["Quarterly review with Dana moved to Thursday, bring the hiring numbers", "Work"],
  ["Slow-cooked the lamb shoulder with cumin and apricots, needs more salt next time", "Cooking"],
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("onboardingDone", "1"); localStorage.setItem("tourDone", "1"); localStorage.setItem("nm-buddy-hint", "done"); } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const lock = page.locator("#lock-password");
  await lock.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (await lock.isVisible().catch(() => false)) {
    await lock.fill(PW);
    await page.click("#lock-submit");
  }
  await page.waitForFunction(() => typeof apiJson === "function" && !!localStorage.getItem("token"), null, { timeout: 20000 });
  const status = await page.evaluate(() => apiJson("/models/status").catch((e) => String(e)));
  console.log(JSON.stringify({ modelStatus: status }).slice(0, 400));
  let right = 0;
  const rows = [];
  for (const [text, want] of NOTES) {
    await page.goto(BASE + "/#/notes/capture", { waitUntil: "domcontentloaded" });
    const box = page.locator("#entry-content");
    await box.waitFor({ state: "visible", timeout: 20000 });
    const live = page.locator('.cm-content[aria-label="New note"]');
    await ((await live.count()) ? live : box).click();
    await page.keyboard.insertText(text);
    const before = await page.locator("#save-status").getAttribute("data-entry-id");
    const t0 = Date.now();
    await page.click("#save-btn");
    let id = null;
    for (let i = 0; i < 80 && !id; i++) {
      await page.waitForTimeout(250);
      const shown = await page.locator("#save-status").getAttribute("data-entry-id");
      if (shown && shown !== before) id = Number(shown);
    }
    let note = null;
    for (let i = 0; i < 240; i++) {
      note = await page.evaluate((nid) => apiJson(`/entries/${nid}`), id);
      if (note.filing_state !== "pending") break;
      await page.waitForTimeout(500);
    }
    const ms = Date.now() - t0;
    const line = await page.locator("#save-status").textContent().catch(() => "");
    const row = { id, want, got: note.category, state: note.filing_state, ms, tags: note.tags, status: (line || "").trim().replace(/\s+/g, " ").slice(0, 160) };
    if (row.got === want) right++;
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  console.log(JSON.stringify({ right, of: NOTES.length, median_ms: rows.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)] }));
  await browser.close();
})();
