// INBOX 668: the Tools & features search field against the dialog head.
// Gap between the head's bottom and the field's top, the focus ring's
// spread, and whether the ring reaches the close button.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => openFeatures());
  await page.waitForTimeout(400);
  await page.focus("#features-search");
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const rect = (el) => { const b = el.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) }; };
    const head = document.querySelector("#features-card .dialog-head");
    const field = document.querySelector("#features-search");
    const wrap = field.closest(".search-field") || field;
    const close = document.getElementById("features-close");
    const cs = getComputedStyle(field);
    const ws = getComputedStyle(wrap);
    return { head: rect(head), close: rect(close), field: rect(wrap), gap: Math.round(wrap.getBoundingClientRect().top - head.getBoundingClientRect().bottom), outline: cs.outlineWidth + " " + cs.outlineOffset, shadow: cs.boxShadow, wrapShadow: ws.boxShadow, icon: !!wrap.querySelector(".search-field-icon") };
  });
  console.log(JSON.stringify({ w: process.env.W || 1440, ...r }));
  await browser.close();
})();
