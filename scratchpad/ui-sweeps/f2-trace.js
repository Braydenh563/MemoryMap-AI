// The style-invalidation hunt (INBOX 400 (1)), one trace per interaction.
//
// The whiteboard's pan glitch was a style recalculation of the whole board
// on a press, found only by a trace (MINDMAP_PLAN 13a-view, in HISTORY.md).
// This runs the same measurement over every interaction a person makes,
// against a large notebook (f2-seed.js), and prints one row each:
//
//   scene  worst task ms  worst rAF gap ms  style recalcs (worst ms / elements)
//   layout (worst ms / objects)  total style ms
//
//   BASE=http://127.0.0.1:8804 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCENES=tabs,scroll-notes node scratchpad/ui-sweeps/f2-trace.js
//
// INV=1 adds invalidation tracking and prints what caused the worst recalc
// (the changed class, attribute or pseudo, and the recalc reasons). It slows
// the page down, so its timings are not the numbers to report.
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
const H = +(process.env.H || 900);
const INV = !!process.env.INV;
const CATS = [
  'devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'blink',
  ...(INV ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : []),
];

function summarise(json) {
  const ev = json.traceEvents || json;
  const threads = {};
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') threads[`${e.pid}:${e.tid}`] = e.args.name;
  const main = (e) => threads[`${e.pid}:${e.tid}`] === 'CrRendererMain';
  let worstTask = 0, styleTotal = 0, styleN = 0, worstStyle = { dur: 0, n: 0 }, worstLayout = { dur: 0, n: 0 };
  let styleEls = 0;
  for (const e of ev) {
    if (e.ph !== 'X' || !e.dur || !main(e)) continue;
    const d = e.dur / 1000;
    if (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') worstTask = Math.max(worstTask, d);
    if (e.name === 'UpdateLayoutTree') {
      styleTotal += d; styleN++;
      const n = (e.args && (e.args.elementCount ?? (e.args.endData && e.args.endData.elementCount))) || 0;
      styleEls += n;
      if (d > worstStyle.dur) worstStyle = { dur: d, n, ts: e.ts };
    }
    if (e.name === 'Layout') {
      const bd = (e.args && e.args.beginData) || {};
      if (d > worstLayout.dur) worstLayout = { dur: d, n: bd.dirtyObjects || 0, total: bd.totalObjects || 0 };
    }
  }
  // What the worst task was made of: every main-thread event inside it, by
  // name, and the scripts it ran by function and line (self time is not
  // separated, so nested names overlap; read it as "where", not "sum").
  let wt = null;
  for (const e of ev) {
    if (e.ph === 'X' && main(e) && (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && (!wt || e.dur > wt.dur)) wt = e;
  }
  const inside = {};
  if (wt) {
    for (const e of ev) {
      if (e.ph !== 'X' || !main(e) || e === wt || e.ts < wt.ts || e.ts > wt.ts + wt.dur || e.dur < 1000) continue;
      const d = (e.args && e.args.data) || {};
      const k = e.name === 'FunctionCall' ? `fn ${d.functionName || '(anon)'}@${String(d.url || '').split('/').pop().split('?')[0]}:${d.lineNumber}`
        : e.name === 'EventDispatch' ? `event ${d.type}` : e.name === 'TimerFire' ? 'TimerFire' : e.name;
      if (/^(RunTask|ThreadControllerImpl|v8\.|V8\.|CpuProfiler|ParseHTML|v8)/.test(k) && e.name !== 'FunctionCall') continue;
      inside[k] = (inside[k] || 0) + e.dur / 1000;
    }
  }
  const worstParts = Object.entries(inside).sort((a, b) => b[1] - a[1]).slice(0, +(process.env.PARTS || 6)).map(([k, v]) => `${k} ${v.toFixed(1)}`);
  const inv = {};
  if (INV) {
    for (const e of ev) {
      const d = e.args && e.args.data;
      if (!d) continue;
      let k = null;
      if (e.name === 'ScheduleStyleInvalidationTracking') {
        k = `sched ${d.changedClass ? '.' + d.changedClass : ''}${d.changedAttribute ? '[' + d.changedAttribute + ']' : ''}${d.changedId ? '#' + d.changedId : ''}${d.changedPseudo ? ':' + d.changedPseudo : ''} on ${d.nodeName || ''}`;
      } else if (e.name === 'StyleRecalcInvalidationTracking') {
        k = `recalc ${d.reason}${d.extraData ? ' ' + d.extraData : ''} on ${String(d.nodeName || '').slice(0, 60)}`;
      } else if (e.name === 'StyleInvalidatorInvalidationTracking') {
        k = `invset ${d.reason} ${(d.selectors || []).map((s) => s.selector || JSON.stringify(s)).join('|').slice(0, 120)} on ${String(d.nodeName || '').slice(0, 50)}`;
      }
      if (k) inv[k] = (inv[k] || 0) + 1;
    }
  }
  return {
    worstTask: +worstTask.toFixed(1),
    style: `${styleN}x worst ${worstStyle.dur.toFixed(1)}ms/${worstStyle.n}el total ${styleTotal.toFixed(1)}ms/${styleEls}el`,
    layout: `worst ${worstLayout.dur.toFixed(1)}ms ${worstLayout.n}/${worstLayout.total}`,
    parts: worstParts,
    inv: Object.entries(inv).sort((a, b) => b[1] - a[1]).slice(0, +(process.env.TOPN || 12)),
  };
}

const wait = (p, ms) => p.waitForTimeout(ms);
async function go(page, name) { await page.evaluate((t) => switchTab(t), name); await wait(page, 1800); }
async function tab(page, name) {
  await page.evaluate((t) => switchTab(t), name);
  await wait(page, 1800);
  // Every scroller back to the top, so a repeated scroll scene scrolls.
  await page.evaluate(() => { for (const el of document.querySelectorAll('*')) if (el.scrollTop) el.scrollTop = 0; });
  await wait(page, 300);
}
// The first match that is actually drawn, clicked at its centre: a union
// selector's first match in document order is often a hidden twin.
async function clickVisible(page, sel) {
  const b = await page.evaluate((s) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length && e.checkVisibility());
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 200), y: r.top + Math.min(r.height / 2, 20) };
  }, sel);
  if (!b) throw new Error('nothing visible for ' + sel);
  await page.mouse.click(b.x, b.y);
  await wait(page, 300);
}
async function wheelOver(page, sel, steps = 25) {
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 300) };
  }, sel);
  if (!box) return 'missing ' + sel;
  await page.mouse.move(box.x, box.y);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 160); await wait(page, 40); }
  await wait(page, 400);
}

// Each scene: [setup, action]. Setup is not traced.
const SCENES = {
  'tab-notes': [async (p) => tab(p, 'dashboard'), async (p) => go(p, 'notes')],
  'tab-dashboard': [async (p) => tab(p, 'notes'), async (p) => go(p, 'dashboard')],
  'tab-chat': [async (p) => tab(p, 'notes'), async (p) => go(p, 'chat')],
  'tab-graph': [async (p) => tab(p, 'notes'), async (p) => go(p, 'graph')],
  'tab-library': [async (p) => tab(p, 'notes'), async (p) => go(p, 'library')],
  'tab-timeline': [async (p) => tab(p, 'notes'), async (p) => go(p, 'timeline')],
  'tab-reminders': [async (p) => tab(p, 'notes'), async (p) => go(p, 'reminders')],
  'scroll-notes': [async (p) => tab(p, 'notes'), async (p) => wheelOver(p, '#entry-list')],
  'scroll-library': [async (p) => tab(p, 'library'), async (p) => wheelOver(p, '#library-grid')],
  'scroll-timeline': [async (p) => tab(p, 'timeline'), async (p) => wheelOver(p, '#timeline-scroll')],
  'scroll-chatlist': [async (p) => tab(p, 'chat'), async (p) => wheelOver(p, '#conversation-list')],
  'scroll-chat': [async (p) => {
    await tab(p, 'chat');
    await p.evaluate(() => document.querySelector('#conversation-list li button, #conversation-list li')?.click());
    await wait(p, 1500);
  }, async (p) => wheelOver(p, '#chat-messages, .chat-messages, #chat-log')],
  'hover-notes': [async (p) => tab(p, 'notes'), async (p) => {
    const rows = await p.evaluate(() => [...document.querySelectorAll('#entry-list > li')].slice(0, 8).map((li) => {
      const r = li.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }).filter((r) => r.y > 0 && r.y < innerHeight));
    for (const r of rows) { await p.mouse.move(r.x, r.y, { steps: 4 }); await wait(p, 80); }
  }],
  'hover-library': [async (p) => tab(p, 'library'), async (p) => {
    const rows = await p.evaluate(() => [...document.querySelectorAll('#library-grid > *')].slice(0, 10).map((li) => {
      const r = li.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }).filter((r) => r.y > 0 && r.y < innerHeight));
    for (const r of rows) { await p.mouse.move(r.x, r.y, { steps: 4 }); await wait(p, 80); }
  }],
  'type-capture': [async (p) => { await tab(p, 'notes'); await clickVisible(p, '#notes-subtabs [data-section="capture"]'); await clickVisible(p, '#entry-content, #capture textarea, #capture [contenteditable="true"], #capture .cm-content'); },
    async (p) => { await p.keyboard.type('the quick brown fox jumps over the lazy dog', { delay: 30 }); await wait(p, 400); }],
  'type-chat': [async (p) => { await tab(p, 'chat'); await clickVisible(p, '#chat-input'); },
    async (p) => { await p.keyboard.type('the quick brown fox jumps over the lazy dog', { delay: 30 }); await wait(p, 400); }],
  'type-doc': [async (p) => {
    await tab(p, 'library');
    await p.evaluate(async () => {
      const docs = await apiJson('/documents');
      const list = Array.isArray(docs) ? docs : docs.documents || [];
      await openDocument(list[0].id);
      if (document.getElementById('tab-documents')?.classList.contains('hidden')) switchTab('documents');
    });
    await wait(p, 2500);
    await clickVisible(p, '.cm-content');
    await p.keyboard.press('Control+End');
  }, async (p) => { await p.keyboard.type(' the quick brown fox jumps over the lazy dog', { delay: 30 }); await wait(p, 400); }],
  'open-settings': [async (p) => tab(p, 'notes'), async (p) => { await p.evaluate(() => openSettingsModal('appearance')); await wait(p, 900); }],
  'settings-sections': [async (p) => { await tab(p, 'notes'); await p.evaluate(() => openSettingsModal('appearance')); await wait(p, 900); },
    async (p) => {
      const ids = await p.evaluate(() => [...document.querySelectorAll('#settings-modal [data-section]')].slice(0, 8).map((b) => b.dataset.section));
      for (const s of ids) { await p.evaluate((x) => openSettingsModal(x), s); await wait(p, 250); }
    }],
  'open-palette': [async (p) => tab(p, 'notes'), async (p) => { await p.keyboard.press('Control+k'); await wait(p, 600); await p.keyboard.type('set', { delay: 40 }); await wait(p, 400); }],
  'open-menu': [async (p) => tab(p, 'notes'), async (p) => {
    await clickVisible(p, '#entry-list > li [aria-haspopup="menu"]');
    await wait(p, 500);
    await p.keyboard.press('Escape');
    await wait(p, 300);
  }],
  'theme-switch': [async (p) => tab(p, 'notes'), async (p) => { await p.evaluate(() => applyThemeChoice('dark', false)); await wait(p, 800); await p.evaluate(() => applyThemeChoice('light', false)); await wait(p, 800); }],
  resize: [async (p) => tab(p, 'notes'), async (p) => {
    for (const w of [1300, 1100, 900, 1200, W]) { await p.setViewportSize({ width: w, height: H }); await wait(p, 250); }
  }],
  'graph-pan': [async (p) => { await tab(p, 'graph'); await wait(p, 2500); }, async (p) => {
    const c = await p.evaluate(() => { const r = document.querySelector('#graph-canvas, #tab-graph canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(c.x + 5, c.y + 150); await p.mouse.down();
    for (let i = 0; i < 20; i++) { await p.mouse.move(c.x + 5 + i * 10, c.y + 150 + i * 5); await wait(p, 16); }
    await p.mouse.up(); await wait(p, 300);
  }],
  'graph-zoom': [async (p) => { await tab(p, 'graph'); await wait(p, 2500); }, async (p) => {
    const c = await p.evaluate(() => { const r = document.querySelector('#graph-canvas, #tab-graph canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(c.x, c.y);
    for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, i < 6 ? -120 : 120); await wait(p, 40); }
    await wait(p, 300);
  }],
  'map-pan': [async (p) => {
    await tab(p, 'library');
    await p.evaluate(async () => {
      const boards = await apiJson('/whiteboard/boards');
      const list = Array.isArray(boards) ? boards : boards.boards || [];
      const m = list.find((b) => b.name === 'Perf map');
      await openWhiteboardBoard(m.id);
    });
    await wait(p, 4000);
    await p.keyboard.press('h').catch(() => {});
  }, async (p) => {
    const c = await p.evaluate(() => { const r = document.querySelector('.whiteboard-container').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.keyboard.down('Space');
    await p.mouse.move(c.x, c.y); await p.mouse.down();
    for (let i = 0; i < 20; i++) { await p.mouse.move(c.x + i * 12, c.y + i * 6); await wait(p, 16); }
    await p.mouse.up(); await p.keyboard.up('Space'); await wait(p, 300);
  }],
};

(async () => {
  const want = (process.env.SCENES || Object.keys(SCENES).join(',')).split(',');
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  await wait(page, 1500);
  //: EXP_CSS: a constructed sheet added before any scene, for an A/B of one
  //: rule without editing the app (the CSP refuses an inline <style>).
  if (process.env.EXP_CSS) {
    await page.evaluate((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }, process.env.EXP_CSS);
  }
  //: REPS=n runs each scene n times and prints the median worst task and
  //: worst frame after the runs: this sandbox shares its cores with other
  //: work, and one run of one scene has measured 31 and 115ms on the same
  //: code.
  const REPS = +(process.env.REPS || 1);
  const med = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
  const runs = {};
  for (const name of want.flatMap((n) => Array(REPS).fill(n))) {
    const sc = SCENES[name];
    if (!sc) { console.log(name, 'unknown'); continue; }
    try {
      await page.setViewportSize({ width: W, height: H });
      await page.keyboard.press('Escape');
      await sc[0](page);
      await page.evaluate(() => {
        window.__gaps = []; window.__f2on = true; let last = performance.now();
        const t = (x) => { if (!window.__f2on) return; window.__gaps.push(x - last); last = x; requestAnimationFrame(t); };
        requestAnimationFrame(t);
      });
      await browser.startTracing(page, { categories: CATS });
      const r = await sc[1](page);
      const buf = await browser.stopTracing();
      const gaps = await page.evaluate(() => { window.__f2on = false; return window.__gaps.slice(1); });
      const gap = Math.max(0, ...gaps);
      const janky = gaps.filter((g) => g > 25).length;
      const s = summarise(JSON.parse(buf.toString()));
      (runs[name] = runs[name] || []).push({ task: s.worstTask, raf: gap, style: s.style });
      console.log(`${name.padEnd(18)} task ${String(s.worstTask).padStart(6)}  raf ${gap.toFixed(1).padStart(6)} long ${String(janky).padStart(2)}/${gaps.length}  style ${s.style}  layout ${s.layout}${r ? '  ' + r : ''}`);
      if (process.env.PARTS) console.log('    worst task: ' + s.parts.join(' | '));
      for (const [k, v] of s.inv) console.log(`    ${v}  ${k}`);
    } catch (e) {
      console.log(name, 'ERROR', String(e.message).split('\n')[0]);
      try { await browser.stopTracing(); } catch (_) {}
    }
  }
  if (REPS > 1) {
    console.log('MEDIANS (worst task ms, worst frame ms)');
    for (const [name, rs] of Object.entries(runs)) {
      console.log(`| ${name} | ${med(rs.map((r) => r.task)).toFixed(0)} | ${med(rs.map((r) => r.raf)).toFixed(0)} | ${rs.map((r) => r.task.toFixed(0)).join(', ')} |`);
    }
  }
  await browser.close();
})();
