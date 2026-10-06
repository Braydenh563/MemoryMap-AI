// INBOX 697 + 698: the Settings sidebar's group headings read as labels, not
// rows, and a press on one opens its group's first page; the page list stays
// compact with a page open.
//   BASE=http://127.0.0.1:8823 [THEME=dark] [LOOK=utilitarian] node scratchpad/ui-sweeps/settingsnav697.js
const { boot } = require('./lib.js');
let bad = 0;
const check = (name, ok, extra) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 800 } });
  let errs = 0;
  page.on('pageerror', () => errs++);
  await page.evaluate(() => openSettingsModal('models')); await page.waitForTimeout(1500);

  // 697: a heading against a row (computed, never read off a picture).
  const look = await page.evaluate(() => {
    const px = (el) => { const c = getComputedStyle(el); return { size: parseFloat(c.fontSize), weight: +c.fontWeight, color: c.color, transform: c.textTransform, cursor: c.cursor, h: Math.round(el.getBoundingClientRect().height) }; };
    const label = document.getElementById('nav-group-about');
    const row = document.getElementById('settings-nav-help');
    return { label: px(label), row: px(row), tag: label.tagName, role: label.getAttribute('role'), tab: label.tabIndex };
  });
  console.log(JSON.stringify(look));
  check('heading is at most 80% of a row\'s text size', look.label.size <= look.row.size * 0.8, `${look.label.size} vs ${look.row.size}`);
  check('heading is not heavier than a row', look.label.weight <= look.row.weight, `${look.label.weight} vs ${look.row.weight}`);
  check('heading is not ink (a row is muted; the loudest text is the page)', look.label.color === look.row.color, `${look.label.color} vs ${look.row.color}`);
  check('heading has no pointer cursor', look.label.cursor !== 'pointer', look.label.cursor);

  // A press on a heading lands on its group's first page.
  const heads = await page.evaluate(() => [...document.querySelectorAll('#settings-nav .nav-group-label')].map((l) => ({ id: l.id, first: l.nextElementSibling.querySelector('button[data-section]').dataset.section })));
  for (const h of heads) {
    await page.evaluate(() => openSettingsModal('about'));
    await page.waitForTimeout(600);
    await page.click('#' + h.id);
    await page.waitForTimeout(700);
    const now = await page.evaluate(() => currentSettingsSection);
    check(`heading ${h.id} opens ${h.first} on one press`, now === h.first, `got ${now}`);
  }

  // 698: the page list stays compact with a page open.
  const rows = await page.evaluate(async () => {
    const out = [];
    for (const b of document.querySelectorAll('#settings-nav button[data-section]')) {
      if (b.classList.contains('hidden')) continue;
      out.push(b.dataset.section);
    }
    return out;
  });
  const gaps = {};
  for (const open of ['help', 'appearance', 'privacy']) {
    await page.evaluate((s) => openSettingsModal(s), open);
    await page.waitForTimeout(1500);
    const g = await page.evaluate((s) => {
      const b = [...document.querySelectorAll('#settings-nav button[data-section]')].filter((x) => x.getClientRects().length);
      const i = b.findIndex((x) => x.dataset.section === s);
      const next = b[i + 1];
      const first = b[0], second = b[1];
      return { rowToNext: next ? Math.round(next.getBoundingClientRect().top - b[i].getBoundingClientRect().top) : null, normalGap: Math.round(second.getBoundingClientRect().top - first.getBoundingClientRect().top), sub: document.querySelectorAll('#settings-nav .settings-nav-group').length, subVisible: [...document.querySelectorAll('#settings-nav .settings-nav-group')].filter((x) => x.getClientRects().length).length };
    }, open);
    gaps[open] = g;
    console.log(open, JSON.stringify(g));
    check(`${open} open: next page row is within 4 rows of it`, g.rowToNext !== null && g.rowToNext <= g.normalGap * 4 + 20, `row to next ${g.rowToNext}px, normal ${g.normalGap}px, sections shown ${g.subVisible}/${g.sub}`);
  }
  // The toggle shows every section, and the choice is remembered.
  await page.evaluate(() => openSettingsModal('help')); await page.waitForTimeout(1500);
  await page.click('.settings-nav-groups-head .linklike'); await page.waitForTimeout(400);
  const open1 = await page.evaluate(() => ({ shown: [...document.querySelectorAll('#settings-nav .settings-nav-group')].filter((x) => x.getClientRects().length).length, ae: document.querySelector('.settings-nav-groups-head .linklike').getAttribute('aria-expanded'), ls: localStorage.getItem('settings-nav-sections') }));
  check('Show all shows every section', open1.shown === 13 && open1.ae === 'true' && open1.ls === 'all', JSON.stringify(open1));
  await page.evaluate(() => { closeSettingsModal(); }); await page.waitForTimeout(400);
  await page.evaluate(() => openSettingsModal('appearance')); await page.waitForTimeout(1500);
  const open2 = await page.evaluate(() => [...document.querySelectorAll('#settings-nav .settings-nav-group')].filter((x) => x.getClientRects().length).length);
  check('the choice is remembered on the next page', open2 === 8, `shown ${open2}`);
  await page.click('.settings-nav-groups-head .linklike'); await page.waitForTimeout(400);
  const open3 = await page.evaluate(() => [...document.querySelectorAll('#settings-nav .settings-nav-group')].filter((x) => x.getClientRects().length).length);
  check('Show fewer goes back to the one section', open3 === 1, `shown ${open3}`);
  // Every page row lands with one press.
  for (const s of rows) {
    await page.evaluate(() => openSettingsModal('models')); await page.waitForTimeout(500);
    const ok = await page.evaluate(() => true);
    await page.click(`#settings-nav button[data-section="${s}"]`, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(450);
    const now = await page.evaluate(() => currentSettingsSection);
    check(`row ${s} opens on one press`, now === s, `got ${now}`);
  }
  console.log('page errors', errs);
  console.log(bad ? `FAILED ${bad}` : 'all ok');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
