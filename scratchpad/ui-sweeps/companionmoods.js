// INBOX 742, the owner: "atlas doesnt seem to change emotions alot if at
// all", and the owner's 2026-10-10 list: "I barely get to see atlas change
// expression". How often the face changes in one scripted session: the
// companion on the dashboard, then a saved note, an error toast, the chat's
// box focused and typed in, the notes tab, a rub, and idle to the end. Polls
// every 100ms: Atlas's mood (`atlasMoodNow`, every Atlas on the page) or the
// generated companion's face (`data-expr`). Prints the changes, the distinct
// faces and the longest stretch with no change.
// Env: KIND (atlas|me), MS (180000), BASE, SCRATCH.
const { boot } = require('./lib.js');
const KIND = process.env.KIND || 'atlas';
const MS = Number(process.env.MS || 180000);
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((k) => {
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true }));
    revealTab('dashboard');
  }, KIND);
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    window.__faces = [];
    const read = () => (typeof atlasMoodNow !== 'undefined' && document.querySelector('#nm-buddy .nm-atlas') ? atlasMoodNow : document.getElementById('nm-buddy')?.dataset.expr || '');
    let last = null;
    const t0 = performance.now();
    window.__facePoll = setInterval(() => {
      const now = read();
      if (now !== last) { window.__faces.push([Math.round(performance.now() - t0), now]); last = now; }
    }, 100);
  });
  const at = (ms, fn) => setTimeout(() => fn().catch(() => {}), ms);
  const steps = [
    [15000, () => page.evaluate(() => apiJson('/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: 'A note from the moods sweep' }) }))],
    [35000, () => page.evaluate(() => toast('Could not reach the server', true))],
    [55000, async () => { await page.evaluate(() => revealTab('chat')); await page.waitForTimeout(800); await page.focus('#chat-input'); await page.keyboard.type('what did I plan', { delay: 60 }); }],
    [80000, () => page.evaluate(() => revealTab('notes'))],
    [100000, async () => {
      const box = await page.evaluate(() => { const r = document.querySelector('#nm-buddy .nm-buddy-face')?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + 20] : null; });
      if (!box) return;
      for (let i = 0; i < 8; i++) { await page.mouse.move(box[0] + (i % 2 ? 12 : -12), box[1], { steps: 3 }); await page.waitForTimeout(60); }
      await page.mouse.move(10, 450);
    }],
  ];
  for (const [ms, fn] of steps) if (ms < MS) at(ms, fn);
  await page.waitForTimeout(MS);
  const faces = await page.evaluate(() => { clearInterval(window.__facePoll); return window.__faces; });
  const changes = Math.max(0, faces.length - 1);
  let still = 0;
  for (let i = 1; i <= faces.length; i++) still = Math.max(still, (i < faces.length ? faces[i][0] : MS) - faces[i - 1][0]);
  console.log(JSON.stringify({ kind: KIND, ms: MS, changes, perMinute: +(changes * 60000 / MS).toFixed(1), distinct: [...new Set(faces.map((f) => f[1]))], longestStillMs: still, trace: faces }));
  await browser.close();
})();
