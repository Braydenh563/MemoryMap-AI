// Dumps every label a tab shows, so a help claim can be read against it.
//
// The input to scratchpad/ui-sweeps/helpaudit.js's triage, and useful alone:
// for each tab (and each Library sub-tab) it prints the visible words on its
// buttons, tabs, summaries, headings, select options, titles and aria-labels,
// then opens each "more" and "⋯" menu once and prints the menu items too.
//
//   BASE=http://127.0.0.1:8799 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/helpdump.js [tab ...]
const { boot } = require('./lib.js');

const TABS = ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders'];

async function labelsIn(page, rootSel) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel) || document.body;
    const out = new Set();
    const add = (t) => { t = (t || '').replace(/\s+/g, ' ').trim(); if (t && t.length < 90) out.add(t); };
    for (const el of root.querySelectorAll('button, [role=tab], [role=menuitem], summary, h1, h2, h3, h4, label, legend, option, a')) {
      if (el.offsetParent === null && !el.closest('details')) continue;
      add(el.textContent);
      add(el.getAttribute('aria-label'));
      add(el.getAttribute('title'));
    }
    for (const el of root.querySelectorAll('input[placeholder], textarea[placeholder]')) add(el.getAttribute('placeholder'));
    return [...out].sort();
  }, rootSel);
}

(async () => {
  const want = process.argv.slice(2);
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  for (const tab of TABS) {
    if (want.length && !want.includes(tab)) continue;
    await page.evaluate((t) => { location.hash = `#/${t}`; }, tab);
    await page.waitForTimeout(1200);
    const labels = await labelsIn(page, `#tab-${tab}`);
    console.log(`## ${tab}\n  ${labels.join(' | ')}`);
    // Open each kebab/more control once; menus are drawn on press.
    const menus = await page.$$(`#tab-${tab} summary.doc-dock-menu-btn, #tab-${tab} button[aria-haspopup="menu"]`);
    let n = 0;
    for (const m of menus) {
      if (!(await m.isVisible().catch(() => false))) continue;
      const name = ((await m.getAttribute('aria-label')) || (await m.getAttribute('title')) || (await m.textContent()) || '').replace(/\s+/g, ' ').trim();
      await m.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(250);
      const items = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('[role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], details[open] .dock-menu-panel button, details[open] .dock-menu-body button, details[open] label')) {
          if (el.offsetParent === null) continue;
          const t = el.textContent.replace(/\s+/g, ' ').trim();
          if (t && t.length < 90) out.push(t);
        }
        return [...new Set(out)];
      });
      if (items.length) console.log(`  menu "${name}": ${items.join(' | ')}`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(100);
      if (++n > 14) break;
    }
  }
  await browser.close();
})();
