// GRAPH_PLAN KG3: kinds of link with the name from the other end. A custom
// kind ("Part of" / "Has part"); the piece's card chip reads "Part of", the
// whole's reads "Has part"; the link's ⋯ opens Kind and properties, which
// sets a kind and properties; Kinds of link lists built-ins and yours.
//
//   BASE=http://127.0.0.1:8819 WIDTH=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/kg3types.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const s = Date.now().toString(36).slice(-5);
  const ids = await page.evaluate(async (s) => {
    const make = (content) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) });
    await apiJson('/relation-types', { method: 'POST', body: JSON.stringify({ name: `Part of ${s}`, inverse: `Has part ${s}` }) }).catch(() => null);
    const types = await apiJson('/relation-types');
    const key = types.find((t) => t.name === `Part of ${s}`).key;
    const wheel = await make(`# Wheel ${s}\n\nround`);
    const car = await make(`# Car ${s}\n\nfour wheels`);
    await apiJson(`/entries/${wheel.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: car.id, link_type: key }) });
    await loadEntries();
    return { wheel: wheel.id, car: car.id, key };
  }, s);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  const chips = await page.evaluate((ids) => {
    const read = (id) => {
      const card = document.querySelector(`#entry-list li[data-id="${id}"]`);
      return card ? [...card.querySelectorAll('.link-kind')].map((k) => k.textContent) : null;
    };
    return { wheel: read(ids.wheel), car: read(ids.car) };
  }, ids);
  console.log(JSON.stringify(chips));
  check('the piece reads "Part of"', chips.wheel && chips.wheel.some((t) => t.startsWith('Part of')), JSON.stringify(chips.wheel));
  check('the whole reads the inverse, "Has part"', chips.car && chips.car.some((t) => t.startsWith('Has part')), JSON.stringify(chips.car));

  // The Connections rows (the sheet): the incoming row names the inverse.
  const conn = await page.evaluate(async (ids) => (await apiJson(`/entries/${ids.car}/connections`)).incoming.find((r) => r.id === ids.wheel), ids);
  check('Connections: the incoming row is "Has part"', conn && conn.link_label && conn.link_label.startsWith('Has part'), conn && conn.link_label);

  // The link's own sheet.
  const linkObj = await page.evaluate(async (ids) => (await apiJson(`/entries/${ids.car}`)).links.find((l) => l.entry_id === ids.wheel), ids);
  await page.evaluate(({ ids, link }) => openLinkTypeSheet(ids.car, link), { ids, link: linkObj });
  await page.waitForTimeout(1200);
  const sheet = await page.evaluate(() => {
    const card = document.querySelector('[data-sheet="link-type"] .sheet-card');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return {
      sub: card.querySelector('.sheet-sub')?.textContent,
      rows: [...card.querySelectorAll('.sheet-row')].map((x) => x.textContent.trim()),
      current: card.querySelector('.sheet-row[aria-current="true"]')?.textContent.trim(),
      sideways: card.scrollWidth > card.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
      h: Math.round(r.height), vh: innerHeight,
    };
  });
  console.log(JSON.stringify(sheet));
  check('Kind of link: from this end, the current marked', sheet && /Has part/.test(sheet.sub || '') && /^Has part/.test(sheet.current || ''), sheet && `${sheet.sub} / ${sheet.current}`);
  check('it lists built-ins and New kind and Properties', sheet && sheet.rows.some((r) => r.startsWith('Supported by⇄ Supports')) && sheet.rows.includes('New kind…') && sheet.rows.some((r) => r.startsWith('Properties')), sheet && sheet.rows.join(' | '));
  check('the sheet fits, nothing sideways', sheet && sheet.h <= sheet.vh && !sheet.sideways, sheet && `${sheet.h}`);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/kg3types-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => [...document.querySelectorAll('[data-sheet="link-type"] .sheet-row')].find((r) => r.textContent.trim().startsWith('Supported by'))?.click());
  await page.waitForTimeout(1500);
  const after = await page.evaluate(async (ids) => (await apiJson(`/entries/${ids.car}`)).links.find((l) => l.entry_id === ids.wheel), ids);
  check('choosing a kind sets it', after && after.link_type === 'supports' && after.link_label === 'Supported by', after && `${after.link_type} ${after.link_label}`);

  // Kinds of link.
  await page.evaluate(() => openRelationTypesSheet());
  await page.waitForTimeout(1200);
  const kinds = await page.evaluate(() => [...document.querySelectorAll('[data-sheet="relation-types"] .relation-type-row')].map((r) => r.textContent.trim()));
  check('Kinds of link: built-ins and yours', kinds.some((k) => k.startsWith('Supports / Supported by') && k.endsWith('Built in')) && kinds.some((k) => k.includes(`Part of ${s} / Has part ${s}`)), kinds.slice(0, 8).join(' | '));
  await page.keyboard.press('Escape');
  await browser.close();
})();
