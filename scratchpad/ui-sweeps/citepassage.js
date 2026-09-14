// CHAT_PLAN decision 2's last unbuilt half, and the last open step of
// `docs/roadmap/archive/agent-remaining/chat-timeline-skills.md` item 1: "hover
// highlights `note.content.slice(start, end)`".
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/citepassage.js
//
// The span comes from the server (`ai/grounding.py::_mark`) and there is no
// model here, so `/chat/stream` is shimmed in the page with a real answer, a
// real retrieval row and a real grounding event carrying character offsets
// into the note this sweep wrote. What is measured is that the card shows
// exactly `content.slice(start, end)`, which is the claim the feature makes.
const { boot } = require('./lib.js');

const CONTENT = [
  'Allotment plan for the spring.',
  '',
  'The beans need netting next week, the pigeons took the last lot within days.',
  '',
  'Also: order more twine, and ask Sam about the water butt.',
].join('\n');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Send is disabled with no model connected (CHAT_PLAN decision 11).
  await page.route('**/models/status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ollama_running: true, chat_model: 'test-model', chat_model_installed: true, installed_models: [{ name: 'test-model' }], embedding_ready: true, pulls: {}, reindex: { status: 'idle' } }),
    })
  );
  await page.evaluate(() => refreshModelStatus && refreshModelStatus());
  await page.waitForTimeout(600);

  const noteId = await page.evaluate(async (content) => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const made = await (await fetch('/entries', { method: 'POST', headers: h, body: JSON.stringify({ content }) })).json();
    await loadEntries();
    return made.id;
  }, CONTENT);

  const start = CONTENT.indexOf('The beans need netting');
  const end = CONTENT.indexOf('within days.') + 'within days.'.length;
  const passage = CONTENT.slice(start, end);

  await page.evaluate(() => {
    const real = window.fetch;
    window.__feed = null;
    window.fetch = (url, opts) => {
      const href = typeof url === 'string' ? url : url.url;
      if (!href.includes('/chat/stream')) return real(url, opts);
      const body = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          window.__feed = (line) => (line === null ? controller.close() : controller.enqueue(enc.encode(JSON.stringify(line) + '\n')));
        },
      });
      return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }));
    };
  });

  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(600);
  await page.fill('#chat-input', 'what is due in the allotment?');
  await page.click('#chat-send');
  await page.waitForTimeout(700);
  const sentence = 'The beans need netting next week.';
  await page.evaluate(
    ({ id, content, sentence, start, end }) => {
      window.__feed({ type: 'meta', raw_results: [{ id, content, score: 1 }], search_mode: 'semantic' });
      window.__feed({ type: 'answer', delta: sentence });
      window.__feed({ type: 'grounding', sentences: [{ sentence, note_id: id, start, end }] });
      window.__feed(null);
    },
    { id: noteId, content: CONTENT, sentence, start, end }
  );
  await page.waitForTimeout(1200);

  const built = await page.evaluate(() => ({
    marks: document.querySelectorAll('#chat-messages .answer-citation-link').length,
    cards: document.querySelectorAll('#chat-messages .chat-source-card').length,
    tagged: document.querySelectorAll('#chat-messages .chat-source-card[data-note-id]').length,
  }));
  console.log(`  built: ${JSON.stringify(built)}`);
  check('the answer carries a citation mark and the panel a card',
    built.marks >= 1 && built.cards >= 1 && built.tagged >= 1, JSON.stringify(built));

  const box = await page.evaluate(() => {
    const link = document.querySelector('#chat-messages .answer-citation-link');
    const r = link.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.move(box.x, box.y);
  await page.waitForTimeout(300);
  const hovered = await page.evaluate(() => {
    const shown = document.querySelector('.chat-source-passage');
    const card = document.querySelector('.chat-source-card.is-cited');
    const cs = shown ? getComputedStyle(shown.querySelector('mark')) : null;
    return {
      text: shown ? shown.textContent : '',
      cited: !!card,
      noteId: card?.dataset.noteId || '',
      detailsOpen: !!document.querySelector('#chat-messages details.chat-sources[open]'),
      background: cs?.backgroundColor || '',
      height: shown ? +shown.getBoundingClientRect().height.toFixed(1) : 0,
    };
  });
  console.log(`  hovered: ${JSON.stringify(hovered)}`);
  check('hover shows exactly content.slice(start, end)', hovered.text === passage,
    `${hovered.text.length} chars against ${passage.length}: "${hovered.text.slice(0, 60)}"`);
  check('on the card for that note, with the panel opened',
    hovered.cited && hovered.noteId === String(noteId) && hovered.detailsOpen,
    `card note ${hovered.noteId} against ${noteId}, details open ${hovered.detailsOpen}`);
  check('drawn as a highlight, not as plain text',
    hovered.background !== '' && hovered.background !== 'rgba(0, 0, 0, 0)' && hovered.height > 0,
    `mark ground ${hovered.background}, ${hovered.height}px tall`);

  await page.mouse.move(box.x, box.y + 240);
  await page.waitForTimeout(300);
  const left = await page.evaluate(() => ({
    passages: document.querySelectorAll('.chat-source-passage').length,
    cited: document.querySelectorAll('.chat-source-card.is-cited').length,
  }));
  check('and it goes away again', left.passages === 0 && left.cited === 0, JSON.stringify(left));

  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | ') || 'none');
  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
