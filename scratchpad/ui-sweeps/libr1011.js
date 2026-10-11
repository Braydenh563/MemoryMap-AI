// libr-1011: recordings in Find anything (1218), Live captions as a Quick
// access tile (1220), a note's attached-image thumbnail in the "[[" preview
// (1217), a meeting card's section headings (1238).
// BASE=http://127.0.0.1:8805 W=1440 THEME=dark node scratchpad/ui-sweeps/libr1011.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page } = await boot({ args: ['--disable-dev-shm-usage', '--disable-gpu'], viewport: { width: W, height: W > 800 ? 900 : 844 } });
  const out = {};
  // A 1x1 PNG.
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const ids = await page.evaluate(async (b64) => {
    const note = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Picture note\n\nA line about harbours' }) });
    const form = new FormData();
    form.append('file', new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }), 'dot.png');
    await api.upload(`/entries/${note.id}/files`, form);
    const meeting = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: '---\ntype: Meeting\ndate: 2026-10-11 14:00\nattendees: [Sam, Priya]\n---\n# Weekly sync\n\n## Agenda\n- budget\n\n## Notes\n\n## Decisions\n\n## Action items\n- [ ] Send the deck @Sam by Friday', tags: ['meeting'] }) });
    const rec = await apiJson('/recordings', { method: 'POST', body: JSON.stringify({ title: 'Quarterly planning call', mime: 'audio/webm' }) });
    const head = new Uint8Array(64); head.set([0x1a, 0x45, 0xdf, 0xa3]);
    const fd = new FormData();
    fd.append('file', new Blob([head], { type: 'audio/webm' }), 'c.webm');
    fd.append('duration_ms', '10000');
    await api.upload(`/recordings/${rec.id}/chunk`, fd);
    await apiJson(`/recordings/${rec.id}/finish`, { method: 'POST', body: JSON.stringify({ duration_ms: 10000 }) });
    return { note: note.id, meeting: meeting.id, rec: rec.id };
  }, png);
  // 1217: the "[[" preview's attached-image path.
  out.thumb = await page.evaluate(async (id) => {
    const entry = await apiJson(`/entries/${id}`);
    await ensureModule('notePanels').catch(() => {});
    const img = notePickThumb(entry);
    if (!img) return { img: false };
    await new Promise((r) => setTimeout(r, 1500));
    return { img: true, src: img.src.slice(0, 5), natural: img.naturalWidth, attached: (entry.attachments || []).length };
  }, ids.note);
  // 1238: a meeting card.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(2500);
  out.card = await page.evaluate((id) => {
    const li = document.querySelector(`li[data-id="${id}"]`);
    return li ? li.innerText.replace(/\n+/g, ' | ').slice(0, 300) : null;
  }, ids.meeting);
  // 1218: Find anything.
  await page.evaluate(() => openFinder());
  await page.waitForTimeout(600);
  await page.fill('#finder-input', 'quarterly');
  await page.waitForTimeout(2500);
  out.finder = await page.evaluate(() => [...document.querySelectorAll('#finder-results .finder-row')].map((r) => r.innerText.replace(/\n+/g, ' | ').slice(0, 80)));
  const row = await page.$('#finder-results .finder-row');
  if (row) { await row.click(); await page.waitForTimeout(3500); }
  out.opened = await page.evaluate((id) => {
    const el = document.querySelector(`#recordings-list [data-recording-id="${id}"]`);
    return { present: !!el, flash: el?.classList.contains('flash') || false, sub: document.querySelector('#library-subtabs [aria-selected="true"]')?.dataset.target };
  }, ids.rec);
  // 1220: Live captions as a Quick access tile.
  out.catalogue = await page.evaluate(async () => {
    switchTab('dashboard');
    await new Promise((r) => setTimeout(r, 1200));
    const entry = quickCatalogue().get('act:captions');
    if (!entry) return null;
    await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: ['new-note', 'act:captions'] }) });
    prefsCache = await apiJson('/preferences');
    renderQuickLinks();
    await new Promise((r) => setTimeout(r, 600));
    return { label: entry.label, hint: entry.hint };
  });
  out.tile = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('#dash-quicklinks .quick-link, #dash-quicklinks button')].filter((b) => /captions/i.test(b.textContent));
    const t = tiles[0];
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const sib = [...t.parentElement.children].filter((c) => c !== t).map((c) => c.getBoundingClientRect());
    const overlap = sib.some((s) => !(s.right <= r.left || s.left >= r.right || s.bottom <= r.top || s.top >= r.bottom));
    return { text: t.innerText.replace(/\n+/g, ' | '), w: Math.round(r.width), h: Math.round(r.height), inView: r.right <= innerWidth && r.left >= 0, overlap };
  });
  if (out.tile) {
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/libr1011-${W}-${process.env.THEME || 'light'}.png` });
    await page.click('#dash-quicklinks >> text=/Live captions/');
    await page.waitForTimeout(1500);
    out.afterClick = await page.evaluate(() => document.querySelector('#toast, .toast')?.innerText?.slice(0, 120) || null);
  }
  await page.evaluate(() => apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: [] }) }));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
