// The SVG renderer's PNG export makes no CSP noise, and still paints.
//
// `graphInlineComputedStyle` (graph.js) copied each element's resolved style
// onto the export clone as a `style` attribute written with `setAttribute`.
// The page's CSP refuses inline styles, so every element logged a violation:
// hundreds of console errors for one export of a large map, while the
// attribute was kept and the picture came out right. It writes presentation
// attributes now. This drives the SVG renderer (the dev fallback,
// `localStorage["graph-renderer"] = "svg"`), exports, and counts:
//
//   1. `securitypolicyviolation` events and console errors during the export
//      (must be 0);
//   2. that the serialised clone still carries a fill on its circles (read
//      from the string handed to the rasteriser), so the fix did not trade
//      the noise for a colourless picture;
//   3. that a PNG blob came out.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphexportcsp.js
const { boot } = require('./lib.js');

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

(async () => {
  const { browser, page, ctx } = await boot({});
  await page.evaluate(() => localStorage.setItem('graph-renderer', 'svg'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
    await page.waitForTimeout(3000);
  }
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(6000);
  const circles = await page.evaluate(() => document.querySelectorAll('#graph-svg circle').length);
  check('the SVG renderer drew the map', circles > 0, `${circles} circles`);

  let consoleErrors = 0;
  page.on('console', (m) => { if (m.type() === 'error') { consoleErrors += 1; if (consoleErrors <= 3) console.log('  console: ' + m.text().slice(0, 240)); } });
  const out = await page.evaluate(async () => {
    let violations = 0;
    const onViolation = () => { violations += 1; };
    document.addEventListener('securitypolicyviolation', onViolation);
    let svgString = '';
    const realRaster = graphRasterizeSvg;
    graphRasterizeSvg = (str, w, h) => { svgString = str; return realRaster(str, w, h); };
    let blob = null;
    const realSave = saveFile;
    saveFile = async (name, b) => { blob = b; };
    try {
      await exportGraphPng();
    } finally {
      graphRasterizeSvg = realRaster;
      saveFile = realSave;
    }
    await new Promise((r) => setTimeout(r, 300));
    document.removeEventListener('securitypolicyviolation', onViolation);
    //: Read as text, not with DOMParser: parsing the string back into a
    //: document in this page applies the page's CSP to every cloned `style`
    //: attribute in it, and this sweep's first draft counted its own 429
    //: parse-time refusals as the export's.
    const cs = svgString.match(/<circle\b[^>]*>/g) || [];
    const filled = cs.filter((c) => / fill="[^"]+"/.test(c) || /style="[^"]*fill:/.test(c)).length;
    return { violations, circles: cs.length, filled, blob: blob ? blob.size : 0 };
  });
  check('no CSP violation during the export', out.violations === 0, `${out.violations} violations`);
  check('no console error during the export', consoleErrors === 0, `${consoleErrors} errors`);
  check('every exported circle still carries its fill', out.circles > 0 && out.filled === out.circles, `${out.filled} of ${out.circles}`);
  check('a PNG came out', out.blob > 1000, `${out.blob} bytes`);

  await page.evaluate(() => localStorage.removeItem('graph-renderer'));
  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
