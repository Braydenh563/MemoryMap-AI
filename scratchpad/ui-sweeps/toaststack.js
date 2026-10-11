// The corner's toast stack (the owner 2026-10-11: "lots of the same
// notifcations dont neatly stack when they appear fast in the corner").
// Fires 10 identical toasts and 5 different ones inside 500 ms, each from its
// own task, samples every card's rect every animation frame while they move,
// then checks: one card counts the ten ("×10"), no two shown cards overlap at
// any sample, at most three notices show plus one "+N more", and two Undo
// toasts with the same words but different actions stay two cards.
// WIDTHS=1440,390 THEME=dark REDUCED=1 (prefers-reduced-motion: no travel).
const L = require('./lib.js');
(async () => {
  let bad = 0;
  for (const W of (process.env.WIDTHS || '1440,390').split(',').map(Number)) {
    const phone = W < 600;
    const { browser, page } = await L.boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { isMobile: true, hasTouch: true } : {}), ...(process.env.REDUCED ? { reducedMotion: 'reduce' } : {}) });
    page.setDefaultTimeout(120000);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async () => {
      const box = document.getElementById('toast-box');
      box.replaceChildren();
      const shown = () => [...box.children].filter((t) => t.getClientRects().length && !t.classList.contains('is-leaving'));
      let overlaps = 0, samples = 0, worst = '';
      let sampling = true;
      const sample = () => {
        const cards = shown().map((t) => t.getBoundingClientRect());
        samples++;
        for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
          const a = cards[i], b = cards[j];
          const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (dy > 0.5 && Math.min(a.right, b.right) > Math.max(a.left, b.left)) { overlaps++; worst = `${dy.toFixed(1)}px at sample ${samples}`; }
        }
        if (sampling) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
      const t0 = performance.now();
      for (let i = 0; i < 10; i++) { toast('Saved.'); await wait(25); }
      for (let i = 0; i < 5; i++) { toast(`Different notice ${i + 1}.`); await wait(25); }
      const spent = Math.round(performance.now() - t0);
      await wait(900);
      sampling = false;
      const cards = shown();
      const notices = cards.filter((t) => !t.classList.contains('toast-more'));
      const merged = [...box.children].find((t) => t.toastKey === '0:Saved.');
      const more = box.querySelector('.toast-more');
      const rects = cards.map((t) => t.getBoundingClientRect()).sort((a, b) => a.top - b.top);
      const gapList = rects.slice(1).map((rc, i) => +(rc.top - rects[i].bottom).toFixed(1));
      const newest = notices.reduce((a, b) => ((a?.toastBorn || 0) > (b?.toastBorn || 0) ? a : b), null);
      const nr = newest.getBoundingClientRect();
      const atTop = box.getBoundingClientRect().top < innerHeight / 2;
      const nearest = atTop ? Math.min(...rects.map((x) => x.top)) === nr.top : Math.max(...rects.map((x) => x.bottom)) === nr.bottom;
      // Two Undos with the same words and different actions stay two.
      box.replaceChildren();
      toastAction('Moved to the bin.', 'Undo', () => 1);
      await wait(30);
      toastAction('Moved to the bin.', 'Undo', () => 2);
      await wait(30);
      const undos = [...box.children].filter((t) => t.classList.contains('toast')).length;
      box.replaceChildren();
      return { spent, samples, overlaps, worst, shownNotices: notices.length, more: more?.textContent.trim() || '', count: merged?.querySelector('.toast-count')?.textContent || '', gaps: gapList, newestNearCorner: nearest, undos };
    });
    const ok = r.count === '×10' && r.overlaps === 0 && r.shownNotices <= 3 && r.more === '+3 more' && r.undos === 2 && r.newestNearCorner;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${W} ${process.env.THEME || 'light'}${process.env.REDUCED ? ' reduced' : ''} ${JSON.stringify(r)}`);
    await browser.close();
  }
  process.exitCode = bad ? 1 : 0;
})().catch((e) => { console.log('FAIL', e.message.split('\n')[0]); process.exitCode = 1; });
