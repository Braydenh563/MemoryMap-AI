// The '?' on a settings fold's head (INBOX 433): where the head and its
// help button sit, per fold, so moving the button out of the <summary>
// (axe nested-interactive, WCAG 4.1.2) can be checked against the place it
// had. Every position is relative to the fold's own box, so a before and an
// after compare directly. WIDTHS=1440,390 by default; 390 runs with touch.
// Also says whether the button is the topmost thing at its own centre, and
// whether pressing it opens a closed fold and its popover without toggling
// an open one.
const { boot } = require('./lib.js');
// [section, the help panel's id]: the fold is the panel's own <details>.
const FOLDS = [
  ['appearance', 'themes-help'],
  ['appearance', 'statusbar-help'],
  ['appearance', 'custom-css-help'],
  ['models', 'sampling-help'],
  ['skills', 'skill-tools-help'],
  ['skills', 'skill-verify-help'],
  ['shortcuts', 'always-available-help'],
  ['extras', 'packages-help'],
  ['extras', 'embedding-models-help'],
];
(async () => {
  for (const width of (process.env.WIDTHS || '1440,390').split(',').map(Number)) {
    const opts = { viewport: { width, height: 900 } };
    if (width < 600) { opts.hasTouch = true; opts.isMobile = true; }
    const { browser, page } = await boot(opts);
    await page.evaluate(() => openSettingsModal());
    await page.waitForTimeout(700);
    for (const [section, panelId] of FOLDS) {
      await page.evaluate((s) => openSettingsModal(s), section);
      await page.waitForTimeout(400);
      const r = await page.evaluate(async (id) => {
        const panel = document.getElementById(id);
        if (!panel) return 'missing';
        const fold = panel.closest('details');
        // Open every fold around this one, so it is drawn at all.
        for (let d = fold.parentElement?.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
        const wasOpen = fold.open;
        const help = document.querySelector(`[data-help-for="${id}"]`);
        help.scrollIntoView({ block: 'center' });
        await new Promise((res) => setTimeout(res, 150));
        const box = (el) => {
          const b = el.getBoundingClientRect();
          return [b.left, b.top, b.width, b.height];
        };
        const fb = box(fold);
        const rel = (b) => b.map((v, i) => Math.round((i < 2 ? v - fb[i] : v) * 10) / 10);
        const sum = fold.querySelector(':scope > summary');
        const hb = help.getBoundingClientRect();
        const at = document.elementFromPoint(hb.left + hb.width / 2, hb.top + hb.height / 2);
        const out = {
          open: wasOpen,
          fold: [Math.round(fb[2] * 10) / 10, Math.round(fb[3] * 10) / 10],
          summary: rel(box(sum)),
          help: rel(box(help)),
          rightGap: Math.round((fb[0] + fb[2] - hb.right) * 10) / 10,
          helpOnTop: help.contains(at),
          inSummary: sum.contains(help),
        };
        // Pressing it: the popover opens, and the fold is open after.
        help.click();
        await new Promise((res) => setTimeout(res, 100));
        out.popover = !panel.classList.contains('hidden');
        out.openAfter = fold.open;
        help.click();
        fold.open = wasOpen;
        return out;
      }, panelId);
      console.log(width, panelId, JSON.stringify(r));
    }
    await browser.close();
  }
})();
