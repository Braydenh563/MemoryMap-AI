// INBOX 622: the Settings sidebar's second level, screenshotted and measured.
// Opens Tools it can use (the owner's screenshot), scrolls to its last group,
// and reports the nested list's geometry: its links' left edge against the
// pane links', their font size, the marked one, and the jump list's options.
//   BASE=… SCRATCH=… W=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node settingsgroups622.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
(async () => {
  const phone = W < 600;
  const { browser, page, OUT } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => openSettingsModal('tools'));
  await page.waitForTimeout(1800);
  await page.evaluate(() => { const l = [...document.querySelectorAll('#settings-nav .settings-nav-group')]; l[2]?.click(); });
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const pane = document.querySelector('#settings-nav button[data-section="tools"]');
    const links = [...document.querySelectorAll('#settings-nav .settings-nav-group')];
    const vis = (e) => e && e.getClientRects().length;
    const cs = (e) => getComputedStyle(e);
    return {
      paneLink: vis(pane) ? { left: Math.round(pane.getBoundingClientRect().left), size: cs(pane).fontSize } : 'hidden',
      groups: links.filter(vis).map((l) => ({ t: l.textContent, left: Math.round(l.getBoundingClientRect().left + parseFloat(cs(l).paddingLeft)), size: cs(l).fontSize, on: l.getAttribute('aria-current') })),
      jump: [...document.querySelectorAll('#settings-jump option')].filter((o) => o.dataset.group !== undefined).map((o) => o.value),
      jumpValue: document.getElementById('settings-jump')?.value,
      strip: document.querySelectorAll('#settings-modal .settings-index').length,
    };
  });
  console.log(W, process.env.THEME || 'light', JSON.stringify(r));
  const card = await page.$('#settings-modal .modal-card');
  if (card) await card.screenshot({ path: `${OUT}/settings622-${W}-${process.env.THEME || 'light'}.png` });
  await browser.close();
})();
