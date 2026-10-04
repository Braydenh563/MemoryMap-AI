// Each Settings pane's own description (a p.muted that is a direct child of
// the section): its line count at 1440. Order 6: one line per section.
const { boot } = require('./lib.js');
const SECTIONS = 'general,preferences,appearance,account,privacy,capture,ask,browse,list,outline,models,tools,skills,personas,templates,memory,learned,tasks,writing-room,websearch,searchindex,extras,data,logs,shortcuts,help,about'.split(',');
(async () => {
  const { browser, page } = await boot({ viewport: { width: +(process.env.W || 1440), height: 900 } });
  for (const s of SECTIONS) {
    await page.evaluate((x) => openSettingsModal(x), s);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('#settings-modal .settings-section')].find((x) => !x.classList.contains('hidden') && x.offsetParent);
      if (!sec) return [];
      return [...sec.querySelectorAll(':scope > p.muted, :scope > p:not([class])')].filter((p) => p.offsetParent && p.textContent.trim()).map((p) => {
        const lh = parseFloat(getComputedStyle(p).lineHeight);
        return `${Math.round(p.getBoundingClientRect().height / lh)} lines: ${p.textContent.trim().replace(/\s+/g, ' ').slice(0, 90)}`;
      });
    });
    for (const x of r) console.log(s.padEnd(13), x);
  }
  await browser.close();
})();
