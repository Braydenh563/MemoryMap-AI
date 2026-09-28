// Improve writing's mode bar, drawn as the document assistant's verb bar.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("capture"); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const box = document.getElementById("entry-content"); box.value = "test\ntest"; openImprove(box); });
  const ready = await page.evaluate(() => ({ status: document.getElementById("improve-status").textContent, btn: document.getElementById("improve-retry").textContent.trim(), hA: Math.round(document.getElementById("improve-apply").getBoundingClientRect().height), hB: Math.round(document.getElementById("improve-retry").getBoundingClientRect().height), radius: getComputedStyle(document.querySelector("#improve-modes > .active")).borderRadius }));
  console.log(JSON.stringify(ready));
  await page.waitForTimeout(800);
  const bar = await page.$("#improve-modes");
  const out = await page.evaluate(() => [...document.querySelectorAll("#improve-modes > .improve-mode")].map((b) => { const r = b.getBoundingClientRect(); return `${b.textContent.trim()}:${Math.round(r.width)}x${Math.round(r.height)}${b.classList.contains("active") ? "*" : ""}`; }));
  console.log(JSON.stringify(out));
  await bar?.screenshot({ path: process.env.OUT_PNG });
  await browser.close();
})();
