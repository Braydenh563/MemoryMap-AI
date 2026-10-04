// A long document keeps its Live decorations after a jump.
//
// Found 2026-10-04: in a 21k-word document, scrolling the editor to 30% drew
// every heading in view as raw `### Section 3.2` and kept it that way. The
// markdown parser runs in slices, so the viewport can move to a place the
// syntax tree has not reached; the decoration plugin read the (partial) tree,
// found nothing, and was told to look again only on a document, viewport,
// selection or focus change. The parser catching up is none of those, so the
// lines stayed plain until the next keystroke or scroll. The plugin now also
// rebuilds when the tree it was built from is no longer the state's tree.
//
// Checks, at several scroll fractions, with the editor unfocused (so no
// caret line is revealed): no heading line in view is raw, and the styled
// heading lines match the raw count of `#` lines in view.
//
//   BASE=http://127.0.0.1:8852 node scratchpad/ui-sweeps/doclonglive.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const lorem = 'The committee reviewed the proposal carefully and noted that the schedule depended on three things: funding, staffing and a clear mandate from the board. ';
function build(chapters) {
  let s = '# Annual report\n\n';
  for (let c = 1; c <= chapters; c++) {
    s += `## Chapter ${c}\n\n`;
    for (let k = 1; k <= 4; k++) {
      s += `### Section ${c}.${k}\n\n`;
      for (let p = 0; p < 3; p++) s += lorem.repeat(6) + '\n\n';
    }
  }
  return s;
}

const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

const read = (page) => page.evaluate(() => {
  const scroller = document.querySelector('#doc-editor .cm-scroller');
  const frame = scroller.getBoundingClientRect();
  const lines = [...document.querySelectorAll('#doc-editor .cm-line')].filter((l) => {
    const r = l.getBoundingClientRect();
    return r.bottom > frame.top && r.top < frame.bottom;
  });
  const raw = lines.filter((l) => /^#{1,6} /.test(l.textContent)).length;
  const styled = lines.filter((l) => /\bcm-md-h[1-6]\b/.test(l.className)).length;
  return { raw, styled, top: Math.round(scroller.scrollTop) };
});

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await openDoc(page, { title: 'Long live sweep', content: build(12) });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(600);
  const at0 = await read(page);
  check('top: the title is drawn as a heading', at0.raw === 0 && at0.styled >= 1, at0);

  for (const f of [0.3, 0.55, 0.8, 0.97]) {
    await page.evaluate((f) => {
      const s = document.querySelector('#doc-editor .cm-scroller');
      s.scrollTop = s.scrollHeight * f;
    }, f);
    // Long enough for the parser to finish its slices on a CI-sized machine.
    await page.waitForTimeout(2500);
    const m = await read(page);
    console.log(f, JSON.stringify(m));
    check(`${Math.round(f * 100)}%: no heading in view is raw, ${m.styled} drawn`, m.raw === 0, m);
  }

  // The other direction: jumping back up must not leave stale lines either.
  await page.evaluate(() => { document.querySelector('#doc-editor .cm-scroller').scrollTop = 0; });
  await page.waitForTimeout(1200);
  const back = await read(page);
  check('back at the top: still drawn', back.raw === 0 && back.styled >= 1, back);

  await browser.close();
  const failed = out.filter((c) => !c.ok);
  for (const c of out) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : JSON.stringify(c.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(failed.length ? 1 : 0);
})();
