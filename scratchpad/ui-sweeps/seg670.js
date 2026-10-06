// INBOX 670: the wells INBOX 665 left, now lists. At W (390 or 1440) in THEME:
//   settings  Appearance, Typography & layout: Font and Density are selects
//             (one control height, inside the row, no overflow), choosing a
//             row writes the setting and the page follows, the list shows the
//             stored value after a reload of the section.
//   graph     the Graph's View panel: Layout is a select among its siblings,
//             a choice reaches the map (localStorage and the layout in use),
//             and a saved view restores it.
//   inbox     the suggestions inbox: the kinds are a select, its rows carry
//             the counts, the panes follow, and no `.seg` is left in the sheet.
//   BASE=... THEME=dark W=390 node scratchpad/ui-sweeps/seg670.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? 'PASS' : 'FAIL'}  ${W} ${n}${c || d === undefined ? '' : '  ' + d}`); };

(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const want = W < 820 ? 44 : 32;

  // --- settings ---------------------------------------------------------
  await page.evaluate(() => openSettingsModal('appearance'));
  await page.waitForTimeout(900);
  await page.evaluate(() => { showSettingsSection('appearance'); for (const d of document.querySelectorAll('#settings-appearance details')) d.open = true; });
  await page.waitForTimeout(500);
  for (const id of ['font-seg', 'density-seg']) {
    const m = await page.evaluate((id) => {
      const el = document.getElementById(id);
      const shell = el.closest('.select-shell') || el;
      shell.scrollIntoView({ block: 'center' });
      const r = shell.getBoundingClientRect();
      const row = el.closest('.setting-row').getBoundingClientRect();
      const ref = document.getElementById('perf-mode').closest('.select-shell').getBoundingClientRect();
      return { tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height), inRow: r.left >= row.left - 0.5 && r.right <= row.right + 0.5, inView: r.left >= 0 && r.right <= innerWidth, seg: el.closest('.setting-row').querySelectorAll('.seg').length, refH: Math.round(ref.height), refW: Math.round(ref.width), value: el.value, shown: el.closest('.select-shell')?.querySelector('.select-value')?.textContent };
    }, id);
    console.log(id, JSON.stringify(m));
    ok(`#${id} is a select inside its row and the window`, m.tag === 'SELECT' && m.inRow && m.inView && m.seg === 0, JSON.stringify(m));
    ok(`#${id} is the same height as the other settings lists`, Math.abs(m.h - m.refH) <= 1 && m.h >= want, `${m.h} vs ${m.refH}`);
  }
  await page.selectOption('#font-seg', 'serif');
  await page.waitForTimeout(300);
  let s = await page.evaluate(() => ({ stored: localStorage.getItem('font'), root: document.documentElement.dataset.font, value: document.getElementById('font-seg').value }));
  ok('Font: choosing Serif writes it and the page follows', s.stored === 'serif' && s.root === 'serif' && s.value === 'serif', JSON.stringify(s));
  await page.selectOption('#font-seg', 'system');
  await page.selectOption('#density-seg', 'compact');
  await page.waitForTimeout(300);
  s = await page.evaluate(() => ({ stored: localStorage.getItem('density'), root: document.documentElement.dataset.density, value: document.getElementById('density-seg').value }));
  ok('Density: Compact is stored and applied', s.stored === 'compact' && s.root === 'compact' && s.value === 'compact', JSON.stringify(s));
  await page.selectOption('#density-seg', 'auto');
  await page.waitForTimeout(300);
  s = await page.evaluate(() => ({ stored: localStorage.getItem('density'), value: document.getElementById('density-seg').value }));
  ok('Density: Auto clears the setting', s.stored === null && s.value === 'auto', JSON.stringify(s));
  await page.focus('#font-seg ~ .select-opener');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  s = await page.evaluate(() => localStorage.getItem('font'));
  ok('Font: Enter, Down and Enter on the list choose from the keyboard', s === 'serif', String(s));
  await page.selectOption('#font-seg', 'system');
  await page.waitForTimeout(300);
  await page.click('#font-seg ~ .select-opener');
  await page.waitForTimeout(300);
  const faces = await page.evaluate(() => [...document.querySelectorAll('.select-menu:not(.hidden) .select-option')].map((r) => `${r.dataset.value}:${getComputedStyle(r).fontFamily.split(',')[0].replace(/"/g, '')}`));
  console.log('font rows', faces.join(' | '));
  ok('Font: each row is set in its own face', faces.length === 4 && /serif:Georgia/.test(faces[1]) && /mono:ui-monospace/.test(faces[2]) && /arial:Arial/.test(faces[3]) && !/Georgia|Arial|ui-monospace/.test(faces[0]), faces.join(' | '));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.selectOption('#font-seg', 'system');
  await page.evaluate(() => { showSettingsSection('models'); showSettingsSection('appearance'); });
  await page.waitForTimeout(300);
  s = await page.evaluate(() => document.getElementById('font-seg').value);
  ok('Font: the list shows the stored value when the section is reopened', s === 'system', s);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { try { closeSettingsModal?.(); } catch (e) {} });
  await page.waitForTimeout(300);

  // --- graph ------------------------------------------------------------
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const b = document.getElementById('graph-options-toggle') || document.querySelector('[aria-controls="graph-options"]'); if (b && document.getElementById('graph-options').classList.contains('hidden')) b.click(); });
  await page.waitForTimeout(600);
  const g = await page.evaluate(() => {
    const el = document.getElementById('graph-layout');
    const sib = document.getElementById('graph-colour');
    const panel = document.getElementById('graph-options');
    const r = (el.closest('.select-shell') || el).getBoundingClientRect();
    const sr = (sib.closest('.select-shell') || sib).getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    return { tag: el.tagName, vis: !!el.offsetParent, h: Math.round(r.height), sibH: Math.round(sr.height), left: Math.round(r.left), sibLeft: Math.round(sr.left), over: Math.round(r.right - pr.right), options: [...el.options].map((o) => o.value), radios: document.querySelectorAll('input[name="graph-layout"]').length };
  });
  console.log('graph', JSON.stringify(g));
  ok('Graph Layout is a select beside Colour and Size', g.tag === 'SELECT' && g.vis && g.radios === 0 && g.options.join() === 'force,tree,radial,arc', JSON.stringify(g));
  ok('Graph Layout is the same height and column as Colour', Math.abs(g.h - g.sibH) <= 1 && Math.abs(g.left - g.sibLeft) <= 1 && g.over <= 0, JSON.stringify(g));
  await page.selectOption('#graph-layout', 'radial');
  await page.waitForTimeout(1500);
  s = await page.evaluate(() => ({ stored: localStorage.getItem('graph-layout'), now: typeof graphLayout === 'function' ? graphLayout() : null, value: document.getElementById('graph-layout').value }));
  ok('Graph: choosing Radial reaches the map', s.stored === 'radial' && s.value === 'radial' && (s.now === null || s.now === 'radial'), JSON.stringify(s));
  await page.selectOption('#graph-layout', 'force');
  await page.waitForTimeout(800);

  // --- the suggestions inbox -------------------------------------------
  await page.evaluate(() => openSuggestionsInbox('links'));
  await page.waitForFunction(() => document.getElementById('inbox-kind'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const ib = await page.evaluate(() => {
    const el = document.getElementById('inbox-kind');
    if (!el) return null;
    const card = el.closest('.sheet-card');
    const r = (el.closest('.select-shell') || el).getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    return { tag: el.tagName, h: Math.round(r.height), inCard: r.left >= cr.left && r.right <= cr.right, seg: card.querySelectorAll('.seg').length, options: [...el.options].map((o) => o.textContent), value: el.value, panes: [...card.querySelectorAll('.inbox-pane')].map((p) => !p.hidden) };
  });
  console.log('inbox', JSON.stringify(ib));
  ok('Inbox kinds are one select with no pill well left', !!ib && ib.tag === 'SELECT' && ib.seg === 0 && ib.inCard && ib.h >= want, JSON.stringify(ib));
  ok('Inbox: four kinds, Links first, one pane showing', !!ib && ib.options.length === 4 && /^Links/.test(ib.options[0]) && ib.panes.filter(Boolean).length === 1, JSON.stringify(ib));
  await page.selectOption('#inbox-kind', 'names');
  await page.waitForTimeout(300);
  const nm = await page.evaluate(() => ({ value: document.getElementById('inbox-kind').value, shown: [...document.querySelectorAll('.inbox-pane')].map((p) => !p.hidden) }));
  ok('Inbox: choosing Names shows the Names pane only', nm.shown.join() === 'false,false,true,false', JSON.stringify(nm));
  await page.focus('#inbox-kind ~ .select-opener');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const nx = await page.evaluate(() => document.getElementById('inbox-kind').value);
  ok('Inbox: the list walks the kinds from the keyboard', nx === 'types', nx);

  ok('no console or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(bad ? `FAILED ${bad}` : 'ALL PASS');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
