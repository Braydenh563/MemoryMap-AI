// Atlas for the README (0.3.3, INBOX 426 r and s; the owner: "maybe include
// an atlas avatar??"). Every picture is the app's own renderer, drawn by the
// avatar lab (tools/avatar-lab.html) the app serves, cropped to the element:
//
//   atlas.png          Atlas whole and happy on a night tile, for the
//                      title of the README
//   atlas-hero.png     both looks side by side (the lab's Both looks)
//   atlas-poses.png    ten of the companion's poses (the lab's All poses,
//                      its first two rows)
//   avatar-lab.png     the lab itself at 1440x900, on Both looks
//
//   BASE=http://127.0.0.1:8810 OUT=docs/screenshots \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/atlasreadme.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8810';
const OUT = process.env.OUT || 'docs/screenshots';

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (width, height, dpr) => {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    //: A fresh lab: no saved tune, look or ground from an earlier session.
    await ctx.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    const tab = await ctx.newPage();
    tab.on('pageerror', (e) => errors.push(e.message));
    await tab.goto(`${BASE}/tools/avatar-lab.html`, { waitUntil: 'domcontentloaded' });
    await tab.waitForTimeout(1200);
    return { ctx, tab };
  };
  const view = async (tab, name) => {
    await tab.evaluate(() => document.getElementById('clear').click());
    await tab.click(`[data-do="${name}"]`);
    await tab.waitForTimeout(1500);
  };
  const done = [];
  const shot = async (target, file, options = {}) => {
    const path = `${OUT}/${file}`;
    await target.screenshot({ path, ...options });
    done.push({ file, bytes: fs.statSync(path).size });
  };

  // The crops, drawn at two device pixels so they stay sharp at the README's
  // sizes.
  {
    const { ctx, tab } = await open(1400, 1100, 2);
    await view(tab, 'compare');
    await shot(tab.locator('#canvas .card .pair').first(), 'atlas-hero.png');
    await view(tab, 'poses');
    await tab.waitForTimeout(1500);
    const box = await tab.evaluate(() => {
      const specs = [...document.querySelectorAll('#canvas .spec')].slice(0, 10).map((s) => s.getBoundingClientRect());
      const x = Math.min(...specs.map((r) => r.left));
      const y = Math.min(...specs.map((r) => r.top));
      return { x, y, width: Math.max(...specs.map((r) => r.right)) - x, height: Math.max(...specs.map((r) => r.bottom)) - y };
    });
    await shot(tab, 'atlas-poses.png', { clip: box });
    //: Atlas whole, happy (`atlasDraw`, atlas.js, the lab's own renderer),
    //: on a night tile with rounded corners, the ground the character is
    //: drawn for: its body is pale light, which vanishes on GitHub's white
    //: page without one. The corners outside the tile are transparent, so
    //: the page is hidden, not removed: Atlas's gradients live in shared
    //: `svg.atl-defs` elsewhere in the document (atlas.js, "Shared defs"),
    //: and emptying the body took them and drew a hollow outline.
    await tab.evaluate(() => {
      const holder = document.createElement('div');
      holder.id = 'readme-avatar';
      Object.assign(holder.style, {
        position: 'fixed', left: '0', top: '0', zIndex: '999', display: 'inline-block',
        padding: '14px', borderRadius: '32px', background: 'radial-gradient(circle at 50% 42%, #2c2f5e, #161730 72%)',
      });
      holder.append(atlasDraw(200, 'happy', 'full'));
      //: Every shared drawing host (`svg` at the top of the body) stays as
      //: it is: hiding one blanked the eyes, which are drawn from it.
      for (const el of document.body.children) if (el.tagName.toLowerCase() !== 'svg') el.style.visibility = 'hidden';
      document.body.append(holder);
      for (const el of [document.documentElement, document.body]) {
        el.style.background = 'transparent';
        el.style.backgroundImage = 'none';
      }
    });
    await shot(tab.locator('#readme-avatar'), 'atlas.png', { omitBackground: true });
    await ctx.close();
  }
  // The lab as a person sees it.
  {
    const { ctx, tab } = await open(1440, 900, 1);
    await view(tab, 'compare');
    await tab.mouse.move(1439, 899);
    await shot(tab, 'avatar-lab.png');
    await ctx.close();
  }
  console.log(JSON.stringify({ done, errors }, null, 1));
  await browser.close();
})();
