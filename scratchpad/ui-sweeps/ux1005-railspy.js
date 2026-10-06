// INBOX 571: the Connections rail follows the note being read. Scroll the
// list and the rail's subject changes to the card in view; a clicked card
// holds until the list scrolls more than one viewport.
//   BASE=... W=1280 node ux1005-railspy.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 800 } });
  await page.evaluate(async () => {
    const have = await apiJson('/entries?limit=100');
    const n = (have.items || have).length || 0;
    for (let i = n; i < 30; i++) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Rail note ${i}\n\n${'A line to give the card some height. '.repeat(6)}` }) });
    }
    try { localStorage.removeItem('notes-rail'); } catch {}
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(2500);
  const state = () => page.evaluate(() => {
    const rail = document.getElementById('notes-rail');
    const marked = [...document.querySelectorAll('#entry-list > li.rail-subject')];
    const list = document.getElementById('entry-list');
    const r = list.getBoundingClientRect();
    return {
      railShown: !rail.hidden,
      subjectId: typeof notesRailId !== 'undefined' ? notesRailId : null,
      subjectText: document.getElementById('notes-rail-subject').textContent.slice(0, 30),
      marked: marked.map((li) => li.dataset.id),
      markedTop: marked[0] ? Math.round(marked[0].getBoundingClientRect().top) : null,
      hairline: marked[0] ? getComputedStyle(marked[0], '::after').backgroundColor : null,
      listTop: Math.round(r.top), vh: innerHeight,
      listWidth: Math.round(r.width),
    };
  });
  const scrollBy = async (dy) => {
    await page.mouse.move(Math.round(W * 0.4), 500);
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(900);
  };
  const s0 = await state();
  await scrollBy(1200);
  const s1 = await state();
  await scrollBy(1200);
  const s2 = await state();
  // Pin: click a card's text, then scroll less than a viewport: the subject holds.
  const pinned = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#entry-list > li[data-id]')];
    const li = items.find((x) => x.getBoundingClientRect().top > innerHeight * 0.6 && x.getBoundingClientRect().top < innerHeight - 40);
    return li ? li.dataset.id : null;
  });
  if (pinned) await page.click(`#entry-list > li[data-id="${pinned}"] .entry-content`).catch(() => page.focus(`#entry-list > li[data-id="${pinned}"]`));
  await page.waitForTimeout(600);
  const s3 = await state();
  await scrollBy(300);
  const s4 = await state();
  await scrollBy(1500);
  const s5 = await state();
  const out = { W, s0, s1, s2, pinned, s3, s4, s5 };
  console.log(JSON.stringify(out, null, 1));
  const ok = s0.railShown && s0.marked.length === 1 && s1.subjectId !== s0.subjectId && s2.subjectId !== s1.subjectId
    && String(s3.subjectId) === String(pinned) && String(s4.subjectId) === String(pinned) && String(s5.subjectId) !== String(pinned)
    && s1.marked.length === 1 && s0.listWidth >= 600;
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
