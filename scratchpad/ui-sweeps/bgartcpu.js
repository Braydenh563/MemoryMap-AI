// Brief 95: each background style's CPU time per frame at 1440x900, the
// number its Settings card's tier is read from (`BG_ART_COST`, bg-art.js).
// The wall-clock sweep next to this one times frames with performance.now(),
// and on a shared four-core machine at load 15 the same style measured 1.2ms
// and 5.1ms minutes apart. This reads the renderer main thread's own CPU
// time (CDP Performance.getMetrics `ThreadTime`) around FRAMES frames drawn
// back to back on a CPU-backed canvas, each followed by a one-pixel read so
// the raster is paid inside the window, the way the art's loop draws them
// (wash or clear, then the frame).
//   BASE=http://127.0.0.1:8793 node scratchpad/ui-sweeps/bgartcpu.js
// STYLES narrows, THEMES picks, FRAMES (default 90), RUNS (default 3; the
// minimum is reported, since contention only ever adds).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8793';
const STYLES = (process.env.STYLES || 'aurora,constellation,waves,bubbles,mesh,microbes,mycelium,dusk,ripples,fireflies,rain').split(',');
const THEMES = (process.env.THEMES || 'light,dark').split(',');
const FRAMES = Number(process.env.FRAMES || 90);
const RUNS = Number(process.env.RUNS || 3);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.__bgArtCpu = true; });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof BG_ART_BUILDERS === 'object' && typeof bgArtSurface === 'function', null, { timeout: 30000 });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable', { timeDomain: 'threadTicks' });
  const cpu = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'ThreadTime').value * 1000;
  const worst = {};
  for (const theme of THEMES) for (const name of STYLES) {
    let best = Infinity;
    for (let r = 0; r < RUNS; r++) {
      await page.evaluate(([name, dark]) => {
        const entry = BG_ART_BUILDERS[name];
        const shim = {};
        const c = { dark, baseHue: 230, density: 1, seedText: 'MemoryMap', still: false };
        const style = entry(shim, c);
        const pd = Math.min(style.pixelDensity || 1, 1);
        const surface = bgArtSurface(pd, Math.min(style.pixelDensityY || pd, pd));
        Object.assign(shim, surface);
        Object.defineProperty(shim, 'frameCount', { get: () => surface.frameCount });
        shim.twin = null;
        style.init();
        window.__bench = { style, surface, wash: bgP5Rgba(0, 0, dark ? 12 : 98, dark ? 0.1 : 0.12) };
        for (let i = 0; i < 10; i++) { surface.frameCount++; style.frame(surface.frameCount * 0.01); }
        surface.drawingContext.getImageData(0, 0, 1, 1);
      }, [name, theme === 'dark']);
      const t0 = await cpu();
      await page.evaluate((frames) => {
        const { style, surface, wash } = window.__bench;
        const g = surface.drawingContext;
        for (let i = 0; i < frames; i++) {
          surface.frameCount++;
          if (style.background === 'wash') { g.fillStyle = wash; g.fillRect(0, 0, surface.width, surface.height); }
          else if (style.background === 'clear') surface.clear();
          style.frame(surface.frameCount * 0.01);
          g.getImageData(0, 0, 1, 1);
        }
      }, FRAMES);
      const t1 = await cpu();
      best = Math.min(best, (t1 - t0) / FRAMES);
    }
    worst[name] = Math.max(worst[name] || 0, best);
    console.log(`${theme.padEnd(5)} ${name.padEnd(13)} ${best.toFixed(3)}ms CPU a frame (min of ${RUNS} runs of ${FRAMES})`);
  }
  console.log('worst of the themes:', JSON.stringify(Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, Number(v.toFixed(2))]))));
  await browser.close();
})();
