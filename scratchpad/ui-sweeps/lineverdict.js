// Wrong fact and Pin as true on a cited line (CHAT_PLAN B31, B32): asks the
// owner's question, opens the peek of the line about big O, measures the
// verdict row (inside the peek, one row), presses Not right, asks again and
// reads whether big O is gone; then undoes it through the toast's Undo and
// checks it is back. Then the same with Confirm on the study plan line, and
// reads the pinned wording. Leaves the notebook as it found it. Needs the
// gold notebook (gold.js on the same data dir).
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/lineverdict.js
const { boot } = require('./lib.js');
const Q = 'What have I saved about courses & study?';

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(500);
  const ask = async () => {
    await page.evaluate(() => document.querySelector('#ask-why')?.replaceChildren());
    await page.fill('#question', Q);
    await page.evaluate(() => askQuestion());
    await page.waitForFunction(() => document.querySelector('#ask-why .why-fold'), null, { timeout: 15000 });
    await page.waitForTimeout(400);
    return page.evaluate(() => document.querySelector('#ai-answer').innerText);
  };
  const peekOn = async (words) => {
    await page.evaluate((w) => {
      const p = [...document.querySelectorAll('#ai-answer p')].find((x) => x.innerText.includes(w));
      p.querySelector('.answer-citation-link').click();
    }, words);
    await page.waitForSelector('#citation-peek .citation-peek-verdicts');
    return page.evaluate(() => {
      const peek = document.querySelector('#citation-peek').getBoundingClientRect();
      const row = document.querySelector('#citation-peek .citation-peek-verdicts');
      const r = row.getBoundingClientRect();
      const tops = [...row.children].map((c) => Math.round(c.getBoundingClientRect().top));
      return { text: row.innerText.replace(/\s+/g, ' ').trim(), inside: r.left >= peek.left && r.right <= peek.right + 0.5, oneRow: new Set(tops).size === 1, height: Math.round(r.height) };
    });
  };
  const out = {};
  const before = await ask();
  out.before = { bigO: before.includes('big O'), plan: before.includes('no later note picks up this plan') };
  out.peek = await peekOn('big O');
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/line-verdict-peek.png` });
  await page.click('#citation-peek .insight-verdict.is-dismiss');
  await page.waitForTimeout(600);
  out.toast = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()).pop() || '');
  out.wrongAfter = { bigO: (await ask()).includes('big O') };
  const undo = await page.$$('.toast button');
  for (const b of undo) if (/Undo/.test(await b.innerText())) { await b.click(); break; }
  await page.waitForTimeout(600);
  out.undone = { bigO: (await ask()).includes('big O') };
  await peekOn('25 minutes');
  await page.click('#citation-peek .insight-verdict.is-confirm');
  await page.waitForTimeout(600);
  const pinned = await ask();
  out.pinned = { said: (pinned.match(/[^\n]*pinned this as true[^\n]*/) || [''])[0], plan: pinned.includes('no later note picks up this plan') };
  await page.locator('#ai-answer').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/line-pinned.png` });
  // Leave the notebook as found.
  const left = await page.evaluate(async () => {
    const rows = await apiJson('/learned?kind=pinned');
    for (const row of rows.items || []) await api(`/learned/${row.id}`, { method: 'DELETE' });
    const wrong = await apiJson('/learned?kind=wrong');
    for (const row of wrong.items || []) await api(`/learned/${row.id}`, { method: 'DELETE' });
    return (rows.items || []).length;
  });
  out.cleaned = left;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
