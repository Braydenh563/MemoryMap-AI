// INBOX 788's design fixes, one assertion per measured fault (WIDTH=390 for a
// phone, THEME=dark for dark):
//   1. the graph topic card: the count is its own line, editing moves nothing;
//   2. a Documents reference: one row, its two actions over the end, on hover;
//   3. the Outline tab: no band under the tabs, one tree, counts on one edge;
//   4. the code diagnostic card: glyph, message, then the fix on its own row;
//   5. the code panel: one head row of icons, a one-line console in the
//      editor's face, the footer and keys line on the editor's column.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/docsui1010.js
const { boot } = require('./lib.js');

const W = Number(process.env.WIDTH || 1440);
const phone = W < 600;
let bad = 0;
const check = (label, ok, detail) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  ' + detail : ''}`); };
const R = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  // A fresh notebook asks about a recovery key over everything.
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Skip for now/.test(b.textContent) && b.offsetParent)?.click());
  const tag = Math.random().toString(36).slice(2, 6);

  // --- 1. the topic card -----------------------------------------------------
  await page.evaluate(async (tag) => {
    const make = (content, tags) => apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, tags }) });
    const link = (a, b) => apiJson(`/entries/${a.id}/links`, { method: 'POST', body: JSON.stringify({ target_id: b.id }) });
    const made = [];
    for (let i = 0; i < 7; i++) made.push(await make(`# Topic note ${i} ${tag}`, [`topic${tag}`]));
    for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) await link(made[i], made[j]);
    await loadEntries();
    switchTab('graph');
  }, tag);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const sel = document.getElementById('graph-colour'); sel.value = 'topic'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(4000);
  await page.evaluate((tag) => [...document.querySelectorAll('#graph-legend .legend-item')].find((b) => b.textContent.includes(`topic${tag}`))?.click(), tag);
  await page.waitForTimeout(600);
  const card = () => page.evaluate(() => {
    const R2 = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const box = document.getElementById('graph-topic');
    const name = box.querySelector('strong:not(.hidden), .graph-topic-rename');
    const count = box.querySelector('.graph-topic-count');
    return { box: R2(box), name: R2(name), count: R2(count), countLines: Math.round(count.getBoundingClientRect().height / parseFloat(getComputedStyle(count).lineHeight || 18)) };
  });
  const view = await card();
  check('the count sits under the name, on one line', view.count.t >= view.name.b - 1 && view.countLines <= 1, `name bottom ${Math.round(view.name.b)}, count top ${Math.round(view.count.t)}`);
  await page.evaluate(() => document.querySelector('#graph-topic button[aria-label^="Rename"]')?.click());
  await page.waitForTimeout(400);
  const edit = await card();
  check('editing does not change the card height', Math.abs((edit.box.b - edit.box.t) - (view.box.b - view.box.t)) < 1.5, `${Math.round(view.box.b - view.box.t)} to ${Math.round(edit.box.b - edit.box.t)}`);
  check('the count stays on one line while editing', edit.countLines <= 1);
  const tools = await page.evaluate(() => [...document.querySelectorAll('#graph-topic .graph-topic-tools:not(.hidden) button')].map((b) => b.title || b.getAttribute('aria-label')));
  check('Save and Cancel replace the pencil and close', tools.length === 2 && tools.some((t) => /Save/.test(t)) && tools.some((t) => /Keep/.test(t)), tools.join(' | '));
  await page.keyboard.press('Escape');

  // --- 2 and 3. the documents sidebar --------------------------------------------
  await page.evaluate(async (tag) => {
    const bms = [];
    for (const [t, u] of [['Python documentation', 'https://docs.python.org/3/'], ['A very long reference title that keeps going and going for the layout', 'https://example.com/long']]) {
      bms.push(await apiJson('/bookmarks', { method: 'POST', body: JSON.stringify({ title: t + ' ' + tag, url: u + '?' + tag }) }));
    }
    const text = '# Release plan\n\n## Design\n\n- [x] Sketch\n- [ ] Review\n\n### Details\n\nbody\n\n## Build\n\n- [ ] Implement\n\n# Notes\n';
    const d = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Plan ' + tag, content: text }) });
    for (const b of bms) await apiJson(`/documents/${d.id}/bookmarks`, { method: 'POST', body: JSON.stringify({ bookmark_id: b.id }) });
    switchTab('documents');
    await openDocument(d.id);
  }, tag);
  await page.waitForSelector('#doc-editor .cm-content', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (phone) { await page.evaluate(() => document.querySelector('.doc-dock > .dock-nav > button')?.click()); await page.waitForTimeout(500); }
  await page.evaluate(() => document.querySelector('#doc-sidebar-tabs [aria-controls="doc-sidebar-outline"]')?.click());
  await page.waitForTimeout(800);
  const side = await page.evaluate(() => {
    const R2 = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const tabs = R2(document.getElementById('doc-sidebar-tabs'));
    const first = R2(document.querySelector('#doc-outline-wrap > h3'));
    const rows = [...document.querySelectorAll('#doc-outline li')].map((li) => ({ twist: R2(li.querySelector('.outline-twist')), link: R2(li.querySelector('.outline-link')), tasks: li.querySelector('.outline-tasks') && R2(li.querySelector('.outline-tasks')), level: Number(li.className.match(/outline-h(\d)/)[1]) }));
    const heading = R2(document.querySelector('#doc-outline-wrap > h3 .doc-outline-count'));
    return { gap: first.t - tabs.b, rows, heading };
  });
  check('no empty band between the tab strip and the Outline heading', side.gap <= 16, `${Math.round(side.gap)}px`);
  const twistX = side.rows.map((r) => [r.level, Math.round(r.twist.l)]);
  const stepOk = [1, 2, 3].every((lv) => { const a = twistX.find(([l]) => l === lv); const b = twistX.find(([l]) => l === lv + 1); return !a || !b || b[1] > a[1]; });
  check('a deeper heading starts further right, chevron and text together', stepOk, JSON.stringify(twistX));
  const ends = side.rows.filter((r) => r.tasks).map((r) => Math.round(r.tasks.r));
  check('the task counts end on one edge', new Set(ends).size === 1, ends.join(', '));
  check('the heading count ends on the rows count edge', ends.length === 0 || Math.abs(side.heading.r - ends[0]) <= 2, `${Math.round(side.heading.r)} vs ${ends[0]}`);
  const refs = await page.evaluate(() => [...document.querySelectorAll('#doc-bookmarks li')].map((li) => {
    const R2 = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const tools = li.querySelector('.doc-ref-tools');
    return { li: R2(li), tools: R2(tools), op: getComputedStyle(tools).opacity, kids: li.children.length };
  }));
  check('a reference is one row with two children (title, tools)', refs.length >= 2 && refs.every((r) => r.kids === 2 && (r.li.b - r.li.t) < 50));
  if (!phone) {
    check('the actions are hidden at rest', refs.every((r) => r.op === '0'));
    await page.hover('#doc-bookmarks li:first-child');
    await page.waitForTimeout(300);
    check('and shown while the row is pointed at', await page.evaluate(() => getComputedStyle(document.querySelector('#doc-bookmarks li .doc-ref-tools')).opacity) === '1');
  } else {
    check('the actions are always shown on touch', refs.every((r) => r.op === '1'));
  }
  check('the actions name themselves', await page.evaluate(() => [...document.querySelectorAll('#doc-bookmarks .doc-ref-tools button')].every((b) => b.title && b.getAttribute('aria-label') === b.title)));

  // --- 4 and 5. the code editor ------------------------------------------------------
  await page.evaluate(() => switchTab('documents'));
  await page.evaluate(async (tag) => {
    const d = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'calc' + tag, content: 'import math\n\ndef area(r)\n    return math.pi * r * r\n\nprint(area(2))\n', file_type: 'py' }) });
    await loadDocuments(d.id);
  }, tag);
  await page.waitForTimeout(3500);
  if (!phone) {
    await page.waitForSelector('.cm-lintRange', { timeout: 15000 }).catch(() => {});
    await page.hover('.cm-lintRange');
    await page.waitForSelector('.cm-tooltip-lint', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(500);
    const tip = await page.evaluate(() => {
      const R2 = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      const card2 = document.querySelector('.cm-diagnostic');
      if (!card2) return null;
      const msg = card2.querySelector('.cm-diagnosticText');
      const fix = card2.querySelector('.cm-diagnosticAction');
      const before = getComputedStyle(card2, '::before');
      return { msg: msg && R2(msg), fix: fix && R2(fix), card: R2(card2), range: R2(document.querySelector('.cm-lintRange')), glyph: before.fontFamily, ink: before.color, pad: getComputedStyle(card2).paddingTop };
    });
    check('the diagnostic card draws a severity glyph in the error ink', !!tip && /Phosphor/.test(tip.glyph) && tip.ink !== 'rgba(0, 0, 0, 0)', tip && tip.ink);
    check('the fix is on its own row under the message', !!tip && !!tip.fix && tip.fix.t >= tip.msg.b - 1, tip && tip.fix && `msg bottom ${Math.round(tip.msg.b)}, fix top ${Math.round(tip.fix.t)}`);
    check('the card keeps clear of the line it is about', !!tip && (tip.card.b <= tip.range.t - 2 || tip.card.t >= tip.range.b + 2), tip && `card ${Math.round(tip.card.t)}-${Math.round(tip.card.b)}, line ${Math.round(tip.range.t)}-${Math.round(tip.range.b)}`);
  }
  await page.evaluate(() => docCmView.focus());
  await page.keyboard.press('Control+j');
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#doc-panel-tab-console')?.click());
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => {
    const R2 = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const p = document.querySelector('.cm-run-panel');
    const head = p.querySelector('.cm-run-head');
    const buttons = [...head.querySelectorAll('button')].filter((b) => b.offsetParent);
    const input = p.querySelector('.cm-console-input');
    const editorFont = getComputedStyle(document.querySelector('.cm-content')).fontFamily;
    const prose = document.querySelector('.doc-hint-prose');
    const code = document.querySelector('.doc-hint-code');
    return {
      rows: new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().top))).size,
      words: [...head.querySelectorAll('.cm-run-word')].length,
      named: [...head.querySelectorAll('.cm-run-actions button')].every((b) => b.title && b.getAttribute('aria-label')),
      input: R2(input), inputFont: getComputedStyle(input).fontFamily, inputBorder: getComputedStyle(input).borderTopWidth, editorFont,
      panel: R2(p), head: R2(head),
      proseHidden: getComputedStyle(prose).display === 'none', codeShown: getComputedStyle(code).display !== 'none', hint: R2(code), stats: R2(document.querySelector('.doc-statusbar')),
      sideways: document.documentElement.scrollWidth > innerWidth,
    };
  });
  check('the head has no words in it, every action named by title and label', panel.words === 0 && panel.named);
  if (!phone) check('the head is one row at 1440', panel.rows === 1, `${panel.rows} row(s), ${Math.round(panel.head.b - panel.head.t)}px tall`);
  check('the console is one line, borderless, in the mono face', panel.input.b - panel.input.t <= 44 && panel.inputBorder === '0px' && /mono/i.test(panel.inputFont), `${Math.round(panel.input.b - panel.input.t)}px, ${panel.inputBorder}, ${panel.inputFont.slice(0, 24)}`);
  check('the prose keys line is hidden and the code line shown', panel.proseHidden && panel.codeShown);
  if (!phone) {
    check('the keys line and the footer stand on the panel column', Math.abs(panel.hint.l - panel.panel.l) <= 1 && Math.abs(panel.hint.r - panel.panel.r) <= 1 && Math.abs(panel.stats.l - panel.panel.l) <= 1, `panel ${panel.panel.l}-${panel.panel.r}, hint ${Math.round(panel.hint.l)}-${Math.round(panel.hint.r)}, footer ${Math.round(panel.stats.l)}-${Math.round(panel.stats.r)}`);
  }
  check('nothing runs sideways', !panel.sideways);
  await browser.close();
  console.log(bad ? `${bad} FAILED` : 'docsui1010: all checks pass');
  process.exit(bad ? 1 : 0);
})();
