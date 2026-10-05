// INBOX 582, the owner: "bro's just perched on nothing in the mindmap. the
// companion keeps being left floating in places on various pages and sub
// tabs and tabs". Visits every tab and sub-tab, opens a board and a mind
// map, pans and zooms each, opens and closes popups; after each step, once
// the companion is at rest, asks whether what it sits or stands on (or
// hangs from) is there: a visible element's top edge within 2px of its
// seat or soles (the bottom edge of what it hangs from) under its middle.
// Floating, away, in its large view or on its way somewhere is fine.
//   BASE=http://127.0.0.1:8860 node scratchpad/ui-sweeps/smooth1005-perch.js
// GATE=1 exits 1 on any step that leaves it perched on nothing.
const { boot } = require('./lib.js');

const SUPPORTED = () => {
  const buddy = document.getElementById('nm-buddy');
  if (!buddy || getComputedStyle(buddy).display === 'none') return { ok: true, why: 'not shown' };
  if (nmb.away) return { ok: true, why: 'away' };
  if (nmb.visit) return { ok: true, why: 'visiting' };
  const moving = [nmb.anim, nmb.hopAnim, nmb.glideAnim].some((a) => a && a.playState === 'running');
  if (moving) return { ok: true, why: 'moving', pose: nmb.pose };
  if (!['sit', 'stand', 'hang'].includes(nmb.pose)) return { ok: true, why: nmb.pose, pose: nmb.pose };
  if (nmb.legs === 'peek') return { ok: true, why: 'peeking over the bar' };
  // Where it is drawn (its translate included), at scale 1 about its
  // contact line, which is where the scale is anchored.
  const host = buddy.getBoundingClientRect();
  const x = host.left, y = host.top;
  const line = nmb.pose === 'hang' ? y + NMB_GRIP : nmb.pose === 'sit' ? y + NMB_SEAT : y + NMB_FEET - 1;
  const band = document.getElementById('nm-buddy-band');
  const found = [];
  for (const f of [0.3, 0.5, 0.7]) {
    const px = x + NMB_W * f;
    const py = nmb.pose === 'hang' ? line - 1 : line + 1;
    if (px < 0 || px >= innerWidth || py < 0 || py >= innerHeight) continue;
    for (const el of document.elementsFromPoint(px, py)) {
      if (band && band.contains(el)) continue;
      if (el === document.documentElement || el === document.body || el.classList.contains('tab-page')) break;
      const r = el.getBoundingClientRect();
      const edge = nmb.pose === 'hang' ? r.bottom : r.top;
      if (Math.abs(edge - line) <= 2 && (typeof el.checkVisibility !== 'function' || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))) {
        found.push(el.id ? '#' + el.id : el.nodeName.toLowerCase() + '.' + String(el.className).split(' ')[0]);
        break;
      }
    }
  }
  return { ok: found.length > 0, why: found.length ? 'on ' + found[0] : `nothing at its ${nmb.pose === 'hang' ? 'hands' : nmb.pose === 'sit' ? 'seat' : 'soles'} (y ${Math.round(line)})`, pose: nmb.pose, kind: nmb.perch, at: [Math.round(x), Math.round(y)] };
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 900) } });
  await page.evaluate(() => { localStorage.setItem('avatar-buddy', 'atlas'); syncNameMarkBuddy(); });
  await page.waitForFunction(() => typeof nmb !== 'undefined' && !nmb.away && Number.isFinite(nmb.x), null, { timeout: 15000 }).catch(() => {});
  const rows = [];
  const settle = async (ms = 4200) => {
    await page.waitForTimeout(ms);
    // At rest: no move of its own running.
    await page.waitForFunction(() => ![nmb.anim, nmb.hopAnim, nmb.glideAnim].some((a) => a && a.playState === 'running'), null, { timeout: 4000, polling: 100 }).catch(() => {});
  };
  const check = async (name) => {
    const r = await page.evaluate(SUPPORTED);
    rows.push({ name, ...r });
    console.log(`${r.ok ? 'ok  ' : 'AIR '} ${name}: ${r.why}${r.kind ? ` (${r.kind}, ${r.pose} at ${r.at})` : ''}`);
  };
  const step = async (name, act, ms) => { await act(); await settle(ms); await check(name); };

  const tabs = await page.$$eval('#tab-bar button[data-tab]', (b) => b.filter((x) => x.offsetParent).map((x) => x.dataset.tab));
  for (const tab of tabs) await step(`tab ${tab}`, () => page.click(`#tab-bar button[data-tab="${tab}"]`));
  for (const tab of ['notes', 'library']) {
    await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(600);
    const subs = await page.$$eval(`#tab-${tab} [role="tablist"] [role="tab"]`, (b) => b.filter((x) => x.offsetParent).map((x) => x.textContent.trim()).slice(0, 6));
    for (const s of subs) await step(`${tab} sub ${s}`, () => page.evaluate(([t, s]) => [...document.querySelectorAll(`#tab-${t} [role="tablist"] [role="tab"]`)].find((x) => x.textContent.trim() === s)?.click(), [tab, s]));
  }
  // A mind map and a board, each panned and zoomed.
  const ids = await page.evaluate(async () => {
    const all = await apiJson('/whiteboard/boards').catch(() => []);
    const list = Array.isArray(all) ? all : all.items || [];
    let map = list.find((b) => b.name === 'Perch probe map');
    if (!map) {
      map = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Perch probe map', type: 'map' }) });
      await apiJson(`/whiteboard/boards/${map.id}/nodes/outline`, { method: 'POST', body: JSON.stringify({ parent_id: null, text: 'Root idea\n  First branch\n    A leaf\n    Another leaf\n  Second branch\n  Third branch\n    Deep leaf' }) }).catch(() => null);
    }
    let board = list.find((b) => b.name === 'Perch probe board');
    if (!board) board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Perch probe board' }) });
    return { map: map.id, board: board.id };
  });
  for (const [what, id] of [['map', ids.map], ['board', ids.board]]) {
    await step(`${what} open`, () => page.evaluate((id) => openWhiteboardBoard(id), id));
    const box = await page.evaluate(() => { const r = document.getElementById('whiteboard-container').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await step(`${what} panned`, async () => {
      await page.mouse.move(box.x - 100, box.y + 80);
      await page.mouse.down({ button: 'middle' }).catch(() => {});
      await page.mouse.move(box.x + 160, box.y - 60, { steps: 12 });
      await page.mouse.up({ button: 'middle' }).catch(() => {});
      await page.mouse.wheel(0, 0);
      for (let i = 0; i < 6; i++) await page.mouse.wheel(140, 60);
    });
    // Put down on what is drawn on the canvas (a topic, a card), as a drag
    // would: the canvas's content is never a perch, so it must not stay.
    await step(`${what} dropped on its content`, async () => {
      await page.evaluate(() => {
        const node = [...document.querySelectorAll('#whiteboard-container .wb-object, #whiteboard-container .wb-card, #wb-html-layer > *')].find((n) => { const r = n.getBoundingClientRect(); return r.width > 40 && r.top > 160; });
        const r = node ? node.getBoundingClientRect() : document.getElementById('whiteboard-container').getBoundingClientRect();
        const y = (node ? r.top : r.top + r.height / 2) - NMB_SEAT;
        const spot = { kind: 'yours', pose: 'sit', legs: '', x: Math.round(r.left + 10), y: Math.round(y) };
        nameMarkBuddyMoveTo(document.getElementById('nm-buddy'), spot, true);
      });
    }, 5200);
    await step(`${what} zoomed`, async () => {
      await page.mouse.move(box.x, box.y);
      await page.keyboard.down('Control');
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -120);
      await page.keyboard.up('Control');
    });
  }
  await step('settings open and closed', async () => { await page.evaluate(() => openSettingsModal()); await page.waitForTimeout(900); await page.keyboard.press('Escape'); });
  await step('palette open and closed', async () => { await page.evaluate(() => openPalette()); await page.waitForTimeout(700); await page.keyboard.press('Escape'); });
  await step('window resized', async () => { await page.setViewportSize({ width: 1100, height: 760 }); });
  await browser.close();
  const air = rows.filter((r) => !r.ok);
  console.log(`steps leaving it perched on nothing: ${air.length}/${rows.length}`);
  if (process.env.GATE && air.length) process.exit(1);
})();
