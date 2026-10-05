// Improve writing's buttons at the touch floor (design-rows-1005, the
// leftover of INBOX 599): every button in the card, its height, against
// 44px under a coarse pointer and 32px on a desktop, plus the two foot
// buttons at one height. Exit 1 on any finding.
//   BASE=http://127.0.0.1:8877 VIEWPORT=390x844 THEME=dark node improvefoot.js
const { boot } = require("./lib");
const [vw, vh] = (process.env.VIEWPORT || "390x844").split("x").map(Number);
(async () => {
  const touch = vw < 820;
  const { browser, page } = await boot({ viewport: { width: vw, height: vh },
    ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("capture"); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const box = document.getElementById("entry-content"); box.value = "test\ntest"; openImprove(box); });
  await page.waitForTimeout(500);
  // The custom row too, so its Go is measured.
  await page.evaluate(() => document.querySelector('#improve-modes [data-mode="custom"]').click());
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const floor = coarse ? 44 : 30;
    const rows = [...document.querySelectorAll("#improve-card button")].filter((b) => b.checkVisibility())
      .map((b) => ({ id: b.id || b.dataset.mode, h: Math.round(b.getBoundingClientRect().height * 10) / 10 }));
    const sw = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { coarse, floor, rows, sw };
  });
  const finds = r.rows.filter((b) => b.h < r.floor - 0.5).map((b) => `${b.id} ${b.h}px under ${r.floor}`);
  const foot = r.rows.filter((b) => /improve-(apply|retry)/.test(b.id));
  if (new Set(foot.map((b) => b.h)).size > 1) finds.push(`foot at two heights ${foot.map((b) => b.h).join("/")}`);
  if (r.sw > 0) finds.push(`page scrolls sideways ${r.sw}px`);
  console.log(`improvefoot ${vw}x${vh} ${process.env.THEME || "light"} coarse=${r.coarse}: ${r.rows.map((b) => `${b.id}:${b.h}`).join(" ")}`);
  console.log(`${finds.length} findings${finds.length ? ": " + finds.join("; ") : ""}`);
  await browser.close();
  process.exit(finds.length ? 1 : 0);
})();
