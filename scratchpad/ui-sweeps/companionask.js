// The corner companion never sits over the Ask answer's words (INBOX 812: it
// was drawn over the "You asked:" line). Seeds a few notes, asks, waits for the
// answer, lets the companion settle, then intersects its drawn box with every
// text line box in the Ask columns (the question echo, the answer, the matching
// records). Exits 1 on any overlap.
//   BASE=http://127.0.0.1:8868 VW=1280 node scratchpad/ui-sweeps/companionask.js
const { boot } = require('./lib.js');
const VW = Number(process.env.VW || 1280);
const VH = Number(process.env.VH || 800);
(async () => {
  const { browser, page } = await boot({ viewport: { width: VW, height: VH } });
  await page.evaluate(async () => {
    for (const t of ['SQLite stays as the one file per notebook, decided at the kickoff.', 'Priya drafts the data model by Friday for the first release.', 'The model runs locally or not at all, no accounts.']) {
      await api('/entries', { method: 'POST', body: JSON.stringify({ content: t }) }).catch(() => {});
    }
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  await page.click('[role=tab][data-section="ask"]');
  await page.waitForTimeout(1500);
  // A notebook with history: hundreds of text nodes sit in the closed history
  // list ahead of the answer, which is what used to spend the finder's cap.
  await page.evaluate((n) => {
    const ul = document.getElementById('ask-history-list');
    for (let i = 0; i < n; i += 1) { const li = document.createElement('li'); li.textContent = `An earlier question number ${i}`; ul.append(li); }
  }, Number(process.env.HIDDEN || 450));
  await page.fill('#question', 'What did we decide about SQLite?');
  await page.click('#ask-btn');
  const measure = () => page.evaluate(() => {
    const buddy = document.getElementById('nm-buddy');
    const fig = buddy && (buddy.querySelector('.nm-figure') || buddy.querySelector('.nm-buddy-face') || buddy);
    const me = fig ? fig.getBoundingClientRect() : null;
    const hit = [];
    let lines = 0;
    for (const sel of ['#asked-question', '#ai-answer', '#ask-answer-foot', '#raw-results', '.answer-head', '#ask-trail', '#ask-chart']) {
      const root = document.querySelector(sel);
      if (!root || root.offsetParent === null) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent.trim()) continue;
        range.selectNodeContents(n);
        for (const q of range.getClientRects()) {
          if (!q.width || !q.height) continue;
          lines += 1;
          if (me && q.left < me.right && q.right > me.left && q.top < me.bottom && q.bottom > me.top) hit.push({ sel, text: n.textContent.trim().slice(0, 30), w: Math.round(Math.min(q.right, me.right) - Math.max(q.left, me.left)), h: Math.round(Math.min(q.bottom, me.bottom) - Math.max(q.top, me.top)) });
        }
      }
    }
    return { me: me && { x: Math.round(me.x), y: Math.round(me.y), w: Math.round(me.width), h: Math.round(me.height) }, asked: document.getElementById('asked-question')?.textContent.slice(0, 40), lines, hit };
  });
  // Sampled over the answer's arrival and settling, not once: the finder runs
  // when the layout moves, and a single late sample can miss the frame.
  let r = null; const bad = [];
  for (let i = 0; i < 16; i += 1) {
    await page.waitForTimeout(i < 4 ? 400 : 1000);
    r = await measure();
    if (r.hit.length) bad.push({ at: i, ...r });
  }
  console.log(VW, JSON.stringify(bad.length ? bad[0] : r), 'samples over words:', bad.length);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/companionask-${VW}.png` });
  await browser.close();
  process.exit(bad.length || !r.me ? 1 : 0);
})();
