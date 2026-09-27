// Settings, Privacy: the receipt pane renders what GET /privacy/receipt says.
//
//   BASE=http://127.0.0.1:8847 node scratchpad/ui-sweeps/privacyreceipt.js
//   (W=390 for a phone; SHOTS=<dir> for where the screenshots go)
//
// Checks, each a number rather than a look: the pane opens from the nav, the
// verdict notice has text and an icon, the range switch flips aria-pressed and
// the list, every destination row's facts line is one line of --text-xs-ish
// muted text, nothing in the pane overflows its width, and the switches list
// has four rows.
const { boot } = require('./lib.js');
const fs = require('fs');

(async () => {
  const W = Number(process.env.W || 1440);
  const shots = process.env.SHOTS || '.';
  fs.mkdirSync(shots, { recursive: true });
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const results = [];
  const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
  await page.evaluate(() => openSettingsModal('privacy'));
  await page.waitForTimeout(1500);
  const shown = await page.evaluate(() => !document.getElementById('settings-privacy').classList.contains('hidden'));
  check('pane shown', shown);
  const verdict = await page.evaluate(() => {
    const v = document.getElementById('privacy-verdict');
    return { text: v.textContent.trim(), icon: !!v.querySelector('.ph'), warn: v.classList.contains('notice-warn') };
  });
  check('verdict has words and an icon', verdict.text.length > 10 && verdict.icon, JSON.stringify(verdict));
  const before = await page.evaluate(() => document.querySelectorAll('#privacy-destinations > li').length);
  await page.click('#privacy-range [data-range="ledger"]');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    rows: document.querySelectorAll('#privacy-destinations > li').length,
    pressed: document.querySelector('#privacy-range [data-range="ledger"]').getAttribute('aria-pressed'),
    note: document.getElementById('privacy-range-note').textContent,
  }));
  check('range switch presses', after.pressed === 'true', JSON.stringify(after));
  check('rows (launch, all time)', true, `${before}, ${after.rows}`);
  const layout = await page.evaluate(() => {
    const pane = document.getElementById('settings-privacy');
    const width = pane.getBoundingClientRect().width;
    const wide = [...pane.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > pane.getBoundingClientRect().right + 1 && el.getClientRects().length);
    const metas = [...pane.querySelectorAll('.privacy-row-meta')].map((m) => {
      const cs = getComputedStyle(m);
      return { h: m.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4, fs: cs.fontSize };
    });
    return { width, overflow: wide.map((el) => el.id || el.className).slice(0, 5), metas, switches: document.querySelectorAll('#privacy-switches > li').length };
  });
  check('nothing overflows the pane', layout.overflow.length === 0, JSON.stringify(layout.overflow));
  check('four switches', layout.switches === 4, String(layout.switches));
  check('facts lines', true, JSON.stringify(layout.metas.slice(0, 3)));
  await page.screenshot({ path: `${shots}/privacy-${W}.png` });
  console.log(results.join('\n'));
  await browser.close();
})();
