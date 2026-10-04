// The feminine Atlas's astral wisps and tail glow, as numbers (the follow-ups
// to INBOX 535): do the wisps by the tail follow the pose, how much do the
// wisps stand out in each theme, does the body's edge glow carry on down the
// tail.
//   BASE=... THEME=light|dark node scratchpad/ui-sweeps/atlaswisps.js
//
// Follow: the offset of each wisp's box centre from the tail's, in the
// figure's own units, standing and in each lying pose. A wisp that follows
// keeps (about) its standing offset, turned with the tail.
// Stand-out: the wisps' painted colour over the page behind the companion,
// as a contrast ratio, from a screenshot at 6x with and without the wisps.
// Glow: the tail's edge glow paths and their fill opacity.
const { boot } = require('./lib.js');
const fs = require('fs');
const { execFileSync } = require('child_process');
const THEME = process.env.THEME || 'light';
const POSES = (process.env.POSES || 'stand,lie-2,lie,curl').split(',');
const SCRATCH = process.env.SCRATCH || '/tmp';

(async () => {
  const { browser, page } = await boot({ viewport: { width: 900, height: 900 } });
  const out = { theme: THEME, follow: {}, contrast: null, glow: null };
  const mount = (pose, Z) => page.evaluate(({ pose, Z }) => {
    document.getElementById('atl-wisps-box')?.remove();
    localStorage.setItem('atlas-look', 'feminine');
    const box = document.createElement('div'); box.id = 'atl-wisps-box';
    box.style.position = 'fixed'; box.style.left = '20px'; box.style.top = '20px'; box.style.width = '860px'; box.style.height = '860px'; box.style.zIndex = '9999'; box.style.overflow = 'hidden';
    box.style.background = getComputedStyle(document.body).getPropertyValue('--page').trim() || 'white';
    document.getElementById('nm-buddy')?.remove();
    const holder = document.createElement('div'); holder.id = 'nm-buddy';
    holder.style.position = 'absolute'; holder.style.left = '240px'; holder.style.top = '160px'; holder.style.width = '64px'; holder.style.height = '92px'; holder.style.transform = `scale(${Z})`; holder.style.transformOrigin = '0 0';
    const fig = atlasFigure(); fig.style.position = 'relative'; fig.style.display = 'block'; fig.style.width = '64px'; fig.style.height = '92px';
    if (pose !== 'stand') holder.dataset.pose = pose;
    holder.append(fig); box.append(holder); document.body.append(box);
    //: The drift is a clock of its own; stopped so two poses compare.
    for (const el of box.querySelectorAll('*')) el.style.animation = 'none';
  }, { pose, Z });
  for (const pose of POSES) {
    await mount(pose, 6);
    await page.waitForTimeout(2600);
    out.follow[pose] = await page.evaluate(() => {
      const box = (el) => { const r = el.getBoundingClientRect(); return [(r.left + r.right) / 12, (r.top + r.bottom) / 12]; };
      const tail = document.querySelector('#nm-buddy .atl-layer-lower .atl-fills .atl-sower-fill');
      const [tx, ty] = box(tail);
      return [...document.querySelectorAll('#nm-buddy .atl-layer-wisps .atl-astral-core')].map((w) => {
        const [x, y] = box(w);
        return [+(x - tx).toFixed(1), +(y - ty).toFixed(1)];
      });
    });
  }
  // Stand-out: screenshot with and without the wisps; the wisp pixels are
  // the ones that differ, and their colour is read against the page behind.
  await mount('stand', 6);
  await page.waitForTimeout(2600);
  const shot = async (name) => { const el = await page.$('#atl-wisps-box'); const p = `${SCRATCH}/wisps-${THEME}-${name}.png`; await el.screenshot({ path: p }); return p; };
  const withW = await shot('with');
  await page.evaluate(() => { for (const el of document.querySelectorAll('#nm-buddy .atl-layer-wisps')) el.style.visibility = 'hidden'; });
  const without = await shot('without');
  const bg = await page.evaluate(() => getComputedStyle(document.getElementById('atl-wisps-box')).backgroundColor);
  out.background = bg;
  out.contrast = JSON.parse(execFileSync('python3', [__dirname + '/wispcontrast.py', withW, without, 'corner']).toString());
  // The tail glow's own pixels: what changes when it alone is hidden.
  await page.evaluate(() => { for (const el of document.querySelectorAll('#nm-buddy .atl-layer-wisps')) el.style.visibility = ''; });
  const glowOn = await shot('glow-on');
  await page.evaluate(() => { for (const el of document.querySelectorAll('#nm-buddy .atl-sower-glow')) el.style.visibility = 'hidden'; });
  const glowOff = await shot('glow-off');
  out.tailGlowPixels = JSON.parse(execFileSync('python3', [__dirname + '/wispcontrast.py', glowOn, glowOff, 'corner']).toString()).all;
  out.glow = await page.evaluate(() => [...document.querySelectorAll('#nm-buddy .atl-layer-lower .atl-sower-glow')].map((p) => {
    const cs = getComputedStyle(p);
    return { fill: cs.fill, opacity: cs.opacity, stroke: cs.stroke };
  }));
  out.bodyEdge = await page.evaluate(() => {
    const p = document.querySelector('#nm-buddy .atl-layer-body .nmb-torso .atl-edge');
    if (!p) return null;
    const cs = getComputedStyle(p);
    return { stroke: cs.stroke, opacity: cs.opacity, width: cs.strokeWidth };
  });
  console.log(JSON.stringify(out, null, 1));
  await page.evaluate(() => localStorage.removeItem('atlas-look'));
  await browser.close();
})();
