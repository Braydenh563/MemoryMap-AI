// INBOX 111: a describe or a read shows as a background process. Presses the
// gallery card's describe button and reads the activity panel back.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 950 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const seeded = await page.evaluate(async () => {
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('file', new File([bytes], `bgrun-${Date.now()}.png`, { type: 'image/png' }));
    fd.append('direct', 'true');
    const r = await fetch('/media/upload', {
      method: 'POST', body: fd,
      headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
    });
    return (await r.json()).id;
  });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button')].find((e) => /image/i.test(e.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2200);
  const before = await page.evaluate(() => document.querySelectorAll('#agent-monitor-runs .agent-run-row').length);
  // The describe button on the newest card.
  // The describe action lives in the card's own menu, which is built with the
  // card and hidden until the kebab opens it, so the row is in the DOM either
  // way and pressing it is the same call a person makes.
  await page.waitForTimeout(200);
  const chose = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.action-menu button, .action-menu [role="menuitem"]')]
      .find((b) => /describe with ai/i.test(b.textContent || ''));
    if (!row) return false;
    row.click();
    return true;
  });
  console.log('describe row pressed:', chose);
  await page.waitForTimeout(900);
  const during = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#agent-monitor-runs .agent-run-row')];
    return rows.map((r) => ({
      name: r.querySelector('.agent-run-name')?.textContent || '',
      state: r.querySelector('.agent-run-state')?.textContent || '',
    }));
  });
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => [...document.querySelectorAll('#agent-monitor-runs .agent-run-row')].map((r) => ({
    name: r.querySelector('.agent-run-name')?.textContent || '',
    state: r.querySelector('.agent-run-state')?.textContent || '',
  })));
  console.log(`rows before ${before}`);
  console.log('during ', JSON.stringify(during));
  console.log('after  ', JSON.stringify(after));
  const named = after.find((r) => /^Describing /.test(r.name));
  console.log(named ? `ok: "${named.name}" ended "${named.state}"` : 'FAIL: no describe row');
  await browser.close();
  process.exit(named ? 0 : 1);
})();
