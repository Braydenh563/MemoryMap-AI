// INBOX 426 x, life: the companion's face changes with what happens and
// comes back, a swap is cheap, and it waves when you come back after a
// long idle. Env: KIND (me), SCRATCH (a shot of its faces). Exits 1 when a
// hello, a saved note, an error, thinking, being away or a drift leaves the
// face unchanged, a face does not come back, a swap to an event face
// (drawn ahead in idle time) takes over 4ms, or coming back does not wave.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((k) => { const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.KIND || 'me');
  await page.evaluate(() => revealTab('notes'));
  await page.waitForTimeout(3500);
  const fails = [];
  const expr = () => page.evaluate(() => document.getElementById('nm-buddy').dataset.expr || '');
  // A hello.
  const face = await page.evaluate(() => { const r = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); return [r.left + 32, r.top + 30]; });
  await page.mouse.click(face[0], face[1]);
  await page.waitForTimeout(200);
  const hello = await expr();
  await page.waitForTimeout(3000);
  const back = await expr();
  if (hello !== 'happy' || back !== '') fails.push(`hello: ${hello} then ${back}`);
  // Cues: a saved note, an error, thinking.
  const cue = async (c, from, wait) => { await page.evaluate(([cc, ff]) => nameMarkBuddyCue(cc, ff), [c, from]); await page.waitForTimeout(wait); return expr(); };
  const cheer = await cue('cheer', '', 1700);
  if (cheer !== 'excited') fails.push(`cheer: ${cheer}`);
  await page.waitForTimeout(2600);
  const err = await cue('startle', 'error', 1700);
  if (err !== 'surprised') fails.push(`error: ${err}`);
  await page.waitForTimeout(1800);
  const think = await cue('think', '', 200);
  const rest = await cue('rest', '', 200);
  if (think !== 'serious' || rest !== '') fails.push(`think: ${think} then ${rest}`);
  // Away: drowsy after three minutes holds a sleepy face; input lifts it,
  // with a wave.
  const away = await page.evaluate(async () => {
    nmb.lastInput = Date.now() - 4 * 60 * 1000;
    nmb.lastAct = '';
    nameMarkBuddyTick();
    const sleepy = document.getElementById('nm-buddy').dataset.expr || '';
    if (nmb.act) nameMarkBuddyAct('');
    nmb.lastInput = Date.now() - 4 * 60 * 1000;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    return { sleepy, act: nmb.act, after: document.getElementById('nm-buddy').dataset.expr || '' };
  });
  if (away.sleepy !== 'sleepy' || away.act !== 'wave' || away.after !== 'happy') fails.push(`away: ${JSON.stringify(away)}`);
  await page.waitForTimeout(2500);
  // A drift at rest, and back.
  const drift = await page.evaluate(async () => {
    nmb.exprHold = '';
    clearTimeout(nmb.exprTimer);
    nmb.exprTimer = 0;
    nameMarkBuddyExpress('');
    nameMarkBuddyDrift();
    return document.getElementById('nm-buddy').dataset.expr || '';
  });
  if (!drift) fails.push('drift: no change');
  // Cost of a swap, uncached and cached.
  // Its event faces were drawn ahead in idle time: a swap to any of them is
  // a cached picture. A face never drawn (dramatic) is reported, not judged.
  const cost = await page.evaluate(() => {
    const t = (e) => { const a = performance.now(); nameMarkBuddyExpress(e, 0); return performance.now() - a; };
    const events = NMB_EXPR_EVENTS.map(t);
    t('');
    const fresh = t('dramatic');
    t('');
    return { events: +Math.max(...events).toFixed(2), fresh: +fresh.toFixed(1) };
  });
  if (cost.events > 4) fails.push(`cost: ${JSON.stringify(cost)}`);
  console.log(JSON.stringify({ hello, back, cheer, err, think, rest, away, drift, cost }));
  if (process.env.SCRATCH) {
    // A strip of its faces, as drawn on the companion.
    const seed = await page.evaluate(() => document.getElementById('nm-buddy').dataset.seed);
    await page.evaluate((sd) => {
      const sheet = document.createElement('div');
      sheet.id = 'expr-sheet';
      Object.assign(sheet.style, { position: 'fixed', left: '0', top: '0', zIndex: '99999', background: '#f7f6f3', display: 'flex', gap: '10px', padding: '14px', font: '12px sans-serif', color: '#222' });
      for (const e of ['', 'happy', 'laughing', 'excited', 'surprised', 'serious', 'sleepy', 'unimpressed', 'calm', 'love']) {
        const cell = document.createElement('div');
        Object.assign(cell.style, { display: 'grid', justifyItems: 'center', gap: '4px' });
        const fig = nameCharacterFigure(sd, e);
        Object.assign(fig.style, { position: 'relative', width: '64px', height: '92px', display: 'block' });
        const l = document.createElement('div');
        l.textContent = e || 'its own';
        cell.append(fig, l);
        sheet.appendChild(cell);
      }
      document.body.appendChild(sheet);
    }, seed);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${process.env.SCRATCH}/companion-expressions.png`, clip: { x: 0, y: 0, width: 760, height: 130 } });
  }
  await browser.close();
  for (const f of fails) console.log(f);
  console.log(fails.length ? 'FAIL' : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
})();
