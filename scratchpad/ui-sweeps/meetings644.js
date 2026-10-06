// meetings644.js: the meeting notes redesign, end to end (INBOX 644).
//
//   BASE=http://127.0.0.1:8815 SCRATCH=<dir> node meetings644.js
//   THEME=dark WIDTH=390 TOUCH=1 node meetings644.js
//
// What it measures, one line each, and a non-zero exit on any failure:
//   - New meeting from each entry point: the Dashboard tile, the command
//     palette's New meeting, Library's Create; the Capture box's Meeting
//     template makes a typed, tagged meeting; a recording save makes one.
//   - The meeting sheet: an action item becomes a reminder (with a time in the
//     line, and through "When?" without one); the reminder is in Reminders.
//   - The meeting sits on the Timeline at its own date with the meeting mark.
//   - Notes' Meetings row filters to meetings.
//   - Contrast of every text node in the two sheets (4.5:1, 3:1 at 18.66px
//     bold or 24px), and, under TOUCH=1, every control in them at 44px.
//   - No page errors and no console errors other than the expected 422/503.
const { boot, OUT } = require('./lib.js');

const WIDTH = Number(process.env.WIDTH || 1440);
const TOUCH = Boolean(process.env.TOUCH);
const fails = [];
const say = (ok, what, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail ? `: ${detail}` : ''}`);
  if (!ok) fails.push(what);
};

async function sheetAudit(page, sel, label) {
  const result = await page.evaluate(({ sel, touch }) => {
    const card = document.querySelector(sel);
    if (!card) return { missing: true };
    //: Any CSS colour (rgb, oklab, color-mix...) to RGBA through a 1px canvas.
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const parse = (c) => {
      if (!c || c === 'transparent') return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return a ? { r, g, b, a: a / 255 } : null;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (top, under) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const backOf = (el) => {
      const stack = [];
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0) stack.push(c);
        if (c && c.a >= 1) break;
      }
      let colour = { r: 255, g: 255, b: 255, a: 1 };
      if (!stack.length || stack[stack.length - 1].a < 1) {
        const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
        if (bodyBg) colour = { ...bodyBg, a: 1 };
      }
      for (let i = stack.length - 1; i >= 0; i--) colour = over(stack[i], colour);
      return colour;
    };
    const low = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      const bg = backOf(el);
      const fgOn = over(fg, bg);
      const [hi, lo] = [lum(fgOn), lum(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) low.push(`${n.textContent.trim().slice(0, 24)} ${ratio.toFixed(2)}`);
    }
    const small = [];
    if (touch) {
      for (const c of card.querySelectorAll('button, input, select, [role="button"]')) {
        const r = c.getBoundingClientRect();
        if (!r.width || c.type === 'hidden') continue;
        if (r.width < 43.5 || r.height < 43.5) small.push(`${(c.textContent || c.getAttribute('aria-label') || c.id || c.tagName).trim().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    const box = card.getBoundingClientRect();
    return { low, small, width: Math.round(box.width), right: Math.round(box.right), vw: window.innerWidth, scroll: document.documentElement.scrollWidth };
  }, { sel, touch: TOUCH });
  if (result.missing) return say(false, `${label}: open`);
  say(!result.low.length, `${label}: contrast`, result.low.join('; '));
  if (TOUCH) say(!result.small.length, `${label}: 44px targets`, result.small.join('; '));
  say(result.right <= result.vw && result.scroll <= result.vw, `${label}: inside the window`, `card ${result.width}px, right ${result.right}, page ${result.scroll}/${result.vw}`);
}

(async () => {
  const opts = { viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 } };
  if (TOUCH) Object.assign(opts, { hasTouch: true, isMobile: true });
  const { browser, page } = await boot(opts);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of (422|503)/.test(m.text())) errors.push(m.text());
  });
  const shot = (n) => page.screenshot({ path: `${OUT}/m644-${process.env.THEME || 'light'}-${WIDTH}-${n}.png` });
  const startCount = await page.evaluate(async () => (await apiJson('/entries?limit=500')).filter((e) => e.tags.includes('meeting')).length);

  // 1. The Dashboard tile.
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(800);
  await page.click('.quick-action:has-text("New meeting")');
  await page.waitForSelector('[data-sheet="new-meeting"] .sheet-card', { timeout: 10000 });
  await page.waitForTimeout(400);
  await sheetAudit(page, '[data-sheet="new-meeting"] .sheet-card', 'New meeting sheet');
  await page.fill('#meeting-new-title', 'Sweep sync');
  const when = await page.evaluate(() => {
    const d = new Date(Date.now() + 2 * 864e5);
    d.setHours(15, 30, 0, 0);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  });
  await page.fill('#meeting-new-when', when);
  await page.fill('#meeting-new-people', 'Sam');
  await page.keyboard.press('Enter');
  await page.fill('#meeting-new-people', 'Priya');
  await page.keyboard.press('Enter');
  await shot('new');
  await page.click('#meeting-new-create');
  await page.waitForTimeout(2500);
  const made = await page.evaluate(() => editingId);
  const madeNote = await page.evaluate((id) => apiJson(`/entries/${id}`), made);
  say(Boolean(made) && madeNote.tags.includes('meeting') && madeNote.properties.type?.[0] === 'Meeting', 'Dashboard tile makes a typed, tagged meeting', `id ${made}`);
  say(JSON.stringify(madeNote.properties.attendees) === '["Sam","Priya"]', 'attendees are the chips', JSON.stringify(madeNote.properties.attendees));
  say(madeNote.properties.date?.[0] === when.replace('T', ' '), 'date is the When field', madeNote.properties.date?.[0]);
  say(await page.evaluate(() => document.querySelector('.note-edit-title')?.value) === 'Sweep sync', 'edit form opens with its title');
  await page.waitForTimeout(3500);
  await shot('editor');
  await page.evaluate(() => { editingId = null; noteFormDirty = false; renderEntries(); });

  // 2. The palette's New meeting (a command, INBOX 666).
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(500);
  await page.keyboard.type('New meeting');
  await page.waitForTimeout(600);
  const paletteRow = await page.evaluate(() => [...document.querySelectorAll('[role=option]')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).find((t) => /^New meeting/.test(t)) || '');
  say(Boolean(paletteRow), 'palette lists New meeting', paletteRow.slice(0, 40));
  await page.keyboard.press('Enter');
  const fromPalette = await page.waitForSelector('[data-sheet="new-meeting"] .sheet-card', { timeout: 10000 }).then(() => true, () => false);
  say(fromPalette, 'palette opens New meeting');
  if (fromPalette) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Library's Create.
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(2000);
  await page.evaluate(() => openLibraryCreatePicker());
  await page.waitForTimeout(600);
  const row = await page.$('.library-create-picker [role="radio"]:has-text("New meeting"), .library-create-picker button:has-text("New meeting")');
  say(Boolean(row), 'Library Create lists New meeting');
  if (row) {
    await row.dblclick().catch(() => {});
    await page.waitForTimeout(400);
    let open = await page.$('[data-sheet="new-meeting"] .sheet-card');
    if (!open) {
      await page.click('.library-create-picker button.accent, .library-create-picker button:has-text("Create")').catch(() => {});
      await page.waitForTimeout(600);
      open = await page.$('[data-sheet="new-meeting"] .sheet-card');
    }
    say(Boolean(open), 'Library Create opens New meeting');
    const sheets = await page.evaluate(() => document.querySelectorAll('[data-sheet="new-meeting"]').length);
    say(sheets === 1, 'one New meeting sheet, not two', String(sheets));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    say(!(await page.$('[data-sheet="new-meeting"]')), 'Escape closes it');
  }

  // 4. The Capture box's Meeting template, saved.
  const viaTemplate = await page.evaluate(async () => {
    await ensureModule('noteTemplates');
    const t = templateCatalogue().builtin.find((x) => x.name === 'Meeting');
    const text = withTitle(noteTemplateFill(t), 'Template meeting');
    return apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: text, category: 'Work' }) });
  });
  say(viaTemplate.tags.includes('meeting') && viaTemplate.title === 'Template meeting' && viaTemplate.properties.type?.[0] === 'Meeting', 'Capture template makes a titled meeting', `${viaTemplate.title} ${viaTemplate.tags}`);

  // 5. A recording saved (the transcription itself needs Whisper: the save
  // is driven with a typed transcript).
  await page.evaluate(() => openMeetingRecorder());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    $('meeting-transcript').value = 'We agreed to ship on Friday. Sam will write the notes.';
    $('meeting-transcript').classList.remove('hidden');
    $('meeting-save-row').classList.remove('hidden');
    $('meeting-title').value = 'Recorded sync';
  });
  say(await page.evaluate(() => $('meeting-save').innerText.trim()) === 'Save as a meeting', 'recorder save says Save as a meeting');
  await page.click('#meeting-save');
  await page.waitForTimeout(2500);
  const recorded = await page.evaluate(async () => (await apiJson('/entries?limit=500')).find((e) => e.title === 'Recorded sync'));
  say(Boolean(recorded) && recorded.tags.includes('meeting') && /## Notes\n\nWe agreed/.test(recorded.content), 'a recording saves as a meeting with the transcript under Notes');

  // 6. Action items: add two, open the sheet from the meeting chip.
  await page.evaluate(async (id) => {
    await apiJson(`/entries/${id}/meeting/append`, { method: 'POST', body: JSON.stringify({ section: 'Action items', lines: ['- [ ] Send the deck @Sam by Friday', '- [ ] Book the venue'] }) });
    await loadEntries();
  }, made);
  await page.evaluate((id) => flashEntry(id), made);
  await page.waitForTimeout(1500);
  const chipSel = `#entry-list li[data-id="${made}"] .chip.meeting`;
  say(Boolean(await page.$(chipSel)), 'the meeting chip is on the card');
  say(!(await page.$(`#entry-list li[data-id="${made}"] .chip.hashtag:has-text("meeting")`)), 'no #meeting tag chip beside it');
  await page.click(chipSel);
  await page.waitForSelector('[data-sheet="meeting"] .sheet-card', { timeout: 10000 });
  await page.waitForTimeout(600);
  await sheetAudit(page, '[data-sheet="meeting"] .sheet-card', 'Meeting sheet');
  await shot('sheet');
  await page.click('.meeting-action:first-child .meeting-remind');
  await page.waitForTimeout(1500);
  await page.click('.meeting-action:nth-child(2) .meeting-remind');
  await page.waitForTimeout(800);
  const asked = await page.$('.confirm-overlay input');
  say(Boolean(asked), 'an item with no time asks when');
  if (asked) {
    await asked.fill('tomorrow at 10am');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
  }
  const reminders = await page.evaluate((id) => apiJson('/reminders').then((rs) => rs.filter((r) => r.entry_id === id).map((r) => r.text)), made);
  say(reminders.includes('Send the deck @Sam by Friday') && reminders.includes('Book the venue'), 'both action items are reminders', reminders.join(' | '));
  const shown = await page.evaluate(() => [...document.querySelectorAll('.meeting-action')].map((r) => r.textContent));
  say(shown.every((t) => /Reminder/.test(t)), 'the sheet says each has its reminder');
  await page.click('#meeting-summarise');
  await page.waitForTimeout(1500);
  const summaryStatus = await page.evaluate(() => document.querySelector('[data-sheet="meeting"] .status')?.textContent || '');
  say(/local AI|Write some notes|Found|Nothing/.test(summaryStatus), 'Summarise answers in a sentence (no model here)', summaryStatus.slice(0, 60));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 7. The Timeline: at its date, with the meeting mark.
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(3000);
  const tl = await page.evaluate((id) => {
    const r = document.querySelector(`.timeline-row[data-key="note:${id}"]`);
    return r ? { placed: r.dataset.placed, glyph: r.querySelector('.timeline-row-mark i')?.className, text: r.textContent.trim().slice(0, 40) } : null;
  }, made);
  //: The feed draws a mark; the table view (a phone's default) has none.
  say(tl && tl.placed === 'meeting' && (!tl.glyph || /users-three/.test(tl.glyph)), 'the meeting is on the Timeline at its date', JSON.stringify(tl));
  await shot('timeline');

  // 8. Notes' Meetings row.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  await page.evaluate(() => { if (window.matchMedia('(max-width: 819px)').matches && typeof openNotesSidebar === 'function') openNotesSidebar(); });
  await page.evaluate(() => document.querySelector('.category-meetings-row')?.click());
  await page.waitForTimeout(800);
  const filter = await page.evaluate(() => ({
    heading: document.getElementById('entries-heading-label').textContent,
    ids: [...document.querySelectorAll('#entry-list > li[data-id]')].map((l) => Number(l.dataset.id)),
  }));
  const meetingCount = await page.evaluate(async () => (await apiJson('/entries?limit=500')).filter((e) => e.tags.includes('meeting')).length);
  say(filter.heading === 'Meetings' && filter.ids.length === meetingCount && meetingCount >= startCount + 3, 'Notes, Meetings lists every meeting', `${filter.heading}: ${filter.ids.length} of ${meetingCount}`);
  await shot('meetings-row');

  say(!errors.length, 'no page or console errors', errors.slice(0, 3).join(' | '));
  console.log(fails.length ? `${fails.length} failed` : 'all passed');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
