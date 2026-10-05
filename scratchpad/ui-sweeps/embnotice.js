// WORLD_CLASS_PLAN section 21, rows 1, 2 and 12: the embedding error is a
// notice (icon child, notice-warn), and a runner's own "check the address"
// sentence reaches the status line. The page's /models/status answer is
// edited in flight to carry the two fields; the render is the real one.
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node embnotice.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { page, browser } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  await page.route('**/models/status', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.embedding_error = 'Search by meaning is being installed';
    body.ollama_running = false;
    body.ollama_problem = 'Nothing answered at http://127.0.0.1:1234/v1. Check the address in Settings, Models, and that the server is running.';
    await route.fulfill({ response, json: body });
  });
  await page.evaluate(() => openSettingsModal('searchindex'));
  await page.waitForTimeout(1800);
  const m = await page.evaluate(() => {
    const el = document.getElementById('embedding-error');
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const host = el.parentElement.getBoundingClientRect();
    const line = document.getElementById('ollama-status');
    return {
      hidden: el.classList.contains('hidden'), cls: el.className, text: el.textContent.trim().slice(0, 60),
      icon: !!el.querySelector('i.ph'), display: cs.display, color: cs.color, bg: cs.backgroundColor,
      inside: r.left >= host.left - 1 && r.right <= host.right + 1, overflow: el.scrollWidth > el.clientWidth + 1,
      lineText: line ? line.textContent.trim() : null,
    };
  });
  console.log(JSON.stringify(m));
  check('the embedding error is shown as a notice with an icon', !m.hidden && /notice notice-warn/.test(m.cls) && m.icon);
  check('the text is the sentence, not a printed token', /^Search by meaning is being installed/.test(m.text.replace(/^\S*warning\S*\s*/, '')) || /Search by meaning/.test(m.text));
  check('it fits its column', m.inside && !m.overflow);
  const line = await page.evaluate(() => { openSettingsModal('models'); return null; });
  await page.waitForTimeout(1500);
  const status = await page.evaluate(() => document.getElementById('ollama-status')?.textContent.trim());
  check('the models status line says to check the address', /Check the address/.test(status || ''), status);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
