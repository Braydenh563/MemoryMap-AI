// GRAPH_PLAN KG4: note properties and types. A note opening with a `---`
// block: its card is named by the heading after it, shows the properties as
// a quiet table, and never prints the block; the Properties sheet edits a
// value and Save rewrites only the block; a note type's New note starts with
// its fields; Note types lists it.
//
//   BASE=http://127.0.0.1:8819 WIDTH=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg4props.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const s = Date.now().toString(36).slice(-5);
  const id = await page.evaluate(async (s) => {
    const made = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `---\nstatus: open\nowner: Priya\n---\n# Kiln plan ${s}\n\nFire on Thursday.` }) });
    await apiJson('/note-types', { method: 'POST', body: JSON.stringify({ name: `Meeting ${s}`, fields: [{ name: 'attendees', kind: 'list' }, { name: 'when', kind: 'date' }] }) }).catch(() => null);
    await loadEntries();
    return made.id;
  }, s);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  const card = await page.evaluate((id) => {
    const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!li) return null;
    const table = li.querySelector('.note-props');
    const r = li.getBoundingClientRect();
    return {
      title: li.querySelector('.entry-title')?.textContent,
      props: table ? [...table.querySelectorAll('dt')].map((dt) => `${dt.textContent}=${dt.nextElementSibling.textContent}`) : [],
      body: li.querySelector('.entry-content')?.textContent || '',
      sideways: li.scrollWidth > li.clientWidth + 1,
      w: Math.round(r.width),
    };
  }, id);
  console.log(JSON.stringify(card));
  check('the card is named by the heading after the block', card && card.title === `Kiln plan ${s}`, card && card.title);
  check('its properties as a table', card && card.props.join(',') === 'status=open,owner=Priya', card && card.props.join(','));
  check('the block is never printed', card && !/---|status:/.test(card.body), card && card.body.slice(0, 60));
  check('nothing sideways', card && !card.sideways);

  // The sheet: change status, save.
  await page.evaluate(async (id) => openNotePropertiesSheet(await apiJson(`/entries/${id}`)), id);
  await page.waitForTimeout(1200);
  const sheet = await page.evaluate(() => {
    const c = document.querySelector('[data-sheet="note-properties"] .sheet-card');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return {
      keys: [...c.querySelectorAll('.prop-key')].map((k) => k.value ?? k.textContent),
      h: Math.round(r.height), vh: innerHeight,
      sideways: c.scrollWidth > c.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(JSON.stringify(sheet));
  check('the sheet lists the type and both properties', sheet && sheet.keys.includes('status') && sheet.keys.includes('owner'), sheet && sheet.keys.join(','));
  check('the sheet fits, nothing sideways', sheet && sheet.h <= sheet.vh && !sheet.sideways, sheet && String(sheet.h));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg4props-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-sheet="note-properties"] .prop-row')];
    const row = rows.find((r) => r.querySelector('.prop-key')?.value === 'status');
    const input = row.querySelector('.prop-value');
    input.value = 'done';
    [...document.querySelectorAll('[data-sheet="note-properties"] button')].find((b) => b.textContent === 'Save').click();
  });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).content, id);
  check('Save rewrote the block, the body untouched', /status: done/.test(after) && after.endsWith(`# Kiln plan ${s}\n\nFire on Thursday.`), JSON.stringify(after.slice(0, 80)));

  // Note types: listed; a new note of the type starts with its fields.
  await page.evaluate(() => openNoteTypesSheet());
  await page.waitForTimeout(1000);
  const types = await page.evaluate(() => [...document.querySelectorAll('[data-sheet="note-types"] .relation-type-row')].map((r) => r.querySelector('.relation-type-name').textContent + ' | ' + r.querySelector('.relation-type-hint').textContent));
  check('Note types lists the type with its fields', types.some((t) => t.startsWith(`Meeting ${s} | attendees (list), when (date)`)), types.join(' ; '));
  await page.keyboard.press('Escape');
  const typed = await page.evaluate(async (s) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: '# Standup', note_type: `Meeting ${s}` }) })), s);
  check('a note of the type starts with its fields', typed.note_type === `Meeting ${s}` && typed.content.startsWith(`---\ntype: Meeting ${s}\nattendees: []\nwhen:\n---\n# Standup`), JSON.stringify(typed.content.slice(0, 70)));
  await browser.close();
})();
