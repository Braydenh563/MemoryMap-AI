// The nine '?' buttons that used to be hand-wired (an `initHelpToggle` pair or
// the Graph's own listeners) are the `data-help-for` recipe now (WORLD_CLASS_PLAN
// A8). For each, at the viewport and theme given: the toggle is visible and at
// least 32px, one press opens a panel whose rect is inside the window, the dock
// (where it has one) keeps one row of controls, Escape closes it, and a second
// press on a reopened one closes it too.
//
//   BASE=http://127.0.0.1:8806 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/helprecipe.js
const { boot } = require('./lib.js');

const lib = (target, kind) => `document.querySelector('#library-subtabs button[data-target="${target}"]${kind ? `[data-media-kind="${kind}"]` : ''}').click()`;
const CASES = [
  { name: 'graph', go: "switchTab('graph')", toggle: '#graph-help-toggle', panel: '#graph-help-panel', dock: 'graph' },
  { name: 'timeline', go: "switchTab('timeline')", toggle: '#timeline-help', panel: '#timeline-intro', dock: 'timeline' },
  { name: 'notes-browse', go: "switchTab('notes'), showNotesSection('browse')", toggle: '#search-help', panel: '#search-help-hint', dock: 'notes' },
  { name: 'notes-capture', go: "switchTab('notes'), showNotesSection('capture')", toggle: '#capture-help', panel: '#capture-help-hint' },
  { name: 'skills', pre: "switchTab('library')", go: `${lib('library-view-skills')}`, toggle: '#skills-help', panel: '#skills-intro', dock: 'library-skills' },
  { name: 'boards', pre: "switchTab('library')", go: `${lib('library-view-whiteboard')}`, toggle: '#wb-boards-help', panel: '#wb-boards-intro', dock: 'library-boards' },
  { name: 'media', pre: "switchTab('library')", go: `${lib('library-view-media', 'images')}`, toggle: '#library-images-help', panel: '#library-images-intro', dock: 'library-media' },
  { name: 'contents', pre: "switchTab('library')", go: `${lib('library-view-contents')}`, toggle: '#contents-help', panel: '#contents-intro', dock: 'library-contents' },
  { name: 'search-relevance', go: "openSettingsModal('searchindex', 'search-relevance-group')", toggle: '#search-relevance-help', panel: '#search-relevance-intro' },
  { name: 'settings-logs', go: "openSettingsModal('logs')", toggle: '#logs-help-toggle', panel: '#logs-help', dock: 'settings-logs' },
];

(async () => {
  let fails = 0;
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { browser, page } = await boot({ viewport });
    for (const c of CASES) {
      if (process.env.ONLY && !process.env.ONLY.split(',').includes(c.name)) continue;
      if (c.pre) {
        await page.evaluate((pre) => eval(pre), c.pre);
        await page.waitForTimeout(700);
      }
      await page.evaluate((go) => eval(go), c.go);
      await page.waitForTimeout(1400);
      await page.evaluate((t) => document.querySelector(t)?.scrollIntoView({ block: 'center' }), c.toggle);
      await page.waitForTimeout(200);
      // A phone's toggle can sit in a folded dock; the sweep presses it where
      // it is, and records when it is not on screen at all.
      const visible = await page.locator(c.toggle).isVisible();
      if (!visible && process.env.DEBUG) console.log(await page.evaluate((t) => { const e = document.querySelector(t); const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height, getComputedStyle(e).visibility, getComputedStyle(e.parentElement).display]; }, c.toggle));
      let result = { visible };
      if (visible) {
        const rows = (dockName) =>
          page.evaluate((dock) => {
            if (!dock) return null;
            const bar = document.querySelector(`[data-dock-name="${dock}"]`);
            if (!bar) return null;
            const tops = new Set(
              [...bar.querySelectorAll('button, summary, input, select')]
                .filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('.help-body, .doc-dock-menu-list, .dock-menu-list, .hidden'))
                .map((e) => Math.round(e.getBoundingClientRect().top / 4)),
            );
            return tops.size;
          }, dockName);
        const rowsBefore = await rows(c.dock);
        await page.locator(c.toggle).click({ timeout: 3000 });
        await page.waitForTimeout(350);
        result = await page.evaluate(({ toggle, panel }) => {
          const t = document.querySelector(toggle).getBoundingClientRect();
          const p = document.querySelector(panel);
          const r = p.getBoundingClientRect();
          const cs = getComputedStyle(p);
          return {
            visible: true,
            toggleH: Math.round(t.height),
            shown: !p.classList.contains('hidden') && r.width > 0,
            popover: p.classList.contains('help-popover'),
            inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
            rect: [r.left, r.top, r.right, r.bottom].map(Math.round),
            bg: cs.backgroundColor,
            expanded: document.querySelector(toggle).getAttribute('aria-expanded'),
          };
        }, c);
        result.rowsBefore = rowsBefore;
        result.rowsOpen = await rows(c.dock);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
        result.escCloses = await page.evaluate((panel) => document.querySelector(panel).classList.contains('hidden'), c.panel);
        // Escape in Settings closes the modal as well (its own handler, not the
        // popover's); reopen it for the press-to-close half.
        if (!(await page.locator(c.toggle).isVisible())) {
          await page.evaluate((go) => eval(go), c.go);
          await page.waitForTimeout(1200);
        }
        await page.locator(c.toggle).click({ timeout: 3000 });
        await page.waitForTimeout(250);
        await page.locator(c.toggle).click({ timeout: 3000 });
        await page.waitForTimeout(250);
        result.toggleCloses = await page.evaluate((panel) => document.querySelector(panel).classList.contains('hidden'), c.panel);
      }
      const oneRow = result.rowsBefore == null || result.rowsOpen === result.rowsBefore;
      const ok = result.visible && result.toggleH >= 32 && result.shown && result.popover && result.inside && result.escCloses && result.toggleCloses && result.expanded === 'true' && oneRow;
      if (!ok) fails += 1;
      console.log(viewport.width, process.env.THEME || 'light', c.name, ok ? 'ok' : 'FAIL', JSON.stringify(result));
      await page.evaluate(() => { try { closeSettingsModal?.(); } catch (e) {} });
    }
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
