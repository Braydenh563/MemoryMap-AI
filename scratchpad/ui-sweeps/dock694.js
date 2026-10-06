// INBOX 694 (2) and (3): the chat dock by its own width, and the companion
// under every dialog, menu and popover.
//
//   bash scratchpad/ui-sweeps/serve.sh 8829 <scratch>/mm-694
//   BASE=http://127.0.0.1:8829 node scratchpad/ui-sweeps/dock694.js
//   THEME=dark ... ; SHOTS=1 writes a picture of each dock to $SCRATCH/shots.
//
// (2) The dock is forced to each container width (320, 380, 480, 600, 800,
// 1200) by its own `width`, in a window wide enough that no viewport query
// can be what answers; then once more in a touch context. Per width: how many
// rows the composer and the strip are, whether anything is wider than the dock
// or outside it, and every control's size (32px, 44 under touch; Send and the
// wide ones are wider, never narrower).
// (3) The companion on (Appearance avatar-buddy = atlas), the Attach panel and
// Settings open: elementFromPoint over the dialog's head returns the dialog.
const { boot, OUT } = require('./lib.js');

const WIDTHS = [320, 380, 480, 600, 800, 1200];
const failures = [];
const fail = (m) => { failures.push(m); console.log('FAIL', m); };

// The rows a set of boxes makes: tops within 6px are one row.
const MEASURE = (W) => {
  const dock = document.querySelector('.chat-dock');
  if (W) { dock.style.alignSelf = 'flex-start'; dock.style.width = W + 'px'; }
  const d = dock.getBoundingClientRect();
  const shown = (e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 4 && r.height > 4 && !e.closest('.hidden');
  };
  const rows = (els) => {
    const tops = els.map((e) => e.getBoundingClientRect().top).sort((a, b) => a - b);
    const out = [];
    for (const t of tops) if (!out.length || t - out[out.length - 1] > 6) out.push(t);
    return out.length;
  };
  const comp = [...document.querySelectorAll('.chat-composer > *')].filter(shown);
  const strip = [...document.querySelectorAll('.chat-dock-controls .chat-tool-group > button, .chat-dock-controls .select-shell, .chat-dock-controls .seg, .chat-dock-controls .chat-dock-more > button')].filter(shown);
  const all = [...dock.querySelectorAll('.chat-composer > *, .chat-dock-controls *')].filter(shown);
  const out = all.filter((e) => { const r = e.getBoundingClientRect(); return r.right > d.right - 1 || r.left < d.left; })
    .map((e) => (e.id || e.className.toString().slice(0, 30) || e.tagName));
  const small = [...dock.querySelectorAll('button, .select-opener')].filter(shown).filter((e) => !e.closest('.chat-skills-panel, .chat-dock-more-panel, .note-picker-panel')).map((e) => {
    const r = e.getBoundingClientRect();
    return { n: e.id || e.getAttribute('aria-label') || e.textContent.trim().slice(0, 12), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const names = [...dock.querySelectorAll('.chat-dock-controls > .chat-tool-group > button')].filter(shown).map((e) => ({ id: e.id, name: (e.textContent || '').trim() || e.getAttribute('aria-label') || '', title: e.title, box: Math.round(e.getBoundingClientRect().width) }));
  return {
    W, w: Math.round(d.width), h: Math.round(d.height), compRows: rows(comp), stripRows: rows(strip),
    dockOverflow: dock.scrollWidth > dock.clientWidth, stripOverflow: document.querySelector('.chat-dock-controls').scrollWidth > document.querySelector('.chat-dock-controls').clientWidth,
    out, small, names,
  };
};

async function dockPass(label, opts) {
  const { browser, page } = await boot(opts);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  const floor = opts.hasTouch ? 44 : 32;
  for (const W of WIDTHS) {
    const m = await page.evaluate(MEASURE, W);
    const line = `${label} ${W}: ${m.w}x${m.h} composer ${m.compRows} row(s), strip ${m.stripRows} row(s)`;
    console.log(line, m.names.map((n) => `${n.name || n.id}:${n.box}`).join(' '));
    if (m.compRows > (W < 480 ? 2 : 1)) fail(`${line}: composer rows`);
    if (m.stripRows > (W < 800 ? 2 : 1)) fail(`${line}: strip rows`);
    if (m.dockOverflow || m.stripOverflow) fail(`${line}: scrolls sideways (dock ${m.dockOverflow}, strip ${m.stripOverflow})`);
    if (m.out.length) fail(`${line}: outside the dock: ${m.out.join(', ')}`);
    for (const s of m.small) if (s.h < floor - 0.5 || s.w < floor - 0.5) fail(`${line}: ${s.n} is ${s.w}x${s.h}, under ${floor}`);
    if (W < 480) for (const n of m.names) if (!n.name && n.id !== 'chat-dock-more-btn') fail(`${line}: ${n.id} lost its name`);
    if (W < 480) for (const n of m.names) if (['chat-skills-btn', 'web-search-toggle', 'chat-plan'].includes(n.id) && !n.title) fail(`${line}: ${n.id} has no title`);
    if (process.env.SHOTS) {
      const box = await page.evaluate(() => { const r = document.querySelector('.chat-dock').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
      await page.screenshot({ path: `${OUT}/dock694-${label}-${W}.png`, clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 } });
    }
  }
  await browser.close();
}

// The window's own widths, nothing forced: a phone (390, the strip moves the
// attach buttons and the model into the sheet), a small tablet, a laptop.
async function naturalPass(label, opts) {
  const { browser, page } = await boot(opts);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  const m = await page.evaluate(MEASURE, 0);
  const line = `${label} ${opts.viewport.width}: dock ${m.w}x${m.h} composer ${m.compRows} strip ${m.stripRows}`;
  console.log(line, m.names.map((n) => `${n.name || n.id}:${n.box}`).join(' '));
  if (m.compRows > 2 || m.stripRows > 2) fail(`${line}: rows`);
  if (m.dockOverflow || m.stripOverflow) fail(`${line}: scrolls sideways`);
  if (m.out.length) fail(`${line}: outside the dock: ${m.out.join(', ')}`);
  if (process.env.SHOTS) {
    const box = await page.evaluate(() => { const r = document.querySelector('.chat-dock').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    await page.screenshot({ path: `${OUT}/dock694-natural-${opts.viewport.width}.png`, clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 } });
  }
  await browser.close();
}

async function companionPass() {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  // Companion on: the Appearance choice, then the figure drawn.
  await page.evaluate(() => {
    document.documentElement.dataset.avatarMotion = 'always';
    const b = document.getElementById('avatar-buddy');
    b.value = 'atlas';
    b.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(3500);
  const on = await page.evaluate(() => !!document.getElementById('nm-buddy'));
  if (!on) { fail('the companion did not appear (Appearance avatar-buddy = atlas)'); await browser.close(); return; }
  // Park it over where the Attach panel opens, so the test is the stacking and
  // not luck: the figure's box moved under the dialog's head.
  const z = await page.evaluate(() => getComputedStyle(document.getElementById('nm-buddy-band')).zIndex);
  console.log('companion band z-index', z);
  const probe = async (label, selector, setup) => {
    await setup();
    await page.waitForTimeout(700);
    const r = await page.evaluate(({ selector }) => {
      const dlg = document.querySelector(selector);
      if (!dlg) return { missing: true };
      const d = dlg.getBoundingClientRect();
      const buddy = document.getElementById('nm-buddy');
      const head = dlg.querySelector('.dialog-head, h2, header, .modal-card') || dlg;
      const h = head.getBoundingClientRect();
      // Put the companion's drawn box over the head so the stacking, not
      // luck, answers: its own left/top (the band is fixed at 0,0), read in
      // the same synchronous call so no placement check can move it between.
      const hadLeft = buddy.style.left; const hadTop = buddy.style.top;
      buddy.classList.remove('nmb-dodge', 'nmb-away');
      const fig = buddy.querySelector('.nm-buddy-face') || buddy;
      const f0 = fig.getBoundingClientRect();
      const cs = getComputedStyle(buddy);
      buddy.style.left = `${parseFloat(cs.left) + (h.left + 60) - (f0.left + f0.width / 2)}px`;
      buddy.style.top = `${parseFloat(cs.top) + (h.top + 14) - (f0.top + f0.height / 2)}px`;
      const f = fig.getBoundingClientRect();
      const pts = [[f.left + f.width / 2, f.top + f.height / 2], [f.left + f.width / 2, Math.max(h.top + 8, f.top + 8)], [h.left + 100, h.top + 20]];
      const hits = pts.map(([x, y]) => { const el = document.elementFromPoint(x, y); return { x: Math.round(x), y: Math.round(y), buddy: !!el?.closest('#nm-buddy, #nm-buddy-band'), inRect: x >= d.left && x <= d.right && y >= d.top && y <= d.bottom, el: el ? (el.id || el.className.toString().slice(0, 30) || el.tagName) : null, inDialog: !!el?.closest(selector) }; });
      buddy.style.left = hadLeft; buddy.style.top = hadTop;
      return { dialog: [Math.round(d.left), Math.round(d.top), Math.round(d.width), Math.round(d.height)], fig: [Math.round(f.left), Math.round(f.top), Math.round(f.width), Math.round(f.height)], hits };
    }, { selector });
    if (r.missing) { fail(`${label}: ${selector} not found`); return; }
    if (!r.hits[0].inRect) fail(`${label}: the companion was not placed over the dialog (${JSON.stringify(r.hits[0])}), the test would pass for nothing`);
    const bad = r.hits.filter((h) => h.buddy);
    console.log(label, JSON.stringify(r.hits.map((h) => `${h.el}${h.buddy ? ' (BUDDY)' : ''}`)));
    if (bad.length) fail(`${label}: the companion is over the dialog at ${JSON.stringify(bad)}`);
    if (!r.hits[1].inDialog && !r.hits[2].inDialog) fail(`${label}: elementFromPoint over the head is not the dialog: ${JSON.stringify(r.hits)}`);
  };
  await probe('Attach panel', '#note-picker-panel', async () => { await page.click('#attach-note'); });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { document.getElementById('note-picker-panel')?.classList.add('hidden'); });
  await page.waitForTimeout(300);
  await probe('Skills panel', '#chat-skills-panel', async () => { if (await page.$('#chat-skills-btn')) await page.click('#chat-skills-btn'); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await probe('Answer settings panel', '#chat-dock-more-panel', async () => { await page.click('#chat-dock-more-btn'); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await probe('Notifications panel', '#notif-panel', async () => { await page.click('#notif-btn'); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await probe('Quick note (native dialog)', '#quick-note', async () => { await page.evaluate(() => openQuickNote()); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await probe('Confirm dialog', '.confirm-card', async () => { await page.evaluate(() => { confirmDialog('Delete the test thing?'); }); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await probe('Settings', '#settings-modal .modal-card, #settings-modal', async () => { await page.evaluate(() => openSettingsModal('appearance')); });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await browser.close();
}

(async () => {
  const mode = process.env.MODE || 'all';
  if (mode === 'all' || mode === 'dock') {
    await dockPass('desktop', { viewport: { width: 1800, height: 1000 } });
    await dockPass('touch', { viewport: { width: 1800, height: 1000 }, hasTouch: true, isMobile: true });
  }
  if (mode === 'all' || mode === 'natural') {
    await naturalPass('phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await naturalPass('tablet', { viewport: { width: 700, height: 900 }, hasTouch: true, isMobile: true });
    await naturalPass('narrow', { viewport: { width: 900, height: 900 } });
    await naturalPass('laptop', { viewport: { width: 1440, height: 900 } });
  }
  if (mode === 'all' || mode === 'companion') await companionPass();
  console.log(failures.length ? `${failures.length} FAILURES` : 'dock694: all clear', `(theme ${process.env.THEME || 'light'})`);
  process.exit(failures.length ? 1 : 0);
})();
