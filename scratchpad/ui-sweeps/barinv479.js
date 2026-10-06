// Every top and bottom bar in the app, control by control (INBOX 478, 479).
//
//   BASE=http://127.0.0.1:8871 SCRATCH=/tmp/x WIDTH=1440 THEME=light \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node barinv479.js
//
// For each bar: its box, how many control rows it wraps to, whether it
// scrolls sideways, and each visible control in DOM order with the zone it
// sits in (the bar's direct child), its size, its words or glyph and its kind
// (filled, ghost, icon, seg, select, input, menu). A `.seg`, a
// `.select-shell` and a `details` menu count once, as docks.js counts them.
// Writes $SCRATCH/bars-<width>-<theme>.json and one strip screenshot per bar.
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');
const W = Number(process.env.WIDTH || 1440);
const THEME = process.env.THEME || 'light';
const BOARD = Number(process.env.BOARD || 76), MAP = Number(process.env.MAP || 77);
(async () => {
  const phone = W < 600;
  const { browser, page, OUT } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, hasTouch: W < 820 ? true : undefined, isMobile: phone ? true : undefined });
  const all = {};
  const inv = async (surface, sels) => {
    const r = await page.evaluate((sels) => {
      const vis = (e) => { if (!e || !e.checkVisibility || !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const out = [];
      for (const sel of sels) {
        for (const bar of [...document.querySelectorAll(sel)].filter(vis)) {
          const b = bar.getBoundingClientRect();
          const WRAP = '.seg, .segmented-control, .select-shell, details';
          const cands = [...bar.querySelectorAll('button, summary, select, input:not([type=hidden]), a[href], .seg, .segmented-control, .select-shell, details')];
          const ctrls = cands.filter((c) => {
            if (!vis(c)) return false;
            if (c.closest('.dock-menu-list, .doc-dock-menu-list, [role=menu], .menu-popup')) return false;
            if (c.matches('.dock-native-hidden, .visually-hidden')) return false;
            const w = c.parentElement && c.parentElement.closest(WRAP);
            if (w && w !== bar && bar.contains(w) && w !== c) return false;
            if (c.tagName === 'DETAILS') return true;
            return true;
          });
          const kind = (c) => {
            if (c.matches('.seg, .segmented-control')) return 'seg(' + c.querySelectorAll('button').length + ')';
            if (c.matches('.select-shell, select')) return 'select';
            if (c.tagName === 'DETAILS') { const s = c.querySelector('summary'); return 'menu' + (s && s.classList.contains('icon-only') ? '.icon' : ''); }
            if (c.tagName === 'INPUT') return 'input.' + (c.type || 'text');
            if (c.tagName === 'A') return 'link';
            if (c.getAttribute('role') === 'tab') return 'tab';
            const cl = c.classList;
            if (cl.contains('icon-only') || cl.contains('icon-button')) return 'icon';
            if (cl.contains('ghost')) return 'ghost';
            if (cl.contains('primary') || c.tagName === 'BUTTON') return 'filled';
            return c.tagName.toLowerCase();
          };
          const lab = (c) => {
            const t = c.tagName === 'DETAILS' ? c.querySelector('summary') : c;
            const s = (t.getAttribute('aria-label') || (t.innerText || '').trim() || t.getAttribute('title') || t.getAttribute('placeholder') || '').replace(/\s+/g, ' ');
            return s.slice(0, 28);
          };
          const icon = (c) => { const i = (c.tagName === 'DETAILS' ? c.querySelector('summary') : c).querySelector('i.ph, i[class*="ph-"]'); return i ? [...i.classList].find((x) => x.startsWith('ph-') && x !== 'ph-lead' && x !== 'ph-bold' && x !== 'ph-fill') || '' : ''; };
          const zone = (c) => { let z = c; while (z.parentElement && z.parentElement !== bar) z = z.parentElement; return z === c ? '-' : (z.id ? '#' + z.id : '.' + [...z.classList].slice(0, 2).join('.')); };
          const rows = [...new Set(ctrls.map((c) => Math.round(c.getBoundingClientRect().top / 6)))].length;
          const items = ctrls.map((c) => { const cb = c.getBoundingClientRect(); const cs = getComputedStyle(c.tagName === 'DETAILS' ? (c.querySelector('summary') || c) : c); return { zone: zone(c), kind: kind(c), label: lab(c), icon: icon(c), x: Math.round(cb.left), y: Math.round(cb.top), w: Math.round(cb.width), h: Math.round(cb.height), r: cs.borderRadius, fw: cs.fontWeight, fs: cs.fontSize, off: cb.right > innerWidth + 1 || cb.left < -1 }; });
          const cs = getComputedStyle(bar);
          out.push({ sel, id: bar.id ? '#' + bar.id : '.' + [...bar.classList].slice(0, 3).join('.'), dock: bar.dataset.dockName || '', x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), rows, scrollX: bar.scrollWidth > bar.clientWidth + 1, bg: cs.backgroundColor, radius: cs.borderRadius, shadow: cs.boxShadow === 'none' ? 'none' : 'yes', n: items.length, items });
        }
      }
      // Drop a bar that sits inside another bar already listed.
      return out;
    }, sels);
    all[surface] = r;
    let i = 0;
    for (const bar of r) {
      const pad = 6;
      const clip = { x: Math.max(0, bar.x - pad), y: Math.max(0, bar.y - pad), width: Math.min(W - Math.max(0, bar.x - pad), bar.w + 2 * pad), height: Math.min(bar.h + 2 * pad, 400) };
      if (clip.width > 2 && clip.height > 2) await page.screenshot({ path: `${OUT}/bar-${W}-${THEME}-${surface}-${i}.png`, clip }).catch(() => {});
      i++;
    }
    await page.screenshot({ path: `${OUT}/page-${W}-${THEME}-${surface}.png` }).catch(() => {});
  };
  const tab = async (t) => { await page.click(`[data-tab="${t}"]`).catch(async () => { await page.evaluate((t) => window.switchTab && switchTab(t), t); }); await page.waitForTimeout(900); };
  const TB = '.tab-page:not(.hidden) ';
  const DOCKISH = [TB + '.dock', TB + '[role=toolbar]:not(.dock *)', TB + '[role=tablist]'];
  // Global chrome, once.
  await tab('dashboard');
  await inv('chrome', ['#top-bar', '#status-bar', '.dock-fab', '#phone-tabbar, .phone-tabbar']);
  await inv('dashboard', DOCKISH);
  await tab('notes');
  for (const s of ['browse', 'capture', 'writing-room', 'ask']) {
    await page.click(`#notes-subtabs [data-section="${s}"]`).catch(() => {});
    await page.waitForTimeout(800);
    await inv('notes-' + s, DOCKISH);
  }
  await page.click('#notes-subtabs [data-section="browse"]').catch(() => {});
  await tab('chat'); await inv('chat', [...DOCKISH, TB + '.chat-composer, ' + TB + '.chat-input-row, ' + TB + '#chat-form']);
  await tab('graph'); await inv('graph', [...DOCKISH, TB + '.graph-zoom', TB + '.graph-legend:not(.hidden)', TB + '.glass']);
  await tab('timeline'); await inv('timeline', DOCKISH);
  await tab('reminders'); await inv('reminders', DOCKISH);
  await tab('library');
  const subs = await page.$$eval('#library-subtabs [role=tab]', (bs) => bs.map((b, i) => [i, b.textContent.trim()]));
  for (const [i, name] of subs) {
    await page.evaluate((i) => document.querySelectorAll('#library-subtabs [role=tab]')[i].click(), i);
    await page.waitForTimeout(1000);
    await inv('library-' + name.toLowerCase().replace(/[^a-z]+/g, '-'), DOCKISH);
  }
  // Documents editor.
  await page.evaluate(() => document.getElementById('library-subtab-docs')?.click());
  await page.waitForTimeout(900);
  const d = await page.$('.doc-list-item, #library-view-docs .library-card .card-open, #library-view-docs .library-card');
  if (d) { await d.click().catch(() => {}); await page.waitForTimeout(1600);
    await inv('documents', [TB + '.doc-dock', TB + '.dock', TB + '.doc-toolbar', TB + '.doc-statusbar', TB + '[role=toolbar]:not(.doc-toolbar *)']);
    const fmt = await page.evaluate(() => { const t = document.getElementById('doc-toolbar'); if (t && t.checkVisibility()) return false; document.getElementById('doc-format-toggle')?.click(); return true; });
    if (fmt) { await page.waitForTimeout(500); await inv('documents-format', [TB + '.doc-toolbar']); await page.evaluate(() => document.getElementById('doc-format-toggle')?.click()); } }
  // Board and map.
  for (const [name, id] of [['board', BOARD], ['map', MAP]]) {
    await tab('library');
    await openBoardsTab(page);
    await page.evaluate((id) => openWhiteboardBoard(id), id).catch(() => {});
    await waitForBoardOpen(page).catch(() => {});
    await inv(name, ['#wb-topbar', '#wb-tools-panel', '#whiteboard-container .card.glass:not(.hidden)', '#whiteboard-container [role=toolbar]', TB + '.dock', TB + '[role=tablist]']);
  }
  await page.evaluate(() => document.getElementById('wb-back-to-boards')?.click());
  await page.waitForTimeout(500);
  // Settings head, logs dock.
  await page.evaluate(() => openSettingsModal('general')); await page.waitForTimeout(1200);
  await inv('settings', ['#settings-modal .modal-card > .row.space-between:first-child, #settings-modal .dialog-head', '#settings-modal [role=tablist]']);
  await page.evaluate(() => openSettingsModal('logs')); await page.waitForTimeout(1500);
  await inv('settings-logs', ['[data-dock-name="settings-logs"]']);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.evaluate(() => { const o = document.getElementById('settings-modal'); if (o && !o.classList.contains('hidden')) o.querySelector('[data-close-dialog], .dialog-head-btn:last-child, #settings-close')?.click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => toggleAgentPalette()); await page.waitForTimeout(1200);
  await inv('popup-agent', ['#command-palette-overlay .dialog-head', '#command-palette-overlay [role=toolbar]', '#command-palette-overlay .command-palette-foot, #command-palette-overlay .command-palette-actions, #command-palette-overlay form']);
  require('fs').writeFileSync(`${OUT}/bars-${W}-${THEME}.json`, JSON.stringify(all, null, 1));
  await browser.close();
})();
