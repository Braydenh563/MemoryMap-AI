// The whiteboard's top bar, measured: how many controls it carries, whether
// any of them runs past the bar's own content box, whether a finger can hit
// them, and whether the five menus can be worked from the keyboard.
//
// It began as a consistency probe for `#wb-topbar` and the OCR workspace head
// (consistency.md section 3: bars whose SURFACE is settled but whose controls
// are not quiet). That reading is kept below, because the surface is
// deliberately not the dock's: the bar floats over the canvas, so DESIGN.md's
// floating-surface rule makes `--modal-bg` with `--glass-border` correct
// there. What is added is the part WHITEBOARD_PLAN's open `#wb-topbar` row and
// its "Placed from INBOX" entry actually ask for, at the five widths where the
// answers differ:
//
//   * the control count (counted the way `docks.js` counts, so the numbers are
//     comparable with every other dock in the app), split into the five menu
//     toggles and the rest, because UI_MODERNISATION_PLAN Phase 8 names this
//     bar as the menu-bar exception and a menu bar's toggles are one zone
//     rather than five of the seven a dock may carry;
//   * every control's right edge against the bar's content box, and the bar's
//     own scrollWidth against its clientWidth: the 2026-09-20 measurement was
//     5px past itself at 390 and 75px at 320;
//   * every control against `--target-min` below 820, where the app's own rule
//     is that the pointer is a finger;
//   * each menu: it opens, Escape closes it and hands the focus back to its
//     toggle, an outside click closes it, its items carry `role="menuitem"`
//     inside the `role="menu"` container (a menu whose items have no role is
//     an empty menu to a screen reader) and ArrowDown moves between them.
//
//   BASE=http://127.0.0.1:8794 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node scratchpad/ui-sweeps/wbtopbar.js
const { boot } = require('./lib.js');

// 320 and 390 are the phone, 820 the iPad in portrait and the first width
// where the app's floor is 28 rather than 44, 1024 the iPad in landscape,
// 1440 the desktop the dock table was built at.
const WIDTHS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 768 },
  { w: 820, h: 1180 },
  { w: 390, h: 844 },
  { w: 320, h: 568 },
];
const MENUS = ['wb-insert-menu', 'wb-edit-menu', 'wb-arrange-menu', 'wb-view-menu', 'wb-board-menu'];

const findings = [];
const check = (ok, what) => { if (!ok) findings.push(what); return ok; };

// `docks.js`'s rule, verbatim in intent: a control is the thing you press, not
// its parts, so a `.select-shell` counts once and the native select it hides
// counts not at all. Anything inside a closed menu measures 0x0 and is out.
const MEASURE = (barSel) => {
  const bar = document.querySelector(barSel);
  if (!bar) return null;
  const WRAP = '.seg, .segmented-control, .select-shell';
  const box = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const contentLeft = box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
  const contentRight = box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
  const controls = [...bar.querySelectorAll('button, select, input, .seg, .segmented-control, .select-shell, label')]
    .filter((c) => {
      const r = c.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      if (c.matches('.dock-native-hidden, .select-native-hidden, .dock-menu-label, .visually-hidden')) return false;
      if (c.closest('.wb-board-menu')) return false;
      const wrap = c.closest(WRAP);
      return !(wrap && wrap !== c);
    });
  const name = (c) => c.id || (c.tagName.toLowerCase() + '.' + [...c.classList].slice(0, 2).join('.'));
  const each = controls.map((c) => {
    const r = c.getBoundingClientRect();
    return {
      n: name(c),
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      top: Math.round(r.top),
    };
  });
  const rows = [...new Set(each.map((c) => c.top))].sort((a, b) => a - b);
  return {
    bar: { w: Math.round(box.width), h: Math.round(box.height) },
    rows: rows.length,
    controls: each.length,
    menuToggles: controls.filter((c) => c.matches('[data-wb-menu-toggle]')).length,
    heights: [...new Set(each.map((c) => c.h))].sort((a, b) => a - b),
    surface: `bg=${cs.backgroundColor} border=${cs.borderTopWidth} radius=${cs.borderTopLeftRadius}`,
    overflow: Math.round(bar.scrollWidth) - Math.round(bar.clientWidth),
    // Half a pixel of slack: sub-pixel layout puts a flush right edge at
    // contentRight + 0.0001 often enough that a hard compare cries wolf.
    past: each.filter((c) => c.right > contentRight + 0.5)
      .map((c) => `${c.n} ends ${Math.round((c.right - contentRight) * 10) / 10}px past the content box`),
    // `--target-min` is declared in rem (2.75), so reading the custom
    // property and parsing it gives 2.75 and every floor check below 820
    // passes against a floor of under three pixels. Laying a probe element out
    // at that width is the only reading that cannot lie.
    targetMin: (() => {
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.width = 'var(--target-min)';
      document.body.appendChild(probe);
      const px = probe.getBoundingClientRect().width;
      probe.remove();
      return Math.round(px * 10) / 10;
    })(),
    each,
  };
};

(async () => {
  for (const { w, h } of WIDTHS) {
    const { browser, page } = await boot({
      viewport: { width: w, height: h },
      hasTouch: w <= 1024,
      isMobile: w < 600,
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 140)));
    // One board of its own, made through the API: the seeded notebook may hold
    // none, and a sweep that depends on a gallery card measures nothing on a
    // fresh data dir.
    const id = await page.evaluate(async () => {
      const r = await api('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'Topbar sweep' }) });
      return (await r.json()).id;
    });
    await page.evaluate((b) => openWhiteboardBoard(b), id);
    await page.waitForTimeout(1800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const m = await page.evaluate(MEASURE, '#wb-topbar');
    if (!m) {
      findings.push(`no #wb-topbar at ${w}`);
      await browser.close();
      continue;
    }
    const floor = w < 820 ? m.targetMin : 28;
    const under = m.each.filter((c) => c.h + 0.5 < floor || c.w + 0.5 < floor)
      .map((c) => `${c.n} ${c.w}x${c.h}`);
    console.log(`== ${w}x${h}`);
    console.log(`   bar ${m.bar.w}x${m.bar.h} in ${m.rows} row(s), ${m.controls} controls ` +
      `(${m.menuToggles} menu toggles + ${m.controls - m.menuToggles} others), heights ${m.heights.join('/')}`);
    console.log(`   surface ${m.surface}`);
    console.log(`   overflow ${m.overflow}px, ${m.past.length} past the content box, ` +
      `${under.length} under the ${floor}px floor`);
    console.log('   controls: ' + m.each.map((c) => `${c.n} ${c.w}x${c.h}`).join(', '));
    if (m.past.length) console.log('   past: ' + m.past.join(' | '));
    if (under.length) console.log('   under: ' + under.join(', '));

    check(m.overflow <= 0, `the bar scrolls sideways by ${m.overflow}px at ${w}`);
    for (const p of m.past) findings.push(`at ${w}: ${p}`);
    for (const u of under) findings.push(`at ${w}: ${u}, under the ${floor}px floor`);
    // The ceiling, read the way Phase 8 wrote the exception: the five menu
    // toggles are the menu bar, everything else is the dock and answers to the
    // seven-control ceiling.
    check(m.controls - m.menuToggles <= 7,
      `at ${w}: ${m.controls - m.menuToggles} controls beside the menus, over the seven-control ceiling`);

    // --- the menus, at the widest and the narrowest only ------------------
    if (w === 1440 || w === 320) {
      for (const menuId of MENUS) {
        const r = await page.evaluate(async (mid) => {
          const menu = document.getElementById(mid);
          const toggle = document.querySelector(`[aria-controls="${mid}"]`);
          if (!menu || !toggle) return { fatal: 'no menu or no toggle' };
          const wait = (ms) => new Promise((res) => setTimeout(res, ms));
          const open = () => !menu.classList.contains('hidden');
          toggle.click();
          await wait(250);
          const opened = open();
          // Visible ones only: the View menu keeps two map rows `hidden` on an
          // ordinary whiteboard, and focusing one of those measures "the arrow
          // keys do nothing" when what happened is that nothing can focus an
          // element with no box.
          const items = [...menu.querySelectorAll('[role="menuitem"]')]
            .filter((el) => !el.hidden && el.offsetParent !== null);
          const buttons = [...menu.querySelectorAll('button')].filter((b) => !b.closest('[role="none"]'));
          const rogue = buttons.filter((b) => b.getAttribute('role') !== 'menuitem').length;
          const badChild = [...menu.children].filter((c) =>
            !['menuitem', 'menuitemcheckbox', 'menuitemradio', 'group', 'separator', 'none', 'presentation']
              .includes(c.getAttribute('role') || '')).length;
          // Keyboard: focus the first item, then ArrowDown, which is the one
          // thing a person who has just opened a menu will try.
          let arrow = false;
          if (items.length > 1) {
            items[0].focus();
            const was = document.activeElement;
            menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            await wait(80);
            arrow = document.activeElement !== was && menu.contains(document.activeElement);
          }
          return { opened, items: items.length, rogue, badChild, arrow, expanded: toggle.getAttribute('aria-expanded') };
        }, menuId);
        if (r.fatal) { findings.push(`${menuId} at ${w}: ${r.fatal}`); continue; }
        // Escape: closes, and the focus comes back to the toggle that opened it.
        await page.focus(`#${menuId} [role="menuitem"], #${menuId} button`).catch(() => {});
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        const afterEsc = await page.evaluate((mid) => ({
          closed: document.getElementById(mid).classList.contains('hidden'),
          onToggle: document.activeElement === document.querySelector(`[aria-controls="${mid}"]`),
        }), menuId);
        // Outside click: open again, press the canvas.
        await page.evaluate((mid) => document.querySelector(`[aria-controls="${mid}"]`).click(), menuId);
        await page.waitForTimeout(200);
        // A point the menu is not standing on: at 320 an escaped menu
        // covers the middle of the window, so a fixed point measured "the menu
        // stayed open" three times over when what stayed open was the probe's
        // aim.
        const spot = await page.evaluate((mid) => {
          const menu = document.getElementById(mid).getBoundingClientRect();
          const bar = document.getElementById('wb-topbar').getBoundingClientRect();
          const clear = (x, y) => !(x >= menu.left && x <= menu.right && y >= menu.top && y <= menu.bottom)
            && !(x >= bar.left && x <= bar.right && y >= bar.top && y <= bar.bottom);
          for (const [x, y] of [[8, innerHeight - 8], [innerWidth - 8, innerHeight - 8],
            [8, Math.round(innerHeight / 2)], [innerWidth - 8, Math.round(innerHeight / 2)], [8, bar.bottom + 8]]) {
            if (clear(x, y)) return { x, y };
          }
          return null;
        }, menuId);
        if (!spot) { findings.push(`${menuId} at ${w}: nowhere outside the menu to press`); continue; }
        await page.mouse.click(spot.x, spot.y);
        await page.waitForTimeout(250);
        const afterOutside = await page.evaluate((mid) => document.getElementById(mid).classList.contains('hidden'), menuId);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
        console.log(`   ${menuId} @${w}: open=${r.opened} items=${r.items} rogue=${r.rogue} ` +
          `badChild=${r.badChild} arrow=${r.arrow} esc=${afterEsc.closed}/${afterEsc.onToggle} outside=${afterOutside}`);
        check(r.opened, `${menuId} at ${w} did not open`);
        check(r.expanded === 'true', `${menuId} at ${w} left aria-expanded at ${r.expanded}`);
        check(r.items > 0, `${menuId} at ${w} has a role="menu" with no role="menuitem" in it`);
        check(r.rogue === 0, `${menuId} at ${w} has ${r.rogue} button(s) in the menu with no menuitem role`);
        check(r.badChild === 0, `${menuId} at ${w} has ${r.badChild} child(ren) of role="menu" with no allowed role`);
        check(r.arrow, `${menuId} at ${w}: ArrowDown moved no focus`);
        check(afterEsc.closed, `${menuId} at ${w} stayed open on Escape`);
        check(afterEsc.onToggle, `${menuId} at ${w}: Escape left the focus off its toggle`);
        check(afterOutside, `${menuId} at ${w} stayed open on an outside click`);
      }
    }
    if (errors.length) findings.push(`page errors at ${w}: ` + errors.join(' | '));
    await browser.close();
  }

  // The OCR workspace head, the probe's other half. Report only: it exists
  // only once a scanned file is open, which the sweep's notebook has no path
  // to, so its absence is a gap in the fixture and not a finding about the app.
  const { browser, page } = await boot();
  await page.click('[data-tab="library"]').catch(() => {});
  await page.waitForTimeout(700);
  await page.click('[data-target="library-view-files"]', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const ocr = await page.evaluate(MEASURE, '.ocr-toolbar, .ocr-head');
  console.log('== ocr head: ' + (ocr ? `${ocr.controls} controls, heights ${ocr.heights.join('/')}, ${ocr.surface}` : 'not open in this notebook (no scanned file to open)'));
  await browser.close();

  console.log(findings.length ? 'FAIL:\n  ' + findings.join('\n  ') : 'PASS: 0 findings');
  process.exit(findings.length ? 1 : 0);
})();
