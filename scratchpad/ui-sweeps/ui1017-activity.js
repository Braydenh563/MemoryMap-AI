// BACKLOG "Start of the next PR": the Activity card's Logs button. Opens the
// Activity panel and lists every control in its head with its box, at a width.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-activity.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => openActivity());
  await page.waitForTimeout(800);
  const out = await page.evaluate(() => {
    const panel = document.getElementById('agent-monitor');
    const p = panel.getBoundingClientRect();
    const head = panel.querySelector('.panel-head').getBoundingClientRect();
    const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left - p.left), Math.round(r.top - p.top), Math.round(r.width), Math.round(r.height)]; };
    return {
      panel: [Math.round(p.width), Math.round(p.height)],
      head: [Math.round(head.height)],
      controls: [...panel.querySelectorAll('.panel-head button')].map((b) => [(b.getAttribute('aria-label') || b.textContent).trim().slice(0, 24), ...box(b)]),
      logsWords: [...panel.querySelectorAll('button, a, [role=menuitem]')].filter((b) => /logs?/i.test(b.textContent)).map((b) => [b.textContent.trim().slice(0, 30), b.className.slice(0, 40), ...box(b)]),
    };
  });
  console.log(JSON.stringify(out));
  // The kebab's rows.
  await page.click('#activity-more button');
  await page.waitForTimeout(300);
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) [role=menuitem]')].map((x) => x.textContent.trim()))));
  await browser.close();
})();
