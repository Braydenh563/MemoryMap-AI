// **A badge's icon and its words share one centre line** (INBOX 542, the
// owner: "some of the badge icons and text arent aligned vertically"; the
// Installed badge in Settings, Packages). For every visible chip, badge or
// label that holds an icon and words, the icon's vertical centre is compared
// with the words' (a Range around the text nodes, so the line box's leading
// does not count). More than 1px apart fails.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/badgecentre.js
const { boot } = require("./lib.js");
const SEL = ".chip, .item-label, .badge, [class*='-badge'], [class*='-chip'], .status-pill, .pill";
(async () => {
  let failed = 0;
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const places = [
    ["settings packages", async () => { await page.evaluate(async () => { await openSettingsModal("extras"); }); await page.waitForTimeout(2500); }],
    ["settings models", async () => { await page.evaluate(async () => { await openSettingsModal("models"); }); await page.waitForTimeout(2500); }],
    ["notes", async () => { await page.keyboard.press("Escape"); await page.click('[data-tab="notes"]'); await page.waitForTimeout(1500); }],
    ["dashboard", async () => { await page.click('[data-tab="dashboard"]'); await page.waitForTimeout(1500); }],
  ];
  for (const [name, go] of places) {
    await go();
    const rows = await page.evaluate((sel) => {
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight) continue;
        const icon = el.querySelector(":scope > i.ph, :scope > i[class*='ph-'], :scope > svg, :scope > .ph");
        if (!icon) continue;
        const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
        const span = !texts.length ? [...el.children].find((c) => c !== icon && c.textContent.trim() && !c.querySelector("i,svg")) : null;
        let tr = null;
        if (texts.length) { const r = document.createRange(); r.setStartBefore(texts[0]); r.setEndAfter(texts[texts.length - 1]); tr = r.getBoundingClientRect(); }
        else if (span) { const r = document.createRange(); r.selectNodeContents(span); tr = r.getBoundingClientRect(); }
        if (!tr || !tr.height) continue;
        const ir = icon.getBoundingClientRect();
        // The glyph's own box: Phosphor's font glyph sits in an em box.
        const iconMid = ir.top + ir.height / 2;
        const textMid = tr.top + tr.height / 2;
        const label = (el.textContent || "").trim().slice(0, 30);
        out.push({ label, cls: el.className.toString().slice(0, 50), d: Math.round((iconMid - textMid) * 10) / 10 });
      }
      return out;
    }, SEL);
    const bad = rows.filter((r) => Math.abs(r.d) > 1);
    if (bad.length) failed += bad.length;
    console.log(`${bad.length ? "FAIL" : "PASS"}  ${name}: ${rows.length} badges with an icon, ${bad.length} off by more than 1px`);
    for (const r of bad.slice(0, 12)) console.log(`     ${r.d}px  "${r.label}"  .${r.cls}`);
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
