// Brief 77 row 1 (WORLD_CLASS 28.1 rules 8, 2): every `WB_COMMANDS` row the
// board carries has a phone path at 390 (touch). A path is a visible control
// that names the command: `[data-wb-cmd]`, the rail's `[data-tool]`, or the
// id a command clicks, on the bar, in a menu its toggle opens, or in the
// top bar's More sheet. Prints each command and where it is reached.
//
//   BASE=http://127.0.0.1:8823 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbphonecmds.js
const { boot, openBoardsTab, waitForBoardOpen } = require('./lib.js');
const WIDTH = Number(process.env.WIDTH || 390);
(async () => {
  const touch = WIDTH < 600;
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: 844 }, hasTouch: touch, isMobile: touch });
  await openBoardsTab(page);
  const id = await page.evaluate(async () => (await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Phone cmds ' + Date.now(), type: 'board' }) })).id);
  await page.evaluate((i) => openWhiteboardBoard(i), id);
  await waitForBoardOpen(page, 0);
  await page.waitForTimeout(600);
  const out = await page.evaluate(async () => {
    const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); if (!(r.width > 0 && r.height > 0 && cs.visibility !== 'hidden')) return false; if (el.closest('.sheet-card, .wb-board-menu, .action-menu, .wb-shape-menu, .wb-tool-group')) return true; return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; };
    // A row in a sheet or a menu that scrolls is reachable below its fold.
    const seen = new Map();
    const take = (where) => {
      for (const el of document.querySelectorAll('[data-wb-cmd], [data-tool], button[id]')) {
        if (!vis(el)) continue;
        const keys = [];
        if (el.dataset.wbCmd) keys.push('cmd:' + el.dataset.wbCmd);
        if (el.dataset.tool) keys.push('tool:' + el.dataset.tool);
        if (el.id) keys.push('id:' + el.id);
        for (const k of keys) if (!seen.has(k)) seen.set(k, where);
      }
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    take('bar');
    const openers = [...document.querySelectorAll('#library-view-whiteboard [data-wb-menu-toggle], #wb-tools-opener, #wb-more-toggle')].filter(vis);
    for (const o of openers) {
      o.click(); await wait(250);
      take(o.id || o.getAttribute('aria-controls') || o.className);
      // One level down: the tools sheet's shape flyout.
      // Its caret opens it (a press on the face takes the last shape).
      const caret = document.querySelector('#wb-shape-toggle .wb-shape-caret');
      if ((o.id === 'wb-tools-opener' || o === openers[0]) && caret && vis(caret)) { const tap = () => caret.dispatchEvent(new MouseEvent('click', { bubbles: true })); tap(); await wait(250); take('wb-shape-toggle caret'); tap(); await wait(100); }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(150);
      if (o.getAttribute('aria-expanded') === 'true') { o.click(); await wait(150); }
      document.querySelector('.sheet-overlay:not(.sheet-leaving) .sheet-close')?.click(); await wait(400);
    }
    const rows = WB_COMMANDS.filter((c) => c.surface !== 'map');
    const res = rows.map((c) => {
      const keys = ['cmd:' + c.id];
      return { id: c.id, group: c.group, keys };
    });
    return { rows: res, seen: [...seen.entries()] };
  });
  // Map closures to keys from the source text, which the page cannot.
  const fs = require('fs');
  const text = fs.readFileSync(__dirname + '/../../frontend/js/whiteboard-commands.js', 'utf8');
  const seen = new Map(out.seen);
  let ok = 0; const missing = [];
  for (const r of out.rows) {
    const line = text.split('\n').find((l) => l.includes(`id: "${r.id}"`)) || '';
    const tool = line.match(/wbTool\("([a-z-]+)"\)/); const click = line.match(/wbClickId\("([a-z-]+)"\)/);
    if (tool) r.keys.push('tool:' + tool[1]);
    if (click) r.keys.push('id:' + click[1]);
    const hit = r.keys.find((k) => seen.has(k));
    if (hit) { ok++; console.log('  ok  ', r.id.padEnd(22), '<-', seen.get(hit)); } else { missing.push(r.id); console.log('  MISS', r.id.padEnd(22), r.group); }
  }
  console.log(`width ${WIDTH}: commands with a path ${ok} of ${out.rows.length}`);
  const small = await page.evaluate(() => [...document.querySelectorAll('#wb-topbar button, #wb-more-toggle')].filter((b) => b.getClientRects().length).map((b) => [b.id || b.className, Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]).filter(([, w, h]) => w < 44 || h < 44));
  const bar = await page.evaluate(() => { const b = document.getElementById('wb-topbar'); const past = [...b.querySelectorAll('button, .select-opener')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > Math.min(innerWidth, b.getBoundingClientRect().right) + 0.5).length; return { scroll: b.scrollWidth, client: b.clientWidth, past }; });
  console.log('top bar scrollWidth', bar.scroll, 'clientWidth', bar.client, 'controls past its edge', bar.past);
  if (WIDTH < 600) console.log('top-bar targets under 44 px:', small.length, JSON.stringify(small));
  if (missing.length) console.log('missing:', missing.join(' '));
  await browser.close();
  process.exit(missing.length && process.env.STRICT ? 1 : 0);
})();
