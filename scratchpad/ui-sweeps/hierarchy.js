// Hierarchy census (UI_MODERNISATION_PLAN.md, Phase 13.0, Brief 56): per
// surface at 1440 and 390, what a person is actually handed at rest.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/hierarchy.js
//
// Per surface (a tab, a sub-tab, an open document, an open board or map,
// Settings and each of its sections): visible buttons, visible `.primary`
// buttons, visible inputs and selects, and every `.dock` with its zones'
// item counts. "Visible" is `checkVisibility()` plus a box of at least 4px
// (the hidden native `<select>` behind an enhanced one is 2px and is not a
// control a person sees); "in view" is also inside the first viewport, so a
// count of doors below the fold is not read as a count at rest. The chrome
// (header, tab bar, status bar: everything outside a tab page and an
// overlay) is counted once, apart from the page, so a page's number is the
// page's own.
//
// Also: the dialogs classified by their open geometry (a card pinned to a
// viewport edge is a sheet, a centred one a dialog), every icon-only control
// with no accessible name (split into the ones in `index.html` and the ones
// JS builds), and the confirm call sites counted from the source. Writes
// $SCRATCH/hierarchy.json and prints a summary. The contrast and WCAG 2.2
// per-surface runs are `contrast.js` and `axe.js` (there is no `wcag22.js`;
// `axe.js` runs axe-core with the wcag22aa tag), run beside this one.
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib.js');

const WIDTHS = (process.env.WIDTHS || '1440,390').split(',').map(Number);
const OUTDIR = process.env.SCRATCH || '.';
const MENUS = Number(process.env.MENUS || 6);
const FRONT = path.join(__dirname, '..', '..', 'frontend');

// ---- in-page code (serialised into the page; no closures over node) -------

const IN_PAGE = `
(() => {
  const vis = (e) => {
    if (!e.checkVisibility || !e.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
    const r = e.getBoundingClientRect();
    return r.width >= 4 && r.height >= 4;
  };
  const inView = (e) => {
    const r = e.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const OVERLAY = '.modal-overlay, #settings-modal, [aria-modal="true"], .sheet-overlay, .confirm-overlay';
  const BTN = 'button, [role="button"], summary';
  const sig = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(/\\s+/).filter(Boolean).slice(0, 3).join('.');
  // The filled button is the plain \`button\` of the design system (accent fill,
  // DESIGN.md "Filled"), so it is found the way a person finds it: by its
  // painted background matching a fresh plain button's, not by a class name
  // (\`.primary\` is on 1 button in the markup; the fill is on the base rule).
  const fillProbe = (() => { const b = document.createElement('button'); b.className = 'small'; b.style.position = 'fixed'; b.style.left = '-999px'; document.body.appendChild(b); const c = getComputedStyle(b).backgroundColor; b.remove(); return c; })();
  const isFilled = (b) => b.matches('button') && getComputedStyle(b).backgroundColor === fillProbe && !b.closest('.seg, .segmented-control, .select-shell');
  const count = (root, outsideOf) => {
    const keep = (e) => vis(e) && !e.closest('.dock-native-hidden, .visually-hidden') && (!outsideOf || !e.closest(outsideOf));
    const all = [...root.querySelectorAll(BTN)].filter(keep);
    const view = all.filter(inView);
    const prim = all.filter((b) => b.matches('.primary'));
    const filled = all.filter(isFilled);
    const titleOnly = all.filter((b) => !(b.textContent || '').trim() && !(b.getAttribute('aria-label') || '').trim() && (b.getAttribute('title') || '').trim());
    const iconOnly = all.filter((b) => b.matches('.icon-only, .icon-btn') || (!(b.textContent || '').trim() && b.querySelector('i, svg, img')));
    const fields = [...root.querySelectorAll('input:not([type="hidden"]), textarea, select, [contenteditable="true"], .cm-content')].filter(keep);
    const kind = (e) => e.tagName === 'INPUT' ? ((e.type === 'checkbox' || e.type === 'radio') ? 'toggles' : (e.type === 'range' ? 'ranges' : 'text')) : e.tagName === 'TEXTAREA' ? 'textareas' : e.tagName === 'SELECT' ? 'nativeSelects' : 'editors';
    const f = {};
    for (const e of fields) { const k = kind(e); f[k] = (f[k] || 0) + 1; }
    // An enhanced select is a shell with an opener button: counted once as a
    // select, however many native options sit behind it.
    const shells = [...root.querySelectorAll('.select-shell')].filter(keep).length;
    const nativeAlone = fields.filter((e) => e.tagName === 'SELECT' && !e.closest('.select-shell')).length;
    return {
      buttons: all.length, buttonsInView: view.length,
      primaryClass: prim.length, filled: filled.length, filledInView: filled.filter(inView).length,
      filledNames: filled.slice(0, 8).map((b) => (b.id ? '#' + b.id : (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 24) || sig(b))),
      titleOnlyIconButtons: titleOnly.length, primaryNames: prim.slice(0, 6).map((b) => (b.id ? '#' + b.id : (b.textContent || '').trim().slice(0, 24) || sig(b))),
      iconOnly: iconOnly.length,
      inputs: fields.filter((e) => e.tagName === 'INPUT' && e.type !== 'checkbox' && e.type !== 'radio').length + fields.filter((e) => e.tagName === 'TEXTAREA').length,
      inputsInView: fields.filter(inView).length,
      selects: shells + nativeAlone, fields: f,
    };
  };
  const docks = (root) => [...root.querySelectorAll('.dock')].filter(vis).map((d) => {
    const ZONES = ['dock-identity', 'dock-find', 'dock-arrange', 'dock-actions'];
    const zones = {};
    let items = 0, filled = 0, primary = 0;
    for (const z of ZONES) {
      const zone = d.querySelector(':scope > .' + z);
      if (!zone) continue;
      const kids = [...zone.children].filter(vis);
      zones[z.replace('dock-', '')] = kids.length;
      items += kids.length;
      for (const k of kids) {
        if (k.matches('button') && !k.matches('.ghost, .icon-only')) filled++;
        if (k.matches('button.primary')) primary++;
      }
    }
    // A dock with no zone children (Settings pane titles, hand-built rows)
    // is counted by its own visible controls instead.
    if (!items) { const c = [...d.querySelectorAll(BTN + ', input, select, .select-shell')].filter(vis).filter((e) => !e.closest('.dock-native-hidden, .select-shell > *')); items = c.length; zones.loose = c.length; }
    const menuItems = d.querySelectorAll('.dock-menu-list .menu-item, .dock-menu-list [role="menuitem"], .doc-dock-menu-item').length;
    return {
      name: d.dataset.dockName || d.id || (d.parentElement && (d.parentElement.id || sig(d.parentElement))) || sig(d),
      items, zones, filled, primary, inFoldedMenus: menuItems, over7: items > 7,
      width: Math.round(d.getBoundingClientRect().width), height: Math.round(d.getBoundingClientRect().height),
    };
  });
  const bars = (root) => [...root.querySelectorAll('.wb-topbar, [role="toolbar"]:not(.dock), .graph-toolbar, .chat-toolbar, .doc-toolbar, .library-toolbar, .notes-toolbar')].filter(vis).map((d) => {
    const c = [...d.querySelectorAll(BTN + ', input, select, .select-shell')].filter((e) => vis(e) && !e.closest('.dock-native-hidden') && !e.closest('.select-shell > *'));
    return { name: d.id || sig(d), items: c.length, filled: c.filter(isFilled).length };
  });
  const labelled = (e) => {
    if ((e.getAttribute('aria-label') || '').trim() || (e.getAttribute('title') || '').trim()) return true;
    const lb = (e.getAttribute('aria-labelledby') || '').split(/\\s+/).map((id) => id && document.getElementById(id) && document.getElementById(id).textContent.trim()).filter(Boolean).join('');
    if (lb) return true;
    if (e.labels && e.labels.length) return true;
    return !!(e.textContent || '').trim();
  };
  const unlabelled = (root) => [...root.querySelectorAll('button, [role="button"], summary, a[href]')].filter((e) => !labelled(e)).map((e) => ({
    key: sig(e) + '|' + (e.parentElement ? (e.parentElement.id || sig(e.parentElement)) : ''),
    sel: sig(e), parent: e.parentElement ? (e.parentElement.id || sig(e.parentElement)) : '', within: (e.closest('[id]') || {}).id || '',
    icon: (e.querySelector('i, svg, img') ? (e.querySelector('i') ? String(e.querySelector('i').className).split(/\\s+/).filter((c) => c.startsWith('ph-')).join(' ') : e.querySelector('svg') ? 'svg' : 'img') : '') || '',
    visible: vis(e), html: e.outerHTML.slice(0, 200),
  }));
  window.__h = { vis, inView, count, docks, bars, unlabelled, OVERLAY };
})();
`;

// ---- node side -------------------------------------------------------------

function surfaceMeasure(scopeSel) {
  return window.__h && (() => {
    const H = window.__h;
    const page = scopeSel ? document.querySelector(scopeSel) : null;
    if (!page) return null;
    return { page: H.count(page), docks: H.docks(page), bars: H.bars(page) };
  })();
}

function chromeMeasure() {
  const H = window.__h;
  // Everything in <body> that is not a tab page and not an overlay.
  const probe = document.createElement('div');
  const clone = document.body.cloneNode(false);
  void probe; void clone;
  const BTN = 'button, [role="button"], summary';
  const outside = '.tab-page, .modal-overlay, #settings-modal, [aria-modal="true"], .sheet-overlay, .confirm-overlay, .hidden, #lock-overlay, #boot-splash';
  const all = [...document.body.querySelectorAll(BTN)].filter((e) => H.vis(e) && !e.closest(outside) && !e.closest('.dock-native-hidden, .visually-hidden'));
  return { buttons: all.length, buttonsInView: all.filter(H.inView).length, primaryClass: all.filter((b) => b.matches('.primary')).length,
    names: all.slice(0, 40).map((b) => b.id ? '#' + b.id : (b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20) || b.className.toString().slice(0, 20))) };
}

function dialogsMeasure() {
  const H = window.__h;
  const cards = [...document.querySelectorAll('.modal-card')];
  const set = new Map();
  for (const c of cards) { const o = c.parentElement; if (o) set.set(o, c); }
  for (const o of document.querySelectorAll('[aria-modal="true"]')) if (!set.has(o)) set.set(o, o.querySelector('.card, [class*="card"]') || o.firstElementChild || o);
  const settings = document.getElementById('settings-modal');
  if (settings && !set.has(settings)) set.set(settings, settings.querySelector('.card, .modal-card') || settings.firstElementChild || settings);
  const out = [];
  for (const [overlay, card] of set) {
    const hadHidden = overlay.classList.contains('hidden');
    const prevDisplay = overlay.style.display;
    overlay.classList.remove('hidden');
    let hiddenParent = false;
    for (let p = overlay.parentElement; p; p = p.parentElement) if (getComputedStyle(p).display === 'none') hiddenParent = true;
    const r = card.getBoundingClientRect();
    const os = getComputedStyle(overlay);
    const W = innerWidth, Hh = innerHeight;
    const edgeBottom = Math.abs(r.bottom - Hh) <= 1.5, edgeTop = r.top <= 1.5, edgeLeft = r.left <= 1.5, edgeRight = Math.abs(r.right - W) <= 1.5;
    const rendered = r.width > 0 && r.height > 0;
    const sheetClass = /sheet/.test(overlay.className + ' ' + card.className);
    const full = edgeTop && edgeBottom && edgeLeft && edgeRight;
    let kind = !rendered ? 'not rendered' : full ? 'fullscreen' : (edgeBottom || edgeLeft || edgeRight) ? 'sheet' : sheetClass ? 'sheet (by class)' : 'dialog';
    out.push({
      id: overlay.id || card.id || (overlay.className.toString().split(/\s+/)[0] + '>' + card.className.toString().split(/\s+/).slice(0, 3).join('.')),
      label: (overlay.getAttribute('aria-label') || (card.querySelector('h1, h2, h3, .modal-title, .sheet-title, .dialog-head-title') || {}).textContent || '').trim().slice(0, 40),
      kind, w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top),
      alignItems: os.alignItems, justifyContent: os.justifyContent, position: os.position, sheetClass, hiddenParent,
    });
    if (hadHidden) overlay.classList.add('hidden');
    overlay.style.display = prevDisplay;
  }
  // The confirm dialog is built by confirmDialog(); measured by asking for one.
  try {
    void confirmDialog('Delete this note?\n\nThis cannot be undone.');
    const ov = document.querySelector('.confirm-overlay');
    const card = ov && ov.querySelector('.confirm-card');
    if (card) {
      const r = card.getBoundingClientRect(), os = getComputedStyle(ov);
      const edgeBottom = Math.abs(r.bottom - innerHeight) <= 1.5;
      out.push({ id: 'confirmDialog()', label: 'confirm', kind: edgeBottom ? 'sheet' : 'dialog', w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top), alignItems: os.alignItems, justifyContent: os.justifyContent, position: os.position, sheetClass: false, hiddenParent: false, built: 'js' });
    }
    document.querySelectorAll('.confirm-overlay').forEach((o) => o.remove());
  } catch (e) { out.push({ id: 'confirmDialog()', error: String(e).slice(0, 80) }); }
  return out;
}

// Source-side counts of the things a person is asked to confirm.
function confirmCounts() {
  const files = fs.readdirSync(path.join(FRONT, 'js')).filter((f) => f.endsWith('.js'));
  const pats = {
    confirmDialog: /\bconfirmDialog\(/g,
    windowConfirm: /(?<![\w.])(?:window\.)?confirm\(/g,
    confirmLeavingUnsavedWork: /\bconfirmLeavingUnsavedWork\(/g,
    renderToolConfirm: /\brenderToolConfirm\(/g,
  };
  const out = { total: 0, byKind: {}, byFile: {}, undoCalls: 0 };
  for (const f of files) {
    const text = fs.readFileSync(path.join(FRONT, 'js', f), 'utf8');
    for (const [k, re] of Object.entries(pats)) {
      let n = (text.match(re) || []).length;
      // The definitions are not call sites.
      n -= (text.match(new RegExp('function ' + k + '\\('), 'g') || []).length;
      if (n > 0) { out.byKind[k] = (out.byKind[k] || 0) + n; out.byFile[f] = (out.byFile[f] || 0) + n; out.total += n; }
    }
    out.undoCalls += (text.match(/\b(?:showUndo|undoToast|pushUndo|offerUndo|showUndoBar)\(/g) || []).length;
  }
  return out;
}

(async () => {
  const result = { generated: new Date().toISOString(), base: process.env.BASE || 'http://127.0.0.1:8781', widths: {}, confirms: confirmCounts() };
  for (const width of WIDTHS) {
    const phone = width < 600;
    const { browser, page } = await boot({ viewport: { width, height: phone ? 844 : 900 }, hasTouch: phone, isMobile: phone });
    await page.evaluate(IN_PAGE);
    const W = { surfaces: [], dialogs: [], unlabelled: {}, errors: [] };
    const rawMarkup = await page.evaluate(async () => {
      const html = await (await fetch('/')).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const sig = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(/\s+/).filter(Boolean).slice(0, 3).join('.');
      const lab = (e) => !!((e.getAttribute('aria-label') || '').trim() || (e.getAttribute('title') || '').trim() || (e.getAttribute('aria-labelledby') || '').trim() || (e.textContent || '').trim());
      return [...doc.querySelectorAll('button, [role="button"], summary, a[href]')].filter((e) => !lab(e)).map((e) => sig(e) + '|' + (e.parentElement ? (e.parentElement.id || sig(e.parentElement)) : ''));
    });
    const markupKeys = new Set(rawMarkup);
    W.markupUnlabelledCount = rawMarkup.length;

    const settle = (ms = 700) => page.waitForTimeout(ms);
    const sweepLabels = async (where) => {
      const list = await page.evaluate(() => window.__h.unlabelled(document));
      for (const u of list) {
        const prev = W.unlabelled[u.key];
        if (!prev) W.unlabelled[u.key] = { ...u, where: [where], markup: markupKeys.has(u.key), everVisible: u.visible };
        else { if (!prev.where.includes(where)) prev.where.push(where); prev.everVisible = prev.everVisible || u.visible; }
      }
    };
    const record = async (name, scope, extra = {}) => {
      try {
        let m = await page.evaluate(`(${surfaceMeasure.toString()})(${JSON.stringify(scope)})`);
        // A lazy surface that has not drawn yet reads as 0 buttons (the Graph
        // and the Documents list did, on a loaded machine): look again before
        // believing an empty page.
        for (let tries = 0; m && m.page.buttons === 0 && tries < 4; tries++) {
          await page.waitForTimeout(1500);
          m = await page.evaluate(`(${surfaceMeasure.toString()})(${JSON.stringify(scope)})`);
        }
        if (!m) { W.errors.push(name + ': scope ' + scope + ' not found'); return; }
        W.surfaces.push({ name, scope, ...m.page, docks: m.docks, bars: m.bars, ...extra });
        await sweepLabels(name);
        // The menus a surface opens are built when pressed, so their rows
        // are scanned too: up to MENUS distinct openers per surface (a row
        // kebab repeated 38 times is one recipe), each closed again.
        const n = await page.evaluate(({ scope, max }) => {
          const root = document.querySelector(scope);
          const seen = new Set(); const picks = [];
          const all = [...root.querySelectorAll('[aria-haspopup="menu"], [aria-haspopup="true"], summary.doc-dock-menu-btn, details.doc-dock-menu > summary')].filter((e) => window.__h.vis(e) && window.__h.inView(e));
          for (const e of all) { const k = String(e.className) + '|' + (e.getAttribute('aria-label') || e.id || ''); if (seen.has(k)) continue; seen.add(k); picks.push(e); if (picks.length >= max) break; }
          window.__picks = picks; return picks.length;
        }, { scope, max: MENUS });
        for (let i = 0; i < n; i++) {
          await page.evaluate((j) => window.__picks[j] && window.__picks[j].click(), i);
          await page.waitForTimeout(350);
          await sweepLabels(name + ' > menu ' + (i + 1));
          await page.keyboard.press('Escape'); await page.waitForTimeout(200);
          await page.evaluate((j) => { const e = window.__picks[j]; if (e && e.tagName === 'SUMMARY' && e.parentElement.open) e.parentElement.open = false; }, i);
        }
      } catch (e) { W.errors.push(name + ': ' + String(e).slice(0, 100)); }
    };
    // A tab's content arrives after switchTab resolves (lazy bundles, fetches):
    // wait until the page holds a few visible controls, up to 8s, rather than
    // measure a skeleton (the first run read the Graph as 0 buttons that way).
    const go = async (tab) => {
      await page.evaluate((t) => { try { switchTab(t); } catch (e) {} }, tab);
      await page.waitForFunction((t) => { const e = document.getElementById('tab-' + t); return e && e.checkVisibility() && [...e.querySelectorAll('button')].filter((b) => b.checkVisibility()).length >= 3; }, tab, { timeout: 8000, polling: 200 }).catch(() => {});
      await settle(900);
    };
    const esc = async () => { await page.keyboard.press('Escape'); await settle(250); await page.keyboard.press('Escape'); await settle(250); };

    // Chrome once, on the dashboard.
    await go('dashboard');
    W.chrome = await page.evaluate(`(${chromeMeasure.toString()})()`);
    await record('dashboard', '#tab-dashboard');

    await go('notes');
    for (const s of ['browse', 'capture', 'writing-room', 'ask']) {
      await page.evaluate((x) => document.querySelector(`#tab-notes [data-section="${x}"], #tab-notes [data-view="${x}"]`)?.click(), s);
      await settle();
      await record('notes/' + s, '#tab-notes');
    }
    await page.evaluate(() => document.querySelector('#tab-notes [data-section="browse"], #tab-notes [data-view="browse"]')?.click());
    await settle();
    const noteCount = await page.evaluate(() => (typeof allEntries !== 'undefined' ? allEntries.length : -1));
    W.noteRows = noteCount;

    await go('chat'); await record('chat', '#tab-chat');
    await go('graph'); await record('graph', '#tab-graph');
    await go('timeline'); await record('timeline', '#tab-timeline');
    await go('reminders'); await record('reminders', '#tab-reminders');
    await go('documents'); await record('documents (list)', '#tab-documents');
    const openedDoc = await page.evaluate(async () => {
      try { const r = await api('/documents'); const d = await r.json(); const list = Array.isArray(d) ? d : (d.items || d.documents || []); if (!list.length) return false; await openDocument(list[0].id); return true; } catch (e) { return false; }
    });
    await settle(1800);
    if (openedDoc) await record('documents (open)', '#tab-documents'); else W.errors.push('documents (open): no document');

    await go('library');
    const subs = [...new Set(await page.evaluate(() => [...document.querySelectorAll('#library-subtabs button')].map((b) => b.getAttribute('data-target')).filter(Boolean)))];
    for (const t of subs) {
      await page.evaluate((x) => document.querySelector(`#library-subtabs [data-target="${x}"]`)?.click(), t);
      await settle(800);
      await record('library/' + t.replace('library-view-', ''), '#tab-library');
    }
    for (const kind of ['board', 'map']) {
      await go('library');
      const opened = await page.evaluate(async (k) => {
        document.querySelector('#library-subtabs button[data-target="library-view-whiteboard"]')?.click();
        await new Promise((r) => setTimeout(r, 1000));
        const card = [...document.querySelectorAll('.library-board-card')].find((c) => c.wbBoard && (k === 'map' ? c.wbBoard.type === 'map' : c.wbBoard.type !== 'map'));
        if (!card) return 'none';
        card.click();
        await new Promise((r) => setTimeout(r, 2200));
        return document.getElementById('wb-topbar') && document.getElementById('wb-topbar').offsetParent ? 'open' : 'closed';
      }, kind);
      if (opened === 'open') {
        await record(kind === 'map' ? 'mindmap (open)' : 'whiteboard (open)', '#tab-library');
        await page.evaluate(() => document.getElementById('wb-back-to-boards')?.click()); await settle(500);
      } else W.errors.push((kind === 'map' ? 'mindmap' : 'whiteboard') + ': ' + opened);
    }

    // Settings: at rest, then every section.
    await page.evaluate(() => { try { openSettingsModal(); } catch (e) { document.getElementById('settings-btn')?.click(); } });
    await settle(900);
    await record('settings (at rest)', '#settings-modal');
    const SECTIONS = ['models', 'searchindex', 'appearance', 'preferences', 'account', 'privacy', 'tools', 'skills', 'personas', 'templates', 'websearch', 'memory', 'learned', 'tasks', 'data', 'logs', 'shortcuts', 'extras', 'help', 'about'];
    const sectionRows = [];
    for (const s of SECTIONS) {
      const ok = await page.evaluate((n) => { try { openSettingsModal(n); return true; } catch (e) { return false; } }, s);
      if (!ok) continue;
      await settle(450);
      const before = W.surfaces.length;
      await record('settings/' + s, '#settings-modal');
      if (W.surfaces.length > before) sectionRows.push(W.surfaces[W.surfaces.length - 1]);
    }
    W.settingsSections = sectionRows.map((r) => ({ name: r.name, buttons: r.buttons, inputs: r.inputs, selects: r.selects, fields: r.fields }));
    await esc();

    // Overlays and menus that JS builds, scanned for unlabelled controls and
    // counted like a surface.
    await go('notes');
    const OVERLAYS = [
      ['overlay/manage categories', 'openManageCategories()', '.modal-overlay:not(.hidden), [aria-modal="true"]:not(.hidden)'],
      ['overlay/tags sheet', 'openTagsSheet()', '.sheet-overlay, .modal-overlay:not(.hidden)'],
      ['overlay/move to category', 'chooseNoteCategory([allEntries[0].id], allEntries[0].category)', '.sheet-overlay, .modal-overlay:not(.hidden)'],
      ['overlay/note editor', 'openNoteEditor(allEntries[0].id)', '#tab-notes'],
      ['overlay/find anything', 'openFinder()', '#finder-overlay, .modal-overlay:not(.hidden)'],
      ['overlay/command palette', "document.getElementById('status-command').click()", '#palette-overlay'],
      ['overlay/guide', 'ensureModule("helpChat").then(openHelpChat)', '.modal-overlay:not(.hidden), #help-chat-panel, [id*="help-chat"]'],
    ];
    for (const [name, js, scope] of OVERLAYS) {
      await page.evaluate((code) => { try { (0, eval)(code); } catch (e) {} }, js);
      await settle(1100);
      const found = await page.evaluate((s) => !!document.querySelector(s), scope.split(',')[0].trim());
      await sweepLabels(name);
      void found;
      await esc();
      await page.evaluate(() => typeof closeNoteForm === 'function' && closeNoteForm()).catch(() => {});
      await settle(300);
    }
    // A note card's overflow menu and the header's menu.
    for (const [name, sel] of [['menu/note card more', '#entry-list .entry-overflow-btn, #entry-list [aria-label*="More"]'], ['menu/header more', '#header-more-btn, #more-btn, [aria-label="More"]']]) {
      await page.evaluate((s) => document.querySelector(s)?.click(), sel);
      await settle(600);
      await sweepLabels(name);
      await esc();
    }
    await go('dashboard');

    W.dialogs = await page.evaluate(`(${dialogsMeasure.toString()})()`);
    W.dialogCount = W.dialogs.length;
    result.widths[width] = W;
    await browser.close();
  }

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, 'hierarchy.json'), JSON.stringify(result, null, 1));
  // Summary.
  for (const [w, W] of Object.entries(result.widths)) {
    console.log(`\n== ${w}px (chrome: ${W.chrome.buttons} buttons, ${W.chrome.buttonsInView} in view, ${W.chrome.primaryClass} .primary; ${W.noteRows} note rows)`);
    console.log('surface'.padEnd(26) + 'btn  inView  filled  .primary  inputs  selects  docks(items)');
    for (const s of W.surfaces) {
      console.log(s.name.padEnd(26) + String(s.buttons).padStart(3) + String(s.buttonsInView).padStart(8) + String(s.filled).padStart(8) + String(s.primaryClass).padStart(9) + String(s.inputs).padStart(8) + String(s.selects).padStart(8) + '  ' + s.docks.map((d) => d.name + ':' + d.items).concat(s.bars.map((d) => 'bar ' + d.name + ':' + d.items)).join(' '));
    }
    console.log('-- dialogs: ' + W.dialogs.map((d) => `${d.id}=${d.kind}`).join(', '));
    const un = Object.values(W.unlabelled);
    console.log(`-- unlabelled controls: ${un.length} (${un.filter((u) => u.markup).length} markup, ${un.filter((u) => !u.markup).length} JS-built; ${un.filter((u) => u.everVisible).length} ever visible)`);
    W.errors.forEach((e) => console.log('   note: ' + e));
  }
  console.log('\n-- confirms: ' + JSON.stringify(result.confirms.byKind) + ' total ' + result.confirms.total + '; undo call sites ' + result.confirms.undoCalls);
})();
