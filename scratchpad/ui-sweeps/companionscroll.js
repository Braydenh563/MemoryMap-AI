// INBOX 426 g/m/n/o: a scroll trace. The companion is put on a note card,
// the notes list is scrolled with the wheel down and back, and every frame
// records the companion's box, its card's box and its opacity.
// Env: TAB (notes), CARD (selector of the panels to perch on), KIND (me,
// atlas), OUT (json path), SHOT (png prefix). Exits 1 when the companion
// leaves its panel by more than 2px, jumps more than 45px in a frame beyond
// what its panel moved, or is ever drawn at less than full opacity.
const fs = require('fs');
const { boot } = require('./lib.js');
const OUT = process.env.OUT || `${process.env.SCRATCH || '.'}/shots/companion-scroll-trace.json`;
const SHOT = process.env.SHOT || '';
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  // Enough notes to scroll.
  const have = await page.evaluate(async () => (await apiJson('/entries?limit=50')).length || 0).catch(() => -1);
  if (have >= 0 && have < 14) {
    await page.evaluate(async (n) => {
      for (let i = 0; i < n; i += 1) {
        await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Scroll probe note ${i}. A line of words so the card has a body to it, and a second sentence for height.` }) });
      }
    }, 16 - have);
  }
  await page.evaluate((k) => { const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.KIND || 'me');
  await page.evaluate(() => localStorage.removeItem('nm-buddy-spots'));
  await page.evaluate((t) => revealTab(t), process.env.TAB || 'notes');
  await page.waitForTimeout(1000);
  await page.evaluate(() => typeof loadEntries === 'function' && loadEntries()).catch(() => {});
  await page.waitForTimeout(2000);
  const setup = await page.evaluate((sel) => {
    const cards = [...document.querySelectorAll(sel)].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 200 && r.top > 250 && r.top < 500; });
    const card = cards[0];
    if (!card) return { error: 'no card', count: document.querySelectorAll('#tab-notes .entry').length };
    card.dataset.probeCard = '1';
    const r = card.getBoundingClientRect();
    const buddy = document.getElementById('nm-buddy');
    // Where a drop just above the card's top edge lands, as if dragged there.
    nameMarkBuddyIndexReset();
    const landed = nameMarkBuddyDrop(Math.round(r.left + 360), Math.round(r.top - 74));
    nameMarkBuddyMoveTo(buddy, landed, true);
    const x = nmb.x;
    const y = nmb.y;
    let s = card.parentElement;
    while (s && !(s.scrollHeight > s.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
    return { x, y, cardTop: r.top, scroller: s ? (s.id || s.className) : 'window', glued: !!nmb.glue, gluedTo: nmb.glue ? nmb.glue.el.className : '', sh: s ? s.scrollHeight : 0, ch: s ? s.clientHeight : 0 };
  }, process.env.CARD || '#tab-notes li');
  console.log('setup', JSON.stringify(setup));
  if (setup.error) { await browser.close(); return; }
  if (SHOT) await page.screenshot({ path: `${SHOT}-0.png`, clip: { x: setup.x - 200, y: Math.max(0, setup.y - 80), width: 460, height: 300 } });
  await page.evaluate(() => {
    window.__moves = [];
    const orig = window.nameMarkBuddyMoveTo;
    window.nameMarkBuddyMoveTo = function (b, spot, instant) {
      window.__moves.push({ t: Math.round(performance.now()), kind: spot.kind, x: spot.x, y: spot.y, pose: spot.pose, instant: !!instant, stack: new Error().stack.split('\n').slice(2, 5).map((l) => l.trim().split(' ')[1]).join('<') });
      return orig.call(this, b, spot, instant);
    };
    window.__trace = [];
    const card = document.querySelector('[data-probe-card]');
    const buddy = document.getElementById('nm-buddy');
    const face = buddy.querySelector('.nm-buddy-face');
    const loop = (t) => {
      const b = face.getBoundingClientRect();
      const el = nmb.glue ? nmb.glue.el : card;
      const c = el.isConnected ? el.getBoundingClientRect() : null;
      const op = Math.min(Number(getComputedStyle(buddy).opacity), Number(getComputedStyle(buddy.querySelector('.nm-buddy-char')).opacity));
      window.__trace.push({ t: Math.round(t), x: b.left, y: b.top, cx: c ? c.left : null, cy: c ? c.top : null, op, pose: buddy.dataset.pose, gid: nmb.glue ? (nmb.glue.el.dataset.gid || (nmb.glue.el.dataset.gid = String(Math.random()).slice(2, 7))) : '', held: !!nmb.glue?.held, anim: !!(nmb.anim && nmb.anim.playState === 'running'), glued: !!nmb.glue, lost: !!nmb.glue?.lost });
      if (!window.__stop) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await page.mouse.move(700, 600);
  for (let i = 0; i < 8; i += 1) { await page.mouse.wheel(0, 40); await page.waitForTimeout(40); }
  await page.waitForTimeout(500);
  if (SHOT) await page.screenshot({ path: `${SHOT}-1.png` });
  for (let i = 0; i < 8; i += 1) { await page.mouse.wheel(0, -40); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);
  // A long scroll that takes the card out of sight.
  for (let i = 0; i < 12; i += 1) { await page.mouse.wheel(0, 120); await page.waitForTimeout(30); }
  await page.waitForTimeout(3500);
  if (SHOT) await page.screenshot({ path: `${SHOT}-2.png` });
  const trace = await page.evaluate(() => { window.__stop = true; return window.__trace; });
  const moves = await page.evaluate(() => window.__moves);
  console.log('moves', JSON.stringify(moves.map((m) => ({ ...m, t: m.t - 0 }))).slice(0, 3000));
  fs.writeFileSync(OUT, JSON.stringify({ setup, trace }));
  // Analysis: a jump is a frame's move beyond what its card moved in the
  // same frame (glued), or any frame's move (not glued); glue error is the
  // companion's offset from its card against the offset it started with,
  // over the frames before its first move of its own.
  const firstMove = moves.length ? moves[0].t : Infinity;
  let maxJump = 0; let jumpAt = 0; let maxGlue = 0; let glueFrames = 0; let minOp = 1; let heldFrames = 0;
  const bases = { [trace[0].gid]: { dx: trace[0].x - trace[0].cx, dy: trace[0].y - trace[0].cy } };
  for (let i = 1; i < trace.length; i += 1) {
    const a = trace[i - 1]; const b = trace[i];
    if (!b.anim && !b.held && b.cy !== null && !bases[b.gid]) bases[b.gid] = { dx: b.x - b.cx, dy: b.y - b.cy };
    const base = bases[b.gid] || { dx: b.x - b.cx, dy: b.y - b.cy };
    const withCard = b.gid === a.gid && b.glued && !b.held && !b.lost && a.glued && !a.held && b.cy !== null && a.cy !== null;
    const riding = b.gid === a.gid && b.glued && a.glued && b.cy !== null && a.cy !== null && (b.held || a.held);
    const j = withCard ? Math.hypot((b.x - a.x) - (b.cx - a.cx), (b.y - a.y) - (b.cy - a.cy))
      : riding ? Math.max(0, Math.hypot(b.x - a.x, b.y - a.y) - Math.hypot(b.cx - a.cx, b.cy - a.cy)) : Math.hypot(b.x - a.x, b.y - a.y);
    if (j > maxJump) { maxJump = j; jumpAt = i; }
    minOp = Math.min(minOp, b.op);
    if (b.held) heldFrames += 1;
    if (withCard && !(b.anim)) {
      maxGlue = Math.max(maxGlue, Math.hypot(b.x - b.cx - base.dx, b.y - b.cy - base.dy));
      glueFrames += 1;
    }
  }
  const summary = { frames: trace.length, maxJumpPx: +maxJump.toFixed(1), jumpFrames: [trace[jumpAt - 1], trace[jumpAt]], glueErrorPx: +maxGlue.toFixed(1), glueFrames, heldFrames, minOpacity: minOp, moves: moves.length, end: trace[trace.length - 1] };
  fs.writeFileSync(OUT, JSON.stringify({ setup, summary, moves, trace }));
  console.log(JSON.stringify(summary));
  await browser.close();
  const bad = summary.glueErrorPx > 2 || summary.maxJumpPx > 45 || summary.minOpacity < 1;
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
})();
