// The app's viewport popups with the background art on (OPEN.md, documents
// 1004 item 1). With `data-bg-art="on"` every `.card` carries a
// backdrop-filter, which makes it the containing block of a `position: fixed`
// child and a stacking context for everything inside it. Each case opens its
// popup through its real opener and reports: the parent, the first ancestor
// that traps it (transform, filter, backdrop-filter, perspective), whether it
// is inside the window, how many of 9 points inside it are covered by
// something else (layering), its ground's alpha, and its first row's text
// contrast against that ground (legibility).
//   BASE=http://127.0.0.1:8808 THEME=dark W=390 H=844 node scratchpad/ui-sweeps/popupsart.js
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 900);
const phone = W < 600;

async function measure(page, sel) {
  return page.evaluate((sel) => {
    const pop = [...document.querySelectorAll(sel)].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    });
    if (!pop) return null;
    const r = pop.getBoundingClientRect();
    let trap = null;
    for (let node = pop.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.transform !== 'none' || cs.filter !== 'none' || (cs.backdropFilter && cs.backdropFilter !== 'none') || cs.perspective !== 'none') {
        trap = (node.id ? '#' + node.id : '.' + String(node.className).split(' ').slice(0, 2).join('.')).slice(0, 48);
        break;
      }
    }
    let covered = 0;
    const hits = [];
    for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { covered++; continue; }
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(pop === hit || pop.contains(hit))) {
        covered++;
        if (hit) { const o = hit.closest('[id]'); hits.push((hit.className && String(hit.className).split(' ')[0]) + (o ? ' in #' + o.id : '')); }
      }
    }
    // The ground actually painted under the rows: the popup's own, or the
    // first ancestor's that has one.
    // `color-mix()` computes to `color(srgb r g b / a)` in 0..1, not rgb().
    const rgba = (s) => {
      const n = (s.match(/[\d.]+/g) || []).map(Number);
      if (!s.startsWith('color(srgb')) return n;
      return [n[0] * 255, n[1] * 255, n[2] * 255, n.length > 3 ? n[3] : 1];
    };
    let ground = null;
    for (let n = pop; n && !ground; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c.length && (c.length < 4 || c[3] > 0)) ground = { c, from: n === pop ? 'self' : (n.id || n.className || n.tagName).toString().slice(0, 30) };
    }
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    // The first enabled row's words (a disabled row is exempt from 1.4.3),
    // else the first words shown.
    const row = [...pop.querySelectorAll('[role="menuitem"], [role="option"], .menu-item, label, button')]
      .find((n) => !n.disabled && n.getAttribute('aria-disabled') !== 'true' && n.getClientRects().length && n.textContent.trim());
    const walker = document.createTreeWalker(row || pop, NodeFilter.SHOW_TEXT);
    let textEl = null;
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      const er = el.getBoundingClientRect();
      if (er.width > 0 && getComputedStyle(el).visibility !== 'hidden') { textEl = el; break; }
    }
    let contrast = null;
    if (textEl && ground) {
      const ink = rgba(getComputedStyle(textEl).color);
      // Composite a translucent ground over the page's own ground, the
      // honest floor: what is behind it varies with the art.
      const page = rgba(getComputedStyle(document.body).backgroundColor);
      const a = ground.c.length > 3 ? ground.c[3] : 1;
      const g = [0, 1, 2].map((i) => ground.c[i] * a + (page[i] ?? 255) * (1 - a));
      const L1 = lum(ink), L2 = lum(g);
      contrast = Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100;
    }
    const cs = getComputedStyle(pop);
    return {
      parent: pop.parentElement.tagName + (pop.parentElement.id ? '#' + pop.parentElement.id : ''),
      position: cs.position, z: cs.zIndex, trap,
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
      inView: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
      covered, hits: [...new Set(hits)].slice(0, 3),
      groundAlpha: ground ? (ground.c[3] ?? 1) : null, groundFrom: ground && ground.from,
      blur: cs.backdropFilter, contrast,
    };
  }, sel);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const art = process.env.ART !== 'off';
  await page.evaluate((on) => {
    localStorage.setItem('bgArt', on ? 'on' : 'off');
    applyAppearance();
  }, art);
  await page.waitForTimeout(600);
  console.log(`bg-art=${await page.evaluate(() => document.documentElement.dataset.bgArt)} glass=${await page.evaluate(() => document.documentElement.dataset.glass || 'on')} ${W}x${H}`);
  let bad = 0;
  const report = (name, m) => {
    const problems = [];
    if (!m) problems.push('did not open');
    else {
      if (m.position === 'fixed' && m.trap) problems.push(`fixed, laid out against ${m.trap}`);
      if (!m.inView) problems.push('out of the window');
      if (m.covered) problems.push(`${m.covered}/9 points covered by ${m.hits.join(', ')}`);
      if (m.groundAlpha !== null && m.groundAlpha < 0.9) problems.push(`ground alpha ${m.groundAlpha}`);
      if (m.contrast !== null && m.contrast < 4.5) problems.push(`text ${m.contrast}:1`);
    }
    bad += problems.length ? 1 : 0;
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name}: ${JSON.stringify(m)}${problems.length ? '  <<< ' + problems.join('; ') : ''}`);
  };
  // Escape until nothing modal is left: a sheet left open from one case
  // would sit over the next one and read as a layering fault.
  const close = async () => {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      const open = await page.evaluate(() => [...document.querySelectorAll('.modal-overlay:not(.hidden), .sheet-overlay:not(.hidden)')].some((o) => o.getClientRects().length));
      if (!open) break;
    }
  };
  const skip = (name, why) => console.log(`skip ${name}: ${why}`);

  // Seed one note with prose, for the selection popup.
  await page.evaluate(async () => {
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'Popup sweep: the selection popup opens over rendered words like these ones here.' }) }).catch(() => null);
  });

  // 1. The chat dock's popovers.
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('chat-dock-more-btn')?.click());
  await page.waitForTimeout(400);
  report('chat dock: more (How it answers)', await measure(page, '#chat-dock-more-panel:not(.hidden), .sheet-card #chat-dock-more-panel'));
  await close();
  // The badge only shows with a model answering; with none here it is shown
  // by hand so the panel it opens can be measured (its content then says so).
  const forced = await page.evaluate(() => {
    const badge = document.getElementById('chat-active-model');
    if (!badge) return null;
    const shown = badge.getClientRects().length > 0;
    if (!shown) { badge.classList.remove('hidden'); badge.hidden = false; badge.textContent ||= 'model'; }
    badge.click();
    return !shown;
  });
  await page.waitForTimeout(800);
  const panel = await measure(page, '#chat-model-panel:not(.hidden)');
  if (panel) report('chat dock: model panel', panel);
  else {
    // `openChatModelPanel` needs a chat model to name; without one only its
    // place can be checked: a child of <body>, fixed, so no card can trap it.
    const where = await page.evaluate(() => { const p = document.getElementById('chat-model-panel'); return p && p.parentElement.tagName; });
    console.log(`skip chat dock: model panel (no chat model here to open it); parent ${where}${where === 'BODY' ? '' : '  <<< not body'}`);
    if (where !== 'BODY') bad++;
  }
  await close();
  const opened = await page.evaluate(() => {
    const opener = [...document.querySelectorAll('.chat-dock .select-shell .select-opener')].find((o) => o.getClientRects().length);
    if (!opener) return false;
    opener.click();
    return true;
  });
  await page.waitForTimeout(400);
  if (opened) report('chat dock: select menu', await measure(page, '.select-menu:not(.hidden)'));
  else skip('chat dock: select menu', 'no select opener in the dock at this width (in the sheet)');
  await close();

  // 2. The selection popup, over rendered text in the Notes list.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  const sel = await page.evaluate(() => {
    const host = [...document.querySelectorAll('#entry-list > li [class*="content"], #entry-list > li p')]
      .find((n) => /rendered words/.test(n.textContent));
    if (!host) return false;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    let t = walker.nextNode();
    while (t && !/rendered/.test(t.textContent)) t = walker.nextNode();
    if (!t) return false;
    const i = t.textContent.indexOf('rendered');
    const range = document.createRange();
    range.setStart(t, i);
    range.setEnd(t, i + 'rendered words'.length);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(range);
    const r = range.getBoundingClientRect();
    host.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: r.right, clientY: r.bottom }));
    return true;
  });
  await page.waitForTimeout(700);
  report('selection popup: its button (Notes, rendered text)', sel ? await measure(page, '.selection-popup:not(.hidden)') : null);
  await page.evaluate(() => document.querySelector('.selection-popup:not(.hidden) [aria-haspopup]')?.click());
  await page.waitForTimeout(400);
  // Below 600 a menu is an action sheet (`openKebabSheet`).
  report(`selection popup: its ${phone ? 'sheet' : 'menu'}`, sel ? await measure(page, phone ? '.sheet-card' : '.selection-popup .action-menu:not(.hidden), body > .action-menu:not(.hidden)') : null);
  await page.evaluate(() => getSelection().removeAllRanges());
  await close();

  // 3 and 4. A board: the context menu and the top bar's menus.
  await page.evaluate(async () => {
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Popup sweep board' }) });
    await openWhiteboardBoard(board.id);
  });
  await page.waitForTimeout(2500);
  const objId = await page.evaluate(async () => {
    await wbCreateSticky(160, 160);
    if (typeof renderWhiteboardNow === 'function') renderWhiteboardNow();
    const el = document.querySelector('.wb-object[data-id]');
    return el ? el.dataset.id : null;
  });
  await page.waitForTimeout(500);
  let ctx = null;
  if (objId) {
    // The handler a right-click on an object runs (`wbWireContextMenu`),
    // at the object's own centre.
    await page.evaluate((id) => {
      const b = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
      wbOpenContextMenuFor('object', Number(id) || id, b.left + b.width / 2, b.top + b.height / 2);
    }, objId);
    await page.waitForTimeout(500);
    ctx = await measure(page, '.wb-ctx-menu:not(.hidden)');
  }
  report(`board: context menu${objId ? '' : ' (no object to press)'}`, ctx);
  await close();
  const toggles = await page.$$eval('[data-wb-menu-toggle]', (els) => els.filter((e) => e.getClientRects().length).map((e) => e.getAttribute('aria-controls')));
  for (const id of toggles) {
    await page.click(`[data-wb-menu-toggle][aria-controls="${id}"]`).catch(() => {});
    await page.waitForTimeout(400);
    report(`board: .wb-board-menu #${id}`, await measure(page, `#${id}:not(.hidden)`));
    await close();
  }
  if (!toggles.length) skip('board: .wb-board-menu', 'no top-bar toggle on screen at this width');

  if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3).join(' | '));
  console.log(`${bad} case(s) failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
