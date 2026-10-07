// INBOX 741: the composer's voice in a real browser with no model running.
//
//   bash scratchpad/ui-sweeps/serve.sh 8826 /tmp/mm-f1
//   .venv/bin/python scratchpad/ui-sweeps/seed-showcase.py 8826 /tmp/mm-f1
//   BASE=http://127.0.0.1:8826 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/voice741.js
//
// Asks a handful of casual, misspelt and plain questions in Ask, prints each
// rendered answer, and fails on "says:" introductions, a note named by its
// first words, a console error or sideways scroll. Then one Chat turn of
// small talk, which must be answered without a search.
const { boot } = require('./lib.js');

const QUESTIONS = [
  'What is the Harbor launch plan?',
  'hey can you remind me when the dentist check-up is',
  'whn is the launch',
  'hw mny beta testers r active',
  'When is the boiler service and how do I sharpen my knife?',
  'wat did i say abt lisbon',
];

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.evaluate(() => showNotesSection('ask'));
  await page.waitForTimeout(4000);
  const findings = [];
  for (const q of QUESTIONS) {
    await page.fill('#question', q);
    await page.click('#ask-btn');
    await page.waitForFunction(() => {
      const a = document.getElementById('ai-answer');
      return a && !a.classList.contains('is-generating') && a.textContent.trim().length > 0;
    }, null, { timeout: 20000 }).catch(() => findings.push(`"${q}": no answer in 20 s`));
    await page.waitForTimeout(500);
    const got = await page.evaluate(() => {
      const a = document.getElementById('ai-answer');
      const chips = [...document.querySelectorAll('#ask-followups button, .ask-followups button, .followup-chip')].map((b) => b.textContent.trim());
      return { text: a.innerText.slice(0, 900), overflow: document.scrollingElement.scrollWidth > innerWidth, chips };
    });
    console.log(`\n### ${q}\n${got.text}\n[chips] ${got.chips.join(' | ')}`);
    if (/\b(says|said): /.test(got.text)) findings.push(`"${q}": a note introduced as saying`);
    if (got.overflow) findings.push(`"${q}": the page scrolls sideways`);
  }
  // Chat: a question, then small talk, then a follow-on, as one conversation.
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  for (const turn of ['When is the dentist check-up?', 'ty', 'what about the boiler service?', 'lol ok']) {
    await page.fill('#chat-input', turn);
    await page.click('#chat-send');
    await page.waitForTimeout(4000);
    const last = await page.evaluate(() => {
      const all = [...document.querySelectorAll('#chat-messages > *')];
      return all.slice(-2).map((n) => n.innerText.slice(0, 400)).join('\n---\n');
    });
    console.log(`\n[chat] ${turn}\n${last}`);
    if (/\b(says|said): /.test(last)) findings.push(`chat "${turn}": a note introduced as saying`);
  }
  console.log(`\nerrors: ${errors.length ? errors.join(' | ') : 'none'}`);
  console.log(`findings: ${findings.length ? '\n  ' + findings.join('\n  ') : 'none'}`);
  await browser.close();
  process.exit(findings.length + errors.length ? 1 : 0);
})();
