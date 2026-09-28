// A CPU profile of one interaction, by self time and by inclusive time per
// function (INBOX 400 (1)). Style and layout forced from script show up as
// "(program)"-adjacent native frames under the function that forced them.
//   TAB=library FROM=notes node scratchpad/ui-sweeps/f2-prof.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((x) => switchTab(x), process.env.FROM || 'notes');
  await page.waitForTimeout(2500);
  if (process.env.EXP_CSS) {
    await page.evaluate((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }, process.env.EXP_CSS);
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  //: WHEEL=<selector>: a real wheel scroll over that element instead of a tab
  //: switch, for what runs while a list scrolls.
  if (process.env.WHEEL) {
    const b = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 200 }; }, process.env.WHEEL);
    await page.mouse.move(b.x, b.y);
    for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 160); await page.waitForTimeout(40); }
  } else if (process.env.ACTION) await page.evaluate(process.env.ACTION);
  else await page.evaluate((x) => switchTab(x), process.env.TAB || 'library');
  await page.waitForTimeout(+(process.env.WAIT || 2000));
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const self = {}, incl = {};
  const dt = profile.timeDeltas;
  const name = (n) => `${n.callFrame.functionName || '(anon)'}@${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber + 1}`;
  profile.samples.forEach((id, i) => {
    const ms = (dt[i] || 0) / 1000;
    const n = byId.get(id);
    self[name(n)] = (self[name(n)] || 0) + ms;
    const seen = new Set();
    for (let cur = id; cur; cur = parent.get(cur)) {
      const k = name(byId.get(cur));
      if (seen.has(k)) continue;
      seen.add(k);
      incl[k] = (incl[k] || 0) + ms;
    }
  });
  const top = (o, n) => Object.entries(o).filter(([k]) => !/^\((root|idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${v.toFixed(1).padStart(7)}  ${k}`).join('\n');
  console.log('SELF\n' + top(self, +(process.env.N || 15)));
  console.log('INCLUSIVE\n' + top(incl, +(process.env.N || 25)));
  await browser.close();
})();
