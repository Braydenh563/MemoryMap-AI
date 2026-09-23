// INBOX 394 (h), the owner: "are these pills a sign of ai vibe coding??".
// Counts every visible control drawn as a full pill (a corner of at least
// half its height, so the ends are round) and every dashed control, on every
// tab, grouped by the class that draws it. A pill is allowed only where
// DESIGN.md's radius rule names it (a count badge, a toggle switch, the chat
// dock's row, a round icon button); everything else is a finding.
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node pills.js
// SHOTS=1 also writes before/after screenshots of the reported rows into
// $SCRATCH/shots (THEME=dark for dark).
const { boot } = require('./lib.js');

const SHOTS = !!process.env.SHOTS;
const OUT = (process.env.SCRATCH || '.') + '/shots';
const TAG = process.env.TAG || 'now';

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    for (const content of ['Rye starter is fed at seven every morning. #baking', 'Boots need resoling before Snowdon. #hiking', 'Garage remote: the blue one works. #home']) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) }).catch(() => null);
    }
    await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ title: 'Probe board' }) }).catch(() => null);
  });
  const groups = new Map();
  const collect = async (where) => {
    const rows = await page.evaluate(() => {
      const out = [];
      const sel = 'button, summary, a.chip, .chip, [role="tab"], [role="button"], .library-chip, label.chip';
      for (const el of document.querySelectorAll(sel)) {
        if (!el.checkVisibility()) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        const cs = getComputedStyle(el);
        const radius = parseFloat(cs.borderTopLeftRadius) || 0;
        const round = radius >= r.height / 2 - 0.5;
        //: A square that is round is a circle: an icon button, not a pill.
        const circle = round && Math.abs(r.width - r.height) < 2;
        const dashed = cs.borderTopStyle === 'dashed';
        if ((!round || circle) && !dashed) continue;
        const cls = [...el.classList].filter((c) => !/^(active|is-|ph|hidden)/.test(c)).slice(0, 3).join('.');
        out.push({
          key: `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${el.closest('[id]') ? ' in #' + el.closest('[id]').id : ''}`,
          text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 24),
          dashed,
          radius: Math.round(radius),
          h: Math.round(r.height),
        });
      }
      return out;
    });
    for (const row of rows) {
      const g = groups.get(row.key) || { n: 0, dashed: row.dashed, where, ex: row.text, radius: row.radius, h: row.h };
      g.n += 1;
      groups.set(row.key, g);
    }
  };
  const shot = async (name, selector) => {
    if (!SHOTS) return;
    const el = await page.$(selector);
    if (el && (await el.isVisible())) await el.screenshot({ path: `${OUT}/pills-${name}-${TAG}-${process.env.THEME || 'light'}.png` }).catch(() => {});
  };
  await collect('dashboard');
  await shot('dashboard', '#tab-dashboard');
  for (const name of ['notes', 'timeline', 'reminders', 'graph', 'chat']) {
    await page.evaluate((n) => switchTab(n), name).catch(() => {});
    await page.waitForTimeout(800);
    await collect(name);
  }
  await page.evaluate(() => switchTab('notes'));
  for (const section of ['capture', 'browse', 'ask', 'writing-room']) {
    await page.evaluate((s) => showNotesSection(s), section).catch(() => {});
    await page.waitForTimeout(600);
    await collect(`notes:${section}`);
    await shot(`notes-${section}`, '#tab-notes');
  }
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  const n = await page.$$eval('#library-subtabs [role="tab"]', (els) => els.length);
  for (let i = 0; i < n; i += 1) {
    await page.evaluate((k) => document.querySelectorAll('#library-subtabs [role="tab"]')[k].click(), i);
    await page.waitForTimeout(700);
    await collect(`library:${i}`);
    if (i === 0 || i === 2 || i === n - 1) await shot(`library-${i}`, '#tab-library');
  }
  const list = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [key, g] of list) {
    console.log(`${String(g.n).padStart(4)} ${g.dashed ? 'DASHED' : 'pill  '} r=${g.radius} h=${g.h}  ${key}  "${g.ex}"  (${g.where})`);
  }
  console.log(`groups: ${list.length}, controls: ${list.reduce((s, [, g]) => s + g.n, 0)}, dashed groups: ${list.filter(([, g]) => g.dashed).length}`);
  await browser.close();
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
