// INBOX 426 (z), images 89 to 91: Library Activity drawn as columns of single
// letters in the grid, keys like notifications_muted_except_reminders losing
// their underscores, and the selection tick touching the card's kebab.
//
// Seeds settings edits (the rows the owner's screenshot shows), opens
// Library > Activity in the grid and in the list, and measures: each
// card's preview width and line count, whether the text on screen still
// holds the key's underscores, and in the Bin the gap between a card's
// tick and its kebab and anything the tick covers.
//
//   BASE=http://127.0.0.1:8793 THEME=dark SHOTS=/tmp/x node scratchpad/ui-sweeps/libactivity.js
const { boot } = require('./lib.js');
const SHOTS = process.env.SHOTS || '';
const W = Number(process.env.W || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  await page.evaluate(async () => {
    const put = (body) => api('/preferences', { method: 'PUT', body: JSON.stringify(body) });
    await put({ notifications_muted_except_reminders: true });
    await put({ notifications_muted_except_reminders: false });
    await put({ disabled_tools: ['find_contradictions'] });
    await put({ disabled_tools: [] });
  });
  let bad = 0;
  for (const view of ['grid', 'list']) {
    await page.evaluate((v) => localStorage.setItem('libraryView', v), view);
    await page.evaluate(() => switchTab('library'));
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelector('[data-target="library-view-all"], #library-subtabs button')?.click());
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      const chip = document.querySelector('.library-chip-activity') || [...document.querySelectorAll('button')].find((b) => /Activity/.test(b.textContent));
      chip?.click();
    });
    await page.waitForTimeout(1500);
    const viewBtn = await page.$(`[data-library-view="${view}"], #library-view-${view}`);
    if (viewBtn) { await viewBtn.click().catch(() => {}); await page.waitForTimeout(800); }
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.library-card, .library-row')].filter((c) => c.checkVisibility()).slice(0, 12);
      const layout = document.querySelector('.library-grid')?.className || '';
      return {
        layout,
        cards: cards.map((c) => {
          const p = c.querySelector('.library-card-preview, .library-row-preview, p');
          const r = p ? p.getBoundingClientRect() : null;
          const lh = p ? parseFloat(getComputedStyle(p).lineHeight) || 20 : 0;
          return {
            title: (c.querySelector('.library-card-title, strong')?.textContent || '').trim().slice(0, 30),
            preview: p ? p.textContent.trim().slice(0, 60) : null,
            w: r ? Math.round(r.width) : null,
            lines: r ? Math.round(r.height / lh) : null,
            cardW: Math.round(c.getBoundingClientRect().width),
          };
        }),
      };
    });
    const narrow = m.cards.filter((c) => c.w !== null && c.w < 120);
    const eaten = m.cards.filter((c) => c.preview && /notifications|disabled/.test(c.preview) && !/notifications_muted|disabled_tools|Notifications|tools/i.test(c.preview));
    const raw = m.cards.filter((c) => c.preview && /^[a-z][a-z0-9_]*=/.test(c.preview));
    const fail = narrow.length || eaten.length || raw.length || !m.cards.length;
    if (fail) bad++;
    console.log(`${fail ? 'FAIL' : 'ok  '} activity ${view}: ${m.cards.length} cards, ${narrow.length} previews under 120px, ${eaten.length} keys with their underscores eaten, ${raw.length} raw keys`);
    for (const c of m.cards.slice(0, 5)) console.log('    ', JSON.stringify(c));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/libactivity-${view}-${W}.png` });
  }
  // The Bin in each view, a card pointed at: the tick must clear the ⋯ by
  // the gap token and cover nothing (image 91: it sat on "2 weeks ago" and
  // against the ⋯).
  // A note of its own, binned, so the Bin always has a card.
  await page.evaluate(async () => {
    const made = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note for the bin sweep' }) });
    if (made?.id) await api(`/entries/${made.id}`, { method: 'DELETE' });
  });
  for (const view of ['list', 'grid']) {
    await page.evaluate((v) => { localStorage.setItem('libraryView', v); }, view);
    await page.evaluate(() => switchTab('dashboard'));
    await page.waitForTimeout(400);
    await page.evaluate(() => switchTab('library'));
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelector('.library-chip[data-kind="archived"]')?.click());
    await page.waitForTimeout(1500);
    const card = await page.locator('.library-card:has(.library-card-tick):visible').first().elementHandle({ timeout: 3000 }).catch(() => null);
    if (!card) { console.log(`FAIL bin ${view}: no card with a tick`); bad++; continue; }
    await card.hover();
    await page.waitForTimeout(400);
    const g = await card.evaluate((c) => {
      const tick = c.querySelector('.library-card-tick').getBoundingClientRect();
      const menu = c.querySelector('.library-card-menu button, .library-card-menu')?.getBoundingClientRect();
      const hits = [...c.querySelectorAll('.library-card-meta span, .library-card-title, .library-card-icon')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.left < tick.right && r.right > tick.left && r.top < tick.bottom && r.bottom > tick.top; })
        .map((e) => e.className || e.textContent.trim().slice(0, 20));
      return { gap: menu ? Math.round(menu.left - tick.right) : null, covers: hits, tick: Math.round(tick.width), visible: getComputedStyle(c.querySelector('.library-card-tick')).opacity };
    });
    const fail = g.gap === null || g.gap < 6 || g.covers.length;
    if (fail) bad++;
    console.log(`${fail ? 'FAIL' : 'ok  '} bin ${view}: tick ${g.tick}px, ${g.gap}px from the ⋯, covers ${JSON.stringify(g.covers)}`);
    if (SHOTS) {
      const b = await card.boundingBox();
      await page.screenshot({ path: `${SHOTS}/libbin-${view}-${W}.png`, clip: { x: Math.max(0, b.x - 8), y: b.y - 8, width: Math.min(W - b.x + 8, b.width + 16), height: b.height + 16 } });
    }
  }
  await browser.close();
  console.log(bad ? `${bad} failing` : 'activity reads');
})();
