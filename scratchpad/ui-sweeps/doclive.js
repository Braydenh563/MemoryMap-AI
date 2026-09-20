// INBOX 262 (3): "the rendering on the live view of the documents needs a lot
// of improvement."
//
// The live view's job is to look like the rendered one while staying editable,
// so the measurement is the two views side by side on the same document: for
// each construct, the type size, weight, line height, indent and colour the
// live view paints against what the preview paints. A difference is not
// automatically a fault (a live view keeps its markers, and a monospace
// gutter has to line up), but it is the list worth arguing about, and it is a
// list of numbers rather than of impressions.
const { boot } = require('./lib.js');

const DOC = [
  '# Heading one',
  '',
  'A paragraph with **bold**, *italic*, `code` and a [link](https://example.com).',
  '',
  '## Heading two',
  '',
  '### Heading three',
  '',
  '#### Heading four',
  '',
  '- First bullet that runs on long enough to wrap onto a second line in the editor, which is where a hanging indent shows whether it is real or not, so this one keeps going for a while yet.',
  '- Second bullet',
  '  - Nested bullet',
  '',
  '1. First number',
  '2. Second number',
  '',
  '> A quoted line.',
  '',
  '| Column | Other |',
  '| --- | --- |',
  '| one | two |',
  '',
  '```python',
  'def hello():',
  '    return 1',
  '```',
  '',
  '---',
  '',
  '- [ ] A task',
  '- [x] A done task',
  '',
].join('\n');

const READ = (el) => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
    weight: cs.fontWeight,
    line: Math.round(parseFloat(cs.lineHeight) * 10) / 10,
    family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
    colour: cs.color,
    left: Math.round(r.left),
    width: Math.round(r.width),
  };
};

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);
  const id = await page.evaluate(async (body) => {
    const doc = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Live view probe', content: body }) });
    return doc.id;
  }, DOC);
  await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, id);
  await page.waitForTimeout(5000);

  // The app's CSP refuses an inline <script>, so the reader is handed to each
  // evaluate as an argument and rebuilt there instead of being installed once.
  const READ_SRC = READ.toString();

  const live = await page.evaluate((readSrc) => {
    // eslint-disable-next-line no-new-func
    window.__read = new Function(`return (${readSrc})`)();
    const pick = (sel) => { const el = document.querySelector(`#doc-editor ${sel}`); return el ? window.__read(el) : null; };
    const body = document.querySelector('#doc-editor .cm-content');
    return {
      h1: pick('.cm-md-h1'), h2: pick('.cm-md-h2'), h3: pick('.cm-md-h3'), h4: pick('.cm-md-h4'),
      quote: pick('.cm-md-quote'), code: pick('.cm-md-code'), rule: pick('.cm-md-rule'),
      table: pick('.cm-md-table'), task: pick('.cm-md-task'), strong: pick('.cm-md-strong'),
      body: body ? window.__read(body) : null,
      // Lists are the construct a live view most often leaves as raw text.
      lists: [...document.querySelectorAll('#doc-editor .cm-line')]
        .filter((l) => /^\s*[-*]\s|^\s*\d+\.\s/.test(l.textContent))
        .slice(0, 4)
        .map((l) => {
          // Where the words actually start, and where a wrapped line
          // restarts: a hanging indent is only real if the two agree.
          const walker = document.createTreeWalker(l, NodeFilter.SHOW_TEXT);
          const rects = [];
          while (walker.nextNode()) {
            const r = document.createRange();
            r.selectNodeContents(walker.currentNode);
            for (const box of r.getClientRects()) rects.push({ x: Math.round(box.left), y: Math.round(box.top) });
          }
          const rows = [...new Set(rects.map((r) => r.y))].sort((a, b) => a - b);
          return {
            text: l.textContent.slice(0, 18),
            ...window.__read(l),
            indent: getComputedStyle(l).textIndent,
            pad: getComputedStyle(l).paddingLeft,
            markerX: rects.length ? Math.min(...rects.filter((r) => r.y === rows[0]).map((r) => r.x)) : null,
            wrapX: rows.length > 1 ? Math.min(...rects.filter((r) => r.y === rows[1]).map((r) => r.x)) : null,
          };
        }),
    };
  }, READ_SRC);

  // The same document, rendered.
  // "rendered", not "preview": DOC_VIEWS is source/live/split/rendered/plain,
  // and an unknown mode falls back to "source", which is why the first run of
  // this probe compared the live view with an empty pane.
  await page.evaluate(() => { if (typeof setDocView === 'function') setDocView('rendered'); });
  await page.waitForTimeout(2500);
  const preview = await page.evaluate((readSrc) => {
    window.__read = new Function(`return (${readSrc})`)();
    const host = document.getElementById('doc-preview') || document;
    const pick = (sel) => { const el = host.querySelector(sel); return el ? window.__read(el) : null; };
    return {
      found: host !== document,
      h1: pick('h1'), h2: pick('h2'), h3: pick('h3'), h4: pick('h4'),
      quote: pick('blockquote'), code: pick('pre'), rule: pick('hr'),
      table: pick('table'), strong: pick('strong'),
      body: pick('p'),
      li: pick('li'), ul: pick('ul'),
    };
  }, READ_SRC);

  console.log(JSON.stringify({ live, preview }, null, 1));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
