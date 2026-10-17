// Which stylesheet rules match an element and set a property, in cascade order.
//   SEL='.ocr-head-top' PROP=gap MODULE=libraryList BASE=... node ruleswho.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  if (process.env.MODULE) {
    await page.evaluate((m) => ensureModule(m), process.env.MODULE);
    await page.waitForTimeout(1500);
  }
  const out = await page.evaluate(({ sel, prop }) => {
    const el = document.querySelector(sel);
    const rows = [];
    const walk = (rules, sheet, ctx) => {
      for (const r of rules) {
        if (r.cssRules && !r.selectorText) walk(r.cssRules, sheet, ctx + (r.conditionText ? ` @${r.conditionText}` : ''));
        else if (r.selectorText && r.style && r.style.getPropertyValue(prop) !== '') {
          let hit = false;
          try { hit = el.matches(r.selectorText); } catch (e) { /* skip */ }
          if (hit) rows.push(`${(sheet.href || '').split('/').pop().split('?')[0]}${ctx} :: ${r.selectorText} { ${prop}: ${r.style.getPropertyValue(prop)} }`);
        }
      }
    };
    for (const sheet of document.styleSheets) { try { walk(sheet.cssRules, sheet, ''); } catch (e) { /* cross-origin */ } }
    return { rows, computed: getComputedStyle(el).getPropertyValue(prop) };
  }, { sel: process.env.SEL, prop: process.env.PROP });
  console.log(out.rows.join('\n'), '\n=>', out.computed);
  await browser.close();
})();
