// INBOX 190: "the popup agent needs more ui, ux and functionality refinements
// to be more professional. it needs to be more versatile and usable across the
// whole app... also I was wondering if there is a way to make the help chat bot
// more accessible throughout the settings modal and also even accessible
// application wide?? maybe give it more knowledge... and give it a fitting
// name??"
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/agentwide.js
//
// Four things, each a number: the agent opens from every tab and its starters
// change with the tab; the keyboard reaches the starters; the Guide opens from
// three tabs and two Settings panes with the caret in its field and Escape
// putting it back; and both controls are real touch targets at 390.
const { boot } = require('./lib.js');

const TABS = ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders'];

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // The palette disables its own field with no model connected (CHAT_PLAN
  // decision 11) and this sandbox has none, so the keyboard half would be
  // measuring a disabled box. Only the status is stubbed; nothing here asks
  // the model anything.
  await page.route('**/models/status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ollama_running: true, chat_model: 'test-model', chat_model_installed: true, installed_models: [{ name: 'test-model' }], embedding_ready: true, pulls: {}, reindex: { status: 'idle' } }),
    })
  );
  await page.evaluate(() => refreshModelStatus && refreshModelStatus());
  await page.waitForTimeout(600);

  // --- (a) reachable from every tab, same icon, same shortcut ---------------
  const perTab = [];
  for (const tab of TABS) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(350);
    const row = await page.evaluate(() => {
      const button = document.getElementById('agent-btn');
      const r = button.getBoundingClientRect();
      // Opened through the button, not through the function, so what is
      // measured is the route a person actually has.
      button.click();
      const open = !document.getElementById('command-palette-overlay').classList.contains('hidden');
      const groups = [...document.querySelectorAll('#command-palette-starters .starter-verb')].map((p) => p.textContent);
      const starters = [...document.querySelectorAll('#command-palette-starters [data-example]')].map((b) => b.textContent);
      const first = starters.slice(0, 2);
      document.getElementById('agent-btn').click();
      return {
        icon: button.querySelector('i')?.className,
        title: button.title,
        w: +r.width.toFixed(1),
        h: +r.height.toFixed(1),
        open,
        groups,
        first,
        total: starters.length,
      };
    });
    perTab.push([tab, row]);
  }
  const icons = new Set(perTab.map(([, r]) => r.icon));
  const titles = new Set(perTab.map(([, r]) => r.title));
  check('the agent opens from every tab', perTab.every(([, r]) => r.open),
    perTab.map(([t, r]) => `${t}:${r.open}`).join(' '));
  check('one icon and one shortcut everywhere', icons.size === 1 && titles.size === 1,
    `${[...icons].join('|')} / ${[...titles].join('|')}`);
  const firstGroups = perTab.map(([t, r]) => `${t}:${(r.groups[0] || '-')}`);
  check('the first starter group names the tab you are on',
    perTab.every(([t, r]) => (r.groups[0] || '').toLowerCase().includes(t === 'library' ? 'library' : t)),
    firstGroups.join(' '));
  const distinct = new Set(perTab.map(([, r]) => r.first.join('|')));
  check('the starters differ by tab', distinct.size >= 5,
    `${distinct.size} distinct opening pairs over ${TABS.length} tabs; ${perTab.map(([t, r]) => `${t}=${r.first[0]}`).join(', ')}`);
  console.log(`  starters per tab: ${perTab.map(([t, r]) => `${t} ${r.total}`).join(', ')}`);

  // --- (d) the keyboard ------------------------------------------------------
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(300);
  await page.click('#agent-btn');
  await page.waitForSelector('#command-palette-overlay:not(.hidden)');
  await page.waitForTimeout(200);
  const focusIs = () => page.evaluate(() => {
    const el = document.activeElement;
    return { id: el?.id || '', text: (el?.textContent || '').trim().slice(0, 30), tag: el?.tagName };
  });
  const onOpen = await focusIs();
  await page.keyboard.press('ArrowDown');
  const first = await focusIs();
  await page.keyboard.press('ArrowDown');
  const second = await focusIs();
  await page.keyboard.press('ArrowUp');
  const back = await focusIs();
  check('the caret starts in the box', onOpen.id === 'command-palette-input', JSON.stringify(onOpen));
  check('Down walks into the starters and Down again moves on',
    first.tag === 'BUTTON' && second.tag === 'BUTTON' && first.text !== second.text,
    `${first.text} -> ${second.text}`);
  check('Up walks back', back.text === first.text, `${second.text} -> ${back.text}`);
  await page.keyboard.press('Escape');
  const afterEscape = await focusIs();
  check('Escape in the starters returns the caret to the box',
    afterEscape.id === 'command-palette-input', JSON.stringify(afterEscape));
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() =>
    document.getElementById('command-palette-overlay').classList.contains('hidden'));
  check('Escape again closes the panel', closed, `hidden ${closed}`);

  const helpLine = await page.evaluate(() => {
    const toggle = document.querySelector('[data-help-for="command-palette-help"]');
    return { there: !!toggle, body: !!document.getElementById('command-palette-help') };
  });
  check('the panel carries a data-help-for line', helpLine.there && helpLine.body, JSON.stringify(helpLine));

  // --- (b) the state line: what it is working on, and which tool ran --------
  // The stream is shimmed in the page (see agentcaret.js for why `route` is
  // not enough) so the three states of that line can be read one at a time.
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
  await page.click('#agent-btn');
  await page.waitForSelector('#command-palette-overlay:not(.hidden)');
  await page.fill('#command-palette-input', 'file everything about beans and tag it');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const statusLine = { asked: await page.evaluate(() => document.getElementById('command-palette-status').textContent.trim()) };
  await page.evaluate(() => {
    window.__feed({ type: 'meta', raw_results: [] });
    window.__feed({ type: 'tool', label: 'ph:books Listed notes (12)', ok: true });
  });
  await page.waitForTimeout(300);
  statusLine.tool = await page.evaluate(() => document.getElementById('command-palette-status').textContent.trim());
  await page.evaluate(() => {
    window.__feed({ type: 'answer', delta: 'Filed and tagged.' });
    window.__feed(null);
  });
  await page.waitForTimeout(600);
  statusLine.done = await page.evaluate(() => document.getElementById('command-palette-status').textContent.trim());
  statusLine.steps = await page.evaluate(() =>
    document.querySelector('#command-palette-results .agent-step-group summary')?.textContent.trim() || '');
  console.log(`  state line: ${JSON.stringify(statusLine)}`);
  check('the state line says what it is working on',
    /Working on: file everything about beans/.test(statusLine.asked), `"${statusLine.asked}"`);
  check('the state line names the tool while it runs',
    /Listed notes \(12\)/.test(statusLine.tool), `"${statusLine.tool}"`);
  check('the state line says what the turn came to',
    /Done, 1 step, last: Listed notes/.test(statusLine.done), `"${statusLine.done}"`);
  check('the tool card is still folded under the answer',
    /Finished 1 step/.test(statusLine.steps), `"${statusLine.steps}"`);
  await page.evaluate(() => toggleAgentPalette());
  await page.waitForTimeout(200);

  // --- the Guide: three tabs and two Settings panes -------------------------
  const openedFrom = [];
  for (const tab of ['dashboard', 'chat', 'timeline']) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(300);
    await page.click('#guide-btn');
    await page.waitForTimeout(350);
    openedFrom.push(await page.evaluate((t) => {
      const sheet = document.querySelector('[data-sheet="guide"]');
      const ok = {
        tab: t,
        sheet: !!sheet,
        title: sheet?.querySelector('.sheet-title')?.textContent || '',
        holdsChat: !!sheet?.querySelector('#help-chat-input'),
        focus: document.activeElement?.id || '',
      };
      return ok;
    }, tab));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    openedFrom[openedFrom.length - 1].returned = await page.evaluate(() => ({
      gone: !document.querySelector('[data-sheet="guide"]'),
      home: !!document.querySelector('#settings-help #help-chat-group'),
      focus: document.activeElement?.id || '',
    }));
  }
  console.log(`  guide from tabs: ${JSON.stringify(openedFrom)}`);
  check('the Guide opens from three tabs, named, with the chat in it',
    openedFrom.every((r) => r.sheet && r.title === 'Guide' && r.holdsChat), JSON.stringify(openedFrom.map((r) => r.title)));
  check('focus lands in the Guide input',
    openedFrom.every((r) => r.focus === 'help-chat-input'), openedFrom.map((r) => r.focus).join(' '));
  check('Escape closes it, puts the chat back and returns focus',
    openedFrom.every((r) => r.returned.gone && r.returned.home && r.returned.focus === 'guide-btn'),
    JSON.stringify(openedFrom.map((r) => r.returned)));

  const panes = [];
  // Opened once: the modal covers its own opener, so a second click on the
  // header button times out on "the settings modal intercepts pointer events".
  await page.click('#settings-btn');
  await page.waitForTimeout(500);
  for (const pane of ['models', 'appearance']) {
    await page.evaluate((name) => {
      document.querySelector(`#settings-modal [data-section="${name}"]`)?.click();
    }, pane);
    await page.waitForTimeout(400);
    await page.click('#settings-guide-btn');
    await page.waitForTimeout(350);
    panes.push(await page.evaluate((name) => ({
      pane: name,
      visibleSection: document.querySelector('.settings-section:not(.hidden)')?.id || '',
      sheet: !!document.querySelector('[data-sheet="guide"]'),
      holdsChat: !!document.querySelector('[data-sheet="guide"] #help-chat-input'),
      focus: document.activeElement?.id || '',
    }), pane));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  console.log(`  guide from settings: ${JSON.stringify(panes)}`);
  check('the Guide opens from two Settings panes',
    panes.every((r) => r.sheet && r.holdsChat && r.focus === 'help-chat-input'), JSON.stringify(panes));

  // Settings closes behind itself, or its overlay takes every click below.
  await page.evaluate(() => document.getElementById('settings-modal')?.classList.add('hidden'));
  await page.waitForTimeout(300);

  // --- the Guide's knowledge: what the client actually sends ----------------
  // The reply needs a model this sandbox has not got, so `/help/ask` is
  // answered with a fixed body and the REQUEST is what gets measured: whether
  // the tab and the surface's own help copy reach the server at all is the
  // half of "give it more knowledge" that lives in the browser.
  const asked = [];
  await page.route('**/help/ask', async (route) => {
    try {
      asked.push(JSON.parse(route.request().postData() || '{}'));
    } catch (e) {
      asked.push({});
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: 'The graph draws a dot per note.', badges: [] }),
    });
  });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(400);
  await page.click('#guide-btn');
  await page.waitForTimeout(350);
  await page.fill('#help-chat-input', 'how does this work?');
  await page.click('#help-chat-send');
  await page.waitForTimeout(600);
  const sent = asked[asked.length - 1] || {};
  console.log(`  guide request from graph: tab ${JSON.stringify(sent.tab)}, ${String(sent.context || '').length} chars of on-screen help, "${String(sent.context || '').slice(0, 70)}"`);
  check('the Guide sends the tab it was opened over', sent.tab === 'graph', JSON.stringify(sent.tab));
  const answered = await page.evaluate(() =>
    (document.querySelector('#help-chat-messages .help-chat-msg.is-assistant')?.textContent || '').trim());
  check('and renders the reply in the sheet', /dot per note/.test(answered), `"${answered.slice(0, 50)}"`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // The same request from a surface that actually carries `data-help-for`
  // popovers. Counted rather than assumed: only the Library's surfaces and the
  // Settings modal have them today, which is why this is measured on Library
  // and recorded as a finding for the tabs that have none.
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(500);
  const bodies = await page.evaluate(() =>
    Object.fromEntries(
      ['dashboard', 'notes', 'chat', 'graph', 'timeline', 'reminders', 'library'].map((t) => [
        t,
        document.getElementById(`tab-${t}`)?.querySelectorAll('.help-body').length || 0,
      ])
    )
  );
  console.log(`  help-body popovers per tab: ${JSON.stringify(bodies)}`);
  await page.click('#guide-btn');
  await page.waitForTimeout(350);
  await page.fill('#help-chat-input', 'what is this panel for?');
  await page.click('#help-chat-send');
  await page.waitForTimeout(600);
  const fromLibrary = asked[asked.length - 1] || {};
  console.log(`  guide request from library: tab ${JSON.stringify(fromLibrary.tab)}, ${String(fromLibrary.context || '').length} chars, "${String(fromLibrary.context || '').slice(0, 70)}"`);
  check('the tab sends its own controls as the app labels them, capped',
    typeof fromLibrary.context === 'string' && fromLibrary.context.length > 0 && fromLibrary.context.length <= 1200,
    `${String(fromLibrary.context || '').length} chars, ${bodies.library} help popovers on this tab`);
  // The promise this chat makes is that it cannot read the notebook, so what
  // it sends has to be chrome and only chrome: asserted against the note this
  // sweep put in the notebook earlier rather than by reading the code.
  check('and nothing a person wrote',
    !/Netting the beans|Bean netting|Pigeons/.test(String(fromLibrary.context || '')),
    `${String(fromLibrary.context || '').slice(0, 80)}…`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  // --- touch targets at 390 --------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const sizes = await page.evaluate(() =>
    ['agent-btn', 'guide-btn'].map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { id, w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    })
  );
  console.log(`  at 390: ${JSON.stringify(sizes)}`);
  check('both header controls are real targets at 390',
    sizes.every((s) => s.w >= 32 && s.h >= 32), JSON.stringify(sizes));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | ') || 'none');
  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
