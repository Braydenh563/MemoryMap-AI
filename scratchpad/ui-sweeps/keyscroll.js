// Scrolling with the keys (INBOX 426 u: "keeps scroll jumping me between
// sections"). A section is chosen with the pointer, as a person does, then
// the reading keys are pressed: ArrowDown, PageDown, Space, ArrowUp. The
// pane must scroll and nothing else may change: not the section, not the
// tab, not where the page was.
//
//   BASE=http://127.0.0.1:8793 node scratchpad/ui-sweeps/keyscroll.js
const { boot } = require('./lib.js');

async function state(page) {
  return page.evaluate(() => {
    const pane = document.querySelector('#settings-modal .modal-content');
    const open = document.getElementById('settings-modal')?.checkVisibility();
    const tab = document.querySelector('#tab-bar button.active')?.dataset.tab;
    const section = document.querySelector('#settings-nav button.active')?.dataset.section;
    // The page's scroller: the pane, or on a tab the largest region of it
    // that has been scrolled (whichever one the keys should be moving).
    let top = 0;
    if (open) top = pane.scrollTop;
    else {
      const page = document.getElementById(`tab-${tab}`);
      for (const el of [page, ...page.querySelectorAll('*')]) top = Math.max(top, el.scrollTop);
    }
    return { open, tab, section, top: Math.round(top), focus: document.activeElement?.id || document.activeElement?.className?.toString().split(' ')[0] || document.activeElement?.tagName };
  });
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  let bad = 0;
  // Settings: the section picked in the nav with the pointer.
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(1200);
  for (const section of ['appearance', 'general']) {
    await page.click(`#settings-nav button[data-section="${section}"]`);
    await page.waitForTimeout(800);
    const s0 = await state(page);
    const trail = [];
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'PageDown', 'Space', 'ArrowUp']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(350);
      const s = await state(page);
      trail.push(`${key}:${s.section}@${s.top}`);
    }
    const s1 = await state(page);
    const wrong = s1.section !== section || s1.top === s0.top;
    if (wrong) bad++;
    console.log(`${wrong ? 'FAIL' : 'ok  '} settings ${section} (focus ${s0.focus}) ${trail.join(' ')}`);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  for (const tab of (process.env.TABS || 'dashboard,notes,library,timeline').split(',')) {
    await page.click(`#tab-bar button[data-tab="${tab}"]`);
    await page.waitForTimeout(1500);
    const s0 = await state(page);
    const trail = [];
    for (const key of ['ArrowDown', 'ArrowDown', 'PageDown', 'Space', 'End', 'ArrowUp', 'Home']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(350);
      const s = await state(page);
      trail.push(`${key}:${s.tab}@${s.top}`);
    }
    const s1 = await state(page);
    const wrong = s1.tab !== tab || (s0.scrollable && !trail.some((x) => !x.endsWith('@0')));
    if (wrong) bad++;
    console.log(`${wrong ? 'FAIL' : 'ok  '} ${tab} (focus ${s0.focus}) ${trail.join(' ')}`);
  }
  console.log(bad ? `${bad} failing` : 'keys scroll');
  await browser.close();
})();
