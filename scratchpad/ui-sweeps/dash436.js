// INBOX 436: what the dashboard puts on the first screen, counted.
//
// The owner: "there is quite a lot going on visually on the dashboard when
// the user opens the application ... I like the top hero section though and
// I think the widgets section is fine". So this counts the whole first
// screen and, separately, the band the redesign owns: everything on the
// dashboard page that is neither the hero (`#dash-hero`) nor the widget grid
// (`#dash-grid`).
//
// Per width and theme it prints one JSON line:
//   els      visible distinct elements above the fold (text, control or icon)
//   ctas     visible controls above the fold (button, a, input, select)
//   bandEls / bandCtas   the same, inside the band only
//   primary  filled accent buttons above the fold (competing primaries)
//   accents  distinct chromatic colours above the fold (text, fill, border)
//   anims    running Web Animations whose target is above the fold
//   canvases visible canvases above the fold (rAF loops getAnimations misses)
//   sizes / weights  distinct font sizes and weights above the fold
//   gridTop  where the first widget starts, px from the top of the viewport
//
//   BASE=http://127.0.0.1:8797 TAG=before PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules SCRATCH=. node dash436.js
// WIDTHS=1440,1280,390 and THEMES=light,dark narrow the run; SHOTS=dir saves
// one screenshot per run there as <tag>-<width>-<theme>.png.
const { boot } = require('./lib.js');
const fs = require('fs');

const SIZES = { 1440: 900, 1280: 720, 390: 844 };
const widths = (process.env.WIDTHS || '1440,1280,390').split(',').map(Number);
const themes = (process.env.THEMES || 'light,dark').split(',');
const tag = process.env.TAG || 'run';
const shots = process.env.SHOTS || '';
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  for (const theme of themes) {
    process.env.THEME = theme;
    for (const width of widths) {
      const phone = width < 600;
      const { browser, page } = await boot({
        viewport: { width, height: SIZES[width] || 900 },
        ...(phone ? { hasTouch: true, isMobile: true } : {}),
      });
      await page.evaluate(async () => {
        // A person who uses the app has run a skill or two; the dashboard
        // draws a "Run a skill" row for them, so the count includes it.
        try {
          const names = (typeof allSkills === 'function' ? allSkills() : []).slice(0, 2).map((s) => s.name);
          if (names.length) localStorage.setItem('recentSkills', JSON.stringify(names));
        } catch (e) {}
        if (typeof switchTab === 'function') await switchTab('dashboard');
        if (typeof renderDashboard === 'function') await renderDashboard();
      });
      await page.waitForTimeout(2500);
      const m = await page.evaluate(() => {
        const H = innerHeight;
        const hero = document.getElementById('dash-hero');
        const grid = document.getElementById('dash-grid');
        const dash = document.getElementById('tab-dashboard');
        const shown = (el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= innerWidth) return false;
          for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
            const cs = getComputedStyle(n);
            if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
          }
          return true;
        };
        const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        const isCtl = (el) => el.matches('button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch]');
        const isIcon = (el) => el.matches('i.ph, svg, img, canvas, .emblem');
        const all = [...document.querySelectorAll('body *')].filter((el) => !el.closest('svg') || el.tagName === 'svg');
        const vis = all.filter((el) => (ownText(el) || isCtl(el) || isIcon(el)) && shown(el));
        const inBand = (el) => dash.contains(el) && !hero.contains(el) && !grid.contains(el);
        const band = vis.filter(inBand);
        const ctas = vis.filter(isCtl);
        const bandCtas = band.filter(isCtl);
        const chroma = (c) => {
          const m = c.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
          if (a < 0.15) return null;
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
          if (mx - mn < 40) return null; // a grey, not an accent
          return `${Math.round(r / 24)},${Math.round(g / 24)},${Math.round(b / 24)}`;
        };
        const accents = new Set();
        const bandAccents = new Set();
        const primary = [];
        for (const el of vis) {
          const cs = getComputedStyle(el);
          for (const c of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
            const k = chroma(c);
            if (k && (c !== cs.borderTopColor || parseFloat(cs.borderTopWidth) > 0)) {
              accents.add(k);
              if (inBand(el)) bandAccents.add(k);
            }
          }
          if (isCtl(el) && chroma(cs.backgroundColor)) primary.push((el.id || el.className || el.tagName).toString().slice(0, 40));
        }
        const textEls = vis.filter(ownText);
        const sizes = new Set(textEls.map((el) => getComputedStyle(el).fontSize));
        const weights = new Set(textEls.map((el) => getComputedStyle(el).fontWeight));
        const bandSizes = new Set(band.filter(ownText).map((el) => getComputedStyle(el).fontSize));
        const anims = document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.isConnected && shown(a.effect.target));
        const animTargets = [...new Set(anims.map((a) => a.effect.target))].map((t) => (t.id || t.className || t.tagName).toString().slice(0, 40));
        const canvases = [...document.querySelectorAll('canvas')].filter(shown).map((c) => (c.id || c.parentElement.id || c.parentElement.className || 'canvas').toString().slice(0, 30));
        const gridBox = grid.getBoundingClientRect();
        const heroBox = hero.getBoundingClientRect();
        // The band's own landmarks, in order, so "what sits between" is a list.
        const bandBlocks = [...dash.children].flatMap((c) => (c.classList.contains('dash-head') ? [...c.children] : [c]))
          .filter((c) => c !== hero && c !== grid && shown(c))
          .map((c) => `${c.id || c.className.split(' ')[0]}:${Math.round(c.getBoundingClientRect().height)}`);
        const fixed = [...document.querySelectorAll('body *')].filter((el) => {
          const p = getComputedStyle(el).position;
          return (p === 'fixed' || p === 'sticky') && shown(el) && !dash.contains(el);
        }).map((el) => (el.id || el.className || el.tagName).toString().slice(0, 30));
        return {
          els: vis.length, ctas: ctas.length, bandEls: band.length, bandCtas: bandCtas.length,
          primary: primary.length, primaryList: primary,
          accents: accents.size, bandAccents: bandAccents.size,
          anims: anims.length, animTargets, canvases,
          sizes: sizes.size, weights: weights.size, bandSizes: bandSizes.size,
          sizeList: [...sizes].sort(), weightList: [...weights].sort(),
          heroBottom: Math.round(heroBox.bottom), gridTop: Math.round(gridBox.top),
          band: Math.round(gridBox.top - heroBox.bottom), bandBlocks, fixed,
          density: dash.dataset.density,
        };
      });
      console.log(JSON.stringify({ tag, width, theme, ...m }));
      if (shots) await page.screenshot({ path: `${shots}/${tag}-${width}-${theme}.png` });
      await browser.close();
    }
  }
})();
