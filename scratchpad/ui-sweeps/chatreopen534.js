// INBOX 534, the reopened-conversation half: a saved long turn (figure,
// thinking, code, table; made by chatscroll534.js) opened from the sidebar
// reaches the bottom, and keeps its bottom once late images have loaded.
//   BASE=http://127.0.0.1:8823 W=1440 H=900 [SLOW_IMG=1] node chatreopen534.js
// SLOW_IMG delays /media/ responses by 1.5s so the picture lands after the pin.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { page, browser } = await boot({ viewport: { width: W, height: H } });
  if (process.env.SLOW_IMG) await page.context().route('**/media/**', async (route) => { await new Promise((r) => setTimeout(r, 1500)); route.continue(); });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  const rows = await page.$$('#conversation-list li');
  console.log('rows', rows.length);
  await page.evaluate(() => {
    const first = document.querySelector('#conversation-list li');
    first.click();
  });
  const sample = () => page.evaluate(() => { const p = document.getElementById('chat-messages'); return { top: Math.round(p.scrollTop), sh: p.scrollHeight, ch: p.clientHeight, d: Math.round(p.scrollHeight - p.scrollTop - p.clientHeight), stuck: p.dataset.stuck, imgs: [...p.querySelectorAll('img')].map((i) => i.complete ? i.naturalHeight : 'pending').join(',') }; });
  const trace = [];
  for (let i = 0; i < 12; i += 1) { await page.waitForTimeout(300); trace.push(await sample()); }
  console.log(JSON.stringify(trace.filter((_, i) => i % 2 === 0)));
  const bb = await (await page.$('#chat-messages')).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  const log = [];
  for (let k = 0; k < 40; k += 1) { await page.mouse.wheel(0, 150); await page.waitForTimeout(40); if (k % 10 === 9) log.push(await sample()); }
  await page.waitForTimeout(800);
  const end = await sample();
  console.log('wheel', JSON.stringify(log), 'END', JSON.stringify(end));
  const ok = end.d <= 1;
  console.log(ok ? 'PASS' : 'FAIL', 'dist', end.d);
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
