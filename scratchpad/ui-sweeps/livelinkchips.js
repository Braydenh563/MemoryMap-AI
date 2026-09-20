// INBOX 232's remaining half: "link chips wrap oddly" in the Live view.
// A chip that wraps across two lines is the case; the question is whether
// both halves keep the chip's padding and rounding or the second one comes
// out square and flush.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(5000);
  const made = await page.evaluate(async () => {
    const doc = await apiJson('/documents', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Link chip wrap',
        content:
          'Some words before it so the line is nearly full and the next one has to break, ' +
          '[[A rather long note name that will not fit on one line at all]] and then more words after.',
      }),
    });
    return doc.id;
  });
  await page.evaluate((id) => { switchTab('documents'); setTimeout(() => openDocument(id), 200); }, made);
  await page.waitForTimeout(4000);
  const shot = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.cm-md-wiki')];
    return chips.map((c) => {
      const rects = [...c.getClientRects()].map((r) => ({ w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) }));
      const style = getComputedStyle(c);
      return {
        text: c.textContent.slice(0, 40),
        lines: rects.length,
        rects,
        decorationBreak: style.boxDecorationBreak || style.webkitBoxDecorationBreak,
        padding: style.padding,
        radius: style.borderRadius,
      };
    });
  });
  console.log(JSON.stringify(shot, null, 1));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
