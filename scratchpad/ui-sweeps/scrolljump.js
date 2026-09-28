// INBOX 426 (u): "when I try to look at the theme and colour section in the
// appearance settings page it auto scroll jumps", "scrolling up and down on
// the settings page is slow and laggy", "keeps scroll jumping me between
// sections", "a lot of pages keep auto scrolling or jumping ... the
// dashboard now as well".
//
// For each surface: find its scroller, record every scroller's scrollTop on
// every frame, then wheel down and back up in steps and sit still. The page
// may move only with the wheel:
//
//   against   a frame where the scroller moved opposite to the wheel
//   jump      a frame where it moved more than one wheel step at once
//   idle      movement more than 600ms after the last wheel
//   others    another scroller that moved without being wheeled
//   shift     the layout-shift score while scrolling (content moving under
//             a still scroller)
//   frames    rAF interval p50/p95/max and long tasks, for the lag
//
//   BASE=http://127.0.0.1:8793 THEME=dark SURFACES=appearance,general,dashboard \
//     node scratchpad/ui-sweeps/scrolljump.js
const { boot } = require('./lib.js');

const SURFACES = (process.env.SURFACES || 'appearance,general,skills,dashboard,notes,library').split(',');
const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
const STEP = Number(process.env.STEP || 120);
const STEPS = Number(process.env.STEPS || 12);
let failures = 0;

async function open(page, surface) {
  if (['dashboard', 'notes', 'library', 'chat', 'timeline'].includes(surface)) {
    await page.evaluate((s) => switchTab(s), surface);
    await page.waitForTimeout(2000);
    return;
  }
  await page.evaluate((s) => openSettingsModal(s), surface);
  await page.waitForTimeout(1500);
}

// The scroller the pointer is over at the middle of the surface.
function findScroller(surface) {
  const probe = surface === 'dashboard' || surface === 'notes' || surface === 'library'
    ? document.querySelector(`#tab-${surface}`) || document.body
    : document.getElementById(`settings-${surface}`);
  let el = probe;
  for (; el; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) break;
  }
  el = el || document.scrollingElement;
  el.dataset.sjScroller = '1';
  const r = el.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + Math.min(r.height, innerHeight) / 2);
  // Every other scroller, so one that moves on its own is seen too.
  const all = [...document.querySelectorAll('*')].filter((e) => {
    const s = getComputedStyle(e);
    return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1;
  });
  window.__sj = { frames: [], wheels: [], shifts: 0, long: [], all };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__sj.shifts += e.value;
  }).observe({ type: 'layout-shift', buffered: false });
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__sj.long.push(Math.round(e.duration));
    }).observe({ type: 'longtask', buffered: false });
  } catch {}
  const tick = (t) => {
    window.__sj.frames.push({ t, top: el.scrollTop, others: window.__sj.all.map((e) => e.scrollTop) });
    if (!window.__sj.stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    x, y, id: el.id || el.className.toString().slice(0, 40) || el.tagName,
    scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
    elements: document.querySelectorAll('*').length,
  };
}

function analyse(step) {
  const sj = window.__sj;
  sj.stop = true;
  const f = sj.frames;
  const wheelAt = (t) => sj.wheels.filter((w) => w.t <= t).pop();
  const against = [], jumps = [], idle = [], others = new Set();
  for (let i = 1; i < f.length; i++) {
    const d = f[i].top - f[i - 1].top;
    const w = wheelAt(f[i].t);
    if (d !== 0) {
      if (!w || f[i].t - w.t > 600) idle.push([Math.round(f[i].t), Math.round(d)]);
      else if (Math.sign(d) !== Math.sign(w.dy)) against.push([Math.round(f[i].t - w.t), Math.round(d)]);
      if (Math.abs(d) > step * 1.6) jumps.push(Math.round(d));
    }
    f[i].others.forEach((v, k) => {
      if (v !== f[i - 1].others[k] && sj.all[k].dataset.sjScroller !== '1') {
        const e = sj.all[k];
        others.add(e.id || e.className.toString().slice(0, 30));
      }
    });
  }
  const gaps = f.slice(1).map((x, i) => x.t - f[i].t).sort((a, b) => a - b);
  const pct = (p) => Math.round(gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))] * 10) / 10;
  return {
    against: against.slice(0, 6), jumps: jumps.slice(0, 6), idle: idle.slice(0, 6), others: [...others],
    shift: Math.round(sj.shifts * 1000) / 1000,
    frames: { n: f.length, p50: pct(0.5), p95: pct(0.95), max: Math.round(gaps[gaps.length - 1] || 0) },
    long: sj.long.slice(0, 8),
  };
}

(async () => {
  for (const surface of SURFACES) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    // LS='{"avatar-buddy":"me","bg-style":"mycelium"}' sets preferences the
    // owner runs with (the companion, the page art) and reloads.
    if (process.env.LS) {
      await page.evaluate((ls) => { for (const [k, v] of Object.entries(JSON.parse(ls))) localStorage.setItem(k, v); }, process.env.LS);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      if (await page.isVisible('#lock-password').catch(() => false)) {
        await page.fill('#lock-password', 'testpassword123');
        await page.click('#lock-submit');
      }
      await page.waitForTimeout(3000);
    }
    // CSS='...' injects a stylesheet, for trying a fix before writing it.
    // A constructed sheet: the app's CSP refuses an inline <style>.
    if (process.env.CSS) {
      await page.evaluate((css) => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }, process.env.CSS);
    }
    await open(page, surface);
    const s = await page.evaluate(findScroller, surface);
    await page.mouse.move(s.x, s.y);
    const wheel = async (dy) => {
      await page.evaluate((d) => window.__sj.wheels.push({ t: performance.now(), dy: d }), dy);
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(110);
    };
    for (let i = 0; i < STEPS; i++) await wheel(STEP);
    await page.waitForTimeout(1200);
    for (let i = 0; i < STEPS; i++) await wheel(-STEP);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(analyse, STEP);
    const bad = r.against.length || r.jumps.length || r.idle.length || r.others.length || r.shift > 0.05;
    if (bad) failures++;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${surface} ${W}`, JSON.stringify({ scroller: s.id, sh: s.scrollHeight, ch: s.clientHeight, dom: s.elements, ...r }));
    await browser.close();
  }
  console.log(failures ? `${failures} failing` : 'no jumps');
  process.exitCode = failures ? 1 : 0;
})();
