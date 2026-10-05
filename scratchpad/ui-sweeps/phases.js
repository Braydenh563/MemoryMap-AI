// INBOX 649: one phase vocabulary for every chat surface. Drives the real Chat
// tab with a hand-fed NDJSON stream (api.stream is replaced in the page, so
// each event arrives when this script says and the label is read between
// events), once with motion on and once with progress motion "still".
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node phases.js
//
// Measured per stage: the label's text, the line's phase name, the
// indicator's two-state shape, and (motion off) that the label is on screen,
// not clipped, pulsing, and the stepped word is clipped so nothing repeats.
const { boot } = require('./lib.js');
let failures = 0;
const check = (label, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`); };

async function run(still) {
  const tag = still ? 'motion off' : 'motion on';
  const { browser, page } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  //: Only so the Chat box is enabled (it is gated on a reachable model); the
  //: stream itself is replaced below. scratchpad/fake_openai_server.py --port 8856.
  await page.evaluate(async (port) => {
    await apiJson('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: `http://127.0.0.1:${port}/v1` }) }).catch(() => null);
    if (typeof refreshModelStatus === 'function') await refreshModelStatus();
  }, process.env.FAKE || '8856');
  await page.waitForTimeout(1500);
  await page.evaluate((s) => { document.documentElement.dataset.progressMotion = s ? 'still' : 'always'; }, still);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    if (typeof startNewChat === 'function') startNewChat();
    const enc = new TextEncoder();
    api.stream = async () => new Response(new ReadableStream({ start(c) { window.__ctl = c; } }));
    window.__feed = (o) => window.__ctl.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
    window.__end = () => window.__ctl.close();
  });
  const read = () => page.evaluate(() => {
    const line = document.querySelector('#chat-messages .progress-line');
    if (!line) return null;
    const label = line.querySelector('.progress-line-label');
    const dots = line.querySelector('.typing-dots');
    const lr = label.getBoundingClientRect();
    const dr = dots.getBoundingClientRect();
    return {
      text: label.textContent,
      phase: line.dataset.phaseName,
      shape: dots.dataset.phase,
      aria: dots.getAttribute('aria-label'),
      labelW: Math.round(lr.width),
      labelOpacity: +getComputedStyle(label).opacity,
      labelAnimation: getComputedStyle(label).animationName,
      dotsW: Math.round(dr.width),
      still: line.classList.contains('progress-line-still'),
    };
  });
  await page.fill('#chat-input', 'what did I write about the garden?');
  await page.click('#chat-send');
  await page.waitForFunction(() => window.__ctl && document.querySelector('#chat-messages .progress-line'), null, { timeout: 15000 });
  await page.waitForTimeout(400);

  const stages = [];
  const stage = async (name, expectText, expectPhase, expectShape) => {
    await page.waitForTimeout(450);
    const m = await read();
    stages.push([name, m]);
    check(`${tag}: ${name} reads "${expectText}"`, m && m.text === expectText && m.aria === expectText, JSON.stringify(m && [m.text, m.aria]));
    check(`${tag}: ${name} phase ${expectPhase}, shape ${expectShape}`, m && m.phase === expectPhase && m.shape === expectShape, JSON.stringify(m && [m.phase, m.shape]));
    return m;
  };

  const first = await stage('request sent', 'Reaching Atlas…', 'reaching', 'thinking');
  if (still && first) {
    check('motion off: the label is on screen, readable and pulsing', first.still && first.labelW > 60 && first.labelOpacity > 0 && first.labelAnimation === 'typing-word-pulse', JSON.stringify(first));
    check('motion off: the stepped word is clipped, nothing repeats', first.dotsW <= 1, `indicator ${first.dotsW}px`);
  }
  await page.evaluate(() => window.__feed({ type: 'status', stage: 'searching' }));
  await stage('server searching', 'Reading your notes…', 'reading', 'thinking');
  await page.evaluate(() => window.__feed({ type: 'meta', raw_results: [], search_mode: 'keyword', connected_ids: [], match_info: {} }));
  await stage('meta, no notes', 'Reaching Atlas…', 'reaching', 'thinking');
  await page.waitForTimeout(5300);
  await stage('quiet for five seconds after meta', 'Waking the model…', 'loading', 'thinking');
  await page.evaluate(() => window.__feed({ type: 'thinking', delta: 'Let me look.' }));
  await stage('reasoning delta', 'Atlas is thinking…', 'thinking', 'thinking');
  await page.evaluate(() => window.__feed({ type: 'tool', ok: true, name: 'list_notes', label: 'ph:books Listed notes (3)', touched: [] }));
  await stage('tool call', 'Atlas is listing notes (3)…', 'tool', 'thinking');
  await page.evaluate(() => window.__feed({ type: 'answer', delta: 'You wrote about tomatoes.' }));
  const writing = await stage('answer delta', 'Atlas is writing…', 'writing', 'writing');
  if (still && writing) check('motion off: still readable while writing', writing.labelW > 60 && writing.labelOpacity > 0, JSON.stringify(writing));
  await page.evaluate(() => { window.__feed({ type: 'answer', delta: ' More.' }); window.__end(); });
  await page.waitForTimeout(1500);
  const gone = await page.evaluate(() => !document.querySelector('#chat-messages .progress-line'));
  check(`${tag}: the line is gone when the turn ends`, gone);
  check(`${tag}: no page errors`, !errors.length, errors.join(' | '));
  await browser.close();
}

(async () => {
  await run(false);
  await run(true);
  console.log(`${failures ? 'FAILED' : 'PASSED'} phases`);
  process.exit(failures ? 1 : 0);
})();
