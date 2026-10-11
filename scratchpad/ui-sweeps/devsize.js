// Sizes are the device's own (INBOX 897): a 1440 desktop and a 390 phone on one
// notebook. Zoom and the companion's size set on the desktop must not reach the
// phone; a colour (accent) must.
//   BASE=http://127.0.0.1:8795 node scratchpad/ui-sweeps/devsize.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8795';
const PW = 'testpassword123';
const fail = [];
const check = (name, ok, got) => { console.log(ok ? 'ok  ' : 'FAIL', name, JSON.stringify(got)); if (!ok) fail.push(name); };

async function open(browser, viewport, mobile) {
  const ctx = await browser.newContext({ viewport, isMobile: !!mobile, hasTouch: !!mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await load(page);
  return { ctx, page };
}
async function load(page, reload) {
  if (reload) await page.reload({ waitUntil: 'domcontentloaded' });
  else await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const f = document.getElementById('lock-password');
    const o = document.getElementById('lock-overlay');
    return (f && o && !o.classList.contains('hidden') && f.offsetParent !== null) || (o && o.classList.contains('hidden') && localStorage.getItem('token'));
  }, null, { timeout: 30000, polling: 100 });
  if (await page.locator('#lock-password:visible').count()) {
    await page.fill('#lock-password', PW);
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(4000);
}
const measure = (page) => page.evaluate(() => {
  const root = document.documentElement;
  const buddy = document.getElementById('nm-buddy');
  return {
    zoomVar: getComputedStyle(root).getPropertyValue('--zoom').trim(),
    zoomStored: localStorage.getItem('zoom'),
    buddySizeStored: localStorage.getItem('avatar-buddy-size'),
    nmbScale: buddy ? getComputedStyle(buddy).getPropertyValue('--nmb-scale').trim() : null,
    accent: localStorage.getItem('accent'),
    accentVar: getComputedStyle(root).getPropertyValue('--accent').trim(),
  };
});

(async () => {
  const browser = await chromium.launch();
  const A = await open(browser, { width: 1440, height: 900 });
  const B = await open(browser, { width: 390, height: 844 }, true);
  const b0 = await measure(B.page);
  check('phone before', true, b0);

  // The desktop: a companion on, zoom 130, companion 1.4, a different accent.
  await A.page.evaluate(() => {
    localStorage.setItem('avatar-buddy', 'atlas');
    setZoom(130);
    nameMarkBuddySetSize(1.4, true);
    localStorage.setItem('accent', 'rose');
    applyAppearance();
  });
  await A.page.waitForTimeout(3000);
  const a1 = await measure(A.page);
  check('desktop has its zoom 130 and companion 1.4', a1.zoomStored === '130' && a1.buddySizeStored === '1.4', a1);
  const server = await A.page.evaluate(async () => (await apiJson('/preferences')).ui_state);
  const leaked = ['zoom', 'fontsize', 'density', 'avatar-buddy-size', 'nm-buddy-spots', 'chat-composer-height'].filter((k) => server[k] != null);
  check('server ui_state holds no size key', leaked.length === 0, { leaked, hasAccent: server.accent });
  check('server ui_state holds the accent', server.accent === 'rose', server.accent);

  await load(B.page, true);
  const b1 = await measure(B.page);
  check('phone zoom unchanged', b1.zoomStored === b0.zoomStored && b1.zoomVar === b0.zoomVar, { before: b0.zoomVar, after: b1.zoomVar, stored: b1.zoomStored });
  check('phone companion size unchanged', b1.buddySizeStored === b0.buddySizeStored && (b1.nmbScale === b0.nmbScale || (b0.nmbScale === null && b1.nmbScale === '1')), { before: [b0.buddySizeStored, b0.nmbScale], after: [b1.buddySizeStored, b1.nmbScale] });
  check('phone got the accent', b1.accent === 'rose', b1);

  // An older notebook that still holds sizes is ignored on the phone.
  await B.page.evaluate(async () => {
    const ui = (await apiJson('/preferences')).ui_state;
    await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ ui_state: { ...ui, zoom: '70', 'avatar-buddy-size': '1.6', fontsize: 'large' } }) });
  });
  await B.page.evaluate(() => { localStorage.removeItem('ui-synced'); });
  await load(B.page, true);
  const b2 = await measure(B.page);
  const fs = await B.page.evaluate(() => localStorage.getItem('fontsize'));
  check('legacy server sizes ignored on the phone', b2.zoomStored === b0.zoomStored && b2.buddySizeStored === b0.buddySizeStored && b2.nmbScale === '1' && fs === null, { b2, fs });

  // The Settings rows say so (desktop).
  await A.page.evaluate(() => openSettingsModal('appearance'));
  await A.page.waitForTimeout(1500);
  const chips = await A.page.evaluate(() => [...document.querySelectorAll('#settings-appearance .setting-scope')].map((c) => ({ text: c.textContent.trim(), label: c.closest('.setting-label')?.textContent.trim().slice(0, 30), w: Math.round(c.getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height) })));
  check('four size rows carry On this device', chips.filter((c) => c.text === 'On this device').length >= 4, chips);

  // The same rows on the phone: no sideways scroll, the chip inside the viewport.
  await B.page.evaluate(() => openSettingsModal('appearance'));
  await B.page.waitForTimeout(1500);
  const ph = await B.page.evaluate(() => {
    const pane = document.getElementById('settings-appearance');
    const chips = [...pane.querySelectorAll('.setting-scope')].map((c) => { const r = c.getBoundingClientRect(); return { right: Math.round(r.right), h: Math.round(r.height), shown: r.width > 0 }; });
    const rows = ['zoom-slider', 'fontsize-seg', 'density-seg', 'avatar-buddy-size'].map((id) => { const r = document.getElementById(id)?.closest('.setting-row'); return r ? Math.round(r.getBoundingClientRect().height) : null; });
    return { vw: window.innerWidth, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, paneOverflow: pane.scrollWidth - pane.clientWidth, chips, rows };
  });
  check('phone: no sideways scroll, chips inside the screen', ph.docOverflow <= 0 && ph.paneOverflow <= 0 && ph.chips.every((c) => c.right <= ph.vw), ph);

  await browser.close();
  console.log(fail.length ? 'FAILED: ' + fail.join(', ') : 'all ok');
  process.exit(fail.length ? 1 : 0);
})();
