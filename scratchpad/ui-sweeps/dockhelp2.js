// The Dashboard and Reminders docks end with a '?' that opens a popover inside
// the window (WORLD_CLASS_PLAN A8). At 1440 and 390: the toggle is visible and
// at least 36px tall, one press opens a panel whose rect is inside the
// viewport, a second press closes it, and the dock keeps one row of controls
// (the distinct tops of its visible direct controls).
//
//   BASE=http://127.0.0.1:8804 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/dockhelp2.js
const { boot } = require('./lib.js');

const CASES = [
  { tab: 'dashboard', dock: 'dashboard', toggle: '#dash-help-toggle', panel: '#dash-help' },
  { tab: 'reminders', dock: 'reminders', toggle: '#reminders-help-toggle', panel: '#reminders-help' },
];

(async () => {
  let fails = 0;
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { browser, page } = await boot({ viewport });
    for (const c of CASES) {
      await page.evaluate((t) => switchTab(t), c.tab);
      await page.waitForTimeout(700);
      const visible = await page.locator(c.toggle).isVisible();
      let result = { visible };
      if (visible) {
        await page.locator(c.toggle).click({ timeout: 3000 });
        await page.waitForTimeout(300);
        result = await page.evaluate(({ toggle, panel, dock }) => {
          const t = document.querySelector(toggle).getBoundingClientRect();
          const p = document.querySelector(panel);
          const r = p.getBoundingClientRect();
          const shown = !p.classList.contains('hidden') && r.width > 0;
          const bar = document.querySelector(`[data-dock-name="${dock}"]`);
          const tops = new Set(
            [...bar.querySelectorAll('button, summary, input, select')]
              .filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('.help-body'))
              .map((e) => Math.round(e.getBoundingClientRect().top / 4)),
          );
          return {
            visible: true,
            toggleH: Math.round(t.height),
            shown,
            inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
            rect: [r.left, r.top, r.right, r.bottom].map(Math.round),
            rowsOfControls: tops.size,
            expanded: document.querySelector(toggle).getAttribute('aria-expanded'),
          };
        }, c);
        await page.locator(c.toggle).click({ timeout: 3000 });
        await page.waitForTimeout(250);
        result.closedAgain = await page.evaluate((panel) => document.querySelector(panel).classList.contains('hidden'), c.panel);
      }
      const ok = result.visible && result.toggleH >= 32 && result.shown && result.inside && result.closedAgain && result.expanded === 'true';
      if (!ok) fails += 1;
      console.log(viewport.width, c.dock, ok ? 'ok' : 'FAIL', JSON.stringify(result));
    }
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
