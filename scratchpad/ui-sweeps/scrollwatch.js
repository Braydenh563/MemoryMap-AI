// INBOX 426 (u): "a lot of pages keep auto scrolling or jumping ... the
// dashboard now as well". Every call that can move a scroller, caught at the
// source: `scrollIntoView`, `scrollTo`/`scrollBy`, a `scrollTop` write, and
// `focus()` without `preventScroll`. Each tab is opened, left alone, wheeled
// down and back, and left alone again; every call made while nobody asked
// for it is printed with the scroller it moved and the line that made it.
//
//   BASE=http://127.0.0.1:8793 TABS=dashboard,notes node scratchpad/ui-sweeps/scrollwatch.js
const { boot } = require('./lib.js');
const TABS = (process.env.TABS || 'dashboard,notes,chat,library,timeline,reminders').split(',');
const IDLE = Number(process.env.IDLE || 8000);

function install() {
  const log = (window.__sw = []);
  const where = () => (new Error().stack || '').split('\n').slice(3, 6)
    .map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?v=[^:]+/, '')).join(' < ');
  const name = (el) => (el && (el.id || (el.className && el.className.toString().split(' ')[0]) || el.tagName)) || '?';
  const scrollers = () => [...document.querySelectorAll('*')].filter((e) => e.scrollTop > 0).map((e) => [e, e.scrollTop]);
  const wrap = (proto, key, test) => {
    const orig = proto[key];
    proto[key] = function (...args) {
      if (test && !test(this, args)) return orig.apply(this, args);
      const before = new Map(scrollers());
      const out = orig.apply(this, args);
      const moved = [];
      for (const e of document.querySelectorAll('*')) {
        const was = before.get(e) || 0;
        if (Math.abs(e.scrollTop - was) > 1) moved.push(`${name(e)} ${Math.round(was)}->${Math.round(e.scrollTop)}`);
      }
      log.push({ t: Math.round(performance.now()), call: key, on: name(this), moved, at: where() });
      return out;
    };
  };
  wrap(Element.prototype, 'scrollIntoView');
  wrap(Element.prototype, 'scrollTo');
  wrap(Element.prototype, 'scrollBy');
  wrap(HTMLElement.prototype, 'focus', (el, args) => !(args[0] && args[0].preventScroll));
  const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
  Object.defineProperty(Element.prototype, 'scrollTop', {
    get() { return desc.get.call(this); },
    set(v) {
      const was = desc.get.call(this);
      desc.set.call(this, v);
      const now = desc.get.call(this);
      if (Math.abs(now - was) > 1) log.push({ t: Math.round(performance.now()), call: 'scrollTop=', on: name(this), moved: [`${Math.round(was)}->${Math.round(now)}`], at: where() });
    },
    configurable: true,
  });
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(install);
  for (const tab of TABS) {
    await page.evaluate(() => { window.__sw.length = 0; });
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(1500);
    const mark = await page.evaluate(() => performance.now());
    await page.mouse.move(720, 500);
    await page.waitForTimeout(IDLE / 2);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(120); }
    await page.waitForTimeout(IDLE / 2);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, -150); await page.waitForTimeout(120); }
    await page.waitForTimeout(IDLE / 2);
    const log = await page.evaluate(() => window.__sw.slice());
    const unasked = log.filter((e) => e.t > mark && e.moved.length);
    console.log(`${unasked.length ? 'MOVED' : 'ok   '} ${tab}: ${log.length} calls on open, ${unasked.length} that moved a scroller after it settled`);
    for (const e of log.filter((x) => x.moved.length).slice(0, 12)) console.log(`   ${e.t > mark ? 'late' : 'open'} ${e.call} on ${e.on}: ${e.moved.join(', ')}  @ ${e.at}`);
  }
  await browser.close();
})();
