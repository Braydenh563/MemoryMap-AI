// Ledger 1552: a timeline day's dot against its first text line, at 1440 and 390.
const { boot } = require('./lib.js');
(async () => {
  for (const W of (process.env.W ? [Number(process.env.W)] : [1440, 390])) {
    const { browser, page } = await boot({ viewport: { width: W, height: 844 }, hasTouch: W < 600, isMobile: W < 600 });
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForTimeout(4000);
    const r = await page.evaluate(() => {
      const out = [];
      for (const d of [...document.querySelectorAll('#tab-timeline .timeline-day-dot')].slice(0, 7)) {
        const day = d.closest('.timeline-day');
        const num = day.querySelector('.timeline-day-num');
        const name = day.querySelector('.timeline-day-name');
        const cx = (e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; };
        out.push({ dotVsNumX: +(cx(d) - cx(num)).toFixed(1), dotVsNameX: name ? +(cx(d) - cx(name)).toFixed(1) : null, below: d.getBoundingClientRect().top >= num.getBoundingClientRect().bottom - 1 });
      }
      return { dots: document.querySelectorAll('#tab-timeline .timeline-day-dot').length, sample: out };
    });
    console.log(W, JSON.stringify(r));
    await browser.close();
  }
})();
