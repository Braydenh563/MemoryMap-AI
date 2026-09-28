// The owner: "also state variations, not the exact same animation or mood
// animation each time". As you: plays wave, hop and nap six times each and
// records, per play, the variant (data-variant), the animations its parts
// run (their names) and their speed (playbackRate). Exits 1 on the same
// variant twice running, or on every play at one speed.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(6000);
  const out = await page.evaluate(async () => {
    const buddy = document.getElementById('nm-buddy');
    const bar = nameMarkBuddyLedges().bottom;
    nameMarkBuddyAct('');
    nameMarkBuddyMoveTo(buddy, { x: 700, y: Math.round((bar ? bar.top : innerHeight) - NMB_FEET + 1), pose: 'stand', kind: 'bar' }, true);
    await new Promise((r) => setTimeout(r, 800));
    const rows = {};
    for (const act of ['wave', 'hop', 'nap']) {
      rows[act] = [];
      for (let i = 0; i < 6; i += 1) {
        nameMarkBuddyAct('');
        await new Promise((r) => requestAnimationFrame(() => r()));
        nameMarkBuddyAct(act, 900);
        await new Promise((r) => setTimeout(r, 120));
        const anims = buddy.getAnimations({ subtree: true }).filter((a) => a.animationName && a.animationName.startsWith('nmb-'));
        rows[act].push({ v: buddy.dataset.variant, names: [...new Set(anims.map((a) => a.animationName))].join('+'), rate: anims[0] ? Math.round(anims[0].playbackRate * 100) / 100 : null });
        await new Promise((r) => setTimeout(r, 900));
      }
    }
    return rows;
  });
  console.log(JSON.stringify(out));
  await browser.close();
  const bad = Object.values(out).some((rows) => rows.some((r, i) => i && r.v === rows[i - 1].v));
  const oneSpeed = new Set(out.wave.map((r) => r.rate)).size < 2;
  process.exit(bad || oneSpeed ? 1 : 0);
})();
