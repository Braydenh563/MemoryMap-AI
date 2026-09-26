// "Advanced response settings" on the column's edge, its chevron hanging in
// the gutter and still inside the modal card, at 1440, 820 and 390.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  let fails = 0;
  for (const width of [1440, 820, 390]) {
    const {browser, page} = await boot({viewport: {width, height: 900}});
    await page.evaluate(async (base) => {
      await api('/models/provider', {method: 'POST', body: JSON.stringify({provider: 'openai', base_url: base})});
      await refreshModelStatus();
      openSettingsModal('models');
    }, process.env.FAKE || 'http://127.0.0.1:8802/v1');
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const sec = document.getElementById('settings-models');
      const heads = [...sec.querySelectorAll('h3')].filter((h) => h.getBoundingClientRect().width > 0);
      const lefts = heads.map((h) => Math.round(h.getBoundingClientRect().left * 10) / 10);
      const adv = [...heads].find((h) => /Advanced response/.test(h.textContent));
      const summary = adv.closest('summary');
      const s = summary.getBoundingClientRect();
      const card = summary.closest('.modal-card, .card, #settings-modal').getBoundingClientRect();
      const others = lefts.filter((x, i) => heads[i] !== adv);
      const mode = others.sort((a, b) => others.filter((v) => v === b).length - others.filter((v) => v === a).length)[0];
      return {adv: Math.round(adv.getBoundingClientRect().left * 10) / 10, mode, markLeft: Math.round(s.left), cardLeft: Math.round(card.left),
        scroll: sec.scrollWidth > sec.clientWidth};
    });
    const ok = Math.abs(r.adv - r.mode) <= 1 && r.markLeft >= r.cardLeft && !r.scroll;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${width}: ${JSON.stringify(r)}`);
    if (!ok) fails++;
    await browser.close();
  }
  console.log(`findings: ${fails}`);
  process.exit(fails ? 1 : 0);
})();
