// Coordinator report: an Ask answer reopened from history was missing
// in-text markers for two bullets under a "## Schedule and Frequency"
// heading, though the Sources panel listed the note and earlier sections
// kept their own markers.
//
// Drives a real Ask against `scratchpad/fake_heading_list_server.py`
// (always answers with the exact heading-then-list shape the report
// describes), reads the live markers, then opens the same turn from the
// Ask history panel and reads the reopened markers, and diffs the two.
//
//   .venv/bin/python scratchpad/fake_heading_list_server.py 8810 &
//   BASE=http://127.0.0.1:8785 FAKE=http://127.0.0.1:8810/v1 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node citationheading.js
const { boot } = require('./lib.js');

const FAKE = process.env.FAKE || 'http://127.0.0.1:8810/v1';

// Chosen to ground both bullets: note 1 shares "university"/"tuesday"/
// "thursday" with the first, note 2 shares "cloud computing"/"lectures"/
// "last week" with the second, the same pair `tests/test_citation_after_`
// `heading.py` verified server-side.
const NOTES = [
  'my uni days this week are tuesday and thursday',
  'I attended three cloud computing lectures last week, all recorded',
  'gym schedule: monday wednesday friday mornings',
];

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

  const wired = await page.evaluate(async ({ base, notes }) => {
    for (const content of notes) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, category: 'General' }) });
    }
    const provider = await api('/models/provider', {
      method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: base }),
    }).then((r) => r.json());
    await api('/models/chat-model', {
      method: 'POST', body: JSON.stringify({ name: 'fake-heading-list' }),
    }).catch(() => null);
    return { provider: provider.provider, reachable: provider.reachable };
  }, { base: FAKE, notes: NOTES });
  console.log('provider:', JSON.stringify(wired));

  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(800);
  await page.evaluate(() => { if (typeof showChatSection === 'function') showChatSection('ask'); });
  await page.waitForTimeout(1200);

  const asked = await page.evaluate(() => {
    const box = document.getElementById('question');
    const btn = document.getElementById('ask-btn');
    if (!box || !btn) return false;
    box.value = 'What are my uni days and how many cloud computing lectures have I been to?';
    btn.click();
    return true;
  });
  if (!asked) { console.log('ERR: no #question/#ask-btn on the page'); await browser.close(); process.exit(1); }

  await page.waitForFunction(() => {
    const a = document.getElementById('ai-answer');
    return a && a.textContent.includes('cloud computing') && !a.classList.contains('is-generating');
  }, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const readMarkers = () => page.evaluate(() => {
    const box = document.getElementById('ai-answer');
    const marks = [...(box?.querySelectorAll('.answer-citation') || [])].map((m) => ({
      noteId: m.dataset.noteId,
      inLi: !!m.closest('li'),
      text: (m.previousSibling?.textContent || '').slice(-30),
    }));
    return { html: box?.innerHTML || '', count: marks.length, marks };
  });

  const live = await readMarkers();
  console.log('LIVE:', JSON.stringify(live, null, 2));

  // Reopen the same turn from history.
  await page.evaluate(() => toggleAskHistoryPanel());
  await page.waitForTimeout(800);
  const opened = await page.evaluate(() => {
    const row = document.querySelector('#ask-history-list li');
    if (!row) return false;
    row.click();
    return true;
  });
  if (!opened) { console.log('ERR: no history row to reopen'); await browser.close(); process.exit(1); }
  await page.waitForTimeout(1200);

  const reopened = await readMarkers();
  console.log('REOPENED:', JSON.stringify(reopened, null, 2));

  console.log('LIVE_MARKER_COUNT', live.count, 'REOPENED_MARKER_COUNT', reopened.count, 'EXPECTED 2 (one per bullet)');
  console.log('LIVE_AND_REOPENED_MATCH', JSON.stringify(live.marks) === JSON.stringify(reopened.marks));
  console.log('CONSOLE_ERRORS', JSON.stringify(errors));

  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message, e.stack); process.exit(1); });
