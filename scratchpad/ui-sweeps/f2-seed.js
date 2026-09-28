// A large notebook for the style-invalidation hunt (INBOX 400 (1)):
// 500 notes, 50 documents, 40 conversations, two whiteboards and a
// 500-topic mind map. Every row goes through the app's own routes so the
// lists draw what a real notebook draws.
//
//   BASE=http://127.0.0.1:8804 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/f2-seed.js
const { boot } = require('./lib.js');

const WORDS = ('the quick brown fox jumps over a lazy dog while reading notes about design ' +
  'systems budgets travel recipes meetings papers research ideas plans reviews').split(' ');
const para = (n, seed) => Array.from({ length: n }, (_, i) => WORDS[(i * 7 + seed) % WORDS.length]).join(' ');

function outline(n) {
  const lines = ['# Perf map', '- Trunk'];
  const depth = [0];
  let made = 1, parent = 0, kids = 0;
  while (made < n) {
    if (kids === 5) { parent += 1; kids = 0; continue; }
    const d = depth[parent] + 1;
    depth.push(d);
    lines.push(`${'  '.repeat(d)}- Topic ${made}`);
    made += 1; kids += 1;
  }
  return lines.join('\n');
}

(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async ({ notes, docs, convs, mapText }) => {
    const post = (path, body) => apiJson(path, { method: 'POST', body: JSON.stringify(body) });
    const batch = async (items, fn, size = 8) => {
      for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
    };
    await batch(notes, (c) => post('/entries', { content: c }));
    await batch(docs, (d) => post('/documents', d));
    await batch(convs, (c) => post('/conversations', c));
    await post('/whiteboard/boards', { name: 'Field notes', kind: 'whiteboard' });
    await post('/whiteboard/boards', { name: 'Planning board', kind: 'whiteboard' });
    const map = await post('/whiteboard/boards/import', { format: 'markdown', content: mapText, name: 'Perf map' });
    return { map: map && map.id };
  }, {
    notes: Array.from({ length: 500 }, (_, i) => `Note ${i + 1} about ${WORDS[i % WORDS.length]}. ${para(20 + (i % 40), i)} #tag${i % 12}`),
    docs: Array.from({ length: 50 }, (_, i) => ({ title: `Document ${i + 1}`, content: `# Document ${i + 1}\n\n` + Array.from({ length: 30 }, (_, k) => para(40, i + k)).join('\n\n') })),
    convs: Array.from({ length: 40 }, (_, i) => ({ question: `Question ${i + 1} about ${WORDS[i % WORDS.length]}`, answer: para(80, i) })),
    mapText: outline(500),
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
