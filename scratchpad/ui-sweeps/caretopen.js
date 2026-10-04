// Every open fold in Settings and Help draws its caret pointing down (INBOX 477).
const { boot } = require('./lib.js');
const SECTIONS = ['appearance', 'preferences', 'models', 'data', 'help', 'about'];
(async () => {
  const { browser, page } = await boot();
  // Read the end state, not a frame of the quarter-turn transition.
  // (CSSOM, not a <style> tag: the page's CSP refuses inline style.)
  await page.evaluate(() => {
    const sheet = [...document.styleSheets].find((x) => { try { return x.cssRules; } catch { return false; } });
    sheet.insertRule('*::before { transition: none !important; }', sheet.cssRules.length);
  });
  let bad = 0, seen = 0;
  for (const sec of SECTIONS) {
    await page.evaluate((s) => openSettingsModal(s), sec);
    await page.waitForTimeout(700);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#settings-modal details')]
      .filter((d) => d.offsetParent !== null).map((d) => {
        const sum = d.querySelector(':scope > summary'); if (!sum) return null;
        const was = d.open; d.open = true;
        const open = getComputedStyle(sum, '::before').transform;
        d.open = false;
        const closed = getComputedStyle(sum, '::before').transform;
        d.open = was;
        const content = getComputedStyle(sum, '::before').content;
        return { text: sum.textContent.trim().slice(0, 30), open, closed, content };
      }).filter((r) => r && r.content && r.content !== 'none'));
    for (const r of rows) {
      seen++;
      const ok = r.open !== r.closed && (r.open === 'none' || r.open === 'matrix(1, 0, 0, 1, 0, 0)');
      if (!ok) { bad++; if (bad < 8) console.log(`FAIL ${sec}: "${r.text}" open=${r.open} closed=${r.closed}`); }
    }
  }
  console.log(`${seen - bad}/${seen} folds turn down when open`);
  await browser.close();
})();
