// Every Settings pane: the visible h3/h4 heads under the pane title, their
// size, weight, case and whether they sit inside a .settings-group. The
// recipe (DESIGN.md "A group head in Settings"): --text-lg, 650, ink, a
// divider under it, inside the group.
//   BASE=... node groupheads.js
const { boot } = require('./lib.js');
const SECTIONS = (process.env.SECTIONS || 'general,preferences,appearance,account,privacy,capture,ask,browse,list,outline,models,tools,skills,personas,templates,memory,learned,tasks,writing-room,websearch,searchindex,extras,data,logs,about').split(',');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const dist = {};
  for (const s of SECTIONS) {
    await page.evaluate((x) => openSettingsModal(x), s);
    await page.waitForTimeout(600);
    const heads = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('#settings-modal .settings-section')].find((x) => !x.classList.contains('hidden') && x.offsetParent);
      if (!sec) return [];
      return [...sec.querySelectorAll('h3, h4')].filter((h) => h.offsetParent && h.getBoundingClientRect().width > 0).map((h) => {
        const c = getComputedStyle(h);
        return { t: h.textContent.trim().slice(0, 30), fs: c.fontSize, fw: c.fontWeight, tt: c.textTransform, inGroup: !!h.closest('.settings-group, details.settings-fold'), cls: h.className.split(' ')[0] || '', bb: c.borderBottomWidth };
      });
    });
    for (const h of heads) {
      const k = `${h.fs} ${h.fw} ${h.tt} group=${h.inGroup} bb=${h.bb} ${h.cls}`;
      (dist[k] = dist[k] || []).push(`${s}:${h.t}`);
    }
  }
  for (const [k, v] of Object.entries(dist).sort((a, b) => b[1].length - a[1].length)) console.log(String(v.length).padStart(4), k, '\n       ', v.slice(0, 10).join(' | '));
  await browser.close();
})();
