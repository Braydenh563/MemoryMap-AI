// Brief 89: the palette's small tools, driven. The timer and stopwatch chip
// (shown, stops on press, a short timer ends with its toast), Count words on
// a selection against `wc` on tests/fixtures/utilities/counts_1010.md, and
// Insert template into the Capture box.
// Usage: BASE=http://127.0.0.1:8832 VW=1440|390 node util89.js
const fs = require("fs");
const { execSync } = require("child_process");
const { boot } = require("./lib.js");
const FIX = __dirname + "/../../tests/fixtures/utilities/counts_1010.md";
const VW = Number(process.env.VW || 1440);
(async () => {
  const { browser, page } = await boot(VW < 600 ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const out = { VW };
  const palette = async (q, enter = true) => {
    await page.evaluate(() => openPalette()); await page.waitForTimeout(500);
    await page.fill("#palette-input", q); await page.waitForTimeout(400);
    const rows = await page.evaluate(() => [...document.querySelectorAll("#palette-list > li")].map((e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 60)).filter((t) => t && !/^Search everything/.test(t)));
    if (enter) { await page.keyboard.press("Enter"); await page.waitForTimeout(700); }
    return rows;
  };
  const lastToast = () => page.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => t.textContent.replace(/\s+/g, " ").trim()).pop() || "");
  const chip = () => page.evaluate(() => { const c = document.getElementById("status-timer"); const bar = document.getElementById("status-bar"); const r = c.getBoundingClientRect(); return { hidden: c.classList.contains("hidden"), text: c.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), inView: r.width > 0 && r.bottom <= innerHeight && r.right <= innerWidth, bar: getComputedStyle(bar).visibility }; });
  await page.evaluate(() => switchTab("notes")); await page.waitForTimeout(1500);
  out.timerRows = await palette("timer", false); await page.keyboard.press("Escape");
  out.timer25Rows = await palette("timer 25 minutes", false); await page.keyboard.press("Escape");
  out.stopwatchRows = await palette("stopwatch", false); await page.keyboard.press("Escape");
  // A three-second timer runs out on its own.
  await palette("countdown 3s");
  out.shortTimer = { start: await chip(), toast: await lastToast() };
  await page.waitForTimeout(4200);
  out.shortTimer.end = await chip(); out.shortTimer.endToast = await lastToast();
  // A stopwatch, stopped by its chip.
  await palette("stopwatch");
  await page.waitForTimeout(2200);
  out.stopwatch = { running: await chip() };
  if (!out.stopwatch.running.hidden) {
    await page.evaluate(() => document.getElementById("status-timer").click());
    await page.waitForTimeout(400);
    out.stopwatch.after = await chip(); out.stopwatch.toast = await lastToast();
  }
  // Count words on a selection in the Capture box.
  const text = fs.readFileSync(FIX, "utf8");
  const wc = execSync(`wc -w -m "${FIX}"`, { env: { ...process.env, LC_ALL: "C.UTF-8" } }).toString().trim().split(/\s+/).map(Number);
  await page.evaluate(() => showNotesSection("capture")); await page.waitForTimeout(600);
  await page.evaluate((t) => { const box = document.getElementById("entry-content"); box.value = t; box.focus(); box.setSelectionRange(0, t.length); }, text);
  out.countRows = await palette("word count");
  out.count = { toast: await lastToast(), wcWords: wc[0], wcChars: wc[1] };
  const m = out.count.toast.match(/([\d,]+) words?, ([\d,]+) characters/);
  out.count.equal = !!m && Number(m[1].replace(/,/g, "")) === wc[0] && Number(m[2].replace(/,/g, "")) === wc[1];
  // Insert a template at the caret.
  await page.evaluate(() => { const box = document.getElementById("entry-content"); box.value = "Before "; box.focus(); box.setSelectionRange(7, 7); });
  out.templateRows = await palette("insert template");
  out.inserted = await page.evaluate(() => document.getElementById("entry-content").value.slice(0, 80));
  out.insertToast = await lastToast();
  await page.evaluate(() => { const box = document.getElementById("entry-content"); box.value = ""; box.dispatchEvent(new Event("input", { bubbles: true })); });
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
