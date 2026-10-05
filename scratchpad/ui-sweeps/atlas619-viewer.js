// INBOX 619 (e) (the owner: "in the enlarged preview atlas is still
// hanging, it should be slightly separate from the companion but still have
// the same life"). Each look: the Atlas companion put on a perch in each
// pose (hang, sit, stand), then its large view opened (a double-click on it,
// so it visits). Reads, in the view: its pose, the gap between the figure's
// drawing (the body, head and lower layers' union) and the card's top and
// the stage's sides (px), and over 8s the longest span in which none of its
// head, arms, body and lower body moved 0.75px from where the span began
// ("calm", ms). Then closes the view and reads its pose back on the perch.
// Exits 1 when in the view it hangs or sits on its perch's pose, its
// drawing is under 12px from the card's top, calm runs over 1000ms, or the
// perch's pose is not back after the view closes.
//   BASE=... LOOKS=masculine,feminine THEME=dark VIEW=390 node atlas619-viewer.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.VIEW || 1440);
  const fails = [];
  for (const look of (process.env.LOOKS || 'masculine,feminine').split(',')) {
    for (const perch of (process.env.POSES || 'hang,sit,stand').split(',')) {
      const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 } });
      await page.evaluate((look) => {
        localStorage.setItem('atlas-look', look);
        document.documentElement.dataset.avatarMotion = 'always';
        localStorage.removeItem('nm-buddy-spots');
        const b = document.getElementById('avatar-buddy');
        b.value = 'atlas';
        b.dispatchEvent(new Event('change', { bubbles: true }));
      }, look);
      await page.waitForTimeout(3500);
      await page.evaluate(([perch, width]) => {
        clearTimeout(nmb.timer);
        window.nameMarkBuddyQueuePlace = () => {};
        window.nameMarkBuddyCheck = () => {};
        const buddy = document.getElementById('nm-buddy');
        const x = Math.round(width / 2);
        nameMarkBuddyRide(null, x, 300);
        nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: perch, legs: '', x, y: 300 }, true);
      }, [perch, width]);
      await page.waitForTimeout(1200);
      const before = await page.evaluate(() => document.getElementById('nm-buddy').dataset.pose);
      await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
      await page.waitForTimeout(1500);
      const got = await page.evaluate(async () => {
        const fig = document.querySelector('.nm-viewer .nm-viewer-figure');
        const buddy = fig?.querySelector('#nm-buddy');
        if (!buddy) return { visiting: false };
        const card = document.querySelector('.nm-viewer-card').getBoundingClientRect();
        const stage = document.querySelector('.nm-viewer-stage').getBoundingClientRect();
        const head = document.querySelector('.nm-viewer-head').getBoundingClientRect();
        const drawn = [...buddy.querySelectorAll('.atl-layer-body, .atl-layer-lower, .nm-buddy-head')].map((el) => el.getBoundingClientRect()).filter((r) => r.width);
        const box = { top: Math.min(...drawn.map((r) => r.top)), left: Math.min(...drawn.map((r) => r.left)), right: Math.max(...drawn.map((r) => r.right)), bottom: Math.max(...drawn.map((r) => r.bottom)) };
        const SEL = ['.nm-buddy-head', '.nmb-arm-r:not(.atl-arm-probe)', '.nmb-arm-l:not(.atl-arm-probe)', '.nm-char', '.atl-lw-breathe', '.atl-layer-lower'];
        const pts = () => SEL.map((s) => {
          const el = fig.querySelector(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return r.width || r.height ? [r.left + r.width / 2, r.top + r.height / 2] : null;
        });
        let anchor = pts(); let anchorT = performance.now(); let calm = 0;
        const t0 = performance.now();
        while (performance.now() - t0 < 8000) {
          await new Promise((r) => requestAnimationFrame(r));
          const now = performance.now();
          const p = pts();
          const moved = p.some((q, i) => q && anchor[i] && Math.hypot(q[0] - anchor[i][0], q[1] - anchor[i][1]) >= 0.75);
          if (moved) { anchor = p; anchorT = now; } else calm = Math.max(calm, now - anchorT);
        }
        return {
          visiting: true,
          pose: buddy.dataset.pose,
          gapTop: +(box.top - Math.max(card.top, head.bottom)).toFixed(1),
          gapLeft: +(box.left - stage.left).toFixed(1),
          gapRight: +(stage.right - box.right).toFixed(1),
          gapBottom: +(stage.bottom - box.bottom).toFixed(1),
          calmMs: Math.round(calm),
        };
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => document.getElementById('nm-buddy').dataset.pose);
      console.log(look, width, perch, JSON.stringify({ before, ...got, after }));
      const why = [];
      if (!got.visiting) why.push('did not visit');
      else {
        if (got.pose !== 'float' && got.pose !== 'stand') why.push(`pose ${got.pose} in the view`);
        if (got.gapTop < 12) why.push(`${got.gapTop}px from the card's top`);
        if (got.calmMs > 1000) why.push(`still for ${got.calmMs}ms`);
      }
      if (after !== before) why.push(`back as ${after}, was ${before}`);
      if (why.length) fails.push(`${look} ${perch}: ${why.join(', ')}`);
      await browser.close();
    }
  }
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
