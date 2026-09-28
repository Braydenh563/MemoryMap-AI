// Note card top padding and the content-to-metadata gap, measured.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(async () => {
    for (const content of ["I have just recently begun playing League of Legends, and I main Seraphine.", "I didnt lock in"]) {
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content, category: "Hobbies", tags: ["test"] }) });
    }
  });
  await page.evaluate(() => switchTab("notes"));
  await page.evaluate(() => window.showNotesSection && showNotesSection("browse"));
  await page.evaluate(() => window.loadEntries && loadEntries());
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => [...document.querySelectorAll("#entry-list > li:not(.list-window-sentinel)")].slice(0, 4).map((li) => {
    const cs = getComputedStyle(li);
    const box = li.getBoundingClientRect();
    const kids = [...li.children].filter((k) => k.getBoundingClientRect().height > 0);
    const first = kids[0]?.getBoundingClientRect();
    const meta = li.querySelector(":scope > .entry-meta");
    const prev = meta?.previousElementSibling;
    const firstText = (() => { const w = document.createTreeWalker(li, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); return rg.getBoundingClientRect().top; } return null; })();
    return {
      pad: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      firstChild: kids[0]?.className, kids: kids.map((k) => k.className).join("|"), firstTop: Math.round(first?.top - box.top), textTop: Math.round(firstText - box.top),
      metaGap: meta && prev ? Math.round(meta.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : null,
      metaBottom: meta ? Math.round(box.bottom - meta.getBoundingClientRect().bottom) : null,
      gapBelow: li.nextElementSibling ? Math.round(li.nextElementSibling.getBoundingClientRect().top - box.bottom) : null,
    };
  }));
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
