// The main flows, driven through the UI end to end (INBOX 446, the owner:
// "make sure all the main features actually work"). Run at every merge.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/smoke.js
//
// One line per flow, PASS or FAIL with the reason, then every page error,
// console error and 5xx seen along the way. Exit code is the failure count.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
  const stamp = `smoke${Date.now() % 100000}`;
  const results = [];
  const step = async (name, fn) => {
    try {
      const note = await fn();
      results.push(`PASS ${name}${note ? `  (${note})` : ''}`);
    } catch (e) {
      results.push(`FAIL ${name}: ${String(e.message || e).split('\n')[0].slice(0, 200)}`);
    }
  };
  const wait = (ms) => page.waitForTimeout(ms);
  const js = (fn, arg) => page.evaluate(fn, arg);

  await step('capture: type and save a note', async () => {
    await js(() => startNewNote());
    await wait(900);
    const box = (await page.$('#capture .cm-content')) || (await page.$('#entry-content'));
    if (!box) throw new Error('no capture box');
    await box.click();
    await page.keyboard.type(`Grocery list ${stamp}: milk, eggs and bread for Friday`);
    await page.click('#save-btn');
    // Polled, not a fixed 2.5 s: ten solo runs all passed, and the one
    // recorded timeout came while errors.js was loading the same server, so
    // the save simply had not landed yet. Up to 20 s for the note to appear.
    let found = null;
    for (let tries = 0; tries < 40 && !found; tries++) {
      await wait(500);
      found = await js(async (s) => {
        const body = await apiJson(`/entries?limit=5`);
        const list = Array.isArray(body) ? body : body.entries || [];
        return list.find((e) => e.content.includes(s)) || null;
      }, stamp);
    }
    if (!found) throw new Error('note not in /entries');
    return `id ${found.id}, category ${found.category || found.category_name || '?'}`;
  });

  await step('capture: box is empty and ready again', async () => {
    const text = await js(() => (document.querySelector('#capture .cm-content') || document.querySelector('#entry-content'))?.textContent || document.querySelector('#entry-content')?.value || '');
    if (text.includes(stamp)) throw new Error('capture box still holds the saved note');
  });

  await step('notes: the new note is in the list', async () => {
    await js(() => switchTab('notes'));
    await wait(600);
    await js(() => document.querySelector('[data-section="browse"]')?.click());
    await wait(1500);
    const hit = await js((s) => [...document.querySelectorAll('#entry-list > li')].some((li) => li.textContent.includes(s)), stamp);
    if (!hit) throw new Error('not in #entry-list');
  });

  await step('search: finds the note by a word in it', async () => {
    const res = await js(async (s) => apiJson(`/search?q=${encodeURIComponent(s)}`).catch((e) => ({ error: e.message })), stamp);
    const list = Array.isArray(res) ? res : res.hits || res.results || res.entries || [];
    if (!list.some((e) => `${e.title || ''} ${e.content || ''} ${e.snippet || ''}`.includes(stamp))) throw new Error(`search returned ${JSON.stringify(res).slice(0, 120)}`);
  });

  await step('ask: a recency question answers without an error', async () => {
    await js(() => switchTab('notes'));
    await wait(600);
    await js(() => document.querySelector('[data-section="ask"]')?.click());
    await wait(800);
    await page.fill('#question', 'What have I saved recently?');
    await page.press('#question', 'Enter');
    await wait(6000);
    const text = await js(() => document.querySelector('#ai-answer')?.innerText.slice(-400) || '');
    if (!text.trim()) throw new Error('no answer rendered');
    if (/error|couldn.t|failed/i.test(text) && !/no model|isn.t running|not running/i.test(text)) throw new Error(`answer: ${text.slice(-160)}`);
    return text.replace(/\s+/g, ' ').slice(-90);
  });

  await step('reminders: add one in plain words', async () => {
    await js(() => switchTab('reminders'));
    await wait(800);
    await page.fill('#reminder-text', `Call the dentist ${stamp}`);
    await page.click('#reminder-add');
    await wait(1500);
    const all = await js(() => apiJson('/reminders'));
    const list = Array.isArray(all) ? all : all.reminders || [];
    if (!list.some((r) => (r.text || r.title || '').includes(stamp))) throw new Error('not in /reminders');
  });

  await step('documents: a new document opens an editor', async () => {
    await js(() => switchTab('documents'));
    await wait(1200);
    await page.click('#doc-new');
    await wait(2000);
    const ok = await js(() => !!document.querySelector('#tab-documents .cm-editor, #tab-documents [contenteditable="true"]'));
    if (!ok) throw new Error('no editor after New');
  });

  await step('graph: draws nodes', async () => {
    await js(() => switchTab('graph'));
    await wait(3000);
    const ok = await js(() => {
      const c = document.querySelector('#tab-graph canvas');
      return !!c && c.width > 0 && c.height > 0;
    });
    if (!ok) throw new Error('no graph canvas');
  });

  await step('library: boards and maps lists', async () => {
    await js(() => switchTab('library'));
    await wait(900);
    await js(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
    await wait(2000);
    const busy = await js(() => document.querySelectorAll('#library-view-whiteboard .skeleton').length);
    if (busy) throw new Error(`${busy} skeletons still showing after 2s`);
  });

  await step('settings: opens and closes', async () => {
    await js(() => openSettingsModal('models'));
    await wait(1200);
    const open = await js(() => !document.getElementById('settings-modal')?.classList.contains('hidden'));
    if (!open) throw new Error('did not open');
    await page.keyboard.press('Escape');
    await wait(500);
    const closed = await js(() => document.getElementById('settings-modal')?.classList.contains('hidden'));
    if (!closed) throw new Error('Escape did not close it');
  });

  console.log(results.join('\n'));
  const unique = [...new Set(errors)];
  if (unique.length) console.log(`\n${unique.length} errors seen:\n  ${unique.slice(0, 30).join('\n  ')}`);
  await browser.close();
  process.exit(results.filter((r) => r.startsWith('FAIL')).length);
})();
