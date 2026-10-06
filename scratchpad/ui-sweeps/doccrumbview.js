// DOCUMENTS_PLAN 17d: the breadcrumb says where you are reading, not only
// where the caret was left.
//
// Measured 2026-10-04 before the change: a 21k-word document scrolled to 60%
// with the caret on line 1 showed `Top > Annual report` in the trail while the
// outline marked the section in view. Both rows answer "where am I"; now they
// share the outline's rule (the caret's section while the caret is on screen,
// the top of the view otherwise).
//
//   BASE=http://127.0.0.1:8852 node scratchpad/ui-sweeps/doccrumbview.js
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
  const crumbs = [...document.querySelectorAll('#doc-crumbs .doc-crumb')].map((b) => b.textContent.trim());
  const cur = document.querySelector('#doc-outline .is-current');
  return {
    trail: crumbs.join(' > '),
    last: crumbs[crumbs.length - 1] || '',
    outline: cur ? cur.textContent.replace(/\s+/g, ' ').trim() : null,
    scrollTop: Math.round(document.querySelector('#doc-editor .cm-scroller').scrollTop),
  };
});

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await openDoc(page, { title: 'Crumb view sweep', content: build(12) });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(800);
  const at0 = await read(page);
  check('top: the trail names the document heading', /Annual report$/.test(at0.trail), at0);

  // The caret stays on line 1; only the view moves.
  for (const f of [0.35, 0.6, 0.9]) {
    await page.evaluate((f) => {
      const s = document.querySelector('#doc-editor .cm-scroller');
      s.scrollTop = s.scrollHeight * f;
    }, f);
    await page.waitForTimeout(1500);
    const m = await read(page);
    console.log(f, JSON.stringify(m));
    check(`${Math.round(f * 100)}%: the trail ends in the section in view`, /^Section \d+\.\d+$/.test(m.last), m);
    check(`${Math.round(f * 100)}%: the trail and the outline mark agree`, m.outline && m.outline.startsWith(m.last), m);
  }

  // Scroll back to the caret: the caret's section takes over again.
  await page.evaluate(() => { document.querySelector('#doc-editor .cm-scroller').scrollTop = 0; });
  await page.waitForTimeout(800);
  const back = await read(page);
  check('back at the caret: the trail is the caret\'s again', /Annual report$/.test(back.trail), back);

  // Click into a paragraph: the trail follows the caret while it is on screen.
  await page.evaluate(() => { document.querySelector('#doc-editor .cm-scroller').scrollTop = 6000; });
  await page.waitForTimeout(800);
  await page.locator('#doc-editor .cm-line').nth(6).click();
  await page.waitForTimeout(500);
  const clicked = await read(page);
  check('caret on screen: the trail is the caret\'s section, and agrees with the outline',
    /^Section \d+\.\d+$/.test(clicked.last) && clicked.outline && clicked.outline.startsWith(clicked.last), clicked);

  await browser.close();
  const failed = out.filter((c) => !c.ok);
  for (const c of out) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : JSON.stringify(c.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(failed.length ? 1 : 0);
})();
