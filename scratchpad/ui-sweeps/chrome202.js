// INBOX 202: what the theme switch actually costs. Which elements animate,
// which rule says so, how long the switch takes, and what runs on it.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({});
  const who = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const animating = all.filter((el) => {
      const cs = getComputedStyle(el);
      const props = cs.transitionProperty.split(',').map((s) => s.trim());
      return cs.transitionDuration !== '0s' && (props.includes('all') || props.some((p) => /color|background|border|shadow|filter/.test(p)));
    });
    const counts = {};
    for (const el of animating) {
      const cs = getComputedStyle(el);
      const key = `${cs.transitionProperty.slice(0, 60)} | ${cs.transitionDuration.slice(0, 24)}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const byTag = {};
    for (const el of animating) {
      const key = `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0] || ''}`;
      byTag[key] = (byTag[key] || 0) + 1;
    }
    return {
      total: all.length,
      animating: animating.length,
      top: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8),
      topTags: Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 8),
      blurred: all.filter((el) => getComputedStyle(el).backdropFilter !== 'none').length,
    };
  });
  console.log('202 who animates:', JSON.stringify(who));

  const cost = await page.evaluate(async () => {
    const longTasks = [];
    let observer = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) longTasks.push(Math.round(e.duration));
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) { /* not every build */ }
    const runs = [];
    for (let i = 0; i < 6; i += 1) {
      const t0 = performance.now();
      document.getElementById('theme-btn').click();
      document.body.getBoundingClientRect();
      getComputedStyle(document.body).backgroundColor;
      const sync = performance.now() - t0;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      runs.push({ sync: Math.round(sync * 100) / 100, toSecondFrame: Math.round((performance.now() - t0) * 100) / 100 });
      await new Promise((r) => setTimeout(r, 700));
    }
    observer?.disconnect();
    const med = (key) => {
      const xs = runs.map((r) => r[key]).sort((a, b) => a - b);
      return xs[Math.floor(xs.length / 2)];
    };
    return { runs, medianSync: med('sync'), medianToFrame: med('toSecondFrame'), longTasks };
  });
  console.log('202 cost:', JSON.stringify(cost));

  //: The transitions the switch actually starts, which is the thing the
  //: report calls glitchy: `document.getAnimations()` returns every running
  //: CSS transition, so this is a count rather than an inference from the
  //: stylesheets.
  const running = await page.evaluate(async () => {
    document.getElementById('theme-btn').click();
    await new Promise((r) => requestAnimationFrame(r));
    const anims = document.getAnimations();
    const props = {};
    for (const a of anims) {
      const key = a.transitionProperty || a.animationName || 'other';
      props[key] = (props[key] || 0) + 1;
    }
    const longest = anims.reduce((m, a) => {
      const d = (a.effect && a.effect.getTiming().duration) || 0;
      return Math.max(m, typeof d === 'number' ? d : 0);
    }, 0);
    return { count: anims.length, longestMs: longest, props: Object.entries(props).sort((a, b) => b[1] - a[1]).slice(0, 8) };
  });
  console.log('202 transitions started:', JSON.stringify(running));
  await browser.close();
})();
