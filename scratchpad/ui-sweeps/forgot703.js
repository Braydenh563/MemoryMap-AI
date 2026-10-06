// INBOX 703: the Forgot card opens with a chosen path, and the reset
// command and its Copy are one height.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => localStorage.removeItem("token"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.click("#lock-forgot");
  await page.waitForTimeout(1200);
  const seg = await page.evaluate(() => {
    const b = document.getElementById("lock-forgot-have");
    const o = document.getElementById("lock-forgot-lost");
    return { haveActive: b.classList.contains("active"), haveBg: getComputedStyle(b).backgroundColor, lostBg: getComputedStyle(o).backgroundColor };
  });
  await page.click("#lock-forgot-lost");
  await page.waitForTimeout(400);
  const row = await page.evaluate(() => {
    const code = document.querySelector(".lock-forgot-command .code-block").getBoundingClientRect();
    const btn = document.getElementById("lock-reset-copy").getBoundingClientRect();
    return { codeH: Math.round(code.height), btnH: Math.round(btn.height), lostActive: document.getElementById("lock-forgot-lost").classList.contains("active") };
  });
  console.log(JSON.stringify({ w: process.env.W || 1440, theme: process.env.THEME || "light", ...seg, ...row }));
  await browser.close();
})();
