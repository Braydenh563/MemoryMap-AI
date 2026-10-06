// Computed-value parity for the variant, lean and pose hooks without pixels:
// for each look, mood and variant (0, 1, 2) the arms' transforms, the chin
// hand's opacity and the right arm's opacity; for each pose and variant the
// figure's rotate/translate and the lie-rotated roots'; for each lean side the
// figure's rotate, the head's and pupils' transforms, the tail's and nebula's.
// Prints one JSON line per look to OUT (default stdout) so two servers can be
// diffed: `node companionvariants.js > a.json` (BASE=a) and again for b, then
// `cmp`. Transitions are finished before each read. Env: BASE, OUT, MOODS.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const result = {};
  for (const look of ['masculine', 'feminine']) {
    await page.evaluate((look) => {
      localStorage.setItem('atlas-look', look); localStorage.removeItem('nm-buddy-spots');
      const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true }));
    }, look);
    await page.waitForTimeout(400);
    await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(2500);
    result[look] = await page.evaluate(async () => {
      clearTimeout(nmb.timer);
      window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {}; window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
      window.nameMarkBuddyTempo = () => {}; clearTimeout(nmbTempo.timer); nmbTempo.anims = [];
      const buddy = document.getElementById('nm-buddy');
      nameMarkBuddyRide(null, 500, 420);
      nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x: 500, y: 420 }, true);
      const settle = async () => { await new Promise((r) => requestAnimationFrame(() => r())); for (const a of buddy.getAnimations({ subtree: true })) if (a instanceof CSSTransition) a.finish(); getComputedStyle(buddy).opacity; };
      const cs = (sel, props, all = false) => [...buddy.querySelectorAll(sel)].slice(0, all ? 99 : 1).map((e) => props.map((p) => getComputedStyle(e).getPropertyValue(p)).join('|')).join(' ; ');
      const out = {};
      const moods = (window.MOODS || Object.keys(ATLAS_MOODS));
      for (const mood of moods) {
        setAtlasMood(mood, 0, { quiet: true });
        for (const v of [0, 1, 2]) {
          buddy.dataset.atlasVariant = String(v);
          await settle();
          out[`mood ${mood} v${v}`] = [cs('.nmb-arm-l', ['transform']), cs('.nmb-arm-r', ['transform', 'opacity']), cs('.atl-chin-hand', ['opacity'])].join(' || ');
        }
      }
      setAtlasMood('calm', 0, { quiet: true });
      for (const pose of ['stand', 'sit', 'hang', 'float', 'lean', 'lie-1', 'lie-2', 'lie', 'curl-1', 'curl']) {
        buddy.dataset.pose = pose; buddy.dataset.side = 'left';
        for (const v of [0, 1, 2]) {
          buddy.dataset.atlasVariant = String(v);
          await settle();
          out[`pose ${pose} v${v}`] = [cs('.nm-figure', ['rotate', 'translate']), cs('.atl-layer-neb', ['rotate', 'scale', 'translate']), cs('.atl-layer-back', ['rotate']), cs('.atl-layer-fx-1', ['rotate']), cs('.atl-orbits', ['rotate']), cs('.nmb-arm-l', ['transform']), cs('.atl-pose', ['transform'], true), cs('.atl-tail', ['transform'])].join(' || ');
          const bs = getComputedStyle(buddy, '::before'); const as = getComputedStyle(buddy, '::after');
          out[`pose ${pose} v${v}`] += ` || ${bs.left} ${bs.right} ${bs.opacity} ${as.left} ${as.right}`;
        }
      }
      buddy.dataset.pose = 'stand'; delete buddy.dataset.side; buddy.dataset.atlasVariant = '0';
      for (const lean of ['', 'l', 'r']) {
        if (lean) buddy.dataset.lean = lean; else delete buddy.dataset.lean;
        await settle();
        out[`lean ${lean || '-'}`] = [cs('.nm-figure', ['rotate']), cs('.atl-figure-box', ['rotate']), cs('.atl-head', ['transform'], true), cs('.atl-pupil', ['transform'], true), cs('.atl-layer-tail', ['translate']), cs('.atl-layer-neb', ['rotate']), cs('.atl-layer-lids', ['transform']), cs('.atl-pose', ['transform', 'rotate'], true)].join(' || ');
      }
      delete buddy.dataset.lean;
      for (const tilt of ['-1', '0.6']) {
        buddy.style.setProperty('--nmb-tilt', tilt); if (typeof nameMarkBuddyWay === 'function') nameMarkBuddyWay(buddy, tilt); else buddy.style.setProperty('--nmb-lean', tilt);
        await settle();
        out[`tilt ${tilt}`] = [cs('.nm-buddy-char', ['rotate'])].join('');
      }
      return out;
    });
  }
  const text = JSON.stringify(result, null, 0).replace(/},"/g, '},\n"').replace(/","/g, '",\n"');
  if (process.env.OUT) require('fs').writeFileSync(process.env.OUT, text + '\n'); else console.log(text);
  await browser.close();
})();
