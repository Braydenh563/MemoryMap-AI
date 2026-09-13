// Six chat-surface reports (INBOX 151 to 155 and 161), each as a number.
//
//   151 the dashboard Continue pill "doesnt cut off with an ellipse"
//   152 the user bubble's text "ugly ... for some reason I cant place"
//   153 "excessive shadow around the ai message bubbles and popup buttons"
//   154 "better render the links that the ai writes"
//   155 the Jump to latest hover "opaque or pearly instead of clear"
//   161 the popup agent: caret while streaming, tool calls shown, badges cut
//
//   BASE=http://127.0.0.1:8931 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node chatsurface.js
const { boot } = require('./lib.js');

const alphaOf = (colour) => {
  const m = /\/\s*([\d.]+)\)$|rgba\([^)]*,\s*([\d.]+)\)$/.exec(colour || '');
  if (!m) return colour === 'rgba(0, 0, 0, 0)' ? 0 : 1;
  return Number(m[1] ?? m[2]);
};
const blurOf = (shadow) => {
  // "rgba(..) 0px 2px 8px 0px" -> 8
  const m = /\)\s+-?[\d.]+px\s+-?[\d.]+px\s+([\d.]+)px/.exec(shadow || '');
  return m ? Number(m[1]) : 0;
};

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  const bad = [];

  // 152, 153: two bubbles built from the same markup the renderer uses.
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(600);
  const bubbles = await page.evaluate(() => {
    const host = document.getElementById('chat-messages');
    host.replaceChildren();
    const mk = (cls) => {
      const m = document.createElement('div'); m.className = 'msg ' + cls;
      const r = document.createElement('div'); r.className = 'msg-role'; r.textContent = cls === 'user' ? 'You' : 'Librarian';
      const b = document.createElement('div'); b.className = cls === 'user' ? 'msg-body' : 'bubble-answer'; b.textContent = 'what are the commonalities in my notes??';
      const a = document.createElement('div'); a.className = 'msg-actions'; a.append(document.createElement('button'));
      m.append(r, b, a); host.appendChild(m); return m;
    };
    const u = mk('user'), s = mk('assistant');
    const cs = (el) => getComputedStyle(el);
    return {
      userBody: cs(u.querySelector('.msg-body')).fontSize,
      assistantBody: cs(s.querySelector('.bubble-answer')).fontSize,
      userShadow: cs(u).boxShadow, assistantShadow: cs(s).boxShadow, actionsShadow: cs(s.querySelector('.msg-actions')).boxShadow,
      userBg: cs(u).backgroundImage, userRole: cs(u.querySelector('.msg-role')).color,
    };
  });
  console.log(`152 body size   user ${bubbles.userBody} vs answer ${bubbles.assistantBody}; user bg-image ${bubbles.userBg === 'none' ? 'flat' : 'GRADIENT'}; role ink ${bubbles.userRole}`);
  console.log(`153 shadow blur user ${blurOf(bubbles.userShadow)}px, answer ${blurOf(bubbles.assistantShadow)}px, actions ${blurOf(bubbles.actionsShadow)}px`);
  if (bubbles.userBody !== bubbles.assistantBody) bad.push('user and answer bodies differ in size');
  if (bubbles.userBg !== 'none') bad.push('user bubble still a gradient');
  for (const [k, v] of Object.entries({ user: bubbles.userShadow, answer: bubbles.assistantShadow, actions: bubbles.actionsShadow })) {
    if (blurOf(v) > 3) bad.push(`${k} shadow blur ${blurOf(v)}px`);
  }

  // 155: the pill's hover ground must be opaque.
  const pill = await page.evaluate(async () => {
    const el = document.getElementById('chat-jump-latest');
    if (!el) return null;
    el.classList.remove('hidden');
    return { rest: getComputedStyle(el).backgroundColor };
  });
  if (pill) {
    await page.hover('#chat-jump-latest');
    await page.waitForTimeout(200);
    const hover = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('chat-jump-latest')); return { bg: c.backgroundColor, img: c.backgroundImage }; });
    console.log(`155 jump pill   rest ${pill.rest}; hover ${hover.bg} with ${hover.img === 'none' ? 'no tint' : 'a tint layer'}`);
    if (alphaOf(hover.bg) < 1) bad.push(`jump pill hover ground alpha ${alphaOf(hover.bg)}`);
  } else console.log('155 jump pill   not on this page');

  // 154: a bare URL and a self-labelled markdown link, rendered.
  const links = await page.evaluate(() => {
    const el = document.createElement('div');
    // `renderMarkdown`, the path an answer bubble takes: it is the one that
    // autolinks a bare address (`renderInlineMarkdown` alone leaves it as
    // text unless a caller asks, and a chip caller does not).
    renderMarkdown(el, 'see https://www.goodreads.com/series/319859-he-who-fights-with-monsters?ref=x and [https://hewhofightswithmonsters.com/](https://hewhofightswithmonsters.com/) and [the site](https://example.com/a/b)');
    return [...el.querySelectorAll('a')].map((a) => ({ text: a.textContent, title: a.title, href: a.href }));
  });
  for (const l of links) console.log(`154 link        "${l.text}"  -> ${l.href}${l.title ? '  (title: ' + l.title.slice(0, 40) + ')' : ''}`);
  const byHost = (h) => links.find((l) => l.href.includes(h));
  const bare = byHost('goodreads'), self = byHost('hewhofights'), real = byHost('example.com');
  if (!bare || bare.text.startsWith('http')) bad.push('bare URL still shown raw');
  if (bare && !/goodreads\.com \/ /.test(bare.text)) bad.push(`bare URL label "${bare.text}" is not host / page`);
  if (!self || self.text.startsWith('http')) bad.push('self-labelled link still shown raw');
  if (!real || real.text !== 'the site') bad.push('a real label was rewritten');

  // 161: the popup agent's answer box, caret hook and badge overflow.
  const palette = await page.evaluate(async () => {
    const out = {};
    // The badge: a long label in the same row the palette builds.
    const grid = document.createElement('div'); grid.className = 'cmd-source-grid';
    grid.style.width = '300px'; document.body.appendChild(grid);
    const chip = document.createElement('button'); chip.className = 'cmd-source-row';
    setNoteLabel(chip, 'ph:note', 'Act I, Scene I Two noble knights of wit, let us partake in a dialogue of rhyme', 44);
    grid.appendChild(chip);
    const span = chip.querySelector('span');
    const cs = getComputedStyle(chip);
    out.badge = { justify: cs.justifyContent, spanOverflow: span ? getComputedStyle(span).textOverflow : null, clipped: chip.scrollWidth > chip.clientWidth + 1 };
    grid.remove();
    // The bubble: ask with no model behind it; the error path still builds the box.
    runShortcut && runShortcut('askAgent');
    await new Promise((r) => setTimeout(r, 300));
    // Read synchronously: with no model behind the sandbox the request fails
    // within a frame, and the live state only exists between the call and
    // its first await, which is after the bubble has been built.
    const p = cmdPaletteAsk('probe');
    const box = document.querySelector('#command-palette-results .msg.assistant .bubble-answer');
    out.answerBox = !!box;
    out.streamingWhileLive = !!box && box.classList.contains('is-streaming');
    await p.catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    out.streamingAfter = !!box && box.classList.contains('is-streaming');
    return out;
  });
  console.log(`161 badge       justify ${palette.badge.justify}, span text-overflow ${palette.badge.spanOverflow}, clipped-without-ellipsis ${palette.badge.clipped && palette.badge.spanOverflow !== 'ellipsis'}`);
  console.log(`161 palette     answer box ${palette.answerBox}, is-streaming while live ${palette.streamingWhileLive}, after ${palette.streamingAfter}`);
  if (palette.badge.justify !== 'flex-start') bad.push('badge text not left-aligned');
  if (palette.badge.spanOverflow !== 'ellipsis') bad.push('badge label has no ellipsis');
  if (!palette.answerBox || !palette.streamingWhileLive || palette.streamingAfter) bad.push('palette answer box or caret class wrong');

  // 151: the Continue pill on the dashboard.
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(1200);
  const pillText = await page.evaluate(() => {
    const b = document.querySelector('.quick-link-continue');
    if (!b) return null;
    const label = b.querySelector('.quick-link-label');
    label.textContent = 'Why did the student eat his homework? Because the teacher said it was a piece of cake and he believed her';
    const c = getComputedStyle(label);
    return { overflow: c.textOverflow, nowrap: c.whiteSpace, clipped: label.scrollWidth > label.clientWidth, w: Math.round(b.getBoundingClientRect().width), rowW: Math.round(b.parentElement.getBoundingClientRect().width) };
  });
  if (pillText) {
    console.log(`151 continue    label text-overflow ${pillText.overflow}, ${pillText.nowrap}, clipped ${pillText.clipped}, pill ${pillText.w}px in a ${pillText.rowW}px row`);
    if (pillText.overflow !== 'ellipsis') bad.push('continue pill has no ellipsis');
    if (pillText.w > pillText.rowW) bad.push('continue pill wider than its row');
  } else console.log('151 continue    no Continue pill (no notes in this data dir)');

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
