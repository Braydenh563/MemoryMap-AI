// INBOX 526: a picture the answer places inside its bubble. Drives Chat and Ask
// against scratchpad/fake_answer_server.py with FAKE_ANSWER_FILE (re-read per
// request), so the answer is whatever $ANS says: a `[picture 1]` token, none,
// or a mix of known and unknown tokens. Measures the figure, not a screenshot.
//   BASE=http://127.0.0.1:8811 FAKE=http://127.0.0.1:8812/v1 SCRATCH=<dir> \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node figures526.js
const fs = require('fs');
const { boot } = require('./lib.js');

const FAKE = process.env.FAKE || 'http://127.0.0.1:8812/v1';
const SCRATCH = process.env.SCRATCH || '.';
const ANS = `${SCRATCH}/ans.txt`;
const W = Number(process.env.W || 1440);
const NOTE = 'The sprint board sketch shows three columns: backlog, doing and review. ' + 'We drew it on the whiteboard after planning, then copied it into the notebook so the team can see how work moves from one column to the next during the sprint. '.repeat(2);

(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  const png = fs.readFileSync(`${SCRATCH}/board.png`).toString('base64');
  const url = await page.evaluate(async ({ png, base, note }) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append('file', new File([bytes], 'board.png', { type: 'image/png' }));
    const headers = { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() };
    const up = await (await fetch('/media/upload', { method: 'POST', headers, body: form })).json();
    await api(`/media/${up.id}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A hand-drawn sprint board with three tall columns labelled backlog, doing and review, drawn in black marker on cream paper' }) });
    await api('/entries', { method: 'POST', body: JSON.stringify({ content: `${note}\n\n![](${up.url})`, category: 'General' }) });
    await api('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: base }) });
    await api('/models/chat-model', { method: 'POST', body: JSON.stringify({ name: 'fake-answerer' }) }).catch(() => null);
    return up.url;
  }, { png, base: FAKE, note: NOTE });
  console.log('uploaded', url);

  const measure = () => page.evaluate(() => {
    const out = [];
    for (const f of document.querySelectorAll('.answer-figure')) {
      const img = f.querySelector('img');
      const bubble = f.closest('.bubble, .chat-bubble, #ai-answer, .assistant, .bubble-answer') || f.parentElement;
      const r = img.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const cap = f.querySelector('.answer-figure-words');
      out.push({
        w: Math.round(r.width), h: Math.round(r.height), attrs: [img.getAttribute('width'), img.getAttribute('height')],
        natural: [img.naturalWidth, img.naturalHeight], bubbleW: Math.round(b.width),
        inside: r.right <= b.right + 1 && r.left >= b.left - 1,
        radius: getComputedStyle(f.querySelector('.answer-figure-open')).borderRadius,
        words: cap && cap.textContent, from: f.querySelector('.answer-figure-from').textContent,
        capOverflow: cap ? cap.scrollWidth > cap.clientWidth : null,
      });
    }
    const text = (document.querySelector('.bubble-answer:last-of-type, #ai-answer') || document.body).innerText;
    return { figures: out, rawToken: /\[picture/i.test(document.body.innerText),
      hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth, text: text.slice(0, 200) };
  });

  const chat = async (label, answerFile, question) => {
    fs.copyFileSync(`${SCRATCH}/${answerFile}`, ANS);
    await page.evaluate(() => switchTab('chat'));
    await page.waitForTimeout(1200);
    await page.evaluate(() => newChatConversation());
    await page.waitForTimeout(400);
    await page.click('#chat-input');
    await page.keyboard.type(question);
    await page.keyboard.press('Enter');
    // Mid-stream: no half token on the page.
    let sawRaw = false;
    for (let i = 0; i < 40; i += 1) {
      await page.waitForTimeout(120);
      if (await page.evaluate(() => /\[pic/i.test(document.querySelector('.bubble-answer')?.innerText || ''))) sawRaw = true;
      if (!(await page.evaluate(() => Boolean(chatController)))) break;
    }
    await page.waitForTimeout(800);
    const m = await measure();
    console.log(label, JSON.stringify({ ...m, sawRawWhileStreaming: sawRaw }));
    await page.screenshot({ path: `${SCRATCH}/shots/fig526-${label}-${W}-${process.env.THEME || 'light'}.png` });
    return m;
  };

  await chat('chat-token', 'with.txt', 'What does the sprint board sketch show?');
  await chat('chat-none-asked', 'without.txt', 'Show me the picture of the sprint board sketch');
  await chat('chat-none-plain', 'without.txt', 'What columns does the sprint board have?');
  await chat('chat-many', 'many.txt', 'What does the sprint board sketch show?');

  // Reopen the last conversation from history: the figures come back.
  fs.copyFileSync(`${SCRATCH}/with.txt`, ANS);
  await page.evaluate(() => newChatConversation());
  await page.click('#chat-input');
  await page.keyboard.type('What does the sprint board sketch show?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(4500);
  const id = await page.evaluate(async () => (await apiJson('/conversations'))[0]?.id ?? null);
  const saved = await page.evaluate(async (i) => (await apiJson(`/conversations/${i}`)).messages[1].picture_sizes, id);
  console.log('saved sizes', JSON.stringify(saved));
  await page.evaluate(() => newChatConversation());
  await page.waitForTimeout(500);
  await page.evaluate((i) => openConversation(i), id);
  await page.waitForTimeout(1500);
  console.log('reopened', JSON.stringify(await measure()));

  // Lightbox and note link.
  await page.click('.answer-figure-open');
  await page.waitForTimeout(500);
  console.log('lightbox', await page.evaluate(() => Boolean(document.querySelector('.lightbox img'))));
  await page.keyboard.press('Escape');

  // Ask.
  fs.copyFileSync(`${SCRATCH}/with.txt`, ANS);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  await page.evaluate(() => showNotesSection('ask'));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    document.getElementById('question').value = 'What does the sprint board sketch show?';
    document.getElementById('ask-btn').click();
  });
  await page.waitForFunction(() => !document.getElementById('ai-answer')?.classList.contains('is-generating') && document.getElementById('ai-answer')?.innerText.length > 20, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  console.log('ask', JSON.stringify(await measure()));
  await page.screenshot({ path: `${SCRATCH}/shots/fig526-ask-${W}-${process.env.THEME || 'light'}.png` });
  await browser.close();
})();
