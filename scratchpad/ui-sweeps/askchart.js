// WORLD_CLASS_PLAN section 17 row 4: a chart under an Ask answer. Real notes
// are made, the real Ask is run ("how many notes per category", "chart my
// race times"), and the numbers are measured: the chart is drawn once, inside
// the answer, no wider than it, bars match the counts, the data table matches
// the chart, the PNG export produces a PNG, nothing scrolls sideways.
//
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/askchart.js
const { boot } = require('./lib.js');
const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const s = Date.now().toString(36).slice(-4);
  await page.evaluate(async (s) => {
    const make = (content, category) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, category }) });
    for (const n of [1, 2, 3]) await make(`Chartsweep ${s} note ${n} about gardening`, `Chartcat A ${s}`);
    await make(`Chartsweep ${s} one more`, `Chartcat B ${s}`);
    for (const t of ['25:10', '24:40', '24:05', '23:50']) await make(`Chartrace ${s} parkrun finished in ${t}`, `Chartcat B ${s}`);
    await loadEntries();
  }, s);
  const ask = async (q) => {
    await page.evaluate(() => switchTab('notes'));
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('#notes-subtabs button')].find((x) => (x.dataset.section || '').includes('ask'));
      if (b) b.click();
    });
    await page.waitForTimeout(500);
    await page.fill('#question', q);
    await page.evaluate(() => askQuestion());
    await page.waitForSelector('.answer-chart', { timeout: 20000 });
    await page.waitForTimeout(500);
  };
  const measure = () => page.evaluate(() => {
    const figs = [...document.querySelectorAll('.answer-chart')];
    const fig = figs[figs.length - 1];
    const host = fig.parentElement.getBoundingClientRect();
    const r = fig.getBoundingClientRect();
    const svg = fig.querySelector('svg').getBoundingClientRect();
    return {
      count: figs.length,
      title: fig.querySelector('.answer-chart-title').textContent,
      bars: fig.querySelectorAll('.ac-bar').length,
      dots: fig.querySelectorAll('.ac-dot').length,
      line: !!fig.querySelector('.ac-line'),
      rows: [...fig.querySelectorAll('tbody tr')].map((tr) => [...tr.cells].map((c) => c.textContent)),
      inside: r.left >= host.left - 1 && r.right <= host.right + 1,
      svgH: Math.round(svg.height), svgW: Math.round(svg.width),
      label: getComputedStyle(fig.querySelector('.ac-label')).fill,
      accent: getComputedStyle(fig.querySelector('.ac-bar, .ac-line')).fill + '|' + getComputedStyle(fig.querySelector('.ac-bar, .ac-line')).stroke,
      sideways: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth,
      saveH: Math.round(fig.querySelector('button').getBoundingClientRect().height),
    };
  });

  await ask('how many notes per category');
  const bars = await measure();
  console.log(JSON.stringify(bars));
  check('one chart, bars for each category, drawn once', bars.count === 1 && bars.bars >= 2);
  check('the table repeats the chart', bars.rows.length === bars.bars && bars.rows.some((r) => r[0] === `Chartcat A ${s}` && r[1] === '3'), JSON.stringify(bars.rows.slice(0, 4)));
  check('inside the answer, nothing sideways, a readable height', bars.inside && !bars.sideways && bars.svgH > 40);
  check('paint comes from tokens (rgb, not unset)', /rgb/.test(bars.label) && /rgb/.test(bars.accent), bars.label + ' ' + bars.accent);
  const png = await page.evaluate(() => new Promise((resolve) => {
    // Capture what the export saves rather than a download dialog.
    window.saveFile = async (name, blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      resolve({ name, size: blob.size, type: blob.type, magic: [...bytes.slice(1, 4)].map((b) => String.fromCharCode(b)).join('') });
    };
    document.querySelector('.answer-chart button').click();
    setTimeout(() => resolve({ timeout: true }), 8000);
  }));
  check('Save as PNG yields a real PNG', png.magic === 'PNG' && png.size > 800 && /\.png$/.test(png.name || ''), JSON.stringify(png));

  await ask(`chart my chartrace ${s} times`);
  const line = await measure();
  console.log(JSON.stringify(line));
  check('a number question draws a line with four points', line.line && line.dots === 4 && line.count === 2 || line.dots === 4);
  check('times shown as m:ss in the table', line.rows.length === 4 && line.rows.every((r) => /^\d+:\d\d$/.test(r[1])), JSON.stringify(line.rows));
  check('line inside, nothing sideways', line.inside && !line.sideways);
  check('the save button is a target high', line.saveH >= (WIDTH < 600 ? 32 : 24), String(line.saveH));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
