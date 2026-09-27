// INBOX 80: "hovering or clicking a numbered reference shows a popover with
// a preview of the thing and a button to go to it; clicking the preview
// panel itself goes there". The peek is `openCitationPeek` (capture-ask.js).
//
//   BASE=http://127.0.0.1:8812 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/citepeek.js      (W=390 for a phone, on touch)
//
// Needs a saved chat whose answer carries citation marks (any chat answered
// through `scratchpad/fake_answer_server.py` does). Measured, not captured:
// where the card lands against the mark and the window, what it says, and
// what hover, leave, press, Escape, a press outside and the preview do.
const { boot } = require('./lib.js');
const SHOTS = process.env.SHOTS || '';
(async () => {
  const W = +(process.env.W || 1440);
  const touch = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: touch ? 844 : 900 }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  let failed = 0;
  const check = (ok, what, detail) => {
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
  };
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  const found = await page.evaluate(async () => {
    const list = await apiJson('/conversations?limit=50');
    for (const conv of list.items || list) {
      await openConversation(conv.id);
      await new Promise((r) => setTimeout(r, 500));
      if (document.querySelector('#chat-messages .answer-citation-link')) return conv.title;
    }
    return null;
  });
  if (!found) {
    console.log('SKIP no saved chat carries a citation mark; answer one through fake_answer_server.py first');
    await browser.close();
    return;
  }
  const state = () => page.evaluate(() => {
    const p = document.getElementById('citation-peek');
    const tabChat = !document.getElementById('tab-chat').classList.contains('hidden');
    if (!p) return { open: false, tabChat };
    const r = p.getBoundingClientRect();
    const link = document.querySelector('.answer-citation-link[aria-expanded="true"]');
    const l = link?.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const title = p.querySelector('.citation-peek-title');
    const n = p.querySelector('.citation-peek-number').getBoundingClientRect();
    return {
      open: true, tabChat, w: Math.round(r.width), h: Math.round(r.height),
      inWindow: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
      onTop: p.contains(top), gap: l ? Math.round(Math.min(Math.abs(r.top - l.bottom), Math.abs(l.top - r.bottom))) : null,
      number: p.querySelector('.citation-peek-number').textContent, markNumber: link?.textContent,
      numberInside: n.left >= r.left && n.right <= r.right,
      titleInside: title.getBoundingClientRect().right <= r.right,
      rawMarkdown: /\*\*|__|`/.test(p.textContent),
      passage: p.querySelector('.citation-peek-body mark')?.textContent || '',
      openHeight: Math.round(p.querySelector('.citation-peek-foot button').getBoundingClientRect().height),
    };
  });
  const mark = (await page.$$('#chat-messages .answer-citation-link'))[0];
  await mark.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  let shown;
  if (!touch) {
    await mark.hover();
    await page.waitForTimeout(60);
    check(!(await state()).open, 'a pointer passing over a mark does not flash a card');
    await page.waitForTimeout(300);
    shown = await state();
    check(shown.open, 'hover shows the peek', shown);
  } else {
    await mark.tap();
    await page.waitForTimeout(350);
    shown = await state();
    check(shown.open, 'a tap shows the peek', shown);
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/citepeek-${W}.png` });
  if (shown.open) {
    check(shown.inWindow && shown.onTop, 'inside the window and on top of the page', { inWindow: shown.inWindow, onTop: shown.onTop });
    check(shown.gap !== null && shown.gap <= 14, 'beside its mark', shown.gap);
    check(shown.number === shown.markNumber, 'numbered as the mark is', [shown.number, shown.markNumber]);
    check(shown.numberInside && shown.titleInside, 'its head fits the card (number and title inside)');
    check(!shown.rawMarkdown, 'characters, not Markdown');
    check(shown.passage.length > 0, 'the grounded passage is marked', shown.passage.slice(0, 60));
    check(shown.tabChat, 'the chat is still showing');
    check(!touch || shown.openHeight >= 44, 'Open meets the touch floor on a phone', shown.openHeight);
  }
  if (!touch) {
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400);
    check(!(await state()).open, 'leaving closes a hover peek');
    await mark.click();
    await page.waitForTimeout(250);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400);
    const pinned = await state();
    check(pinned.open && pinned.tabChat, 'a press keeps it open and stays in the chat', pinned.open);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const esc = await page.evaluate(() => ({ open: !!document.getElementById('citation-peek'), focus: document.activeElement?.classList.contains('answer-citation-link') }));
    check(!esc.open && esc.focus, 'Escape closes it and hands the focus back to the mark', esc);
    await page.evaluate(() => { document.activeElement?.blur(); document.querySelector('#chat-messages .answer-citation-link').focus(); });
    await page.waitForTimeout(150);
    check((await state()).open, 'keyboard focus shows it too');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  } else {
    await page.touchscreen.tap(W / 2, 60);
    await page.waitForTimeout(250);
    check(!(await state()).open, 'a tap elsewhere closes it');
  }
  await mark.click();
  await page.waitForTimeout(250);
  await page.click('#citation-peek .citation-peek-preview');
  await page.waitForTimeout(700);
  const went = await page.evaluate(() => ({ notes: !document.getElementById('tab-notes').classList.contains('hidden'), peek: !!document.getElementById('citation-peek') }));
  check(went.notes && !went.peek, 'the preview itself opens the note', went);
  check(!errors.length, 'no page errors', errors);
  console.log(failed ? `${failed} FAILED` : 'ALL OK');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
