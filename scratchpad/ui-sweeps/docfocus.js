// INBOX 425 (i): the documents editor's focus mode, measured.
//
// Enters by the dock button and by F11; checks the chrome is gone (nothing
// but the tab page is hit anywhere in the window), the column is centred at
// the measure in every view, the floating dock is on screen, fades after
// idle and comes back on a pointer move, Escape leaves it (but not while the
// slash menu is open), a reload in the same session brings it back, and the
// fade has no transition under reduced motion.
//
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/docfocus.js
//   SIZE=1366x768 THEME=dark node scratchpad/ui-sweeps/docfocus.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const [W, H] = (process.env.SIZE || '1440x900').split('x').map(Number);
const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

async function room(page) {
  return page.evaluate(() => {
    const seen = (el) => el && el.getClientRects().length > 0 && el.getBoundingClientRect().height > 0;
    const line = [...document.querySelectorAll('#doc-editor .cm-content .cm-line, #doc-preview > *')].find(seen);
    const r = line ? line.getBoundingClientRect() : null;
    const bar = document.getElementById('doc-focus-bar');
    const br = bar.getBoundingClientRect();
    // Anything drawn in the window that is not the documents page: sample a
    // grid and ask what is on top at each point.
    const strays = new Set();
    for (let x = 8; x < innerWidth; x += 48) {
      for (let y = 8; y < innerHeight; y += 48) {
        const el = document.elementFromPoint(x, y);
        if (el && !el.closest('#tab-documents')) strays.add(el.id || el.className || el.tagName);
      }
    }
    return {
      firstTop: r ? +r.top.toFixed(1) : null,
      lineLeft: r ? +r.left.toFixed(1) : null,
      lineW: r ? +r.width.toFixed(1) : null,
      centreOff: r ? +Math.abs(r.left + r.width / 2 - innerWidth / 2).toFixed(1) : null,
      barTop: +br.top.toFixed(1),
      barBottom: +br.bottom.toFixed(1),
      barH: +br.height.toFixed(1),
      barW: +br.width.toFixed(1),
      barOpacity: getComputedStyle(bar).opacity,
      barDisplay: getComputedStyle(bar).display,
      barText: bar.innerText.replace(/\s+/g, ' ').trim(),
      strays: [...strays],
    };
  });
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  await openDoc(page, {
    title: 'Focus sweep',
    content: '# Focus\n\n' + 'Words to write in a quiet room. '.repeat(40) + '\n',
  });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(300);

  const button = await page.$('#doc-focus-toggle');
  check('the dock carries the focus button', button && await button.isVisible(), null);
  await page.click('#doc-focus-toggle');
  await page.waitForTimeout(400);
  let m = await room(page);
  check('on: the floating dock shows', m.barDisplay === 'flex' && m.barOpacity === '1', m);
  check('on: nothing but the page in the window', m.strays.length === 0, m.strays);
  check('on: the column is centred', m.centreOff !== null && m.centreOff <= 2, m.centreOff);
  check('on: the dock is above the first line', m.barBottom <= m.firstTop, { bar: m.barBottom, line: m.firstTop });
  check('on: the dock names the document', /Focus sweep/.test(m.barText) && /words?/.test(m.barText), m.barText);
  console.log('live', JSON.stringify({ firstTop: m.firstTop, lineW: m.lineW, bar: [m.barTop, m.barH, m.barW] }));

  for (const view of ['source', 'split', 'rendered', 'live']) {
    await page.evaluate((v) => setDocView(v), view);
    await page.waitForTimeout(400);
    const v = await room(page);
    check(`${view}: still in focus, no strays`, v.barDisplay === 'flex' && v.strays.length === 0, v.strays);
    if (view !== 'split') check(`${view}: centred`, v.centreOff <= 2, v.centreOff);
    console.log(view, JSON.stringify({ firstTop: v.firstTop, lineW: v.lineW, centreOff: v.centreOff }));
  }

  // Idle: type, and the dock goes at once; wait, it stays gone; move, it is back.
  await page.click('#doc-editor .cm-content');
  await page.keyboard.type(' more');
  await page.waitForTimeout(400);
  m = await room(page);
  check('typing sends the dock away', m.barOpacity === '0', m.barOpacity);
  await page.mouse.move(W / 2, H / 2);
  await page.mouse.move(W / 2 + 40, H / 2 + 10);
  await page.waitForTimeout(400);
  m = await room(page);
  check('a pointer move brings it back', m.barOpacity === '1', m.barOpacity);
  await page.waitForTimeout(3000);
  m = await room(page);
  check('it fades after idle', m.barOpacity === '0', m.barOpacity);

  // The slash menu takes Escape first.
  await page.click('#doc-editor .cm-content');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  await page.waitForTimeout(500);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menu"], .cm-tooltip, [role="listbox"]')]
    .filter((el) => el.getClientRects().length).map((el) => el.id || el.className).slice(0, 3));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  let on = await page.evaluate(() => document.getElementById('tab-documents').classList.contains('doc-focus'));
  check('Escape closes the slash menu, not focus mode', on, { menu });
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');

  // Reload in the session: it comes back.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(3000);
  const id = await page.evaluate(async () => {
    const r = await api('/documents');
    const list = await r.json();
    const docs = list.documents || list.items || list;
    const doc = docs.find((d) => d.title === 'Focus sweep');
    switchTab('documents');
    await openDocument(doc.id);
    return doc.id;
  });
  await page.waitForSelector('#doc-editor .cm-content', { state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  on = await page.evaluate(() => document.getElementById('tab-documents').classList.contains('doc-focus'));
  check('a reload in the session keeps it', on, id);

  // Escape leaves; F11 comes back and leaves again.
  await page.click('#doc-editor .cm-content');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  on = await page.evaluate(() => document.getElementById('tab-documents').classList.contains('doc-focus'));
  check('Escape leaves', !on, on);
  await page.keyboard.press('F11');
  await page.waitForTimeout(300);
  on = await page.evaluate(() => document.getElementById('tab-documents').classList.contains('doc-focus'));
  check('F11 enters', on, on);
  // The key press was not writing (the caret was not in the editor after
  // Escape handed it back? it was), so wake the dock the way a person would.
  await page.mouse.move(W / 2 - 30, H / 3);
  await page.mouse.move(W / 2, H / 3 + 20);
  await page.waitForTimeout(400);
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SCRATCH || '.'}/docfocus-${W}.png` });
  const before = await page.evaluate(() => ({
    cls: document.getElementById('tab-documents').className,
    full: !!document.fullscreenElement,
  }));
  check('still on before Exit is pressed', /doc-focus/.test(before.cls), before);
  await page.click('#doc-focus-exit', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    on: document.getElementById('tab-documents').classList.contains('doc-focus'),
    focus: document.activeElement && (document.activeElement.closest('#doc-editor') ? 'editor' : document.activeElement.tagName),
    stored: sessionStorage.getItem('doc-focus'),
  }));
  check('Exit leaves, hands the caret back, forgets it', !after.on && after.focus === 'editor' && after.stored === null, after);
  await browser.close();

  // Reduced motion: the fade does not animate.
  const rm = await boot({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
  await openDoc(rm.page, { title: 'Focus motion', content: 'x' });
  await rm.page.evaluate(() => toggleDocFocus(true));
  const tr = await rm.page.evaluate(() => getComputedStyle(document.getElementById('doc-focus-bar')).transitionDuration);
  // The app's global reduced-motion rule writes 0.00001s rather than 0s.
  check('reduced motion: no fade transition', parseFloat(tr) < 0.01, tr);
  await rm.page.evaluate(() => toggleDocFocus(false));
  await rm.browser.close();

  const failed = out.filter((c) => !c.ok);
  for (const c of out) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : JSON.stringify(c.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(failed.length ? 1 : 0);
})();
