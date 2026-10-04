// The document properties panel reads a note type (GRAPH_PLAN, "Still open
// after KG1 to KG9"): a document that says `type: Meeting` shows the type's
// unwritten fields as empty rows, and a value written there lands in the
// block as one line, leaving the other lines alone.
//
//   BASE=http://127.0.0.1:8798 node scratchpad/ui-sweeps/doctypeprops.js
const { boot, OUT } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const DOC = ['---', 'type: Meeting', 'date: 2026-10-04', '---', '', '# Standup', '', 'Notes.'].join('\n');
const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(async () => {
    const types = await apiJson('/note-types');
    if (!types.some((t) => t.name === 'Meeting')) {
      await apiJson('/note-types', { method: 'POST', body: JSON.stringify({
        name: 'Meeting',
        fields: [{ name: 'attendees', kind: 'list' }, { name: 'date', kind: 'date' }, { name: 'done', kind: 'checkbox' }, { name: 'room', kind: 'text' }],
      }) });
    }
  });
  await openDoc(page, { title: 'Type rows sweep', content: DOC });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(1200);

  const seen = await page.evaluate(() => {
    const host = document.querySelector('#doc-editor .doc-props');
    const rows = host ? [...host.querySelectorAll('.doc-prop-row')] : [];
    const box = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    return {
      hidden: host ? host.classList.contains('hidden') : null,
      keys: rows.map((r) => r.querySelector('.doc-prop-key').textContent),
      unset: [...host.querySelectorAll('.doc-prop-unset .doc-prop-key')].map((e) => e.textContent),
      controls: [...host.querySelectorAll('.doc-prop-unset input')].map((i) => i.type),
      boxes: rows.map(box),
      scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      rights: [...host.querySelectorAll('.doc-prop-row input.doc-prop-input')].map((i) => Math.round(i.getBoundingClientRect().right)),
      doc: docText(),
    };
  });
  check('the type shows its unwritten fields', seen.unset.join(',') === 'attendees,done,room', seen.unset.join(','));
  check('a written field is not offered again', !seen.unset.includes('date'), seen.unset.join(','));
  check('each field has the control its kind needs', seen.controls.join(',') === 'text,checkbox,text', seen.controls.join(','));
  check('nothing is written until a value is', seen.doc === DOC, JSON.stringify(seen.doc));
  check('no sideways page scroll', seen.scrollW <= seen.clientW, `${seen.scrollW} > ${seen.clientW}`);
  const widths = seen.boxes.map((b) => b[2]);
  check('written and unwritten fields end on one edge', new Set(seen.rights).size === 1, seen.rights.join(','));
  check('every row has the same width', new Set(widths).size === 1, widths.join(','));

  if (process.env.SHOT) {
    const panel = await page.$('#doc-editor .doc-props');
    if (panel) await panel.screenshot({ path: `${OUT}/doctypeprops-${process.env.W || 1440}.png` });
  }

  // A list field: type values and press Enter (a text field's change), see one line appear.
  await page.fill('.doc-prop-unset input[aria-label^="attendees"]', 'Sam, Ada');
  await page.press('.doc-prop-unset input[aria-label^="attendees"]', 'Enter');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    doc: docText(),
    unset: [...document.querySelectorAll('.doc-props .doc-prop-unset .doc-prop-key')].map((e) => e.textContent),
    chips: [...document.querySelectorAll('.doc-props .doc-prop-chip')].map((e) => e.textContent.trim()),
  }));
  check('the value is one new line above the closing fence',
    after.doc === DOC.replace('date: 2026-10-04\n---', 'date: 2026-10-04\nattendees: [Sam, Ada]\n---'), JSON.stringify(after.doc));
  check('the row became an ordinary one (chips)', after.chips.join('|') === 'Sam|Ada', after.chips.join('|'));
  check('and is no longer offered', !after.unset.includes('attendees'), after.unset.join(','));

  // A document with no type draws no extra rows.
  await openDoc(page, { title: 'No type sweep', content: '---\ntags: [a]\n---\n\nBody' });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(800);
  const plain = await page.evaluate(() => document.querySelectorAll('.doc-props .doc-prop-unset').length);
  check('a document with no type offers nothing', plain === 0, String(plain));

  await browser.close();
  for (const c of out) console.log((c.ok ? 'ok   ' : 'FAIL ') + c.name + (c.ok ? '' : '  ' + c.detail));
  const bad = out.filter((c) => !c.ok);
  console.log(`${out.length - bad.length}/${out.length}`);
  process.exit(bad.length ? 1 : 0);
})();
