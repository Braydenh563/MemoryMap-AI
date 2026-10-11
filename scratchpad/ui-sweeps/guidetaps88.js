// CHAT_PLAN 9 row 3 (Brief 88): the Guide from a phone, driven by taps.
// Path A: More, Guide. Path B: More, Commands, "guide", the first row.
//   BASE=http://127.0.0.1:8836 node guidetaps88.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const guideOpen = () => page.waitForFunction(() => { const i = document.getElementById("help-chat-input"); return i && i.offsetParent; }, null, { timeout: 8000 }).then(() => true, () => false);
  const reset = async () => { await page.evaluate(() => { closeOverlaysForChord(); switchTab("dashboard"); }); await page.waitForTimeout(800); };
  const out = {};
  await reset();
  let t = Date.now(); let taps = 0;
  await page.tap("#phone-more-btn"); taps++;
  await page.getByRole("button", { name: /^Guide$/ }).first().tap(); taps++;
  out.more = { taps, opened: await guideOpen(), ms: Date.now() - t };
  await reset();
  t = Date.now(); taps = 0;
  await page.tap("#phone-more-btn"); taps++;
  await page.getByRole("button", { name: /^Commands$/ }).first().tap(); taps++;
  await page.waitForSelector("#palette-input", { state: "visible" });
  await page.fill("#palette-input", "guide"); await page.waitForTimeout(300);
  const first = await page.evaluate(() => document.querySelector("#palette-list > li[role=option]")?.textContent.replace(/\s+/g, " ").trim().slice(0, 40));
  await page.locator("#palette-list > li[role=option]").first().tap(); taps++;
  out.palette = { taps, typed: "guide", firstRow: first, opened: await guideOpen(), ms: Date.now() - t };
  console.log(JSON.stringify(out));
  await browser.close();
})();
