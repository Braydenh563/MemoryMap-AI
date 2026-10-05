// perf2-1005: why a chip's overhang does not take the click (debug probe).
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const res = [];
    for (const el of [...document.querySelectorAll("#entry-list .chip-interactive")].slice(0, 3)) {
      const r = el.getBoundingClientRect();
      const after = getComputedStyle(el, "::after");
      const cx = r.left + r.width / 2;
      const up = document.elementFromPoint(cx, r.top - 1.5);
      const down = document.elementFromPoint(cx, r.bottom + 1.5);
      res.push({
        cls: el.className,
        pos: getComputedStyle(el).position,
        after: [after.content, after.position, after.height, after.top, after.transform, after.insetBlockStart, after.top, after.bottom].join(" | "),
        up: up ? `${up.tagName}.${up.className}` : null,
        down: down ? `${down.tagName}.${down.className}` : null,
        overflow: getComputedStyle(el).overflow + " pe:" + getComputedStyle(el, "::after").pointerEvents + " clip:" + getComputedStyle(el).clipPath + " contain:" + getComputedStyle(el).contain,
        parent: el.parentElement.className,
      });
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
