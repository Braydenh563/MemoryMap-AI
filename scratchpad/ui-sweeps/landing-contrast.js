// Serve docs/ first: python3 -m http.server 8793 --bind 127.0.0.1 --directory docs
// Text contrast on the landing page. Each text element's colour is measured
// against its ancestors' backgrounds composited over the worst-case page
// backdrop (the page gradient stops, with and without each blob at full
// strength), so the figure is a floor, not the typical case.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8793/index.html';
(async () => {
  const browser = await chromium.launch();
  const res = {};
  for (const [label, scheme, forced] of [['light', 'light', null], ['dark', 'dark', null], ['toggled-dark', 'light', 'dark'], ['toggled-light', 'dark', 'light']]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    if (forced) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), forced);
    await page.waitForTimeout(300);
    // open every FAQ answer so its text is measured too
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
    const r = await page.evaluate(() => {
      const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
      const over = (top, under) => { const a = top[3]; return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]; };
      const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const cs = getComputedStyle(document.documentElement);
      const v = n => cs.getPropertyValue(n).trim();
      const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 1];
      const stops = ['--page-a', '--page-b', '--page-c'].map(n => hex(v(n)));
      const ba = parse(v('--blob-a')), bb = parse(v('--blob-b'));
      const bases = [];
      for (const s of stops) { bases.push(s, over(ba, s), over(bb, s), over(bb, over(ba, s))); }
      let worst = { r: 99 }; let count = 0; const fails = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('dialog') || el.closest('svg') || el.classList.contains('skip')) continue;
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        if (!own) continue;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none' || el.getClientRects().length === 0) continue;
        if (st.clip && st.clip.startsWith('rect(0')) continue;
        const chain = [];
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
          const bg = parse(getComputedStyle(a).backgroundColor);
          if (bg && bg[3] > 0) chain.push(bg);
          if (a === document.body) break;
        }
        const fg = parse(st.color);
        let min = 99;
        for (const base of bases) {
          let bgc = base;
          for (let i = chain.length - 1; i >= 0; i--) {
            // body's own background-color is the base itself; skip it
            if (i === chain.length - 1 && chain[i][3] === 1 && chain.length && el !== document.body && chain[i] === chain[chain.length - 1] && getComputedStyle(document.body).backgroundColor === `rgb(${chain[i][0]}, ${chain[i][1]}, ${chain[i][2]})`) continue;
            bgc = over(chain[i], bgc);
          }
          const f = fg[3] < 1 ? over(fg, bgc) : fg;
          min = Math.min(min, ratio(f, bgc));
        }
        count++;
        if (min < worst.r) worst = { r: +min.toFixed(2), el: el.tagName + '.' + el.className, text: el.textContent.trim().slice(0, 40) };
        if (min < 4.5) fails.push({ r: +min.toFixed(2), el: el.tagName + '.' + el.className, text: el.textContent.trim().slice(0, 40) });
      }
      return { count, worst, fails: fails.slice(0, 10), nfail: fails.length };
    });
    res[label] = r;
    await ctx.close();
  }
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
