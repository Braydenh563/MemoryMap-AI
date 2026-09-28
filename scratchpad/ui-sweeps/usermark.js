// The person's own mark at the Settings head's size against a large one.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => {
    const box = document.createElement("div");
    box.id = "um-test";
    box.style.cssText = "position:fixed;top:10px;left:10px;z-index:99999;background:#222;padding:8px;display:flex;gap:12px;align-items:center";
    for (const size of [18, 28, 64]) box.appendChild(nameMark("Brayden", size));
    document.body.appendChild(box);
  });
  await page.waitForTimeout(500);
  await (await page.$("#um-test")).screenshot({ path: process.env.OUT_PNG });
  await browser.close();
})();
