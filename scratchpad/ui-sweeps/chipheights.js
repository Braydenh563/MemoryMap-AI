// Every visible chip's height by family, so a change to how a chip's words
// are laid out (INBOX 592 took the x-height trim off them) can say whether
// any chip grew or shrank.
//   BASE=... W=1440 node chipheights.js > before.txt; diff before.txt after.txt
const { boot } = require('./lib.js');
const W = parseInt(process.env.W || '1440', 10);
(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  const views = [
    ['dashboard', [`switchTab('dashboard')`]],
    ['notes', [`switchTab('notes')`]],
    ['notes/ask', [`switchTab('notes')`, `document.querySelector('[data-section="ask"]')?.click()`, `(()=>{const i=document.getElementById('question'); i.value='sketch bean bell'; document.getElementById('ask-btn').click();})()`, `void 0`]],
    ['timeline', [`switchTab('timeline')`]],
    ['settings/models', [`openSettingsModal('models')`]],
    ['settings/extras', [`openSettingsModal('extras')`]],
  ];
  for (const [name, steps] of views) {
    await page.evaluate(() => { try { closeSettingsModal(); } catch (e) {} });
    for (const s of steps) { await page.evaluate(s).catch(() => {}); await page.waitForTimeout(name.includes('ask') ? 2500 : 900); }
    const fam = await page.evaluate(() => {
      const out = {};
      for (const el of document.querySelectorAll('.chip, .entry-links-more, .link-connection')) {
        if (!el.checkVisibility()) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1) continue;
        const key = String(el.className).replace(/\s+/g, '.');
        (out[key] = out[key] || new Set()).add(Math.round(r.height * 10) / 10);
      }
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort((a, b) => a - b).join(',')]));
    });
    for (const k of Object.keys(fam).sort()) console.log(`${name}\t${k}\t${fam[k]}`);
  }
  await browser.close();
})();
