// INBOX 187: "the writing carette shows on the popup agent when the 3-dot
// animation is showing and it is waiting for a model response which it
// shouldnt".
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/agentcaret.js
//
// There is no model in this sandbox, so the turn is driven by stubbing
// `/chat/stream` with a real NDJSON body held back for two seconds: that hold
// is the waiting state the report is about, and it is the only way to measure
// the DOM while the dots are the only thing in the bubble. The caret is a
// `::after` pseudo-element (01-forms-settings.css), so what is measured is
// `getComputedStyle(el, "::after")` on whichever element the selector lands
// on, not a node.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  // The palette disables its own field when no model answers (decision 11),
  // and this sandbox has none, so `/models/status` is stubbed as connected.
  // Nothing else about the turn is faked by it: the stream stub below is what
  // supplies the answer.
  await page.route('**/models/status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ollama_running: true,
        chat_model: 'test-model',
        embedding_ready: true,
        pulls: {},
        reindex: { status: 'idle' },
      }),
    })
  );
  await page.evaluate(() => refreshModelStatus && refreshModelStatus());
  await page.waitForTimeout(600);

  // `route.fulfill` delivers a whole body at once, which collapses the three
  // states this sweep has to tell apart into one frame. So `/chat/stream` is
  // shimmed in the page instead, with a ReadableStream this script feeds a
  // line at a time: the wait, the first token and the end of the turn are
  // then three separate moments the DOM can be read in.
  await page.evaluate(() => {
    const real = window.fetch;
    window.__feed = null;
    window.fetch = (url, opts) => {
      const href = typeof url === 'string' ? url : url.url;
      if (!href.includes('/chat/stream')) return real(url, opts);
      const body = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          window.__feed = (line) => {
            if (line === null) controller.close();
            else controller.enqueue(enc.encode(JSON.stringify(line) + '\n'));
          };
        },
      });
      return Promise.resolve(
        new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } })
      );
    };
  });

  await page.evaluate(() => toggleAgentPalette());
  await page.waitForSelector('#command-palette-overlay:not(.hidden)');
  await page.fill('#command-palette-input', 'what did I write about beans');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#command-palette-results .bubble-answer .typing-dots', { timeout: 10000 });
  await page.waitForTimeout(300);

  // The caret, whichever element the four selectors land on. During the wait
  // the box holds the dots span, so the `> :last-child` arm is the live one.
  const caretOf = () => {
    const box = document.querySelector('#command-palette-results .bubble-answer');
    if (!box) return { there: false, why: 'no answer box' };
    const on = box.children.length ? box.lastElementChild : box;
    const cs = getComputedStyle(on, '::after');
    return {
      there: cs.content !== 'none' && cs.content !== 'normal' && parseFloat(cs.width) > 0,
      streaming: box.classList.contains('is-streaming'),
      host: on === box ? 'box' : on.className || on.tagName,
      content: cs.content,
      width: cs.width,
      background: cs.backgroundColor,
      dots: !!box.querySelector('.typing-dots'),
      text: box.textContent.trim().slice(0, 40),
    };
  };

  const waiting = await page.evaluate(caretOf);
  console.log('  during the wait:', JSON.stringify(waiting));
  check('no caret while the dots run', !waiting.there,
    `dots=${waiting.dots} is-streaming=${waiting.streaming} caret content=${waiting.content} width=${waiting.width}`);

  await page.evaluate(() => {
    window.__feed({ type: 'meta', raw_results: [] });
    window.__feed({ type: 'answer', delta: 'The beans need netting.' });
  });
  await page.waitForTimeout(400);
  const writing = await page.evaluate(caretOf);
  console.log('  after the first token:', JSON.stringify(writing));
  check('caret after the first token', writing.there,
    `text="${writing.text}" is-streaming=${writing.streaming} caret content=${writing.content} width=${writing.width} bg=${writing.background}`);
  check('dots gone once text arrives', !writing.dots, `dots=${writing.dots}`);

  await page.evaluate(() => window.__feed(null));
  await page.waitForTimeout(800);
  const done = await page.evaluate(caretOf);
  check('caret gone when the turn ends', !done.there,
    `is-streaming=${done.streaming} caret content=${done.content} width=${done.width}`);

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
