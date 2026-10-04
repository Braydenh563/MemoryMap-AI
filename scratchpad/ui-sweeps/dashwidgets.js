// INBOX 513: Stats, Streak and Constellation render, not "Loading…".
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.evaluate(async () => {
    switchTab('dashboard');
    const l = dashLayout();
    for (const w of ['stats', 'streak', 'art']) { if (!l.order.includes(w)) l.order.unshift(w); l.hidden = l.hidden.filter((h) => h !== w); }
    await saveDashLayout(l);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.fill('#lock-password', 'testpassword123').catch(() => {});
  await page.click('#lock-submit').catch(() => {});
  await page.waitForTimeout(Number(process.env.WAIT || 6000));
  const out = await page.evaluate(() => ['stats', 'streak', 'art'].map((w) => {
    const b = document.querySelector(`[data-widget="${w}"] .dash-body`);
    return [w, b ? (b.children.length ? b.textContent.trim().slice(0, 60) || ('canvas:' + !!b.querySelector('canvas')) : 'EMPTY') : 'missing', b && !!b.querySelector('canvas')];
  }));
  console.log(JSON.stringify({ out, errs }));
  await browser.close();
})();
