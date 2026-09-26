// Icon-only buttons under a finger (uipolish-0924 item 3, OPEN.md 0.3.3).
//
// A button with an icon and no words is the smallest target the app draws,
// and the touch floor (DESIGN.md, "Hit targets": 44px wherever a finger is,
// `@media (max-width: 819.98px), (pointer: coarse)`) reached dialogs, menu
// rows, the graph's node sheet and the formatting strip one surface at a
// time, which left the rest at 36px. This walks every tab and the Settings
// sheet in a touch context and lists each visible icon-only button under
// 44px on either side, by the classes it carries, so a fix can be written
// for the pattern rather than for a list.
//
// "Icon-only" is what a person sees: a button whose visible text is empty
// (its label is an aria-label or a title). WIDTH defaults to 1024, an iPad in
// landscape, where the floor is the pointer's and not the width's; 390 is the
// phone.
//
//   BASE=http://127.0.0.1:8810 WIDTH=1024 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/iconfloor.js
//
// Exits non-zero when any is found.
const { boot } = require('./lib.js');
const W = Number(process.env.WIDTH || 1024);
const H = Number(process.env.HEIGHT || (W < 600 ? 844 : 768));

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  const found = new Map();
  //: Every icon-only button measured, small or not: a sweep that finds
  //: nothing must be able to say it looked.
  let checked = 0;
  const walk = async (where) => {
    const rows = await page.evaluate(() => {
      const out = [];
      for (const b of document.querySelectorAll('button, [role="button"]')) {
        if (!b.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        if (b.closest('[aria-hidden="true"], .visually-hidden')) continue;
        const style = getComputedStyle(b);
        if (style.clipPath && style.clipPath !== 'none') continue;
        const r = b.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        if ((b.innerText || '').trim()) continue;
        out.push({ ok: true });
        if (r.width >= 43.5 && r.height >= 43.5) continue;
        const cls = [...b.classList].filter((c) => !/^(active|open|on|hidden)$/.test(c)).sort().join('.');
        out.push({ key: `${b.tagName.toLowerCase()}${cls ? '.' + cls : ''}`, id: b.id, w: Math.round(r.width), h: Math.round(r.height) });
      }
      return out;
    });
    for (const row of rows) {
      if (row.ok) { checked += 1; continue; }
      const entry = found.get(row.key) || { count: 0, sizes: new Set(), where: new Set(), ids: new Set() };
      entry.count += 1;
      entry.sizes.add(`${row.w}x${row.h}`);
      entry.where.add(where);
      if (row.id) entry.ids.add(row.id);
      found.set(row.key, entry);
    }
  };
  for (const tab of ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders']) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(2200);
    await walk(tab);
  }
  //: The two surfaces a tab switch does not draw: a document open in the
  //: editor, and a board open on its canvas.
  const doc = await page.evaluate(async () => {
    const list = await (await api('/documents')).json();
    if (!list.length) return false;
    switchTab('documents');
    await openDocument(list[0].id);
    return true;
  });
  if (doc) { await page.waitForTimeout(2500); await walk('document'); }
  const board = await page.evaluate(async () => {
    switchTab('library');
    await new Promise((r) => setTimeout(r, 1500));
    document.querySelector('[data-target="library-view-whiteboard"]')?.click();
    await new Promise((r) => setTimeout(r, 1200));
    const card = document.querySelector('.library-board-card');
    if (!card) return false;
    card.click();
    return true;
  });
  if (board) { await page.waitForTimeout(3000); await walk('board'); }
  await page.evaluate(() => openSettingsModal('appearance'));
  await page.waitForTimeout(1200);
  await walk('settings');
  let total = 0;
  for (const [key, e] of [...found].sort((a, b) => b[1].count - a[1].count)) {
    total += e.count;
    console.log(`${String(e.count).padStart(3)}  ${key}  ${[...e.sizes].slice(0, 4).join(' ')}  [${[...e.where].join(',')}]  ${[...e.ids].slice(0, 4).join(' ')}`);
  }
  console.log(`== ${W}x${H} touch: ${checked} icon-only buttons measured, ${total} under 44px, ${found.size} patterns`);
  await browser.close();
  process.exit(total ? 1 : 0);
})();
