// WORLD_CLASS_PLAN row 31, item 92: the Suggested links row. Real notes, the
// suggestions answered in flight (three pairs at 92, 78 and 51 percent), the
// real inbox sheet and the real Link calls. Measured: each row is two note
// chips, an arrow, a meter, "Add a reason", Link and Dismiss, nothing clipped
// at 1440 or 390; the reason field is hidden until asked for; the meter's
// width is the percent; "Link all above 70%" links the two and leaves the
// third; a chip opens its note.
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node linkrow92.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  const s = Date.now().toString(36).slice(-4);
  const ids = await page.evaluate(async (s) => {
    const make = async (t) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: t }) })).id;
    const out = [];
    for (const t of ['Kiln firing schedule for the autumn glazes', 'Glaze recipe notes, cone six oxidation', 'Studio opening hours and a very long title that should be cut with an ellipsis rather than wrap the row onto three lines', 'Pottery wheel maintenance log', 'Clay order from the supplier']) out.push(await make(`Linkrow ${s} ${t}`));
    return out;
  }, s);
  const sug = (a, b, conf, reason) => ({ source_id: ids[a], target_id: ids[b], source_preview: `Linkrow ${s} note ${a}`, target_preview: `Linkrow ${s} note ${b}`, confidence: conf, similarity: conf, reason, signals: [{ signal: 'similarity', confidence: conf, reason }] });
  await page.route('**/entries/link-suggestions', (route) => route.fulfill({ json: [sug(0, 1, 0.92, 'similar in meaning'), sug(2, 3, 0.78, 'similar in meaning'), sug(3, 4, 0.51, 'similar in meaning')] }));
  await page.route('**/entries/link-suggestions/reasons', (route) => route.fulfill({ json: { reasons: [], ai_unavailable: true } }));
  await page.evaluate(() => openSuggestionsInbox('links'));
  await page.waitForTimeout(1800);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.link-suggestion')].map((row) => {
    const r = row.getBoundingClientRect(); const host = row.parentElement.getBoundingClientRect();
    const pair = row.querySelector('.link-suggestion-pair'); const chips = [...pair.querySelectorAll('.chip')];
    const meter = row.querySelector('.link-suggestion-meter'); const fill = meter && meter.firstElementChild;
    const reason = row.querySelector('.link-suggestion-reason');
    return {
      chips: chips.length, arrow: !!pair.querySelector('.ph-arrows-left-right'), hasMeter: !!meter, fillPct: fill ? Math.round(fill.getBoundingClientRect().width / meter.getBoundingClientRect().width * 100) : null,
      reasonHidden: reason.hidden, addReason: [...row.querySelectorAll('button')].some((b) => /Add a reason/.test(b.textContent)),
      buttons: [...row.querySelectorAll('button')].map((b) => b.textContent.trim()), inside: r.left >= host.left - 1 && r.right <= host.right + 1, h: Math.round(r.height),
      clipped: chips.some((c) => c.scrollWidth > c.clientWidth + 1 && getComputedStyle(c).textOverflow !== 'ellipsis'), over: row.scrollWidth > row.clientWidth + 1,
    };
  }));
  console.log(JSON.stringify(rows.map((r) => [r.chips, r.fillPct, r.reasonHidden, r.h, r.buttons.join('|')])));
  check('three rows', rows.length === 3);
  check('each is two chips, an arrow and a meter', rows.every((r) => r.chips === 2 && r.arrow && r.hasMeter));
  check('the meter fill is the percent', rows[0].fillPct >= 90 && rows[0].fillPct <= 94 && rows[2].fillPct >= 49 && rows[2].fillPct <= 53, JSON.stringify(rows.map((r) => r.fillPct)));
  check('the reason is behind Add a reason', rows.every((r) => r.reasonHidden && r.addReason));
  check('nothing clipped or sideways, inside the list', rows.every((r) => r.inside && !r.clipped && !r.over));
  check('a row is compact: Add a reason, Link and a dismiss', rows.every((r) => r.buttons.some((b) => /Link$/.test(b)) && r.buttons.length >= 3));
  // Add a reason opens the field.
  await page.evaluate(() => [...document.querySelectorAll('.link-suggestion')][0].querySelector('button').click());
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => { const row = document.querySelector('.link-suggestion'); const f = row.querySelector('.link-suggestion-reason'); return { shown: !f.hidden && f.getClientRects().length > 0, focused: document.activeElement === f, addGone: ![...row.querySelectorAll('button')].some((b) => /Add a reason/.test(b.textContent) && !b.hidden) }; });
  check('Add a reason opens and focuses the field', opened.shown && opened.focused && opened.addGone, JSON.stringify(opened));
  // Link all above 70%.
  const toolsRow = await page.evaluate(() => [...document.querySelectorAll('.inbox-tools button')].map((b) => b.textContent.trim()));
  check('the head has Link all above 70%', toolsRow.some((t) => /Link all above 70%/.test(t)), JSON.stringify(toolsRow));
  await page.evaluate(() => [...document.querySelectorAll('.inbox-tools button')].find((b) => /Link all above 70%/.test(b.textContent)).click());
  await page.waitForSelector('.confirm-card', { timeout: 4000 });
  const ask = await page.evaluate(() => document.querySelector('.confirm-card').textContent);
  check('the confirm names two pairs', /Link 2 pairs/.test(ask), ask.slice(0, 80));
  await page.evaluate(() => [...document.querySelectorAll('.confirm-card button')].find((b) => /Link them/.test(b.textContent)).click());
  await page.waitForTimeout(2500);
  const left = await page.evaluate(() => document.querySelectorAll('.link-suggestion').length);
  check('two were linked and the 51 percent one stays', left === 1, String(left));
  const links = await page.evaluate(async (ids) => { const a = await apiJson(`/entries/${ids[0]}`).catch(() => null); const b = await apiJson(`/entries/${ids[2]}`).catch(() => null); return { a: JSON.stringify(a).includes(String(ids[1])), b: JSON.stringify(b).includes(String(ids[3])) }; }, ids);
  check('the two links exist for real', links.a && links.b, JSON.stringify(links));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
