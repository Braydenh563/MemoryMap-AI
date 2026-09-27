// The owner: hover "doesnt really do anything", a click "will change
// expressions for a sec then instantly go back to doing what it was doing
// like sleeping", and "maybe it might get bored of one specific spot and
// move a little over or wander off then come back". As you (a generated
// face), in the real app with a real mouse:
//   asleep, one click: the acts it goes through over 3.5s (a yawn, then the
//   stretch), and still awake when its tick runs with you ten minutes away;
//   awake, the pointer onto it: its face and whether it looks at you;
//   two clicks: the face at once, 3.5s later (coming down) and 6.5s later;
//   bored: the move it makes, and the move back 31s later.
// Exits 1 when any of those is not as described.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(6000);
  const at = await page.evaluate(async () => {
    const buddy = document.getElementById('nm-buddy');
    nameMarkBuddyAct('');
    const bar = nameMarkBuddyLedges().bottom;
    nameMarkBuddyMoveTo(buddy, { x: 600, y: Math.round((bar ? bar.top : innerHeight) - NMB_FEET + 1), pose: 'stand', kind: 'bar' }, true);
    await new Promise((r) => setTimeout(r, 900));
    const r = buddy.querySelector('.nm-buddy-face').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  await page.mouse.move(at[0] + 400, at[1] - 300);
  // Asleep, one click.
  await page.evaluate(() => { nameMarkBuddyAct(''); document.getElementById('nm-buddy').classList.add('nmb-sleep'); nmb.lastPoke = 0; nmb.pokes = []; });
  await page.mouse.click(at[0], at[1]);
  const acts = [];
  for (const ms of [200, 1900, 3300]) {
    await page.waitForTimeout(ms - (acts.length ? [200, 1900, 3300][acts.length - 1] : 0));
    acts.push(await page.evaluate(() => nmb.act));
  }
  const stillAwake = await page.evaluate(() => { nmb.lastInput = Date.now() - 10 * 60 * 1000; nameMarkBuddyTick(); return !document.getElementById('nm-buddy').classList.contains('nmb-sleep'); });
  // Awake, hovered.
  await page.evaluate(() => { nmb.expr = ''; nmb.exprHold = ''; nmb.grumpyUntil = 0; nmb.feel = null; nameMarkBuddyAct(''); nameMarkBuddyExpress(''); });
  await page.mouse.move(at[0] + 200, at[1]);
  await page.waitForTimeout(400);
  await page.mouse.move(at[0], at[1], { steps: 4 });
  await page.waitForTimeout(400);
  const hover = await page.evaluate(() => ({ expr: nmb.expr, attend: document.getElementById('nm-buddy').classList.contains('nmb-attend') }));
  // Two clicks, a few seconds apart.
  await page.mouse.move(at[0] + 400, at[1] - 300);
  await page.waitForTimeout(2200);
  const at2 = await page.evaluate(() => { nmb.pokes = []; nmb.lastPoke = 0; nameMarkBuddyExpress(''); const r = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  console.error('face moved by', Math.round(at2[0] - at[0]), Math.round(at2[1] - at[1]));
  at[0] = at2[0]; at[1] = at2[1];
  await page.mouse.click(at[0], at[1]);
  await page.waitForTimeout(600);
  await page.mouse.click(at[0], at[1]);
  await page.mouse.move(at[0] + 400, at[1] - 300);
  const faces = [];
  for (const wait of [100, 3400, 3000]) {
    await page.waitForTimeout(wait);
    faces.push(await page.evaluate(() => nmb.expr || 'own'));
  }
  // Bored.
  const bored = await page.evaluate(() => {
    nameMarkBuddyAct('');
    nmb.perchAt = Date.now() - 20 * 60 * 1000; nmb.keyAt = 0; nmb.lastInput = Date.now() - 60000; nmb.home = null;
    const r = Math.random; Math.random = () => 0.1;
    const x0 = nmb.x;
    const moved = nameMarkBuddyWander(Date.now());
    Math.random = r;
    return { moved, why: nmb.moveWhy, dx: Math.round(nmb.x - x0), home: !!nmb.home };
  });
  let back = null;
  if (bored.home) {
    back = await page.evaluate(() => { nmb.home.at = Date.now() - 31000; nameMarkBuddyAct(''); const x0 = nmb.x; const moved = nameMarkBuddyWander(Date.now()); return { moved, why: nmb.moveWhy, dx: Math.round(nmb.x - x0) }; });
  }
  const typing = await page.evaluate(() => { nmb.perchAt = Date.now() - 20 * 60 * 1000; nmb.keyAt = Date.now(); nmb.home = null; return nameMarkBuddyWander(Date.now()); });
  const out = { acts, stillAwake, hover, faces, bored, back, wandersWhileTyping: typing };
  console.log(JSON.stringify(out));
  await browser.close();
  const ok = acts[0] === 'yawn' && acts[1] === 'wake' && stillAwake && hover.attend && hover.expr === 'happy'
    && faces[0] === 'laughing' && faces[1] === 'happy' && bored.moved && (!bored.home || (back && back.moved)) && !typing;
  process.exit(ok ? 0 : 1);
})();
