// INBOX 107c: every Settings > Packages row keeps its buttons on the title's
// line, at three widths. As numbers.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node packages.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const bad = [];
  for (const w of [1440, 1024, 820]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.evaluate(() => openSettingsModal('extras'));
    await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => [...document.querySelectorAll('#extras-list .extras-row')].map((r) => {
      const head = r.querySelector('.entry-meta'); const title = r.querySelector('.entry-title'); const actions = r.querySelector('.entry-actions');
      const nameTop = Math.round(r.querySelector('strong').getBoundingClientRect().top);
      const btnTops = [...new Set([...actions.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().top)))];
      return { name: r.querySelector('strong').textContent.slice(0, 22), headH: Math.round(head.getBoundingClientRect().height), nameTop, btnTops, dropped: btnTops.some((t) => t > nameTop + 12), overflow: head.scrollWidth > head.clientWidth + 1, titleW: Math.round(title.getBoundingClientRect().width) };
    }));
    const dropped = rows.filter((r) => r.dropped); const over = rows.filter((r) => r.overflow);
    console.log(`107c packages @${w}: ${rows.length} rows, buttons below the name on ${dropped.length}, x-overflow on ${over.length}, head heights ${[...new Set(rows.map((r) => r.headH))].join('/')}px, narrowest title ${Math.min(...rows.map((r) => r.titleW))}px`);
    if (dropped.length || over.length) bad.push(`${w}: ${dropped.map((r) => r.name).join(', ')}${over.length ? ' overflow' : ''}`);
    await page.evaluate(() => document.getElementById('settings-close').click());
  }
  await browser.close();
  if (bad.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
