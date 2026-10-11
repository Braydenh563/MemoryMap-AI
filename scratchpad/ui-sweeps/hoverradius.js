// INBOX 856: a hover ground with square corners. Hovers every visible
// interactive element on the surfaces named in SURFACES and reports the ones
// whose background changes under the pointer while every corner radius is 0.
//
//   BASE=http://127.0.0.1:8878 THEME=light node scratchpad/ui-sweeps/hoverradius.js
// SURFACES=ask,questions,library,settings (default: ask,questions) picks what to walk.
const { boot } = require('./lib.js');

const PICK = 'tr, a, button, [role=button], [role=link], [role=menuitem], li, summary, [tabindex="0"], [data-clickable]';

async function sweep(page, label) {
  const found = await page.evaluate((pick) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && getComputedStyle(e).visibility !== 'hidden'; };
    const els = [...document.querySelectorAll(pick)].filter(vis).filter((e) => !e.closest('.hidden, [hidden]'))
      // A plain li or div is link-like only when it says so with its cursor.
      .filter((e) => /^(a|button|summary)$/i.test(e.tagName) || getComputedStyle(e).cursor === 'pointer');
    els.forEach((e, i) => e.setAttribute('data-hr', String(i)));
    return els.length;
  }, PICK);
  const bad = [];
  //: The ground is not always on the element under the pointer: a row's
  //: `li:hover`, a table's `tr:hover td` and a `::before` wash all paint around
  //: it. So the element, its four nearest ancestors and its two pseudo-elements
  //: are all read before and after, and any that gained a ground while every
  //: one of its corners is square is reported.
  const SNAP = (e) => {
    const out = [];
    let n = e;
    for (let i = 0; i < 5 && n && n !== document.body; i++, n = n.parentElement) {
      for (const pseudo of i === 0 ? [null, '::before', '::after'] : [null]) {
        const c = getComputedStyle(n, pseudo);
        if (pseudo && c.content === 'none') continue;
        out.push({ who: (n.tagName.toLowerCase() + '.' + String(n.className && n.className.baseVal === undefined ? n.className : '').trim().split(/\s+/).slice(0, 2).join('.') + (pseudo || '')).slice(0, 60),
          bg: c.backgroundColor, radius: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius],
          w: n.getBoundingClientRect().width | 0, h: n.getBoundingClientRect().height | 0, text: (n.textContent || '').trim().slice(0, 36), td: n.tagName === 'TD' });
      }
    }
    return out;
  };
  for (let i = 0; i < Math.min(found, 160); i++) {
    const el = await page.$(`[data-hr="${i}"]`);
    if (!el) continue;
    const before = await el.evaluate(SNAP);
    try { await el.hover({ timeout: 800 }); } catch { continue; }
    await page.waitForTimeout(260);
    const after = await el.evaluate(SNAP);
    for (let k = 0; k < after.length; k++) {
      const x = before[k], y = after[k];
      if (!x || x.who !== y.who) continue;
      const gained = y.bg !== x.bg && y.bg !== 'rgba(0, 0, 0, 0)';
      const square = y.radius.every((r) => parseFloat(r) === 0);
      //: A table cell in a row is meant to be square: its row clips the corners.
      if (gained && square && y.w > 24 && y.h > 12) bad.push(`${label}: ${y.who} ${y.w}x${y.h} "${y.text}"`);
    }
  }
  await page.mouse.move(0, 0);
  console.log(`${label}: ${found} candidates, ${bad.length} square hover grounds`);
  for (const b of bad) console.log('  ' + b);
  return bad.length;
}

(async () => {
  const w = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: w, height: w < 600 ? 844 : 900 } });
  //: The Questions view needs rows; no model is needed to see them, so the
  //: list is answered here (two notes, open and answered).
  await page.route('**/questions?*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    total: 3, counts: { open: 2, answered: 1, dropped: 0 },
    items: [
      { id: 1, entry_id: 11, note_title: 'Trip planning', text: 'Where do we stay in Lisbon?', display: 'Where do we stay in Lisbon?', state: 'open', asked_at: '2026-10-01T10:00:00Z' },
      { id: 2, entry_id: 11, note_title: 'Trip planning', text: 'Which day is the train?', display: 'Which day is the train?', state: 'answered', asked_at: '2026-10-02T10:00:00Z', answered_by: { entry_id: 12, note_title: 'Tickets', text: 'The train is on Friday.', at: '2026-10-03T10:00:00Z' } },
      { id: 3, entry_id: 12, note_title: 'Tickets', text: 'Do we need a seat reservation?', display: 'Do we need a seat reservation?', state: 'open', asked_at: '2026-10-03T10:00:00Z' },
    ] }) }));
  const surfaces = (process.env.SURFACES || 'ask,questions').split(',');
  let total = 0;
  for (const s of surfaces) {
    if (s === 'ask' || s === 'questions') {
      await page.evaluate(() => switchTab('notes'));
      await page.waitForTimeout(500);
      await page.evaluate((k) => { [...document.querySelectorAll('#notes-subtabs button')].find((b) => b.textContent.trim().toLowerCase() === k)?.click(); }, s);
      await page.waitForTimeout(1200);
    } else if (s === 'library') {
      await page.evaluate(() => switchTab('library'));
      await page.waitForTimeout(1500);
    } else if (s === 'asked') {
      //: Ask with an answer on screen: the sources, related questions and the
      //: follow-ups only exist after one (works with no model: notes-only).
      await page.evaluate(() => switchTab('notes'));
      await page.waitForTimeout(500);
      await page.evaluate(() => [...document.querySelectorAll('#notes-subtabs button')].find((b) => b.textContent.trim() === 'Ask')?.click());
      await page.waitForTimeout(1000);
      await page.fill('#question', process.env.QUERY || 'Remember to follow up on the budget');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(6000);
    } else if (s === 'palette') {
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(800);
      await page.keyboard.type(process.env.QUERY || 'what did I write about the budget');
      await page.waitForTimeout(1200);
    } else if (s === 'guide') {
      await page.evaluate(() => openHelpChat());
      await page.waitForTimeout(1500);
    } else if (s === 'settings') {
      await page.evaluate(() => openSettingsModal && openSettingsModal());
      await page.waitForTimeout(1200);
    } else {
      await page.evaluate((t) => switchTab(t), s);
      await page.waitForTimeout(1200);
    }
    total += await sweep(page, s);
  }
  console.log('total', total);
  await browser.close();
})();
