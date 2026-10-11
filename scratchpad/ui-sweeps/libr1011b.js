// libr-1011 second pass: a meeting card's text, the Quick access tile and the
// captions dock with Translate on, at W wide, THEME light or dark.
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, ctx, page } = await boot({ args: ['--disable-dev-shm-usage', '--disable-gpu'], viewport: { width: W, height: W > 800 ? 900 : 844 } });
  const out = { W, theme: process.env.THEME || 'light' };
  await ctx.route('**/translate/status', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ installed: true, pairs: [{ from: 'en', to: 'es', label: 'English to Spanish' }], hint: '', extra: 'translate' }) }));
  out.card = await page.evaluate(async () => {
    switchTab('notes');
    await new Promise((r) => setTimeout(r, 3000));
    const hit = [...document.querySelectorAll('li')].find((li) => /Weekly sync/.test(li.textContent) && li.dataset.id);
    if (!hit) return null;
    const before = hit.innerText.replace(/\n+/g, ' | ').slice(0, 300);
    const h = hit.getBoundingClientRect().height;
    const more = hit.querySelector('.entry-more');
    more?.click();
    await new Promise((r) => setTimeout(r, 400));
    return { before, h: Math.round(h), after: hit.innerText.replace(/\n+/g, ' | ').slice(0, 200), hAfter: Math.round(hit.getBoundingClientRect().height), toggle: more?.textContent };
  });
  out.tile = await page.evaluate(async () => {
    await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: ['new-note', 'act:captions'] }) });
    prefsCache = await apiJson('/preferences');
    switchTab('dashboard');
    await new Promise((r) => setTimeout(r, 2000));
    renderQuickLinks();
    await new Promise((r) => setTimeout(r, 500));
    const t = [...document.querySelectorAll('#dash-quicklinks button')].find((b) => /Live captions/.test(b.textContent));
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const sib = [...t.parentElement.children].filter((c) => c !== t).map((c) => c.getBoundingClientRect());
    const all = [...t.parentElement.children].filter((c) => c.tagName === 'BUTTON' || c.classList.contains('quick-link')).map((c) => { const q = c.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right)]; });
    return { tiles: all, w: Math.round(r.width), h: Math.round(r.height), inView: r.left >= 0 && r.right <= innerWidth, overlap: sib.some((s) => !(s.right <= r.left || s.left >= r.right || s.bottom <= r.top || s.top >= r.bottom)), scrollW: document.documentElement.scrollWidth, innerW: innerWidth };
  });
  await page.evaluate(() => apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: [] }) }));
  // The dock with Translate on, without a microphone.
  out.dock = await page.evaluate(async () => {
    await ensureModule('captions');
    await ensureModule('translate');
    window.translateAsk = async (pair, text) => ({ ok: true, text: 'ES ' + text });
    Object.assign(captionRun, { id: 'fake', lines: ['hello there my friend', 'how are you today'], running: 'and the weather is', model: 'tiny.en', elapsed: 65000 });
    document.getElementById('captions-dock').classList.remove('hidden');
    captionOfferTranslate();
    await new Promise((r) => setTimeout(r, 700));
    const btn = document.getElementById('captions-translate');
    const before = { hidden: btn.classList.contains('hidden') };
    captionPaint();
    btn.click();
    await new Promise((r) => setTimeout(r, 1500));
    const dock = document.getElementById('captions-dock');
    const tr = document.getElementById('captions-translated');
    const rect = dock.getBoundingClientRect();
    const kids = [...dock.querySelectorAll('button, .captions-lines')].map((e) => e.getBoundingClientRect());
    let overlap = 0;
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i], b = kids[j];
      if (!(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1) && a.width && b.width) overlap++;
    }
    const lines = document.querySelector('.captions-lines');
    const res = { before, pressed: btn.getAttribute('aria-pressed'), translated: tr.textContent, trVisible: !tr.classList.contains('hidden'), dockW: Math.round(rect.width), dockH: Math.round(rect.height), dockRight: Math.round(rect.right), innerW: innerWidth, bottom: Math.round(rect.bottom), innerH: innerHeight, overlap, linesClip: lines.scrollHeight > lines.clientHeight + 1, btnH: Math.round(btn.getBoundingClientRect().height) };
    btn.click();
    await new Promise((r) => setTimeout(r, 300));
    res.afterOff = { pressed: btn.getAttribute('aria-pressed'), trHidden: tr.classList.contains('hidden') };
    return res;
  });
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/libr1011b-${W}-${process.env.THEME || 'light'}.png` });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
