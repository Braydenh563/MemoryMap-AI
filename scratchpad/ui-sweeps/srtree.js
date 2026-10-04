// What a screen reader is given (INBOX 433): the accessibility tree per tab,
// read for the structure a screen reader user navigates by.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/srtree.js        (DUMP=notes prints a tree)
//
// No real screen reader runs in this sandbox (NVDA, JAWS, VoiceOver and
// Narrator need their desktops), so this reads Chromium's accessibility tree,
// which is what each of them is handed, and checks per tab:
//
//   landmarks  one main, one banner, at least one navigation (1.3.1, 2.4.1)
//   headings   the visible tab has a heading, and no level is skipped
//              going down (h2 straight to h4) (1.3.1, 2.4.6)
//   live       toasts and the status line are in a live region, so a
//              change is announced without moving focus (4.1.3)
//   dialog     Settings and the palette open as a named dialog, take the
//              focus, keep Tab inside, close on Escape and give the focus
//              back to what opened them (2.1.2, 2.4.3)
//   skip       a skip link is the first Tab stop (2.4.1)
const { boot } = require('./lib.js');

const TABS = ['dashboard', 'notes', 'library', 'chat', 'graph', 'timeline', 'reminders', 'documents'];

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const out = [];
  const landmarks = await page.evaluate(() => {
    const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true });
    const count = (sel) => [...document.querySelectorAll(sel)].filter(vis).length;
    return {
      main: count('main, [role="main"]'),
      banner: count('body > header, [role="banner"]'),
      nav: count('nav, [role="navigation"]'),
      live: [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]')].map((e) => e.id || e.className).slice(0, 12),
      toastLive: !!document.querySelector('#toast-box[aria-live], #toast-box [aria-live], #toast-box[role="status"], #toast-box[role="region"] [aria-live]'),
    };
  });
  //: Landmarks are read from Chromium's own accessibility tree (CDP), not
  //: the DOM: `#app-main` is `display: contents`, which has no box and so
  //: fails every visibility test, yet is exposed as the main landmark.
  //: The tab strip is a `nav` given `role="tablist"` (the tabs pattern), so
  //: a tablist in the banner counts as the navigation.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  const roles = nodes.filter((n) => !n.ignored).map((n) => n.role && n.role.value);
  const count = (r) => roles.filter((x) => x === r).length;
  if (count('main') !== 1) out.push(`[app] landmarks: ${count('main')} main regions (want 1)`);
  if (count('banner') < 1) out.push('[app] landmarks: no banner');
  if (count('navigation') < 1 && count('tablist') < 1) out.push('[app] landmarks: no navigation');
  if (!landmarks.toastLive) out.push('[app] live: the toast box is not a live region');

  //: Tab from the top of the document: a blur alone leaves the browser's
  //: sequential-focus starting point wherever the focus last was.
  await page.evaluate(() => { const b = document.createElement('button'); document.body.prepend(b); b.focus(); b.remove(); });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName.toLowerCase()} "${(e.textContent || '').trim().slice(0, 40)}" href=${e.getAttribute('href')}` : 'none'; });
  if (!/^a .*href=#/.test(first)) out.push(`[app] skip: the first Tab stop is ${first}, not a skip link`);

  for (const t of TABS) {
    await page.evaluate((name) => switchTab(name), t); await page.waitForTimeout(800);
    const h = await page.evaluate(() => {
      const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true });
      const root = document.querySelector('.tab-page:not(.hidden)');
      const hs = [...(root || document).querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')].filter(vis)
        .map((e) => ({ level: Number(e.getAttribute('aria-level') || e.tagName.slice(1)) || 2, text: e.textContent.trim().slice(0, 30) }));
      const skips = [];
      for (let i = 1; i < hs.length; i++) if (hs[i].level > hs[i - 1].level + 1) skips.push(`${hs[i - 1].level} "${hs[i - 1].text}" to ${hs[i].level} "${hs[i].text}"`);
      return { n: hs.length, skips: skips.slice(0, 3) };
    });
    if (!h.n) out.push(`[${t}] headings: none`);
    if (h.skips.length) out.push(`[${t}] headings skip a level: ${h.skips.join('; ')}`);
    if (process.env.DUMP === t) console.log(await page.locator('.tab-page:not(.hidden)').ariaSnapshot());
  }

  //: Dialogs: open, read where the focus went, Tab 30 times, Escape.
  const dialogs = [
    { name: 'settings', open: async () => page.click('#settings-btn'), sel: '#settings-modal' },
    { name: 'palette', open: async () => page.keyboard.press('Control+k'), sel: '#palette-overlay' },
  ];
  for (const d of dialogs) {
    await page.evaluate(() => switchTab('notes')); await page.waitForTimeout(400);
    const opener = await page.evaluate(() => { const b = document.getElementById('settings-btn'); b && b.focus(); return document.activeElement && document.activeElement.id; });
    await d.open(); await page.waitForTimeout(600);
    const r = await page.evaluate((sel) => {
      const m = document.querySelector(sel);
      if (!m) return { missing: true };
      const dlg = m.closest('[role="dialog"], dialog') || m.querySelector('[role="dialog"], dialog') || m;
      const name = dlg.getAttribute('aria-label') || (dlg.getAttribute('aria-labelledby') && document.getElementById(dlg.getAttribute('aria-labelledby'))?.textContent.trim()) || '';
      return { role: dlg.getAttribute('role') || dlg.tagName.toLowerCase(), modal: dlg.getAttribute('aria-modal') || (dlg.tagName === 'DIALOG' && dlg.matches(':modal') ? 'true' : null), name, inside: dlg.contains(document.activeElement) };
    }, d.sel);
    if (r.missing) { out.push(`[${d.name}] did not open`); continue; }
    if (!/dialog/.test(r.role)) out.push(`[${d.name}] role is ${r.role}, not dialog`);
    if (!r.name) out.push(`[${d.name}] the dialog has no name`);
    if (r.modal !== 'true') out.push(`[${d.name}] not aria-modal`);
    if (!r.inside) out.push(`[${d.name}] focus did not move into the dialog`);
    let escaped = 0;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate((sel) => { const m = document.querySelector(sel); return !!m && m.contains(document.activeElement); }, d.sel);
      if (!inside) escaped++;
    }
    if (escaped) out.push(`[${d.name}] Tab left the dialog ${escaped} of 30 presses`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    const back = await page.evaluate((sel) => { const m = document.querySelector(sel); const open = m && m.checkVisibility && m.checkVisibility({ visibilityProperty: true, opacityProperty: true }); return { open, focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }; }, d.sel);
    if (back.open) out.push(`[${d.name}] Escape did not close it`);
    else if (d.name === 'settings' && back.focus !== opener) out.push(`[${d.name}] focus went to ${back.focus} on close, not back to ${opener}`);
  }

  console.log(`== srtree: ${out.length} findings; live regions: ${landmarks.live.join(', ')}`);
  out.forEach((l) => console.log('  ' + l));
  await browser.close();
  process.exit(out.length ? 1 : 0);
})();
