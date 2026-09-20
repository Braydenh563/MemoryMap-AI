// The graph on a phone: UI_MODERNISATION_PLAN.md Phase 11 item 4, the half
// `graphtouch.js` does not cover. That probe proved pan and pinch; this one
// asks the questions the plan's sentence asks after them: "tap to select,
// long-press for the node menu (no right click), lasso by long-press then
// drag, the docks as one bottom sheet with the colour rule, groups and views;
// the node panel as a sheet".
//
// Its own browser context rather than `lib.js`'s, for `graphtouch.js`'s
// reason: `hasTouch` plus `isMobile` is what makes `(pointer: coarse)` match
// and what makes a long press be a touch at all. The gestures go through CDP
// `Input.dispatchTouchEvent`, the way `phoneswipe.js` drives a swipe: a mouse
// never starts either one.
//
//   BASE=http://127.0.0.1:8971 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node scratchpad/ui-sweeps/graphphone.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const WIDTH = Number(process.env.WIDTH || 390);
const HEIGHT = Number(process.env.HEIGHT || 844);

const findings = [];
const check = (ok, what) => { if (!ok) findings.push(what); return ok; };

async function touch(cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i })),
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('theme', 'light');
      localStorage.setItem('onboardingDone', '1');
      localStorage.setItem('tourDone', '1');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const o = document.getElementById('onboarding-overlay');
    if (o) o.classList.add('hidden');
  });
  // Enough notes that the map has something to hold a finger on.
  await page.evaluate(async () => {
    const list = await apiPagedList('/entries', 50).catch(() => []);
    const want = 14 - list.filter((e) => e && e.id && !e.is_draft).length;
    for (let i = 0; i < want; i++) {
      await apiJson('/entries', {
        method: 'POST',
        body: JSON.stringify({ content: `Map note ${i} about thesis reading` }),
      }).catch(() => {});
    }
  });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(5000);
  // The panel's open/closed state is mirrored to the server
  // (`MIRRORED_UI_EXTRAS`, app.js), so it survives a fresh browser context
  // and a run of this probe would otherwise start wherever the last one
  // left it: with the panel open, nothing on the map is reachable by a
  // finger at all, which is a finding about this probe rather than the app.
  await page.evaluate(() => setGraphOptionsOpen(false));
  await page.waitForTimeout(400);

  const cdp = await ctx.newCDPSession(page);
  const rectOf = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);

  // --- what the tab looks like before a finger touches it -------------------
  const shape = await page.evaluate(() => {
    const dock = document.querySelector('#tab-graph .dock[data-dock-name="graph"]');
    const box = document.getElementById('graph-box');
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [Math.round(b.width), Math.round(b.height)];
    };
    return {
      dock: r(dock),
      map: r(box),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      optionsHidden: document.getElementById('graph-options').classList.contains('hidden'),
    };
  });
  console.log('graph at ' + WIDTH + '    ', JSON.stringify(shape));
  check(shape.overflow <= 0, `the page scrolls ${shape.overflow}px sideways at ${WIDTH}`);

  // A point on the canvas that really has a node under it, and one that
  // really has none: `elementFromPoint` decides whether the dock or the
  // options panel is over the map there (graphtouch.js's own trap).
  const points = await page.evaluate(() => {
    const canvas = document.getElementById('graph-canvas');
    const b = canvas.getBoundingClientRect();
    let onNode = null;
    let empty = null;
    for (let fy = 0.2; fy <= 0.85; fy += 0.025) {
      for (let fx = 0.1; fx <= 0.9; fx += 0.025) {
        const x = b.left + b.width * fx;
        const y = b.top + b.height * fy;
        if (document.elementFromPoint(x, y) !== canvas) continue;
        const [wx, wy] = gcWorldPoint({ clientX: x, clientY: y });
        const node = gcNodeAtWorld(wx, wy);
        if (node && !node.isGroup && !onNode) onNode = [Math.round(x), Math.round(y), node.id];
        if (!node && !empty) empty = [Math.round(x), Math.round(y)];
      }
    }
    return { onNode, empty };
  });
  console.log('points          ', JSON.stringify(points));
  check(Boolean(points.onNode), 'no node on the map is reachable by a finger');
  check(Boolean(points.empty), 'no empty spot on the map is reachable by a finger');

  const hold = async (x, y, ms = 750) => {
    await touch(cdp, 'touchStart', [{ x, y }]);
    await page.waitForTimeout(ms);
  };

  // --- 1. long-press on a node opens the node menu --------------------------
  if (points.onNode) {
    await hold(points.onNode[0], points.onNode[1]);
    const menu = await page.evaluate(() => {
      const el = document.querySelector('.action-menu[role="menu"]:not(.hidden), .graph-node-menu:not(.hidden)');
      if (!el) return null;
      const rows = [...el.querySelectorAll('button')];
      const r = el.getBoundingClientRect();
      return {
        rows: rows.length,
        labels: rows.map((b) => b.textContent.trim()).slice(0, 8),
        minRow: Math.min(...rows.map((b) => Math.round(b.getBoundingClientRect().height))),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
      };
    });
    console.log('long-press node ', JSON.stringify(menu));
    console.log('focus while held', await page.evaluate(() => {
      const a = document.activeElement;
      const m = document.querySelector('.action-menu:not(.hidden)');
      return { active: a ? (a.id || a.className || a.tagName) : null, inMenu: Boolean(m && m.contains(a)) };
    }));
    await touch(cdp, 'touchEnd', []);
    await page.waitForTimeout(200);
    check(Boolean(menu), 'a long press on a node opened no menu');
    if (menu) {
      check(menu.rows >= 4, `the node menu has ${menu.rows} rows`);
      check(menu.minRow >= 44, `the node menu's shortest row is ${menu.minRow}px`);
      check(menu.right <= WIDTH, `the node menu runs ${menu.right - WIDTH}px past the right edge`);
      check(menu.bottom <= HEIGHT, `the node menu runs ${menu.bottom - HEIGHT}px below the window`);
      console.log('focus after lift', await page.evaluate(() => {
        const a = document.activeElement;
        const menu = document.querySelector('.action-menu:not(.hidden)');
        return { active: a ? (a.id || a.className || a.tagName) : null, inMenu: Boolean(menu && menu.contains(a)) };
      }));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const gone = await page.evaluate(
        () => !document.querySelector('.action-menu[role="menu"]:not(.hidden), .graph-node-menu:not(.hidden)')
      );
      check(gone, 'Escape did not close the node menu');
    }
  }

  // --- 2. lasso: hold on empty map, then drag -------------------------------
  if (points.empty) {
    await page.evaluate(() => {
      gcTab.selected.clear();
      gcSelectionChanged(gcTab);
    });
    const [ex, ey] = points.empty;
    await hold(ex, ey);
    const armed = await page.evaluate(() => Boolean(gcTab.lasso));
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      // A box around the middle of the map, so whatever is there is caught.
      const x = ex + Math.cos(t * Math.PI * 2) * 110;
      const y = ey + Math.sin(t * Math.PI * 2) * 110;
      await touch(cdp, 'touchMove', [{ x, y }]);
      await page.waitForTimeout(20);
    }
    await touch(cdp, 'touchEnd', []);
    await page.waitForTimeout(500);
    const lassoed = await page.evaluate(() => ({
      selected: gcTab.selected.size,
      dock: !document.getElementById('graph-selection-dock').classList.contains('hidden'),
      count: document.getElementById('graph-selection-count').textContent.trim(),
    }));
    console.log('lasso           ', JSON.stringify({ armed, lassoed }));
    check(armed, 'a long press on the empty map did not arm the lasso');
    check(lassoed.selected > 0, `the lasso caught ${lassoed.selected} notes`);
    check(lassoed.dock, 'the selection dock stayed hidden after a lasso');
    await page.evaluate(() => {
      gcTab.selected.clear();
      gcSelectionChanged(gcTab);
    });
  }

  // --- 3. a tap on a node opens the node panel, and it is a sheet -----------
  if (points.onNode) {
    await touch(cdp, 'touchStart', [{ x: points.onNode[0], y: points.onNode[1] }]);
    await page.waitForTimeout(80);
    await touch(cdp, 'touchEnd', []);
    await page.waitForTimeout(1200);
    const panel = await page.evaluate(() => {
      const el = document.getElementById('graph-popup');
      if (!el || el.classList.contains('hidden')) return null;
      const r = el.getBoundingClientRect();
      return {
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        sheet: el.classList.contains('graph-popup-sheet'),
      };
    });
    console.log('tap node        ', JSON.stringify(panel));
    check(Boolean(panel), 'a tap on a node opened nothing');
    if (panel) {
      check(panel.sheet, 'the node panel is not the sheet at 390');
      check(panel.rect[2] >= WIDTH - 32, `the node panel is ${panel.rect[2]} wide in ${WIDTH}`);
      await page.evaluate(() => document.getElementById('graph-popup-close')?.click());
      await page.waitForTimeout(400);
    }
  }

  // --- 4. the controls are one sheet ----------------------------------------
  const before = await rectOf('#graph-options');
  await page.evaluate(() => document.getElementById('graph-options-toggle').click());
  await page.waitForTimeout(600);
  const sheet = await page.evaluate(() => {
    const overlay = document.querySelector('.sheet-overlay[data-sheet="graph"]');
    if (!overlay) return null;
    const card = overlay.querySelector('.sheet-card');
    const r = card.getBoundingClientRect();
    const has = (id) => Boolean(card.querySelector('#' + id));
    // `phone.js`'s own exclusions, copied rather than rediscovered: the
    // native `<select>` behind an enhanced one is `aria-hidden` and out of
    // the tab order (its opener is what a finger lands on), and a tick box
    // or a radio is never stretched to a target anywhere in this app,
    // because a stretched tick box is an oval and its label is the target.
    const small = [...card.querySelectorAll('button, select, summary')]
      .filter((el) => !el.classList.contains('select-native-hidden'))
      .filter((el) => el.offsetParent !== null && Math.round(el.getBoundingClientRect().height) < 44)
      .map((el) => `${el.id || el.className.split(' ')[0]} ${Math.round(el.getBoundingClientRect().height)}`);
    return {
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      colour: has('graph-colour'),
      layout: has('graph-layout'),
      views: has('graph-view-picker'),
      groups: has('graph-groups-section'),
      show: has('graph-toggle-group'),
      small: small.slice(0, 10),
    };
  });
  console.log('controls sheet  ', JSON.stringify(sheet), 'panel before:', JSON.stringify(before));
  check(Boolean(sheet), 'the gear did not open a sheet at 390');
  if (sheet) {
    check(sheet.colour, 'the colour rule is not in the sheet');
    check(sheet.layout, 'the layout picker is not in the sheet');
    check(sheet.views, 'saved views are not in the sheet');
    check(sheet.groups, 'groups are not in the sheet');
    check(sheet.show, "the display toggles are not in the sheet");
    check(sheet.rect[2] >= WIDTH - 2, `the sheet is ${sheet.rect[2]} wide in ${WIDTH}`);
    check(!sheet.small.length, 'controls under 44px in the sheet: ' + sheet.small.join(', '));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const back = await page.evaluate(() => ({
      overlay: Boolean(document.querySelector('.sheet-overlay[data-sheet="graph"]')),
      home: Boolean(document.querySelector('#graph-options #graph-toggle-group')),
      colourHome: Boolean(document.querySelector('#graph-view-menu #graph-colour')),
      viewsHome: Boolean(document.querySelector('#graph-more-menu #graph-view-picker')),
    }));
    console.log('after close     ', JSON.stringify(back));
    check(!back.overlay, 'Escape did not close the controls sheet');
    check(back.home, 'the display toggles did not go back to #graph-options');
    check(back.colourHome, 'the colour rule did not go back to the View menu');
    check(back.viewsHome, 'saved views did not go back to the More menu');
  }

  // --- 5. the desktop is untouched ------------------------------------------
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(800);
  await page.evaluate(() => setGraphOptionsOpen(false));
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('graph-options-toggle').click());
  await page.waitForTimeout(500);
  const wide = await page.evaluate(() => ({
    sheet: Boolean(document.querySelector('.sheet-overlay[data-sheet="graph"]')),
    panel: !document.getElementById('graph-options').classList.contains('hidden'),
    inPlace: Boolean(document.querySelector('#graph-options #graph-toggle-group')),
  }));
  console.log('at 1024         ', JSON.stringify(wide));
  check(!wide.sheet, 'the gear opens a sheet at 1024');
  check(wide.panel && wide.inPlace, 'the floating options panel is gone at 1024');

  if (errors.length) findings.push('page errors: ' + errors.join(' | '));
  console.log(findings.length ? 'FAIL:\n  ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
