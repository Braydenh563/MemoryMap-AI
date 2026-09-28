// The companion's "Tuck behind the bar": it sits behind the status bar with
// its legs tucked, stays, and a click brings it back out.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => { localStorage.setItem("avatar-buddy", "atlas"); });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const face = await page.$("#nm-buddy .nm-buddy-face");
  if (!face) { console.log("no companion"); await browser.close(); return; }
  await face.click({ button: "right" });
  await page.waitForTimeout(500);
  const item = page.locator("text=Tuck behind the bar").first();
  const had = await item.count();
  if (had) await item.click();
  await page.waitForTimeout(2500);
  const tucked = await page.evaluate(() => { const b = document.getElementById("nm-buddy"); const bar = document.getElementById("status-bar").getBoundingClientRect(); const r = b.getBoundingClientRect(); return { legs: b.dataset.legs, pinned: nmb.pinned, tucked: nmb.tucked, bottomBelowBarTop: Math.round(r.bottom - bar.top) }; });
  await page.waitForTimeout(6000);
  const stayed = await page.evaluate(() => ({ legs: document.getElementById("nm-buddy").dataset.legs, tucked: nmb.tucked }));
  await face.click();
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => ({ legs: document.getElementById("nm-buddy").dataset.legs, tucked: nmb.tucked, pinned: nmb.pinned }));
  console.log(JSON.stringify({ menuItem: had, tucked, stayed, after }));
  await browser.close();
})();
