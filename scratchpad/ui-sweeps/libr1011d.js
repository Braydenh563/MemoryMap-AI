// libr-1011 row 1266: drop files anywhere. Synthesised drag events (a headless
// browser cannot drag from the desktop): dragenter loads the module, the veil
// shows, a drop uploads a PNG and imports a Markdown file.
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page } = await boot({ args: ['--disable-dev-shm-usage', '--disable-gpu'], viewport: { width: W, height: W > 800 ? 900 : 844 } });
  const out = { W, theme: process.env.THEME || 'light' };
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(1500);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  out.enter = await page.evaluate(async (b64) => {
    const dt = new DataTransfer();
    dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'dropped.png', { type: 'image/png' }));
    dt.items.add(new File(['# Dropped note\n\nhello'], 'dropped.md', { type: 'text/markdown' }));
    window.__dt = dt;
    document.body.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
    for (let i = 0; i < 60 && typeof fileDropEnter !== 'function'; i++) await new Promise((r) => setTimeout(r, 100));
    document.body.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 200));
    const veil = document.querySelector('.drop-veil');
    if (!veil) return { veil: false };
    const r = veil.getBoundingClientRect();
    const cs = getComputedStyle(veil);
    const card = veil.querySelector('.drop-veil-card').getBoundingClientRect();
    return { veil: !veil.classList.contains('hidden'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), pe: cs.pointerEvents, border: cs.borderTopStyle + ' ' + cs.borderTopWidth, bg: cs.backgroundColor, bdf: cs.backdropFilter, text: veil.innerText, cardW: Math.round(card.width), cardInside: card.left >= r.left && card.right <= r.right, role: veil.getAttribute('role') };
  }, png);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/libr1011d-veil-${W}-${out.theme}.png` });
  out.drop = await page.evaluate(async () => {
    const prevented = !document.body.dispatchEvent(new DragEvent('drop', { dataTransfer: window.__dt, bubbles: true, cancelable: true }));
    const said = document.querySelector('.drop-veil').innerText;
    for (let i = 0; i < 100 && !document.querySelector('.drop-veil').classList.contains('hidden'); i++) await new Promise((r) => setTimeout(r, 200));
    const media = await apiJson('/media');
    const docs = await apiJson('/documents');
    return { prevented, said, hidden: document.querySelector('.drop-veil').classList.contains('hidden'), media: media.map((m) => m.original_name).filter((n) => n === 'dropped.png'), docs: (docs.documents || docs).map((d) => d.title).filter((t) => /Dropped/i.test(t)) };
  });
  // A drop on a textarea is left to its own handler: the veil must not appear.
  out.textarea = await page.evaluate(async () => {
    const ta = document.getElementById('entry-content') || document.querySelector('textarea');
    const ev = new DragEvent('dragover', { dataTransfer: window.__dt, bubbles: true, cancelable: true });
    ta?.dispatchEvent(ev);
    await new Promise((r) => setTimeout(r, 200));
    return { found: !!ta, veilHidden: document.querySelector('.drop-veil').classList.contains('hidden') };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
