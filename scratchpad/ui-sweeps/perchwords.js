// The owner, 2026-09-27, again: Atlas sat over the Weekly digest paragraph
// (just under the title, over its first line), and scrolled, it looked
// perched on the status bar. The rule asked for: top edges only, never
// inside a card below its heading, every settle checked against the words,
// and on scroll it keeps to its edge or goes to a valid one.
// For each tab (TABS) and a run of scroll positions of the tab's own
// scroller, this asks the chooser for its perch (`nameMarkBuddyChoose`),
// then measures densely: the square pixels of the figure's shape
// (`nameMarkBuddyShape`) over the line boxes of every text node in the tab,
// whether the edge it stands on is inside a card below the card's top, and
// whether it hangs from anything but the top bar. Then it lets the live
// companion settle after each scroll and measures its drawn box the same
// way, and whether it overlaps the status bar.
// Env: VW, VH (1093 x 614), TABS, STEPS (6), KIND (atlas).
// Exits 1 on any chosen or settled perch over more than 20 square px of
// words, inside a card, hanging from a panel, or over the status bar.
const { boot } = require('./lib.js');
const VW = Number(process.env.VW || 1093);
const VH = Number(process.env.VH || 614);
const TABS = (process.env.TABS || 'dashboard,notes,chat,library').split(',');
const STEPS = Number(process.env.STEPS || 6);

(async () => {
  const { browser, page } = await boot({ viewport: { width: VW, height: VH } });
  await page.evaluate((k) => { localStorage.removeItem('nm-buddy-spots'); const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }, process.env.KIND || 'atlas');
  let bad = 0;
  const rows = [];
  for (const tab of TABS) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(3500);
    for (let step = 0; step < STEPS; step += 1) {
      const r = await page.evaluate(([t, step]) => {
        const pageEl = document.getElementById(`tab-${t}`);
        //: The tab's scroller: the first element under the page that scrolls.
        let scroller = document.scrollingElement;
        for (const el of [pageEl, ...pageEl.querySelectorAll('*')]) {
          const cs = getComputedStyle(el);
          if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200) { scroller = el; break; }
        }
        scroller.scrollTop = Math.round((scroller.scrollHeight - scroller.clientHeight) * step / 5);
        return { top: scroller.scrollTop, max: scroller.scrollHeight - scroller.clientHeight };
      }, [tab, step]);
      await page.waitForTimeout(150);
      const measure = (live) => page.evaluate(([t, live]) => {
        nameMarkBuddyIndexReset();
        let spot;
        let shape;
        const buddy = document.getElementById('nm-buddy');
        if (live) {
          spot = { x: nmb.x, y: nmb.y, pose: nmb.pose, legs: nmb.legs, kind: nmb.perch, edge: nmb.spot?.edge, anchor: nmb.spot?.anchor };
        } else {
          spot = nameMarkBuddyChoose(t, nameMarkBuddyObstacles(t));
        }
        shape = nameMarkBuddyShape(spot.x, spot.y, spot.pose, spot.legs);
        const tabEl = document.getElementById(`tab-${t}`);
        const walker = document.createTreeWalker(tabEl, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let area = 0;
        const words = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent.trim() || n.parentElement.closest('#nm-buddy')) continue;
          if (typeof n.parentElement.checkVisibility === 'function' && !n.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) {
            for (const p of shape) {
              const w = Math.min(r.right, p.right) - Math.max(r.left, p.left);
              const h = Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top);
              if (w > 0 && h > 0) { area += w * h; if (words.length < 2) words.push(n.textContent.trim().slice(0, 30)); }
            }
          }
        }
        const el = spot.anchor || spot.edge?.el || null;
        const card = el?.parentElement?.closest('.card, .dash-widget, .widget, .note-card, .library-card, .msg');
        const inside = !!(card && el.getBoundingClientRect().top > card.getBoundingClientRect().top + 6);
        const hangsPanel = spot.pose === 'hang' && spot.kind !== 'hang';
        const status = document.getElementById('status-bar');
        const sb = status && status.offsetParent ? status.getBoundingClientRect() : null;
        const overStatus = !!(sb && shape.some((p) => p.bottom > sb.top + 3 && p.top < sb.bottom) && !(spot.kind === 'bar'));
        return { kind: spot.kind, pose: spot.pose, legs: spot.legs, x: Math.round(spot.x), y: Math.round(spot.y), area: Math.round(area), words, inside, hangsPanel, overStatus, el: el ? `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}` : '' };
      }, [tab, live]);
      const chosen = await measure(false);
      await page.waitForTimeout(2600);
      const settled = await measure(true);
      for (const [what, m] of [['chosen', chosen], ['settled', settled]]) {
        const fail = m.area > 20 || m.inside || m.hangsPanel || m.overStatus;
        if (fail) bad += 1;
        rows.push(`${fail ? 'BAD ' : 'ok  '}${tab} scroll ${r.top}/${r.max} ${what}: ${m.kind} ${m.pose}${m.legs ? '/' + m.legs : ''} @${m.x},${m.y} on ${m.el} words ${m.area}px${m.words.length ? ' "' + m.words.join('", "') + '"' : ''}${m.inside ? ' INSIDE A CARD' : ''}${m.hangsPanel ? ' HANGS FROM A PANEL' : ''}${m.overStatus ? ' OVER THE STATUS BAR' : ''}`);
      }
      if (r.max <= 0) break;
    }
  }
  console.log(rows.join('\n'));
  console.log(`${bad} bad of ${rows.length}`);
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
