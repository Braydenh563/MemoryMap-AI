// Lab: which animation shapes stay on the compositor in this Chromium. Each case
// is a blank page with one animated test box (nothing else running), and reads
// CDP style recalcs over 1.2s. Standalone: needs no server.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const O = "{ duration: 7200, iterations: Infinity, easing: 'ease-in-out' }";
  const cases = {
    'none': '',
    'transform small alt': "el.animate([{ transform: 'rotate(-0.9deg)' }, { transform: 'rotate(0.9deg)' }], { ...O, direction: 'alternate' })",
    'rotate small alt': "el.animate([{ rotate: '-0.9deg' }, { rotate: '0.9deg' }], { ...O, direction: 'alternate' })",
    'rotate big noalt': "el.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], O)",
    'translate small alt': "el.animate([{ translate: '-0.5px 0.7px' }, { translate: '0.6px -0.8px' }], { ...O, direction: 'alternate' })",
    'transform + rotate, same el': "el.animate([{ transform: 'scale(0.99,1.018)' }, { transform: 'none' }], O); el.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'transform on el, rotate on child': "el.animate([{ transform: 'scale(0.99,1.018)' }, { transform: 'none' }], O); el.firstChild.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'transform + transform(add)': "el.animate([{ transform: 'scale(0.99,1.018)' }, { transform: 'none' }], O); el.animate([{ transform: 'rotate(-9deg)' }, { transform: 'rotate(9deg)' }], { ...O, direction: 'alternate', composite: 'add' })",
    'svg root: transform only': "const s = document.querySelector('svg'); s.animate([{ transform: 'scale(0.99,1.018)' }, { transform: 'none' }], O)",
    'svg root: rotate only': "const s = document.querySelector('svg'); s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'svg root: translate only': "const s = document.querySelector('svg'); s.animate([{ translate: '-1px 1px' }, { translate: '1px 1px' }], { ...O, direction: 'alternate' })",
    'svg root: rotate, will-change rotate': "const s = document.querySelector('svg'); s.style.willChange = 'rotate'; s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'svg root: rotate, display block': "const s = document.querySelector('svg'); s.style.display = 'block'; s.style.position = 'absolute'; s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'svg root: rotate, transform-box fill-box': "const s = document.querySelector('svg'); s.style.transformBox = 'fill-box'; s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'svg root: rotate, transform-origin px': "const s = document.querySelector('svg'); s.style.transformOrigin = '31px 31px'; s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'svg root: rotate, will-change transform': "const s = document.querySelector('svg'); s.style.willChange = 'transform'; s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
    'svg root: rotate via transform kf + translate transform(not both)': "const s = document.querySelector('svg'); s.animate([{ transform: 'rotate(-9deg)' }, { transform: 'rotate(9deg)' }], { ...O, direction: 'alternate' })",
    'svg root: transform + rotate': "const s = document.querySelector('svg'); s.animate([{ transform: 'scale(0.99,1.018)' }, { transform: 'none' }], O); s.animate([{ rotate: '-9deg' }, { rotate: '9deg' }], { ...O, direction: 'alternate' })",
  };
  for (const [name, code] of Object.entries(cases)) {
    const page = await browser.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.setContent('<body style="margin:0"><div id="e" style="position:fixed;left:300px;top:300px;width:64px;height:92px;background:red"><div style="width:30px;height:30px;background:blue"></div></div><svg width="64" height="92" style="position:fixed;left:500px;top:300px"><circle cx="30" cy="40" r="20"/></svg></body>');
    await page.evaluate(`const O = ${O}; const el = document.getElementById('e'); ${code}`);
    await page.waitForTimeout(400);
    const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    const a = await m(); await page.waitForTimeout(1200); const b = await m();
    console.log(name.padEnd(36), 'recalcs', b.RecalcStyleCount - a.RecalcStyleCount);
    await page.close();
  }
  await browser.close();
})();
