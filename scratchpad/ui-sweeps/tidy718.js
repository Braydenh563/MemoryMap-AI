// tidy718.js: the Tidy dialog's overview, rhythm, switch and help (INBOX 718).
//
//   bash scratchpad/ui-sweeps/serve.sh 8863 /tmp/mm-718
//   .venv/bin/python scratchpad/ui-sweeps/seed-showcase.py 8863 /tmp/mm-718
//   .venv/bin/python scratchpad/ui-sweeps/tidy691-seed.py 8863 /tmp/mm-718
//   BASE=http://127.0.0.1:8863 SCRATCH=<scratch> node scratchpad/ui-sweeps/tidy718.js
//   (THEME=dark for dark, WIDTH=390 for a phone)
//
// Measures, never looks: the overview has nine rows (icon, name, finds line,
// count) with the empty ones last and every count equal to /tidy; a row opens
// its review and Back returns with the focus on the row; no button says
// Name; the Apply automatically switch is the Settings switch within 1px and
// its row has no fill in any state; every gap between the blocks of the
// sheet is the one --space-5 and never under --space-3; Recent runs' rows sit
// inside it with padding; the help popover is at most four short lines, no
// wider than the popover recipe, inside the window and never over its '?'.
const { boot } = require('./lib');

const WIDTH = Number(process.env.WIDTH || 1440);
const PHONE = WIDTH < 600;

(async () => {
  const { browser, page, OUT } = await boot({
    viewport: { width: WIDTH, height: PHONE ? 844 : 900 },
    ...(PHONE ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const theme = process.env.THEME || 'light';
  const out = { checks: [] };
  const check = (name, ok, extra = {}) => { out.checks.push({ name, ok, ...extra }); console.log(JSON.stringify({ name, ok, ...extra })); };

  await page.evaluate(() => switchTab('notes'));
  await page.waitForFunction(() => typeof window.openTidySheet === 'function', null, { timeout: 20000 });
  //: A run in Recent runs: apply the first selectable short note and undo it.
  await page.evaluate(async () => {
    const b = await apiJson('/tidy/short-notes');
    const ids = b.rows.filter((r) => r.selectable).slice(0, 1).map((r) => r.id);
    if (!ids.length) return;
    const done = await apiJson('/tidy/short-notes/apply', { method: 'POST', body: JSON.stringify({ ids }) });
    await apiJson(`/tidy/undo/${done.undo_id}`, { method: 'POST' });
  });
  const summary = await page.evaluate(() => apiJson('/tidy'));
  await page.evaluate(() => openTidySheet());
  await page.waitForSelector('[data-sheet="tidy"] .tidy-overview-row', { timeout: 10000 });
  await page.waitForTimeout(700);

  //: --- the overview
  const ov = await page.evaluate(() => [...document.querySelectorAll('.tidy-overview-row')].map((r) => ({
    key: r.dataset.review,
    name: r.querySelector('.note-picker-text').textContent,
    finds: r.querySelector('.note-picker-meta').textContent,
    count: r.querySelector('.tidy-overview-count').textContent.replace(/ to tidy$/, '').replace(/^Nothing to tidy$/, 'Nothing'),
    icon: !!r.querySelector('i.ph.tidy-overview-icon'),
    height: Math.round(r.getBoundingClientRect().height),
    empty: r.classList.contains('is-empty'),
  })));
  check('overview has nine rows, each with icon, name, finds and count', ov.length === 9 && ov.every((r) => r.icon && r.name && r.finds && r.count), { rows: ov.length });
  const serverCounts = Object.fromEntries(summary.reviews.map((r) => [r.key, r.count]));
  check('every row count equals /tidy', ov.every((r) => (serverCounts[r.key] ? String(serverCounts[r.key]) === r.count : r.count === 'Nothing')), { shown: ov.map((r) => `${r.key}:${r.count}`) });
  const firstEmpty = ov.findIndex((r) => r.empty);
  check('reviews with nothing to tidy come last', firstEmpty === -1 || ov.slice(firstEmpty).every((r) => r.empty), { order: ov.map((r) => (r.empty ? '0' : '+')).join('') });
  check('rows meet the touch target', ov.every((r) => r.height >= 32), { min: Math.min(...ov.map((r) => r.height)) });
  const total = await page.evaluate(() => document.getElementById('notes-tidy-count').textContent);
  check('dock badge is the total', total === (summary.total > 99 ? '99+' : String(summary.total)), { total, server: summary.total });
  const gaps = async () => page.evaluate(() => {
    const sel = (e) => (e.className && e.className.toString().split(' ')[0]) || e.tagName;
    const blocks = (root) => [...root.children].filter((c) => { const r = c.getBoundingClientRect(); return r.height > 0 && !c.classList.contains('hidden'); });
    const card = document.querySelector('[data-sheet="tidy"] .sheet-card');
    const out = [];
    const walk = (root, label) => {
      let prev = null;
      for (const c of blocks(root)) {
        const r = c.getBoundingClientRect();
        if (prev) out.push({ between: `${label}:${sel(prev.el)}>${sel(c)}`, gap: Math.round((r.top - prev.bottom) * 10) / 10 });
        prev = { el: c, bottom: r.bottom };
      }
    };
    walk(card, 'card');
    const pane = document.getElementById('tidy-review');
    if (pane && !pane.hidden) walk(pane, 'review');
    const token = parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.5 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--density') || 1);
    return { out, space3: token };
  });
  let g = await gaps();
  check('overview: no gap under --space-3', g.out.every((x) => x.gap >= g.space3 - 0.1), g);
  const hist = await page.evaluate(() => {
    const h = document.getElementById('tidy-history');
    if (!h || !h.getBoundingClientRect().height) return null;
    h.open = true;
    const row = h.querySelector('.tidy-history-row');
    const hr = h.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const cs = getComputedStyle(row);
    return { padL: Math.round(rr.left - hr.left), padR: Math.round(hr.right - rr.right), rowPadBlock: parseFloat(cs.paddingTop), rows: h.querySelectorAll('.tidy-history-row').length };
  });
  check('Recent runs rows sit inside it with padding', !hist || (hist.padL >= 6 && hist.padR >= 6 && hist.rowPadBlock >= 3), { hist });
  g = await gaps();
  check('overview with Recent runs open: no gap under --space-3', g.out.every((x) => x.gap >= g.space3 - 0.1), g);
  await page.evaluate(() => { document.getElementById("tidy-history").open = false; });
  await page.waitForTimeout(150);
  const fit = await page.evaluate(() => { const o = document.getElementById("tidy-overview"); return { scrollH: o.scrollHeight, clientH: o.clientHeight }; });
  check('all nine overview rows fit without scrolling (a phone sheet may scroll)', PHONE || fit.scrollH <= fit.clientH + 1, fit);
  await page.screenshot({ path: `${OUT}/tidy718-overview-${WIDTH}-${theme}.png` });

  //: --- open one review and come back
  const target = ov.find((r) => !r.empty) || ov[0];
  await page.click(`.tidy-overview-row[data-review="${target.key}"]`);
  await page.waitForFunction((key) => TIDY.state.key === key && !/Looking/.test(document.getElementById('tidy-list').textContent), target.key, { timeout: 15000 });
  const inReview = await page.evaluate(() => ({
    overviewHidden: document.getElementById('tidy-overview').getBoundingClientRect().height === 0,
    back: !!document.getElementById('tidy-back')?.getBoundingClientRect().height,
    title: document.getElementById('tidy-title').textContent,
    about: document.getElementById('tidy-about').textContent,
    apply: document.getElementById('tidy-apply').textContent.trim(),
    buttons: [...document.querySelectorAll('.tidy-foot button')].map((b) => b.textContent.trim()),
  }));
  check('pressing a row opens that review with a back button', inReview.overviewHidden && inReview.back && inReview.title.startsWith(target.name), inReview);
  check('no button says Name or Unlink or a bare Apply', inReview.buttons.every((b) => !/^(Name|Unlink)\b/.test(b) && b !== 'Apply'), { buttons: inReview.buttons });
  await page.click('#tidy-back');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => ({ shown: document.getElementById('tidy-overview').getBoundingClientRect().height > 0, focus: document.activeElement?.dataset?.review }));
  check('Back returns to the overview with the focus on the row', back.shown && back.focus === target.key, back);

  //: --- every review: rows drawn equal the server's, the rhythm, the verbs
  for (const review of summary.reviews) {
    await page.click(`.tidy-overview-row[data-review="${review.key}"]`);
    await page.waitForFunction((key) => TIDY.state.key === key && !/Looking/.test(document.getElementById('tidy-list').textContent), review.key, { timeout: 15000 });
    await page.waitForTimeout(250);
    const d = await page.evaluate(() => ({
      rows: document.querySelectorAll('#tidy-list .tidy-row').length,
      about: document.getElementById('tidy-about').textContent,
      buttons: [...document.querySelectorAll('.tidy-foot button')].map((b) => b.textContent.trim()),
      overflowX: document.getElementById('tidy-list').scrollWidth > document.getElementById('tidy-list').clientWidth + 1,
      bg: !!document.getElementById('tidy-background'),
    }));
    check(`${review.key}: rows drawn`, d.rows === Math.min(review.count, 300), { drawn: d.rows, server: review.count });
    const verb = { 'link-reasons': 'Add reasons', 'weak-links': 'Remove links', 'auto-tags': 'Remove tags', 'rare-tags': 'Remove tags', 'lookalike-tags': 'Merge tags', uncategorised: 'Move notes', duplicates: 'Merge notes', 'short-notes': 'Move to bin', 'stale-reminders': 'Mark done' }[review.key];
    const apply = d.buttons[d.buttons.length - 1];
    check(`${review.key}: the description names what the button does`, d.about.includes(verb) && apply.startsWith(verb.split(' ')[0]), { about: d.about.slice(0, 90), apply });
    const rg = await gaps();
    check(`${review.key}: no gap under --space-3`, rg.out.every((x) => x.gap >= rg.space3 - 0.1), rg);
    check(`${review.key}: no sideways scroll`, !d.overflowX);
    if (review.key === 'link-reasons') {
      check('link reasons background button is plain', d.buttons.includes('Add reasons to all in the background'), { buttons: d.buttons });
      //: The switch, against Settings' own.
      const sw = await page.evaluate(() => {
        const box = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
        const input = document.getElementById('tidy-auto');
        const row = input.closest('label');
        const states = {};
        states.off = getComputedStyle(row).backgroundColor;
        input.checked = true;
        states.on = getComputedStyle(row).backgroundColor;
        input.checked = false;
        const after = getComputedStyle(input, '::after');
        return { tidy: box(input), states, knob: after.width };
      });
      await page.hover('.tidy-auto');
      const hover = await page.evaluate(() => getComputedStyle(document.getElementById('tidy-auto').closest('label')).backgroundColor);
      check('Apply automatically row has no fill, off, on or hovered', [sw.states.off, sw.states.on, hover].every((c) => c === 'rgba(0, 0, 0, 0)'), { states: sw.states, hover });
      page.__sw = sw;
    }
    if (review.key === 'weak-links' || review.key === 'duplicates') await page.screenshot({ path: `${OUT}/tidy718-${review.key}-${WIDTH}-${theme}.png` });
    await page.click('#tidy-back');
    await page.waitForTimeout(150);
  }

  //: --- the switch beside Settings' own (the sheet is closed first, Settings opens)
  await page.evaluate(() => TIDY.state && TIDY.state.close());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('settings-btn').click());
  await page.waitForTimeout(1500);
  const settingsSwitch = await page.evaluate(() => {
    const el = [...document.querySelectorAll('#settings-modal .setting-check input[type=checkbox]')].find((e) => e.getBoundingClientRect().width > 0);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => openTidySheet('link-reasons'));
  await page.waitForSelector('#tidy-auto', { timeout: 10000 });
  await page.waitForTimeout(500);
  const tidySwitch = await page.evaluate(() => { const r = document.getElementById('tidy-auto').getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; });
  check('the switch is the Settings switch within 1px', !!settingsSwitch && Math.abs(settingsSwitch.w - tidySwitch.w) <= 1 && Math.abs(settingsSwitch.h - tidySwitch.h) <= 1, { settings: settingsSwitch, tidy: tidySwitch });

  //: --- the help popover
  await page.evaluate(() => { const b = document.querySelector('[data-sheet="tidy"] [data-help-for="tidy-help"]'); b.scrollIntoView(); });
  await page.click('[data-sheet="tidy"] [data-help-for="tidy-help"]');
  await page.waitForTimeout(400);
  const help = await page.evaluate(() => {
    const panel = document.getElementById('tidy-help');
    const trig = document.querySelector('[data-sheet="tidy"] [data-help-for="tidy-help"]');
    const p = panel.getBoundingClientRect();
    const t = trig.getBoundingClientRect();
    const overlap = !(p.right <= t.left || p.left >= t.right || p.bottom <= t.top || p.top >= t.bottom);
    return {
      paras: panel.querySelectorAll('p').length, w: Math.round(p.width), h: Math.round(p.height), overlap,
      inside: p.left >= 0 && p.right <= innerWidth && p.top >= 0 && p.bottom <= innerHeight,
      cap: Math.round(16 * 26), lineH: parseFloat(getComputedStyle(panel).lineHeight),
      oneLine: [...panel.querySelectorAll('p')].every((p) => p.getBoundingClientRect().height <= parseFloat(getComputedStyle(panel).lineHeight) * 1.2),
    };
  });
  check('help paragraphs are one line each (a phone may wrap)', PHONE || help.oneLine, help);
  check('help is at most four paragraphs', help.paras <= 4, help);
  check('help is no wider than the popover recipe', help.w <= Math.min(help.cap, WIDTH - 24) + 1, help);
  check('help never covers its ? and stays in the window', !help.overlap && help.inside, help);
  await page.screenshot({ path: `${OUT}/tidy718-help-${WIDTH}-${theme}.png` });
  await page.keyboard.press('Escape');

  //: --- a short window, where the old placement pinned a tall popover over the '?'
  await page.setViewportSize({ width: WIDTH, height: 360 });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('tidy-help').innerHTML = ''; for (let i = 0; i < 14; i++) { const p = document.createElement('p'); p.textContent = 'A long line of help that wraps over several lines in the popover, to make it taller than the window can hold at once. '.repeat(2); document.getElementById('tidy-help').appendChild(p); } });
  await page.click('[data-sheet="tidy"] [data-help-for="tidy-help"]');
  await page.waitForTimeout(400);
  const tall = await page.evaluate(() => {
    const panel = document.getElementById('tidy-help');
    const trig = document.querySelector('[data-sheet="tidy"] [data-help-for="tidy-help"]');
    const p = panel.getBoundingClientRect();
    const t = trig.getBoundingClientRect();
    return { overlap: !(p.right <= t.left || p.left >= t.right || p.bottom <= t.top || p.top >= t.bottom), inside: p.top >= 0 && p.bottom <= innerHeight, scrolls: panel.scrollHeight > panel.clientHeight, h: Math.round(p.height), vh: innerHeight };
  });
  check('a too-tall popover is capped and scrolls, not laid over its ?', !tall.overlap && tall.inside && tall.scrolls, tall);

  check('no console errors', errors.length === 0, { errors });
  const failed = out.checks.filter((c) => !c.ok).length;
  console.log(`SUMMARY ${WIDTH} ${theme}: ${out.checks.length - failed} of ${out.checks.length} passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
