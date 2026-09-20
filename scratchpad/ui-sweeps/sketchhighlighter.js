// INBOX 265: "can you fix the highlighter in the quick sketch?? it doesnt act
// as it should and looks messy".
//
// A highlighter is one translucent band. Three things say whether it is:
//
//   1. **Evenness along the stroke.** Painting each segment as its own
//      `stroke()` at 0.35 alpha means consecutive segments overlap at every
//      joint and each overlap composites twice, so the band is a chain of
//      darker lozenges. Sampled down the middle of a straight drag, the
//      alpha should be one number, not a sawtooth.
//   2. **A self-crossing must not darken.** A real marker crossed over its
//      own line is the same colour there. Two passes at 0.35 composite to
//      0.58, which is what "messy" looks like on a scribble.
//   3. **The alpha asked for is the alpha painted**, once. The number is read
//      out of `HIGHLIGHTER_STYLE` rather than written here: WHITEBOARD_PLAN
//      decision 7 gave the pad and the whiteboard one table and moved the pad
//      from 0.35 to the plan's 0.4, so a literal here would fail the day that
//      table is edited, which is exactly when this sweep should still pass.
//
// Its companion is `sketchparity.js`, which asks the other half of decision 7:
// that the pad and the board agree, and that the blend follows the backdrop.
//
// Drives the real canvas through real pointer events and reads the pixels
// back with getImageData.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3500);

  const box = await page.evaluate(() => {
    if (typeof openSketch === 'function') openSketch();
    return null;
  });
  await page.waitForTimeout(1200);
  const canvas = await page.$('#sketch-canvas');
  if (!canvas) { console.log('ERR no sketch canvas'); process.exit(1); }

  const setup = await page.evaluate(() => {
    // A known, opaque background so an alpha reads as a colour mix rather
    // than as transparency over nothing, and the highlighter's own colour
    // set to something unambiguous.
    const c = document.getElementById('sketch-canvas');
    const ctx = c.getContext('2d');
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    if (typeof sketchPen === 'object') { sketchPen.color = '#000000'; sketchPen.size = 4; sketchPen.eraser = false; }
    if (typeof sketchTool !== 'undefined') sketchTool = 'highlighter';
    if (typeof sketchHistory !== 'undefined') sketchHistory.length = 0;
    const r = c.getBoundingClientRect();
    const table = typeof HIGHLIGHTER_STYLE !== 'undefined' ? HIGHLIGHTER_STYLE : null;
    return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), cw: c.width, ch: c.height, alpha: table ? table.alpha : 0.35 };
  });

  // 1 and 3: one straight horizontal drag.
  const y = setup.top + Math.round(setup.h * 0.35);
  await page.mouse.move(setup.left + 60, y);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) await page.mouse.move(setup.left + 60 + i * 12, y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const band = await page.evaluate((s) => {
    const c = document.getElementById('sketch-canvas');
    const ctx = c.getContext('2d');
    const scale = c.width / c.getBoundingClientRect().width;
    const py = Math.round((0.35 * c.getBoundingClientRect().height) * scale);
    const from = Math.round(70 * scale), to = Math.round(330 * scale);
    const row = ctx.getImageData(from, py, to - from, 1).data;
    const inked = [];
    for (let i = 0; i < row.length; i += 4) {
      // White background, black ink: 255 means untouched, lower means more
      // ink. Coverage is how far from white the pixel is.
      inked.push(1 - row[i] / 255);
    }
    const hit = inked.filter((v) => v > 0.05);
    const min = Math.min(...hit), max = Math.max(...hit);
    const mean = hit.reduce((a, b) => a + b, 0) / (hit.length || 1);
    return { samples: hit.length, min: +min.toFixed(3), max: +max.toFixed(3), mean: +mean.toFixed(3), spread: +(max - min).toFixed(3) };
  }, setup);

  // 2: a stroke that crosses itself.
  await page.evaluate(() => {
    const c = document.getElementById('sketch-canvas');
    const ctx = c.getContext('2d');
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    if (typeof sketchHistory !== 'undefined') sketchHistory.length = 0;
  });
  const cx = setup.left + Math.round(setup.w * 0.5);
  const cy = setup.top + Math.round(setup.h * 0.5);
  await page.mouse.move(cx - 90, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 90, cy, { steps: 12 });      // across
  await page.mouse.move(cx, cy - 90, { steps: 12 });      // up and back
  await page.mouse.move(cx, cy + 90, { steps: 12 });      // down through the first line
  await page.mouse.up();
  await page.waitForTimeout(400);

  //: **The junction is found in the ink, not computed from the pointer.**
  //: The canvas is 820x480 inside an 850x498 box here, so a sample placed by
  //: scaling the viewport coordinates landed 15px off the band and read white
  //: at both points, which passes the comparison while measuring nothing.
  //: The densest row is the horizontal arm and the densest column is the
  //: vertical one, and where they meet is the crossing whatever the mapping.
  const cross = await page.evaluate(() => {
    const c = document.getElementById('sketch-canvas');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const ink = (x, y) => 1 - data[(y * c.width + x) * 4] / 255;
    const rows = new Array(c.height).fill(0);
    const cols = new Array(c.width).fill(0);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (ink(x, y) > 0.05) { rows[y]++; cols[x]++; }
      }
    }
    const armY = rows.indexOf(Math.max(...rows));
    const stemX = cols.indexOf(Math.max(...cols));
    //: A point on the same arm, far enough along it to be clear of the stem's
    //: own width and of the turn at either end, **and inside the band rather
    //: than on its edge**. Taking the first inked column took the arm's own
    //: end, where the pixel is partly covered and reads about 0.07 light
    //: whatever the alpha is: that is antialiasing, not a second pass, and it
    //: made this check report a darkening that was not there the first time
    //: the stroke's geometry shifted by a few pixels.
    const inked = [];
    for (let x = 0; x < c.width; x++) if (ink(x, armY) > 0.05) inked.push(x);
    const away = inked.find((x, i) => Math.abs(x - stemX) > 40 && i >= 8 && i < inked.length - 8);
    return {
      crossing: +ink(stemX, armY).toFixed(3),
      plain: away === undefined ? null : +ink(away, armY).toFixed(3),
      at: [stemX, armY, away ?? -1],
    };
  });

  //: **The pen and the eraser, because the highlighter's branches were pulled
  //: out of the paths they shared.** A fix that makes one tool right and
  //: another wrong is not a fix, and the per-segment code the highlighter
  //: left behind is the pen's.
  const pen = await page.evaluate(async () => {
    const c = document.getElementById('sketch-canvas');
    const ctx = c.getContext('2d');
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    sketchHistory.length = 0;
    sketchTool = 'pen'; sketchPen.eraser = false;
    return null;
  });
  const py2 = setup.top + Math.round(setup.h * 0.7);
  await page.mouse.move(setup.left + 60, py2);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(setup.left + 60 + i * 12, py2, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const penInk = await page.evaluate(() => {
    const c = document.getElementById('sketch-canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let best = 0;
    for (let i = 0; i < d.length; i += 4) best = Math.max(best, 1 - d[i] / 255);
    return +best.toFixed(3);
  });

  console.log(`straight stroke: ${band.samples} inked samples, coverage min ${band.min} max ${band.max} mean ${band.mean}, spread ${band.spread} (the table asks for ${setup.alpha})`);
  console.log(`pen:             darkest pixel ${penInk} (an opaque pen on white should be 1)`);
  console.log(`self-crossing:   junction ${cross.crossing} at [${cross.at[0]},${cross.at[1]}] against ${cross.plain} at x=${cross.at[2]} on the same arm`);

  const findings = [];
  // The band must be one value: a joint that composites twice shows up as a
  // spread. 0.03 is well under what a second 0.35 pass would add (~0.23).
  if (band.spread > 0.03) findings.push(`the band is uneven: coverage runs ${band.min} to ${band.max}, a spread of ${band.spread}`);
  if (Math.abs(band.mean - setup.alpha) > 0.04) findings.push(`the band is ${band.mean} where the tool asks for ${setup.alpha}`);
  if (cross.plain === null || cross.crossing < 0.05) findings.push('the self-crossing stroke was not found on the canvas, so nothing was measured');
  else if (cross.crossing - cross.plain > 0.03) findings.push(`crossing its own line darkens the stroke, ${cross.plain} to ${cross.crossing}`);
  if (penInk < 0.98) findings.push(`the plain pen is no longer opaque: darkest pixel ${penInk}`);
  if (errors.length) findings.push(`${errors.length} page error(s): ${errors.slice(0, 2)}`);
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
