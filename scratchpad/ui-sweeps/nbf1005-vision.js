// nbf1005: WORLD_CLASS_PLAN section 8 rows 11 and 31 in the page: the Ask
// chart, the two dashboard widgets, Explain this note, the tidy suggestions,
// the suggested-link row and the AI dot's line.
//   BASE=http://127.0.0.1:8851 THEME=light W=1440 node scratchpad/ui-sweeps/nbf1005-vision.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const out = [];
  const line = (name, ok, detail = '') => out.push(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
  const inside = (r, vw) => r && r.left >= -0.5 && r.right <= vw + 0.5;

  const ids = await page.evaluate(async () => {
    const post = (path, body) => apiJson(path, { method: 'POST', body: JSON.stringify(body) });
    const a = await post('/entries', { content: '# Kyoto trip\n\nTemples and tea.', category: 'Travel' });
    const b = await post('/entries', { content: '# Packing list\n\nPassport.', category: 'Travels' });
    await post(`/entries/${a.id}/links`, { target_id: b.id, reason: 'the same trip' });
    await apiJson(`/entries/${a.id}`);
    await apiJson(`/entries/${a.id}`);
    await loadEntries();
    return { a: a.id, b: b.id };
  });

  // The Ask chart.
  await page.evaluate(async () => {
    await switchTab('notes');
    showNotesSection('ask');
    $('question').value = 'how many notes per category this month';
    askQuestion();
  });
  await page.waitForTimeout(4000);
  const chart = await page.evaluate(() => {
    const host = document.getElementById('ask-chart');
    if (!host || host.classList.contains('hidden')) return null;
    const svg = host.querySelector('svg');
    const bars = [...host.querySelectorAll('.ask-chart-bar')];
    const fill = bars[0] && getComputedStyle(bars[0]).fill;
    return { bars: bars.length, rows: host.querySelectorAll('tbody tr').length, fill, svg: svg.getBoundingClientRect().toJSON(), head: host.querySelector('.ask-chart-head').getBoundingClientRect().toJSON() };
  });
  line('Ask draws a chart for a counting question', chart && chart.bars >= 2 && chart.rows === chart.bars, JSON.stringify(chart && { bars: chart.bars, rows: chart.rows, fill: chart.fill }));
  line('the chart fits the width', chart && inside(chart.svg, W) && inside(chart.head, W), JSON.stringify(chart && chart.svg));

  // The two widgets, rendered into a scratch body.
  const widgets = await page.evaluate(async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    await renderMostOpenedWidget(a);
    await renderReviewWidget(b);
    return { opened: a.querySelectorAll('li').length, review: b.textContent.trim().slice(0, 60) };
  });
  line('Most opened this month lists the opened note', widgets.opened >= 1, JSON.stringify(widgets));

  // Explain this note.
  await page.evaluate((id) => {
    window.speechSynthesis && (window.speechSynthesis.speak = () => {});
    explainNote(allEntries.find((e) => e.id === id));
  }, ids.a);
  await page.waitForTimeout(1200);
  const explain = await page.evaluate(() => {
    const body = document.querySelector('.explain-note-body');
    return body ? { text: body.textContent.slice(0, 160), rect: body.getBoundingClientRect().toJSON() } : null;
  });
  line('Explain this note says the link and its reason', explain && /the same trip/.test(explain.text), explain && explain.text);
  line('the explain sheet fits', explain && inside(explain.rect, W));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // The tidy suggestions in Manage categories.
  await page.evaluate(() => openManageCategories());
  await page.waitForTimeout(1500);
  const tidy = await page.evaluate(() => {
    const box = document.querySelector('.manage-suggest:not(.hidden)');
    return box ? { text: box.textContent.slice(0, 140), rect: box.getBoundingClientRect().toJSON() } : null;
  });
  line('Manage categories offers Travels into Travel', tidy && /Travels? into Travels?/.test(tidy.text), tidy && tidy.text);
  line('the tidy box fits', tidy && inside(tidy.rect, W));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // The suggested-link row's parts.
  const linkRow = await page.evaluate(async () => {
    await ensureModule('inbox');
    const list = document.createElement('div');
    document.body.appendChild(list);
    const rows = [];
    const row = inboxLinkRow({ source_id: 1, target_id: 2, source_preview: 'Kyoto trip', target_preview: 'Packing list', confidence: 0.82, signals: [] }, rows);
    list.appendChild(row);
    const r = row.getBoundingClientRect();
    const bar = row.querySelector('.link-suggestion-bar > span');
    const out = { chips: row.querySelectorAll('.link-suggestion-note').length, reasonHidden: row.querySelector('.link-suggestion-reason').classList.contains('hidden'), bar: bar && bar.style.width, h: Math.round(r.height) };
    list.remove();
    return out;
  }).catch((e) => ({ error: String(e) }));
  line('a suggested link is two chips and a bar', linkRow.chips === 2 && linkRow.reasonHidden && linkRow.bar === '82%', JSON.stringify(linkRow));

  // The AI dot's line.
  const dot = await page.evaluate(() => {
    lastAnswerFacts = { model: 'granite4.1:3b', ms: 2100, used: 3900, window: 10000 };
    renderAiPill();
    return document.getElementById('ai-status-detail').textContent;
  });
  line('the AI dot says how the last answer went', /Last answer: granite4\.1:3b, 2\.1 s, 39% of its window\./.test(dot), dot.slice(-80));

  line('no console errors', errors.length === 0, errors.slice(0, 4).join(' || '));
  console.log(`nbf1005-vision ${W} ${process.env.THEME || 'light'}\n${out.join('\n')}`);
  await browser.close();
})();
