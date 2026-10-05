// INBOX 607: "I made a mind map from the graph but the notification included
// no link to it" and "surely there's a better and more dynamic way it can
// build the map based off the connections and links". Seeds 33 notes in four
// categories: three hubs with spokes, a chain, cross-links, and loose notes.
// Selects all 33 on the Graph, presses Mind map, and measures:
//   (1) the notice has an Open button and Open opens that map;
//   (2) the map's shape: nodes, deepest level, the most children any node
//       keeps, nodes on each side of the root, cross-links;
//   (3) after Open's tidy, overlapping node boxes on screen (must be 0);
//   (4) after a reload, the bell row for it has Open and Open opens the map.
// Pass: every check true, max children <= 8, both sides used, 0 overlaps.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const name = `From graph ${Date.now() % 100000}`;
  const seeded = await page.evaluate(async () => {
    const cats = ['Work', 'Reading', 'Health', 'Home'];
    const ids = [];
    for (let i = 0; i < 33; i += 1) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `# Seed ${String(i).padStart(2, '0')} ${['plan', 'idea', 'log', 'list'][i % 4]}\n\nbody ${i}`, category: cats[Math.floor(i / 9) % 4], defer_filing: true }) });
      ids.push(e.id);
    }
    const link = (a, b) => apiJson(`/entries/${ids[a]}/links`, { method: 'POST', body: JSON.stringify({ target_id: ids[b] }) }).catch(() => null);
    // hub 0 with 10 spokes (overfull: must split), hub 11 with 6, hub 20 with 4,
    // a chain 26-27-28-29, cross-links between spokes, 30-32 loose.
    for (let i = 1; i <= 10; i += 1) await link(0, i);
    for (let i = 12; i <= 17; i += 1) await link(11, i);
    for (let i = 21; i <= 24; i += 1) await link(20, i);
    for (const [a, b] of [[26, 27], [27, 28], [28, 29], [0, 11], [1, 2], [12, 13], [3, 21], [5, 26]]) await link(a, b);
    return ids;
  });
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(3500);
  const onGraph = await page.evaluate((ids) => {
    const wanted = ids.filter((id) => gcTab.byId.has(id));
    gcTab.selected = new Set(wanted);
    gcSelectionChanged(gcTab);
    const btn = document.getElementById('graph-selection-map');
    return { onGraph: wanted.length, buttonShown: !!btn && btn.offsetParent !== null };
  }, seeded);
  console.log(`W${W}: seeded 33, on the graph ${onGraph.onGraph}, Mind map button shown ${onGraph.buttonShown}`);
  await page.click('#graph-selection-map');
  await page.waitForSelector('.prompt-card input', { timeout: 5000 });
  await page.fill('.prompt-card input', name);
  await page.keyboard.press('Enter');
  const toast = await page.waitForFunction((name) => {
    const t = [...document.querySelectorAll('.toast')].find((n) => n.textContent.includes(name));
    if (!t) return false;
    const b = t.querySelector('.toast-action');
    return { text: t.querySelector('.toast-msg')?.textContent, action: b?.textContent || null };
  }, name, { timeout: 10000 }).then((h) => h.jsonValue()).catch(() => null);
  console.log(`notice: "${toast?.text}" action ${JSON.stringify(toast?.action)} ${toast?.action === 'Open' ? 'PASS' : 'FAIL'}`);
  const boardId = await page.evaluate(async (name) => (await apiJson('/whiteboard/boards')).find((b) => b.title === name)?.id, name);
  await page.evaluate((name) => [...document.querySelectorAll('.toast')].find((n) => n.textContent.includes(name)).querySelector('.toast-action').click(), name);
  await page.waitForTimeout(2500);
  const opened = await page.evaluate(() => window.currentBoardId);
  console.log(`toast Open: board ${opened} (made ${boardId}) ${opened === boardId ? 'PASS' : 'FAIL'}`);
  const shape = await page.evaluate(async (boardId) => {
    const st = await apiJson(`/whiteboard/?board_id=${boardId}`);
    const objs = st.objects;
    const kids = new Map();
    for (const o of objs) if (o.parent_id) kids.set(o.parent_id, (kids.get(o.parent_id) || 0) + 1);
    const root = objs.find((o) => !o.parent_id);
    const byId = new Map(objs.map((o) => [o.id, o]));
    const depth = (o) => (o.parent_id ? 1 + depth(byId.get(o.parent_id)) : 0);
    const els = objs.map((o) => document.querySelector(`.wb-object[data-id="${o.id}"]`)).filter(Boolean);
    const rects = els.map((e) => e.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i], b = rects[j];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) overlaps += 1;
    }
    const rootEl = document.querySelector(`.wb-object[data-id="${root.id}"]`).getBoundingClientRect();
    const cx = rootEl.left + rootEl.width / 2;
    const left = rects.filter((r) => r.right < cx).length, right = rects.filter((r) => r.left > cx).length;
    const links = st.sketches.filter((s) => JSON.stringify(s.data).includes('sourceId')).length;
    const notes = objs.filter((o) => o.data?.ref_id).length;
    return { nodes: objs.length, drawn: els.length, notes, topics: objs.length - notes, rootText: root.data?.content, maxKids: Math.max(...kids.values()), maxDepth: Math.max(...objs.map(depth)), left, right, overlaps, links };
  }, boardId);
  console.log(`map: ${shape.nodes} nodes (${shape.notes} notes, ${shape.topics} topics), drawn ${shape.drawn}, root "${shape.rootText}", deepest ${shape.maxDepth}, most children ${shape.maxKids} ${shape.maxKids <= 8 ? 'PASS' : 'FAIL'}`);
  console.log(`layout: left ${shape.left}, right ${shape.right} ${shape.left && shape.right ? 'PASS' : 'FAIL'}; overlapping boxes ${shape.overlaps} ${shape.overlaps === 0 ? 'PASS' : 'FAIL'}; cross-links ${shape.links}`);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/bm1005-mapfromgraph-${W}.png` });
  // (4) the bell row, after a reload so only the stored `go` can work.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
    await page.waitForTimeout(4000);
  }
  await page.evaluate(() => { window.currentBoardId = null; switchTab('notes'); });
  await page.waitForTimeout(500);
  await page.click('#notif-btn');
  await page.waitForTimeout(800);
  const row = await page.evaluate((name) => {
    const r = [...document.querySelectorAll('#notif-list li')].find((li) => li.textContent.includes(name));
    const b = r?.querySelector('.notif-cta');
    return { found: !!r, label: b?.textContent || null, disabled: b?.disabled ?? null };
  }, name);
  console.log(`bell row: found ${row.found}, button ${JSON.stringify(row.label)}, disabled ${row.disabled} ${row.label === 'Open' && !row.disabled ? 'PASS' : 'FAIL'}`);
  if (row.found) {
    await page.evaluate((name) => [...document.querySelectorAll('#notif-list li')].find((li) => li.textContent.includes(name)).querySelector('.notif-cta').click(), name);
    await page.waitForTimeout(2500);
    const again = await page.evaluate(() => window.currentBoardId);
    console.log(`bell Open after reload: board ${again} ${again === boardId ? 'PASS' : 'FAIL'}`);
  }
  console.log(`page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
})();
