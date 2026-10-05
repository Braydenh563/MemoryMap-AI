// INBOX 540: the blink, frame by frame at 6x, in the companion figure
// (`atlasBlink`, the lids layer) for a few moods and states, and in the full
// drawing (the large marks' `atl-lid-blink`). One strip per case in
// $SCRATCH/shots/atlasblink-<look>-<case>.png.
//   LOOK=feminine CASES=calm,happy,surprised,sad,drowsy,full node atlasmo1005-blinkshots.js
const { boot } = require('./lib.js');
const fs = require('fs');
const CASES = (process.env.CASES || 'calm,happy,surprised,sad,drowsy,full').split(',');
const LOOK = process.env.LOOK || 'feminine';
const N = 11;
(async () => {
  const { browser, page, OUT } = await boot({ viewport: { width: 520, height: 700 }, scale: 6 });
  await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'always'; clearTimeout(atlasBlinkTimer); atlasBlinkTick = () => {}; });
  for (const c of CASES) {
    const frames = [];
    for (let f = 0; f < N; f += 1) {
      await page.evaluate(([c, f, look, N]) => {
        localStorage.setItem('atlas-look', look);
        document.getElementById('bl-box')?.remove();
        document.getElementById('nm-buddy')?.remove();
        const box = document.createElement('div'); box.id = 'bl-box';
        Object.assign(box.style, { position: 'fixed', left: '0', top: '0', width: '40px', height: '26px', zIndex: '9999', overflow: 'hidden', background: '#f3f4fa' });
        if (c === 'full') {
          const live = document.createElement('span'); live.className = 'nm-live';
          const svg = atlasDraw(208, 'calm', 'full');
          live.append(svg);
          Object.assign(live.style, { position: 'absolute', left: '-84px', top: '-58px' });
          box.append(live); document.body.append(box);
          for (const a of box.getAnimations({ subtree: true })) a.pause();
          const lid = svg.querySelector('.atl-eye-l .atl-lid');
          const anims = box.getAnimations({ subtree: true }).filter((a) => ['atl-lid-blink', 'atl-liner-blink'].includes(a.animationName));
          const t = 0.355 + (0.045 * f) / (N - 1);
          for (const a of anims) a.currentTime = (a.effect.getTiming().delay || 0) + 9000 * t;
          window.__blk = `full ${t.toFixed(3)} ${anims.length}`;
          void lid;
        } else {
          const holder = document.createElement('div'); holder.id = 'nm-buddy';
          Object.assign(holder.style, { position: 'absolute', left: '-11px', top: '-10px', width: '64px', height: '92px' });
          if (c === 'drowsy') holder.classList.add('nmb-drowsy');
          const mood = c === 'drowsy' ? 'calm' : c;
          const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
          for (const svg of fig.querySelectorAll('svg')) atlasApply(svg, mood);
          holder.append(fig); box.append(holder); document.body.append(box);
          for (const a of box.getAnimations({ subtree: true })) a.pause();
          const opts = c === 'drowsy' ? { close: 380, hold: 520, open: 520 } : {};
          atlasBlink(fig, opts);
          const ms = c === 'drowsy' ? 1420 : 320;
          const anims = box.getAnimations({ subtree: true }).filter((a) => a.id === 'atl-blink');
          for (const a of anims) { a.pause(); a.currentTime = (ms * f) / (N - 1); }
          window.__blk = `${Math.round((ms * f) / (N - 1))}ms ${anims.length}`;
        }
      }, [c, f, LOOK, N]);
      await page.waitForTimeout(100);
      const file = `${OUT}/atlasblink-${c}-${f}.png`;
      await (await page.$('#bl-box')).screenshot({ path: file });
      frames.push([await page.evaluate(() => window.__blk), file]);
    }
    const data = frames.map(([l, f]) => [l, fs.readFileSync(f).toString('base64')]);
    const sheet = await browser.newPage({ viewport: { width: 1600, height: 300 } });
    await sheet.setContent(`<body style="margin:0;font:11px sans-serif;display:flex;gap:4px">${data.map(([l, b]) => `<figure style="margin:0"><img src="data:image/png;base64,${b}" width="140"><figcaption>${l}</figcaption></figure>`).join('')}</body>`);
    await sheet.screenshot({ path: `${OUT}/atlasblink-${LOOK}-${c}.png`, fullPage: true });
    await sheet.close();
    console.log(c, frames.map((x) => x[0]).join(' | '));
  }
  await browser.close();
})();
