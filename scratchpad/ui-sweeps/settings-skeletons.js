// Settings panes: do their lists show skeleton rows while the answer is on its
// way? (INBOX 596, the owner: "some skeleton loaders are missing".) Every
// non-static request is held DELAY ms (800), each pane is opened, and at
// 250 ms every list in it that is empty and has no skeleton is recorded; the
// ones that then draw rows once the answer lands are the blank frames a
// person sees. Before the fix 8 panes showed such lists; the target is 0.
//
//   BASE=http://127.0.0.1:8798 W=1440 PANES=extras,skills node settings-skeletons.js
const { boot } = require('./lib.js');
const DELAY = Number(process.env.DELAY || 800);
const STATIC = /\.(js|css|png|svg|ico|woff2?|webmanifest|gguf|json)(\?|$)|\/vendor\/|\/js\//;
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  let hold = false;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!hold || STATIC.test(url) || route.request().resourceType() === 'document') return route.continue();
    await new Promise((r) => setTimeout(r, DELAY));
    return route.continue().catch(() => {});
  });
  for (const pane of (process.env.PANES || 'models,extras,skills,templates,personas,tools,learned,memory,logs,searchindex,tasks,websearch,data,about,account,privacy').split(',')) {
    await page.evaluate(() => { try { closeSettingsModal(); } catch (e) {} });
    await page.waitForTimeout(300);
    hold = true;
    await page.evaluate((p) => openSettingsModal(p), pane);
    await page.waitForTimeout(250);
    const probe = () => page.evaluate(() => {
      const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const modal = document.getElementById('settings-modal');
      const pane = [...modal.querySelectorAll('section.settings-section')].find((p) => !p.classList.contains('hidden') && vis(p)) || modal;
      const skel = [...pane.querySelectorAll('.skeleton, [aria-busy="true"]')].filter(vis).length;
      const loading = [...pane.querySelectorAll('*')].filter((e) => vis(e) && e.children.length === 0 && /^(Loading|Checking|Reading)\b/i.test(e.textContent.trim())).map((e) => e.textContent.trim().slice(0, 30));
      const emptyLists = [...pane.querySelectorAll('ul, ol, [id$="-list"], [class*="list"]')].filter((e) => vis(e) || e.getBoundingClientRect().height === 0).filter((e) => e.children.length === 0 && !e.textContent.trim()).map((e) => '#' + e.id + '.' + String(e.className).slice(0, 30));
      return { pane: (pane.id || pane.dataset.pane || pane.className).toString().slice(0, 30), h: Math.round(pane.getBoundingClientRect().height), chars: pane.innerText.trim().length, skel, loading, emptyLists, head: pane.innerText.trim().slice(0, 70).replace(/\s+/g, ' ') };
    });
    const r = await probe();
    await page.waitForTimeout(2800);
    hold = false;
    const later = await page.evaluate(() => {
      const modal = document.getElementById('settings-modal');
      const pane = [...modal.querySelectorAll('section.settings-section')].find((p) => !p.classList.contains('hidden')) || modal;
      return [...pane.querySelectorAll('ul, ol, [id$="-list"], [class*="list"]')].filter((e) => e.children.length > 0 && !e.querySelector('.skeleton')).map((e) => '#' + e.id + '.' + String(e.className).slice(0, 30));
    });
    // Lists that were empty with no skeleton while the answer was held, and
    // drew rows once it came: the blank frames the owner sees.
    const blank = r.emptyLists.filter((l) => later.includes(l));
    console.log(pane.padEnd(12), `blank-then-filled: ${blank.length ? blank.join(' ') : '-'}  | skeletons ${r.skel}  | words ${r.loading.join(',') || '-'}`);
  }
  await browser.close();
})();
