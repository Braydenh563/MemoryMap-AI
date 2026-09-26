// INBOX 426 (u), image 85: "many settings controls sit mid-row instead of at
// the right". For every Settings section, every visible row that is a label
// and a field (`.row` with a <label> and an input/select, and `.setting-row`),
// how far the row's last control ends from the right edge of its group.
// A control more than 4px short of the edge is "mid-row". Also lists groups
// with no control and nothing but a line of text (image 88's empty card).
//
//   BASE=http://127.0.0.1:8793 THEME=dark node scratchpad/ui-sweeps/settingsalign.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(1000);
  const sections = await page.evaluate(() => [...document.querySelectorAll('#settings-nav button[data-section]')].map((b) => b.dataset.section));
  let mid = 0, empty = 0, rows = 0;
  for (const s of sections) {
    await page.evaluate((x) => { showSettingsSection(x); for (const d of document.querySelectorAll(`#settings-${x} details`)) d.open = true; }, s);
    await page.waitForTimeout(500);
    const r = await page.evaluate((x) => {
      const sec = document.getElementById(`settings-${x}`);
      const out = { mid: [], empty: [], rows: 0 };
      const cands = [...sec.querySelectorAll('.row, .setting-row')].filter((row) => row.checkVisibility() &&
        row.querySelector(':scope > label, :scope > .setting-label') &&
        row.querySelector(':scope > input:not([type=checkbox]):not([type=radio]), :scope > select, :scope > .select-shell, :scope > .setting-control, :scope > button'));
      for (const row of cands) {
        const group = row.closest('.settings-group, details, section');
        const gs = getComputedStyle(group);
        const edge = group.getBoundingClientRect().right - parseFloat(gs.paddingRight) - parseFloat(gs.borderRightWidth);
        const kids = [...row.children].filter((k) => k.checkVisibility() && getComputedStyle(k).position !== 'absolute');
        const last = kids[kids.length - 1];
        const right = Math.max(...kids.map((k) => k.getBoundingClientRect().right));
        const rowTop = row.getBoundingClientRect().top;
        out.rows++;
        if (edge - right > 4) out.mid.push(`${(row.querySelector('label, .setting-label')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)} (${Math.round(edge - right)}px short, last ${last.tagName.toLowerCase()}${last.id ? '#' + last.id : ''})`);
      }
      for (const g of sec.querySelectorAll('.settings-group')) {
        if (!g.checkVisibility()) continue;
        const ctrls = [...g.querySelectorAll('input, select, textarea, button, a[href], summary')].filter((c) => c.checkVisibility());
        if (!ctrls.length) out.empty.push(`${g.id || ''} "${g.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)}"`);
      }
      return out;
    }, s);
    rows += r.rows; mid += r.mid.length; empty += r.empty.length;
    if (r.mid.length || r.empty.length) console.log(`${s}: ${r.rows} rows, ${r.mid.length} mid-row`, r.mid.length ? '\n   ' + r.mid.join('\n   ') : '', r.empty.length ? '\n   EMPTY ' + r.empty.join('\n   EMPTY ') : '');
  }
  console.log(`total: ${rows} label-and-field rows, ${mid} with the control mid-row, ${empty} groups with no control`);
  await browser.close();
})();
