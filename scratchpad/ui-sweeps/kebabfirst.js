// INBOX 75, the last unmeasured part of HANDOVER done-when item 5: a card's
// kebab must open on the first click, not the second.
//
// The earlier attempt looked for `[aria-haspopup]` and found nothing. The
// recipe is `kebabMenu()` in app.js: a `.menu-wrap` holding a `.action-menu`
// and a `smallButton` opener, so the wrap is what to look for.
const { boot } = require('./lib.js');
(async () => {
  // W=390 runs it as a phone (a touch context, as the app's own phone band is).
  const W = Number(process.env.W || 0);
  const { browser, page } = await boot(W ? { viewport: { width: W, height: 844 }, hasTouch: W < 600, isMobile: W < 600 } : {});
  // A note to hang a kebab on.
  await page.evaluate(async () => {
    await api('/entries', { method: 'POST', body: JSON.stringify({ content: 'A note whose kebab is under test.' }) });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(2000);

  const found = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.menu-wrap')]
      .filter((w) => w.getBoundingClientRect().width > 0 && w.querySelector('.action-menu'));
    return { wraps: wraps.length, first: wraps[0] ? wraps[0].className : null };
  });
  if (!found.wraps) { console.log(JSON.stringify({ found })); await browser.close(); return; }

  // Click the opener once and read whether its menu is on screen.
  const after1 = await page.evaluate(() => {
    const wrap = [...document.querySelectorAll('.menu-wrap')]
      .find((w) => w.getBoundingClientRect().width > 0 && w.querySelector('.action-menu'));
    const opener = wrap.querySelector('button');
    opener.click();
    return null;
  });
  await page.waitForTimeout(400);
  const state1 = await page.evaluate(() => {
    // The menu may have been reparented to <body> while open (action-menu-escaped).
    const menus = [...document.querySelectorAll('.action-menu')]
      .filter((m) => !m.classList.contains('hidden') && m.getBoundingClientRect().height > 0);
    return { openMenus: menus.length, height: menus[0] ? Math.round(menus[0].getBoundingClientRect().height) : 0 };
  });
  // And a second click, which must close it rather than being the one that opens it.
  await page.evaluate(() => {
    const wrap = [...document.querySelectorAll('.menu-wrap')]
      .find((w) => w.getBoundingClientRect().width > 0 && w.querySelector('.action-menu'));
    wrap.querySelector('button').click();
  });
  await page.waitForTimeout(400);
  const state2 = await page.evaluate(() => ({
    openMenus: [...document.querySelectorAll('.action-menu')]
      .filter((m) => !m.classList.contains('hidden') && m.getBoundingClientRect().height > 0).length,
  }));
  // The exit (OPEN.md, perfpolish: "menus leave instantly though they enter
  // with a 160ms reveal"). Every way a menu closes (the opener again, Escape,
  // a press outside, `closeActionMenus()` itself) goes through `.hidden`, so
  // each is opened, closed that way, and sampled every frame for 400ms: the
  // menu must be seen part way faded (opacity between 0.02 and 0.98 while it
  // is still displayed), must not take a press while it fades, and must be
  // gone (display none) by the end. Reduced motion is not tested here: it
  // keeps the instant hide on purpose.
  const exits = {};
  // Two kinds of menu: a note card's kebab, and an enhanced select's list (the
  // second is wired to escape its scroller and leave through a different
  // path, `wireEscapedActionMenu`'s observer, which used to take the node
  // home before the fade could run).
  const kinds = W && W < 600 ? ['kebab'] : ['kebab', 'select'];
  // Below 600 a kebab is a phone action sheet (`openKebabSheet`, `openSheet`),
  // which has no exit of its own yet (found, not fixed: HISTORY.md, the menu
  // exit row), so only the path that hides the menu itself is asserted there.
  const hows = W && W < 600 ? ['closeActionMenus'] : ['opener', 'escape', 'outside', 'closeActionMenus'];
  for (const kind of kinds) for (const how of hows) {
    await page.evaluate(() => {
      document.querySelectorAll('.action-menu:not(.hidden)').forEach((m) => m.classList.add('hidden'));
    });
    await page.waitForTimeout(500);
    const picked = await page.evaluate((kind) => {
      let menu = null;
      let opener = null;
      if (kind === 'select') {
        const shell = [...document.querySelectorAll('.select-shell')].find((s) => s.getBoundingClientRect().width > 0 && s.querySelector('.select-opener') && s.querySelector('.select-menu'));
        if (shell) { menu = shell.querySelector('.select-menu'); opener = shell.querySelector('.select-opener'); }
      } else {
        const wrap = [...document.querySelectorAll('.menu-wrap')].find((w) => w.getBoundingClientRect().width > 0 && w.querySelector('.action-menu'));
        if (wrap) { menu = wrap.querySelector('.action-menu'); opener = wrap.querySelector('button'); }
      }
      if (!menu) return false;
      window.__exitMenu = menu;
      window.__exitOpener = opener;
      opener.click();
      return true;
    }, kind);
    if (!picked) { exits[`${kind}/${how}`] = { missing: true }; continue; }
    await page.waitForTimeout(500);
    const escaped = await page.evaluate(() => window.__exitMenu.classList.contains('action-menu-escaped'));
    await page.evaluate(() => {
      const m = window.__exitMenu;
      window.__exitSamples = [];
      const t0 = performance.now();
      const tick = () => {
        const cs = getComputedStyle(m);
        window.__exitSamples.push({ t: Math.round(performance.now() - t0), op: +parseFloat(cs.opacity).toFixed(2), d: cs.display, pe: cs.pointerEvents, hidden: m.classList.contains('hidden') });
        if (performance.now() - t0 < 450) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (how === 'opener') await page.evaluate(() => window.__exitOpener.click());
    else if (how === 'escape') await page.keyboard.press('Escape');
    else if (how === 'outside') await page.mouse.click(3, 3);
    else await page.evaluate(() => closeActionMenus());
    await page.waitForTimeout(600);
    const s = await page.evaluate(() => window.__exitSamples.filter((x) => x.hidden));
    const mid = s.filter((x) => x.d !== 'none' && x.op > 0.02 && x.op < 0.98);
    const last = s[s.length - 1];
    exits[`${kind}/${how}`] = {
      escaped,
      frames: s.length,
      fadingFrames: mid.length,
      firstOpacity: s[0] && s[0].op,
      noPressWhileFading: s.filter((x) => x.d !== 'none').every((x) => x.pe === 'none'),
      goneBy: (s.find((x) => x.d === 'none') || {}).t ?? null,
      ends: last && last.d,
    };
  }
  const exitOk = Object.values(exits).every((e) => !e.missing && e.fadingFrames >= 2 && e.noPressWhileFading && e.ends === 'none' && e.goneBy !== null && e.goneBy <= 250);
  console.log('menu exit', JSON.stringify(exits));
  console.log(exitOk ? 'PASS: every close path fades the menu out (2+ frames part way, no press taken, gone within 250ms)' : 'FAIL: a close path leaves the menu instantly, or leaves it taking presses');
  console.log(JSON.stringify({
    found,
    openedOnFirstClick: state1.openMenus > 0,
    firstClick: state1,
    closedOnSecondClick: state2.openMenus === 0,
    secondClick: state2,
  }, null, 1));
  await browser.close();
  process.exit(exitOk ? 0 : 1);
})();
