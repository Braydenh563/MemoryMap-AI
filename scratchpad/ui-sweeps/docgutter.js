// INBOX 262 (2): "the page numbers and collapse arrows in the documents clash
// with other page numnbers". Reproduced with a fenced code block, which is
// where the report's screenshot is: numbers 6 and 7 drawn on top of each
// other, and 8 and 9 likewise.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
  await page.waitForTimeout(5000);
  const id = await page.evaluate(async () => {
    const doc = await apiJson('/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Gutter probe',
        content: 'One\nTwo\nThree\nFour\nFive\n```python\nyour code\n```\n\nA sort of projects feature.\n',
      }),
    });
    return doc.id;
  });
  await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, id);
  await page.waitForTimeout(4500);
  // The gutter is off for markdown by default; turn it on the way a person
  // does, then off, then on: the collision only came back on the *second*
  // switch-on, because the first one happened to coincide with a rebuild the
  // decorations were doing anyway.
  for (const want of [true, false, true]) {
  await page.evaluate((v) => { setDocGutter(v); }, want);
  await page.waitForTimeout(2000);
  console.log('gutter', want, JSON.stringify(await page.evaluate(() => {
    const nums = [...document.querySelectorAll('.cm-lineNumbers .cm-gutterElement')]
      // CodeMirror keeps one hidden element per gutter holding the widest
      // number it expects, purely to size the column. It sits before line 1
      // with `visibility: hidden`, so reading it as a row put a phantom "99
      // paints into 1" on every report.
      .filter((e) => e.textContent.trim() && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        return { n: e.textContent.trim(), top: Math.round(r.top), h: Math.round(r.height), bottom: Math.round(r.bottom), lineHeight: Math.round(lh), glyphOverflow: Math.round(lh - r.height) };
      });
    const overlaps = [];
    for (let i = 1; i < nums.length; i++) {
      const gap = nums[i].top - nums[i - 1].bottom;
      if (gap < -1) overlaps.push(`${nums[i - 1].n}/${nums[i].n} boxes overlap ${-gap}px`);
      const painted = nums[i - 1].top + nums[i - 1].lineHeight;
      if (painted - nums[i].top > 1) overlaps.push(`${nums[i - 1].n} paints ${Math.round(painted - nums[i].top)}px into ${nums[i].n}`);
    }
    const folds = [...document.querySelectorAll('.cm-foldGutter .cm-gutterElement')]
      .filter((e) => e.textContent.trim())
      .map((e) => { const r = e.getBoundingClientRect(); return { t: e.textContent.trim(), top: Math.round(r.top), h: Math.round(r.height) }; });
    const fences = [...document.querySelectorAll('.cm-md-fence')]
      .map((e) => Math.round(e.getBoundingClientRect().height));
    return { gutterOn: nums.length > 0, numbers: nums.filter((n) => ['5','6','7','8','9'].includes(n.n)), overlaps, fences, folds };
  }), null, 1));
  }
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
