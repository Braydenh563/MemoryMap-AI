// INBOX 852: flick through the Library sub-tabs at DELAY ms and measure what a
// frame could show wrongly: layout shift, two sections visible at once, an
// empty state shown while its section has data, and the panel's height drop.
//
//   BASE=http://127.0.0.1:8878 DELAY=50 node scratchpad/ui-sweeps/libflick.js
const { boot } = require('./lib.js');
(async () => {
  const w = +(process.env.W || 1440), h = +(process.env.H || 900);
  const { browser, page } = await boot({ viewport: { width: w, height: h } });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async (delay) => {
    let cur = ''; const tabs = [...document.querySelectorAll('#library-subtabs button')];
    const _ss = window.showSkeletons; window.__sk = []; window.showSkeletons = function (c, n, t) { window.__sk.push((c && c.id) + ' kids' + (c && c.children.length) + ' loaded=' + (typeof libraryImagesLoaded !== 'undefined' && libraryImagesLoaded) + ' ' + (new Error().stack.split('\n')[2] || '').trim().slice(0, 80)); return _ss(c, n, t); };
    const out = { cls: 0, multi: 0, empty: 0, frames: 0, minH: 1e9, maxH: 0, tabs: tabs.length, notes: [] };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { out.cls += e.value; (out.src = out.src || []).push(cur + ' ' + e.value.toFixed(3) + ' ' + (e.sources || []).map((s) => (s.node && ((s.node.id || s.node.className || s.node.nodeName) + '@' + Math.round(s.previousRect.y) + '>' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '>' + Math.round(s.currentRect.height)))).join('|').slice(0, 400)); } })
      .observe({ type: 'layout-shift', buffered: false });
    const ids = [...document.querySelectorAll('.library-view-section')].map((e) => e.id);
    let stop = false; let prevH = null;
    const frame = () => {
      out.frames++;
      const vis = ids.map((i) => document.getElementById(i)).filter((e) => e && !e.classList.contains('hidden') && e.offsetParent);
      if (vis.length > 1) out.multi++;
      for (const s of vis) {
        for (const el of s.querySelectorAll('[id$="-empty"]')) {
          if (!el.classList.contains('hidden') && el.offsetParent) {
            out.empty++; if (out.notes.length < 6) out.notes.push(s.id + ' ' + el.id);
          }
        }
      }
      const area = document.getElementById('tab-library');
      const hh = area ? area.scrollHeight : 0;
      if (hh) { out.minH = Math.min(out.minH, hh); out.maxH = Math.max(out.maxH, hh); }
      if (!stop) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    out.rounds = [];
    for (let round = 0; round < 3; round++) {
      const c0 = out.cls;
      for (const t of tabs) { cur = t.textContent.trim() + (t.dataset.mediaKind ? ':' + t.dataset.mediaKind : ''); t.click(); await new Promise((r) => setTimeout(r, delay)); }
      await new Promise((r) => setTimeout(r, 300)); out.rounds.push(+(out.cls - c0).toFixed(3));
    }
    await new Promise((r) => setTimeout(r, 1500));
    stop = true;
    out.sk = window.__sk;
    return out;
  }, +(process.env.DELAY || 50));
  console.log(JSON.stringify(r));
  await browser.close();
})();
