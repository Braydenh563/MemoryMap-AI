// INBOX 263 (1): "the what it learned tab ui needs some ui and ux refinement
// because it is messy and not consistent with the design.md rules and the rest
// of the application". The screenshot showed every row reading
// "Night shiftReads notes you have added or changed": the hint inline with its
// own title. Measured against a `.setting-check` that predates this screen, so
// "consistent with the rest of the application" is a number, not an opinion.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);
  await page.evaluate(() => openSettingsModal('learned'));
  await page.waitForTimeout(3000);
  console.log(JSON.stringify(await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#learned-switches .setting-check')];
    const read = (r) => {
      const b = r.getBoundingClientRect();
      const span = r.querySelector('span');
      const small = r.querySelector('small');
      const cs = getComputedStyle(r);
      return {
        cls: r.className,
        w: Math.round(b.width), h: Math.round(b.height),
        display: cs.display, cols: cs.gridTemplateColumns,
        radius: cs.borderTopLeftRadius,
        // The tell from the screenshot: title and hint on one line.
        titleBottom: span && small ? Math.round(small.getBoundingClientRect().top - span.getBoundingClientRect().top) : null,
        hintOwnLine: small ? small.getBoundingClientRect().left <= span.getBoundingClientRect().left + 1 : null,
        text: r.textContent.trim().slice(0, 48),
      };
    };
    // A `.setting-check` from a screen that predates this one, to compare with.
    const ref = document.getElementById('local-only-wrap');
    return {
      count: rows.length,
      master: read(document.querySelector('.learned-master')),
      first: read(document.querySelector('.learned-switch-stack .setting-check')),
      last: read([...document.querySelectorAll('.learned-switch-stack .setting-check')].pop()),
      ref: ref ? read(ref) : null,
      widths: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().width)))],
    };
  }), null, 1));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
