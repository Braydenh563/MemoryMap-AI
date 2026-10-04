// INBOX 453 (1): the documents sidebar inside focus mode, measured.
//
// The pill's Sidebar toggle opens the list and outline as a panel fixed to the
// window's left edge, the page gives up the room, the toggle and Escape close
// it, a reload in the session restores it, and below 600 the toggle keeps its
// icon with the name on aria-label.
//
//   BASE=http://127.0.0.1:8828 node scratchpad/ui-sweeps/docfocussidebar.js
//   SIZE=390x844 THEME=dark BASE=... node scratchpad/ui-sweeps/docfocussidebar.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const [W, H] = (process.env.SIZE || '1440x900').split('x').map(Number);
const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

const geo = (page) => page.evaluate(() => {
  const r = (el) => { const b = el.getBoundingClientRect(); return { l: +b.left.toFixed(1), t: +b.top.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const side = document.getElementById('doc-sidebar');
  const bar = document.getElementById('doc-focus-bar');
  const btn = document.getElementById('doc-focus-sidebar');
  const line = [...document.querySelectorAll('#doc-editor .cm-content .cm-line, #doc-preview > *')]
    .find((el) => el.getClientRects().length && el.getBoundingClientRect().height > 0);
  const list = document.querySelector('#doc-sidebar-list');
  const cs = getComputedStyle(side);
  const tab = document.getElementById('tab-documents');
  return {
    focus: tab.classList.contains('doc-focus'),
    open: tab.classList.contains('doc-focus-sidebar'),
    shown: cs.display !== 'none' && side.getClientRects().length > 0,
    pos: cs.position, bg: cs.backgroundColor, blur: cs.backdropFilter,
    side: side.getClientRects().length ? r(side) : null,
    bar: r(bar), line: line ? r(line) : null,
    scrollX: document.documentElement.scrollWidth > innerWidth,
    pressed: btn.getAttribute('aria-pressed'), label: btn.getAttribute('aria-label'),
    word: getComputedStyle(btn.querySelector('.doc-focus-word')).display,
    btnW: r(btn).w,
    storage: sessionStorage.getItem('doc-focus-sidebar'),
    rows: list ? list.querySelectorAll('li, button, a').length : 0,
    active: document.activeElement && (document.activeElement.id || document.activeElement.tagName),
  };
});

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  await openDoc(page, { title: 'Sidebar sweep', content: '# Sidebar\n\n## Part one\n\n' + 'Words to write. '.repeat(40) + '\n\n## Part two\n\nMore.\n' });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(300);
  await page.click('#doc-focus-toggle');
  await page.waitForTimeout(400);

  let g = await geo(page);
  check('closed: the sidebar is not drawn', g.focus && !g.shown && g.pressed === 'false', g);
  const lineClosed = g.line;
  await page.click('#doc-focus-sidebar');
  await page.waitForTimeout(400);
  g = await geo(page);
  check('open: pressed and drawn', g.open && g.shown && g.pressed === 'true' && g.storage === '1', g);
  check('open: fixed to the left edge', g.pos === 'fixed' && g.side && g.side.l <= 24 && g.side.l >= 8, g.side);
  check('open: under the pill and above the bottom', g.side && g.side.t >= g.bar.b - 1 && g.side.b <= H, { side: g.side, bar: g.bar });
  check('open: solid ground, no blur', g.blur === 'none' && !/rgba\(.*, 0\)/.test(g.bg), { bg: g.bg, blur: g.blur });
  check('open: lists something', g.rows > 0, g.rows);
  check('open: no sideways scroll', !g.scrollX, null);
  if (W > 720) {
    check('open: the page gave up the room', g.line && lineClosed && g.line.l >= g.side.r - 1, { line: g.line, side: g.side });
    check('open: the page still has the larger share', g.side.w <= W * 0.41, g.side.w);
  } else {
    check('open (phone): the panel is the window less its gutters', g.side.w >= W - 40, g.side);
  }
  if (W <= 600) check('phone: the name is on the label, not drawn', g.word === 'none' && /sidebar/i.test(g.label) && g.btnW <= 48, { word: g.word, label: g.label, w: g.btnW });
  else check('wide: the name is drawn', g.word !== 'none', g.word);
  console.log('open', JSON.stringify({ side: g.side, line: g.line, bar: [g.bar.t, g.bar.h] }));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/shots/docfocussidebar-${W}-${process.env.THEME || 'light'}.png` });

  // Both side panels at once on a wide window.
  if (W > 720) {
    await page.evaluate(() => document.getElementById('doc-prose')?.click());
    await page.waitForTimeout(300);
    const both = await page.evaluate(() => {
      const l = document.querySelector('#doc-editor .cm-content .cm-line, #doc-preview > *').getBoundingClientRect();
      const s = document.getElementById('doc-sidebar').getBoundingClientRect();
      const p = document.getElementById('doc-prose-panel').getBoundingClientRect();
      return { l: l.left, r: l.right, sr: s.right, pl: p.left, open: !document.getElementById('doc-prose-panel').classList.contains('hidden') };
    });
    check('both panels: the column sits between them', both.open && both.l >= both.sr - 1 && both.r <= both.pl + 1, both);
    await page.evaluate(() => document.getElementById('doc-prose')?.click());
    await page.waitForTimeout(200);
  }

  // Close by the toggle.
  await page.click('#doc-focus-sidebar');
  await page.waitForTimeout(300);
  g = await geo(page);
  check('toggle closes it', !g.open && !g.shown && g.pressed === 'false' && g.storage === null, g);

  // Escape: closes the sidebar first, leaves focus mode second.
  await page.click('#doc-focus-sidebar');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('doc-focus-sidebar').blur());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  g = await geo(page);
  check('Escape 1 closes the sidebar, focus mode stays', g.focus && !g.open, g);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  g = await page.evaluate(() => document.getElementById('tab-documents').classList.contains('doc-focus'));
  check('Escape 2 leaves focus mode', !g, g);

  // Escape from inside the panel returns focus to the toggle.
  await page.click('#doc-focus-toggle');
  await page.waitForTimeout(300);
  await page.click('#doc-focus-sidebar');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#doc-sidebar-tabs button').focus());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  g = await geo(page);
  check('Escape from inside returns focus to the toggle', g.focus && !g.open && g.active === 'doc-focus-sidebar', g.active);

  // Reload restores it (open).
  await page.click('#doc-focus-sidebar');
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    const r = await api('/documents');
    const list = await r.json();
    const docs = list.documents || list.items || list;
    const doc = docs.find((d) => d.title === 'Sidebar sweep');
    switchTab('documents');
    await openDocument(doc.id);
  });
  await page.waitForSelector('#doc-editor .cm-content', { state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  g = await geo(page);
  check('reload restores focus mode with the sidebar open', g.focus && g.open && g.shown && g.pressed === 'true', g);

  const bad = out.filter((o) => !o.ok);
  for (const o of out) console.log(o.ok ? 'ok  ' : 'FAIL', o.name, o.ok ? '' : JSON.stringify(o.detail));
  console.log(bad.length ? `FAILED ${bad.length}` : 'all ok');
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
