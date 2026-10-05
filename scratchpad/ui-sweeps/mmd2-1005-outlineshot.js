// A picture and two numbers for the map outline: the panel against the
// canvas (no overlap with the top bar or the tool rail) and its text contrast.
//   BASE=... node scratchpad/ui-sweeps/mmd2-1005-outlineshot.js  (W=390, THEME=dark)
const { boot, OUT } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Shot\n\n- Trip\n  - Pack\n    - Passport\n  - Book\n    - Flights\n    - Hotel" }) });
    await openWhiteboardBoard(b.id);
    wbOutlineToggle(true);
    document.querySelector("#wb-outline-tree .wb-outline-row:nth-child(3) input").focus();
  });
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const p = document.getElementById("wb-map-outline").getBoundingClientRect();
    const bar = document.querySelector(".wb-topbar")?.getBoundingClientRect();
    const tools = document.getElementById("wb-tools-panel")?.getBoundingClientRect();
    const over = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const field = document.querySelector("#wb-outline-tree .wb-outline-row:nth-child(2) input");
    const cs = getComputedStyle(field);
    return { panel: [p.left, p.top, p.width, p.height].map(Math.round), overBar: over(p, bar), overTools: over(p, tools), color: cs.color, size: cs.fontSize, border: cs.borderTopColor + ' ' + cs.borderTopWidth, h: field.getBoundingClientRect().height, pad: cs.padding, bg: cs.backgroundColor, rowCss: (() => { const r = getComputedStyle(field.closest('.wb-outline-row')); return [r.height, r.marginTop, r.marginBottom, r.paddingTop, r.paddingBottom, r.display, getComputedStyle(field).marginTop, getComputedStyle(field).marginBottom].join(' '); })(), rowGap: field.closest('.wb-outline-row').nextElementSibling.getBoundingClientRect().top - field.closest('.wb-outline-row').getBoundingClientRect().top };
  });
  console.log(JSON.stringify(m));
  const name = `${OUT}/mmd2-outline-${W}-${process.env.THEME || "light"}.png`;
  await page.screenshot({ path: name });
  console.log(name);
  await browser.close();
})();
