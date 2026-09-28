// The Agent activity panel must float over a tab, never resize it.
//
//   scratchpad/ui-sweeps/serve.sh 8799 /tmp/mm-activity
//   BASE=http://127.0.0.1:8799 node scratchpad/ui-sweeps/activitypanel.js
//   BASE=http://127.0.0.1:8799 THEME=dark node scratchpad/ui-sweeps/activitypanel.js
//   SIZES=1440x900 TABS=graph ...   to narrow the run
//
// Why (owner's screenshot, desktop ~2000x1076): with the panel open, the Graph
// card ended at y=525 and the rest of the page was empty down to the panel.
// `body.has-agent-monitor .tab-page` added an 18rem padding-bottom to every
// tab page as scroll room, and on a fixed-height tab (the Graph card, the
// Timeline, an open board) that padding comes straight out of the surface.
//
// For every tab, at every size, the main surface (the tab page's largest
// visible child, and the named surface where a tab has one) is measured with
// the panel shut and again with it open, and any height that moved by more
// than 2px fails. The panel is opened the way the app opens it: the
// `#status-activity` button when a run exists, otherwise the same two DOM
// changes `setAgentMonitorVisible(true)` makes (app.js), since a fresh profile
// has no run to click on.
const { boot } = require('./lib.js');

const SIZES = (process.env.SIZES || '1440x900,1920x1040,390x844')
  .split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { w, h }; });
const TABS = (process.env.TABS || 'dashboard,notes,chat,graph,library,whiteboard,timeline,reminders,documents')
  .split(',');

// A tab's named surface: the thing a person would call "the graph", "the
// board". The generic largest-child measure runs for every tab regardless.
// Where the panel's scroll room is meant to land (07-whiteboard-misc.css).
// Each must gain it, so a "fix" that simply deleted the buffer fails here
// instead of passing the height check.
const SCROLLER = {
  dashboard: '#tab-dashboard',
  reminders: '#tab-reminders',
  notes: '#tab-notes .layout > main',
  library: '#tab-library .library-view-section:not(.hidden)',
  timeline: '#timeline-scroll',
  documents: '#tab-documents .doc-list',
};

const SURFACE = {
  graph: ['#graph-card', '#graph-canvas', '#graph-svg'],
  whiteboard: ['#whiteboard-container', '#wb-canvas-view'],
  timeline: ['#tab-timeline > *:not(.hidden)'],
  chat: ['#chat-main', '#chat-messages'],
  notes: ['#tab-notes .layout > main'],
  library: ['#tab-library .library-view-section:not(.hidden)'],
  documents: ['#tab-documents .doc-layout'],
};

async function openTab(page, tab) {
  if (tab === 'whiteboard') {
    await page.click('#tab-btn-library');
    await page.waitForTimeout(500);
    await page.click('[data-target="library-view-whiteboard"]');
    await page.waitForTimeout(600);
    // Open a board, making one if the profile has none, so the canvas
    // itself is measured and not only the board list.
    await page.evaluate(async () => {
      const list = await apiJson('/whiteboard/boards').catch(() => []);
      const boards = Array.isArray(list) ? list : (list.boards || []);
      let board = boards.find((b) => (b.type || 'board') === 'board');
      if (!board) {
        board = await apiJson('/whiteboard/boards', {
          method: 'POST', body: JSON.stringify({ name: 'activity panel sweep', type: 'board' }),
        });
      }
      await openWhiteboardBoard(board.id);
    });
    await page.waitForTimeout(1200);
    return;
  }
  if (tab === 'documents') {
    await page.evaluate(() => { if (window.switchTab) window.switchTab('documents'); });
    const shown = await page.evaluate(() => !document.getElementById('tab-documents').classList.contains('hidden'));
    if (!shown) {
      await page.click('#tab-btn-library');
      await page.waitForTimeout(400);
      const sub = await page.$('[data-target="library-view-documents"]');
      if (sub) await sub.click();
    }
    await page.waitForTimeout(600);
    return;
  }
  const btn = await page.$(`#tab-btn-${tab}`);
  if (btn && await btn.isVisible()) await btn.click();
  else await page.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), tab);
  // The Library remembers its sub-view, so after the board run it would
  // reopen on the board; its first list view is the one measured here.
  if (tab === 'library') {
    await page.waitForTimeout(300);
    await page.click('[data-target="library-view-documents"]').catch(() => {});
  }
  await page.waitForTimeout(tab === 'graph' ? 1500 : 700);
}

async function setPanel(page, open) {
  await page.evaluate((open) => {
    const m = document.getElementById('agent-monitor');
    const isOpen = !m.classList.contains('hidden');
    if (isOpen === open) return;
    const status = document.getElementById('status-activity');
    if (status && !status.classList.contains('hidden')) { status.click(); return; }
    m.classList.toggle('hidden', !open);
    document.body.classList.toggle('has-agent-monitor', open);
  }, open);
  await page.waitForTimeout(500);
}

async function measure(page, tab) {
  return page.evaluate(({ tab, sels, scroller }) => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width) }; };
    const pageEl = [...document.querySelectorAll('.tab-page')].find((p) => !p.classList.contains('hidden'));
    const out = { page: pageEl ? pageEl.id : null };
    if (pageEl) {
      out.tabPage = r(pageEl);
      let big = null;
      for (const c of pageEl.children) {
        const b = c.getBoundingClientRect();
        if (!b.height || getComputedStyle(c).display === 'none') continue;
        if (!big || b.height * b.width > big.b.height * big.b.width) big = { c, b };
      }
      if (big) out.largest = { sel: big.c.id ? '#' + big.c.id : big.c.className.split(' ')[0], ...r(big.c) };
    }
    for (const s of sels || []) {
      const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0);
      if (el) out[s] = r(el);
    }
    const sc = scroller && document.querySelector(scroller);
    if (sc) out.bufferPx = parseFloat(getComputedStyle(sc).paddingBottom);
    return out;
  }, { tab, sels: SURFACE[tab], scroller: SCROLLER[tab] });
}

(async () => {
  let fails = 0;
  for (const size of SIZES) {
    const phone = size.w < 600;
    const { browser, page } = await boot({
      viewport: { width: size.w, height: size.h },
      ...(phone ? { hasTouch: true, isMobile: true } : {}),
    });
    for (const tab of TABS) {
      await setPanel(page, false);
      try { await openTab(page, tab); } catch (e) { console.log(`${size.w}x${size.h} ${tab}: could not open (${e.message.split('\n')[0]})`); continue; }
      const shut = await measure(page, tab);
      await setPanel(page, true);
      const open = await measure(page, tab);
      await setPanel(page, false);
      const rows = [];
      for (const k of Object.keys(shut)) {
        if (k === 'page' || !open[k] || typeof shut[k] !== 'object') continue;
        const dh = open[k].h - shut[k].h;
        const bad = Math.abs(dh) > 2;
        if (bad) fails++;
        const sel = shut[k].sel ? ' ' + shut[k].sel + (open[k].sel !== shut[k].sel ? '/' + open[k].sel : '') : '';
        rows.push(`${bad ? 'FAIL' : 'ok  '} ${k}${sel} h ${shut[k].h} -> ${open[k].h}`);
      }
      if (open.bufferPx !== undefined) {
        const gained = open.bufferPx - shut.bufferPx;
        const bad = gained < 200;
        if (bad) fails++;
        rows.push(`${bad ? 'FAIL' : 'ok  '} scroll room ${SCROLLER[tab]} +${Math.round(gained)}px`);
      }
      console.log(`${size.w}x${size.h} ${process.env.THEME || 'light'} ${tab} (${shut.page})\n  ` + rows.join('\n  '));
    }
    await browser.close();
  }
  console.log(fails ? `activitypanel: ${fails} failure(s)` : 'activitypanel: every surface kept its height, every scroller got its room');
  process.exit(fails ? 1 : 0);
})();
