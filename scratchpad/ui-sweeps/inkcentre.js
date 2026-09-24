// Is the glyph in every round icon button centred by its ink, not its box?
//
//   BASE=http://127.0.0.1:8813 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/inkcentre.js
//
// 08-consistency.css, "Centred by its ink": a Phosphor glyph sits about
// 0.14em high in its own em square, so a button whose boxes are centred to
// 0.01px can still draw its icon a pixel or two high, and in a circle that
// is what the eye sees first (the owner saw it on the connection chip's x).
// No layout number can find that; only the pixels can. So each round or
// pill-shaped icon-only button is photographed at 4x with its fill, edge and
// shadow cleared and its glyph painted pure red, and the red's bounding box
// is compared with the button's own centre.
//
// Reported: every button (one per class signature per surface) whose ink
// centre is more than 0.5px off its box centre on either axis, with the
// offset in CSS pixels, positive meaning low or right.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const TOL = Number(process.env.TOL || 0.5);
const SCALE = 4;
const TABS = ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders'];

function tagTargets(all) {
  const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
  const seen = new Set();
  const out = [];
  for (const b of document.querySelectorAll('button, summary, a[role="button"]')) {
    if (!vis(b)) continue;
    const r = b.getBoundingClientRect();
    if (r.width < 12 || r.height < 12 || r.width > 64 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const icons = b.querySelectorAll('i.ph');
    if (icons.length !== 1 || !vis(icons[0])) continue;
    if (b.textContent.replace(/\s+/g, '').length) continue;
    const cs = getComputedStyle(b);
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    //: Round or pill: a square button's glyph is judged by the same eye, but
    //: the circle is where an off-centre glyph is unmistakable.
    if (!all && radius < Math.min(r.width, r.height) / 2 - 1.5) continue;
    const sig = `${b.className}|${icons[0].className}|${Math.round(r.width)}x${Math.round(r.height)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    const n = (window.__inkN = (window.__inkN || 0) + 1);
    b.setAttribute('data-ink', String(n));
    out.push({ n, sig, label: (b.getAttribute('aria-label') || b.title || '').slice(0, 40), id: b.id });
  }
  return out;
}

function paint([n, on]) {
  const b = document.querySelector(`[data-ink="${n}"]`);
  if (!b) return null;
  const i = b.querySelector('i.ph');
  if (on) {
    b._inkSaved = [b.style.background, b.style.borderColor, b.style.boxShadow, b.style.outline, i.style.color, i.style.opacity, b.style.transition, i.style.transition];
    b.style.transition = 'none';
    i.style.transition = 'none';
    b.style.background = 'transparent';
    b.style.borderColor = 'transparent';
    b.style.boxShadow = 'none';
    b.style.outline = 'none';
    i.style.color = 'rgb(255, 0, 0)';
    i.style.opacity = '1';
    const r = b.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }
  [b.style.background, b.style.borderColor, b.style.boxShadow, b.style.outline, i.style.color, i.style.opacity, b.style.transition, i.style.transition] = b._inkSaved;
  return null;
}

async function inkOf(page, b64, w, h) {
  return page.evaluate(async ([src, w, h]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const k = (y * c.width + x) * 4;
        if (d[k] > 150 && d[k + 1] < 90 && d[k + 2] < 90) {
          n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (!n) return null;
    const sx = c.width / w, sy = c.height / h;
    return { dx: ((x0 + x1 + 1) / 2 / sx) - w / 2, dy: ((y0 + y1 + 1) / 2 / sy) - h / 2, inkW: (x1 - x0 + 1) / sx, inkH: (y1 - y0 + 1) / sy };
  }, [b64, w, h]);
}

async function sweep(page, where, out) {
  await page.mouse.move(1, 1);
  const targets = await page.evaluate(tagTargets, !!process.env.ALL);
  for (const t of targets) {
    const box = await page.evaluate(paint, [t.n, true]);
    if (!box) continue;
    const buf = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h } }).catch(() => null);
    await page.evaluate(paint, [t.n, false]);
    if (!buf) continue;
    const ink = await inkOf(page, buf.toString('base64'), box.w, box.h);
    if (!ink) continue;
    const off = Math.abs(ink.dx) > TOL || Math.abs(ink.dy) > TOL;
    if (off || process.env.VERBOSE) out.push(`${where} ${t.id ? '#' + t.id : ''} "${t.label}" ${Math.round(box.w)}x${Math.round(box.h)}: ink off by dx ${ink.dx.toFixed(2)} dy ${ink.dy.toFixed(2)} (${t.sig.split('|')[0].slice(0, 50)} / ${t.sig.split('|')[1]})`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SCALE });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); } catch (e) {} }, process.env.THEME || 'light');
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(2500);
  const out = [];
  for (const t of TABS) {
    await page.evaluate((n) => { try { switchTab(n); } catch (e) {} }, t);
    await page.waitForTimeout(900);
    await sweep(page, t, out);
  }
  await page.evaluate(async () => { const r = await api('/whiteboard/boards'); const j = await r.json(); const l = Array.isArray(j) ? j : j.boards; switchTab('whiteboard'); await openWhiteboardBoard(l[0].id); });
  await page.waitForTimeout(1500);
  await sweep(page, 'board', out);
  await page.evaluate(() => document.getElementById('settings-btn')?.click());
  await page.waitForTimeout(700);
  await sweep(page, 'settings', out);
  console.log(`== ink centring, ${out.length} findings (tolerance ${TOL}px)`);
  for (const l of out) console.log('  ' + l);
  await browser.close();
})();
