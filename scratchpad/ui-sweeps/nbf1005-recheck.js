// nbf1005: the "not re-checked" items of WORLD_CLASS_PLAN section 8 rows 31
// and 34, measured: the tab bar between 600 and 819px, Settings > Packages
// row alignment (22), Settings > Help rhythm (23), a board preview's rects
// (the minimap NaN report) and the reminder row's recipe (D8).
//   BASE=http://127.0.0.1:8851 THEME=light node scratchpad/ui-sweeps/nbf1005-recheck.js
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const out = [];
  const line = (name, ok, detail = '') => out.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);

  // The tab bar at 600 to 819px.
  for (const w of [600, 640, 700, 760, 819]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(400);
    const bar = await page.evaluate(() => {
      const el = document.getElementById('tab-bar');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { scroll: el.scrollWidth, client: el.clientWidth, visible: cs.display !== 'none' && el.offsetParent !== null };
    });
    line(`tab bar at ${w}px fits`, bar && (!bar.visible || bar.scroll <= bar.client + 1), JSON.stringify(bar));
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // A board with things on it, so the Notes list draws its preview.
  await page.evaluate(async () => {
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Preview board' }) });
    for (let i = 0; i < 6; i++) {
      await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: board.id, kind: 'text', x: i * 240, y: (i % 2) * 160, data: { content: `Card ${i}` } }) }).catch(() => {});
    }
    await switchTab('whiteboard');
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (typeof closeWhiteboardBoard === 'function') closeWhiteboardBoard(); });
  await page.waitForTimeout(1500);
  const drawn = await page.evaluate(() => document.querySelectorAll('svg rect.board-minimap-object, svg rect.board-minimap-card, svg rect.board-minimap-branch, svg rect.board-minimap-image').length);
  line('a board preview draws its blocks', drawn > 0, String(drawn));
  const rects = await page.evaluate(() => [...document.querySelectorAll('svg rect')].filter((r) => ['x', 'y', 'width', 'height'].some((a) => /NaN/.test(r.getAttribute(a) || ''))).length);
  line('no NaN rect on a board preview', rects === 0, String(rects));

  // Settings > Packages: each row's icon, words and button on one centre line.
  await page.evaluate(() => openSettingsModal('extras'));
  await page.waitForTimeout(1500);
  const packages = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#extras-list > li')];
    return rows.map((li) => {
      const kids = [...li.children].filter((c) => c.getBoundingClientRect().height > 0);
      const centres = kids.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
      const button = li.querySelector('button');
      const b = button && button.getBoundingClientRect();
      //: The row's head line (the name, the badge, the buttons): what the
      //: report (22) was about. The description under it is its own line.
      const title = li.querySelector('strong, h4, .extra-name, [class*="name"]') || kids[0];
      const r = title.getBoundingClientRect();
      return { spread: centres.length ? Math.max(...centres) - Math.min(...centres) : 0, buttonOffset: b ? Math.abs((b.top + b.height / 2) - (r.top + r.height / 2)) : 0 };
    });
  });
  await page.screenshot({ path: `${process.env.SCRATCH}/nbf1005-packages.png`, clip: await page.evaluate(() => { const r = document.getElementById('extras-list').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, 600) }; }) });
  line('Packages rows: the button sits on the name line', packages.length > 0 && packages.every((p) => p.buttonOffset <= 3), JSON.stringify(packages.slice(0, 4)));

  // Settings > Help: the accordion rows do not touch.
  await page.evaluate(() => showSettingsSection('help'));
  await page.waitForTimeout(1500);
  const help = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#help-topics details')].filter((d) => d.getBoundingClientRect().height > 0);
    const gaps = [];
    for (let i = 1; i < items.length; i++) {
      const a = items[i - 1].getBoundingClientRect();
      const b = items[i].getBoundingClientRect();
      if (Math.abs(a.left - b.left) < 1) gaps.push(Math.round((b.top - a.bottom) * 10) / 10);
    }
    return { count: items.length, minGap: gaps.length ? Math.min(...gaps) : null, negative: gaps.filter((g) => g < 0).length };
  });
  await page.screenshot({ path: `${process.env.SCRATCH}/nbf1005-help.png`, clip: await page.evaluate(() => { const r = document.getElementById('help-topics').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, 500) }; }) });
  line('Help topics: no rows overlap', help.count > 0 && help.negative === 0, JSON.stringify(help));
  await page.keyboard.press('Escape');

  // D8: a reminder row is the notes' row recipe.
  await page.evaluate(async () => {
    await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text: 'Recipe check', due_at: new Date(Date.now() + 7200e3).toISOString() }) });
    await switchTab('reminders');
    await loadReminders();
  });
  await page.waitForTimeout(800);
  const recipe = await page.evaluate(() => {
    const li = document.querySelector('#reminder-groups li[data-id]');
    return li ? { list: li.parentElement.className, row: li.firstElementChild.className } : null;
  });
  line('reminder rows share the notes row recipe', recipe && recipe.list.includes('entry-list') && recipe.row.includes('entry-meta'), JSON.stringify(recipe));

  line('no console errors', errors.length === 0, errors.slice(0, 4).join(' || '));
  console.log(`nbf1005-recheck ${process.env.THEME || 'light'}\n${out.join('\n')}`);
  await browser.close();
})();
