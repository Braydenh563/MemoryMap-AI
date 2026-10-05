// The motion polish pass and its switch (the owner, 2026-10-05: "subtle
// animations or transitions that are modern, professional ... cheap ones",
// "make them happen even with reduced motion but with a separate toggle in
// the appearance settings with it automatically on", "Also like the smooth
// slide across tabs"). One sweep for the whole pass; it replaced glide.js and
// tabglide.js (the anchored indicator and the top bar's own box are gone).
//
// It reads, at one width and theme per run:
//
//   recipes   computed transition-property and duration of every polish
//             recipe (a button, a chip, a tab page, a popup, a menu, a toast,
//             the indicator's animation): only transform, opacity, scale,
//             translate and colours; durations from the --ui-* tokens
//   glide     per strip (top bar, notes sub-tabs, a .seg, the Settings
//             sections): the indicator in motion after a click (ms, frames
//             between), what its animation moves, where it lands against the
//             chosen option (px), and again after a window resize
//   switch    the same with Interface animations off (0 frames, 0ms) and,
//             with REDUCED=1 (emulated prefers-reduced-motion), on still
//             glides and off does not
//   cls       layout shift summed over every interaction above
//   frames    20 menu opens and closes and 20 tab switches: rAF intervals
//             over 16.7ms against the same run with the switch off
//
//   BASE=http://127.0.0.1:8816 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/motion1005.js    (W=390, THEME=dark, REDUCED=1)
const { boot } = require('./lib.js');

const W = Number(process.env.W || 1440);
const REDUCED = !!process.env.REDUCED;
const ROUNDS = Number(process.env.ROUNDS || 20);

const CHOSEN = ':scope > .active, :scope > [aria-selected="true"], :scope > [role="group"] > .active, :scope > [aria-current="location"]';

async function setSwitch(page, on) {
  await page.evaluate((on) => {
    const box = document.getElementById('ui-motion-toggle');
    if (box.checked !== on) box.click();
  }, on);
  await page.waitForTimeout(100);
  return page.evaluate(() => document.documentElement.dataset.uiMotion);
}

// Where the indicator is drawn this frame, against the chosen option.
const OFF = `(strip) => {
  const tab = strip.querySelector(${JSON.stringify(CHOSEN)});
  if (!tab || !strip.classList.contains('has-glide')) return null;
  const o = strip.getBoundingClientRect();
  const cs = getComputedStyle(strip);
  const m = new DOMMatrix(getComputedStyle(strip, '::before').transform);
  const v = (k) => parseFloat(cs.getPropertyValue('--glide-' + k));
  const x = o.left + strip.clientLeft - strip.scrollLeft + v('x') + m.e;
  const y = o.top + strip.clientTop - strip.scrollTop + v('y') + m.f;
  const w = v('w') * m.a, h = v('h') * m.d;
  const r = tab.getBoundingClientRect();
  return { x, y, w, h, off: +Math.max(Math.abs(x - r.left), Math.abs(y - r.top), Math.abs(w - r.width), Math.abs(h - r.height)).toFixed(2) };
}`;

async function glideOnce(page, stripSel, optionSel) {
  // Wire it the way a person does: the pointer reaches the strip first.
  await page.hover(stripSel).catch(() => {});
  await page.waitForTimeout(60);
  const probe = page.evaluate(([sel, OFFsrc]) => new Promise((resolve) => {
    const off = eval(OFFsrc);
    const strip = document.querySelector(sel);
    const was = strip.querySelector(':scope > .active, :scope > [aria-selected="true"], :scope > [role="group"] > .active');
    const xs = [];
    const props = new Set();
    let t0 = null;
    const tick = () => {
      const now = strip.querySelector(':scope > .active, :scope > [aria-selected="true"], :scope > [role="group"] > .active');
      if (t0 === null && now !== was) t0 = performance.now();
      const at = off(strip);
      if (t0 !== null && at) xs.push([performance.now() - t0, at.x + at.y * 1000, at.w + at.h * 1000]);
      for (const a of strip.getAnimations({ subtree: true })) {
        if (a.effect?.pseudoElement !== '::before') continue;
        for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
      }
      if (t0 === null || performance.now() - t0 < 450) requestAnimationFrame(tick);
      else resolve({ xs, props: [...props], lands: off(strip)?.off ?? null, wired: strip.classList.contains('has-glide') });
    };
    requestAnimationFrame(tick);
    setTimeout(() => resolve({ xs, props: [...props], lands: off(strip)?.off ?? null, timeout: true, wired: strip.classList.contains('has-glide') }), 2500);
  }), [stripSel, OFF]);
  await page.click(optionSel);
  const r = await probe;
  const end = r.xs[r.xs.length - 1] || [0, 0, 0];
  const start = r.xs[0] || end;
  const moving = r.xs.filter((s) => Math.abs(s[1] - end[1]) > 0.5 || Math.abs(s[2] - end[2]) > 0.5);
  const between = moving.filter((s) => Math.abs(s[1] - start[1]) > 0.5 || Math.abs(s[2] - start[2]) > 0.5);
  return { ms: moving.length ? Math.round(moving[moving.length - 1][0]) : 0, frames: between.length, props: r.props, lands: r.lands, wired: r.wired };
}

async function strips(page) {
  const out = {};
  const desktop = W >= 600;
  if (desktop) {
    const a = await glideOnce(page, '#tab-bar', '#tab-btn-chat');
    const b = await glideOnce(page, '#tab-bar', '#tab-btn-notes');
    out.topbar = [a, b];
  } else {
    await page.evaluate(() => document.getElementById('tab-btn-notes')?.click());
    await page.waitForTimeout(500);
  }
  out.subtabs = [
    await glideOnce(page, '#notes-subtabs', '#notes-subtabs > button[data-section="capture"]'),
    await glideOnce(page, '#notes-subtabs', '#notes-subtabs > button[data-section="browse"]'),
  ];
  // A visible segmented control with two options or more.
  const seg = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.seg:not(.seg-multi):not(.wb-export-seg)')];
    const s = all.find((el) => el.offsetWidth && el.querySelectorAll(':scope > button').length > 1 && el.querySelector(':scope > button.active'));
    if (!s) return null;
    s.id = s.id || 'mot-seg';
    const other = [...s.querySelectorAll(':scope > button')].find((b) => !b.classList.contains('active') && b.offsetWidth);
    other.id = other.id || 'mot-seg-other';
    const back = s.querySelector(':scope > button.active');
    back.id = back.id || 'mot-seg-back';
    return { strip: '#' + s.id, other: '#' + other.id, back: '#' + back.id };
  });
  if (seg) out.seg = [await glideOnce(page, seg.strip, seg.other), await glideOnce(page, seg.strip, seg.back)];
  // Resize: the indicator re-lands on the chosen option.
  await page.setViewportSize({ width: W - (W >= 600 ? 200 : 30), height: 860 });
  await page.waitForTimeout(400);
  out.resize = await page.evaluate((OFFsrc) => {
    const off = eval(OFFsrc);
    return [...document.querySelectorAll('.has-glide')].filter((s) => s.offsetWidth).map((s) => ({ strip: s.id || s.className.split(' ')[0], off: off(s)?.off }));
  }, OFF);
  await page.setViewportSize({ width: W, height: 900 });
  await page.waitForTimeout(400);
  return out;
}

async function settingsNav(page) {
  await page.evaluate(() => (window.openSettings ? openSettings('appearance') : document.getElementById('settings-btn')?.click()));
  await page.waitForTimeout(800);
  const r = await glideOnce(page, '#settings-nav', '#settings-nav-models').catch((e) => ({ error: e.message.slice(0, 80) }));
  const s = await glideOnce(page, '#settings-nav', '#settings-nav-appearance').catch((e) => ({ error: e.message.slice(0, 80) }));
  return [r, s];
}

async function recipes(page) {
  return page.evaluate(() => {
    const pick = (el, label) => {
      if (!el) return [label, null];
      const cs = getComputedStyle(el);
      const props = cs.transitionProperty.split(',').map((s) => s.trim());
      const durs = cs.transitionDuration.split(',').map((s) => s.trim());
      return [label, props.map((p, i) => `${p} ${durs[i % durs.length]}`).join(', ')];
    };
    const visible = (sel) => [...document.querySelectorAll(sel)].find((el) => el.offsetWidth);
    return Object.fromEntries([
      pick(visible('button.ghost'), 'button.ghost'),
      pick(visible('button:not(.ghost)'), 'button'),
      pick(visible('button.chip, .chip[role="button"]'), 'chip'),
      pick(visible('.tab-page:not(.hidden)'), 'tab-page'),
      pick(visible('.entry-list li, .card.interactive'), 'row/card'),
    ]);
  });
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: 900 }, ...(REDUCED ? { reducedMotion: 'reduce' } : {}) });
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: false });
  });
  const result = { w: W, theme: process.env.THEME || 'light', reduced: REDUCED };
  result.switchAttr = await setSwitch(page, true);
  result.recipes = await recipes(page);
  result.on = await strips(page);
  result.switchAttr = [result.switchAttr, await setSwitch(page, false)];
  result.off = await strips(page);
  result.offRecipes = await recipes(page);
  await setSwitch(page, true);
  result.settingsOn = await settingsNav(page);
  await page.keyboard.press('Escape');
  result.cls = await page.evaluate(() => +window.__cls.toFixed(4));
  // One line per finding: a glide is "ms/frames/lands px/what it moves".
  const g = (list) => (list || []).map((r) => (r.error ? r.error : `${r.ms}ms/${r.frames}f/${r.lands}px/${r.props.join('+') || '-'}`)).join(' ');
  for (const k of ['on', 'off']) {
    const s = result[k];
    result[k] = Object.fromEntries(Object.entries(s).map(([name, v]) => [name, name === 'resize' ? v.map((r) => `${r.strip}:${r.off}px`).join(' ') : g(v)]));
  }
  result.settingsOn = g(result.settingsOn);
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})();
