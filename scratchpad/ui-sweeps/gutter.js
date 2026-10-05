// INBOX 590: the line-number gutter, in every place it appears. The owner:
// "can you redesign and make this line numbers column cleaner and more modern
// and professional??" (capture, the note edit form, the documents editor).
//
//   BASE=http://127.0.0.1:8793 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     WIDTH=1440 THEME=dark node gutter.js
//
// Per surface, measured: the column draws no box (no border, no radius, no
// fill of its own), its numbers are smaller than the text, each of five
// numbers is centred on its line within 1px, the numbers clear 3:1 on what
// is behind them, and the focused line's number is brighter than the rest.
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

const LINES = 'alpha\nbravo\ncharlie\ndelta\necho';

//: Runs in the page. `root` is the element holding the numbered text: a
//: `.gutter-wrap` (a textarea and its `.doc-gutter`, or a note surface) or a
//: `.cm-editor`.
function measureIn(root) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (t, b) => t.slice(0, 3).map((v, i) => v * t[3] + b[i] * (1 - t[3])).concat(1);
  const ground = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) stack.push(c);
      if (c[3] >= 0.999) break;
    }
    let acc = stack.length && stack[stack.length - 1][3] >= 0.999 ? stack.pop() : [255, 255, 255, 1];
    while (stack.length) acc = over(stack.pop(), acc);
    return acc;
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const centre = (r) => r.top + r.height / 2;
  //: A baseline, from the top of a run's content area and its font's own
  //: ascent (the metric Chromium sizes the content area with).
  const metrics = (el) => { const st = getComputedStyle(el); cx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`; const m = cx.measureText('0123456789'); return { asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent }; };
  const baseline = (el, rect) => rect.top + metrics(el).asc;

  const cm = root.querySelector('.cm-editor');
  let column, numbers = [], lines = [], textSize, numSize, current = null, others = [];
  if (cm && cm.querySelector('.cm-lineNumbers')) {
    column = cm.querySelector('.cm-gutters');
    const els = [...cm.querySelectorAll('.cm-lineNumbers .cm-gutterElement')].filter((e) => e.textContent.trim() && getComputedStyle(e).visibility !== 'hidden');
    numbers = els.slice(0, 5).map((e) => { const r = document.createRange(); r.selectNodeContents(e); const rect = r.getBoundingClientRect(); return { n: e.textContent, c: centre(rect), b: baseline(e, rect), el: e }; });
    lines = [...cm.querySelectorAll('.cm-line')].slice(0, 5).map((l) => { const r = document.createRange(); r.selectNodeContents(l); const rect = [...r.getClientRects()][0] || l.getBoundingClientRect(); return { c: centre(rect), b: baseline(l, rect) }; });
    textSize = parseFloat(getComputedStyle(cm.querySelector('.cm-line')).fontSize);
    numSize = parseFloat(getComputedStyle(els[0]).fontSize);
    const act = cm.querySelector('.cm-lineNumbers .cm-activeLineGutter');
    current = act ? getComputedStyle(act).color : null;
    others = els.filter((e) => !e.classList.contains('cm-activeLineGutter')).map((e) => getComputedStyle(e).color);
  } else {
    column = root.querySelector('.doc-gutter');
    const box = root.querySelector('textarea');
    if (!column || !box || getComputedStyle(column).display === 'none') return { missing: true };
    const node = [...column.childNodes];
    const walker = document.createTreeWalker(column, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    // Each number's own glyph box, through a Range over its characters.
    for (const t of texts) {
      let at = 0;
      for (const part of t.data.split('\n')) {
        if (part && numbers.length < 5) { const r = document.createRange(); r.setStart(t, at); r.setEnd(t, at + part.length); const rect = r.getBoundingClientRect(); numbers.push({ n: part, c: centre(rect), b: baseline(column, rect) }); }
        at += part.length + 1;
      }
    }
    numbers.sort((a, b) => a.c - b.c);
    const cs = getComputedStyle(box);
    const lh = parseFloat(cs.lineHeight);
    const top = box.getBoundingClientRect().top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop) - box.scrollTop;
    const m = metrics(box);
    lines = [0, 1, 2, 3, 4].map((i) => ({ c: top + (i + 0.5) * lh, b: top + i * lh + (lh - m.asc - m.desc) / 2 + m.asc }));
    textSize = parseFloat(cs.fontSize);
    numSize = parseFloat(getComputedStyle(column).fontSize);
    const cur = column.querySelector('.doc-gutter-current');
    current = cur ? getComputedStyle(cur).color : null;
    others = [getComputedStyle(column).color];
    void node;
  }
  const cs = getComputedStyle(column);
  const bg = ground(column);
  const numColour = over(rgba(others[0] || cs.color), bg);
  return {
    border: ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs[`border${s}Width`])).reduce((a, b) => a + b, 0),
    radius: cs.borderTopLeftRadius,
    fill: cs.backgroundColor,
    ownFill: rgba(cs.backgroundColor)[3] > 0.06,
    textSize,
    numSize,
    nums: numbers.map((x) => x.n).join(','),
    drift: numbers.map((x, i) => +(x.b - lines[i].b).toFixed(2)),
    centred: numbers.map((x, i) => +(x.c - lines[i].c).toFixed(2)),
    contrast: +ratio(numColour, bg).toFixed(2),
    current: current ? +ratio(over(rgba(current), bg), bg).toFixed(2) : null,
    currentDiffers: current !== null && others.every((o) => o !== current),
    tabular: (cs.fontVariantNumeric || '').includes('tabular') || getComputedStyle(numbers[0]?.el || column).fontVariantNumeric.includes('tabular'),
  };
}

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const phone = width < 600;
  const { browser, page } = await boot({
    viewport: { width, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(2500);
  const run = (root) => page.evaluate(([src, sel]) => (new Function('root', `return (${src})(root)`))(document.querySelector(sel)), [measureIn.toString(), root]);
  const report = (name, m) => {
    if (!m || m.missing) return check(`${name}: gutter present`, false, JSON.stringify(m));
    check(`${name}: no box (border 0, radius 0, no fill)`, m.border === 0 && parseFloat(m.radius) === 0 && !m.ownFill, `border ${m.border} radius ${m.radius} fill ${m.fill}`);
    check(`${name}: numbers smaller than text`, m.numSize < m.textSize, `${m.numSize} < ${m.textSize}`);
    check(`${name}: tabular numbers`, m.tabular);
    check(`${name}: five numbers on their lines' baselines within 1px`, m.drift.length === 5 && m.drift.every((d) => Math.abs(d) <= 1), `${m.nums} baseline ${m.drift.join(' ')} centre ${m.centred.join(' ')}`);
    check(`${name}: numbers >= 3:1`, m.contrast >= 3, String(m.contrast));
    return m;
  };
  await page.evaluate(() => { localStorage.setItem('doc-gutter', '1'); });

  // 1. Capture, before the box is focused: the textarea and its `.doc-gutter`.
  await page.evaluate((text) => { applyDocGutter(); switchTab('notes'); showNotesSection('capture'); const b = document.getElementById('entry-content'); b.value = text; b.dispatchEvent(new Event('input', { bubbles: true })); }, LINES);
  await page.waitForTimeout(900);
  const plain = await page.evaluate(() => !document.querySelector('#capture .gutter-wrap .cm-editor'));
  if (plain) report('capture (textarea)', await run('#capture .gutter-wrap'));
  else console.log('skip capture (textarea): the editor mounted before focus');

  // 2. Capture, focused: the editor view.
  await page.click('#entry-content', { force: true }).catch(() => {});
  await page.waitForTimeout(1800);
  await page.evaluate(() => { const v = document.querySelector('#capture .cm-content'); v && v.focus(); });
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  const cap = report('capture (editor)', await run('#capture .gutter-wrap'));
  if (cap) {
    check('capture: focused line number brighter than the rest', cap.currentDiffers && cap.current > cap.contrast, `current ${cap.current} vs ${cap.contrast}`);
    const extra = await page.evaluate(() => [...document.querySelectorAll('#capture .gutter-wrap > .doc-gutter')].filter((g) => getComputedStyle(g).display !== 'none').length);
    check('capture: one column of numbers, not two', extra === 0, `${extra} textarea gutters still showing`);
  }

  // 3. The note edit form, on a note made for it.
  const id = await page.evaluate(async (text) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: text, title: 'Gutter sweep' }) })).id, LINES);
  await page.evaluate(() => showNotesSection('browse'));
  await page.waitForTimeout(1200);
  await page.evaluate(async (entryId) => { if (typeof loadEntries === 'function') await loadEntries(); }, id);
  await page.waitForTimeout(900);
  const opened = await page.evaluate((entryId) => {
    const card = document.querySelector(`#entry-list [data-id="${entryId}"], #entry-list [data-entry-id="${entryId}"]`);
    const btn = (card || document).querySelector('#entry-list button[title="Edit this entry"], button[title="Edit this entry"]');
    if (btn) { btn.click(); return true; }
    return false;
  }, id);
  await page.waitForTimeout(1500);
  if (opened) {
    await page.evaluate(() => { const v = document.querySelector('#entry-list .gutter-wrap .cm-content'); if (v) v.focus(); else document.querySelector('#entry-list .gutter-wrap textarea')?.focus(); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('#entry-list .gutter-wrap .cm-content')?.focus());
    await page.keyboard.press('Control+Home');
    await page.waitForTimeout(300);
    const form = report('note edit form', await run('#entry-list .gutter-wrap'));
    if (form) check('note edit: focused line number brighter', form.currentDiffers && form.current > form.contrast, `current ${form.current} vs ${form.contrast}`);
    await page.keyboard.press('Escape');
  } else check('note edit form opened', false);

  // 4. The documents editor.
  const doc = await page.evaluate(async (text) => (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Gutter sweep', content: text }) })).id, LINES);
  await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, doc);
  await page.waitForTimeout(4000);
  //: A phone opens a document to read; the editor is the Live view.
  await page.evaluate(() => { if (typeof setDocView === 'function') setDocView('live'); setDocGutter(true); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.doc-editor .cm-content')?.focus());
  await page.keyboard.press('Control+Home');
  await page.waitForTimeout(400);
  const docs = report('documents', await run('.doc-editor'));
  if (docs) check('documents: focused line number brighter', docs.currentDiffers && docs.current > docs.contrast, `current ${docs.current} vs ${docs.contrast}`);

  await page.evaluate(async ([entryId, docId]) => {
    await apiJson(`/entries/${entryId}`, { method: 'DELETE' }).catch(() => {});
    await apiJson(`/documents/${docId}`, { method: 'DELETE' }).catch(() => {});
    localStorage.setItem('doc-gutter', '0');
  }, [id, doc]);
  check('no page errors', !errors.length, errors.join(' | '));
  console.log(`${failures ? 'FAILED' : 'PASSED'} gutter ${width} ${process.env.THEME || 'light'}`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
