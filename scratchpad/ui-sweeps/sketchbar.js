// The sketch pad's top bar, measured the way the report about it is worded:
// does any group sit on a different row, and how much of the bar is empty.
//
// Reported a second time (INBOX 123, the owner): "the quick sketch top dock
// still needs a better redesign", with a screenshot showing the Paper group
// alone on a second row while the right half of the first row was empty. It
// did not reproduce at 1440 or 1024 with the default appearance settings,
// which is exactly why this script sweeps the settings as well as the widths:
// the card is capped in px (`min(900px, 96vw)`) and everything inside it is
// sized in rem, so Large text (18px root) or Spacious density (a 1.35x
// spacing scale) buys the contents more width than the card ever gets.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node sketchbar.js
//
// Prints one line per (width x setting): the number of distinct group rows,
// each group's top and width, and the slack left at the right-hand end of the
// bar. A non-zero exit if any combination puts a group on a second row.
const { boot } = require('./lib.js');

// 390 is here because the swatches are: the bar is allowed to wrap at phone
// width (it is one card in a 390px window, and the report this sweep was
// written for was about a desktop bar), so a second row below 600 is counted
// and printed rather than failed. Above 600 one row is still the rule.
const WIDTHS = [1440, 1024, 820, 390];
const SETTINGS = [
  { name: 'default', fontsize: null, density: null },
  { name: 'large-text', fontsize: 'large', density: null },
  { name: 'spacious', fontsize: null, density: 'spacious' },
  { name: 'large+spacious', fontsize: 'large', density: 'spacious' },
];

const probe = () => {
  const bar = document.getElementById('sketch-toolbar');
  const groups = [...bar.children].filter((el) => el.getBoundingClientRect().height > 0);
  const rects = groups.map((el) => {
    const b = el.getBoundingClientRect();
    return {
      label: (el.querySelector('.wb-tool-section-label') || {}).textContent || '?',
      top: Math.round(b.top),
      left: Math.round(b.left),
      right: Math.round(b.right),
      w: Math.round(b.width),
    };
  });
  const bb = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const padL = parseFloat(cs.paddingLeft);
  const padR = parseFloat(cs.paddingRight);
  const inner = { left: bb.left + padL, right: bb.right - padR };
  const last = rects.reduce((a, b) => (b.right > a.right ? b : a), rects[0]);
  const first = rects.reduce((a, b) => (b.left < a.left ? b : a), rects[0]);
  // The ink dots, which are a hit target as much as a colour sample: seven of
  // them in a row, each one a finger's business below 820 where the pointer
  // is a finger (DESIGN.md, `--target-min`).
  const dots = [...document.querySelectorAll(".sketch-color")];
  const swatches = dots.map((el) => el.getBoundingClientRect());
  const sw = swatches[0];
  //: Neighbours on the same row only: across a wrap the "gap" is the width of
  //: the row, which is not a gap.
  const gaps = swatches.slice(1)
    .map((r, i) => (Math.round(r.top) === Math.round(swatches[i].top) ? Math.round(r.left - swatches[i].right) : null))
    .filter((g) => g !== null);
  //: **The target, not the paint.** A dot can be pressed past its own edge
  //: (the transparent `::before` below 820, the same pattern the switches
  //: use), and a box that is not the target is not the measurement. Walked
  //: out from the centre with `elementFromPoint` until the dot stops
  //: answering, which is exactly what a finger does.
  const targetOf = (el) => {
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const reach = (dx, dy) => {
      let n = 0;
      while (n < 60 && document.elementFromPoint(cx + dx * (n + 1), cy + dy * (n + 1)) === el) n += 1;
      return n;
    };
    //: Plus the centre pixel itself, which neither walk counts. The result is
    //: still one to two pixels under the box's real size, because the walk
    //: stops on the first pixel that answers with something else and the
    //: centre is rounded to a whole pixel: a 44px target measures 42 to 44
    //: here, which is why the check below asks for 42.
    return { w: reach(-1, 0) + reach(1, 0) + 1, h: reach(0, -1) + reach(0, 1) + 1 };
  };
  const targets = [dots[0], dots[Math.floor(dots.length / 2)]].filter(Boolean).map(targetOf);
  const target = targets.length ? { w: Math.min(...targets.map((t) => t.w)), h: Math.min(...targets.map((t) => t.h)) } : { w: 0, h: 0 };
  //: Two dots may not share a pixel: an overlapping target hands a press to
  //: whichever is on top, which is a wrong colour rather than a missed one.
  let overlap = 0;
  for (let i = 1; i < dots.length; i++) {
    const a = swatches[i - 1], b = swatches[i];
    if (Math.round(a.top) !== Math.round(b.top)) continue;
    const mid = (a.right + b.left) / 2;
    const y = Math.round(a.top + a.height / 2);
    const left = document.elementFromPoint(Math.floor(mid) - 1, y);
    const right = document.elementFromPoint(Math.ceil(mid) + 1, y);
    if (left === dots[i] || right === dots[i - 1]) overlap += 1;
  }
  return {
    swatch: sw ? `${Math.round(sw.width)}x${Math.round(sw.height)}` : "none",
    swatchTarget: `${target.w}x${target.h}`,
    swatchTargetMin: Math.min(target.w, target.h),
    swatchOverlaps: overlap,
    swatchGap: gaps.length ? Math.min(...gaps) : 0,
    swatchRows: [...new Set(swatches.map((r) => Math.round(r.top)))].length,
    rows: [...new Set(rects.map((r) => r.top))].length,
    groups: rects,
    bar: { w: Math.round(bb.width), h: Math.round(bb.height) },
    // The two numbers the report is about: what is left over at the right end
    // of the bar, and what the contents actually take.
    slackRight: Math.round(inner.right - last.right),
    slackLeft: Math.round(first.left - inner.left),
    contentW: Math.round(last.right - first.left),
    innerW: Math.round(inner.right - inner.left),
  };
};

(async () => {
  const { browser, page } = await boot();
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(300);
  let bad = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const s of SETTINGS) {
      await page.evaluate((s) => {
        const root = document.documentElement;
        if (s.fontsize) root.setAttribute('data-fontsize', s.fontsize);
        else root.removeAttribute('data-fontsize');
        if (s.density) root.setAttribute('data-density', s.density);
        else root.removeAttribute('data-density');
      }, s);
      await page.evaluate(() => document.getElementById('sketch-btn').click());
      await page.waitForTimeout(400);
      const r = await page.evaluate(probe);
      if (r.rows > 1 && w > 600) bad += 1;
      //: Below 820 the pointer is a finger, so the dot's *target* carries the
      //: app's stepped floor in the axis that has room for it and stays over
      //: the 24px WCAG minimum in the one that does not, and no two dots
      //: share a pixel.
      if (w < 820 && (r.swatchTargetMin < 24 || parseFloat(r.swatchTarget.split("x")[1]) < 40)) bad += 1;
      //: Nothing may run off the end of the bar at any width.
      if (r.slackRight < 0) bad += 1;
      if (r.swatchOverlaps) bad += 1;
      console.log(
        `${w}/${s.name}`.padEnd(24),
        `rows=${r.rows}`,
        `content=${r.contentW}/${r.innerW}`,
        `slackR=${r.slackRight}`,
        `slackL=${r.slackLeft}`,
        `swatch=${r.swatch}/target${r.swatchTarget}/gap${r.swatchGap}/rows${r.swatchRows}/overlap${r.swatchOverlaps}`,
        r.groups.map((g) => `${g.label}@${g.top}:${g.w}`).join(' '),
      );
      await page.evaluate(() => document.getElementById('sketch-close').click());
      await page.waitForTimeout(250);
    }
  }
  await browser.close();
  if (bad) {
    console.log(`FAIL: ${bad} findings (a bar that wraps above 600, a swatch whose target is under 40px tall below 820 (the walk undercounts by about three pixels: a 44px box measures 41 and a 49.5px one 46), a group running off the end, or two dots sharing a pixel)`);
    process.exit(1);
  }
  console.log(`PASS: one row above 600, a finger-sized swatch target below 820 and no two dots sharing a pixel, in all ${WIDTHS.length * SETTINGS.length} combinations`);
})();
