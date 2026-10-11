// Brief 86 (a): every search box suggests as you type. Measured at 1440 and 390:
// the list's rows, the ghost text's place against the caret, Tab and Right
// accepting, Escape closing the list before the Find anything dialog, and a
// recent search's remove and the foot's Clear.
//   BASE=http://127.0.0.1:8875 SCRATCH=<dir> node scratchpad/ui-sweeps/searchsuggest86.js [390]
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.argv[2] || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 800 : 900 } });
  const out = {};
  const state = () => page.evaluate(() => {
    const box = document.querySelector('.search-suggest');
    const ghost = document.querySelector('.search-suggest-ghost');
    const vis = (el) => el && !el.classList.contains('hidden');
    const r = box && box.getBoundingClientRect();
    const g = ghost && ghost.getBoundingClientRect();
    return {
      open: !!vis(box),
      rows: [...document.querySelectorAll('.search-suggest .rich-picker-row')].map((x) => x.querySelector('.rich-picker-label').textContent + ' | ' + x.querySelector('.rich-picker-about')?.textContent),
      groups: [...document.querySelectorAll('.search-suggest .rich-picker-group')].map((x) => x.textContent),
      box: r && { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      ghost: vis(ghost) ? { text: ghost.textContent, l: Math.round(g.left), t: Math.round(g.top), h: Math.round(g.height) } : null,
      foot: !!vis(document.querySelector('.search-suggest-foot')),
      //: INBOX 849: the list is the field's width (288px at least), left on it, 16px from the window's edges; the foot's two parts are one line each.
      fit: (() => {
        const i = document.activeElement; const f = i && i.closest && i.closest('.search-field, .finder-bar, .web-search-field');
        if (!f || !box || !vis(box)) return null;
        const fr = f.getBoundingClientRect(); const br = box.getBoundingClientRect();
        const lines = (el) => { if (!el) return null; const rg = document.createRange(); rg.selectNodeContents(el); return new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size; };
        const clear = document.querySelector('.search-suggest-clear'); const hint = document.querySelector('.search-suggest-hint');
        return { wantW: Math.min(Math.max(Math.round(fr.width), 288), innerWidth - 32), gotW: Math.round(br.width), leftDelta: Math.round(br.left - Math.max(16, Math.min(fr.left, innerWidth - br.width - 16))), gutterL: Math.round(br.left), gutterR: Math.round(innerWidth - br.right), clearLines: vis(document.querySelector('.search-suggest-foot')) ? lines(clear) : null, hintLines: vis(document.querySelector('.search-suggest-foot')) ? lines(hint) : null };
      })(),
      //: Independent of the script's own canvas measure: a span with the box's font holds the typed words.
      ghostGap: (() => {
        const i = document.activeElement;
        if (!vis(ghost) || !i || !i.getBoundingClientRect) return null;
        const cs = getComputedStyle(i);
        const span = document.createElement('span');
        span.style.cssText = 'position:fixed;visibility:hidden;white-space:pre;left:0;top:0';
        span.style.font = cs.font; span.style.letterSpacing = cs.letterSpacing;
        span.textContent = i.value;
        document.body.appendChild(span);
        const w = span.getBoundingClientRect().width;
        span.remove();
        const r = i.getBoundingClientRect();
        return Math.round((g.left - (r.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) + w - i.scrollLeft)) * 10) / 10;
      })(),
      value: document.activeElement && document.activeElement.value,
      input: (() => { const i = document.activeElement; if (!i || !i.getBoundingClientRect) return null; const q = i.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height), sl: i.scrollLeft }; })(),
    };
  });
  // Notes tab, the filter box.
  await page.keyboard.press('Escape');
  await page.evaluate(() => { document.querySelector('#tab-btn-notes')?.click(); });
  await page.waitForTimeout(1200);
  const box = page.locator('#note-search');
  await box.click();
  await page.waitForTimeout(800);
  out.focusEmpty = await state();
  await box.fill('');
  await box.type('bud', { delay: 60 });
  await page.waitForTimeout(400);
  out.typedBud = await state();
  out.inputRect = await page.evaluate(() => { const r = document.getElementById('note-search').getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/shots86/notes-bud-${width}.png` });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  out.afterTab = await state();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  out.recentsAfterEnter = await page.evaluate(async () => { await ensureModule('settingsData'); return JSON.stringify(searchRecentAll()); });
  // Right at the end accepts the ghost.
  await box.fill('');
  await box.type('gui', { delay: 60 });
  await page.waitForTimeout(300);
  out.typedGui = await state();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  out.afterRight = (await state()).value;
  await box.fill('');
  await box.type('mon', { delay: 60 });
  await page.waitForTimeout(300);
  out.tagMon = await state();
  await box.fill('#tr');
  await page.waitForTimeout(300);
  out.hashTr = await state();
  // Recents: seed two, type "g", list shows them with the foot.
  await page.evaluate(async () => { await ensureModule('settingsData'); searchRecentClearAll(); searchRecent.push('notes', 'garden beans'); searchRecent.push('notes', 'gym plan'); });
  await box.fill('');
  await box.type('g', { delay: 60 });
  await page.waitForTimeout(500);
  await page.waitForTimeout(700);
  out.recentG = await state();
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/shots86/notes-recent-${width}.png` });
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Shift+Delete');
  await page.waitForTimeout(300);
  out.afterShiftDelete = { recents: await page.evaluate(() => JSON.stringify(searchRecentAll())), s: (await state()).rows };
  // the foot's Clear, then Undo from the toast
  await page.locator('.search-suggest-clear').dispatchEvent('pointerdown');
  await page.waitForTimeout(400);
  out.afterClear = await page.evaluate(() => JSON.stringify(searchRecentAll()));
  out.toast = await page.evaluate(() => document.querySelector('.toast')?.textContent);
  await page.locator('.toast-action').first().click();
  await page.waitForTimeout(300);
  out.afterUndo = await page.evaluate(() => JSON.stringify(searchRecentAll()));
  // Escape closes the list; then the Finder: Escape closes the list before the dialog.
  await box.fill('');
  await page.keyboard.press('Escape');
  await page.evaluate(() => openFinder());
  await page.waitForTimeout(1200);
  await page.fill('#finder-input', '');
  await page.type('#finder-input', 'gar', { delay: 60 });
  await page.waitForTimeout(500);
  out.finder = await state();
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/shots86/finder-${width}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  out.finderAfterEsc1 = { list: (await state()).open, dialogOpen: await page.evaluate(() => !document.getElementById('finder-overlay')?.classList.contains('hidden')) };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  out.finderAfterEsc2 = await page.evaluate(() => !document.getElementById('finder-overlay')?.classList.contains('hidden'));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
