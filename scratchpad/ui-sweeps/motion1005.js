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
    const seen = (el) => el.offsetWidth && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().bottom < innerHeight;
    const s = all.find((el) => seen(el) && el.querySelectorAll(':scope > button').length > 1 && el.querySelector(':scope > button.active'));
    if (!s) return null;
    s.id = s.id || 'mot-seg';
    const other = [...s.querySelectorAll(':scope > button')].find((b) => !b.classList.contains('active') && seen(b));
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
  await page.evaluate(() => openSettingsModal('appearance'));
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
      pick(visible('.chip-interactive, button.chip'), 'chip'),
      pick(visible('.tab-page:not(.hidden)'), 'tab-page'),
      pick(visible('.entry-list li, .card.interactive'), 'row/card'),
    ]);
  });
}


// A note list worth settling and a row menu to open: ten notes, once.
async function seed(page) {
  await page.evaluate(async () => {
    document.getElementById('tab-btn-notes')?.click();
    await new Promise((r) => setTimeout(r, 600));
    if (document.querySelectorAll('#entry-list > li:not(.skeleton)').length >= 6) return;
    for (let i = 0; i < 10; i++) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Motion sweep note ${i}: a short line to list.`, tags: ['motion'] }) });
    }
  });
}

// A menu (a note row's kebab, else any visible menu opener), then a dialog
// (the command palette), then two toasts: what animates, from where, how
// long a close holds the box, and whether the placement differs from the
// same menu placed with the switch off.
async function popups(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
    const out = {};
    const opener = [...document.querySelectorAll('#entry-list .action-menu'), ...document.querySelectorAll('.action-menu')]
      .map((m) => m.parentElement?.querySelector('[aria-haspopup]'))
      .find((b) => b && b.offsetWidth);
    if (opener) {
      opener.click();
      // Below 600 a row's menu is an action sheet: a dialog from the bottom.
      const sheet = document.querySelector('.sheet-overlay:not(.hidden)');
      if (sheet) {
        await frame();
        const card = sheet.querySelector('.sheet-card');
        out.sheet = { firstFrameOpacity: +(+getComputedStyle(sheet).opacity).toFixed(2), cardTranslate: getComputedStyle(card).translate };
        await wait(400);
        sheet.querySelector('.sheet-close')?.click();
        await frame();
        await frame();
        out.sheet.closing = { display: getComputedStyle(sheet).display, opacity: +(+getComputedStyle(sheet).opacity).toFixed(2), connected: sheet.isConnected };
        await wait(300);
      }
      const menu = sheet ? null : [...document.querySelectorAll('.action-menu:not(.hidden)')][0];
      const anims = menu ? menu.getAnimations().map((a) => a.animationName || a.transitionProperty) : [];
      await wait(400);
      const r = menu ? menu.getBoundingClientRect() : null;
      if (menu) {
      out.menu = { anims, origin: getComputedStyle(menu).transformOrigin, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
      closeActionMenus();
      await frame();
      await frame();
      const cs = getComputedStyle(menu);
      out.menu.closing = { escapedOrSnap: menu.classList.contains('ui-snap'), hidden: menu.classList.contains('hidden'), display: cs.display, opacity: +(+cs.opacity).toFixed(2) };
      await wait(200);
      out.menu.closed = getComputedStyle(menu).display;
      }
    }
    // A dialog: the command palette (app-palette.js).
    openPalette();
    await frame();
    const live = document.getElementById('palette-overlay');
    out.dialog = { id: live?.id, firstFrameOpacity: +(+getComputedStyle(live).opacity).toFixed(2), anims: live.getAnimations({ subtree: true }).map((a) => a.transitionProperty || a.animationName).filter(Boolean).slice(0, 6) };
    await wait(350);
    closePalette();
    await frame();
    await wait(30);
    out.dialog.closing = { display: getComputedStyle(live).display, opacity: +(+getComputedStyle(live).opacity).toFixed(2) };
    await wait(250);
    out.dialog.closed = getComputedStyle(live).display;
    // Toasts: the new one's entry, and the older one sliding up to make room.
    toast('Motion sweep, first');
    await wait(300);
    toast('Motion sweep, second');
    const box = document.querySelector('#toast-box');
    const notes = [...box.querySelectorAll('.toast')];
    out.toast = {
      count: notes.length,
      newest: notes.at(-1)?.getAnimations().map((a) => a.animationName).join('+'),
      older: notes.slice(0, -1).flatMap((n) => n.getAnimations().map((a) => (a.effect?.getKeyframes?.()[0] ? Object.keys(a.effect.getKeyframes()[0]).filter((k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k)).join('+') : a.animationName))).join(' '),
    };
    for (const n of notes) n.querySelector('.toast-close')?.click();
    await wait(500);
    return out;
  });
}

// The first visit to Library: its lists swap skeletons for rows; how many
// containers settled and the first row's opacity on the frame it arrived.
async function settle(page) {
  await page.evaluate(() => {
    window.__settle = [];
    new MutationObserver((list) => {
      for (const m of list) {
        const el = m.target;
        if (el.classList?.contains('ui-settle') && !el.__seen) {
          el.__seen = true;
          requestAnimationFrame(() => {
            const first = el.firstElementChild;
            const eighth = el.children[7];
            window.__settle.push({ id: el.id || el.className.split(' ')[0], first: first ? +(+getComputedStyle(first).opacity).toFixed(2) : null, delay8: eighth ? getComputedStyle(eighth).transitionDelay.split(',')[0] : null, rows: el.children.length });
          });
        }
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  });
  await page.evaluate(() => document.getElementById('tab-btn-library')?.click());
  await page.waitForTimeout(1500);
  return page.evaluate(() => window.__settle.slice(0, 6));
}

// 20 menu opens and closes and 20 tab switches: rAF intervals over 16.7ms.
async function frames(page) {
  return page.evaluate(async (rounds) => {
    const gaps = [];
    let last = performance.now();
    let on = true;
    const tick = (t) => { gaps.push(t - last); last = t; if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const menuGaps = [];
    document.getElementById('tab-btn-notes')?.click();
    await wait(400);
    const opener = [...document.querySelectorAll('.action-menu')].map((m) => m.parentElement?.querySelector('[aria-haspopup]')).find((b) => b && b.offsetWidth);
    gaps.length = 0;
    for (let i = 0; i < rounds && opener; i++) {
      opener.click();
      await wait(220);
      closeActionMenus();
      document.querySelector('.sheet-overlay:not(.hidden) .sheet-close')?.click();
      await wait(160);
    }
    menuGaps.push(...gaps.splice(0));
    const tabs = ['tab-btn-chat', 'tab-btn-notes'].map((id) => document.getElementById(id)).filter((b) => b && b.offsetWidth);
    const subs = [...document.querySelectorAll('#notes-subtabs > button')].slice(0, 2);
    const strip = tabs.length === 2 ? tabs : subs;
    for (let i = 0; i < rounds; i++) {
      strip[i % 2].click();
      await wait(300);
    }
    const tabGaps = gaps.splice(0);
    on = false;
    const sum = (g) => {
      const s = [...g].sort((a, b) => a - b);
      return { frames: g.length, over16: g.filter((x) => x > 16.7 + 1).length, over33: g.filter((x) => x > 34).length, p95: +s[Math.floor(s.length * 0.95)]?.toFixed(1), max: +s.at(-1)?.toFixed(1) };
    };
    return { menu: sum(menuGaps), tabs: sum(tabGaps), loaf: window.__loaf.splice(0).filter((d) => d > 50).length };
  }, ROUNDS);
}

// This sandbox's frame times swing with the load other work puts on four
// cores, so on and off are run alternately, three times each, and compared
// by their medians: what the motion costs is the difference, not either one.
async function framesAB(page) {
  await page.evaluate(() => {
    window.__loaf = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push(e.duration); }).observe({ type: 'long-animation-frame', buffered: false });
  });
  const runs = { on: [], off: [] };
  for (let i = 0; i < 6; i++) {
    const on = i % 2 === 0;
    await setSwitch(page, on);
    runs[on ? 'on' : 'off'].push(await frames(page));
  }
  const med = (list, k1, k2) => list.map((r) => (k2 ? r[k1][k2] : r[k1])).sort((a, b) => a - b)[1];
  const view = (list) => ({
    menuMissed: med(list, 'menu', 'over16'), menuP95: med(list, 'menu', 'p95'), menuFrames: med(list, 'menu', 'frames'),
    tabMissed: med(list, 'tabs', 'over16'), tabP95: med(list, 'tabs', 'p95'), tabFrames: med(list, 'tabs', 'frames'),
    longFramesOver50: med(list, 'loaf'),
  });
  await setSwitch(page, true);
  return { on: view(runs.on), off: view(runs.off) };
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: 900 }, ...(REDUCED ? { reducedMotion: 'reduce' } : {}) });
  await page.evaluate(() => {
    window.__cls = {};
    window.__shifts = [];
    window.__phase = 'boot';
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls[window.__phase] = (window.__cls[window.__phase] || 0) + e.value;
        const who = (e.sources || []).map((x) => x.node && (x.node.id || (x.node.className && String(x.node.className).split(' ')[0]) || x.node.nodeName)).join(',');
        window.__shifts.push(`${window.__phase}:${e.value.toFixed(3)}:${who}`);
      }
    }).observe({ type: 'layout-shift', buffered: false });
  });
  const result = { w: W, theme: process.env.THEME || 'light', reduced: REDUCED };
  result.switchAttr = await setSwitch(page, true);
  await page.evaluate((p) => { window.__phase = p; }, 'settle');
  result.settle = await settle(page);
  await page.evaluate(() => { window.__phase = 'seed'; });
  await seed(page);
  await page.evaluate((p) => { window.__phase = p; }, 'recipes');
  result.recipes = await recipes(page);
  await page.evaluate((p) => { window.__phase = p; }, 'popupsOn');
  result.popupsOn = await popups(page);
  await page.evaluate((p) => { window.__phase = p; }, 'on');
  result.on = await strips(page);
  result.switchAttr = [result.switchAttr, await setSwitch(page, false)];
  await page.evaluate((p) => { window.__phase = p; }, 'off');
  result.off = await strips(page);
  await page.evaluate((p) => { window.__phase = p; }, 'offRecipes');
  result.offRecipes = await recipes(page);
  await page.evaluate((p) => { window.__phase = p; }, 'popupsOff');
  result.popupsOff = await popups(page);
  await setSwitch(page, true);
  await page.evaluate((p) => { window.__phase = p; }, 'settingsOn');
  // Below 600 the sections are a jump list, not a strip.
  result.settingsOn = W >= 600 ? await settingsNav(page) : [];
  await page.evaluate(() => closeSettingsModal());
  await page.evaluate(() => { window.__phase = 'frames'; });
  result.frames = await framesAB(page);
  result.cls = await page.evaluate(() => Object.fromEntries(Object.entries(window.__cls).map(([k, v]) => [k, +v.toFixed(4)])));
  result.shifts = await page.evaluate(() => window.__shifts.filter((x) => +x.split(':')[1] > 0.001).slice(0, 12));
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
