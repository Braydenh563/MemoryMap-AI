// Back in use 2026-09-27 (the owner asked for the masculine look in dark):
//
// Atlas for the README: atlas.png, Atlas whole and happy in the masculine
// look (the main one) on a night tile, the one picture of the README's
// "Meet Atlas" paragraph. The owner, 2026-09-27: the top image is the app's
// icon again, no avatar lab anywhere in the README, and the Atlas section
// "just an image of the masculine avatar and a small intro paragraph", so
// the hero, poses and lab captures this made are gone. Drawn by the app's
// own renderer through the lab page the app serves, cropped to the element:
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
    //: The masculine look by name, whatever Auto would pick here.
    await tab.evaluate(() => { try { localStorage.setItem('atlas-look', 'masculine'); } catch (e) {} });
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
  console.log(JSON.stringify({ done, errors }, null, 1));
  await browser.close();
})();
