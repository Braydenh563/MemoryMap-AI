// INBOX 182: "I want to be able to right click or hold with a touch on a link
// and have a popup show to let me copy the link address". App-wide, one
// delegated listener, one menu shape.
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/linkmenu.js
//
// `navigator.clipboard.writeText` is stubbed in the page so what the menu
// actually copies can be read back: the app's own `copyToClipboard` falls back
// to a `execCommand` path when the clipboard API is missing, and a sweep that
// only asserted "a menu opened" would not have caught an item copying the
// wrong string.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.evaluate(() => {
    window.__copied = [];
    window.__opened = [];
    navigator.clipboard.writeText = (text) => {
      window.__copied.push(text);
      return Promise.resolve();
    };
    const realOpen = window.open;
    window.open = (url, target, features) => {
      window.__opened.push({ url, target, features });
      return null;
    };
    window.__realOpen = realOpen;
  });

  // A note to give the [[link]] something real to point at, then an answer
  // bubble rendered by the app's own markdown renderer, which is where these
  // links come from in the chat and in the popup agent.
  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    await fetch('/entries', { method: 'POST', headers: h, body: JSON.stringify({ content: 'Netting the beans' }) });
    await loadEntries();
    switchTab('chat');
  });
  await page.waitForTimeout(500);
  // Re-seeded before every interaction: the chat transcript re-renders itself
  // on its own poll, which takes an injected bubble with it. The first run of
  // this sweep read that as "the menu does not reopen".
  const seed = async () => {
    await page.evaluate(() => {
      document.getElementById('sweep-answer')?.closest('.msg')?.remove();
      const bubble = document.createElement('div');
      bubble.className = 'msg assistant';
      const host = document.createElement('div');
      host.className = 'bubble-answer';
      host.id = 'sweep-answer';
      bubble.appendChild(host);
      document.getElementById('chat-messages').appendChild(bubble);
      renderMarkdown(host, 'See [the guide](https://example.org/guide/netting) and [[Netting the beans]].');
    });
    await page.waitForTimeout(200);
  };
  await seed();

  const at = async (selector) => {
    const box = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, selector);
    return box;
  };

  // --- the external link ----------------------------------------------------
  const linkPoint = await at('#sweep-answer a[href^="https"]');
  await page.mouse.click(linkPoint.x, linkPoint.y, { button: 'right' });
  await page.waitForTimeout(250);
  const external = await page.evaluate((point) => {
    const menu = document.querySelector('.action-menu:not(.hidden)');
    if (!menu) return { open: false };
    const r = menu.getBoundingClientRect();
    return {
      open: true,
      items: [...menu.querySelectorAll('.menu-item')].map((b) => b.textContent.trim()),
      // Where the menu sits against where the pointer was.
      dx: Math.round(Math.min(Math.abs(r.left - point.x), Math.abs(r.right - point.x))),
      dy: Math.round(r.top - point.y),
      role: menu.getAttribute('role'),
      onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    };
  }, linkPoint);
  console.log(`  external: ${JSON.stringify(external)}`);
  check('right-click on a rendered link opens one menu', external.open && external.role === 'menu',
    `items ${JSON.stringify(external.items)}`);
  check('the menu opens at the pointer', external.open && external.dx <= 24 && external.dy >= 0 && external.dy <= 40,
    `nearest edge ${external.dx}px across, ${external.dy}px below the pointer, on screen ${external.onScreen}`);

  await page.evaluate(() =>
    [...document.querySelectorAll('.action-menu:not(.hidden) .menu-item')]
      .find((b) => /Copy link address/.test(b.textContent)).click()
  );
  await page.waitForTimeout(200);
  let copied = await page.evaluate(() => window.__copied);
  check('Copy link address copies the href', copied[0] === 'https://example.org/guide/netting',
    `clipboard got ${JSON.stringify(copied)}`);

  await seed();
  const linkPoint2 = await at('#sweep-answer a[href^="https"]');
  await page.mouse.click(linkPoint2.x, linkPoint2.y, { button: 'right' });
  await page.waitForTimeout(300);
  const reopened = await page.evaluate(() => ({
    open: document.querySelectorAll('.action-menu:not(.hidden)').length,
    all: document.querySelectorAll('.action-menu').length,
  }));
  check('the menu reopens on a second right-click', reopened.open === 1, JSON.stringify(reopened));
  await page.evaluate(() =>
    [...document.querySelectorAll('.action-menu:not(.hidden) .menu-item')]
      .find((b) => /Open in new tab/.test(b.textContent))?.click()
  );
  await page.waitForTimeout(200);
  const opened = await page.evaluate(() => window.__opened);
  check('Open in new tab opens the href', opened.length === 1 && opened[0].url === 'https://example.org/guide/netting' && /noopener/.test(opened[0].features || ''),
    JSON.stringify(opened));

  // --- the internal [[link]] ------------------------------------------------
  // `[[links]]` are rendered by `renderNoteInline`, which is the note preview
  // rather than the chat's markdown, so this half is measured where they
  // actually appear: a note card in the Notes list.
  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    await fetch('/entries', { method: 'POST', headers: h, body: JSON.stringify({ content: 'See [[Netting the beans]] for the pigeons' }) });
    await loadEntries();
    switchTab('notes');
  });
  await page.waitForSelector('.wiki-link', { timeout: 10000 });
  await page.waitForTimeout(400);
  const wikiPoint = await at('.wiki-link');
  await page.mouse.click(wikiPoint.x, wikiPoint.y, { button: 'right' });
  await page.waitForTimeout(250);
  const internal = await page.evaluate(() => {
    const menu = document.querySelector('.action-menu:not(.hidden)');
    return menu ? [...menu.querySelectorAll('.menu-item')].map((b) => b.textContent.trim()) : [];
  });
  console.log(`  internal: ${JSON.stringify(internal)}`);
  check('an internal link offers title and open', internal.join('|') === 'Copy title|Open', internal.join(' | '));
  await page.evaluate(() =>
    [...document.querySelectorAll('.action-menu:not(.hidden) .menu-item')]
      .find((b) => /Copy title/.test(b.textContent)).click()
  );
  await page.waitForTimeout(200);
  copied = await page.evaluate(() => window.__copied);
  check('Copy title copies the link text', copied[1] && copied[1].startsWith('Netting the beans'),
    `clipboard got ${JSON.stringify(copied.slice(1))}`);

  // --- one listener, not one per surface ------------------------------------
  // The same gesture on the same markup rendered in the popup agent, which has
  // never had a listener of its own.
  await page.evaluate(() => {
    toggleAgentPalette();
    const host = document.createElement('div');
    host.className = 'bubble-answer';
    host.id = 'sweep-palette-answer';
    document.getElementById('command-palette-results').appendChild(host);
    renderMarkdown(host, 'See [the guide](https://example.org/guide/netting).');
  });
  await page.waitForTimeout(300);
  const palettePoint = await at('#sweep-palette-answer a[href^="https"]');
  await page.mouse.click(palettePoint.x, palettePoint.y, { button: 'right' });
  await page.waitForTimeout(250);
  const inPalette = await page.evaluate(() => {
    const menu = document.querySelector('.action-menu:not(.hidden)');
    return menu ? [...menu.querySelectorAll('.menu-item')].map((b) => b.textContent.trim()) : [];
  });
  check('the popup agent gets the same menu with no listener of its own',
    inPalette.join('|') === 'Copy link address|Open in new tab', inPalette.join(' | '));

  // --- a long press stands in for a right-click on touch --------------------
  await page.evaluate(() => {
    const el = document.querySelector('#sweep-palette-answer a[href^="https"]');
    const r = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch',
      pointerId: 7,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
    };
    document.querySelectorAll('.action-menu').forEach((m) => m.classList.add('hidden'));
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
  });
  await page.waitForTimeout(700);
  const held = await page.evaluate(() =>
    !!document.querySelector('.action-menu:not(.hidden)')
  );
  check('a 500ms touch hold opens it too', held, `menu open after 700ms: ${held}`);

  check('no page errors', errors.length === 0, errors.join(' | ') || 'none');
  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
