// INBOX 450: Library, AI skills. The dock row, the card grid and a card's
// facts row, before and after; one line per check so two runs diff cleanly.
//
//   BASE=http://127.0.0.1:8815 W=1440 THEME=light node skills450.js
//   W=1100 or W=390 (390 boots a phone context, as lib.js does).
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
(async () => {
  const mobile = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: mobile ? 844 : 900 }, ...(mobile ? { hasTouch: true, isMobile: true } : {}) });
  const lines = [];
  const m = async (label, fn, arg) => { const v = await page.evaluate(fn, arg); lines.push(`${label}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
  await page.evaluate(() => switchTab('library')); await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-skills"]')?.click()); await page.waitForTimeout(1800);

  // The dock: how many lines its controls sit on, and each control's box.
  await m('dock', () => {
    const d = document.querySelector('.dock[data-dock-name="library-skills"]');
    const r = d.getBoundingClientRect();
    const ctl = [...d.querySelectorAll('h2, input, .seg, .select-opener, button:not(.seg > button)')].filter((e) => e.getClientRects().length);
    const tops = [...new Set(ctl.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)))];
    const right = Math.max(...ctl.map((e) => e.getBoundingClientRect().right));
    const sb = document.getElementById('skills-sidebar'); return `w=${Math.round(r.width)} sidebar=${sb && sb.getClientRects().length ? Math.round(sb.getBoundingClientRect().width) : 0} h=${Math.round(r.height)} lines=${tops.length} overflowRight=${Math.round(right - r.right)} ` + ctl.map((e) => `${(e.id || e.className.split(' ')[0] || e.tagName).slice(0, 16)}=${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}@${Math.round(e.getBoundingClientRect().top)}`).join(' ');
  });

  // The grid: each row's card heights and the dead space a card carries
  // between its last fact and its footer.
  const grid = () => {
    const cards = [...document.querySelectorAll('.skill-card')].filter((e) => e.getClientRects().length).slice(0, 9);
    return cards.map((c) => {
      const r = c.getBoundingClientRect();
      const when = c.querySelector('.skill-card-when'); const foot = c.querySelector('.skill-card-footer');
      const gap = when && foot ? Math.round(foot.getBoundingClientRect().top - when.getBoundingClientRect().bottom) : '-';
      return `${Math.round(r.height)}@${Math.round(r.top)}(gap${gap})`;
    }).join(' ');
  };
  await m('cards', grid);

  // The facts row of the first card with steps and tools: each fact's height,
  // top and text baseline (the text's own box), and how many lines it takes.
  const facts = () => {
    const card = [...document.querySelectorAll('.skill-card')].find((c) => c.querySelectorAll('.skill-fact-expand, .skill-fact-toggle').length >= 2);
    if (!card) return '-';
    const row = card.querySelector('.skill-card-facts');
    const items = [...row.children].filter((e) => e.getClientRects().length);
    const box = (e) => { const t = e.matches('details') ? e.querySelector('summary') : e; const r = t.getBoundingClientRect(); const text = [...t.querySelectorAll('*')].find((k) => !k.children.length && k.textContent.trim() && !k.classList.contains('ph')) || t; const tr = text.getBoundingClientRect(); return `${t.textContent.trim().slice(0, 14)}:${Math.round(r.height)}@${Math.round(r.top)}/txt${Math.round(tr.bottom)}`; };
    const tops = [...new Set(items.map((e) => Math.round((e.matches('details') ? e.querySelector('summary') : e).getBoundingClientRect().top)))];
    return `rowH=${Math.round(row.getBoundingClientRect().height)} lines=${tops.length} ` + items.map(box).join(' ');
  };
  await m('facts', facts);
  // Open "N steps" on that card and read the row again.
  await page.evaluate(() => { const card = [...document.querySelectorAll('.skill-card')].find((c) => c.querySelectorAll('.skill-fact-expand, .skill-fact-toggle').length >= 2); (card.querySelector('.skill-fact-expand > summary') || card.querySelector('.skill-fact-toggle'))?.click(); });
  await page.waitForTimeout(500);
  await m('facts open', facts);
  await m('cards open', grid);
  await m('tool names', () => {
    const card = [...document.querySelectorAll('.skill-card')].find((c) => c.querySelectorAll('.skill-fact-expand, .skill-fact-toggle').length >= 2);
    const t = card.querySelectorAll('.skill-fact-expand > summary, .skill-fact-toggle')[1]; if (!t) return '-';
    t.click();
    const host = t.matches('summary') ? t.parentElement : document.getElementById(t.getAttribute('aria-controls'));
    const items = [...host.querySelectorAll('li, code')].filter((e) => e.getClientRects().length);
    return items.slice(0, 6).map((e) => { const c = getComputedStyle(e); return `${e.tagName.toLowerCase()}.${e.className}:${Math.round(e.getBoundingClientRect().left)},${Math.round(e.getBoundingClientRect().height)} ${c.fontFamily.split(',')[0]}`; }).join(' ');
  });
  console.log(`== ${W} ${process.env.THEME || 'light'}`);
  console.log(lines.join('\n'));
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message); process.exit(1); });
