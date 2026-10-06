// INBOX 598, 602 and 596's skeleton part, measured a frame at a time with
// the CPU slowed four times (CDP) and the lazy bundles held back, so a slow
// load is as visible as it was for the owner right after an update.
//
//   598: the first visit to Graph, Library and Documents. Per frame: is the
//        page's placeholder up, is it page-shaped (a dock and a body, four
//        or more skeleton pieces) rather than one box, is the named state
//        ("Opening the graph…") showing, and is anything blank (no
//        placeholder and the page's own content still hidden).
//   596: the dashboard's first load: no widget body says "Loading…"; an
//        empty body is skeleton rows.
//   602: leaving the dashboard and coming back: frames in which the grid is
//        hidden or holds no drawn widget (target 0).
//
//   BASE=http://127.0.0.1:8800 WIDTH=1440 THEME=dark HOLD=1500 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/loading598.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);
const HOLD = Number(process.env.HOLD || 1500);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Hold the lazy bundles back: what a cold cache after an update looks like.
  await page.route(/\/js\/(graph|graph-canvas|documents|documents-code|documents-prose|library|undo-store)\.js/, async (route) => {
    await new Promise((r) => setTimeout(r, HOLD));
    route.continue();
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // --- 596: the dashboard's first load -------------------------------------
  const loadingWords = await page.evaluate(async () => {
    const seen = new Set();
    let skeletonBodies = 0;
    let blank = 0;
    let outlined = 0;
    let off = 0;
    const look = () => {
      // The grid is hidden while it fills: its outline must stand in.
      const grid = document.getElementById('dash-grid');
      const outline = document.querySelector('.dash-grid-skeleton');
      const outlineOn = !!outline && +getComputedStyle(outline).opacity > 0.5 && outline.children.length > 0;
      if (grid.classList.contains('dash-filling')) {
        if (outlineOn) {
          outlined += 1;
          const a = outline.getBoundingClientRect();
          const b = grid.getBoundingClientRect();
          off = Math.max(off, Math.abs(a.left - b.left), Math.abs(a.top - b.top), Math.abs(a.width - b.width));
        }
        else blank += 1;
      }
      for (const body of document.querySelectorAll('#dash-grid .dash-body')) {
        const after = getComputedStyle(body, '::after').content;
        if (/Loading/.test(after) || /^Loading/.test(body.textContent.trim())) seen.add(after);
        const kids = [...body.children];
        if (kids.length && kids.every((k) => k.classList.contains('skeleton') && k.offsetHeight > 20)) skeletonBodies += 1;
      }
    };
    const grid = document.getElementById('dash-grid');
    grid.replaceChildren();
    const run = renderDashboard();
    for (let i = 0; i < 30; i++) {
      look();
      await new Promise((r) => requestAnimationFrame(r));
    }
    await run;
    return { words: [...seen], skeletonBodies, blank, outlined, off: Math.round(off) };
  });
  console.log(JSON.stringify(loadingWords));
  check('596: no dashboard widget says "Loading…" while it loads', loadingWords.words.length === 0, loadingWords.words.join(','));
  check('596: an empty widget shows skeleton rows', loadingWords.skeletonBodies > 0, String(loadingWords.skeletonBodies));
  check('596: the outline stands on the grid\'s own box', loadingWords.off <= 1, `${loadingWords.off}px off`);
  check('596: while the grid fills unseen, its outline shows (no blank frame)', loadingWords.blank === 0 && loadingWords.outlined > 0, `blank ${loadingWords.blank}, outlined ${loadingWords.outlined}`);

  // --- 602: back to the dashboard ------------------------------------------
  await page.evaluate(() => window.dashSettled);
  await page.waitForTimeout(1500);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1200);
  const back = await page.evaluate(async () => {
    const frames = [];
    let on = true;
    const t0 = performance.now();
    const sample = () => {
      if (!on) return;
      const grid = document.getElementById('dash-grid');
      const cs = grid ? getComputedStyle(grid) : null;
      const shown = !!grid && !grid.closest('.hidden') && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
      const drawn = grid ? [...grid.querySelectorAll('.dash-widget .dash-body')].filter((b) => b.childNodes.length && b.offsetHeight > 0).length : 0;
      frames.push({ t: Math.round(performance.now() - t0), shown, drawn });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    switchTab('dashboard');
    await new Promise((r) => setTimeout(r, 2500));
    on = false;
    const at = frames.findIndex((f) => document.getElementById('tab-dashboard') && f.t >= 0);
    const after = frames.slice(at);
    const empty = after.filter((f) => !f.shown || f.drawn === 0);
    await window.dashSettled;
    // The refresh lands: every card holds one body again, none still unseen.
    const cards = [...document.querySelectorAll('#dash-grid .dash-widget:not(.dash-hidden)')];
    const swapped = cards.every((c) => c.querySelectorAll(':scope > .dash-body').length === 1 && !c.querySelector(':scope > .dash-body[style*="visibility"]'));
    return { frames: after.length, empty: empty.length, firstEmptyAt: empty[0]?.t ?? null, lastEmptyAt: empty.length ? empty[empty.length - 1].t : null, cards: cards.length, swapped };
  });
  console.log(JSON.stringify(back));
  check('602: no frame with an empty dashboard on the way back', back.empty === 0, JSON.stringify(back));
  check('602: the refreshed widgets take the old ones\' places', back.cards > 0 && back.swapped, `${back.cards} cards`);

  // --- 598: the first visit to each lazy surface ------------------------------
  const NAMED = { graph: /graph/i, library: /library/i, documents: /documents/i };
  // Library and Documents share one bundle: only the first of them is cold, so
  // TABS=documents runs it on its own.
  for (const tab of (process.env.TABS || 'graph,library').split(',')) {
    const named = NAMED[tab];
    // A picture of the placeholder itself, past the named state's 400ms.
    const shot = new Promise((r) => setTimeout(() => page.screenshot({ path: `${process.env.SCRATCH || '.'}/loading598-${tab}-${WIDTH}-${process.env.THEME || 'light'}-loading.png` }).then(r, r), 900));
    const run = await page.evaluate(async (tab) => {
      const page = document.getElementById(`tab-${tab}`);
      const frames = [];
      let on = true;
      const t0 = performance.now();
      const sample = () => {
        if (!on) return;
        const ph = page.querySelector(':scope > .tab-placeholder:not(.tab-placeholder-leaving)');
        const status = ph?.querySelector('.tab-ph-status');
        const statusOn = !!status && +getComputedStyle(status).opacity > 0.5;
        const pieces = ph ? [...ph.querySelectorAll('[aria-hidden="true"]')].filter((e) => !e.closest('.tab-ph-status')).length : 0;
        const contentHidden = page.classList.contains('tab-loading');
        frames.push({ t: Math.round(performance.now() - t0), ph: !!ph, pieces, statusOn, text: statusOn ? status.textContent.trim() : '', spin: statusOn && !!status.querySelector('.spinner, .ph-spin, [class*="spin"]'), blank: !ph && contentHidden });
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      const going = switchTab(tab);
      await going;
      await new Promise((r) => setTimeout(r, 1500));
      on = false;
      const phFrames = frames.filter((f) => f.ph);
      const statusFrame = frames.find((f) => f.statusOn);
      return {
        frames: frames.length,
        placeholderFrames: phFrames.length,
        placeholderMs: phFrames.length ? phFrames[phFrames.length - 1].t : 0,
        minPieces: phFrames.length ? Math.min(...phFrames.map((f) => f.pieces)) : 0,
        statusAt: statusFrame ? statusFrame.t : null,
        statusText: statusFrame ? statusFrame.text : '',
        spin: !!statusFrame && statusFrame.spin,
        blank: frames.filter((f) => f.blank).length,
      };
    }, tab);
    await shot;
    console.log(tab, JSON.stringify(run));
    check(`598 ${tab}: the placeholder is page-shaped, not one box`, run.placeholderFrames > 0 && run.minPieces >= 4, `pieces ${run.minPieces}, ${run.placeholderFrames} frames, ${run.placeholderMs}ms`);
    check(`598 ${tab}: a slow load names itself and moves`, run.statusAt !== null && run.statusAt >= 350 && named.test(run.statusText) && run.spin, `at ${run.statusAt}ms: ${run.statusText}`);
    check(`598 ${tab}: no blank frame`, run.blank === 0, String(run.blank));
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/loading598-${tab}-${WIDTH}-${process.env.THEME || 'light'}.png` });
  }
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
})();
