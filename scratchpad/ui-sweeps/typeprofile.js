// What a keystroke costs in the chat composer (or TARGET=notes, the capture
// box): 40 keys under a devtools.timeline trace, and per key the style
// recalcs, layouts (and the forced ones, with the JS function that forced
// them), and the script by function from the sampling profiler.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     TARGET=chat node scratchpad/ui-sweeps/typeprofile.js
const { boot } = require('./lib.js');

const TARGET = process.env.TARGET || 'chat';

(async () => {
  const { browser, page } = await boot({});
  try {
    const cdp = await page.context().newCDPSession(page);
    if (TARGET === 'chat') {
      await page.evaluate(() => switchTab('chat'));
      await page.waitForTimeout(1500);
      await page.evaluate(() => { document.getElementById('chat-input').disabled = false; });
      await page.click('#chat-input');
    } else {
      await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
      await page.waitForTimeout(1500);
      await page.click('#entry-content').catch(() => {});
    }
    await page.waitForTimeout(600);
    await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack'] });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');
    for (const ch of 'the quick brown fox jumps over the lazy d') await page.keyboard.type(ch, { delay: 60 });
    await page.waitForTimeout(400);
    const { profile } = await cdp.send('Profiler.stop');
    const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
    const counts = {};
    const dur = {};
    const forcedBy = {};
    let styleEls = 0;
    for (const e of ev) {
      if (e.ph !== 'X' && e.ph !== 'B') continue;
      if (['UpdateLayoutTree', 'Layout', 'Paint', 'PrePaint', 'Layerize', 'FunctionCall', 'EventDispatch'].includes(e.name)) {
        counts[e.name] = (counts[e.name] || 0) + 1;
        dur[e.name] = (dur[e.name] || 0) + (e.dur || 0) / 1000;
      }
      if (e.name === 'UpdateLayoutTree') styleEls += e.args?.elementCount || e.args?.beginData?.elementCount || 0;
      if (e.name === 'Layout' || e.name === 'UpdateLayoutTree') {
        const st = e.args?.beginData?.stackTrace;
        if (st && st.length) {
          const k = `${e.name === 'Layout' ? 'layout' : 'style'} by ${st[0].functionName}@${(st[0].url || '').split('/').pop().split('?')[0]}:${st[0].lineNumber}`;
          forcedBy[k] = (forcedBy[k] || 0) + 1;
        }
      }
    }
    console.log(`${TARGET}: 40 keys`);
    for (const k of Object.keys(counts)) console.log(`  ${k}: ${counts[k]} (${Math.round(dur[k])}ms)`);
    console.log(`  elements restyled: ${styleEls}`);
    for (const [k, v] of Object.entries(forcedBy).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  forced ${v}x ${k}`);
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    profile.samples.forEach((id, i) => {
      const f = byId.get(id).callFrame;
      if (['(idle)', '(program)', '(root)'].includes(f.functionName)) return;
      const k = `${f.functionName || '(anon)'}@${(f.url || '').split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
      self.set(k, (self.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000);
    });
    for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${Math.round(v)}ms self  ${k}`);
    // Inclusive time per app function (each sample counted once per distinct
    // function on its stack), which is what names the caller of a costly
    // built-in like querySelectorAll.
    const parent = new Map();
    for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
    const incl = new Map();
    profile.samples.forEach((id, i) => {
      const seen = new Set();
      for (let n = id; n != null; n = parent.get(n)) {
        const f = byId.get(n).callFrame;
        if (!f.url || !/\/frontend\/|localhost|127\.0\.0\.1/.test(f.url) || /codemirror|p5\.min|d3\./.test(f.url)) continue;
        const k = `${f.functionName || '(anon)'}@${f.url.split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
        if (seen.has(k)) continue;
        seen.add(k);
        incl.set(k, (incl.get(k) || 0) + (profile.timeDeltas[i] || 0) / 1000);
      }
    });
    for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${Math.round(v)}ms incl  ${k}`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
