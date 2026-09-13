// Chrome and help sweep: the header cluster, the status bar's agent/guide
// slots, the `data-help-for` popover's cap and first painted frame, the same
// popover's stacking inside the command palette, and the theme switch's cost.
// INBOX 202, 203, 205, 206, 207.
const { boot } = require('./lib.js');

//: The first painted rect after a popover opens. `requestAnimationFrame`
//: fires before paint, so the rect read in the SECOND frame is what the
//: first paint actually showed; a popover placed only after that frame is a
//: visible flash wherever it sat.
async function firstFrameRect(page, triggerSel, panelId) {
  return await page.evaluate(async ([sel, id]) => {
    const panel = document.getElementById(id);
    const trigger = document.querySelector(sel);
    if (!panel || !trigger) return { missing: true, sel, id };
    const frames = [];
    let done = false;
    const tick = () => {
      const r = panel.getBoundingClientRect();
      const cs = getComputedStyle(panel);
      frames.push({
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        vis: cs.visibility, hidden: panel.classList.contains('hidden'),
      });
      if (frames.length < 4) requestAnimationFrame(tick); else done = true;
    };
    trigger.click();
    requestAnimationFrame(tick);
    while (!done) await new Promise((r) => setTimeout(r, 16));
    const r = panel.getBoundingClientRect();
    const cx = Math.round(r.x + r.width / 2);
    const cy = Math.round(r.y + r.height / 2);
    const hit = document.elementFromPoint(cx, cy);
    return {
      frames,
      final: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      cap: getComputedStyle(panel).maxHeight,
      scroll: panel.scrollHeight,
      client: panel.clientHeight,
      vh: window.innerHeight,
      z: getComputedStyle(panel).zIndex,
      onTop: hit ? `${hit.tagName.toLowerCase()}#${hit.id || ''}` : 'none',
      inPanel: !!(hit && panel.contains(hit)),
    };
  }, [triggerSel, panelId]);
}

(async () => {
  const { browser, page } = await boot({});

  // --- 207: the header cluster and the status bar ---------------------------
  const chrome = await page.evaluate(() => {
    const cluster = document.querySelector('.header-cluster');
    const vis = (el) => !!el && el.offsetParent !== null;
    return {
      clusterButtons: cluster ? [...cluster.querySelectorAll('button')]
        .filter((b) => b.offsetParent !== null && !b.closest('.notif-panel')).map((b) => b.id) : [],
      headerAgent: vis(document.getElementById('agent-btn')),
      headerGuide: vis(document.getElementById('guide-btn')),
      statusAgent: vis(document.getElementById('status-agent')),
      statusGuide: vis(document.getElementById('status-guide')),
      statusGuideText: document.getElementById('status-guide')?.textContent?.trim() || null,
      headerScroll: document.querySelector('header')?.scrollWidth,
      headerClient: document.querySelector('header')?.clientWidth,
    };
  });
  console.log('207 chrome:', JSON.stringify(chrome));

  // --- 206: the capture box's '?' ------------------------------------------
  await page.click('#tab-bar button[data-tab="capture"]').catch(() => {});
  await page.waitForTimeout(400);
  const capture = await firstFrameRect(page, '#capture-help', 'capture-help-hint');
  console.log('206 capture help:', JSON.stringify(capture));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // --- 205a: the palette's '?' --------------------------------------------
  await page.keyboard.press('Control+Shift+A');
  await page.waitForTimeout(700);
  const paletteOpen = await page.evaluate(() => !document.getElementById('command-palette-overlay').classList.contains('hidden'));
  const palette = await firstFrameRect(page, '[data-help-for="command-palette-help"]', 'command-palette-help');
  console.log('205a palette help:', JSON.stringify({ paletteOpen, ...palette }));

  // --- 205b: the starters -------------------------------------------------
  const starters = await page.evaluate(() => {
    const wrap = document.querySelector('.command-palette-intro');
    const chips = wrap ? [...wrap.querySelectorAll('button')] : [];
    return {
      groups: wrap ? [...wrap.querySelectorAll('h4, .palette-starter-title, strong')].map((h) => h.textContent.trim()) : [],
      count: chips.length,
      sizes: chips.slice(0, 14).map((c) => Math.round(c.getBoundingClientRect().height)),
      icons: chips.filter((c) => c.querySelector('i.ph')).length,
      labels: chips.slice(0, 14).map((c) => c.textContent.trim().slice(0, 28)),
    };
  });
  console.log('205b starters:', JSON.stringify(starters));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // --- 202: the theme switch ----------------------------------------------
  const theme = await page.evaluate(async () => {
    const all = [...document.querySelectorAll('*')];
    const blurred = all.filter((el) => {
      const cs = getComputedStyle(el);
      return cs.backdropFilter && cs.backdropFilter !== 'none';
    }).length;
    const transitionAll = all.filter((el) => {
      const cs = getComputedStyle(el);
      return cs.transitionProperty.split(',').map((s) => s.trim()).includes('all');
    }).length;
    const longTasks = [];
    let observer = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) longTasks.push(Math.round(e.duration));
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) { /* not in every build */ }
    const runs = [];
    for (let i = 0; i < 4; i += 1) {
      const t0 = performance.now();
      document.getElementById('theme-btn').click();
      // Forced reflow + style recalc, so the number includes the work the
      // click schedules rather than just the handler returning.
      document.body.getBoundingClientRect();
      getComputedStyle(document.body).backgroundColor;
      const sync = performance.now() - t0;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      runs.push({ sync: Math.round(sync * 100) / 100, toPaint: Math.round((performance.now() - t0) * 100) / 100 });
      await new Promise((r) => setTimeout(r, 500));
    }
    observer?.disconnect();
    return { blurred, transitionAll, longTasks, runs, elements: all.length };
  });
  console.log('202 theme:', JSON.stringify(theme));

  // --- 203: AI-only controls with no model --------------------------------
  const gated = await page.evaluate(() => {
    const marked = [...document.querySelectorAll('[data-needs-model]')];
    return {
      marked: marked.length,
      disabled: marked.filter((el) => el.disabled || el.getAttribute('aria-disabled') === 'true').length,
      ids: marked.slice(0, 40).map((el) => el.id || String(el.className).split(' ')[0]),
    };
  });
  console.log('203 gated:', JSON.stringify(gated));

  await browser.close();
})();
