// Debug: what costs main-thread time with her companion figure idle.
// NO=blink,rig,tip,hair,masks disables parts. Prints TaskDuration over 6s,
// rig frames, layouts and paints.
const { boot } = require('./lib.js');
const fs = require('fs');
const os = require('os');
(async () => {
  const { browser, ctx, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate(([no, look]) => {
    document.documentElement.dataset.avatarMotion = 'always';
    localStorage.setItem('atlas-look', look);
    if (no.includes('blink')) { clearTimeout(atlasBlinkTimer); atlasBlinkStart = () => {}; atlasBlinkTick = () => {}; }
    if (no.includes('rig')) atlasRigAttach = () => {};
    document.getElementById('nm-buddy')?.remove();
    const stage = document.createElement('div'); stage.id = 'cost-stage';
    Object.assign(stage.style, { position: 'fixed', right: '16px', top: '80px', zIndex: '9999' });
    document.body.append(stage);
    const holder = document.createElement('div'); holder.id = 'nm-buddy';
    Object.assign(holder.style, { position: 'relative', width: '64px', height: '92px' });
    const fig = atlasFigure(); Object.assign(fig.style, { position: 'relative', display: 'block', width: '64px', height: '92px' });
    if (no.includes('tip')) fig.querySelector('.atl-lw-tip')?.remove();
    if (no.includes('hair')) fig.querySelector('.atl-lw-hair')?.remove();
    if (no.includes('masks')) for (const el of fig.querySelectorAll('[mask]')) el.removeAttribute('mask');
    holder.append(fig); stage.append(holder);
  }, [process.env.NO || '', process.env.LOOK || 'feminine']);
  await page.waitForTimeout(2500);
  await page.evaluate(() => { window.atlasRigTrace = null; try { atlasRigTrace = []; } catch (e) {} });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const read = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const tp = `${os.tmpdir()}/costdbg-${process.pid}.json`;
  await browser.startTracing(page, { path: tp, categories: ['devtools.timeline'] });
  const a = await read();
  await page.waitForTimeout(6000);
  const b = await read();
  await browser.stopTracing();
  let paints = 0; let layouts = 0; let styles = 0;
  for (const e of JSON.parse(fs.readFileSync(tp, 'utf8')).traceEvents) {
    if (e.name === 'Paint' && e.ph === 'X') paints += 1;
    if (e.name === 'Layout' && e.ph === 'X') layouts += 1;
    if (e.name === 'UpdateLayoutTree' && e.ph === 'X') styles += 1;
  }
  fs.unlinkSync(tp);
  const rig = await page.evaluate(() => { try { return atlasRigTrace ? atlasRigTrace.length : -1; } catch (e) { return -2; } });
  console.log(JSON.stringify({ no: process.env.NO || '', taskMs: Math.round((b.TaskDuration - a.TaskDuration) * 1000), rigRows: rig, paints, layouts, styles }));
  await browser.close();
})();
