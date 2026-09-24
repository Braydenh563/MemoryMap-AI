// The mycelium's life cycle, driven frame by frame rather than waited for
// (a generation takes half a minute): how its first frames look, and that a
// generation hands over by fading its canvas out while the next grows on the
// twin, never by clearing a picture someone can see.
//
//   BASE=http://127.0.0.1:8814 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=/tmp/x THEME=dark node scratchpad/ui-sweeps/bgmycelium.js
//
// Prints the two canvases' opacity through the hand-over and writes
// screenshots of the art alone at a few moments to $SCRATCH/shots.
const { boot, OUT } = require('./lib.js');

(async () => {
  const { browser, ctx, page } = await boot();
  const style = process.env.STYLE || 'mycelium';
  await page.evaluate((s) => {
    localStorage.setItem('bgArt', 'on');
    localStorage.setItem('bg-style', s);
    localStorage.setItem('bg-motion', 'moving');
    localStorage.setItem('bg-intensity', '90');
  }, style);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // A reload may or may not land on the lock screen.
  if (await page.isVisible('#lock-password')) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(3000);
  // The art alone: every other child of <body> hidden.
  await page.evaluate(() => {
    for (const el of document.body.children) if (!el.classList.contains('bg-art-canvas')) el.style.visibility = 'hidden';
  });
  const theme = process.env.THEME || 'light';
  const shot = async (name) => page.screenshot({ path: `${OUT}/${style}-${theme}-${name}.png` });
  // Stop the page's own loop so only these calls draw.
  const drive = (frames) => page.evaluate((k) => {
    // eslint-disable-next-line no-undef
    const inst = bgArtInstance;
    inst.noLoop();
    const read = (id) => { const el = document.getElementById(id); return el ? getComputedStyle(el).opacity : '-'; };
    const log = [];
    for (let i = 0; i < k; i++) {
      inst.draw();
      const a = read('bg-art-canvas'), b = read('bg-art-twin');
      if (a !== '0.9' || b !== '0.9') log.push(`${a}/${b}`);
    }
    return log;
  }, frames);
  await drive(25); await shot('f25');
  await drive(95); await shot('f120');
  await drive(480); await shot('f600');
  // On to the hand-over, twenty frames at a time; once a canvas leaves full
  // strength, half the fade on and a picture, then the rest.
  let log = [];
  for (let i = 0; i < 100 && !log.length; i++) log = await drive(20);
  log = log.concat(await drive(28));
  await shot('midfade');
  log = log.concat(await drive(40));
  console.log(`hand-over: ${log.length} frames with a canvas below full strength: ${log.slice(0, 4).join(' ')} ... ${log.slice(-4).join(' ')}`);
  await shot('after');
  await browser.close();
})();
