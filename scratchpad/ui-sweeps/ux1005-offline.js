// UX-11 and UX-12 (audit 2026-10-05), with no model running: the weekly digest
// says why it is off in a line on the page, not only in a tooltip; an export
// says it downloaded.   BASE=... W=390 node ux1005-offline.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  await page.evaluate(async () => { await switchTab('dashboard'); });
  await page.waitForTimeout(2500);
  const digest = await page.evaluate(() => {
    const line = document.querySelector('[data-offline-line]');
    if (!line) return { present: false };
    const r = line.getBoundingClientRect();
    return {
      present: true,
      visible: !line.classList.contains('hidden') && r.height > 0,
      text: line.textContent.replace(/\s+/g, ' ').trim(),
      overflow: line.scrollWidth > line.clientWidth + 1,
      button: !!line.querySelector('button'),
    };
  });
  const toasts = [];
  page.on('download', () => toasts.push('download-event'));
  await page.evaluate(() => downloadExport('markdown'));
  await page.waitForTimeout(1200);
  const toast = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role="status"].toast')].map((t) => t.textContent.trim()).filter(Boolean).slice(-1)[0] || '');
  console.log(JSON.stringify({ W, digest, toast, toasts }));
  const ok = (!digest.present || (digest.visible && digest.button && !digest.overflow)) && /Downloaded/.test(toast);
  console.log(digest.present ? '' : 'note: the digest widget is not on this dashboard');
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
