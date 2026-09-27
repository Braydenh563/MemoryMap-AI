// INBOX 430: "Atlas spills out of its ring in the tour". Walks every section
// of the guided tour and, at each step, finds any Atlas drawing (or any face)
// that the step's ring (`.tour-spot`) is around, and how far it reaches past
// the ring. Exits 1 when one does by more than 1px.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  if (process.env.COMPANION) await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  const sections = await page.evaluate(() => (typeof TOUR_SECTIONS !== 'undefined' ? TOUR_SECTIONS : []).map((s) => s.id));
  let bad = false;
  for (const id of sections.length ? sections : [undefined]) {
    await page.evaluate((id) => openTour(id), id);
    await page.waitForTimeout(900);
    for (let step = 0; step < 20; step += 1) {
      //: PUT=1: the worst case, made to happen: the companion is put right
      //: over the step's ring and a key is let go (what the reader does
      //: next), so the check is not left to where it chose to perch.
      if (process.env.PUT) {
        await page.evaluate(() => {
          const spot = document.getElementById('tour-spot');
          const buddy = document.getElementById('nm-buddy');
          if (!spot || !buddy || spot.classList.contains('hidden')) return;
          const s = spot.getBoundingClientRect();
          nmb.ride = null;
          nameMarkBuddyPut(buddy, s.left + s.width / 2 - 32, s.top + s.height / 2 - 60);
          document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', bubbles: true }));
        });
        await page.waitForTimeout(900);
      }
      const r = await page.evaluate(() => {
        const spot = document.querySelector('.tour-spot');
        const title = document.querySelector('.tour-card h3, .tour-card [class*="title"], #tour-card h3')?.textContent?.trim() || '';
        if (!spot) return { title, spills: [] };
        const s = spot.getBoundingClientRect();
        const spills = [];
        //: The companion is measured by its figure's own box (64 by 92), not
        //: each layer's, which a turn makes larger than what is drawn.
        for (const el of document.querySelectorAll('.nm-atlas:not(.atl-layer), .name-mark:not(.atl-layer), .nm-figure')) {
          const b = el.getBoundingClientRect();
          if (!b.width) continue;
          //: A companion faded out of the way (avatars.js, nmb-dodge) is not
          //: in the ring any more, whatever its box says.
          if (el.closest('#nm-buddy.nmb-dodge')) continue;
          //: In the ring means over it by more than a few pixels both ways:
          //: a rotated layer's box (the nebula's drift) grazing its corner
          //: is not a figure in the ring.
          const ix = Math.min(b.right, s.right) - Math.max(b.left, s.left);
          const iy = Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top);
          if (ix <= 6 || iy <= 6) continue;
          const over = Math.max(s.left - b.left, b.right - s.right, s.top - b.top, b.bottom - s.bottom);
          if (over > 1) spills.push({ el: String(el.getAttribute('class')).slice(0, 40), over: Math.round(over), el_box: [b.left, b.top, b.width, b.height].map(Math.round), ring: [s.left, s.top, s.width, s.height].map(Math.round) });
        }
        return { title, spills };
      });
      if (process.env.VERBOSE) console.log(id, step + 1, r.title);
      if (r.spills.length) { bad = true; console.log(`${id} step ${step + 1} "${r.title}":`, JSON.stringify(r.spills)); }
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click().catch(() => {});
      await page.waitForTimeout(700);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
