// Where a Files row's facts start, against where its filename starts (INBOX
// 160).
//
// The owner, verbatim: "in the files subtab files row, the metadata starts to
// the left below the filename, I feel like the metadata should start indented
// to the right of the filename", with a screenshot of a PDF row: the name on
// one line, then "PDF, 121 KB, added" and the two reader controls on the next,
// flush with the name's own left edge.
//
// So the measurement is one number per row: the left edge of the facts line
// minus the left edge of the name. Zero is the report. It also prints the
// row's other parts, because an indent applied to one of the four things under
// the name and not the others is a worse shape than no indent at all.
//
//   BASE=http://127.0.0.1:8961 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node filesindent.js
//
// Needs a non-image upload in the notebook (seed-file.js). Widths are driven
// from one browser so the numbers are comparable; non-zero on a row whose
// parts do not line up.
const { boot } = require('./lib.js');

const WIDTHS = [1440, 820, 390];

(async () => {
  const { browser, page, ctx } = await boot({ viewport: { width: WIDTHS[0], height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  let failures = 0;

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button')]
      .find((e) => /^files$/i.test((e.textContent || '').trim()));
    if (b) b.click();
  });
  await page.waitForTimeout(1800);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(700);
    const rows = await page.evaluate(() => {
      const out = [];
      for (const tile of document.querySelectorAll('#library-images-grid .library-image-tile')) {
        const name = tile.querySelector(':scope > figcaption');
        const facts = tile.querySelector(':scope > .library-file-facts');
        if (!name || !facts) continue;
        const meta = facts.querySelector(':scope > .library-file-meta');
        const strip = facts.querySelector(':scope > .library-read-strip');
        const desc = tile.querySelector(':scope > .library-image-fields');
        // The *content* edge, not the box edge: the indent is padding, so a
        // box-left reading says nothing moved while the text plainly has. This
        // cost one run of the sweep reporting an indent of 0 over a row that
        // already had one.
        const left = (e) => (e
          ? +(e.getBoundingClientRect().left + (parseFloat(getComputedStyle(e).paddingLeft) || 0)).toFixed(1)
          : null);
        out.push({
          label: (name.textContent || '').trim().slice(0, 28),
          name: left(name),
          facts: left(facts),
          meta: left(meta),
          strip: left(strip),
          desc: left(desc),
          factsWidth: +facts.getBoundingClientRect().width.toFixed(1),
          wrapped: facts.getBoundingClientRect().height > 40,
        });
      }
      return out;
    });
    if (!rows.length) {
      console.log(`${width}px: no file rows found, seed one with seed-file.js`);
      failures += 1;
      continue;
    }
    console.log(`\n--- ${width}px, ${rows.length} row(s)`);
    for (const r of rows) {
      const indent = +(r.facts - r.name).toFixed(1);
      const bad = [];
      // The ask: the facts start to the right of the name, not under it.
      if (indent <= 0) bad.push(`facts start ${indent}px from the name's left edge (INBOX 160)`);
      // And everything under the name shares one edge: two indents is a ragged
      // left margin, which is worse than the flush version the report is about.
      if (r.meta !== null && Math.abs(r.meta - r.facts) > 1) bad.push(`the meta line is ${+(r.meta - r.facts).toFixed(1)}px off the facts line`);
      if (r.desc !== null && Math.abs(r.desc - r.facts) > 1) bad.push(`the description is ${+(r.desc - r.facts).toFixed(1)}px off the facts line`);
      failures += bad.length;
      console.log(`  ${r.label.padEnd(30)} name@${r.name}  facts@${r.facts} (indent ${indent})  `
        + `meta@${r.meta} strip@${r.strip} desc@${r.desc}  facts ${r.factsWidth}px${r.wrapped ? ' wrapped' : ''}`);
      for (const line of bad) console.log(`      ${line}`);
    }
  }

  for (const line of errs) console.log(`    console: ${line}`);
  failures += errs.length;
  console.log(failures ? `\nFAIL: ${failures} findings` : '\nPASS: 0 findings');
  await ctx.close();
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
