// INBOX 460: seeds 300 notes, then 250 wheel steps of 40px down and up on
// the Notes scroller, counting steps that move more than 6px off their delta.
//   BASE=http://127.0.0.1:8830 node scratchpad/ui-sweeps/scrolljump.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => {
    const words = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu'.split(' ');
    for (let i = 0; i < 300; i++) {
      const n = 1 + (i * 7) % 9;
      const body = Array.from({ length: n }, (_, k) => `Line ${k} of note ${i}: ` + words.slice(0, 3 + (i + k) % 9).join(' ')).join('\n');
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: (i % 3 ? `# Note ${i}\n\n` : '') + body, defer_filing: true }) });
    }
  });
  await page.evaluate(() => { switchTab('notes'); return loadEntries(); }); await page.waitForTimeout(2500);
  const info = await page.evaluate(() => { const l = document.getElementById('entry-list'); let s = l; while (s && !(s.scrollHeight > s.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement; window.__sc = s || document.scrollingElement; return { scroller: (s && (s.id || s.className)) || 'document', rows: l.children.length }; });
  console.log(JSON.stringify(info));
  await page.mouse.move(800, 500);
  const run = async (dir, steps) => { let jumps = []; for (let i = 0; i < steps; i++) { const a = await page.evaluate(() => window.__sc.scrollTop); await page.mouse.wheel(0, dir * 40); await page.waitForTimeout(30); const b = await page.evaluate(() => window.__sc.scrollTop); const d = b - a; if (Math.abs(d - dir * 40) > 6 && !(dir < 0 && b === 0)) jumps.push(Math.round(d)); } return jumps; };
  const down = await run(1, 250); const up = await run(-1, 250);
  console.log('down: off-by>6px steps', down.length, JSON.stringify(down.slice(0, 15)));
  console.log('up:   off-by>6px steps', up.length, JSON.stringify(up.slice(0, 15)));
  await browser.close();
})();
