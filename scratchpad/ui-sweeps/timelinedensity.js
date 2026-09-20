// TIMELINE_PLAN section 7's first measurement: "the density scrubber's
// usefulness under 200 notes (it may read as noise and should hide below a
// threshold measured then)".
//
//   bash scratchpad/ui-sweeps/serve.sh 8982 /tmp/mm-tl
//   .venv/bin/python scratchpad/ui-sweeps/seed-timeline-bulk.py /tmp/mm-tl/memorymap.db 2000
//   BASE=http://127.0.0.1:8982 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node scratchpad/ui-sweeps/timelinedensity.js
//
// **What is being measured, and why it is not "does it look busy".** The strip
// draws one bar per slot, `(count / peak) * 34` units deep, and it is useful
// exactly when those depths differ: a strip whose bars are all the same depth
// is a rectangle, and a rectangle says nothing the sticky date headers do not
// say better. So the number here is the spread of the drawn depths, in the
// strip's own units (40 wide, so a unit is about a pixel at its rendered
// width), plus how many of the 120 slots carry anything at all.
//
// The strip is a pure function of the density map, so one seeded notebook
// answers the question at every size: the same slotting the app does is run
// here over subsets of that map. Two shapes, because they are the two real
// notebooks and they disagree:
//
//   newest: the newest K notes, which is a young notebook (a narrow range).
//   spread: K notes sampled across the whole three years, which is an old
//           notebook somebody writes in occasionally (a wide, sparse range).
// It is not in `scripts/gate.sh`'s sweep list, deliberately: it needs the
// 2,000-note fixture above to mean anything, and the gate's own notebook is a
// handful of notes. The rule it measures is asserted live at the end, which is
// the part that would catch a regression.
const { boot } = require('./lib.js');

const SIZES = [25, 48, 75, 100, 150, 200, 300, 500, 800, 1200, 2000];

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  await page.click('[data-tab="timeline"]');
  await page.waitForTimeout(2500);

  const live = await page.evaluate(() => {
    const strip = document.getElementById('timeline-scrubber');
    const path = document.getElementById('timeline-density-path');
    const box = strip.getBoundingClientRect();
    return {
      hidden: strip.classList.contains('hidden'),
      width: Math.round(box.width),
      height: Math.round(box.height),
      days: Object.keys(timelineDensity).length,
      total: Object.values(timelineDensity).reduce((s, n) => s + n, 0),
      threshold: `${TIMELINE_SCRUBBER_MIN_SLOTS} slots, peak ${TIMELINE_SCRUBBER_MIN_PEAK}`,
      slots: TIMELINE_SCRUBBER_SLOTS,
      d: (path.getAttribute('d') || '').length,
    };
  });
  console.log(
    `live: ${live.total} notes over ${live.days} days, strip ${live.hidden ? 'hidden' : 'shown'} ` +
      `at ${live.width}x${live.height}px, path ${live.d} chars, threshold ${live.threshold}, ` +
      `${live.slots} slots`
  );

  const table = await page.evaluate((sizes) => {
    // The app's own slotting, over an arbitrary density map.
    const profile = (map) => {
      const days = Object.keys(map);
      if (!days.length) return null;
      let newest = -Infinity;
      let oldest = Infinity;
      for (const day of days) {
        const at = new Date(`${day}T00:00:00`).getTime();
        if (at > newest) newest = at;
        if (at < oldest) oldest = at;
      }
      const width = Math.max(newest - oldest, 86400000);
      const slots = new Array(TIMELINE_SCRUBBER_SLOTS).fill(0);
      for (const [day, count] of Object.entries(map)) {
        const at = new Date(`${day}T00:00:00`).getTime();
        const fraction = (newest - at) / width;
        const slot = Math.min(
          TIMELINE_SCRUBBER_SLOTS - 1,
          Math.max(0, Math.round(fraction * (TIMELINE_SCRUBBER_SLOTS - 1)))
        );
        slots[slot] += count;
      }
      const peak = Math.max(...slots, 1);
      const depths = slots.map((c) => (c / peak) * 34);
      const mean = depths.reduce((s, d) => s + d, 0) / depths.length;
      const sd = Math.sqrt(
        depths.reduce((s, d) => s + (d - mean) * (d - mean), 0) / depths.length
      );
      const filled = slots.filter((c) => c > 0).length;
      const distinct = new Set(depths.map((d) => Math.round(d))).size;
      // How much of the strip is the flat top of one shape: a slot at the peak
      // or empty carries no gradation, and a strip that is only those two
      // values is a bar code rather than a profile.
      const extremes = depths.filter((d) => d < 0.5 || d > 33.5).length;
      return {
        filled,
        sd: Number(sd.toFixed(1)),
        distinct,
        peak,
        flat: Number((extremes / TIMELINE_SCRUBBER_SLOTS).toFixed(2)),
        days: days.length,
      };
    };

    // Rebuild a density map holding K notes, two ways.
    const byDay = Object.entries(timelineDensity).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    const newestK = (k) => {
      const out = {};
      let left = k;
      for (const [day, count] of byDay) {
        if (left <= 0) break;
        out[day] = Math.min(count, left);
        left -= out[day];
      }
      return out;
    };
    const spreadK = (k) => {
      const total = byDay.reduce((s, [, c]) => s + c, 0);
      const share = k / total;
      const out = {};
      let carried = 0;
      for (const [day, count] of byDay) {
        carried += count * share;
        const take = Math.floor(carried);
        carried -= take;
        if (take > 0) out[day] = take;
      }
      return out;
    };
    return sizes.map((k) => ({
      k,
      newest: profile(newestK(k)),
      spread: profile(spreadK(k)),
    }));
  }, SIZES);

  console.log('');
  console.log('  notes | shape  | days | slots used | peak | depth sd | distinct | flat share');
  for (const row of table) {
    for (const shape of ['newest', 'spread']) {
      const p = row[shape];
      if (!p) continue;
      console.log(
        `  ${String(row.k).padStart(5)} | ${shape.padEnd(6)} | ${String(p.days).padStart(4)} | ` +
          `${String(p.filled).padStart(10)} | ${String(p.peak).padStart(4)} | ` +
          `${String(p.sd).padStart(8)} | ${String(p.distinct).padStart(8)} | ${p.flat}`
      );
    }
  }
  // The rule, live: the seeded notebook draws a profile, and narrowing the
  // range to a fortnight turns it into the comb the rule is there to refuse.
  check(
    'the seeded notebook shows a strip with a path',
    !live.hidden && live.d > 200,
    `${live.hidden ? 'hidden' : 'shown'}, path ${live.d} chars`
  );
  // The two shapes, against the real renderer. The dock's range picker has no
  // option short enough to make a comb out of this fixture (90 days is its
  // narrowest, and 90 days of it still draws), so the density map itself is
  // substituted, which is the input the rule reads and the only thing that
  // decides.
  const shapes = await page.evaluate(async () => {
    const day = (back) => {
      const d = new Date();
      d.setDate(d.getDate() - back);
      return d.toISOString().slice(0, 10);
    };
    const hidden = () =>
      document.getElementById('timeline-scrubber').classList.contains('hidden');
    const saved = timelineDensity;
    const drawWith = (map) => {
      timelineDensity = map;
      drawTimelineScrubber();
      return hidden();
    };
    // A young notebook: 200 notes over 18 days, about 11 a day.
    const comb = {};
    for (let i = 0; i < 18; i += 1) comb[day(i)] = 11;
    // An old, sparse one: 150 notes over 300 days, one to five a day.
    const sparse = {};
    for (let i = 0; i < 300; i += 3) sparse[day(i)] = 1 + (i % 5);
    const out = { comb: drawWith(comb), sparse: drawWith(sparse) };
    timelineDensity = saved;
    drawTimelineScrubber();
    out.backAgain = !hidden();
    return out;
  });
  check(
    'a comb hides: 200 notes over 18 days',
    shapes.comb === true,
    `strip ${shapes.comb ? 'hidden' : 'shown'} (it was shown under the old count rule)`
  );
  check(
    'a profile shows: 150 notes over 300 days',
    shapes.sparse === false,
    `strip ${shapes.sparse ? 'hidden' : 'shown'} (it was hidden under the old count rule)`
  );
  check('and the seeded notebook comes back', shapes.backAgain, `${shapes.backAgain}`);
  console.log(fails.length ? `FAILED: ${fails.join(', ')}` : 'all checks passed');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
