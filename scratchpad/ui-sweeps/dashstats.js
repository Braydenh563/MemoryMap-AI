const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    const t = performance.now();
    try { const s = await Promise.race([apiJson('/insights/stats'), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 20s')), 20000))]);
      return { ms: Math.round(performance.now() - t), keys: Object.keys(s).slice(0, 12) };
    } catch (e) { return { ms: Math.round(performance.now() - t), err: String(e) }; }
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
