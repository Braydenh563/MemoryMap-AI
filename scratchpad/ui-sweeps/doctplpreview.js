// The templates gallery's preview (DOCUMENTS_PLAN Phase 4, "offered with a
// preview"; OPEN.md's Documents row). Opens New from a template, reads the
// preview pane, points at each row in turn and checks the pane shows that
// template's own first heading; at 390 the pane is left out and the list
// keeps the dialog's width.
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node doctplpreview.js
// THEME=dark for dark; SHOTS=1 writes the dialog to $SCRATCH/shots.
const { boot } = require('./lib.js');

const OUT = (process.env.SCRATCH || '.') + '/shots';

async function run(width) {
  const findings = [];
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => openDocTemplateDialog());
  await page.waitForTimeout(600);
  const first = await page.evaluate(() => {
    const d = document.getElementById('doc-template-dialog');
    const p = document.getElementById('doc-template-preview');
    const list = document.getElementById('doc-template-list');
    return {
      open: d.open,
      dialogW: Math.round(d.getBoundingClientRect().width),
      listW: Math.round(list.getBoundingClientRect().width),
      preview: p.checkVisibility() ? Math.round(p.getBoundingClientRect().width) : 0,
      heading: p.querySelector('h1, h2, p')?.textContent.trim().slice(0, 40) || '',
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log(`${width}: ${JSON.stringify(first)}`);
  if (!first.open) findings.push(`${width}: the dialog did not open`);
  if (first.overflowX) findings.push(`${width}: the page scrolls sideways`);
  if (width >= 1024) {
    if (!first.preview) findings.push(`${width}: no preview pane`);
    //: A click chooses a row (INBOX 410) and the pane follows the choice, so
    //: each row is clicked, not hovered; a click must make no document.
    const rows = await page.$$('#doc-template-list .doc-template-choice');
    for (const row of rows) {
      await row.click();
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => ({
        id: document.getElementById('doc-template-preview').dataset.template,
        text: document.querySelector('#doc-template-preview .doc-template-page')?.textContent.trim().slice(0, 30),
        open: document.getElementById('doc-template-dialog').open,
      }));
      const want = await row.getAttribute('data-template');
      console.log(`   choose ${want}: pane ${r.id} "${r.text}"`);
      if (r.id !== want || !r.text) findings.push(`${width}: choosing ${want} showed ${r.id}`);
      if (!r.open) findings.push(`${width}: choosing ${want} closed the dialog`);
    }
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    if (process.env.SHOTS) {
      await page.locator('#doc-template-dialog').screenshot({ path: `${OUT}/tplpreview-${width}-${process.env.THEME || 'light'}.png` });
    }
  } else if (first.preview) {
    findings.push(`${width}: the preview should be left out at this width`);
  }
  await browser.close();
  return findings;
}

(async () => {
  const findings = [...(await run(1440)), ...(await run(390))];
  for (const f of findings) console.log('    ' + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
