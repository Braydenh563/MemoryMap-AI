// Settings, Extras at 820 and 390: does the section scroll sideways, and if
// so which descendant sticks out past the section's content box.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  let fails = 0;
  for (const width of [820, 390, 1440]) {
    const {browser, page} = await boot({viewport: {width, height: 900}});
    await page.evaluate(() => openSettingsModal('extras'));
    await page.waitForTimeout(2000);
    const r = await page.evaluate(() => {
      const sec = document.getElementById('settings-extras');
      const box = sec.getBoundingClientRect();
      const right = box.left + sec.clientWidth;
      const wide = [...sec.querySelectorAll('*')]
        .map((el) => ({el, r: el.getBoundingClientRect()}))
        .filter(({r}) => r.width > 0 && r.right > right + 0.5)
        .map(({el, r}) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
      return {scroll: sec.scrollWidth, client: sec.clientWidth, over: wide.slice(0, 8)};
    });
    const ok = r.scroll <= r.client;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${width}: scrollWidth ${r.scroll} vs clientWidth ${r.client}`);
    if (!ok) { fails++; for (const line of r.over) console.log('   ' + line); }
    await browser.close();
  }
  console.log(`findings: ${fails}`);
  process.exit(fails ? 1 : 0);
})();
