// INBOX 677: the Dashboard's Quick access row, measured in every view that
// shows it (Full and Compact; Focused folds it away).
//
// The owner, with a screenshot of Compact: "the quick access looks wierd and
// not refined in the compact view". Five equal bordered boxes stretched
// across the row, each icon and word left-aligned in a mostly empty box. So
// the number here is `fill`: per tile, the share of its inner width that its
// icon and words actually occupy (worst tile and mean), beside the tile
// widths, how many lines the row takes, clipped labels, sideways overflow,
// contrast of the words, and touch targets under 44px at a phone width.
//
//   BASE=http://127.0.0.1:8819 TAG=before PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=<dir> node scratchpad/ui-sweeps/quick677.js
// WIDTHS, THEMES and VIEWS narrow it; SHOTS=dir saves the row per run.
const { boot } = require('./lib.js');
const fs = require('fs');

const HEIGHTS = { 390: 844, 1024: 768, 1440: 900, 1920: 1080 };
const widths = (process.env.WIDTHS || '390,1024,1440,1920').split(',').map(Number);
const themes = (process.env.THEMES || 'light,dark').split(',');
const views = (process.env.VIEWS || 'compact,full').split(',');
const tag = process.env.TAG || 'run';
const shots = process.env.SHOTS || '';
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  for (const theme of themes) {
    process.env.THEME = theme;
    for (const width of widths) {
      const touch = width < 600;
      const { browser, page } = await boot({
        viewport: { width, height: HEIGHTS[width] || 900 },
        ...(touch ? { hasTouch: true, isMobile: true } : {}),
      });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
      for (const view of views) {
        await page.evaluate(async (v) => {
          await switchTab('dashboard');
          applyDashDensity(v);
          await renderDashboard();
        }, view);
        await page.waitForTimeout(1500);
        const m = await page.evaluate(({ touch }) => {
          const box = document.getElementById('dash-quicklinks');
          const tiles = [...box.querySelectorAll('.launch-row .quick-link')].filter((t) => t.getBoundingClientRect().width > 0);
          const pen = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const rgba = (c) => {
            pen.clearRect(0, 0, 1, 1); pen.fillStyle = '#000'; pen.fillStyle = c; pen.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data; return [r, g, b, a / 255];
          };
          const lum = ([r, g, b]) => {
            const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const ground = (el) => {
            for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0.5) return c; }
            return [255, 255, 255, 1];
          };
          const fills = [];
          const clipped = [];
          const low = [];
          const small = [];
          for (const t of tiles) {
            const r = t.getBoundingClientRect();
            const cs = getComputedStyle(t);
            const inner = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            let lo = Infinity; let hi = -Infinity;
            const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              if (!n.textContent.trim() || !n.parentElement.getClientRects().length) continue;
              const range = document.createRange(); range.selectNodeContents(n);
              for (const q of range.getClientRects()) if (q.width) { lo = Math.min(lo, q.left); hi = Math.max(hi, q.right); }
            }
            const icon = t.querySelector('.quick-link-icon');
            if (icon) { const q = icon.getBoundingClientRect(); if (q.width) { lo = Math.min(lo, q.left); hi = Math.max(hi, q.right); } }
            fills.push(Math.min(1, (hi - lo) / inner));
            const label = t.querySelector('.quick-link-label');
            if (label && label.scrollWidth > label.clientWidth + 1) clipped.push(label.textContent.trim());
            if (touch && (r.height < 43.5 || r.width < 43.5)) small.push(`${label?.textContent.trim()}:${Math.round(r.width)}x${Math.round(r.height)}`);
            if (label) {
              const fg = rgba(getComputedStyle(label).color); const bg = ground(label);
              const mixed = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
              const [a, b] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
              const ratio = (a + 0.05) / (b + 0.05);
              if (ratio < 4.5) low.push(`${label.textContent.trim()}:${ratio.toFixed(2)}`);
            }
          }
          const lines = new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().top))).size;
          const overflow = document.documentElement.scrollWidth > innerWidth + 1 || box.scrollWidth > box.clientWidth + 1;
          const mean = fills.reduce((a, b) => a + b, 0) / (fills.length || 1);
          return {
            tiles: tiles.map((t) => Math.round(t.getBoundingClientRect().width)).join('/'),
            h: Math.round(tiles[0]?.getBoundingClientRect().height || 0),
            fillMin: `${Math.round(Math.min(...fills) * 100)}%`,
            fillMean: `${Math.round(mean * 100)}%`,
            lines, clipped, overflow, low, small,
          };
        }, { touch });
        console.log(JSON.stringify({ tag, view, width, theme, ...m, errors: [...new Set(errors)] }));
        if (shots) {
          const el = await page.$('#dash-quicklinks');
          if (el && await el.isVisible()) await el.screenshot({ path: `${shots}/${tag}-${view}-${width}-${theme}.png` });
        }
      }
      await browser.close();
    }
  }
})();
