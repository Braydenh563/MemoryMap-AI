// The iPhone, tab by tab and sheet by sheet (phone-1011, the owner's
// "maximum trust" brief, step 2).
//
//   BASE=http://127.0.0.1:8790 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     timeout 300 node scratchpad/ui-sweeps/iphone1011.js
//   SIZES=390x844 THEMES=dark ... one size or one theme only.
//   ONLY=tabs | sheets ... one half only.
//
// What `phone.js` asks per tab (no sideways scroll, 44px targets, one
// column), asked again with an iPhone's user agent at 3x, in light and dark,
// at 390x844 (iPhone 14/15) and 430x932 (the Pro Max), and five more things
// the iPhone adds:
//
//   1. **Safe areas.** Chromium applies `env(safe-area-inset-*)` once the
//      DevTools protocol sets them (`Emulation.setSafeAreaInsetsOverride`),
//      so the notch (47px, 59px on the Pro Max) and the home indicator (34px)
//      are real here. Every control in a fixed or sticky surface (the header,
//      the tab bar, a dock, a sheet's head and foot, a toast) must sit
//      outside them. index.html carries `viewport-fit=cover`, without which
//      iOS reports every inset as 0 and none of the app's 27 `env()` rules
//      ever applied there.
//   2. **No input text under 16px.** iOS Safari zooms the page into any
//      field whose text is smaller when it takes focus, and does not zoom
//      back out.
//   3. **The tab bar never covers content.** Each tab scrolled to its end:
//      the last thing on it ends above the bar (and above any fixed foot).
//   4. **Sheets scroll their own content, not the page.** A touch scroll
//      gesture on an open sheet (`Input.synthesizeScrollGesture`, touch
//      source) must not move the page behind it, and a sheet taller than the
//      window has a scroller of its own.
//   5. **Every sheet** reachable without a model: opened by its own opener,
//      measured, closed with Escape. A sheet whose opener is not loaded yet
//      is reported, not skipped silently.
//
// Exits non-zero on any finding; prints one row per surface with the numbers.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8790';
const { boot } = require('./lib.js');

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
//: [width, height, notch, home indicator]
const ALL_SIZES = { '390x844': [390, 844, 47, 34], '430x932': [430, 932, 59, 34] };
const SIZES = (process.env.SIZES || Object.keys(ALL_SIZES).join(',')).split(',').map((s) => ALL_SIZES[s]);
const THEMES = (process.env.THEMES || 'light,dark').split(',');
const ONLY = process.env.ONLY || '';
const TABS = ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders'];

//: The sheets and popups, each by the call that opens it. `tab` is switched
//: to first where the opener lives on one. Openers that need a note get the
//: first note in the list.
const SHEETS = [
  ['more', 'openPhoneMoreSheet()'],
  ['note page', 'openNotePage(allEntries[0])', 'notes'],
  ['note properties', 'openNotePropertiesSheet(allEntries[0])', 'notes'],
  ['note category', 'chooseNoteCategory([allEntries[0].id], allEntries[0].category || "")', 'notes'],
  ['bulk tags', 'openBulkTags([allEntries[0].id])', 'notes'],
  ['categories', 'openManageCategories()', 'notes'],
  ['tags', 'openTagsSheet()', 'notes'],
  ['note types', 'openNoteTypesSheet()', 'notes'],
  ['relation types', 'openRelationTypesSheet()', 'notes'],
  ['tidy', 'openTidySheet()', 'notes'],
  ['suggestions', 'openSuggestionsInbox()', 'notes'],
  ['entities', 'openEntitiesSheet()', 'notes'],
  ['reminder compose', 'openReminderCompose()', 'reminders'],
  ['new meeting', 'openNewMeeting()', 'notes'],
  ['guide', 'openHelpChat()'],
  ['agent', 'toggleAgentPalette()', 'chat'],
  ['chat more', 'openChatDockMore()', 'chat'],
  ['note picker', 'openNotePicker()', 'chat'],
  ['graph controls', 'openGraphControlsSheet(document.querySelector("#graph-view button"))', 'graph'],
  ['settings', 'openSettingsModal("preferences")'],
  ['settings account', 'openSettingsModal("account")'],
  ['find anything', 'openPalette()'],
  ['confirm', 'confirmDialog("A question for the sweep, long enough to wrap onto a second line at this width.")'],
  ['prompt', 'promptDialog("Name for it:", "")'],
  ['recipe, tall', `openSheet({ label: "Sweep sheet", name: "sweep", build: (card) => {
      for (let i = 0; i < 40; i++) { const b = document.createElement("button"); b.type = "button"; b.className = "ghost"; b.textContent = "Row " + i; card.appendChild(b); }
      const f = document.createElement("input"); f.type = "text"; f.setAttribute("aria-label", "Sweep field"); card.appendChild(f); } })`],
];

const PROBE = `(() => {
  window.__iphone = {
    visible(el) {
      if (!el.checkVisibility || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight;
    },
    name(el) {
      return (el.id ? '#' + el.id : '') || (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24) || el.className.toString().split(' ')[0] || el.tagName;
    },
    //: Fixed or sticky, and not inside something that scrolls on the way
    //: there: a row in a sheet's list scrolls clear of the home indicator,
    //: so only what stays put has to keep out of it.
    pinned(el) {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.position === 'fixed' || s.position === 'sticky') return n;
        if (n !== el && (s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return null;
      }
      return null;
    },
    //: A chip paints 24px and takes the floor through a transparent
    //: overhang (DESIGN.md "Hit targets"), which no box reports: a press at
    //: the edges of a 44px square round its centre has to land on it.
    reaches(el, b, min) {
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2, r = min / 2 - 1;
      const pts = [];
      if (b.height + 0.5 < min) pts.push([cx, cy - r], [cx, cy + r]);
      if (b.width + 0.5 < min) pts.push([cx - r, cy], [cx + r, cy]);
      return pts.every(([x, y]) => {
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
        const hit = document.elementFromPoint(x, y);
        return hit && (hit === el || el.contains(hit));
      });
    },
    controls(root) {
      const v = window.__iphone.visible;
      return [...root.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="tab"], [role="button"]')]
        .filter(v)
        .filter((el) => !el.closest('.dock-native-hidden, .visually-hidden, .sr-only, .dock-menu-list, [hidden]'))
        .filter((el) => !el.classList.contains('seg'))
        .filter((el) => !(el.tagName === 'INPUT' && ['checkbox', 'radio', 'range', 'color', 'file'].includes(el.type)));
    },
    measure(root, opts) {
      const I = window.__iphone;
      const W = innerWidth, H = innerHeight;
      const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--target-min')) * parseFloat(getComputedStyle(document.documentElement).fontSize) || 44;
      const out = { small: [], tinyText: [], unsafe: [], wide: [], pageWide: document.documentElement.scrollWidth - W };
      for (const el of I.controls(root)) {
        // A search field's input is the text inside the well; the well
        // (.search-field) is what a finger aims at.
        const b = (el.closest('.search-field') || el).getBoundingClientRect();
        // Inline links in running text are text, not targets.
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
        if (!inline && (b.width + 0.5 < min || b.height + 0.5 < min) && !I.reaches(el, b, min)) out.small.push(I.name(el) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
        if (I.pinned(el) && (b.top < opts.top - 0.5 || b.bottom > H - opts.bottom + 0.5)) out.unsafe.push(I.name(el) + ' y' + Math.round(b.top) + '-' + Math.round(b.bottom));
      }
      for (const el of root.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea, select, [contenteditable="true"], [contenteditable=""]')) {
        if (!I.visible(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < 16) out.tinyText.push(I.name(el) + ' ' + size + 'px');
      }
      for (const el of root.querySelectorAll('*')) {
        if (!I.visible(el)) continue;
        // Over 4px: a badge or a focus ring's offset spills by that much on
        // purpose; text that runs out of its box spills by more.
        if (el.scrollWidth > el.clientWidth + 4 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0) out.wide.push(I.name(el) + ' ' + el.scrollWidth + '>' + el.clientWidth);
        const b = el.getBoundingClientRect();
        if (b.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('[class*="scroll"], .edge-fade, .tab-strip, .chip-row')) {
          let clipped = false;
          for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') { clipped = true; break; } }
          if (!clipped) out.wide.push(I.name(el) + ' right ' + Math.round(b.right));
        }
      }
      for (const k of ['small', 'tinyText', 'unsafe', 'wide']) out[k] = [...new Set(out[k])].slice(0, 6);
      return out;
    },
  };
})()`;

async function sweepTabs(page, inset) {
  const rows = [];
  for (const tab of TABS) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(({ inset }) => {
      const I = window.__iphone;
      const tabPage = document.querySelector('.tab-page:not(.hidden)');
      if (!tabPage) return { none: true };
      const m = I.measure(document.body, inset);
      // The end of the tab: scroll every scroller to its end, then the
      // lowest visible thing on the tab against the top of the lowest fixed
      // foot (the tab bar, a dock pinned to the bottom).
      window.scrollTo(0, 1e6);
      for (const el of [tabPage, ...tabPage.querySelectorAll('*')]) {
        const s = getComputedStyle(el);
        if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) el.scrollTop = 1e6;
      }
      const feet = [...document.querySelectorAll('body *')].filter((el) => {
        if (!I.visible(el)) return false;
        const s = getComputedStyle(el);
        if (s.position !== 'fixed') return false;
        const b = el.getBoundingClientRect();
        return b.bottom >= innerHeight - 1 && b.width > innerWidth * 0.6 && b.height < innerHeight * 0.4;
      });
      const footTop = Math.min(innerHeight, ...feet.map((el) => el.getBoundingClientRect().top));
      let lowest = null;
      for (const el of tabPage.querySelectorAll('*')) {
        if (el.children.length || !I.visible(el) || I.pinned(el)) continue;
        const text = (el.textContent || '').trim();
        if (!text && !el.matches('button, input, textarea, select, img, svg, canvas')) continue;
        const b = el.getBoundingClientRect();
        if (b.bottom > innerHeight + 2) continue; // past the window: a scroller with no end in view
        if (!lowest || b.bottom > lowest.bottom) lowest = { bottom: b.bottom, name: I.name(el) };
      }
      const covered = lowest && lowest.bottom > footTop + 1 ? `${lowest.name} ends at ${Math.round(lowest.bottom)}, foot at ${Math.round(footTop)}` : '';
      window.scrollTo(0, 0);
      for (const el of tabPage.querySelectorAll('*')) if (el.scrollTop) el.scrollTop = 0;
      return { ...m, covered, footTop: Math.round(footTop), lowest: lowest ? Math.round(lowest.bottom) : null };
    }, { inset });
    rows.push({ surface: `tab ${tab}`, ...r });
  }
  return rows;
}

async function closeAll(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(() => [...document.querySelectorAll('.modal-overlay, .sheet-overlay, .confirm-overlay, #palette-overlay, [role="dialog"]')]
      .filter((el) => window.__iphone.visible(el) && !el.closest('#lock-overlay')).length);
    if (!open) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => { if (typeof closeSettingsModal === 'function') closeSettingsModal(); });
}

async function sweepSheets(page, cdp, inset) {
  const rows = [];
  for (const [label, call, tab] of SHEETS) {
    if (tab) { await page.evaluate((t) => switchTab(t), tab); await page.waitForTimeout(700); }
    const opened = await page.evaluate(async (call) => {
      const fn = call.split('(')[0];
      if (fn !== 'openSheet' && typeof window[fn] !== 'function') {
        try { if (typeof eval(fn) !== 'function') return `not loaded: ${fn}`; } catch { return `not loaded: ${fn}`; }
      }
      try { const p = eval(call); if (p && p.then) await Promise.race([p, new Promise((r) => setTimeout(r, 4000))]); return ''; } catch (e) { return `threw: ${e.message.slice(0, 60)}`; }
    }, call);
    if (opened) { rows.push({ surface: `sheet ${label}`, skipped: opened }); continue; }
    await page.waitForTimeout(1300);
    const r = await page.evaluate(({ inset }) => {
      const I = window.__iphone;
      const overlays = [...document.querySelectorAll('.modal-overlay, .sheet-overlay, .confirm-overlay, .palette-overlay, #palette-overlay, [role="dialog"]')]
        .filter((el) => I.visible(el) && !el.closest('#lock-overlay'));
      const overlay = overlays[overlays.length - 1];
      if (!overlay) return { none: true };
      const card = overlay.querySelector('.sheet-card, .modal-card, .card, [class*="card"]') || overlay;
      const m = I.measure(overlay, inset);
      const cb = card.getBoundingClientRect();
      // Its scroller: the card, or the deepest box in it that scrolls.
      const scrollers = [card, ...card.querySelectorAll('*')].filter((el) => {
        const s = getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.clientHeight > 40;
      });
      const tall = [card, ...card.querySelectorAll('*')].some((el) => el.scrollHeight > innerHeight);
      const scroller = scrollers.find((el) => el.scrollHeight > el.clientHeight + 1) || scrollers[0] || null;
      // The foot, scrolled to the end: the last control clears the home indicator.
      let footUnsafe = '';
      if (scroller) {
        scroller.scrollTop = 1e6;
        const last = I.controls(card).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
        if (last && last.getBoundingClientRect().bottom > innerHeight - inset.bottom + 0.5) footUnsafe = `${I.name(last)} ends ${Math.round(last.getBoundingClientRect().bottom)}`;
        scroller.scrollTop = 0;
      }
      const sb = scroller ? scroller.getBoundingClientRect() : cb;
      return {
        ...m,
        card: [Math.round(cb.left), Math.round(cb.top), Math.round(cb.width), Math.round(cb.height)],
        cardOff: cb.left < -0.5 || cb.right > innerWidth + 0.5 ? `card ${Math.round(cb.left)}..${Math.round(cb.right)}` : '',
        headUnsafe: cb.top < inset.top - 0.5 && cb.height > innerHeight * 0.5
          ? (() => { const head = card.querySelector('.sheet-head, .dialog-head, h2, .modal-head'); const hb = head?.getBoundingClientRect(); return hb && hb.top < inset.top - 0.5 ? `head at ${Math.round(hb.top)}` : ''; })() : '',
        noScroller: tall && !scrollers.some((el) => el.scrollHeight > el.clientHeight + 1) ? 'taller than the window with no scroller' : '',
        footUnsafe,
        at: [Math.round(sb.left + sb.width / 2), Math.round(sb.top + Math.min(sb.height / 2, 200))],
        overscroll: scroller ? getComputedStyle(scroller).overscrollBehaviorY : '',
        scrollY: window.scrollY,
        pageScroll: document.scrollingElement.scrollHeight - innerHeight,
      };
    }, { inset });
    if (!r.none) {
      // A finger dragging up, twice the window, on the sheet's scroller:
      // the page behind must not move.
      const before = await page.evaluate(() => [window.scrollY, ...[...document.querySelectorAll('.tab-page:not(.hidden), main, #app')].map((el) => el.scrollTop)].join(','));
      await cdp.send('Input.synthesizeScrollGesture', { x: r.at[0], y: r.at[1], yDistance: -1600, gestureSourceType: 'touch', speed: 4000 }).catch(() => {});
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => [window.scrollY, ...[...document.querySelectorAll('.tab-page:not(.hidden), main, #app')].map((el) => el.scrollTop)].join(','));
      r.pageMoved = before !== after ? `${before} -> ${after}` : '';
    }
    rows.push({ surface: `sheet ${label}`, ...r });
    await closeAll(page);
    await page.waitForTimeout(300);
  }
  return rows;
}

function report(row) {
  if (row.skipped) return { line: `  ${row.surface.padEnd(26)} skipped (${row.skipped})`, bad: [] };
  if (row.none) return { line: `  ${row.surface.padEnd(26)} did not open`, bad: ['did not open'] };
  const bad = [];
  if (row.pageWide > 0) bad.push(`page ${row.pageWide}px wider than the window`);
  if (row.wide?.length) bad.push(`wider than its box: ${row.wide.join(', ')}`);
  if (row.small?.length) bad.push(`under 44px: ${row.small.join(', ')}`);
  if (row.tinyText?.length) bad.push(`input text under 16px (iOS zooms): ${row.tinyText.join(', ')}`);
  if (row.unsafe?.length) bad.push(`in the notch or on the home indicator: ${row.unsafe.join(', ')}`);
  if (row.covered) bad.push(`the bar covers content: ${row.covered}`);
  if (row.cardOff) bad.push(row.cardOff);
  if (row.headUnsafe) bad.push(`sheet head in the notch: ${row.headUnsafe}`);
  if (row.noScroller) bad.push(row.noScroller);
  if (row.footUnsafe) bad.push(`sheet foot on the home indicator: ${row.footUnsafe}`);
  if (row.pageMoved) bad.push(`the page behind the sheet scrolled: ${row.pageMoved}`);
  const facts = row.card ? `card ${row.card.join(',')} overscroll ${row.overscroll || '-'}` : `end ${row.lowest ?? '-'} foot ${row.footTop ?? '-'}`;
  return { line: `  ${row.surface.padEnd(26)} ${bad.length ? 'FAIL' : 'ok  '} ${facts}`, bad };
}

(async () => {
  let failures = 0;
  const errors = new Set();
  for (const [W, H, top, bottom] of SIZES) {
    for (const theme of THEMES) {
      process.env.THEME = theme;
      //: Twice at most: on a loaded machine the lock screen's fade can race
      //: lib.js's second password fill (the button "not visible").
      let booted;
      for (let attempt = 0; !booted; attempt++) {
        try {
          booted = await boot({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, scale: 3, userAgent: IPHONE_UA });
        } catch (e) {
          if (attempt) throw e;
        }
      }
      const { browser, ctx, page } = booted;
      page.on('pageerror', (e) => errors.add(`${W} ${theme} pageerror: ${e.message.slice(0, 100)}`));
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, bottom, left: 0, right: 0 } });
      await page.waitForTimeout(400);
      await page.evaluate(PROBE);
      const inset = { top, bottom };
      const meta = await page.evaluate(() => document.querySelector('meta[name="viewport"]')?.content || '');
      console.log(`--- ${W}x${H} ${theme}, iPhone UA, touch, insets ${top}/${bottom}; viewport "${meta}"`);
      if (!/viewport-fit=cover/.test(meta)) { console.log('      viewport-fit=cover missing: iOS reports every safe-area inset as 0'); failures++; }
      const rows = [];
      if (ONLY !== 'sheets') rows.push(...await sweepTabs(page, inset));
      if (ONLY !== 'tabs') rows.push(...await sweepSheets(page, cdp, inset));
      for (const row of rows) {
        const { line, bad } = report(row);
        console.log(line);
        for (const b of bad) console.log(`      ${b}`);
        failures += bad.length;
      }
      await browser.close();
    }
  }
  for (const e of errors) console.log(`  ${e}`);
  failures += errors.size;
  console.log(failures ? `\nFAIL: ${failures} findings` : '\nPASS: 0 findings');
  process.exit(failures ? 1 : 0);
})();
