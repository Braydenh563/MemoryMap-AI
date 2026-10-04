// H1 (AGENT_SKILLS_REFORM): a multi-step agent turn draws its own plan card.
//
//   python3 scratchpad/fake_openai_server.py --port 8826 --tool-rounds 2 --round-delay 1200 &
//   scratchpad/ui-sweeps/serve.sh 8825 /tmp/mm-h25
//   BASE=http://127.0.0.1:8825 FAKE=http://127.0.0.1:8826/v1 node scratchpad/ui-sweeps/turncard.js
//
// Two tool rounds then an answer is a three-round turn: done when the card has
// three ticked rows, live (sampled while the turn runs, so the running row is
// seen) and again after a reload and reopening the conversation.
const { boot } = require('./lib.js');

const FAKE = process.env.FAKE || 'http://127.0.0.1:8826/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const card = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#chat-messages .step-plan')].map((p) => ({
      title: p.querySelector('summary')?.textContent.trim(),
      rows: [...p.querySelectorAll('.plan-steps li')].map((li) => `[${li.dataset.state || '-'}] ${li.textContent.trim()}`),
    }))
  );

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.evaluate(async (base) => {
    await api('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: base }) });
    await api('/models/chat-model', { method: 'POST', body: JSON.stringify({ name: 'fake-local-tools' }) });
    await api('/entries', { method: 'POST', body: JSON.stringify({ content: 'The plumber comes on Tuesday at nine.' }) });
  }, FAKE);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(800);
  await page.evaluate(() => newChat && newChat());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-chat-mode="agent"]')?.click());
  await page.waitForTimeout(300);
  await page.fill('#chat-input', 'When is the plumber coming?');
  await page.click('#chat-send');
  const live = [];
  const until = Date.now() + 60000;
  await sleep(800);
  while (Date.now() < until) {
    const now = await card(page);
    const key = JSON.stringify(now);
    if (!live.length || live.at(-1) !== key) live.push(key);
    const busy = await page.evaluate(() => !document.getElementById('chat-stop')?.classList.contains('hidden'));
    if (!busy) break;
    await sleep(200);
  }
  await page.waitForTimeout(1500);
  const finished = await card(page);
  const panelRows = await page.evaluate(() => document.querySelectorAll('#agent-monitor .agent-run-step').length);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.fill('#lock-password', 'testpassword123').catch(() => {});
  await page.click('#lock-submit').catch(() => {});
  await page.waitForTimeout(2000);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(800);
  const reopened = await page.evaluate(async () => {
    const list = await apiJson('/conversations');
    const items = list.items || list.conversations || list;
    await openConversation(items[0].id);
    return items[0].id;
  });
  await page.waitForTimeout(1500);
  const after = await card(page);
  console.log(JSON.stringify({ live: live.map((k) => JSON.parse(k)), finished, panelRows, reopened, after, errors }, null, 1));
  await browser.close();
})();
