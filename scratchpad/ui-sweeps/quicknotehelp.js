// INBOX 667: the "?" in a modal dialog (Quick note, the documents dictionary)
// opens a popover that is on top and reachable. Measures, per theme: the
// panel's parent, whether the topmost element at its centre is inside it,
// and whether it sits within the viewport.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.keyboard.press("Alt+n");
  await page.waitForSelector("#quick-note[open]", { timeout: 5000 });
  const trigger = page.locator('#quick-note [data-help-for="quick-note-help"]');
  await trigger.click();
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const p = document.getElementById("quick-note-help");
    const b = p.getBoundingClientRect();
    const t = document.querySelector('#quick-note [data-help-for="quick-note-help"]').getBoundingClientRect();
    const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return {
      parent: p.parentElement.id || p.parentElement.tagName,
      hidden: p.classList.contains("hidden"),
      visibility: getComputedStyle(p).visibility,
      onTop: !!top && p.contains(top),
      rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
      trigger: [Math.round(t.left), Math.round(t.top), Math.round(t.width), Math.round(t.height)],
      inView: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight,
    };
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    panelHome: document.getElementById("quick-note-help").parentElement.id,
    dialogOpen: document.getElementById("quick-note").open,
  }));
  console.log(JSON.stringify({ theme: process.env.THEME || "light", ...r, after, errors }));
  await browser.close();
})();
